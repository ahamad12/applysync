const logger = require('./logger');

// Central error handler
module.exports = (err, req, res, next) => {
  // Log the error
  logger.error(`Error: ${err.message}`);
  if (err.stack) {
    logger.error(err.stack);
  }

  // Determine status code
  const statusCode = err.statusCode || 500;
  
  // Send response
  res.status(statusCode).json({
    status: 'error',
    message: statusCode === 500 ? 'Internal server error' : err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};