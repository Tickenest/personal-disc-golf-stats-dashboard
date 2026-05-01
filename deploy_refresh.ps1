Write-Host "Deploying disc-golf-stats-refresh Lambda..."

# Clean up previous build
if (Test-Path package_refresh) { Remove-Item -Recurse -Force package_refresh }
if (Test-Path deployment_refresh.zip) { Remove-Item deployment_refresh.zip }

# Create package directory
New-Item -ItemType Directory -Path package_refresh | Out-Null

# Install dependencies using Docker for Linux compatibility
Write-Host "Installing dependencies..."
docker run --name refresh_build python:3.12 `
    pip install pandas requests pyarrow python-dotenv boto3 -t /package
docker cp refresh_build:/package/. ./package_refresh/
docker rm refresh_build

# Strip unnecessary files to reduce package size
Write-Host "Stripping unnecessary files..."
Get-ChildItem -Path package_refresh -Recurse -Include "*.dist-info" -Directory | Remove-Item -Recurse -Force
Get-ChildItem -Path package_refresh -Recurse -Include "*.egg-info" -Directory | Remove-Item -Recurse -Force
Get-ChildItem -Path package_refresh -Recurse -Include "tests" -Directory | Remove-Item -Recurse -Force
Get-ChildItem -Path package_refresh -Recurse -Include "test" -Directory | Remove-Item -Recurse -Force
Get-ChildItem -Path package_refresh -Recurse -Include "*.pyc" | Remove-Item -Force
Get-ChildItem -Path package_refresh -Recurse -Include "__pycache__" -Directory | Remove-Item -Recurse -Force
Get-ChildItem -Path package_refresh -Recurse -Include "*.pyi" | Remove-Item -Force
Get-ChildItem -Path package_refresh -Recurse -Include "*.md" | Remove-Item -Force
Get-ChildItem -Path package_refresh -Recurse -Include "*.txt" | Remove-Item -Force
Get-ChildItem -Path package_refresh -Recurse -Include "*.rst" | Remove-Item -Force

# Copy function code
Write-Host "Copying function code..."
Copy-Item backend/refresh/lambda_function.py package_refresh/

# Create zip
Write-Host "Creating deployment zip..."
Compress-Archive -Path package_refresh/* -DestinationPath deployment_refresh.zip

# Check sizes
$zipSize = (Get-Item deployment_refresh.zip).Length / 1MB
Write-Host "Zip size: $([math]::Round($zipSize, 1)) MB"

# Upload zip to S3
Write-Host "Uploading to S3..."
aws s3 cp deployment_refresh.zip `
    s3://disc-golf-stats-data-55bbe7f4/deployments/deployment_refresh.zip `
    --profile disc-golf-dev

# Deploy to Lambda from S3
Write-Host "Deploying to AWS Lambda from S3..."
aws lambda update-function-code `
    --function-name disc-golf-stats-refresh `
    --s3-bucket disc-golf-stats-data-55bbe7f4 `
    --s3-key deployments/deployment_refresh.zip `
    --profile disc-golf-dev

Write-Host "Refresh Lambda deployed successfully."