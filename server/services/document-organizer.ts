
import { Client } from '@replit/object-storage';
import { analyzeLegalDocument } from './analysis';

interface OrganizedDocument {
  fileName: string;
  originalPath: string;
  newPath: string;
  category: string;
  analysisResult?: any;
}

export class DocumentOrganizer {
  private objectStorage: Client;
  
  constructor() {
    this.objectStorage = new Client();
  }

  async organizeDocuments(): Promise<OrganizedDocument[]> {
    const organizedDocs: OrganizedDocument[] = [];
    const files = await this.objectStorage.list();
    
    if (!files.ok) {
      throw new Error('Failed to list files');
    }

    for (const file of files.value) {
      const category = this.categorizeDocument(file.name);
      const newPath = this.generateLegalPath(file.name, category);
      
      // Download file content
      const content = await this.objectStorage.downloadAsText(file.name);
      if (!content.ok) continue;

      // Upload to new path
      await this.objectStorage.uploadFromText(newPath, content.value);
      
      // Delete old file
      await this.objectStorage.delete(file.name);

      // Add to organized list
      organizedDocs.push({
        fileName: file.name,
        originalPath: file.name,
        newPath,
        category
      });
    }

    return organizedDocs;
  }

  private categorizeDocument(fileName: string): string {
    const lowerName = fileName.toLowerCase();
    if (lowerName.includes('legal') || lowerName.includes('court')) return 'legal';
    if (lowerName.includes('communication')) return 'communication';
    if (lowerName.includes('financial')) return 'financial';
    return 'general';
  }

  private generateLegalPath(fileName: string, category: string): string {
    const date = new Date().toISOString().split('T')[0];
    const sanitizedName = fileName
      .replace(/[^a-zA-Z0-9-_.]/g, '_')
      .toLowerCase();

    return `ARIAS_V_BIANCHI/${category}/${date}/${sanitizedName}`;
  }

  async listOrganizedFiles(): Promise<{path: string, category: string}[]> {
    const files = await this.objectStorage.list();
    if (!files.ok) {
      throw new Error('Failed to list files');
    }
    
    return files.value
      .filter(file => file.name.startsWith('ARIAS_V_BIANCHI/'))
      .map(file => {
        const parts = file.name.split('/');
        return {
          path: file.name,
          category: parts[1] || 'unknown'
        };
      });
  }
}
