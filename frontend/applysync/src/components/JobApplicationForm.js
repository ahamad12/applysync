import React, { useState, useRef } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import axios from 'axios';

const validationSchema = Yup.object({
  name: Yup.string().required('Name is required'),
  email: Yup.string()
    .email('Invalid email format')
    .required('Email is required'),
  phone: Yup.string()
    .matches(
      /^\d{10}$/,
      'Phone number must be 10 digits'
    )
    .required('Phone number is required'),
  cv: Yup.mixed()
    .required('CV is required')
    .test(
      'fileFormat',
      'Only PDF or DOCX files are allowed',
      value => {
        if (!value) return false;
        return ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
          .includes(value.type);
      }
    )
});

const API_URL = "http://localhost:5000/api/submit";

const JobApplicationForm = () => {
  const [fileName, setFileName] = useState(null);
  const fileInputRef = useRef(null);

  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="max-w-5xl mx-auto mt-10 p-8 bg-white rounded-xl shadow-2xl border border-gray-100">
      <h2 className="text-3xl font-bold mb-8 text-center text-gray-800">Career Application</h2>
      
      <Formik
        initialValues={{
          name: '',
          email: '',
          phone: '',
          cv: null
        }}
        validationSchema={validationSchema}
        onSubmit={async (values, { setSubmitting, resetForm, setStatus }) => {
          try {
            setStatus({ isLoading: true, message: 'Uploading your application...' });

            // Create FormData to properly upload file to backend
            const formData = new FormData();
            formData.append('name', values.name);
            formData.append('email', values.email);
            formData.append('phone', values.phone);
            formData.append('cv', values.cv);

            // Debug log
            console.log("Submitting form with file:", values.cv?.name);

            const response = await axios.post(API_URL, formData, {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
            });
            
            console.log("Response:", response.data);
            
            setStatus({ 
              success: true, 
              message: 'Application submitted successfully! We will contact you soon.'
            });
            resetForm();
            setFileName(null);
            resetFileInput();
          } catch (error) {
            console.error('Error submitting application:', error);
            setStatus({
              success: false,
              message: error.response?.data?.message || 'Failed to submit application. Please try again.'
            });
          } finally {
            setSubmitting(false);
          }
        }}
      >
        {({ isSubmitting, setFieldValue, errors, touched, status }) => (
          <Form className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</label>
                <Field
                  type="text"
                  name="name"
                  id="name"
                  className={`mt-1 block w-full rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 ${
                    errors.name && touched.name ? 'border-red-500' : 'border border-gray-300'
                  }`}
                  placeholder="Enter your full name"
                />
                <ErrorMessage name="name" component="div" className="text-red-500 text-sm mt-1" />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
                <Field
                  type="email"
                  name="email"
                  id="email"
                  className={`mt-1 block w-full rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 ${
                    errors.email && touched.email ? 'border-red-500' : 'border border-gray-300'
                  }`}
                  placeholder="your.email@example.com"
                />
                <ErrorMessage name="email" component="div" className="text-red-500 text-sm mt-1" />
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone Number</label>
              <Field
                type="text"
                name="phone"
                id="phone"
                className={`mt-1 block w-full rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 ${
                  errors.phone && touched.phone ? 'border-red-500' : 'border border-gray-300'
                }`}
                placeholder="Enter your 10-digit phone number"
              />
              <ErrorMessage name="phone" component="div" className="text-red-500 text-sm mt-1" />
            </div>

            <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
              <label htmlFor="cv" className="block text-sm font-medium text-gray-700 mb-2">CV Upload (PDF or DOCX)</label>
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 hover:border-indigo-300 transition-all">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                    </svg>
                    <p className="text-sm text-gray-500">{fileName ? fileName : "Drag & drop your file here, or click to select"}</p>
                    <p className="text-xs text-gray-400 mt-1">PDF or DOCX (Max 10MB)</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    id="cv"
                    name="cv"
                    accept=".pdf,.docx"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.currentTarget.files[0];
                      setFieldValue('cv', file);
                      setFileName(file ? file.name : null);
                    }}
                  />
                </label>
              </div>
              
              {fileName && (
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setFileName(null);
                      setFieldValue('cv', null);
                      resetFileInput();
                    }}
                    className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                    Clear file
                  </button>
                </div>
              )}
              
              <ErrorMessage name="cv" component="div" className="text-red-500 text-sm mt-1" />
            </div>

            {/* Status Message */}
            {status && status.message && (
              <div className={`p-4 rounded-md ${
                status.isLoading ? 'bg-blue-50 text-blue-700' : 
                status.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {status.isLoading && (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {status.message}
                  </div>
                )}
                {!status.isLoading && status.message}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3 px-6 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors ${
                  isSubmitting ? 'opacity-75 cursor-not-allowed' : ''
                }`}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default JobApplicationForm;