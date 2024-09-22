import configureS3 from "../../utils/configureS3.js";
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { createWriteStream, unlink } from 'fs';
import { Readable, pipeline as streamPipeline } from "stream";
import { promisify } from 'util';
import { promises as fsPromises } from 'fs';
const pipeline = promisify(streamPipeline);
import ffmpeg from 'fluent-ffmpeg';


ffmpeg.setFfmpegPath('/opt/bin/ffmpeg');
ffmpeg.setFfprobePath('/opt/bin/ffprobe');


/**
 * Lambda function that processes an S3 event.
 * @param {Object} event - S3 event object.
 */
export const handler = async (event) => {
    console.log('Receieved S3 event:', JSON.stringify(event, null, 2));
    // TODO : Remove this part below as it is only for testing purposes
      try {
        const ffmpegExists = await fs.access('/opt/bin/ffmpeg');
        const ffprobeExists = await fs.access('/opt/bin/ffprobe');
        console.log('ffmpeg and ffprobe are accessible.');
    } catch (error) {
        console.error('ffmpeg or ffprobe not found in /opt/bin:', error);
    }
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
        const thumbnailPath = `/tmp/thumbnail.jpg`;
        await new Promise((resolve, reject) => {
            ffmpeg(filePath)
              .screenshots({
                  count: 1,
                  folder: '/tmp',
                  filename: 'thumbnail.jpg',
                  size: '320x240'
              })
              .on('end', resolve)
              .on('error', reject);
        });

        console.log('Thumbnail generated successfully:', thumbnailPath);

                // Upload thumbnail back to S3
        const thumbnailUploadParams = {
            Bucket: bucketName,
            Key: `thumbnails/${key}-thumbnail.jpg`,
            Body: fsPromises.readFile(thumbnailPath),
            ContentType: 'image/jpeg'
        };

        await s3Client.send(new PutObjectCommand(thumbnailUploadParams));
        console.log('Thumbnail uploaded successfully to S3.');

        // Delete the video & the thumbnail from the local file system
        await fsPromises.unlink(filePath);
        await fsPromises.unlink(thumbnailPath);

        // TODO : Delete the video file from S3
        console.log('File deleted successfully:', filePath);

    } catch (error) {
        console.error('Error processing S3 event:', error);
        throw error;   
    }
}