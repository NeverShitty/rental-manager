import fs from 'fs';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import { fileURLToPath } from 'url';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const API_URL = 'http://localhost:5000/api';
const TEST_FILE_PATH = path.join(__dirname, '../temp/test-document.txt');

// Create test file if it doesn't exist
function createTestFile() {
  const content = `
ARIAS V BIANCHI TEST DOCUMENT
==============================

This is a test document created to verify the document organization system.
It contains keywords like "legal", "court", and "case" to test categorization.

FILE CATEGORIZATION TEST
========================

This document should be categorized as a legal document based on its content
and filename which includes references to the ARIAS V BIANCHI case.

METADATA TEST
============

This file is generated on ${new Date().toISOString()}.
Test ID: TEST-${Date.now()}
`;

  fs.writeFileSync(TEST_FILE_PATH, content);
  console.log(`Test file created at: ${TEST_FILE_PATH}`);
  return TEST_FILE_PATH;
}

// Upload file to the API
async function uploadFile(filePath) {
  try {
    const filename = path.basename(filePath);
    const formData = new FormData();
    
    // Read file as buffer
    const fileBuffer = fs.readFileSync(filePath);
    
    // Create a file object
    formData.append('document', fileBuffer, {
      filename,
      contentType: 'text/plain'
    });
    
    // Let the system auto-categorize
    formData.append('category', 'general');
    formData.append('analyze', 'true');
    
    console.log(`Uploading: ${filename}`);
    
    const response = await axios.post(`${API_URL}/documents/upload`, formData, {
      headers: {
        ...formData.getHeaders()
      }
    });
    
    console.log(`Success: ${filename} uploaded`);
    console.log(`Storage Key: ${response.data.file?.storageKey}`);
    console.log(`Category: ${response.data.file?.category}`);
    
    if (response.data.analysis) {
      console.log('\nAnalysis Results:');
      console.log(`Summary: ${response.data.analysis.summary}`);
      console.log('Key Findings:');
      response.data.analysis.keyFindings?.forEach(finding => 
        console.log(`- ${finding}`)
      );
    }
    
    return response.data;
  } catch (error) {
    console.error(`Error uploading ${filePath}:`, error.message);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Response data:`, JSON.stringify(error.response.data));
    }
    throw error;
  }
}

// List organized files
async function listFiles() {
  try {
    const response = await axios.get(`${API_URL}/documents`);
    
    console.log('\nOrganized Files:');
    const files = response.data.files || [];
    
    if (files.length === 0) {
      console.log('No files found.');
      return [];
    }
    
    files.forEach(file => {
      console.log(`\nFile: ${file.fileName}`);
      console.log(`Path: ${file.path}`);
      console.log(`Category: ${file.category}${file.subcategory ? '/' + file.subcategory : ''}`);
      console.log(`Date: ${file.dateAdded}`);
    });
    
    return files;
  } catch (error) {
    console.error('Error listing files:', error.message);
    throw error;
  }
}

// Run the test
async function runTest() {
  try {
    console.log('Starting document organization test...');
    
    // 1. Create a test file
    const testFilePath = createTestFile();
    
    // 2. Upload the file
    await uploadFile(testFilePath);
    
    // 3. List all files to verify organization
    await listFiles();
    
    // 4. Clean up
    try {
      fs.unlinkSync(testFilePath);
      console.log('\nTest file cleaned up.');
    } catch (err) {
      console.warn('Warning: Could not delete test file:', err.message);
    }
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
runTest();