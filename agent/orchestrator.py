import json
import os
import boto3
from datetime import datetime, timezone
from dotenv import load_dotenv
from agent.prompts import SYSTEM_PROMPT
from mcp_server.server import execute_sql, get_course_info

load_dotenv()

MODEL_ID = "us.anthropic.claude-haiku-4-5-20251001-v1:0"
TOKEN_BUDGET_TABLE = os.environ.get(
    "TOKEN_BUDGET_TABLE", "disc-golf-stats-token-budget"
)
DAILY_INPUT_BUDGET = int(os.environ.get("DAILY_INPUT_TOKEN_BUDGET", 50000))
DAILY_OUTPUT_BUDGET = int(os.environ.get("DAILY_OUTPUT_TOKEN_BUDGET", 10000))

bedrock = boto3.client("bedrock-runtime", region_name="us-east-1")
dynamodb = boto3.resource("dynamodb", region_name="us-east-1")

TOOLS = [
    {
        "toolSpec": {
            "name": "execute_sql",
            "description": (
                "Execute a read-only DuckDB SQL SELECT query against the "
                "disc golf rounds dataset. The data is in a view called 'rounds'."
            ),
            "inputSchema": {
                "json": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "A DuckDB SQL SELECT statement"
                        }
                    },
                    "required": ["query"]
                }
            }
        }
    },
    {
        "toolSpec": {
            "name": "get_course_info",
            "description": (
                "Get course metadata including hole pars, distances, and layout. "
                "Use when the user asks about the course itself rather than scores."
            ),
            "inputSchema": {
                "json": {
                    "type": "object",
                    "properties": {
                        "course": {
                            "type": "string",
                            "description": (
                                "Course name: 'Brambleton' or 'Franklin Park'. "
                                "Omit to get info for all courses."
                            )
                        }
                    },
                    "required": []
                }
            }
        }
    }
]


def check_token_budget() -> tuple[bool, str]:
    """
    Check whether the daily token budget has been exceeded.
    Returns (within_budget, message).
    """
    if not os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
        return True, ""

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    table = dynamodb.Table(TOKEN_BUDGET_TABLE)

    try:
        response = table.get_item(Key={"date": today})
        item = response.get("Item", {})
        input_tokens = item.get("input_tokens", 0)
        output_tokens = item.get("output_tokens", 0)

        if input_tokens >= DAILY_INPUT_BUDGET:
            return False, (
                "The daily question budget has been reached. "
                "Please try again tomorrow."
            )
        if output_tokens >= DAILY_OUTPUT_BUDGET:
            return False, (
                "The daily question budget has been reached. "
                "Please try again tomorrow."
            )
    except Exception as e:
        print(f"Budget check error: {e}")

    return True, ""


def update_token_budget(input_tokens: int, output_tokens: int):
    """Update the daily token usage in DynamoDB."""
    if not os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
        return

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    # TTL 2 days from now
    expires_at = int(datetime.now(timezone.utc).timestamp()) + (2 * 24 * 60 * 60)
    table = dynamodb.Table(TOKEN_BUDGET_TABLE)

    try:
        table.update_item(
            Key={"date": today},
            UpdateExpression=(
                "SET input_tokens = if_not_exists(input_tokens, :zero) + :input, "
                "output_tokens = if_not_exists(output_tokens, :zero) + :output, "
                "expires_at = :ttl"
            ),
            ExpressionAttributeValues={
                ":input": input_tokens,
                ":output": output_tokens,
                ":zero": 0,
                ":ttl": expires_at,
            }
        )
    except Exception as e:
        print(f"Budget update error: {e}")


def run_agent(question: str) -> str:
    """
    Run the agentic loop for a given question.
    Returns the final formatted answer as a string.
    """
    within_budget, budget_message = check_token_budget()
    if not within_budget:
        return budget_message

    messages = [{"role": "user", "content": [{"text": question}]}]
    total_input_tokens = 0
    total_output_tokens = 0

    while True:
        response = bedrock.converse(
            modelId=MODEL_ID,
            system=[{"text": SYSTEM_PROMPT}],
            toolConfig={"tools": TOOLS},
            messages=messages
        )

        usage = response.get("usage", {})
        total_input_tokens += usage.get("inputTokens", 0)
        total_output_tokens += usage.get("outputTokens", 0)

        output_message = response["output"]["message"]
        messages.append(output_message)
        stop_reason = response["stopReason"]

        if stop_reason == "end_turn":
            update_token_budget(total_input_tokens, total_output_tokens)
            for block in output_message["content"]:
                if "text" in block:
                    return block["text"]
            return "No response generated."

        if stop_reason == "tool_use":
            tool_results = []
            for block in output_message["content"]:
                if "toolUse" in block:
                    tool_use = block["toolUse"]
                    tool_name = tool_use["name"]
                    tool_input = tool_use["input"]
                    tool_use_id = tool_use["toolUseId"]

                    if tool_name == "execute_sql":
                        result = execute_sql(query=tool_input["query"])
                    elif tool_name == "get_course_info":
                        result = get_course_info(
                            course=tool_input.get("course")
                        )
                    else:
                        result = json.dumps({
                            "error": f"Unknown tool: {tool_name}"
                        })

                    tool_results.append({
                        "toolResult": {
                            "toolUseId": tool_use_id,
                            "content": [{"text": result}]
                        }
                    })

            messages.append({"role": "user", "content": tool_results})


if __name__ == "__main__":
    print("Disc Golf Stats Agent ready. Type 'quit' to exit.\n")
    while True:
        question = input("Question: ").strip()
        if question.lower() == "quit":
            break
        if question:
            answer = run_agent(question)
            print(f"\nAnswer:\n{answer}\n")