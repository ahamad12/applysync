const axios = require('axios');
const logger = require('../utils/logger');
require('dotenv').config();

const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://rnd-assignment.automations-3d6.workers.dev/';
const CANDIDATE_EMAIL = process.env.CANDIDATE_EMAIL;

exports.notifyWebhook = async (data) => {
  try {
    logger.info(`Sending webhook notification to ${WEBHOOK_URL}`);
    
    if (!CANDIDATE_EMAIL) {
      logger.warn('CANDIDATE_EMAIL not set in environment variables');
    }
    
    const response = await axios.post(WEBHOOK_URL, data, {
      headers: {
        'Content-Type': 'application/json',
        'X-Candidate-Email': CANDIDATE_EMAIL || 'email@example.com'
      }
    });
    
    logger.info(`Webhook notification successful: ${response.status}`);
    return response.data;
  } catch (error) {
    logger.error(`Error sending webhook notification: ${error.message}`);
    
    // Log more details if available
    if (error.response) {
      logger.error(`Webhook response: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    
    throw new Error(`Failed to send webhook notification: ${error.message}`);
  }
};