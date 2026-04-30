import json
import os
import io
import boto3
import pandas as pd
import requests
import pyarrow as pa
import pyarrow.parquet as pq
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

SPREADSHEET_ID = os.environ.get(
    "SPREADSHEET_ID",
    "1hK8Vbbzbt_0LQ4X81oQsgYNNGwe5zDsV8cGZ5AV4CoI"
)
DATA_BUCKET = os.environ.get("DATA_BUCKET", "disc-golf-stats-data-55bbe7f4")
PARQUET_KEY = "rounds.parquet"


def load_courses() -> list[dict]:
    """Load course configuration from S3."""
    s3 = boto3.client("s3")
    response = s3.get_object(Bucket=DATA_BUCKET, Key="courses.json")
    courses = json.loads(response["Body"].read().decode("utf-8"))
    print(f"Loaded {len(courses)} courses from S3")
    return courses


def fetch_sheet(sheet_name: str) -> pd.DataFrame:
    """Fetch a Google Sheet tab as a DataFrame via CSV export URL."""
    url = (
        f"https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}"
        f"/gviz/tq?tqx=out:csv&sheet={sheet_name}"
    )
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    df = pd.read_csv(io.StringIO(response.text), header=0)
    return df


def parse_course(df: pd.DataFrame, course: dict) -> tuple[dict, list[dict]]:
    """
    Parse a course DataFrame into course metadata and a list of round records.
    The CSV export from Google Sheets has this structure:
      - Header row: hole numbers (1-9, empty, 10-18, empty, empty, empty)
      - Row 0: Distance values
      - Row 1: Par values
      - Row 2: Avg values (skip)
      - Row 3+: Round rows (first column = datetime string)
    """
    course_key = course["course_key"]

    # Identify hole columns — columns whose header is an integer
    hole_columns = {}  # hole_number -> column_name
    for col in df.columns:
        try:
            hole_num = int(float(str(col).strip()))
            hole_columns[hole_num] = col
        except ValueError:
            continue

    holes = len(hole_columns)
    if holes == 0:
        raise ValueError(f"Could not detect any holes in {course_key}")

    print(f"  Detected {holes} holes for {course_key}")

    # Row 0 = Distance, Row 1 = Par
    distance_row = df.iloc[0]
    par_row = df.iloc[1]

    distances = {}
    pars = {}
    for hole_num, col in hole_columns.items():
        try:
            distances[hole_num] = int(float(str(distance_row[col])))
        except (ValueError, TypeError):
            distances[hole_num] = None
        try:
            pars[hole_num] = int(float(str(par_row[col])))
        except (ValueError, TypeError):
            pars[hole_num] = None

    total_par = sum(p for p in pars.values() if p is not None)

    # Front/back split
    front_hole_nums = sorted([h for h in hole_columns if h <= 9])
    back_hole_nums = sorted([h for h in hole_columns if h > 9])
    front_par = sum(pars[h] for h in front_hole_nums if pars[h] is not None)
    back_par = (
        sum(pars[h] for h in back_hole_nums if pars[h] is not None)
        if back_hole_nums else None
    )

    course_meta = {
        "course_key": course_key,
        "short_name": course["short_name"],
        "lat": course["lat"],
        "lon": course["lon"],
        "holes": holes,
        "total_par": total_par,
        "front_par": front_par,
        "back_par": back_par,
        "hole_pars": pars,
        "hole_distances": distances,
    }

    # Round rows start at index 3 (skip Distance, Par, Avg)
    # First column contains the datetime string
    label_col = df.columns[0]
    rounds = []

    for idx, row in df.iloc[3:].iterrows():
        label = str(row[label_col]).strip()
        if not label or label == "nan":
            continue

        # Try multiple datetime formats since early rounds use M/D not MM/DD
        dt = None
        for fmt in ("%Y-%m-%d %H:%M", "%Y-%-m-%-d %H:%M"):
            try:
                dt = datetime.strptime(label, fmt)
                break
            except ValueError:
                continue

        # If standard formats fail, try pandas parser as fallback
        if dt is None:
            try:
                dt = pd.to_datetime(label).to_pydatetime()
            except Exception:
                continue

        # Extract hole scores
        hole_scores = {}
        for hole_num, col in hole_columns.items():
            try:
                hole_scores[hole_num] = int(float(str(row[col])))
            except (ValueError, TypeError):
                hole_scores[hole_num] = None

        # Calculate totals
        valid_scores = [s for s in hole_scores.values() if s is not None]
        total_score = sum(valid_scores) if len(valid_scores) == holes else None
        score_vs_par = (total_score - total_par) if total_score is not None else None

        # Front nine
        front_scores = [
            hole_scores[h] for h in front_hole_nums
            if hole_scores.get(h) is not None
        ]
        front_score = (
            sum(front_scores) if len(front_scores) == len(front_hole_nums) else None
        )
        front_vs_par = (
            (front_score - front_par) if front_score is not None else None
        )

        # Back nine
        if back_hole_nums:
            back_scores = [
                hole_scores[h] for h in back_hole_nums
                if hole_scores.get(h) is not None
            ]
            back_score = (
                sum(back_scores) if len(back_scores) == len(back_hole_nums) else None
            )
            back_vs_par = (
                (back_score - back_par) if back_score is not None else None
            )
        else:
            back_score = None
            back_vs_par = None

        # Use isoformat datetime string for round_id
        round_record = {
            "round_id": f"{course_key}_{dt.strftime('%Y%m%d_%H%M')}",
            "course_key": course_key,
            "course": course["short_name"],
            "datetime": dt,
            "date": dt.date().isoformat(),
            "year": dt.year,
            "month": dt.month,
            "day_of_week": dt.strftime("%A"),
            "hour": dt.hour,
            "total_score": total_score,
            "total_par": total_par,
            "score_vs_par": score_vs_par,
            "front_score": front_score,
            "back_score": back_score,
            "front_par": front_par,
            "back_par": back_par,
            "front_vs_par": front_vs_par,
            "back_vs_par": back_vs_par,
            "holes": holes,
        }

        # Individual hole scores — always write up to 18 for consistent schema
        for i in range(1, 19):
            score = hole_scores.get(i)
            par = pars.get(i)
            round_record[f"hole_{i}_score"] = score
            round_record[f"hole_{i}_par"] = par
            round_record[f"hole_{i}_vs_par"] = (
                (score - par)
                if score is not None and par is not None
                else None
            )

        rounds.append(round_record)

    return course_meta, rounds


