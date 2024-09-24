#!/bin/bash

# Define Variables
LAMBDA_FUNCTION_NAME="processVideoLambda"
S3_BUCKET_NAME="vid-forge"
VIDEO_FILE_PATH="./assets/s3_test_video.mp4"
ZIP_FILE="process-video-lambda.zip"
HANDLER="src/handlers/videoProcessor.handler"
RUNTIME="nodejs18.x"
ROLE_ARN="arn:aws:iam::000000000000:role/lambda-role"
LAYER_NAME="ffmpeg-layer"
LAYER_ARN="arn:aws:lambda:us-east-1:000000000000:layer:ffmpeg-layer:1"

# Step 1: Install dependencies
echo "Installing dependencies..."
npm install

# Step 2: Zip the Lambda function
echo "Creating zip package for Lambda..."
zip -r $ZIP_FILE . -x "*.git*" "*.DS_Store*" "*.env"

# Step 3: Check if the Lambda function exists
EXISTS=$(awslocal lambda list-functions | grep $LAMBDA_FUNCTION_NAME)

# Step 4: Create or Update the Lambda function
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

# Step 5: Attach the FFmpeg layer to the Lambda function
echo "Attaching FFmpeg layer to Lambda function..."
awslocal lambda update-function-configuration \
  --function-name $LAMBDA_FUNCTION_NAME \
  --layers $LAYER_ARN

# Step 6: Check if the S3 bucket exists
BUCKET_EXISTS=$(awslocal s3api list-buckets | grep $S3_BUCKET_NAME)
if [ -z "$BUCKET_EXISTS" ]; then
    echo "Creating S3 bucket $S3_BUCKET_NAME..."
    awslocal s3api create-bucket --bucket $S3_BUCKET_NAME
fi

# Step 7: Set up the S3 trigger for Lambda function
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

# Step 8: Upload a test video to S3 using Node.js script
echo "Uploading video $VIDEO_FILE_PATH to S3..."
node ./scripts/upload-video.js $VIDEO_FILE_PATH $S3_BUCKET_NAME

# Step 9: Clear CloudWatch logs
echo "Deleting old CloudWatch logs..."
awslocal logs delete-log-group --log-group-name /aws/lambda/$LAMBDA_FUNCTION_NAME
awslocal logs create-log-group --log-group-name /aws/lambda/$LAMBDA_FUNCTION_NAME

# Step 10: Fetch and display CloudWatch logs after Lambda invocation
echo "Fetching logs from CloudWatch..."
sleep 5 # Wait for the Lambda function to process and logs to appear
LOG_STREAM_NAME=$(awslocal logs describe-log-streams --log-group-name /aws/lambda/$LAMBDA_FUNCTION_NAME | grep -o '"logStreamName": "[^"]*' | cut -d'"' -f4 | head -1)

if [ ! -z "$LOG_STREAM_NAME" ]; then
    awslocal logs get-log-events \
      --log-group-name /aws/lambda/$LAMBDA_FUNCTION_NAME \
      --log-stream-name "$LOG_STREAM_NAME" | less
else
    echo "No logs found."
fi

echo "Deployment and video upload complete!"
