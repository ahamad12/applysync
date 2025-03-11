# applysync
# Job Application Pipeline

## Overview
This project is designed to streamline the job application process by leveraging a modern, scalable technology stack. It includes a responsive frontend form, a serverless backend for processing, and a Google Sheet for data visualization.

- **Live Hosted Form:** [Job Application Form](https://chimerical-parfait-cb3f3f.netlify.app/)
- **Processed Data (Google Sheet):** [View Google Sheet](https://docs.google.com/spreadsheets/d/12p_Lr9PdxRSNztuEs7PRSO-wMMpzVjJBfURoVOsVgiY/edit?gid=0)

## Technology Stack

### Core Technologies
| Component      | Technology           | Justification |
|---------------|----------------------|---------------|
| **Frontend**  | React.js on Netlify  | Responsive UI with seamless CI/CD and a global CDN |
| **Backend**   | Node.js/Express on Railway | Handles async operations, API integrations, and auto-scaling |
| **CV Storage**| AWS S3               | Durable and cost-effective object storage |
| **Database**  | MongoDB Atlas        | Flexible schema, automated backups, and scalability |
| **CV Parsing**| AWS Lambda           | Serverless, event-driven for compute-intensive tasks |
| **Email Scheduling** | AWS Lambda + DynamoDB | Low-latency, scalable email event tracking |
| **Data Visualization** | Google Sheets API | Non-technical access to application data |

### Integration Services
| Service          | Purpose                        |
|-----------------|------------------------------|
| Webhook Integration | Real-time notifications to external systems |
| API Gateway     | Authentication, rate limiting, and monitoring |
| Logging & Monitoring | Winston, Logger for real-time error tracking |

## Architecture
The system follows a **serverless** and **event-driven architecture**, optimizing cost and scalability. Key components include:
- Frontend (React.js) hosted on Netlify
- Backend (Node.js/Express) on Railway
- CV Storage in AWS S3
- CV Parsing using AWS Lambda
- Email scheduling using AWS Lambda & DynamoDB
- Data visualization via Google Sheets API
