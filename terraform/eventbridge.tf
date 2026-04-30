# Daily refresh schedule — runs at 6 AM UTC every day
resource "aws_cloudwatch_event_rule" "daily_refresh" {
  name                = "${var.project_name}-daily-refresh"
  description         = "Triggers the disc golf data refresh Lambda daily"
  schedule_expression = "cron(0 6 * * ? *)"
}

resource "aws_cloudwatch_event_target" "daily_refresh" {
  rule      = aws_cloudwatch_event_rule.daily_refresh.name
  target_id = "RefreshLambda"
  arn       = aws_lambda_function.refresh.arn
}

resource "aws_lambda_permission" "eventbridge_refresh" {
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.refresh.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.daily_refresh.arn
}