const { InvokeCommand } = require('@aws-sdk/client-lambda');
const { lambdaClient, lambdaCvParser, lambdaEmailScheduler } = require('../config/aws');
const logger = require('../utils/logger');

exports.invokeCvParser = async (s3Key, fileType) => {
  try {
    // Payload for the Lambda function
    const payload = {
      s3Bucket: process.env.S3_BUCKET_NAME,
      s3Key: s3Key,
      fileType: fileType
    };
    
    // Invoke Lambda function
    const params = {
      FunctionName: lambdaCvParser,
      InvocationType: 'RequestResponse', // Synchronous invocation
      Payload: Buffer.from(JSON.stringify(payload))
    };
    
    logger.info(`Invoking Lambda function ${lambdaCvParser} for CV parsing`);
    const command = new InvokeCommand(params);
    const response = await lambdaClient.send(command);
    
    // Check for errors
    if (response.FunctionError) {
      logger.error(`Lambda execution error: ${Buffer.from(response.Payload).toString()}`);
      throw new Error(`Lambda function execution failed: ${Buffer.from(response.Payload).toString()}`);
    }
    
    // Parse and return the response payload
    const result = JSON.parse(Buffer.from(response.Payload).toString());
    return result;
  } catch (error) {
    logger.error(`Error invoking CV parser Lambda: ${error.message}`);
    throw new Error(`Failed to parse CV: ${error.message}`);
  }
};

exports.scheduleEmail = async (email, name, delayHours = 24) => {
  try {
    // Payload for the Lambda function
    const payload = {
      recipientEmail: email,
      recipientName: name,
      scheduledTime: new Date(Date.now() + delayHours * 60 * 60 * 1000).toISOString()
    };
    
    // Invoke Lambda function
    const params = {
      FunctionName: lambdaEmailScheduler,
      InvocationType: 'Event', // Asynchronous invocation
      Payload: Buffer.from(JSON.stringify(payload))
    };
    
    logger.info(`Scheduling follow-up email to ${email} using Lambda`);
    const command = new InvokeCommand(params);
    await lambdaClient.send(command);
    
    return true;
  } catch (error) {
    logger.error(`Error scheduling email with Lambda: ${error.message}`);
    throw new Error(`Failed to schedule email: ${error.message}`);
  }
};