import dotenv from 'dotenv';
import configureS3 from '../utils/configureS3.js';
import mime from 'mime-types';
import readFile from '../utils/readFile.js';
import { PutObjectCommand } from '@aws-sdk/client-s3';

dotenv.config();


/**
 * Uploads a file to an S3 bucket.
 * 
 * @param {S3Client} s3 - The configured S3 client.
 * @param {string} bucketName - The name of the S3 bucket.
 * @param {string} fileName - The key (file name) under which the file will be stored in S3.
 * @param {Buffer|string} fileContent - The content of the file to be uploaded.
 * @param {string} mimeType - The MIME type of the file (e.g., video/mp4).
 * @returns {Promise<Object>} The data returned by the S3 upload process, including the file URL.
 * @throws Will throw an error if the upload fails.
 */
const uploadFile = async (s3, bucketName, fileName, fileContent, mimeType) => {
    const params = {
        Bucket: bucketName,
        Key: fileName,
        Body: fileContent,
        ContentType: mimeType
    };
    
    try {
        const command = new PutObjectCommand(params);
        const data = await s3.send(command);
        console.log('File uploaded successfully:', data);
        return data;
    } catch (error) {
        console.error('Error uploading file:', error);
        throw error;
    }
}



/**
 * Main function that handles file reading and uploading to S3, with file type checking.
 * 
 * Usage: node upload-video.js /path/to/local-video-file.mp4 [s3-file-name.mp4]
 * 
 * @returns {Promise<void>}
 * @throws Will throw an error if any part of the process fails.
 */
async function main() {
    const filePath = process.argv[2];
    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    const s3FileName = process.argv[3] || filePath.split('/').pop();

    if (!filePath) {
        console.error('Please provide a file path to upload.');
        process.exit(1);
    }

    const s3 = configureS3();
    try {
        // Check the file type
        const fileType = mime.lookup(filePath);
        if (!fileType || !fileType.includes('video')) {
            console.error('Invalid file type. Please provide a video file.');
            process.exit(1);
        }
        const fileContent = await readFile(filePath);
        await uploadFile(s3, bucketName, s3FileName, fileContent, fileType);

    } catch (error) {
        console.error('Error uploading file:', error);
        process.exit(1);
    }
}

main();
