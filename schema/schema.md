\# Disc Golf Stats Schema



\## General Notes

\- Data is stored in a Parquet file queried via DuckDB

\- The data is accessed through a view called `rounds`

\- There are two courses: "Brambleton" and "Franklin Park"

\- score\_vs\_par is positive for over par, negative for under par

\- All hole columns go from 1 to 18. For both courses all 18 holes exist.

\- Weather columns (temp\_f, wind\_mph, precip\_in, weather\_code, weather\_desc)

&#x20; may be NULL for some rounds if the weather API call failed

\- Always use the course column (not course\_key) when filtering by course

\- DuckDB supports standard SQL including CTEs, window functions, and QUALIFY



\## View: rounds

One row represents one complete round of disc golf.



| Column | Type | Description |

|---|---|---|

| round\_id | VARCHAR | Unique identifier for the round (course\_key + datetime) |

| course\_key | VARCHAR | Internal course identifier — use course column instead |

| course | VARCHAR | Course name: "Brambleton" or "Franklin Park" |

| datetime | TIMESTAMP | Full datetime of the round |

| date | VARCHAR | Date of the round in YYYY-MM-DD format |

| year | BIGINT | Year of the round |

| month | BIGINT | Month number of the round (1-12) |

| day\_of\_week | VARCHAR | Day of week e.g. "Saturday", "Sunday" |

| hour | BIGINT | Hour of day the round started (24-hour) |

| total\_score | BIGINT | Total strokes for the round |

| total\_par | BIGINT | Total par for the course layout |

| score\_vs\_par | BIGINT | total\_score minus total\_par (negative = under par) |

| front\_score | BIGINT | Total strokes for holes 1-9 |

| back\_score | BIGINT | Total strokes for holes 10-18 |

| front\_par | BIGINT | Par for holes 1-9 |

| back\_par | BIGINT | Par for holes 10-18 |

| front\_vs\_par | BIGINT | front\_score minus front\_par |

| back\_vs\_par | BIGINT | back\_score minus back\_par |

| holes | BIGINT | Number of holes played (always 18) |

| hole\_1\_score | BIGINT | Strokes on hole 1 |

| hole\_1\_par | BIGINT | Par for hole 1 |

| hole\_1\_vs\_par | BIGINT | hole\_1\_score minus hole\_1\_par |

| hole\_2\_score | BIGINT | Strokes on hole 2 |

| hole\_2\_par | BIGINT | Par for hole 2 |

| hole\_2\_vs\_par | BIGINT | hole\_2\_score minus hole\_2\_par |

| ... | ... | Same pattern for holes 3 through 17 ... |

| hole\_18\_score | BIGINT | Strokes on hole 18 |

| hole\_18\_par | BIGINT | Par for hole 18 |

| hole\_18\_vs\_par | BIGINT | hole\_18\_score minus hole\_18\_par |

| temp\_f | DOUBLE | Temperature in Fahrenheit at tee time (may be NULL) |

| wind\_mph | DOUBLE | Wind speed in mph at tee time (may be NULL) |

| precip\_in | DOUBLE | Precipitation in inches at tee time (may be NULL) |

| weather\_code | BIGINT | WMO weather code (may be NULL) |

| weather\_desc | VARCHAR | Human-readable weather description e.g. "Partly cloudy" (may be NULL) |



\## Weather Description Values

Clear sky, Mainly clear, Partly cloudy, Overcast, Foggy, Icy fog,

Light drizzle, Moderate drizzle, Dense drizzle, Slight rain, Moderate rain,

Heavy rain, Slight snow, Moderate snow, Heavy snow, Snow grains,

Slight showers, Moderate showers, Violent showers, Slight snow showers,

Heavy snow showers, Thunderstorm, Thunderstorm with slight hail,

Thunderstorm with heavy hail



\## Course Information Tool

Use get\_course\_info to retrieve course metadata including:

\- holes: number of holes

\- total\_par: total par for the course

\- front\_par: par for the front nine

\- back\_par: par for the back nine

\- hole\_pars: dict of hole number to par value

\- hole\_distances: dict of hole number to distance in feet

Use this tool when the user asks about course layout, hole distances,

or par values for specific holes.

