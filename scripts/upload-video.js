import aws from 'aws-sdk';
import dotenv from 'dotenv';
import configureS3 from '../utils/configureS3';

dotenv.config();

const s3 = configureS3();