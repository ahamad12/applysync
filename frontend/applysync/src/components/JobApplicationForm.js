import React, { useState } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';

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

const JobApplicationForm = () => {
  const [fileName, setFileName] = useState(null);

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded-lg shadow-xl">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Job Application Form</h2>
      
      <Formik
        initialValues={{
          name: '',
          email: '',
          phone: '',
          cv: null
        }}
        validationSchema={validationSchema}
        onSubmit={(values, { setSubmitting, resetForm }) => {
          // In a real app, you would send this to a server
          console.log('Form submitted:', values);
          
          setTimeout(() => {
            alert('Application submitted successfully!');
            resetForm();
            setFileName(null);
            setSubmitting(false);
          }, 1000);
        }}
      >
        {({ isSubmitting, setFieldValue, errors, touched }) => (
          <Form className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
              <Field
                type="text"
                name="name"
                id="name"
                className={`mt-1 block w-full rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 ${
                  errors.name && touched.name ? 'border-red-500' : 'border border-gray-300'
                }`}
              />
              <ErrorMessage name="name" component="div" className="text-red-500 text-sm mt-1" />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
              <Field
                type="email"
                name="email"
                id="email"
                className={`mt-1 block w-full rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 ${
                  errors.email && touched.email ? 'border-red-500' : 'border border-gray-300'
                }`}
              />
              <ErrorMessage name="email" component="div" className="text-red-500 text-sm mt-1" />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone Number</label>
              <Field
                type="text"
                name="phone"
                id="phone"
                className={`mt-1 block w-full rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 ${
                  errors.phone && touched.phone ? 'border-red-500' : 'border border-gray-300'
                }`}
              />
              <ErrorMessage name="phone" component="div" className="text-red-500 text-sm mt-1" />
            </div>

            <div>
              <label htmlFor="cv" className="block text-sm font-medium text-gray-700">CV Upload (PDF or DOCX)</label>
              <input
                type="file"
                id="cv"
                name="cv"
                accept=".pdf,.docx"
                onChange={(event) => {
                  const file = event.currentTarget.files[0];
                  setFieldValue('cv', file);
                  setFileName(file ? file.name : null);
                }}
                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
              {fileName && (
                <div className="mt-2 text-sm text-gray-700">
                  Selected file: {fileName}
                </div>
              )}
              <ErrorMessage name="cv" component="div" className="text-red-500 text-sm mt-1" />
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
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