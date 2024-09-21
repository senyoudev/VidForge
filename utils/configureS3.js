import {S3Client} from '@aws-sdk/client-s3';


/**
 * Configures the AWS S3 client to work with LocalStack.
 * 
 * @returns {S3Client} Configured S3 instance pointing to LocalStack.
 */
export default function configureS3() {
    return new S3Client({
        endpoint: process.env.AWS_S3_ENDPOINT,
        region: 'us-east-1',
        forcePathStyle: true, // Required for LocalStack
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
    });
}

