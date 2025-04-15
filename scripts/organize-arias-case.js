import fs from 'fs';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import { fileURLToPath } from 'url';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to determine content type
function getContentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.gif':
      return 'image/gif';
    case '.pdf':
      return 'application/pdf';
    case '.doc':
      return 'application/msword';
    case '.docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case '.txt':
      return 'text/plain';
    case '.md':
      return 'text/markdown';
    default:
      return 'application/octet-stream';
  }
}

// Configuration
const API_URL = 'http://localhost:5000/api';
const ASSETS_DIR = path.join(__dirname, '../attached_assets');
const TEMP_DIR = path.join(__dirname, '../temp');

// Create temp directory if it doesn't exist
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// File category mapping based on extensions and filenames
function determineCategory(filename) {
  const ext = path.extname(filename).toLowerCase();
  const name = filename.toLowerCase();
  
  // Legal documents
  if (name.includes('arias') || name.includes('bianchi') || 
      name.includes('legal') || name.includes('court') || 
      name.includes('case') || ext === '.pdf' || ext === '.doc' || 
      ext === '.docx' || ext === '.txt') {
    return 'legal';
  }
  
  // Images and photos - map to general since exhibits isn't allowed
  if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) {
    return 'general';
  }
  
  // Communications
  if (name.includes('email') || name.includes('message') || 
      name.includes('chat') || name.includes('communication')) {
    return 'communication';
  }
  
  // Default to general (valid category)
  return 'general';
}

// Upload file to the API
async function uploadFile(filePath, category) {
  try {
    const filename = path.basename(filePath);
    const formData = new FormData();
    
    // Read file as buffer
    const fileBuffer = fs.readFileSync(filePath);
    
    // Create a file object
    formData.append('document', fileBuffer, {
      filename,
      contentType: getContentType(filename)
    });
    
    formData.append('category', category);
    formData.append('analyze', category === 'legal' ? 'true' : 'false');
    
    console.log(`Uploading: ${filename} as ${category}`);
    
    const response = await axios.post(`${API_URL}/documents/upload`, formData, {
      headers: {
        ...formData.getHeaders()
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    
    console.log(`Success: ${filename} uploaded as ${category}`);
    
    return {
      filename,
      category,
      success: true,
      storageKey: response.data.file?.storageKey,
      analysis: response.data.analysis
    };
  } catch (error) {
    console.error(`Error uploading ${filePath}:`, error.message);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Response data:`, JSON.stringify(error.response.data));
    }
    return {
      filename: path.basename(filePath),
      category,
      success: false,
      error: error.message
    };
  }
}

// Process files in chunks to avoid timeout
async function processDirectory() {
  try {
    // Read all files in the directory
    const allFiles = fs.readdirSync(ASSETS_DIR)
      .filter(file => !fs.statSync(path.join(ASSETS_DIR, file)).isDirectory());
    
    console.log(`Found ${allFiles.length} files to process.`);
    
    // Check for already uploaded files
    let existingFiles = [];
    try {
      const response = await axios.get(`${API_URL}/documents`);
      existingFiles = response.data.files.map(f => {
        const parts = f.path.split('/');
        return parts[parts.length - 1];
      });
      console.log(`${existingFiles.length} files already uploaded.`);
    } catch (err) {
      console.log(`Could not get existing files: ${err.message}`);
    }
    
    // Filter out already uploaded files
    const filesToUpload = allFiles.filter(file => {
      const sanitizedName = file.replace(/[^a-zA-Z0-9-_.]/g, '_').toLowerCase();
      return !existingFiles.some(ef => ef.includes(sanitizedName));
    });
    
    console.log(`${filesToUpload.length} files remaining to upload.`);
    
    const results = [];
    const chunkSize = 5; // Process 5 files at a time
    
    for (let i = 0; i < filesToUpload.length; i += chunkSize) {
      const chunk = filesToUpload.slice(i, i + chunkSize);
      console.log(`Processing chunk ${Math.floor(i/chunkSize) + 1} of ${Math.ceil(filesToUpload.length/chunkSize)}`);
      
      // Process files in current chunk
      for (const file of chunk) {
        const filePath = path.join(ASSETS_DIR, file);
        const category = determineCategory(file);
        
        const result = await uploadFile(filePath, category);
        results.push(result);
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      // Save progress after each chunk
      const reportPath = path.join(TEMP_DIR, 'arias-case-upload-report.json');
      fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
      console.log(`Progress saved. ${results.filter(r => r.success).length}/${results.length} files uploaded successfully.`);
    }
    
    // Final report
    const reportPath = path.join(TEMP_DIR, 'arias-case-upload-report.json');
    console.log(`\nUpload complete. ${results.filter(r => r.success).length}/${results.length} files uploaded successfully.`);
    console.log(`Report saved to: ${reportPath}`);
    
    // Print analysis results for legal documents
    const legalDocs = results.filter(r => r.success && r.category === 'legal' && r.analysis);
    if (legalDocs.length > 0) {
      console.log('\nLegal Document Analysis Results:');
      legalDocs.forEach(doc => {
        console.log(`\n${doc.filename}:`);
        console.log(`Summary: ${doc.analysis.summary}`);
        console.log('Key Findings:');
        doc.analysis.keyFindings?.forEach(finding => console.log(`- ${finding}`));
      });
    }
    
    return results;
  } catch (error) {
    console.error('Error processing directory:', error);
    throw error;
  }
}

// Trigger the organization process
console.log('Starting to organize ARIAS V BIANCHI case files...');
processDirectory()
  .then(() => console.log('Organization complete!'))
  .catch(err => console.error('Organization failed:', err));