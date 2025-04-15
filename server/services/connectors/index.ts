import { connectorRegistry } from '../connector-framework';
import { WaveConnector } from './wave-connector';
import { DoorLoopConnector } from './doorloop-connector';
import { MercuryConnector } from './mercury-connector';

/**
 * Initialize all connectors and register them with the registry
 * This function should be called when the application starts
 */
export function initializeConnectors(): void {
  // Register each connector with a unique ID
  connectorRegistry.registerConnector('wave', WaveConnector as any);
  connectorRegistry.registerConnector('doorloop', DoorLoopConnector as any);
  connectorRegistry.registerConnector('mercury', MercuryConnector as any);
  
  console.log(`Registered ${connectorRegistry.listConnectors().length} connectors`);
}

/**
 * Get an initialized connector instance with credentials
 * This is the main factory function to get connector instances for usage
 */
export async function getConnector(
  connectorId: string,
  credentials: Record<string, any>
): Promise<any | null> {
  const ConnectorClass = connectorRegistry.getConnector(connectorId);
  
  if (!ConnectorClass) {
    console.error(`Connector not found: ${connectorId}`);
    return null;
  }
  
  try {
    // Create a new instance of the connector
    const connector = new (ConnectorClass as any)();
    
    // Set credentials and connect
    await connector.setCredentials(credentials);
    const connected = await connector.connect();
    
    if (!connected) {
      console.error(`Failed to connect to ${connectorId}`);
      return null;
    }
    
    return connector;
  } catch (error) {
    console.error(`Error initializing connector ${connectorId}:`, error);
    return null;
  }
}

/**
 * Get all available connectors with their metadata
 * Used for displaying connector options in the UI
 */
export function getAvailableConnectors(): Array<{ id: string, name: string, description: string, affiliateEnabled: boolean }> {
  return connectorRegistry.listConnectors().map(({ id, config }) => ({
    id,
    name: config.name,
    description: config.description,
    affiliateEnabled: config.affiliateEnabled
  }));
}

/**
 * Get connector details including affiliate info
 * Used for displaying connector details and affiliate links
 */
export function getConnectorDetails(connectorId: string): any {
  const connectors = connectorRegistry.listConnectors();
  const connector = connectors.find(c => c.id === connectorId);
  
  if (!connector) {
    return null;
  }
  
  return {
    id: connector.id,
    name: connector.config.name,
    description: connector.config.description,
    author: connector.config.author,
    version: connector.config.version,
    website: connector.config.website,
    supportEmail: connector.config.supportEmail,
    pricing: connector.config.pricing,
    affiliateEnabled: connector.config.affiliateEnabled,
    affiliateConfig: connector.config.affiliateConfig,
    requiredCredentials: connector.config.requiredCredentials,
    actions: connector.config.actions,
    triggers: connector.config.triggers
  };
}

/**
 * Get connector signup URL with affiliate tracking
 * Used for generating affiliate links for the marketplace
 */
export function getConnectorSignupUrl(connectorId: string, userId?: string): string | null {
  const ConnectorClass = connectorRegistry.getConnector(connectorId);
  
  if (!ConnectorClass) {
    return null;
  }
  
  try {
    // Create a temporary instance to get the signup URL
    const tempConnector = new (ConnectorClass as any)();
    return tempConnector.getSignupUrl(userId);
  } catch (error) {
    console.error(`Error getting signup URL for ${connectorId}:`, error);
    return null;
  }
}