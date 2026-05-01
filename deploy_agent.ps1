Write-Host "Deploying disc-golf-stats-agent Lambda..."

# Clean up previous build
if (Test-Path package_agent) { Remove-Item -Recurse -Force package_agent }
if (Test-Path deployment_agent.zip) { Remove-Item deployment_agent.zip }

# Create package directory
New-Item -ItemType Directory -Path package_agent | Out-Null

# Install dependencies using Docker for Linux compatibility
Write-Host "Installing dependencies..."
docker run --name agent_build python:3.12 `
    pip install mcp duckdb pyarrow python-dotenv -t /package
docker cp agent_build:/package/. ./package_agent/
docker rm agent_build

# Remove boto3/botocore — Lambda runtime provides these
if (Test-Path package_agent/boto3) { Remove-Item -Recurse -Force package_agent/boto3 }
if (Test-Path package_agent/botocore) { Remove-Item -Recurse -Force package_agent/botocore }
if (Test-Path package_agent/s3transfer) { Remove-Item -Recurse -Force package_agent/s3transfer }
if (Test-Path package_agent/urllib3) { Remove-Item -Recurse -Force package_agent/urllib3 }

# Strip unnecessary files but keep dist-info (required by duckdb)
Write-Host "Stripping unnecessary files..."
Get-ChildItem -Path package_agent -Recurse -Include "*.egg-info" -Directory | Remove-Item -Recurse -Force
Get-ChildItem -Path package_agent -Recurse -Include "tests" -Directory | Remove-Item -Recurse -Force
Get-ChildItem -Path package_agent -Recurse -Include "test" -Directory | Remove-Item -Recurse -Force
Get-ChildItem -Path package_agent -Recurse -Include "*.pyc" | Remove-Item -Force
Get-ChildItem -Path package_agent -Recurse -Include "__pycache__" -Directory | Remove-Item -Recurse -Force
Get-ChildItem -Path package_agent -Recurse -Include "*.pyi" | Remove-Item -Force
Get-ChildItem -Path package_agent -Recurse -Include "*.md" | Remove-Item -Force
Get-ChildItem -Path package_agent -Recurse -Include "*.txt" | Remove-Item -Force
Get-ChildItem -Path package_agent -Recurse -Include "*.rst" | Remove-Item -Force
Get-ChildItem -Path package_agent -Recurse -Include "*.h" | Remove-Item -Force
Get-ChildItem -Path package_agent -Recurse -Include "*.c" | Remove-Item -Force
Get-ChildItem -Path package_agent -Recurse -Include "*.cpp" | Remove-Item -Force
Get-ChildItem -Path package_agent -Recurse -Include "*.pyx" | Remove-Item -Force
Get-ChildItem -Path package_agent -Recurse -Include "examples" -Directory | Remove-Item -Recurse -Force
Get-ChildItem -Path package_agent -Recurse -Include "docs" -Directory | Remove-Item -Recurse -Force

# Copy function code
Write-Host "Copying function code..."
Copy-Item lambda_function.py package_agent/
Copy-Item -Recurse agent package_agent/
Copy-Item -Recurse mcp_server package_agent/
New-Item -ItemType Directory -Path package_agent/schema -Force | Out-Null
Copy-Item schema/schema.md package_agent/schema/schema.md

# Check unzipped size before zipping
$unzippedSize = (Get-ChildItem -Path package_agent -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host "Unzipped size: $([math]::Round($unzippedSize, 1)) MB"

# Create zip
Write-Host "Creating deployment zip..."
Compress-Archive -Path package_agent/* -DestinationPath deployment_agent.zip

# Check zip size
$zipSize = (Get-Item deployment_agent.zip).Length / 1MB
Write-Host "Zip size: $([math]::Round($zipSize, 1)) MB"

# Check if unzipped size is within Lambda's 250MB limit
if ($unzippedSize -gt 250) {
    Write-Host "WARNING: Unzipped size exceeds Lambda's 250MB limit. Deployment may fail."
}

# Upload to S3
Write-Host "Uploading to S3..."
aws s3 cp deployment_agent.zip `
    s3://disc-golf-stats-data-55bbe7f4/deployments/deployment_agent.zip `
    --profile disc-golf-dev

# Deploy from S3
Write-Host "Deploying to AWS Lambda from S3..."
aws lambda update-function-code `
    --function-name disc-golf-stats-agent `
    --s3-bucket disc-golf-stats-data-55bbe7f4 `
    --s3-key deployments/deployment_agent.zip `
    --profile disc-golf-dev

Write-Host "Agent Lambda deployed successfully."