
import * as mailparser from 'mailparser';
import { storage } from '../storage';
import { TransactionCategory } from '@shared/schema';
import { openai } from './openai-client';

interface Receipt {
  id: string;
  amount: number;
  vendor: string;
  date: Date;
  category: string;
  imageUrl?: string;
  ocrText?: string;
  propertyId?: number;
}

// Helper function to process receipt images
async function processReceiptImage(attachment: any): Promise<string> {
  // In a real implementation, this would use OCR to extract text from images
  // For now, we'll return a mock result based on the attachment
  console.log('Processing receipt image:', attachment?.filename || 'unnamed attachment');
  
  // If we had a real OCR service, we would send the image to it here
  // Return the attachment content as text or a placeholder
  return attachment?.content?.toString() || 'Receipt content would be extracted here';
}

// Helper function to analyze receipt content using OpenAI
async function analyzeReceiptContent(text: string): Promise<Partial<Receipt>> {
  try {
    // Use OpenAI to extract structured data from the receipt text
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "user",
          content: `Extract the following information from this receipt: 
            - Vendor name
            - Amount (number)
            - Date (YYYY-MM-DD)
            - Category (one of: utilities, rent, maintenance, supplies, marketing, insurance, taxes, other)
            
            Receipt text:
            ${text}
            
            Return ONLY a JSON object with the extracted fields.`
        }
      ],
      model: "gpt-3.5-turbo",
      temperature: 0.2,
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0].message.content || '{}';
    console.log('Analyzed receipt content:', content);
    const result = JSON.parse(content);
    
    // Convert the date string to a Date object if it exists
    if (result.date && typeof result.date === 'string') {
      result.date = new Date(result.date);
    }
    
    return result;
  } catch (error) {
    console.error('Error analyzing receipt with OpenAI:', error);
    return {
      vendor: 'Unknown vendor',
      amount: 0,
      date: new Date(),
      category: TransactionCategory.OTHER
    };
  }
}

export async function processEmailReceipt(email: string, subject: string, attachments: any[]) {
  // Create a parser to parse the email
  const parser = new mailparser.SimpleParser();
  const receiptData: Receipt = {
    id: crypto.randomUUID(),
    amount: 0,
    vendor: '',
    date: new Date(),
    category: TransactionCategory.OTHER
  };

  // Extract receipt data using OCR and AI
  let ocrText = '';
  if (attachments && attachments.length > 0) {
    ocrText = await processReceiptImage(attachments[0]);
  } else {
    ocrText = email; // Use email body as fallback
  }
  
  const extractedData = await analyzeReceiptContent(ocrText);
  
  Object.assign(receiptData, extractedData);
  
  // For now, log the receipt data as we don't have a storeReceipt method
  console.log('Receipt data extracted:', receiptData);
  return receiptData;
}

interface ForwardingConfig {
  email: string;
  enabled: boolean;
}

let forwardingConfig: ForwardingConfig = {
  email: '',
  enabled: false
};

export async function setForwardingConfig(config: ForwardingConfig) {
  forwardingConfig = config;
  await storage.setExpenseForwardingConfig(config);
}

export async function getForwardingConfig(): Promise<ForwardingConfig> {
  const config = await storage.getExpenseForwardingConfig();
  return config || forwardingConfig;
}

export async function forwardToAccounting(receipt: Receipt) {
  if (!forwardingConfig.enabled || !forwardingConfig.email) {
    return false;
  }

  // Send to configured email - This would typically connect to a real email service
  console.log(`[Email would be sent]: To: ${forwardingConfig.email}, Subject: Receipt from ${receipt.vendor}`);
  // In a production environment, would connect to real email service
  
  return true;
}
