import json
import os
import boto3
from dotenv import load_dotenv

load_dotenv()

CHAT_SECRET_KEY = os.environ.get("CHAT_SECRET_KEY", "")


def lambda_handler(event, context):
    """Agent Lambda handler — validates secret key and runs the agent."""
    try:
        if isinstance(event.get("body"), str):
            body = json.loads(event["body"])
        else:
            body = event.get("body", event)

        # Validate secret key
        provided_key = body.get("secret_key", "")
        if not provided_key or provided_key != CHAT_SECRET_KEY:
            return {
                "statusCode": 403,
                "headers": cors_headers(),
                "body": json.dumps({
                    "error": "Invalid secret key."
                })
            }

        question = body.get("question", "").strip()
        if not question:
            return {
                "statusCode": 400,
                "headers": cors_headers(),
                "body": json.dumps({"error": "question is required"})
            }

        # Import here to avoid cold start issues with large imports
        from agent.orchestrator import run_agent
        answer = run_agent(question)

        print(f"Question: {question}")
        print(f"Answer: {answer}")

        return {
            "statusCode": 200,
            "headers": cors_headers(),
            "body": json.dumps({"answer": answer})
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