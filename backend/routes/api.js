const express = require('express');
const multer = require('multer');
const { validateApplication } = require('../middlewares/validation');
const applicationController = require('../controllers/applicationController');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Accept only PDF and DOCX files
    if (file.mimetype === 'application/pdf' || 
        file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and DOCX files are allowed'), false);
    }
  }
});

// API routes
router.post('/submit', upload.single('cv'), validateApplication, applicationController.submitApplication);

// Testing endpoint
router.get('/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

module.exports = router;