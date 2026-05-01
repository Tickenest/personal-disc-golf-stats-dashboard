# Personal Disc Golf Stats Dashboard

![Python](https://img.shields.io/badge/Python-3.12-blue?logo=python&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![AWS Lambda](https://img.shields.io/badge/AWS-Lambda-FF9900?logo=awslambda&logoColor=white)
![Amazon Bedrock](https://img.shields.io/badge/Amazon-Bedrock-FF9900?logo=amazonaws&logoColor=white)
![MCP](https://img.shields.io/badge/MCP-Model%20Context%20Protocol-blueviolet)
![DuckDB](https://img.shields.io/badge/DuckDB-Parquet-yellow)
![Terraform](https://img.shields.io/badge/Terraform-IaC-7B42BC?logo=terraform&logoColor=white)

A personal analytics dashboard for disc golf statistics, built with AWS Lambda, DuckDB, React, and an agentic AI assistant powered by Claude via Amazon Bedrock. Scores are sourced from a personal Google Sheet, enriched with historical weather data, and stored as a Parquet file on S3 — queried on demand with no persistent database infrastructure.

---

## Background

This project tracks personal disc golf rounds at two courses. Scores are recorded in UDisc and manually transcribed to a Google Sheet after each round. This dashboard automates the analysis, adds weather context, and provides a natural language AI assistant for answering questions about performance.

---

## What It Does

The dashboard provides:

- **Course summary** — rounds played, best score, average score, and scoring averages vs par for each course
- **Scoring trend** — line chart of every round's score vs par over time with a 5-round rolling average, filterable by course
- **Hole breakdown** — bar chart showing average score vs par for each hole, color coded by difficulty, switchable between courses
- **Performance by weather** — how scoring averages vary by temperature and wind conditions
- **Recent rounds** — the five most recent rounds with scores and weather conditions
- **All rounds viewer** — every round in a scrollable, filterable, sortable table with color-coded hole-by-hole scores and weather columns
- **Round comparison** — compare any individual round's hole-by-hole scores against your average at that course, with a bar chart and summary of which holes were better or worse than average
- **AI chat assistant** — ask natural language questions about your stats, answered by an MCP-powered agent that writes DuckDB SQL dynamically

---

## Architecture

```
Google Sheets (score data)
        |
Refresh Lambda (daily via EventBridge)
  - Reads CSV export from Google Sheets
  - Detects course structure dynamically
  - Fetches historical weather from Open-Meteo API
  - Writes enriched rounds.parquet to S3
        |
S3 (stores rounds.parquet + course_meta.json)
        |
        +---> Query Lambda (structured dashboard queries)
        |       - DuckDB reads Parquet directly from S3
        |       - Six named query types
        |       - Called by React frontend via API Gateway
        |
        +---> Agent Lambda (natural language queries)
                - MCP server exposes execute_sql + get_course_info tools
                - Claude (via Bedrock) writes DuckDB SQL dynamically
                - Token budget enforced via DynamoDB
                - Secret key required to access chat
        |
API Gateway (REST API, API key required, throttled)
        |
React Frontend (hosted on S3 static website)
```

---

## What Makes This Interesting

### Terraform Infrastructure as Code
The entire AWS infrastructure is defined in Terraform — S3 buckets, Lambda functions, IAM roles and policies, API Gateway with CORS and throttling, EventBridge schedule, DynamoDB token budget table, and CloudWatch log groups. Every resource is reproducible from a single `terraform apply`. This was the first project in this series built infrastructure-first with Terraform rather than manually through the AWS console.

### DuckDB + Parquet — No Database Server Required
Rather than running a managed database like RDS or Aurora, this project stores all data as a single Parquet file on S3 and queries it with DuckDB — an in-process analytical database that runs inside the Lambda function itself. DuckDB reads only the columns each query needs from the Parquet file, making it extremely fast for analytical workloads. The result is full SQL analytical power with zero infrastructure overhead and essentially zero cost. No VPC, no connection pooling, no always-on database charges.

### Weather Enrichment via Open-Meteo
Every round is enriched with historical weather data from the Open-Meteo archive API — temperature, wind speed, precipitation, and a human-readable weather description for the specific date, time, and GPS coordinates of each course. This enables genuine performance analysis by weather condition, answering questions like "do I play better in warm calm weather or does it not matter?"

### Agentic AI with MCP
The chat assistant uses Anthropic's Model Context Protocol (MCP) — an open standard for connecting AI models to external tools. The MCP server exposes two tools:

- **`execute_sql`** — Claude writes DuckDB SQL dynamically based on the question and the schema document in the system prompt. This means the agent can answer questions that were never anticipated at build time.
- **`get_course_info`** — returns course metadata (hole pars, distances, layout) from a JSON file on S3. Used when the user asks about the course itself rather than round scores.

Claude reasons about which tool to call, writes the appropriate query, examines the results, and formats a conversational answer. The agent runs on Amazon Bedrock with a daily token budget enforced via DynamoDB to prevent runaway costs.

### Dynamic Course Detection
The refresh Lambda detects course structure (number of holes, par values, distances) dynamically from the sheet layout rather than hardcoding it. Adding a new course requires only adding an entry to `courses.json` on S3 — no code changes and no redeployment needed.

### Cost Profile
This project is designed to run at essentially zero ongoing cost:
- **S3** — pennies per month for ~5MB of data and static website hosting
- **Lambda** — free tier covers all invocations at this usage volume
- **DynamoDB** — pay-per-request, essentially free at personal usage scale
- **API Gateway** — free tier covers all requests
- **Open-Meteo** — completely free, no API key required
- **Bedrock** — the only real cost, approximately $0.01 per chat question using Claude Haiku

---

## Example Chat Questions

The AI assistant can answer a wide range of natural language questions:

**Performance questions:**
- "What is my best round at <insert course here>?"
- "Which hole costs me the most strokes on average at <insert course here>?"
- "How has my scoring average changed from 2024 to 2025?"
- "What percentage of my rounds at <insert course here> have I broken par?"

**Weather questions:**
- "Do I play better in warm weather or cool weather?"
- "What is my average score when wind speed is above 10 mph?"
- "What was the weather like during my best round?"

**Course questions:**
- "How long is hole 14 at <insert course here>?"
- "What is the par for the back nine at <insert course here>?"
- "Which course has a higher total par?"

**Trend questions:**
- "What are my five best rounds of all time?"
- "How many rounds did I play in 2025?"
- "What month do I tend to play best?"

---

## Project Structure

```
personal-disc-golf-stats-dashboard/
├── terraform/                   — complete AWS infrastructure as code
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   ├── s3.tf
│   ├── lambda.tf
│   ├── api_gateway.tf
│   ├── iam.tf
│   ├── eventbridge.tf
│   └── terraform.tfvars         — not in git (contains secrets)
├── backend/
│   ├── refresh/
│   │   └── lambda_function.py   — Google Sheets → weather → Parquet → S3
│   └── query/
│       └── lambda_function.py   — DuckDB query handler for dashboard panels
├── agent/
│   ├── orchestrator.py          — agentic loop, Bedrock API, token budget
│   └── prompts.py               — system prompt with embedded schema
├── mcp_server/
│   └── server.py                — MCP server, execute_sql + get_course_info tools
├── frontend/
│   └── src/
│       ├── App.js               — main app, data fetching
│       ├── App.css              — styles
│       ├── config.js            — API URL and key (not in git)
│       ├── config.example.js    — config template
│       ├── components/
│       │   ├── CourseSummary.js
│       │   ├── ScoringTrend.js
│       │   ├── HoleBreakdown.js
│       │   ├── WeatherCorrelation.js
│       │   ├── RecentRounds.js
│       │   ├── RoundViewer.js
│       │   ├── RoundComparison.js
│       │   └── ChatBox.js
│       └── utils/
│           └── colors.js        — shared color helper functions
├── schema/
│   └── schema.md                — DuckDB schema documentation for the agent
├── data/
│   ├── courses.json             — course configuration (sheet names, GPS coords)
│   └── README.md                — instructions for local data files
├── lambda_function.py           — agent Lambda handler, secret key validation
├── deploy_refresh.ps1           — deployment script for refresh Lambda (Windows)
├── deploy_query.ps1             — deployment script for query Lambda (Windows)
├── deploy_agent.ps1             — deployment script for agent Lambda (Windows)
└── requirements.txt             — Python dependencies
```

---

## Local Development Setup

### Prerequisites
- Python 3.12+
- Node.js 18+
- AWS CLI configured with appropriate credentials
- Docker (required for building Linux-compatible Lambda packages on Windows)
- Terraform 1.0+

### Python Setup

```bash
git clone https://github.com/Tickenest/personal-disc-golf-stats-dashboard.git
cd personal-disc-golf-stats-dashboard
python -m venv .venv
source .venv/Scripts/activate  # Windows Git Bash
pip install -r requirements.txt
```

### Configuration

Create a `.env` file in the project root:

```
AWS_PROFILE=your-aws-profile
DATA_BUCKET=your-s3-data-bucket-name
```

Download the data files from S3:

```bash
aws s3 cp s3://your-bucket/rounds.parquet data/rounds.parquet
aws s3 cp s3://your-bucket/course_meta.json data/course_meta.json
```

### Running the Agent Locally

```bash
python -m agent.orchestrator
```

### Running the Query Lambda Locally

```bash
python backend/query/lambda_function.py
```

### Frontend Setup

```bash
cd frontend
npm install
```

Create `frontend/src/config.js` based on `config.example.js` and fill in your API Gateway URL and API key. Then:

```bash
npm start
```

---

## AWS Deployment

### Prerequisites
- Terraform installed
- AWS CLI profile configured
- Docker running (for Lambda packaging)
- Claude Haiku 4.5 model access enabled in Amazon Bedrock

### Infrastructure

```bash
cd terraform
terraform init
terraform apply
```

### Lambda Deployment

```powershell
.\deploy_refresh.ps1
.\deploy_query.ps1
.\deploy_agent.ps1
```

### Frontend Deployment

```bash
cd frontend
npm run build
aws s3 sync build/ s3://your-frontend-bucket --profile your-profile
```

### Adding a New Course

1. Add a tab to your Google Sheet with the standard layout (Hole/Distance/Par rows followed by round rows)
2. Add an entry to `data/courses.json`
3. Upload the updated file to S3:
```bash
aws s3 cp data/courses.json s3://your-bucket/courses.json
```
4. Trigger the refresh Lambda — the new course is picked up automatically

---

## Known Notes

- Weather data comes from Open-Meteo's historical archive API. Very recent rounds (within the last day or two) may not yet have weather data available
- The AI chat interface requires a secret key configured via the `CHAT_SECRET_KEY` Lambda environment variable
- A daily token budget is enforced via DynamoDB to prevent excessive Bedrock costs

---

## Built By

[Tickenest](https://github.com/Tickenest)
