import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

// Define interface for Google Drive integration options
interface GoogleDriveOptions {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  folderId?: string; // Optional folder ID to store documents
}

/**
 * Google Drive integration for document storage and retrieval
 */
export class GoogleDriveService {
  private drive: any;
  private folderId: string | null;
  private initialized: boolean = false;

  constructor(options?: GoogleDriveOptions) {
    this.folderId = options?.folderId || null;
    
    if (options?.clientId && options?.clientSecret && options?.refreshToken) {
      this.initialize(options);
    }
  }

  /**
   * Initialize the Google Drive integration with credentials
   */
  public initialize(options: GoogleDriveOptions): void {
    try {
      const oauth2Client = new google.auth.OAuth2(
        options.clientId,
        options.clientSecret
      );

      oauth2Client.setCredentials({
        refresh_token: options.refreshToken
      });

      this.drive = google.drive({
        version: 'v3',
        auth: oauth2Client
      });

      this.folderId = options.folderId || null;
      this.initialized = true;
      
      console.log('Google Drive integration initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Google Drive integration:', error);
      this.initialized = false;
    }
  }

  /**
   * Check if Google Drive integration is initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Create a new folder in Google Drive
   * @param folderName Name of the folder to create
   * @param parentFolderId Optional parent folder ID
   * @returns Folder ID of the created folder
   */
  public async createFolder(folderName: string, parentFolderId?: string): Promise<string> {
    if (!this.initialized) {
      throw new Error('Google Drive integration not initialized');
    }

    try {
      const folderMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentFolderId ? [parentFolderId] : undefined
      };

      const response = await this.drive.files.create({
        resource: folderMetadata,
        fields: 'id'
      });

      return response.data.id;
    } catch (error) {
      console.error('Error creating folder in Google Drive:', error);
      throw error;
    }
  }

  /**
   * Upload a file to Google Drive
   * @param filePath Local path to the file
   * @param fileName Name to give the file in Google Drive
   * @param folderId Optional folder ID to upload to
   * @returns File ID of the uploaded file
   */
  public async uploadFile(filePath: string, fileName: string, folderId?: string): Promise<string> {
    if (!this.initialized) {
      throw new Error('Google Drive integration not initialized');
    }

    try {
      const targetFolderId = folderId || this.folderId;
      
      const fileMetadata = {
        name: fileName,
        parents: targetFolderId ? [targetFolderId] : undefined
      };

      const media = {
        mimeType: this.getMimeType(filePath),
        body: fs.createReadStream(filePath)
      };

      const response = await this.drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id'
      });

      return response.data.id;
    } catch (error) {
      console.error('Error uploading file to Google Drive:', error);
      throw error;
    }
  }

  /**
   * Upload text content directly to Google Drive
   * @param content Text content to upload
   * @param fileName Name to give the file in Google Drive
   * @param folderId Optional folder ID to upload to
   * @returns File ID of the uploaded file
   */
  public async uploadTextContent(content: string, fileName: string, folderId?: string): Promise<string> {
    if (!this.initialized) {
      throw new Error('Google Drive integration not initialized');
    }

    try {
      // Create a temporary file
      const tempFilePath = path.join(__dirname, `../../temp/${Date.now()}-${fileName}`);
      const tempDir = path.dirname(tempFilePath);
      
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      fs.writeFileSync(tempFilePath, content);

      // Upload the file
      const fileId = await this.uploadFile(tempFilePath, fileName, folderId);

      // Delete the temporary file
      fs.unlinkSync(tempFilePath);

      return fileId;
    } catch (error) {
      console.error('Error uploading text content to Google Drive:', error);
      throw error;
    }
  }

  /**
   * Download a file from Google Drive
   * @param fileId ID of the file to download
   * @param destinationPath Local path to save the file
   * @returns Path to the downloaded file
   */
  public async downloadFile(fileId: string, destinationPath: string): Promise<string> {
    if (!this.initialized) {
      throw new Error('Google Drive integration not initialized');
    }

    try {
      const destDir = path.dirname(destinationPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      const dest = fs.createWriteStream(destinationPath);
      
      const response = await this.drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'stream' }
      );

      return new Promise((resolve, reject) => {
        response.data
          .on('end', () => {
            resolve(destinationPath);
          })
          .on('error', (err: any) => {
            reject(err);
          })
          .pipe(dest);
      });
    } catch (error) {
      console.error('Error downloading file from Google Drive:', error);
      throw error;
    }
  }

  /**
   * Get file content as text from Google Drive
   * @param fileId ID of the file to download
   * @returns Text content of the file
   */
  public async getFileContent(fileId: string): Promise<string> {
    if (!this.initialized) {
      throw new Error('Google Drive integration not initialized');
    }

    try {
      const response = await this.drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'text' }
      );

      return response.data;
    } catch (error) {
      console.error('Error getting file content from Google Drive:', error);
      throw error;
    }
  }

  /**
   * List files in a folder
   * @param folderId ID of the folder to list files from
   * @returns List of files in the folder
   */
  public async listFiles(folderId?: string): Promise<any[]> {
    if (!this.initialized) {
      throw new Error('Google Drive integration not initialized');
    }

    try {
      const targetFolderId = folderId || this.folderId;
      
      if (!targetFolderId) {
        throw new Error('No folder ID specified');
      }

      const response = await this.drive.files.list({
        q: `'${targetFolderId}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType, createdTime, modifiedTime, size)'
      });

      return response.data.files;
    } catch (error) {
      console.error('Error listing files from Google Drive:', error);
      throw error;
    }
  }

  /**
   * Search for files in Google Drive
   * @param query Query string to search for
   * @returns List of files matching the query
   */
  public async searchFiles(query: string): Promise<any[]> {
    if (!this.initialized) {
      throw new Error('Google Drive integration not initialized');
    }

    try {
      const response = await this.drive.files.list({
        q: `name contains '${query}' and trashed = false`,
        fields: 'files(id, name, mimeType, createdTime, modifiedTime, size)'
      });

      return response.data.files;
    } catch (error) {
      console.error('Error searching files in Google Drive:', error);
      throw error;
    }
  }

  /**
   * Delete a file from Google Drive
   * @param fileId ID of the file to delete
   */
  public async deleteFile(fileId: string): Promise<void> {
    if (!this.initialized) {
      throw new Error('Google Drive integration not initialized');
    }

    try {
      await this.drive.files.delete({
        fileId
      });
    } catch (error) {
      console.error('Error deleting file from Google Drive:', error);
      throw error;
    }
  }

  /**
   * Determine MIME type based on file extension
   * @param filePath Path to the file
   * @returns MIME type of the file
   */
  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png'
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }
}

// Create a singleton instance for use throughout the application
export const googleDriveService = new GoogleDriveService();

// Initialize with environment variables if available
if (
  process.env.GOOGLE_DRIVE_CLIENT_ID && 
  process.env.GOOGLE_DRIVE_CLIENT_SECRET && 
  process.env.GOOGLE_DRIVE_REFRESH_TOKEN
) {
  googleDriveService.initialize({
    clientId: process.env.GOOGLE_DRIVE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_DRIVE_CLIENT_SECRET,
    refreshToken: process.env.GOOGLE_DRIVE_REFRESH_TOKEN,
    folderId: process.env.GOOGLE_DRIVE_FOLDER_ID
  });
}