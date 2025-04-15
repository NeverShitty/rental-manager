import { openai } from './openai-client';
import { storage } from '../storage';
import { Transaction } from '@shared/schema';
import * as fs from 'fs';
import * as path from 'path';

interface AnalysisResult {
  summary: string;
  insights: string[];
  recommendations: string[];
  metrics: {
    totalProperties: number;
    totalTransactions: number;
    rentalOccupancyRate: number;
    averageMonthlyRevenue: number;
    profitMargin: number;
  };
}

interface LegalDocumentAnalysisResult {
  summary: string;
  keyFindings: string[];
  riskAssessment: {
    level: 'low' | 'medium' | 'high',
    factors: string[]
  };
  nextSteps: string[];
  relevantCases: string[];
}

// Document types we can analyze
type DocumentType = 'legal' | 'communication' | 'business' | 'court' | 'text_message';

/**
 * Analyzes ARIAS V BIANCHI company data using available storage data
 * and generates insights using OpenAI
 */
export async function analyzeAriasVBianchi(): Promise<AnalysisResult> {
  // 1. Gather data from storage
  const properties = await storage.getProperties();
  
  // Build structured data for analysis
  const companyData = {
    companyName: "ARIAS V BIANCHI LLC",
    properties: properties,
    propertyCount: properties.length,
    // We would include these in a real implementation
    // transactions: await storage.getTransactions(),
    // maintenanceRequests: await storage.getMaintenanceRequests(),
  };
  
  // 2. Use OpenAI to analyze the data
  try {
    const completion = await openai.chat.completions.create({
      messages: [
        { 
          role: "system", 
          content: "You are a property management analyst providing insights on real estate portfolios." 
        },
        { 
          role: "user", 
          content: `Analyze this property management company data and provide insights:
          
          ${JSON.stringify(companyData, null, 2)}
          
          Generate a comprehensive analysis including:
          1. Executive summary
          2. Key insights about the portfolio
          3. Actionable recommendations
          4. Performance metrics
          
          Format as a JSON with these fields:
          {
            "summary": "Executive summary of the analysis",
            "insights": ["Insight 1", "Insight 2", ...],
            "recommendations": ["Recommendation 1", "Recommendation 2", ...],
            "metrics": {
              "totalProperties": number,
              "totalTransactions": number,
              "rentalOccupancyRate": number,
              "averageMonthlyRevenue": number,
              "profitMargin": number
            }
          }`
        }
      ],
      model: "gpt-3.5-turbo",
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    console.log("Analysis completed successfully");
    return JSON.parse(completion.choices[0].message.content || '{}');
  } catch (error) {
    console.error("Error performing analysis:", error);
    // Return a basic result when API fails
    return {
      summary: "Unable to perform complete analysis at this time.",
      insights: ["Analysis service is temporarily unavailable."],
      recommendations: ["Please try again later."],
      metrics: {
        totalProperties: companyData.propertyCount,
        totalTransactions: 0,
        rentalOccupancyRate: 0,
        averageMonthlyRevenue: 0,
        profitMargin: 0
      }
    };
  }
}

/**
 * Performs a specialized analysis on a specific property
 */
export async function analyzeProperty(propertyId: number): Promise<any> {
  const property = await storage.getProperty(propertyId);
  
  if (!property) {
    throw new Error(`Property with ID ${propertyId} not found`);
  }
  
  // Add more analysis logic as needed
  
  return {
    propertyId,
    propertyName: property.name,
    analysisDate: new Date().toISOString(),
    status: "Analysis completed"
  };
}

/**
 * Analyzes legal documents related to ARIAS V BIANCHI
 * @param documentType Type of document to analyze
 * @param content The text content of the document
 */
export async function analyzeLegalDocument(
  documentType: DocumentType,
  content: string
): Promise<LegalDocumentAnalysisResult> {
  try {
    // Define the appropriate prompt based on document type
    let systemPrompt = "You are a legal analyst reviewing documents.";
    let userPrompt = `Analyze this ${documentType.replace('_', ' ')} document:
    
    ${content.substring(0, 15000)} // Truncate to avoid token limits
    
    Provide a complete analysis including:
    1. Document summary
    2. Key findings and implications
    3. Risk assessment
    4. Recommended next steps
    5. Relevant case precedents (if applicable)
    
    Format the response as JSON with the following structure:
    {
      "summary": "Document summary",
      "keyFindings": ["Finding 1", "Finding 2", ...],
      "riskAssessment": {
        "level": "low|medium|high",
        "factors": ["Factor 1", "Factor 2", ...]
      },
      "nextSteps": ["Step 1", "Step 2", ...],
      "relevantCases": ["Case 1", "Case 2", ...]
    }`;
    
    // Customize analysis based on document type
    switch(documentType) {
      case 'legal':
        systemPrompt = "You are an expert legal analyst specializing in property law and contracts.";
        break;
      case 'court':
        systemPrompt = "You are a litigation analyst specializing in court filings and proceedings.";
        break;
      case 'communication':
        systemPrompt = "You are a legal communications analyst specializing in analyzing business communications.";
        break;
      case 'text_message':
        systemPrompt = "You are a forensic communications analyst specializing in analyzing text message communications.";
        break;
      case 'business':
        systemPrompt = "You are a business analyst specializing in property management operations.";
        break;
    }

    // Call OpenAI for analysis
    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      model: "gpt-3.5-turbo",
      temperature: 0.2,
      response_format: { type: "json_object" }
    });
    
    console.log(`${documentType} document analysis completed`);
    return JSON.parse(completion.choices[0].message.content || '{}');
  } catch (error) {
    console.error(`Error analyzing ${documentType} document:`, error);
    return {
      summary: "Unable to complete document analysis at this time.",
      keyFindings: ["Analysis service encountered an error."],
      riskAssessment: {
        level: "medium",
        factors: ["Unable to complete risk assessment"]
      },
      nextSteps: ["Request manual review of document"],
      relevantCases: []
    };
  }
}

