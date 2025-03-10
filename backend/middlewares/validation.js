const logger = require('../utils/logger');

exports.validateApplication = (req, res, next) => {
  const { name, email, phone } = req.body;
  const errors = [];

  // Validate required fields
  if (!name || name.trim() === '') {
    errors.push('Name is required');
  }

  if (!email || !isValidEmail(email)) {
    errors.push('Valid email is required');
  }

  if (!phone || !isValidPhone(phone)) {
    errors.push('Valid phone number is required');
  }

  if (!req.file) {
    errors.push('CV file is required');
  }

  if (errors.length > 0) {
    logger.warn(`Validation errors: ${errors.join(', ')}`);
    return res.status(400).json({ 
      status: 'error',
      message: 'Validation failed',
      errors 
    });
  }

  next();
};

// Helper functions
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidPhone(phone) {
  // Basic phone validation - customize as needed
  const phoneRegex = /^\d{10,15}$/;
  return phoneRegex.test(phone.replace(/[^\d]/g, ''));
}