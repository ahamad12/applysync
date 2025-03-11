const AWS = require('aws-sdk');
const nodemailer = require('nodemailer');
const moment = require('moment-timezone');

exports.handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  
  try {
    // Extract recipient information
    const { recipientEmail, recipientName, timezone = 'UTC', applicationDate } = event;
    
    // If applicationDate isn't provided, use current time
    const submissionDate = applicationDate ? new Date(applicationDate) : new Date();
    
    // Calculate the optimal send time (next day at 10:00 AM in recipient's timezone)
    const optimalSendTime = calculateOptimalSendTime(submissionDate, timezone);
    
    // Initialize fresh AWS clients
    const dynamoDB = new AWS.DynamoDB.DocumentClient({
      region: process.env.AWS_REGION,
      maxRetries: 3
    });
    
    // Current time for comparison
    const now = new Date();
    
    // If scheduled time is in the future and this is the initial invocation, store in DynamoDB
    if (optimalSendTime > now && !event.retry) {
      // Store in DynamoDB for later processing
      const taskId = await storeEmailTask(dynamoDB, {
        recipientEmail,
        recipientName,
        scheduledTime: optimalSendTime.toISOString(),
        timezone,
        status: 'scheduled',
        createdAt: now.toISOString()
      });
      
      console.log(`Email scheduled for ${optimalSendTime.toISOString()} (${timezone}), task stored in DynamoDB`);
      return {
        status: 'scheduled',
        taskId,
        message: `Email to ${recipientEmail} scheduled for ${optimalSendTime.toISOString()}`,
        scheduledTime: optimalSendTime.toISOString()
      };
    }
    
    // Initialize SES service
    const ses = new AWS.SES({ 
      region: process.env.AWS_REGION,
      maxRetries: 3
    });
    
    // Create transporter with fresh SES instance
    const transporter = nodemailer.createTransport({
      SES: ses
    });
    
    // Send the email with retry capability
    await sendWithRetry(() => sendFollowUpEmail(transporter, recipientEmail, recipientName));
    
    // Update status in DynamoDB if this is a retry
    if (event.taskId) {
      await updateEmailTaskStatus(dynamoDB, event.taskId, 'sent');
    }
    
    return {
      status: 'sent',
      message: `Follow-up email sent to ${recipientEmail}`,
      timestamp: now.toISOString()
    };
  } catch (error) {
    console.error('Error processing email task:', error);
    
    // Update status in DynamoDB if this is a retry and it failed
    if (event.taskId) {
      const dynamoDB = new AWS.DynamoDB.DocumentClient({
        region: process.env.AWS_REGION,
        maxRetries: 3
      });
      
      await updateEmailTaskStatus(dynamoDB, event.taskId, 'failed', error.message);
    }
    
    return {
      status: 'error',
      message: error.message
    };
  }
};

// Function to calculate optimal send time (next day at 10:00 AM in recipient's timezone)
function calculateOptimalSendTime(submissionDate, timezone) {
  // Create a moment object in the recipient's timezone
  const submissionMoment = moment(submissionDate).tz(timezone);
  
  // Add one day and set time to 10:00 AM
  const optimalMoment = submissionMoment.clone().add(1, 'days').hour(10).minute(0).second(0);
  
  // If it's already past 10:00 AM on the next day, push to following day
  if (optimalMoment.isBefore(moment().tz(timezone))) {
    optimalMoment.add(1, 'days');
  }
  
  // Convert back to JavaScript Date
  return optimalMoment.toDate();
}

// Add retry capability for AWS operations
async function sendWithRetry(operation, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.log(`Operation failed, attempt ${attempt + 1}/${maxRetries}:`, error.message);
      lastError = error;
      
      // If it's not a signature expiration error, don't retry
      if (!error.message.includes('Signature expired')) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
  }
  
  throw lastError;
}

async function sendFollowUpEmail(transporter, email, name) {
  const mailOptions = {
    from: `"Metana Recruiting" <${process.env.SENDER_EMAIL || 'noreply@example.com'}>`,
    to: email,
    subject: 'Your Application is Under Review',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Hello ${name},</h2>
        <p>Thank you for submitting your application to Metana.</p>
        <p>We wanted to let you know that your CV is currently under review by our team.</p>
        <p>We appreciate your interest in joining us, and we'll be in touch with updates on your application status.</p>
        <p>If you have any questions in the meantime, please don't hesitate to reach out.</p>
        <p>Best regards,<br>The Metana Team</p>
      </div>
    `
  };
  
  return transporter.sendMail(mailOptions);
}

async function storeEmailTask(dynamoDB, task) {
  // Try multiple key formats to identify what your DynamoDB table is expecting
  const generatedId = `email_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  
  const itemToSave = {
    // Try various possible key names that your table might be using
    ID: generatedId,           // Try uppercase ID
    id: generatedId,           // Try lowercase id
    emailId: generatedId,      // Try emailId
    taskId: generatedId,       // Try taskId
    pk: generatedId,           // Try pk (common for partition key)
    ...task
  };
  
  // Log for debugging
  console.log('Attempting to store item with multiple key formats:', JSON.stringify(itemToSave));
  
  // First, let's describe the table to understand its schema
  try {
    // This will help identify the correct key structure
    const tableName = process.env.DYNAMODB_TABLE || 'ScheduledEmails';
    const dynamoDBClient = new AWS.DynamoDB();
    const tableDesc = await dynamoDBClient.describeTable({ TableName: tableName }).promise();
    console.log('Table schema:', JSON.stringify(tableDesc));
    
    // Extract the primary key information
    const keySchema = tableDesc.Table.KeySchema;
    console.log('Table key schema:', JSON.stringify(keySchema));
    
    // Update the item based on the actual table schema
    if (keySchema && keySchema.length > 0) {
      const primaryKeyName = keySchema[0].AttributeName;
      console.log(`Using primary key name: ${primaryKeyName}`);
      itemToSave[primaryKeyName] = generatedId;
    }
  } catch (error) {
    console.log('Could not describe table:', error.message);
    // Continue with our best guess approach
  }
  
  const params = {
    TableName: process.env.DYNAMODB_TABLE || 'ScheduledEmails',
    Item: itemToSave
  };
  
  await dynamoDB.put(params).promise();
  return generatedId;
}

async function updateEmailTaskStatus(dynamoDB, taskId, status, errorMessage = null) {
  // Try to determine the key name through a describe table call
  const tableName = process.env.DYNAMODB_TABLE || 'ScheduledEmails';
  let keyName = 'id'; // Default key name
  
  try {
    const dynamoDBClient = new AWS.DynamoDB();
    const tableDesc = await dynamoDBClient.describeTable({ TableName: tableName }).promise();
    const keySchema = tableDesc.Table.KeySchema;
    if (keySchema && keySchema.length > 0) {
      keyName = keySchema[0].AttributeName;
    }
  } catch (error) {
    console.log('Could not determine table key schema:', error.message);
    // Continue with default key name
  }
  
  console.log(`Updating task ${taskId} status to ${status} using key name: ${keyName}`);
  
  const params = {
    TableName: tableName,
    Key: {},
    UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
    ExpressionAttributeNames: {
      '#status': 'status'
    },
    ExpressionAttributeValues: {
      ':status': status,
      ':updatedAt': new Date().toISOString()
    }
  };
  
  // Set the key with the determined key name
  params.Key[keyName] = taskId;
  
  if (errorMessage) {
    params.UpdateExpression += ', errorMessage = :errorMessage';
    params.ExpressionAttributeValues[':errorMessage'] = errorMessage;
  }
  
  await dynamoDB.update(params).promise();
}
