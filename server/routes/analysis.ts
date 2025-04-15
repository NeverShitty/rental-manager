import { Router, Request, Response } from 'express';
import { RequestHandler } from 'express-serve-static-core';

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
import { 
  analyzeAriasVBianchi, 
  analyzeProperty, 
  analyzeLegalDocument, 
  analyzeDocumentFile,
  analyzeDocumentDirectory
} from '../services/analysis';
import { openai } from '../services/openai-client';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';

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
    // Accept text files, PDFs, and common document formats
    const allowedTypes = ['.txt', '.pdf', '.doc', '.docx', '.md'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only text, PDF, and document files are allowed.') as any);
    }
  }
});

const router = Router();

/**
 * GET /api/analysis/company
 * Performs analysis on ARIAS V BIANCHI company data
 */
router.get('/company', async (req: Request, res: Response) => {
  try {
    const analysisResult = await analyzeAriasVBianchi();
    res.json(analysisResult);
  } catch (error) {
    console.error('Error performing company analysis:', error);
    res.status(500).json({ 
      error: 'Failed to complete company analysis',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/analysis/property/:id
 * Performs analysis on a specific property
 */
router.get('/property/:id', async (req: Request, res: Response) => {
  try {
    const propertyId = parseInt(req.params.id);
    
    if (isNaN(propertyId)) {
      return res.status(400).json({ error: 'Invalid property ID' });
    }
    
    const propertyAnalysis = await analyzeProperty(propertyId);
    res.json(propertyAnalysis);
  } catch (error) {
    console.error('Error performing property analysis:', error);
    res.status(500).json({ 
      error: 'Failed to complete property analysis',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/analysis/document
 * Analyzes a document from text content
 */
router.post('/document', async (req: Request, res: Response) => {
  try {
    const { content, documentType } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Document content is required' });
    }
    
    if (!documentType || !['legal', 'communication', 'business', 'court', 'text_message'].includes(documentType)) {
      return res.status(400).json({ 
        error: 'Valid document type is required',
        validTypes: ['legal', 'communication', 'business', 'court', 'text_message']
      });
    }
    
    const analysisResult = await analyzeLegalDocument(documentType, content);
    res.json(analysisResult);
  } catch (error) {
    console.error('Error analyzing document:', error);
    res.status(500).json({ 
      error: 'Failed to analyze document',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/analysis/document/upload
 * Upload and analyze a document file
 */
router.post('/document/upload', upload.single('document'), async (req: Request & { file?: Express.Multer.File }, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const documentType = req.body.documentType || 'legal';
    
    if (!['legal', 'communication', 'business', 'court', 'text_message'].includes(documentType)) {
      return res.status(400).json({ 
        error: 'Invalid document type',
        validTypes: ['legal', 'communication', 'business', 'court', 'text_message']
      });
    }
    
    // Analyze the uploaded file
    const analysisResult = await analyzeDocumentFile(req.file.path, documentType);
    
    // Return the analysis results
    res.json({
      filename: req.file.originalname,
      documentType,
      analysis: analysisResult
    });
  } catch (error) {
    console.error('Error analyzing uploaded document:', error);
    res.status(500).json({ 
      error: 'Failed to analyze uploaded document',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/analysis/directory
 * Analyze all documents in a directory
 */
router.post('/directory', async (req: Request, res: Response) => {
  try {
    const { directoryPath } = req.body;
    
    if (!directoryPath) {
      return res.status(400).json({ error: 'Directory path is required' });
    }
    
    if (!fs.existsSync(directoryPath)) {
      return res.status(404).json({ error: 'Directory not found' });
    }
    
    const analysisResult = await analyzeDocumentDirectory(directoryPath);
    res.json(analysisResult);
  } catch (error) {
    console.error('Error analyzing directory:', error);
    res.status(500).json({ 
      error: 'Failed to analyze directory',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/analysis/arias-v-bianchi
 * Special endpoint to analyze ARIAS V BIANCHI legal documents
 */
router.post('/arias-v-bianchi', async (req: Request, res: Response) => {
  try {
    const { caseDocuments, courtFilings, communications, businessRecords } = req.body;
    
    // Validate that at least one document type was provided
    if (!caseDocuments && !courtFilings && !communications && !businessRecords) {
      return res.status(400).json({ 
        error: 'At least one document type is required',
        validFields: ['caseDocuments', 'courtFilings', 'communications', 'businessRecords']
      });
    }
    
    // Process each document type
    const results: any = {};
    
    if (caseDocuments) {
      results.legalDocuments = await analyzeLegalDocument('legal', caseDocuments);
    }
    
    if (courtFilings) {
      results.courtFilings = await analyzeLegalDocument('court', courtFilings);
    }
    
    if (communications) {
      results.communications = await analyzeLegalDocument('communication', communications);
    }
    
    if (businessRecords) {
      results.businessRecords = await analyzeLegalDocument('business', businessRecords);
    }
    
    // Generate a comprehensive summary of all documents
    if (Object.keys(results).length > 1) {
      // Create a condensed version of each result
      const condensedResults = Object.entries(results).map(([type, analysis]) => ({
        documentType: type,
        summary: (analysis as any).summary,
        keyFindings: (analysis as any).keyFindings.slice(0, 2)
      }));
      
      // Generate an overall summary
      const completion = await openai.chat.completions.create({
        messages: [
          { 
            role: "system", 
            content: "You are an expert legal analyst specializing in property management legal matters." 
          },
          { 
            role: "user", 
            content: `Generate a comprehensive legal analysis for ARIAS V BIANCHI based on these document analyses:
            
            ${JSON.stringify(condensedResults, null, 2)}
            
            Provide an executive summary that highlights the key legal issues, risks, and recommendations.` 
          }
        ],
        model: "gpt-3.5-turbo",
        temperature: 0.3
      });
      
      results.overallSummary = completion.choices[0].message.content;
    }
    
    res.json({
      case: "ARIAS V BIANCHI",
      analysisDate: new Date().toISOString(),
      results
    });
  } catch (error) {
    console.error('Error analyzing ARIAS V BIANCHI case documents:', error);
    res.status(500).json({ 
      error: 'Failed to analyze case documents',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;