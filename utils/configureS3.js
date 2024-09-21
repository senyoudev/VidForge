import aws from 'aws-sdk';


function configureS3() {
    return new AWS.S3({
        endpoint: process.env.AWS_S3_ENDPOINT,
        s3ForcePathStyle: true,  
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION
    });
}

export default configureS3;