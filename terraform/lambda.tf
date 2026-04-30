# CloudWatch log groups
resource "aws_cloudwatch_log_group" "refresh" {
  name              = "/aws/lambda/${var.project_name}-refresh"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "query" {
  name              = "/aws/lambda/${var.project_name}-query"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "agent" {
  name              = "/aws/lambda/${var.project_name}-agent"
  retention_in_days = 30
}

# DynamoDB table for daily token budget tracking
resource "aws_dynamodb_table" "token_budget" {
  name         = "${var.project_name}-token-budget"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "date"

  attribute {
    name = "date"
    type = "S"
  }

  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }
}

# Refresh Lambda
resource "aws_lambda_function" "refresh" {
  function_name = "${var.project_name}-refresh"
  role          = aws_iam_role.refresh.arn
  runtime       = "python3.12"
  handler       = "lambda_function.lambda_handler"
  filename      = "../deployment_refresh.zip"
  timeout       = 300
  memory_size   = 512

  environment {
    variables = {
      DATA_BUCKET    = aws_s3_bucket.data.bucket
      SPREADSHEET_ID = var.spreadsheet_id
    }
  }

  depends_on = [aws_cloudwatch_log_group.refresh]
}

# Query Lambda
resource "aws_lambda_function" "query" {
  function_name = "${var.project_name}-query"
  role          = aws_iam_role.query.arn
  runtime       = "python3.12"
  handler       = "lambda_function.lambda_handler"
  filename      = "../deployment_query.zip"
  timeout       = 60
  memory_size   = 1024

  environment {
    variables = {
      DATA_BUCKET = aws_s3_bucket.data.bucket
    }
  }

  depends_on = [aws_cloudwatch_log_group.query]
}

# Agent Lambda
resource "aws_lambda_function" "agent" {
  function_name = "${var.project_name}-agent"
  role          = aws_iam_role.agent.arn
  runtime       = "python3.12"
  handler       = "lambda_function.lambda_handler"
  filename      = "../deployment_agent.zip"
  timeout       = 300
  memory_size   = 1024

  environment {
    variables = {
      DATA_BUCKET               = aws_s3_bucket.data.bucket
      CHAT_SECRET_KEY           = var.chat_secret_key
      DAILY_INPUT_TOKEN_BUDGET  = var.daily_input_token_budget
      DAILY_OUTPUT_TOKEN_BUDGET = var.daily_output_token_budget
      TOKEN_BUDGET_TABLE        = aws_dynamodb_table.token_budget.name
    }
  }

  depends_on = [aws_cloudwatch_log_group.agent]
}