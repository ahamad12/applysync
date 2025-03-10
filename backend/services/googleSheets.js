const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
require('dotenv').config();

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = 'Sheet1';

async function getAuthClient() {
  try {
    // Option 1: Use service account from file
    const keyFilePath = path.join(__dirname, '..', 'config', 'serviceAccount.json');
    
    if (fs.existsSync(keyFilePath)) {
      logger.info('Using Google service account from file');
      return new google.auth.GoogleAuth({
        keyFile: keyFilePath,
        scopes: SCOPES
      });
    }
    
    // Option 2: Use service account from environment
    if (process.env.GOOGLE_SERVICE_ACCOUNT) {
      try {
        logger.info('Using Google service account from environment variable');
        const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
        
        return new google.auth.JWT(
          credentials.client_email,
          null,
          credentials.private_key,
          SCOPES
        );
      } catch (parseError) {
        logger.error(`Failed to parse GOOGLE_SERVICE_ACCOUNT: ${parseError.message}`);
        throw new Error(`Invalid Google service account JSON: ${parseError.message}`);
      }
    }
    
    // No credentials available
    logger.error('No Google Sheets credentials found');
    throw new Error('No Google Sheets credentials found');
  } catch (error) {
    logger.error(`Error initializing Google Sheets auth: ${error.message}`);
    throw error;
  }
}

exports.addApplication = async (applicationData) => {
  try {
    if (!SHEET_ID) {
      logger.info('Google Sheets integration skipped (no Sheet ID)');
      return true;
    }
    
    // Log incoming data structure for debugging
    logger.info(`Google Sheets: Processing application data`);
    logger.info(`Data type: ${typeof applicationData}`);
    logger.info(`Keys: ${Object.keys(applicationData).join(', ')}`);
    
    // Get auth client
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth });
    
    // Ensure headers exist
    await ensureHeaders(sheets);
    
    // IMPROVED DATA EXTRACTION - Handle all possible formats
    let name = '', email = '', phone = '', cvUrl = '';
    let education = [], qualifications = [], projects = [];
    
    // Extract basic info which is always at top level from the controller
    name = applicationData.name || '';
    email = applicationData.email || '';
    phone = applicationData.phone || '';
    cvUrl = applicationData.cvUrl || '';
    
    // NEW: CRITICAL FIX - Handle the mixed format (top-level fields + body from Lambda)
    if (applicationData.statusCode === 200 && applicationData.body) {
      logger.info('Processing mixed format with both direct fields and body');
      
      // Extract data from inside the body (CV parser response)
      const body = typeof applicationData.body === 'string' 
        ? JSON.parse(applicationData.body) 
        : applicationData.body;
      
      // Arrays from body
      education = Array.isArray(body.education) ? body.education : [];
      qualifications = Array.isArray(body.qualifications) ? body.qualifications : [];
      projects = Array.isArray(body.projects) ? body.projects : [];
      
      logger.info(`Extracted from body: ${education.length} education items, ${qualifications.length} qualification items, ${projects.length} project items`);
    } else {
      // Direct arrays at top level (fallback case)
      logger.info('Checking for direct arrays at top level');
      education = Array.isArray(applicationData.education) ? applicationData.education : [];
      qualifications = Array.isArray(applicationData.qualifications) ? applicationData.qualifications : [];
      projects = Array.isArray(applicationData.projects) ? applicationData.projects : [];
    }
    
    // Format array data for the sheet
    const formatArrayForSheet = (arr) => {
      if (!Array.isArray(arr) || arr.length === 0) return '';
      return arr.filter(Boolean).join('\n\n');
    };
    
    // Create row with all data
    const rowData = [
      name,
      email, 
      phone,
      cvUrl,
      formatArrayForSheet(education),
      formatArrayForSheet(qualifications),
      formatArrayForSheet(projects),
      new Date().toISOString()
    ];
    
    // Log what we're sending to Google Sheets
    logger.info('Preparing data for Google Sheets:');
    rowData.forEach((col, i) => {
      // Safe display of column contents
      let preview = '';
      if (typeof col === 'string') {
        preview = col.length > 30 ? col.substring(0, 30) + '...' : col;
      } else {
        preview = String(col);
      }
      logger.info(`Column ${i+1}: ${preview}`);
    });
    
    // Append to Google Sheet with explicit column range
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A:H`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: [rowData]
      }
    });
    
    logger.info(`Data added to Google Sheet: ${response.data.updates.updatedCells} cells updated`);
    return true;
  } catch (error) {
    // Log error but don't fail the application process
    logger.error(`Error adding data to Google Sheet: ${error.message}`);
    logger.error(`Stack: ${error.stack}`);
    return true;
  }
};

// Helper to ensure headers exist
async function ensureHeaders(sheets) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A1:H1`,
    });
    
    if (!response.data.values || response.data.values.length === 0) {
      const headers = [
        'Name',
        'Email',
        'Phone',
        'CV URL',
        'Education',
        'Qualifications/Skills',
        'Projects/Experience',
        'Timestamp'
      ];
      
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `${SHEET_NAME}!A1:H1`,
        valueInputOption: 'RAW',
        resource: {
          values: [headers]
        }
      });
      
      logger.info('Added headers to Google Sheet');
    }
  } catch (error) {
    logger.warn(`Error checking/creating headers: ${error.message}`);
  }
}

module.exports.getAuthClient = getAuthClient;