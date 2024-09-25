# VidForge: Serverless Video Processing Application

## Overview

VidForge is a serverless application for processing video files using AWS services and FFmpeg. It allows users to upload videos, which are then automatically processed to create a thumbnail.

## System Architecture

```mermaid
graph TD
    A[Client] -->|Uploads video| B[S3 Bucket]
    B -->|Triggers| C[Lambda Function]
    C -->|Downloads video| B
    C -->|Processes video| D[FFmpeg]
    D -->|Returns processed video| C
    C -->|Uploads processed video| B
    C -->|Stores logs| E[CloudWatch]
 ```

## Components

1. **S3 Bucket**: Stores original and processed videos.
2. **Lambda Function**: Triggered by S3 uploads, manages the video processing workflow.
3. **FFmpeg**: Used within the Lambda function to process videos.
4. **CloudWatch**: Stores logs from the Lambda function.

## Setup

### Prerequisites

- Node.js (v18 or later)
- AWS CLI configured with appropriate permissions
- Docker (for local development with LocalStack)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/senyoyudev/vidforge.git
   cd vidforge
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up LocalStack (for local development):
    You can use `localstack cli`

4. Run the whole workflow (local):
   ```
   ./scripts/deploy-local.sh
   ```

## Usage

### Uploading a Video

Use the provided upload script:

```
node scripts/upload-video.js /path/to/your/video.mp4
```

### Processing

Video processing is automatically triggered when a new video is uploaded to the S3 bucket. The Lambda function will:

1. Download the video from S3
2. Process it using FFmpeg (currently resizes to 360p)
3. Upload the processed video back to S3
4. Store logs in cloudWatch

## Development

### Folder Structure

```
vidforge/
├── src/
│   ├── handlers/
│   │   └── videProcessor.js
├── scripts/
│   ├── upload-video.js
│   └── deploy-local.sh
├── utils/
│   ├── configureS3.js
│   └── readFile.js
├── .env.example
├── .gitignore
├── package.json
├── assets
│   └── s3_test_video.mp4
│   └── vidForge.png
│   └── vidForge.svg
└── README.md
```


## Future Enhancements

- Add support for multiple video processing options
- Implement a web interface for uploading and managing videos
- Add support for notifications (e.g. email) when processing is complete
