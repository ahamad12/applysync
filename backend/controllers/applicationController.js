const s3Service = require('../services/s3Service');
const lambdaService = require('../services/lambdaService');
const sheetsService = require('../services/googleSheets.js');
const webhookService = require('../services/webhookService');
const logger = require('../utils/logger');

exports.submitApplication = async (req, res, next) => {
  try {
    const { name, email, phone } = req.body;
    const cvFile = req.file;
    
    logger.info(`Processing application for ${name} (${email})`);

    // 1. Upload to S3 - FIX: Pass the s3Key to uploadCV 
    const s3Key = `cvs/${Date.now()}-${cvFile.originalname.replace(/\s+/g, '_')}`;
    logger.info(`Generated S3 key: ${s3Key}`);
    
    // Modified to pass s3Key as parameter
    const cvUrl = await s3Service.uploadCV(cvFile, s3Key, name);
    logger.info(`CV uploaded to S3: ${cvUrl}`);

    // 2. Invoke Lambda to parse CV
    let cvData = {};
    try {
      logger.info(`Invoking Lambda CV parser with key: ${s3Key}`);
      cvData = await lambdaService.invokeCvParser(s3Key, cvFile.mimetype);
      
      // Add detailed debug logging for cvData
      logger.info(`CV parsed successfully for ${name}`);
      logger.debug(`Full cvData object: ${JSON.stringify(cvData)}`);
      
      // Log specific sections with counts
      logger.debug(`Personal info found: ${Object.keys(cvData.personal_info || {}).length} fields`);
      if (cvData.personal_info) {
        logger.debug(`Personal info fields: ${JSON.stringify(cvData.personal_info)}`);
      }
      
      logger.debug(`Education entries found: ${(cvData.education || []).length}`);
      if (cvData.education && cvData.education.length > 0) {
        logger.debug(`Education data: ${JSON.stringify(cvData.education)}`);
      }
      
      logger.debug(`Qualification entries found: ${(cvData.qualifications || []).length}`);
      if (cvData.qualifications && cvData.qualifications.length > 0) {
        logger.debug(`Qualification data: ${JSON.stringify(cvData.qualifications)}`);
      }
      
      logger.debug(`Project entries found: ${(cvData.projects || []).length}`);
      if (cvData.projects && cvData.projects.length > 0) {
        logger.debug(`Project data: ${JSON.stringify(cvData.projects)}`);
      }
      
    } catch (parseError) {
      logger.error(`CV parsing error: ${JSON.stringify(parseError)}`);
      logger.warn(`CV parsing failed but continuing: ${parseError.message}`);
      if (parseError.stack) {
        logger.debug(`Parse error stack trace: ${parseError.stack}`);
      }
      cvData = {
        education: [],
        qualifications: [],
        projects: []
      };
    }

    // 3. Store in Google Sheets - with error handling to continue even if this fails
    try {
      // Log what we're sending to Google Sheets
      logger.debug(`Sending the following data to Google Sheets: ${JSON.stringify({
        name,
        email,
        phone,
        cvUrl,
        education: (cvData.education || []).length,
        qualifications: (cvData.qualifications || []).length,
        projects: (cvData.projects || []).length
      })}`);
      
      await sheetsService.addApplication({
        name,
        email,
        phone,
        cvUrl,
        ...cvData
      });
      logger.info(`Application data stored in Google Sheets for ${name}`);
    } catch (sheetsError) {
      logger.warn(`Google Sheets storage failed but continuing: ${sheetsError.message}`);
      // Continue with the process even if Google Sheets fails
    }

    // 4. Send webhook notification
    try {
      const webhookPayload = {
        cv_data: {
          personal_info: {
            name,
            email,
            phone,
            ...(cvData.personal_info || {})
          },
          education: cvData.education || [],
          qualifications: cvData.qualifications || [],
          projects: cvData.projects || [],
          cv_public_link: cvUrl
        },
        metadata: {
          applicant_name: name,
          email: email,
          status: "prod",
          cv_processed: true,
          processed_timestamp: new Date().toISOString()
        }
      };
      
      // Log webhook payload size for debugging
      logger.debug(`Webhook payload size - Education: ${webhookPayload.cv_data.education.length}, Qualifications: ${webhookPayload.cv_data.qualifications.length}, Projects: ${webhookPayload.cv_data.projects.length}`);
      
      await webhookService.notifyWebhook(webhookPayload);
      logger.info(`Webhook notification sent for ${name}`);
    } catch (webhookError) {
      logger.warn(`Webhook notification failed but continuing: ${webhookError.message}`);
      logger.debug(`Webhook error details: ${JSON.stringify(webhookError)}`);
    }

    // 5. Schedule follow-up email using Lambda
    try {
      await lambdaService.scheduleEmail(email, name);
      logger.info(`Follow-up email scheduled for ${name}`);
    } catch (emailError) {
      logger.warn(`Email scheduling failed but continuing: ${emailError.message}`);
    }

    // 6. Send success response with summary of parsed data
    res.status(200).json({
      status: 'success',
      message: 'Application submitted successfully',
      data: {
        cvUrl,
        parsed_data_summary: {
          education_count: (cvData.education || []).length,
          qualifications_count: (cvData.qualifications || []).length,
          projects_count: (cvData.projects || []).length,
          personal_info_fields: Object.keys(cvData.personal_info || {}).length
        }
      }
    });
  } catch (error) {
    logger.error(`Error processing application: ${error.message}`);
    if (error.stack) {
      logger.debug(`Error stack trace: ${error.stack}`);
    }
    next(error);
  }
};
