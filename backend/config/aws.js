const { S3Client } = require('@aws-sdk/client-s3');
const { LambdaClient } = require('@aws-sdk/client-lambda');
const dotenv = require('dotenv');

dotenv.config();

// Create shared AWS credentials config
const awsCredentials = {
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
};

// Initialize S3 client
const s3Client = new S3Client(awsCredentials);

// Initialize Lambda client
const lambdaClient = new LambdaClient(awsCredentials);

module.exports = {
  s3Client,
  lambdaClient,
  bucketName: process.env.S3_BUCKET_NAME,
  lambdaCvParser: process.env.LAMBDA_CV_PARSER,
  lambdaEmailScheduler: process.env.LAMBDA_EMAIL_SCHEDULER
};