import configureS3 from "../../utils/configureS3.js";
import { GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { createWriteStream } from 'fs';
import { Readable, pipeline as streamPipeline } from "stream";
import { promisify } from 'util';
import { promises as fsPromises } from 'fs';
const pipeline = promisify(streamPipeline);
import ffmpeg from 'fluent-ffmpeg';
import { Upload } from '@aws-sdk/lib-storage';
import path from 'path';





/**
 * Lambda function that processes an S3 event.
 * @param {Object} event - S3 event object.
 */
export const handler = async (event) => {
    console.log('Receieved S3 event:', JSON.stringify(event, null, 2));
    // The directory where we will store the thumbnails
    const thumbnailsDir = '/tmp/thumbnails';
    await fsPromises.mkdir(thumbnailsDir, { recursive: true });
    ffmpeg.setFfmpegPath('/opt/ffmpeg-layer/bin/ffmpeg');
    ffmpeg.setFfprobePath('/opt/ffmpeg-layer/bin/ffprobe');
    // Check if the event contains the 'Records' array and that it's not empty
    if (!event.Records || event.Records.length === 0) {
        console.error("Error: S3 event does not contain any records.");
        return;
    }
    const s3Client = configureS3();

    try {
        /**
         * The S3 event object contains an array of records, each representing an event.
         * In our case, we are only uploading one file at a time, so we can safely assume that there is only one record.
         * and we do not care if there are more than one.
         */
        const record = event.Records[0];
        const bucketName = record.s3.bucket.name;
        const key = record.s3.object.key;
        const params = {
            Bucket: bucketName,
            Key: key
        };
        // This is a request to get the object from S3
        const command = new GetObjectCommand(params);
        const resp = await s3Client.send(command);

        // The path `/tmp` is the only writable directory in AWS Lambda and it has a max size of 512MB.
        const filePath = `/tmp/${key}`;
        const fileStream = createWriteStream(filePath);

        // We use pipeline to stream the response body to the file stream.
        await pipeline(Readable.from(resp.Body), fileStream);

        console.log('File downloaded successfully:', filePath);

        // TODO : Process the video file here
        // Generate a thumbnail using FFmpeg
        const thumbnailPath = path.join(thumbnailsDir, `${key}-thumbnail.jpg`);
        console.log('Generating thumbnail:', thumbnailPath);
        await new Promise((resolve, reject) => {
            ffmpeg(filePath)
              .screenshots({
                    count: 1,
                    folder: thumbnailsDir,
                    filename: `${key}-thumbnail.jpg`,
                    size: '320x240'
              })
              .on('end', resolve)
              .on('error', reject);
        });

        console.log('Thumbnail generated successfully:', thumbnailPath);

                // Upload thumbnail back to S3
        const upload = new Upload({
            client: s3Client,
            params: {
                Bucket: bucketName,
                Key: `thumbnails/${key}-thumbnail.jpg`,
                Body: await fsPromises.readFile(thumbnailPath),
                ContentType: 'image/jpeg'
            }
        });

        await upload.done();
        console.log('Thumbnail uploaded successfully to S3.');

        // Delete the video & the thumbnail from the local file system
        await fsPromises.unlink(filePath);
        await fsPromises.unlink(thumbnailPath);

        // Delete the video from S3
        await s3Client.send(new DeleteObjectCommand(params));
        console.log(`Video ${key} deleted successfully from S3.`);

    } catch (error) {
        console.error('Error processing S3 event:', error);
        throw error;   
    }
}