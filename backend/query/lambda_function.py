import json
import os
import boto3
import duckdb
import tempfile
from dotenv import load_dotenv

load_dotenv()

DATA_BUCKET = os.environ.get("DATA_BUCKET", "disc-golf-stats-data-55bbe7f4")
PARQUET_KEY = "rounds.parquet"


def get_parquet_path() -> str:
    """
    Download the Parquet file from S3 to /tmp and return the local path.
    In local development, use the local data/ folder if it exists.
    """
    local_path = os.path.join(tempfile.gettempdir(), "rounds.parquet")

    if os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
        # Running in Lambda — download from S3
        s3 = boto3.client("s3")
        print(f"Downloading {PARQUET_KEY} from S3...")
        s3.download_file(DATA_BUCKET, PARQUET_KEY, local_path)
        print("Download complete.")
    else:
        # Running locally — use local file
        local_path = "data/rounds.parquet"
        if not os.path.exists(local_path):
            raise FileNotFoundError(
                "data/rounds.parquet not found. "
                "Run the refresh Lambda locally first."
            )

    return local_path


def execute_query(query: str, parquet_path: str) -> list[dict]:
    """Execute a DuckDB query against the Parquet file."""
    conn = duckdb.connect()
    conn.execute(f"CREATE VIEW rounds AS SELECT * FROM read_parquet('{parquet_path}')")
    result = conn.execute(query)
    columns = [desc[0] for desc in result.description]
    rows = result.fetchall()
    conn.close()
    return [dict(zip(columns, row)) for row in rows]


def lambda_handler(event, context):
    """
    Query Lambda handler.
    Expects event body with:
      - query_type: string identifying the query to run
      - params: optional dict of parameters
    """
    try:
        # Parse request body
        if isinstance(event.get("body"), str):
            body = json.loads(event["body"])
        else:
            body = event.get("body", event)

        query_type = body.get("query_type")
        params = body.get("params", {})

        if not query_type:
            return {
                "statusCode": 400,
                "headers": cors_headers(),
                "body": json.dumps({"error": "query_type is required"})
            }

        parquet_path = get_parquet_path()
        result = run_query(query_type, params, parquet_path)

        return {
            "statusCode": 200,
            "headers": cors_headers(),
            "body": json.dumps(result, default=str)
        }

    except Exception as e:
        print(f"Error: {e}")
        return {
            "statusCode": 500,
            "headers": cors_headers(),
            "body": json.dumps({"error": str(e)})
        }


def cors_headers() -> dict:
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,X-Api-Key",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
        "Content-Type": "application/json",
    }


def run_query(query_type: str, params: dict, parquet_path: str) -> dict:
    """Route query_type to the appropriate query function."""
    queries = {
        "scoring_trend": query_scoring_trend,
        "hole_averages": query_hole_averages,
        "course_summary": query_course_summary,
        "best_rounds": query_best_rounds,
        "weather_correlation": query_weather_correlation,
        "recent_rounds": query_recent_rounds,
    }

    if query_type not in queries:
        raise ValueError(f"Unknown query_type: {query_type}")

    return queries[query_type](params, parquet_path)


def query_scoring_trend(params: dict, parquet_path: str) -> dict:
    """Scoring trend over time — one row per round with rolling average."""
    course = params.get("course")
    course_filter = f"WHERE course = '{course}'" if course else ""

    query = f"""
        SELECT
            date,
            course,
            total_score,
            score_vs_par,
            AVG(score_vs_par) OVER (
                ORDER BY datetime
                ROWS BETWEEN 4 PRECEDING AND CURRENT ROW
            ) AS rolling_avg_vs_par
        FROM rounds
        {course_filter}
        ORDER BY datetime
    """
    rows = execute_query(query, parquet_path)
    return {"query_type": "scoring_trend", "data": rows}


def query_hole_averages(params: dict, parquet_path: str) -> dict:
    """Average score and vs-par for each hole."""
    course = params.get("course")
    course_filter = f"AND course = '{course}'" if course else ""

    hole_selects = ", ".join([
        f"AVG(hole_{i}_vs_par) AS hole_{i}_avg_vs_par, "
        f"AVG(hole_{i}_score) AS hole_{i}_avg_score"
        for i in range(1, 19)
    ])

    query = f"""
        SELECT {hole_selects}
        FROM rounds
        WHERE 1=1 {course_filter}
    """
    rows = execute_query(query, parquet_path)

    # Reshape into a list of hole objects for easier frontend consumption
    if rows:
        row = rows[0]
        holes = []
        for i in range(1, 19):
            avg_vs_par = row.get(f"hole_{i}_avg_vs_par")
            avg_score = row.get(f"hole_{i}_avg_score")
            if avg_score is not None:
                holes.append({
                    "hole": i,
                    "avg_score": round(avg_score, 3) if avg_score else None,
                    "avg_vs_par": round(avg_vs_par, 3) if avg_vs_par else None,
                })
        return {"query_type": "hole_averages", "data": holes}

    return {"query_type": "hole_averages", "data": []}


