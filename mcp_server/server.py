import json
import os
import boto3
import duckdb
import tempfile
from mcp.server.fastmcp import FastMCP
from dotenv import load_dotenv

load_dotenv()

DATA_BUCKET = os.environ.get("DATA_BUCKET", "disc-golf-stats-data-55bbe7f4")
PARQUET_KEY = "rounds.parquet"
COURSE_META_KEY = "course_meta.json"

mcp = FastMCP("disc-golf-agent")


def get_parquet_path() -> str:
    """Get the path to the Parquet file."""
    if os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
        local_path = os.path.join(tempfile.gettempdir(), "rounds.parquet")
        s3 = boto3.client("s3")
        s3.download_file(DATA_BUCKET, PARQUET_KEY, local_path)
        return local_path
    else:
        return "data/rounds.parquet"


@mcp.tool()
def execute_sql(query: str) -> str:
    """
    Execute a read-only DuckDB SQL query against the disc golf rounds dataset.
    The data is available as a view called 'rounds'.
    Only SELECT statements are permitted.

    Args:
        query: A DuckDB SQL SELECT statement

    Returns:
        JSON string of query results as a list of row dicts
    """
    if not query.strip().upper().startswith("SELECT"):
        return json.dumps({"error": "Only SELECT queries are permitted."})

    try:
        parquet_path = get_parquet_path()
        conn = duckdb.connect()
        conn.execute(
            f"CREATE VIEW rounds AS SELECT * FROM read_parquet('{parquet_path}')"
        )
        result = conn.execute(query)
        columns = [desc[0] for desc in result.description]
        rows = result.fetchall()
        conn.close()
        return json.dumps(
            [dict(zip(columns, row)) for row in rows],
            default=str
        )
    except Exception as e:
        return json.dumps({"error": str(e)})


@mcp.tool()
def get_course_info(course: str = None) -> str:
    """
    Retrieve course metadata including hole pars, distances, and layout info.
    Use this when the user asks about course layout, hole distances,
    or par values for specific holes.

    Args:
        course: Course name ("Brambleton" or "Franklin Park").
                If not provided, returns info for all courses.

    Returns:
        JSON string of course metadata
    """
    try:
        if os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
            s3 = boto3.client("s3")
            response = s3.get_object(Bucket=DATA_BUCKET, Key=COURSE_META_KEY)
            courses = json.loads(response["Body"].read().decode("utf-8"))
        else:
            with open("data/course_meta.json") as f:
                courses = json.load(f)

        if course:
            matches = [
                c for c in courses
                if c["short_name"].lower() == course.lower()
            ]
            if not matches:
                return json.dumps({
                    "error": f"Course '{course}' not found. "
                             f"Available: {[c['short_name'] for c in courses]}"
                })
            return json.dumps(matches[0], default=str)

        return json.dumps(courses, default=str)

    except Exception as e:
        return json.dumps({"error": str(e)})


if __name__ == "__main__":
    mcp.run()