Write-Host "Deploying disc-golf-stats-query Lambda..."

# Clean up previous build
if (Test-Path package_query) { Remove-Item -Recurse -Force package_query }
if (Test-Path deployment_query.zip) { Remove-Item deployment_query.zip }

# Create package directory
New-Item -ItemType Directory -Path package_query | Out-Null

# Install dependencies using Docker for Linux compatibility
Write-Host "Installing dependencies..."
docker run --name query_build python:3.12 `
    pip install duckdb pyarrow boto3 python-dotenv -t /package
docker cp query_build:/package/. ./package_query/
docker rm query_build

# Strip unnecessary files but keep dist-info (required by duckdb)
Write-Host "Stripping unnecessary files..."
Get-ChildItem -Path package_query -Recurse -Include "*.egg-info" -Directory | Remove-Item -Recurse -Force
Get-ChildItem -Path package_query -Recurse -Include "tests" -Directory | Remove-Item -Recurse -Force
Get-ChildItem -Path package_query -Recurse -Include "test" -Directory | Remove-Item -Recurse -Force
Get-ChildItem -Path package_query -Recurse -Include "*.pyc" | Remove-Item -Force
Get-ChildItem -Path package_query -Recurse -Include "__pycache__" -Directory | Remove-Item -Recurse -Force
Get-ChildItem -Path package_query -Recurse -Include "*.pyi" | Remove-Item -Force
Get-ChildItem -Path package_query -Recurse -Include "*.md" | Remove-Item -Force
Get-ChildItem -Path package_query -Recurse -Include "*.txt" | Remove-Item -Force
Get-ChildItem -Path package_query -Recurse -Include "*.rst" | Remove-Item -Force

# Copy function code
Write-Host "Copying function code..."
Copy-Item backend/query/lambda_function.py package_query/

# Create zip
Write-Host "Creating deployment zip..."
Compress-Archive -Path package_query/* -DestinationPath deployment_query.zip

# Check size
$zipSize = (Get-Item deployment_query.zip).Length / 1MB
Write-Host "Zip size: $([math]::Round($zipSize, 1)) MB"

# Upload to S3
Write-Host "Uploading to S3..."
aws s3 cp deployment_query.zip `
    s3://disc-golf-stats-data-55bbe7f4/deployments/deployment_query.zip `
    --profile disc-golf-dev

# Deploy from S3
Write-Host "Deploying to AWS Lambda from S3..."
aws lambda update-function-code `
    --function-name disc-golf-stats-query `
    --s3-bucket disc-golf-stats-data-55bbe7f4 `
    --s3-key deployments/deployment_query.zip `
    --profile disc-golf-dev

Write-Host "Query Lambda deployed successfully."