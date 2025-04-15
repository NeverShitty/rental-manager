import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { DocumentOrganizer } from '../services/document-organizer';

// Define document categories here since it's not exported from document-organizer
const DocumentCategories = {
  LEGAL: 'legal',
  COMMUNICATION: 'communication',
  FINANCIAL: 'financial',
  GENERAL: 'general'
};
import { googleDriveService } from '../services/google-drive';
import { analyzeLegalDocument } from '../services/analysis';

// ES module dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Add Multer types
declare global {
  namespace Express {
    namespace Multer {
      interface File {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        destination: string;
        filename: string;
        path: string;
        buffer: Buffer;
      }
    }
  }
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Accept text files, PDFs, common document formats, and data files
    const allowedTypes = ['.txt', '.pdf', '.doc', '.docx', '.md', '.jpg', '.jpeg', '.png', '.json', '.csv', '.xml'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only text, data, PDF, document, and common image files are allowed.') as any);
    }
  }
});

const router = Router();
const documentOrganizer = new DocumentOrganizer();

/**
 * GET /api/documents
 * List all organized documents
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const files = await documentOrganizer.listOrganizedFiles();
    
    // Group files by category and subcategory for easier frontend consumption
    const groupedFiles = files.reduce((acc: any, file) => {
      const { category, subcategory } = file;
      
      if (!acc[category]) {
        acc[category] = {};
      }
      
      const subCat = subcategory || 'general';
      if (!acc[category][subCat]) {
        acc[category][subCat] = [];
      }
      
      acc[category][subCat].push(file);
      return acc;
    }, {});
    
    res.json({ 
      files,
      groupedFiles,
      categories: Object.keys(DocumentCategories) 
    });
  } catch (error) {
    console.error('Error listing documents:', error);
    res.status(500).json({ 
      error: 'Failed to list documents',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/documents/upload
 * Upload a document and store it in the system
 */
router.post('/upload', upload.single('document'), async (req: Request & { file?: Express.Multer.File }, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Get category and subcategory information
    let { category = 'general', subcategory, analyze = false } = req.body;
    
    // Validate top-level category
    const validTopCategories = Object.keys(DocumentCategories);
    
    if (!validTopCategories.includes(category)) {
      return res.status(400).json({ 
        error: 'Invalid category',
        validCategories: validTopCategories
      });
    }
    
    // Validate subcategory if provided
    if (subcategory) {
      const validSubcategories = DocumentCategories[category as keyof typeof DocumentCategories];
      if (Array.isArray(validSubcategories) && validSubcategories.length > 0 && !validSubcategories.includes(subcategory)) {
        return res.status(400).json({ 
          error: 'Invalid subcategory',
          validSubcategories: validSubcategories
        });
      }
    }
    
    // Clean up the filename
    let cleanedFilename = req.file.originalname
      .replace(/[^a-zA-Z0-9-_.]/g, '_')
      .toLowerCase();
    
    // Create the full category path
    let fullCategory = subcategory ? `${category}/${subcategory}` : category;
    
    // Automatically determine category and filename if not explicitly provided
    let fileContent = '';
    if (category === 'general' || !subcategory) {
      // Read file content for better categorization
      try {
        fileContent = fs.readFileSync(req.file.path, 'utf8');
      } catch (e) {
        // Binary file, can't read as text
      }
      
      // Use advanced categorization if no specific category provided
      if (category === 'general') {
        const detectedCategory = documentOrganizer.categorizeDocument(req.file.originalname, fileContent);
        if (detectedCategory !== 'general') {
          fullCategory = detectedCategory;
        }
      }
      
      // Clean up filename
      const betterFilename = documentOrganizer.cleanupFilename(cleanedFilename);
      cleanedFilename = betterFilename;
    }
    
    // Generate date folder
    const date = new Date().toISOString().split('T')[0];
    
    // Create storage path
    const storageKey = `ARIAS_V_BIANCHI/${fullCategory}/${date}/${cleanedFilename}`;
    
    // Upload to Replit Object Storage
    await documentOrganizer.uploadFile(req.file.path, storageKey);
    
    // Determine if it's a text file for analysis
    const isTextFile = ['.txt', '.md', '.doc', '.docx'].includes(
      path.extname(req.file.originalname).toLowerCase()
    );
    
    // For text files, read content for analysis if not already read
    if (isTextFile && !fileContent) {
      fileContent = fs.readFileSync(req.file.path, 'utf8');
    }
    
    // Upload to Google Drive if configured
    let driveFileId: string | undefined;
    let driveUrl: string | undefined;
    
    if (googleDriveService.isInitialized()) {
      try {
        // Create folder structure if needed
        let parentFolderId: string | undefined;
        
        // Find or create ARIAS_V_BIANCHI folder
        const searchResults = await googleDriveService.searchFiles('ARIAS_V_BIANCHI');
        if (searchResults.length > 0) {
          parentFolderId = searchResults[0].id;
        } else {
          parentFolderId = await googleDriveService.createFolder('ARIAS_V_BIANCHI');
        }
        
        // Find or create category folder
        const categorySearch = await googleDriveService.listFiles(parentFolderId);
        const categoryFolder = categorySearch.find(f => f.name === category);
        
        if (categoryFolder) {
          parentFolderId = categoryFolder.id;
        } else {
          parentFolderId = await googleDriveService.createFolder(category, parentFolderId);
        }
        
        // Find or create date folder
        const dateSearch = await googleDriveService.listFiles(parentFolderId);
        const dateFolder = dateSearch.find(f => f.name === date);
        
        if (dateFolder) {
          parentFolderId = dateFolder.id;
        } else {
          parentFolderId = await googleDriveService.createFolder(date, parentFolderId);
        }
        
        // Upload file
        driveFileId = await googleDriveService.uploadFile(req.file.path, cleanedFilename, parentFolderId);
        driveUrl = `https://drive.google.com/file/d/${driveFileId}/view`;
      } catch (driveError) {
        console.error('Error uploading to Google Drive:', driveError);
        // Continue with local storage even if Google Drive fails
      }
    }
    
    // Perform document analysis if requested
    let analysisResult: any = null;
    if (analyze && category === 'legal') {
      analysisResult = await analyzeLegalDocument('legal', fileContent);
    }
    
    // Return response with file details
    res.json({
      success: true,
      file: {
        originalName: req.file.originalname,
        size: req.file.size,
        storageKey,
        category,
        uploadDate: new Date().toISOString(),
        googleDrive: driveFileId ? { fileId: driveFileId, url: driveUrl } : undefined
      },
      analysis: analysisResult
    });
    
    // Clean up the temporary file
    fs.unlinkSync(req.file.path);
    
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ 
      error: 'Failed to upload document',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    
    // Clean up temporary file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }
});

