// Migration script to reorganize files in object storage
import { Client } from '@replit/object-storage';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create temp directory if it doesn't exist
const TEMP_DIR = path.join(__dirname, '../temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Initialize object storage client
const objectStorage = new Client();

/**
 * Clean up filenames by removing timestamps and standardizing format
 * @param {string} fileName - Original filename
 * @returns {string} - Cleaned filename
 */
function cleanupFilename(fileName) {
  if (!fileName) return 'unknown_file';
  
  // Remove common timestamp patterns
  let cleanName = fileName
    .replace(/(_|\-)?\d{13,}/g, '') // Remove timestamp patterns
    .replace(/pasted\-\-/g, '')      // Remove "pasted--" prefix
    .replace(/pasted\-/g, '')        // Remove "pasted-" prefix
    .replace(/content\-/g, '')       // Remove "content-" prefix
    .replace(/screenshot\-/g, '')    // Remove "screenshot-" prefix
    .replace(/image\_/g, 'img_')     // Standardize image prefix
    .replace(/\-{2,}/g, '-')         // Replace multiple dashes with single dash
    .replace(/_{2,}/g, '_')          // Replace multiple underscores with single underscore
    .replace(/^[\-_]+|[\-_]+$/g, '') // Remove dashes/underscores at beginning or end
    
  // If name is too long, truncate it
  if (cleanName.length > 50) {
    const ext = path.extname(cleanName);
    const baseName = path.basename(cleanName, ext);
    cleanName = baseName.substring(0, 45) + ext;
  }
  
  // If name is now empty, use fallback
  if (!cleanName || cleanName.length < 3) {
    cleanName = `file_${Date.now()}${path.extname(fileName)}`;
  }
  
  return cleanName;
}

/**
 * Determine better category based on filename and content
 * @param {string} filePath - Original path
 * @param {string} content - File content (if available)
 * @returns {string} - Improved category
 */
function improvedCategorization(filePath, content) {
  const fileName = path.basename(filePath).toLowerCase();
  const ext = path.extname(fileName).toLowerCase();
  
  // Media file categorization
  if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext)) {
    if (fileName.includes('logo') || fileName.includes('brand')) {
      return 'media/branding';
    } else if (fileName.includes('property') || fileName.includes('building') || 
               fileName.includes('apartment') || fileName.includes('condo')) {
      return 'media/property_photos';
    } else if (fileName.includes('document') || fileName.includes('scan')) {
      return 'media/document_scans';
    } else {
      return 'media/other';
    }
  }
  
  // Document categorization
  if (['.pdf', '.doc', '.docx', '.txt', '.md'].includes(ext)) {
    if (fileName.includes('lease') || fileName.includes('agreement') || 
        fileName.includes('contract') || fileName.includes('terms')) {
      return 'legal/contracts';
    } else if (fileName.includes('court') || fileName.includes('filing') ||
               fileName.includes('case') || fileName.includes('lawsuit')) {
      return 'court/filings';
    } else if (fileName.includes('business') || fileName.includes('overview') ||
               fileName.includes('report') || fileName.includes('company')) {
      return 'legal/business_documents';
    } else if (fileName.includes('email') || fileName.includes('message') ||
               fileName.includes('communication')) {
      return 'communications/client';
    } else if (fileName.includes('invoice') || fileName.includes('receipt') ||
               fileName.includes('payment') || fileName.includes('financial')) {
      return 'financial/documents';
    } else if (content) {
      // Simple content-based categorization
      const lowerContent = content.toLowerCase();
      if (lowerContent.includes('agreement') || lowerContent.includes('contract') ||
          lowerContent.includes('legal') || lowerContent.includes('terms')) {
        return 'legal/contracts';
      } else if (lowerContent.includes('court') || lowerContent.includes('case')) {
        return 'court/filings';
      } else if (lowerContent.includes('financial') || lowerContent.includes('payment')) {
        return 'financial/documents';
      }
    }
  }
  
  // Fallback to original category if possible
  const pathParts = filePath.split('/');
  if (pathParts.length > 1) {
    const originalCategory = pathParts[1];
    if (['legal', 'communication', 'financial', 'court'].includes(originalCategory)) {
      return originalCategory;
    }
  }
  
  return 'general';
}

/**
 * Generate better storage path for files
 * @param {string} fileName - Cleaned filename
 * @param {string} category - Improved category
 * @returns {string} - New storage path
 */
function generateBetterPath(fileName, category) {
  const date = new Date().toISOString().split('T')[0];
  
  // For backward compatibility, if category doesn't have a slash,
  // ensure it's a valid top-level category
  if (!category.includes('/')) {
    const validTopCategories = ['legal', 'communication', 'communications', 'financial', 'court', 'general', 'media'];
    if (!validTopCategories.includes(category)) {
      category = 'general';
    }
  }
  
  return `ARIAS_V_BIANCHI/${category}/${date}/${fileName}`;
}

/**
 * Migrate and reorganize existing files
 */
async function migrateFiles() {
  try {
    console.log('Starting object storage migration...');
    
    // Create migration report file
    const reportPath = path.join(TEMP_DIR, 'storage-migration-report.json');
    const results = [];
    
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
    
    // Process files in chunks to avoid overwhelming the storage service
    const CHUNK_SIZE = 5;
    for (let i = 0; i < files.value.length; i += CHUNK_SIZE) {
      const chunk = files.value.slice(i, i + CHUNK_SIZE);
      
      // Process each file in the chunk
      const chunkPromises = chunk.map(async (file) => {
        try {
          // Skip files that are already in the new structure
          // (files with more than 3 path segments)
          const pathSegments = file.name.split('/');
          if (pathSegments.length > 3 && pathSegments[0] === 'ARIAS_V_BIANCHI' && 
              pathSegments[1].includes('/')) {
            return {
              originalPath: file.name,
              newPath: file.name,
              status: 'skipped',
              reason: 'Already in new structure'
            };
          }
          
          // Download the file
          let content;
          try {
            content = await objectStorage.downloadAsText(file.name);
            if (!content.ok) {
              return {
                originalPath: file.name,
                status: 'failed',
                reason: 'Failed to download file'
              };
            }
          } catch (downloadError) {
            console.error(`Error downloading file ${file.name}:`, downloadError);
            return {
              originalPath: file.name,
              status: 'failed',
              reason: `Download error: ${downloadError.message}`
            };
          }
          
          // Clean up the filename
          const originalFilename = file.name.split('/').pop();
          const cleanedFilename = cleanupFilename(originalFilename);
          
          // Determine better category and path
          const newCategory = improvedCategorization(file.name, content.value);
          const newPath = generateBetterPath(cleanedFilename, newCategory);
          
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
          try {
            uploadResult = await objectStorage.uploadFromText(newPath, content.value);
            if (!uploadResult.ok) {
              return {
                originalPath: file.name,
                newPath,
                status: 'failed',
                reason: 'Failed to upload to new path'
              };
            }
          } catch (uploadError) {
            console.error(`Error uploading file to ${newPath}:`, uploadError);
            return {
              originalPath: file.name,
              newPath,
              status: 'failed',
              reason: `Upload error: ${uploadError.message}`
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
migrateFiles()
  .then(summary => {
    console.log('Migration completed successfully!');
    console.log(summary);
  })
  .catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });