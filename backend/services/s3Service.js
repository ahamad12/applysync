const { PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { s3Client, bucketName } = require('../config/aws');
const logger = require('../utils/logger');

// Modified to accept s3Key as parameter
exports.uploadCV = async (file, s3Key, userName) => {
  try {
    logger.info(`Uploading file to S3 with key: ${s3Key}`);
    
    // Upload parameters
    const params = {
      Bucket: bucketName,
      Key: s3Key, // Use the key provided from the controller
      Body: file.buffer,
      ContentType: file.mimetype,
      Metadata: {
        originalName: file.originalname,
        applicantName: userName
      }
    };
    
    // Upload to S3
    const command = new PutObjectCommand(params);
    await s3Client.send(command);
    
    // Generate a pre-signed URL (valid for 7 days)
    const getCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: s3Key
    });
    
    const url = await getSignedUrl(s3Client, getCommand, { expiresIn: 604800 }); // 7 days
    
    logger.info(`File uploaded successfully with key ${s3Key} and pre-signed URL`);
    return url;
  } catch (error) {
    logger.error(`Error uploading to S3: ${error.message}`);
    throw new Error(`Failed to upload CV: ${error.message}`);
  }
};

exports.getFile = async (key) => {
  try {
    const params = {
      Bucket: bucketName,
      Key: key
    };
    
    const command = new GetObjectCommand(params);
    const response = await s3Client.send(command);
    return response;
  } catch (error) {
    logger.error(`Error getting file from S3: ${error.message}`);
    throw new Error(`Failed to retrieve file: ${error.message}`);
  }
};

exports.getSignedUrl = async (key, expirySeconds = 3600) => {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key
  });
  
  return getSignedUrl(s3Client, command, { expiresIn: expirySeconds });
};