def fetch_weather(lat: float, lon: float, dt: datetime) -> dict:
    """
    Fetch historical weather from Open-Meteo for a given location and datetime.
    Returns temperature, wind speed, precipitation, and weather code.
    """
    date_str = dt.strftime("%Y-%m-%d")
    hour = dt.hour

    url = (
        "https://archive-api.open-meteo.com/v1/archive"
        f"?latitude={lat}&longitude={lon}"
        f"&start_date={date_str}&end_date={date_str}"
        "&hourly=temperature_2m,wind_speed_10m,precipitation,weather_code"
        "&temperature_unit=fahrenheit"
        "&wind_speed_unit=mph"
        "&precipitation_unit=inch"
        "&timezone=America/New_York"
    )

    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        data = response.json()

        hourly = data.get("hourly", {})
        times = hourly.get("time", [])

        target_time = f"{date_str}T{hour:02d}:00"
        if target_time in times:
            idx = times.index(target_time)
            return {
                "temp_f": hourly["temperature_2m"][idx],
                "wind_mph": hourly["wind_speed_10m"][idx],
                "precip_in": hourly["precipitation"][idx],
                "weather_code": hourly["weather_code"][idx],
            }
    except Exception as e:
        print(f"Weather fetch failed for {date_str} {hour}:00: {e}")

    return {
        "temp_f": None,
        "wind_mph": None,
        "precip_in": None,
        "weather_code": None,
    }


def weather_code_description(code) -> str:
    """Convert WMO weather code to a human-readable description."""
    if code is None:
        return None
    codes = {
        0: "Clear sky",
        1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
        45: "Foggy", 48: "Icy fog",
        51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
        61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
        71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow",
        77: "Snow grains",
        80: "Slight showers", 81: "Moderate showers", 82: "Violent showers",
        85: "Slight snow showers", 86: "Heavy snow showers",
        95: "Thunderstorm",
        96: "Thunderstorm with slight hail",
        99: "Thunderstorm with heavy hail",
    }
    return codes.get(int(code), f"Unknown ({code})")


