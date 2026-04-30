output "data_bucket_name" {
  value       = aws_s3_bucket.data.bucket
  description = "S3 bucket storing the Parquet data file"
}

output "frontend_bucket_name" {
  value       = aws_s3_bucket.frontend.bucket
  description = "S3 bucket hosting the React frontend"
}

output "frontend_url" {
  value       = "http://${aws_s3_bucket_website_configuration.frontend.website_endpoint}"
  description = "URL of the frontend website"
}

output "api_gateway_url" {
  value       = aws_api_gateway_stage.main.invoke_url
  description = "Base URL for the API Gateway"
}