import { storage } from '../storage';
import { InsertOpenPhoneLine, InsertOpenPhoneContact, InsertOpenPhoneCall, InsertOpenPhoneMessage } from '@shared/schema';

const API_KEY = process.env.OPENPHONE_API_KEY;
const API_BASE = 'https://api.openphone.co/v2';

// OpenPhone API response interfaces
interface OpenPhonePhoneLineResponse {
  id: string;
  phone_number: string;
  name: string;
  user_id: string;
  active: boolean;
  last_updated: string;
}

interface OpenPhoneContactResponse {
  id: string;
  phone_number: string;
  name?: string;
  email?: string;
  notes?: string;
  tags?: string[];
  last_contacted_at?: string;
}

interface OpenPhoneCallResponse {
  id: string;
  phone_line_id: string;
  contact_id: string;
  direction: 'inbound' | 'outbound';
  status: 'completed' | 'missed' | 'voicemail' | 'rejected';
  duration: number;
  recording_url?: string;
  notes?: string;
  call_date: string;
}

interface OpenPhoneMessageResponse {
  id: string;
  phone_line_id: string;
  contact_id: string;
  direction: 'inbound' | 'outbound';
  content: string;
  media_urls?: string[];
  read: boolean;
  message_date: string;
}

// API request handler
async function openPhoneRequest(endpoint: string, options: RequestInit = {}) {
  if (!API_KEY) {
    throw new Error('OpenPhone API key not configured');
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenPhone API error (${response.status}): ${error}`);
  }

  return response.json();
}

// Get all phone lines
export async function getOpenPhoneLines(): Promise<OpenPhonePhoneLineResponse[]> {
  try {
    return await openPhoneRequest('/phone-lines');
  } catch (error) {
    console.error('Failed to fetch OpenPhone lines:', error);
    throw error;
  }
}

// Get contacts
export async function getOpenPhoneContacts(): Promise<OpenPhoneContactResponse[]> {
  try {
    return await openPhoneRequest('/contacts');
  } catch (error) {
    console.error('Failed to fetch OpenPhone contacts:', error);
    throw error;
  }
}

// Get calls for a phone line
export async function getOpenPhoneCalls(phoneLineId: string, startDate?: Date): Promise<OpenPhoneCallResponse[]> {
  try {
    const queryParams = new URLSearchParams();
    if (startDate) {
      queryParams.append('start_date', startDate.toISOString());
    }

    return await openPhoneRequest(`/phone-lines/${phoneLineId}/calls?${queryParams}`);
  } catch (error) {
    console.error('Failed to fetch OpenPhone calls:', error);
    throw error;
  }
}

// Get messages for a phone line
export async function getOpenPhoneMessages(phoneLineId: string, startDate?: Date): Promise<OpenPhoneMessageResponse[]> {
  try {
    const queryParams = new URLSearchParams();
    if (startDate) {
      queryParams.append('start_date', startDate.toISOString());
    }

    return await openPhoneRequest(`/phone-lines/${phoneLineId}/messages?${queryParams}`);
  } catch (error) {
    console.error('Failed to fetch OpenPhone messages:', error);
    throw error;
  }
}

// Send a new message
export async function sendOpenPhoneMessage(phoneLineId: string, to: string, content: string): Promise<OpenPhoneMessageResponse> {
  try {
    return await openPhoneRequest(`/phone-lines/${phoneLineId}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        to,
        content
      })
    });
  } catch (error) {
    console.error('Failed to send OpenPhone message:', error);
    throw error;
  }
}

// Make a new call
export async function makeOpenPhoneCall(phoneLineId: string, to: string): Promise<OpenPhoneCallResponse> {
  try {
    return await openPhoneRequest(`/phone-lines/${phoneLineId}/calls`, {
      method: 'POST',
      body: JSON.stringify({
        to
      })
    });
  } catch (error) {
    console.error('Failed to make OpenPhone call:', error);
    throw error;
  }
}

// Create a new contact
export async function createOpenPhoneContact(data: {
  phoneNumber: string;
  name?: string;
  email?: string;
  notes?: string;
  tags?: string[];
}): Promise<OpenPhoneContactResponse> {
  try {
    return await openPhoneRequest('/contacts', {
      method: 'POST',
      body: JSON.stringify({
        phone_number: data.phoneNumber,
        name: data.name,
        email: data.email,
        notes: data.notes,
        tags: data.tags
      })
    });
  } catch (error) {
    console.error('Failed to create OpenPhone contact:', error);
    throw error;
  }
}

// Sync all OpenPhone data with our database
export async function syncOpenPhoneData(): Promise<void> {
  try {
    // Get the last sync date
    const lastSync = await storage.getLastOpenPhoneSync();
    
    // Sync phone lines
    const phoneLines = await getOpenPhoneLines();
    
    for (const line of phoneLines) {
      // Find the assigned user by matching OpenPhone user_id to your system's user IDs
      // This is a simplification - you'd need to have mapped OpenPhone user IDs to your system
      const assignedUserId = 1; // Default to first user for demo
      
      await storage.createOrUpdateOpenPhoneLine({
        externalId: line.id,
        phoneNumber: line.phone_number,
        name: line.name,
        assignedTo: assignedUserId,
        isActive: line.active,
        lastSyncedAt: new Date(),
        createdAt: new Date()
      });
      
      // Get and sync contacts for this phone line
      const contacts = await getOpenPhoneContacts();
      
      for (const contact of contacts) {
        // Find associated property if possible
        // This is a simplification - you'd need logic to associate contacts with properties
        const propertyId = null;
        
        await storage.createOrUpdateOpenPhoneContact({
          externalId: contact.id,
          phoneNumber: contact.phone_number,
          name: contact.name || null,
          email: contact.email || null,
          propertyId,
          notes: contact.notes || null,
          tags: contact.tags || [],
          lastContactedAt: contact.last_contacted_at ? new Date(contact.last_contacted_at) : null,
          createdAt: new Date()
        });
      }
      
      // Now sync calls if we have a last sync date
      if (lastSync) {
        const phoneLine = await storage.getOpenPhoneLineByExternalId(line.id);
        
        if (phoneLine) {
          const calls = await getOpenPhoneCalls(line.id, lastSync);
          
          for (const call of calls) {
            // Find the contact in our database
            const contact = await storage.getOpenPhoneContactByExternalId(call.contact_id);
            
            if (contact) {
              await storage.createOpenPhoneCall({
                externalId: call.id,
                phoneLineId: phoneLine.id,
                contactId: contact.id,
                direction: call.direction,
                status: call.status,
                duration: call.duration,
                recordingUrl: call.recording_url || null,
                notes: call.notes || null,
                callDate: new Date(call.call_date),
                createdAt: new Date()
              });
            }
          }
          
          // Sync messages
          const messages = await getOpenPhoneMessages(line.id, lastSync);
          
          for (const message of messages) {
            // Find the contact in our database
            const contact = await storage.getOpenPhoneContactByExternalId(message.contact_id);
            
            if (contact) {
              await storage.createOpenPhoneMessage({
                externalId: message.id,
                phoneLineId: phoneLine.id,
                contactId: contact.id,
                direction: message.direction,
                content: message.content,
                mediaUrls: message.media_urls || [],
                isRead: message.read,
                messageDate: new Date(message.message_date),
                createdAt: new Date()
              });
            }
          }
        }
      }
    }
    
    console.log('OpenPhone data sync completed successfully');
  } catch (error) {
    console.error('Error syncing OpenPhone data:', error);
    throw error;
  }
}