def lambda_handler(event, context):
    """Main Lambda handler — refresh disc golf data from Google Sheets."""
    print("Starting disc golf data refresh...")

    courses = load_courses()
    all_rounds = []
    all_course_meta = []

    for course in courses:
        course_key = course["course_key"]
        print(f"Fetching sheet: {course_key}")
        try:
            df = fetch_sheet(course["sheet_name"])
            course_meta, rounds = parse_course(df, course)
            all_course_meta.append(course_meta)
            print(f"  Found {len(rounds)} rounds for {course_key}")

            for round_record in rounds:
                print(f"  Fetching weather for {round_record['date']}...")
                weather = fetch_weather(
                    lat=course["lat"],
                    lon=course["lon"],
                    dt=round_record["datetime"],
                )
                round_record.update({
                    "temp_f": weather["temp_f"],
                    "wind_mph": weather["wind_mph"],
                    "precip_in": weather["precip_in"],
                    "weather_code": weather["weather_code"],
                    "weather_desc": weather_code_description(
                        weather["weather_code"]
                    ),
                })
            all_rounds.extend(rounds)

        except Exception as e:
            print(f"Error processing {course_key}: {e}")
            raise

    print(f"Total rounds: {len(all_rounds)}")

    df_rounds = pd.DataFrame(all_rounds)
    df_rounds["datetime"] = pd.to_datetime(df_rounds["datetime"])

    table = pa.Table.from_pandas(df_rounds)
    buffer = io.BytesIO()
    pq.write_table(table, buffer)
    buffer.seek(0)

    s3 = boto3.client("s3")
    s3.put_object(
        Bucket=DATA_BUCKET,
        Key=PARQUET_KEY,
        Body=buffer.getvalue(),
        ContentType="application/octet-stream",
    )

    print(f"Wrote {len(all_rounds)} rounds to s3://{DATA_BUCKET}/{PARQUET_KEY}")

    s3.put_object(
        Bucket=DATA_BUCKET,
        Key="course_meta.json",
        Body=json.dumps(all_course_meta, indent=2),
        ContentType="application/json",
    )

    print("Refresh complete.")

    return {
        "statusCode": 200,
        "body": json.dumps({
            "rounds": len(all_rounds),
            "courses": len(all_course_meta),
        })
    }


if __name__ == "__main__":
    # Local testing — loads courses from disk, writes Parquet locally
    with open("data/courses.json") as f:
        courses = json.load(f)

    print("Starting local test...")
    all_rounds = []
    all_course_meta = []

    for course in courses:
        course_key = course["course_key"]
        print(f"Fetching sheet: {course_key}")
        df = fetch_sheet(course["sheet_name"])
        course_meta, rounds = parse_course(df, course)
        all_course_meta.append(course_meta)
        print(f"  Found {len(rounds)} rounds")

        for round_record in rounds:
            print(f"  Fetching weather for {round_record['date']}...")
            weather = fetch_weather(
                lat=course["lat"],
                lon=course["lon"],
                dt=round_record["datetime"],
            )
            round_record.update({
                "temp_f": weather["temp_f"],
                "wind_mph": weather["wind_mph"],
                "precip_in": weather["precip_in"],
                "weather_code": weather["weather_code"],
                "weather_desc": weather_code_description(
                    weather["weather_code"]
                ),
            })
        all_rounds.extend(rounds)

    df_rounds = pd.DataFrame(all_rounds)
    df_rounds["datetime"] = pd.to_datetime(df_rounds["datetime"])

    os.makedirs("data", exist_ok=True)
    table = pa.Table.from_pandas(df_rounds)
    pq.write_table(table, "data/rounds.parquet")

    print(f"\nWrote {len(all_rounds)} rounds to data/rounds.parquet")
    print(f"\nColumns:\n{list(df_rounds.columns)}")
    print(f"\nFirst round:\n{df_rounds.iloc[0].to_dict()}")
    print(f"\nLast round:\n{df_rounds.iloc[-1].to_dict()}")