/**
 * GET /api/documents/organize
 * Organize existing documents and return the organized list
 */
router.get('/organize', async (req: Request, res: Response) => {
  try {
    const organizedDocs = await documentOrganizer.organizeDocuments();
    res.json({ organizedDocs });
  } catch (error) {
    console.error('Error organizing documents:', error);
    res.status(500).json({ 
      error: 'Failed to organize documents',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/documents/google-drive/status
 * Check if Google Drive integration is available
 */
router.get('/google-drive/status', (req: Request, res: Response) => {
  const isConfigured = googleDriveService.isInitialized();
  
  res.json({
    isConfigured,
    message: isConfigured 
      ? 'Google Drive integration is configured and ready' 
      : 'Google Drive integration is not configured'
  });
});

/**
 * POST /api/documents/google-drive/setup
 * Configure Google Drive integration with provided credentials
 */
router.post('/google-drive/setup', async (req: Request, res: Response) => {
  try {
    const { clientId, clientSecret, refreshToken, folderId } = req.body;
    
    if (!clientId || !clientSecret || !refreshToken) {
      return res.status(400).json({ 
        error: 'Missing required credentials',
        requiredFields: ['clientId', 'clientSecret', 'refreshToken'] 
      });
    }
    
    googleDriveService.initialize({
      clientId,
      clientSecret,
      refreshToken,
      folderId
    });
    
    const isConfigured = googleDriveService.isInitialized();
    
    if (!isConfigured) {
      throw new Error('Failed to initialize Google Drive with provided credentials');
    }
    
    res.json({
      success: true,
      message: 'Google Drive integration configured successfully'
    });
  } catch (error) {
    console.error('Error configuring Google Drive:', error);
    res.status(500).json({ 
      error: 'Failed to configure Google Drive',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/documents/download/:storagePath
 * Download a document from object storage
 */
router.get('/download/:storagePath(*)', async (req: Request, res: Response) => {
  try {
    const storagePath = req.params.storagePath;
    
    if (!storagePath) {
      return res.status(400).json({ error: 'Storage path is required' });
    }
    
    // Create a temporary file path
    const tempDir = path.join(__dirname, '../../../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const filename = storagePath.split('/').pop() || 'document';
    const tempFilePath = path.join(tempDir, `${Date.now()}-${filename}`);
    
    try {
      // Download the file from storage
      await documentOrganizer.downloadFile(storagePath, tempFilePath);
      
      // Send the file
      res.download(tempFilePath, filename, (err) => {
        // Clean up the temporary file after sending or on error
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
        
        if (err && !res.headersSent) {
          res.status(500).json({ 
            error: 'Failed to download file',
            message: err.message
          });
        }
      });
    } catch (error) {
      console.error('Error downloading document:', error);
      res.status(404).json({ 
        error: 'File not found or could not be downloaded',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } catch (error) {
    console.error('Error processing download request:', error);
    res.status(500).json({ 
      error: 'Failed to process download request',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/documents/google-drive/upload
 * Upload an existing document to Google Drive
 */
router.post('/google-drive/upload', async (req: Request, res: Response) => {
  try {
    if (!googleDriveService.isInitialized()) {
      return res.status(400).json({ 
        error: 'Google Drive integration not configured',
        message: 'Please configure Google Drive integration first' 
      });
    }
    
    const { filePath, fileName, folderId } = req.body;
    
    if (!filePath || !fileName) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        requiredFields: ['filePath', 'fileName'] 
      });
    }
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        error: 'File not found',
        message: `The file at path "${filePath}" does not exist` 
      });
    }
    
    const fileId = await googleDriveService.uploadFile(filePath, fileName, folderId);
    const fileUrl = `https://drive.google.com/file/d/${fileId}/view`;
    
    res.json({
      success: true,
      fileId,
      fileUrl,
      message: 'File uploaded to Google Drive successfully'
    });
  } catch (error) {
    console.error('Error uploading to Google Drive:', error);
    res.status(500).json({ 
      error: 'Failed to upload to Google Drive',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/documents/parse
 * Parse a document to extract structured information
 */
router.post('/parse', upload.single('document'), async (req: Request & { file?: Express.Multer.File }, res: Response) => {
  try {
    // Handle both file upload and storagePath parameter
    let filePath: string | undefined;
    
    if (req.file) {
      // File was uploaded
      filePath = req.file.path;
    } else if (req.body.storagePath) {
      // Storage path was provided
      filePath = req.body.storagePath;
    } else {
      return res.status(400).json({ 
        error: 'No file or storagePath provided',
        message: 'Either upload a file or provide a storagePath parameter'
      });
    }
    
    // Parse the file
    if (!filePath) {
      return res.status(400).json({ 
        error: 'Invalid file path',
        message: 'File path is required for parsing'
      });
    }
    const parseResult = await documentOrganizer.parseFileContent(filePath);
    
    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    // Return the parsed content
    res.json({
      success: true,
      result: parseResult
    });
  } catch (error) {
    console.error('Error parsing document:', error);
    res.status(500).json({ 
      error: 'Failed to parse document',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    
    // Clean up temporary file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }
});

/**
 * POST /api/documents/package
 * Create a package of multiple documents with optional encryption
 */
router.post('/package', async (req: Request, res: Response) => {
  try {
    const { 
      filePaths,
      packageName,
      compress = true,
      includeMetadata = true,
      password
    } = req.body;
    
    if (!filePaths || !Array.isArray(filePaths) || filePaths.length === 0) {
      return res.status(400).json({ 
        error: 'filePaths parameter is required',
        message: 'Please provide an array of file paths to include in the package'
      });
    }
    
    // Create the package - package name is required
    const finalPackageName = packageName || `package-${new Date().getTime()}`;
    const options = {
      compress,
      includeMetadata,
      password
    };
    const packagePath = await documentOrganizer.createPackage(filePaths, finalPackageName, options);
    
    // Return the package information
    res.json({
      success: true,
      packagePath,
      fileCount: filePaths.length,
      password: password ? true : false
    });
  } catch (error) {
    console.error('Error creating package:', error);
    res.status(500).json({ 
      error: 'Failed to create package',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/documents/extract
 * Extract files from a package
 */
router.post('/extract', async (req: Request, res: Response) => {
  try {
    const { 
      packagePath,
      password,
      onlyFiles,
      excludeFiles
    } = req.body;
    
    if (!packagePath) {
      return res.status(400).json({ 
        error: 'packagePath parameter is required',
        message: 'Please provide the path to the package file'
      });
    }
    
    // Check if package exists
    if (!fs.existsSync(packagePath)) {
      return res.status(404).json({ 
        error: 'Package file not found',
        message: `The file at ${packagePath} does not exist`
      });
    }
    
    // Extract the package
    const extractedFiles = await documentOrganizer.extractPackage(packagePath, {
      password,
      onlyFiles,
      excludeFiles
    });
    
    // Return information about the extracted files
    res.json({
      success: true,
      extractedFiles,
      fileCount: extractedFiles.length
    });
  } catch (error) {
    console.error('Error extracting package:', error);
    res.status(500).json({ 
      error: 'Failed to extract package',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;