def query_course_summary(params: dict, parquet_path: str) -> dict:
    """Summary statistics per course."""
    query = """
        SELECT
            course,
            COUNT(*) AS rounds_played,
            MIN(total_score) AS best_score,
            MAX(total_score) AS worst_score,
            AVG(total_score) AS avg_score,
            MIN(score_vs_par) AS best_vs_par,
            AVG(score_vs_par) AS avg_vs_par,
            MIN(date) AS first_round,
            MAX(date) AS last_round
        FROM rounds
        GROUP BY course
        ORDER BY course
    """
    rows = execute_query(query, parquet_path)
    # Round float values
    for row in rows:
        for key in ["avg_score", "avg_vs_par"]:
            if row.get(key) is not None:
                row[key] = round(row[key], 2)
    return {"query_type": "course_summary", "data": rows}


def query_best_rounds(params: dict, parquet_path: str) -> dict:
    """Top N best rounds by score vs par."""
    course = params.get("course")
    limit = params.get("limit", 10)
    course_filter = f"AND course = '{course}'" if course else ""

    query = f"""
        SELECT
            date,
            course,
            total_score,
            total_par,
            score_vs_par,
            front_score,
            back_score,
            temp_f,
            wind_mph,
            weather_desc
        FROM rounds
        WHERE 1=1 {course_filter}
        ORDER BY score_vs_par ASC, date DESC
        LIMIT {limit}
    """
    rows = execute_query(query, parquet_path)
    return {"query_type": "best_rounds", "data": rows}


def query_weather_correlation(params: dict, parquet_path: str) -> dict:
    """Score vs par grouped by temperature and wind ranges."""
    course = params.get("course")
    course_filter = f"AND course = '{course}'" if course else ""

    query = f"""
        SELECT
            CASE
                WHEN temp_f < 40 THEN 'Cold (<40°F)'
                WHEN temp_f < 55 THEN 'Cool (40-55°F)'
                WHEN temp_f < 70 THEN 'Mild (55-70°F)'
                WHEN temp_f < 85 THEN 'Warm (70-85°F)'
                ELSE 'Hot (85°F+)'
            END AS temp_range,
            CASE
                WHEN wind_mph < 5 THEN 'Calm (<5 mph)'
                WHEN wind_mph < 10 THEN 'Light (5-10 mph)'
                WHEN wind_mph < 15 THEN 'Moderate (10-15 mph)'
                ELSE 'Windy (15+ mph)'
            END AS wind_range,
            COUNT(*) AS rounds,
            AVG(score_vs_par) AS avg_vs_par,
            MIN(score_vs_par) AS best_vs_par
        FROM rounds
        WHERE temp_f IS NOT NULL
        AND wind_mph IS NOT NULL
        {course_filter}
        GROUP BY temp_range, wind_range
        ORDER BY avg_vs_par ASC
    """
    rows = execute_query(query, parquet_path)
    for row in rows:
        for key in ["avg_vs_par", "best_vs_par"]:
            if row.get(key) is not None:
                row[key] = round(row[key], 2)
    return {"query_type": "weather_correlation", "data": rows}


def query_recent_rounds(params: dict, parquet_path: str) -> dict:
    """Most recent N rounds."""
    limit = params.get("limit", 5)
    course = params.get("course")
    course_filter = f"AND course = '{course}'" if course else ""

    query = f"""
        SELECT
            date,
            course,
            total_score,
            total_par,
            score_vs_par,
            temp_f,
            wind_mph,
            weather_desc
        FROM rounds
        WHERE 1=1 {course_filter}
        ORDER BY datetime DESC
        LIMIT {limit}
    """
    rows = execute_query(query, parquet_path)
    return {"query_type": "recent_rounds", "data": rows}


if __name__ == "__main__":
    # Local testing
    parquet_path = "data/rounds.parquet"

    print("=== Course Summary ===")
    result = query_course_summary({}, parquet_path)
    for row in result["data"]:
        print(row)

    print("\n=== Scoring Trend (first 5) ===")
    result = query_scoring_trend({}, parquet_path)
    for row in result["data"][:5]:
        print(row)

    print("\n=== Hole Averages (Brambleton) ===")
    result = query_hole_averages({"course": "Brambleton"}, parquet_path)
    for row in result["data"]:
        print(row)

    print("\n=== Best Rounds ===")
    result = query_best_rounds({}, parquet_path)
    for row in result["data"]:
        print(row)

    print("\n=== Weather Correlation ===")
    result = query_weather_correlation({}, parquet_path)
    for row in result["data"]:
        print(row)

    print("\n=== Recent Rounds ===")
    result = query_recent_rounds({}, parquet_path)
    for row in result["data"]:
        print(row)