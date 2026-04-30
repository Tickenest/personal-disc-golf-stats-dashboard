variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "aws_profile" {
  type    = string
  default = "default"
}

variable "project_name" {
  type    = string
  default = "disc-golf-stats"
}

variable "spreadsheet_id" {
  type        = string
  description = "Google Sheets spreadsheet ID"
}

variable "chat_secret_key" {
  type        = string
  sensitive   = true
  description = "Secret key required to use the AI chat interface"
}

variable "daily_input_token_budget" {
  type        = number
  default     = 50000
  description = "Maximum input tokens per day for Bedrock"
}

variable "daily_output_token_budget" {
  type        = number
  default     = 10000
  description = "Maximum output tokens per day for Bedrock"
}

variable "api_throttle_rate" {
  type        = number
  default     = 5
  description = "API Gateway requests per minute"
}