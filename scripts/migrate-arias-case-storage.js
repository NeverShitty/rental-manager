import { Client } from '@replit/object-storage';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize object storage client
const objectStorage = new Client();

// Constants
const TEMP_DIR = path.join(__dirname, '../temp');
const BASE_FOLDER = 'ARIAS_V_BIANCHI';
const ALLOWED_CATEGORIES = ['legal', 'communication', 'financial', 'general', 'court'];

/**
 * Sanitize a lastModified date from object storage
 * @param {number|string} lastModified - Raw lastModified value
 * @returns {number|null} - Safe lastModified timestamp or null
 */
function sanitizeLastModified(lastModified) {
  try {
    if (lastModified && typeof lastModified === 'number' && lastModified > 0) {
      return lastModified;
    }
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Sanitize a file size from object storage
 * @param {number|string} size - Raw size value
 * @returns {number|null} - Safe size number or null
 */
function sanitizeFileSize(size) {
  try {
    return size && !isNaN(size) ? Number(size) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Clean up filenames by removing timestamps and standardizing format
 * @param {string} fileName - Original filename
 * @returns {string} - Cleaned filename
 */
function cleanupFilename(fileName) {
  // Remove any timestamp prefixes (common in uploaded files)
  let cleanName = fileName.replace(/^\d+_+/, '');
  
  // Replace spaces with underscores
  cleanName = cleanName.replace(/\s+/g, '_');
  
  // Remove any special characters that might cause issues
  cleanName = cleanName.replace(/[^\w\-_.]/g, '');
  
  return cleanName;
}

/**
 * Determine better category based on filename and content
 * @param {string} filePath - Original path
 * @param {string} content - File content (if available)
 * @returns {string} - Improved category
 */
function determineCategory(filePath, content = '') {
  // Extract the filename from path
  const fileName = path.basename(filePath).toLowerCase();
  
  // Determine if already categorized in folder structure
  const pathParts = filePath.split('/');
  if (pathParts.length > 2 && pathParts[0] === BASE_FOLDER) {
    const existingCategory = pathParts[1].toLowerCase();
    if (ALLOWED_CATEGORIES.includes(existingCategory)) {
      return existingCategory;
    }
  }
  
  // Analyze filename for category clues
  if (fileName.includes('complaint') || 
      fileName.includes('motion') || 
      fileName.includes('filing') || 
      fileName.includes('court') || 
      fileName.includes('legal') || 
      fileName.includes('case') || 
      fileName.includes('judgment') ||
      fileName.includes('agreement') ||
      fileName.includes('contract')) {
    return 'legal';
  }
  
  if (fileName.includes('email') || 
      fileName.includes('message') || 
      fileName.includes('letter') || 
      fileName.includes('chat') ||
      fileName.includes('text') ||
      fileName.includes('communication')) {
    return 'communication';
  }
  
  if (fileName.includes('finance') || 
      fileName.includes('invoice') || 
      fileName.includes('payment') || 
      fileName.includes('receipt') ||
      fileName.includes('statement') ||
      fileName.includes('bank') ||
      fileName.includes('transaction') ||
      fileName.includes('wire')) {
    return 'financial';
  }
  
  if (fileName.includes('exhibit') || 
      fileName.includes('testimony') || 
      fileName.includes('deposition') ||
      fileName.includes('evidence') ||
      fileName.includes('hearing')) {
    return 'court';
  }
  
  // Content-based categorization if available
  if (content) {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('court') || 
        lowerContent.includes('plaintiff') || 
        lowerContent.includes('defendant') ||
        lowerContent.includes('judge') ||
        lowerContent.includes('attorney') ||
        lowerContent.includes('lawyer')) {
      return 'legal';
    }
    
    if (lowerContent.includes('payment') || 
        lowerContent.includes('invoice') || 
        lowerContent.includes('amount') ||
        lowerContent.includes('dollars') ||
        lowerContent.includes('bank')) {
      return 'financial';
    }
  }
  
  // Default to general category
  return 'general';
}

/**
 * Generate better storage path for files
 * @param {string} fileName - Cleaned filename
 * @param {string} category - Improved category
 * @returns {string} - New storage path
 */
function generateStoragePath(fileName, category) {
  // Use ISO date string but only take the YYYY-MM-DD part
  const dateStr = new Date().toISOString().split('T')[0];
  
  // Create a path like: ARIAS_V_BIANCHI/legal/2023-04-15/filename.pdf
  return `${BASE_FOLDER}/${category}/${dateStr}/${fileName}`;
}

/**
 * Migrate existing files to a better organized structure
 */
async function migrateObjectStorage() {
  try {
    // Create temp directory if it doesn't exist
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    }
    
    // Migration report file
    const reportPath = path.join(TEMP_DIR, 'arias-case-migration-report.json');
    const results = [];
    
    console.log('Starting migration of ARIAS V BIANCHI files in object storage...');
    
    // List all files in object storage
    let files;
    try {
      files = await objectStorage.list();
      if (!files.ok) {
        throw new Error('Failed to list files in object storage');
      }
      
      console.log(`Found ${files.value.length} files to process`);
    } catch (listError) {
      console.error('Error listing files from object storage:', listError);
      throw new Error(`Failed to list files: ${listError.message}`);
    }
    
    // Filter for files that aren't already in the new structure
    const filesToProcess = files.value.filter(file => {
      const pathParts = file.name.split('/');
      // Skip files that are already in the new structure
      // (files with properly categorized paths)
      return !(pathParts.length > 2 && 
               pathParts[0] === BASE_FOLDER && 
               ALLOWED_CATEGORIES.includes(pathParts[1]));
    });
    
    console.log(`${filesToProcess.length} files need to be reorganized`);
    
    // Process files in chunks to avoid overwhelming the storage service
    const CHUNK_SIZE = 5;
    for (let i = 0; i < filesToProcess.length; i += CHUNK_SIZE) {
      const chunk = filesToProcess.slice(i, i + CHUNK_SIZE);
      console.log(`Processing chunk ${Math.floor(i/CHUNK_SIZE) + 1} of ${Math.ceil(filesToProcess.length/CHUNK_SIZE)}`);
      
      // Process each file in the chunk
      const chunkPromises = chunk.map(async (file) => {
        try {
          // Skip files that are already in the new structure
          const pathSegments = file.name.split('/');
          if (pathSegments.length > 2 && 
              pathSegments[0] === BASE_FOLDER && 
              ALLOWED_CATEGORIES.includes(pathSegments[1])) {
            return {
              originalPath: file.name,
              newPath: file.name,
              status: 'skipped',
              reason: 'Already in new structure'
            };
          }
          
          // Download the file content if possible (for better categorization)
          let content = '';
          let contentType = '';
          try {
            const result = await objectStorage.downloadAsText(file.name);
            if (result.ok) {
              content = result.value;
              contentType = 'text';
            }
          } catch (downloadError) {
            // If text download fails, it might be a binary file
            // Just use the filename for categorization
            console.log(`Could not download ${file.name} as text, using filename only for categorization`);
          }
          
          // Clean up the filename
          const originalFilename = file.name.split('/').pop();
          const cleanedFilename = cleanupFilename(originalFilename);
          
          // Determine better category and path
          const newCategory = determineCategory(file.name, content);
          const newPath = generateStoragePath(cleanedFilename, newCategory);
          
          // Skip if the new path is the same as the original
          if (newPath === file.name) {
            return {
              originalPath: file.name,
              newPath,
              status: 'skipped',
              reason: 'Path unchanged'
            };
          }
          
          // Upload to new path
          let uploadResult;
          if (contentType === 'text') {
            // If we have text content, upload it directly
            uploadResult = await objectStorage.uploadFromText(newPath, content);
          } else {
            // Otherwise, download as binary and re-upload
            try {
              const binaryResult = await objectStorage.download(file.name);
              if (binaryResult.ok) {
                uploadResult = await objectStorage.upload(newPath, binaryResult.value);
              } else {
                return {
                  originalPath: file.name,
                  newPath,
                  status: 'failed',
                  reason: 'Failed to download binary file'
                };
              }
            } catch (binaryError) {
              console.error(`Error downloading binary file ${file.name}:`, binaryError);
              return {
                originalPath: file.name,
                newPath,
                status: 'failed',
                reason: `Binary download error: ${binaryError.message}`
              };
            }
          }
          
          if (!uploadResult || !uploadResult.ok) {
            return {
              originalPath: file.name,
              newPath,
              status: 'failed',
              reason: 'Failed to upload to new path'
            };
          }
          
          // Delete old file after successful migration
          try {
            const deleteResult = await objectStorage.delete(file.name);
            if (!deleteResult.ok) {
              console.warn(`Warning: Could not delete original file: ${file.name}`);
            }
          } catch (deleteError) {
            console.warn(`Warning: Error deleting original file ${file.name}:`, deleteError.message);
          }
          
          console.log(`Migrated: ${file.name} -> ${newPath}`);
          
          return {
            originalPath: file.name,
            newPath,
            status: 'success',
            category: newCategory
          };
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
          return {
            originalPath: file.name,
            status: 'error',
            reason: error.message
          };
        }
      });
      
      // Wait for all files in the chunk to be processed
      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
      
      // Save progress after each chunk
      fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
      
      // Small delay between chunks
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Final report
    const successCount = results.filter(r => r.status === 'success').length;
    const skippedCount = results.filter(r => r.status === 'skipped').length;
    const failedCount = results.filter(r => r.status === 'failed' || r.status === 'error').length;
    
    console.log('\nMigration Summary:');
    console.log(`Total files processed: ${results.length}`);
    console.log(`Successfully migrated: ${successCount}`);
    console.log(`Skipped: ${skippedCount}`);
    console.log(`Failed: ${failedCount}`);
    console.log(`Report saved to: ${reportPath}`);
    
    return {
      total: results.length,
      success: successCount,
      skipped: skippedCount,
      failed: failedCount,
      report: reportPath
    };
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run the migration
migrateObjectStorage()
  .then(summary => {
    console.log('Migration completed successfully!');
    console.log(summary);
  })
  .catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });