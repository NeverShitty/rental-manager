import { Client } from '@replit/object-storage';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize object storage client
const objectStorage = new Client();

/**
 * List all files in object storage
 */
async function listAllFiles() {
  try {
    console.log('Listing all files in object storage...');
    
    const files = await objectStorage.list();
    if (!files.ok) {
      throw new Error('Failed to list files in object storage');
    }
    
    console.log(`Found ${files.value.length} files in object storage`);
    
    // Group files by category
    const filesByCategory = {};
    
    for (const file of files.value) {
      const parts = file.name.split('/');
      let category = 'unknown';
      
      if (parts.length > 1) {
        if (parts[0] === 'ARIAS_V_BIANCHI') {
          // For ARIAS_V_BIANCHI files, use the subcategory structure
          category = parts[1] || 'unknown';
        } else {
          // For other files, use the top-level folder
          category = parts[0];
        }
      }
      
      if (!filesByCategory[category]) {
        filesByCategory[category] = [];
      }
      
      // Sanitize lastModified date for JSON
      let safeLastModified;
      try {
        if (file.lastModified && typeof file.lastModified === 'number' && file.lastModified > 0) {
          safeLastModified = file.lastModified;
        } else {
          safeLastModified = null;
        }
      } catch (e) {
        safeLastModified = null;
      }
      
      // Sanitize file size for JSON
      let safeSize;
      try {
        safeSize = file.size && !isNaN(file.size) ? Number(file.size) : null;
      } catch (e) {
        safeSize = null;
      }
      
      filesByCategory[category].push({
        name: file.name,
        lastModified: safeLastModified,
        lastModifiedFormatted: safeLastModified ? new Date(safeLastModified).toISOString() : 'unknown',
        size: safeSize,
        sizeFormatted: safeSize ? `${Math.round(safeSize / 1024)}KB` : 'unknown size'
      });
    }
    
    // Print file listing by category
    console.log('\nFiles by category:');
    for (const category in filesByCategory) {
      console.log(`\n${category.toUpperCase()} (${filesByCategory[category].length} files):`);
      filesByCategory[category].forEach(file => {
        console.log(`  ${file.name} (${file.sizeFormatted}, modified: ${file.lastModifiedFormatted})`);
      });
    }
    
    // Save detailed listing to file
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const reportPath = path.join(tempDir, 'object-storage-listing.json');
    fs.writeFileSync(reportPath, JSON.stringify(filesByCategory, null, 2));
    console.log(`\nDetailed listing saved to: ${reportPath}`);
    
    return filesByCategory;
  } catch (error) {
    console.error('Error listing files:', error);
    throw error;
  }
}

// Run the listing function
listAllFiles()
  .then(() => console.log('Listing completed successfully!'))
  .catch(error => {
    console.error('Listing failed:', error);
    process.exit(1);
  });