const AWS = require('aws-sdk');
const nodemailer = require('nodemailer');

// Initialize AWS services
const ses = new AWS.SES({ region: process.env.AWS_REGION });
const dynamoDB = new AWS.DynamoDB.DocumentClient();

// Create email transporter using Amazon SES
const transporter = nodemailer.createTransport({
  SES: ses
});

exports.handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  
  try {
    const { recipientEmail, recipientName, scheduledTime } = event;
    
    // Check if it's time to send the email
    const now = new Date();
    const scheduledDate = new Date(scheduledTime);
    
    // If scheduled time is in the future and this is the initial invocation, store in DynamoDB
    if (scheduledDate > now && !event.retry) {
      // Store in DynamoDB for later processing
      await storeEmailTask({
        recipientEmail,
        recipientName,
        scheduledTime,
        status: 'scheduled',
        createdAt: now.toISOString()
      });
      
      console.log(`Email scheduled for ${scheduledTime}, task stored in DynamoDB`);
      return {
        status: 'scheduled',
        message: `Email to ${recipientEmail} scheduled for ${scheduledTime}`
      };
    }
    
    // Send the email
    await sendFollowUpEmail(recipientEmail, recipientName);
    
    // Update status in DynamoDB if this is a retry
    if (event.taskId) {
      await updateEmailTaskStatus(event.taskId, 'sent');
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
      await updateEmailTaskStatus(event.taskId, 'failed', error.message);
    }
    
    return {
      status: 'error',
      message: error.message
    };
  }
};

async function sendFollowUpEmail(email, name) {
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

async function storeEmailTask(task) {
  const params = {
    TableName: process.env.DYNAMODB_TABLE || 'ScheduledEmails',
    Item: {
      id: `email_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      ...task
    }
  };
  
  await dynamoDB.put(params).promise();
  return params.Item.id;
}

async function updateEmailTaskStatus(taskId, status, errorMessage = null) {
  const params = {
    TableName: process.env.DYNAMODB_TABLE || 'ScheduledEmails',
    Key: { id: taskId },
    UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
    ExpressionAttributeNames: {
      '#status': 'status'
    },
    ExpressionAttributeValues: {
      ':status': status,
      ':updatedAt': new Date().toISOString()
    }
  };
  
  if (errorMessage) {
    params.UpdateExpression += ', errorMessage = :errorMessage';
    params.ExpressionAttributeValues[':errorMessage'] = errorMessage;
  }
  
  await dynamoDB.update(params).promise();
}