/**
 * Analyzes a text file from the file system
 * @param filePath Path to the document file
 * @param documentType Type of document
 */
export async function analyzeDocumentFile(
  filePath: string,
  documentType: DocumentType = 'legal'
): Promise<LegalDocumentAnalysisResult> {
  try {
    // Read the file content
    const content = fs.readFileSync(filePath, 'utf8');
    return await analyzeLegalDocument(documentType, content);
  } catch (error) {
    console.error(`Error analyzing document file at ${filePath}:`, error);
    throw new Error(`Failed to analyze document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Analyze all documents in a directory
 * @param directoryPath Path to directory containing documents
 */
export async function analyzeDocumentDirectory(
  directoryPath: string
): Promise<{
  overallSummary: string;
  documentResults: Record<string, LegalDocumentAnalysisResult>;
}> {
  const results: Record<string, LegalDocumentAnalysisResult> = {};
  let allDocuments: string[] = [];
  
  try {
    // Get all documents in directory
    const files = fs.readdirSync(directoryPath);
    
    for (const file of files) {
      if (file.endsWith('.txt') || file.endsWith('.md') || file.endsWith('.pdf')) {
        const filePath = path.join(directoryPath, file);
        
        // Determine document type based on filename
        let documentType: DocumentType = 'legal';
        if (file.includes('court') || file.includes('filing')) documentType = 'court';
        else if (file.includes('text') || file.includes('sms')) documentType = 'text_message';
        else if (file.includes('email') || file.includes('communication')) documentType = 'communication';
        else if (file.includes('business') || file.includes('operation')) documentType = 'business';
        
        // Analyze each document
        try {
          const result = await analyzeDocumentFile(filePath, documentType);
          results[file] = result;
          allDocuments.push(file);
        } catch (err) {
          console.error(`Failed to analyze ${file}:`, err);
          results[file] = {
            summary: `Error analyzing document: ${err instanceof Error ? err.message : 'Unknown error'}`,
            keyFindings: [],
            riskAssessment: {level: 'medium', factors: ['Analysis failed']},
            nextSteps: ['Manual review required'],
            relevantCases: []
          };
        }
      }
    }
    
    // Generate overall summary of all documents
    const overallSummary = await generateOverallSummary(results, allDocuments);
    
    return {
      overallSummary,
      documentResults: results
    };
  } catch (error) {
    console.error(`Error analyzing document directory at ${directoryPath}:`, error);
    throw new Error(`Failed to analyze document directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate an overall summary of multiple document analyses
 */
async function generateOverallSummary(
  results: Record<string, LegalDocumentAnalysisResult>,
  documentNames: string[]
): Promise<string> {
  try {
    // Create a condensed version of the results for the summary
    const condensedResults = documentNames.map(doc => ({
      document: doc,
      summary: results[doc].summary,
      keyFindings: results[doc].keyFindings.slice(0, 2), // Just take first 2 findings
      riskLevel: results[doc].riskAssessment.level
    }));
    
    const completion = await openai.chat.completions.create({
      messages: [
        { 
          role: "system", 
          content: "You are a legal portfolio analyst specializing in document summarization." 
        },
        { 
          role: "user", 
          content: `Generate an executive summary of these analyzed documents related to ARIAS V BIANCHI:
          
          ${JSON.stringify(condensedResults, null, 2)}
          
          Provide a comprehensive but concise overall analysis that summarizes key patterns, findings, and 
          important issues across these documents. Focus on the big picture.` 
        }
      ],
      model: "gpt-3.5-turbo",
      temperature: 0.3
    });
    
    return completion.choices[0].message.content || 'Unable to generate overall summary.';
  } catch (error) {
    console.error("Error generating overall summary:", error);
    return "Unable to generate an overall summary of the documents at this time.";
  }
}