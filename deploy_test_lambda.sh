#!/bin/bash

# Set variables
LAMBDA_FUNCTION_NAME="processVideoLambda"
S3_BUCKET_NAME="vid-forge"
VIDEO_FILE_PATH="./assets/s3_test_video.mp4"
ZIP_FILE="process-video-lambda.zip"
HANDLER="src/handlers/videoProcessor.handler"
RUNTIME="nodejs18.x"
ROLE_ARN="arn:aws:iam::000000000000:role/lambda-role"

# Step 1: Install dependencies and zip the Lambda function
echo "Installing dependencies..."
npm install

echo "Creating zip package for Lambda..."
zip -r $ZIP_FILE . -x "*.git*" "*.DS_Store*" "*.env"

# Step 2: Check if the Lambda function already exists
EXISTS=$(awslocal lambda list-functions | grep $LAMBDA_FUNCTION_NAME)

# Step 3: Create or Update the Lambda Function in LocalStack
if [ -z "$EXISTS" ]; then
    echo "Creating Lambda function $LAMBDA_FUNCTION_NAME..."
    awslocal lambda create-function \
      --function-name $LAMBDA_FUNCTION_NAME \
      --runtime $RUNTIME \
      --handler $HANDLER \
      --zip-file fileb://$ZIP_FILE \
      --role $ROLE_ARN
else
    echo "Updating Lambda function $LAMBDA_FUNCTION_NAME..."
    awslocal lambda update-function-code \
      --function-name $LAMBDA_FUNCTION_NAME \
      --zip-file fileb://$ZIP_FILE
fi

# Step 4: Ensure S3 bucket is created
BUCKET_EXISTS=$(awslocal s3api list-buckets | grep $S3_BUCKET_NAME)
if [ -z "$BUCKET_EXISTS" ]; then
    echo "Creating S3 bucket $S3_BUCKET_NAME..."
    awslocal s3api create-bucket --bucket $S3_BUCKET_NAME
fi

# Step 5: Set up the S3 trigger for Lambda function
echo "Configuring S3 bucket to trigger Lambda function on upload..."
awslocal s3api put-bucket-notification-configuration \
  --bucket $S3_BUCKET_NAME \
  --notification-configuration '{
    "LambdaFunctionConfigurations": [
      {
        "LambdaFunctionArn": "arn:aws:lambda:us-east-1:000000000000:function:processVideoLambda",
        "Events": ["s3:ObjectCreated:*"]
      }
    ]
  }'

# Step 6: Upload the video to S3 using Node.js script
echo "Uploading video $VIDEO_FILE_PATH to S3..."
node ./scripts/upload-video.js $VIDEO_FILE_PATH $S3_BUCKET_NAME

echo "Deployment and video upload complete!"
