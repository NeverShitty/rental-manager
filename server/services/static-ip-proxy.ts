/**
 * Static IP Proxy Service
 * 
 * This service provides a transparent proxy that routes API requests through a static IP address.
 * It's especially useful for APIs like Mercury Bank that require whitelisting IP addresses.
 * 
 * The proxy is automatically used by our connectors without requiring any configuration from the user.
 */

import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { createHmac } from 'crypto';
import { storage } from '../storage';

// Types for proxy configuration
interface ProxyConfig {
  proxyUrl: string;
  apiKey: string;
  secret: string;
  enabled: boolean;
  ipAddress?: string;
  lastChecked?: Date;
  status: 'inactive' | 'pending' | 'active';
}

// Default proxy configuration (can be overridden by environment variables)
const DEFAULT_PROXY_CONFIG: ProxyConfig = {
  proxyUrl: process.env.STATIC_IP_PROXY_URL || 'https://static-ip-proxy.replit.app',
  apiKey: process.env.STATIC_IP_PROXY_KEY || '',
  secret: process.env.STATIC_IP_PROXY_SECRET || '',
  enabled: false,
  status: 'inactive'
};

// In-memory cache for proxy configuration
let proxyConfig: ProxyConfig = { ...DEFAULT_PROXY_CONFIG };

/**
 * Initialize the static IP proxy service
 * Loads configuration from environment or database
 */
export async function initStaticIpProxy(): Promise<void> {
  try {
    // Try to load from database first
    const savedConfig = await storage.getStaticIpConfig();
    
    if (savedConfig) {
      proxyConfig = {
        ...DEFAULT_PROXY_CONFIG,
        ...savedConfig,
      };
    }
    
    // If enabled, verify the proxy is working
    if (proxyConfig.enabled) {
      await checkProxyStatus();
    }
    
    console.log(`Static IP Proxy initialized. Status: ${proxyConfig.status}`);
  } catch (error) {
    console.error('Failed to initialize static IP proxy:', error);
  }
}

/**
 * Enable the static IP proxy service
 * If not already configured, this will provision a new static IP
 */
export async function enableStaticIpProxy(): Promise<ProxyConfig> {
  try {
    // If already enabled and active, just return the current config
    if (proxyConfig.enabled && proxyConfig.status === 'active') {
      return proxyConfig;
    }
    
    // If we don't have API credentials, try to provision them
    if (!proxyConfig.apiKey || !proxyConfig.secret) {
      await provisionProxyCredentials();
    }
    
    // Set to enabled and pending status
    proxyConfig.enabled = true;
    proxyConfig.status = 'pending';
    
    // Save to database
    await storage.saveStaticIpConfig(proxyConfig);
    
    // Check status and get IP address
    await checkProxyStatus();
    
    return proxyConfig;
  } catch (error) {
    console.error('Failed to enable static IP proxy:', error);
    throw new Error(`Failed to enable static IP proxy: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Disable the static IP proxy service
 */
export async function disableStaticIpProxy(): Promise<ProxyConfig> {
  proxyConfig.enabled = false;
  proxyConfig.status = 'inactive';
  await storage.saveStaticIpConfig(proxyConfig);
  return proxyConfig;
}

/**
 * Get the current proxy configuration and status
 */
export async function getProxyStatus(): Promise<ProxyConfig> {
  // If we haven't checked the status in the last hour, check it now
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  if (proxyConfig.enabled && (!proxyConfig.lastChecked || proxyConfig.lastChecked < oneHourAgo)) {
    await checkProxyStatus();
  }
  
  return proxyConfig;
}

/**
 * Make a request through the static IP proxy
 * This is used by connectors to ensure all API requests use the same static IP
 */
export async function makeProxyRequest<T = any>(
  url: string, 
  options: AxiosRequestConfig = {}
): Promise<AxiosResponse<T>> {
  // If proxy is not enabled, make the request directly
  if (!proxyConfig.enabled || proxyConfig.status !== 'active') {
    return axios(url, options);
  }
  
  try {
    // Generate authorization signature
    const timestamp = Date.now().toString();
    const signature = createHmac('sha256', proxyConfig.secret)
      .update(`${timestamp}:${url}`)
      .digest('hex');
    
    // Create proxy request
    const proxyOptions: AxiosRequestConfig = {
      method: 'POST',
      url: `${proxyConfig.proxyUrl}/api/proxy`,
      headers: {
        'X-API-Key': proxyConfig.apiKey,
        'X-Timestamp': timestamp,
        'X-Signature': signature,
        'Content-Type': 'application/json'
      },
      data: {
        target: url,
        method: options.method || 'GET',
        headers: options.headers || {},
        data: options.data,
        params: options.params
      }
    };
    
    // Make the request through the proxy
    const response = await axios(proxyOptions);
    
    // Return the proxied response
    return {
      ...response,
      data: response.data.data,
      status: response.data.status,
      statusText: response.data.statusText,
      headers: response.data.headers
    };
  } catch (error) {
    console.error('Error making proxied request:', error);
    // If proxy fails, fall back to direct request
    return axios(url, options);
  }
}

// Private helper functions

/**
 * Check if the proxy service is active and get the current static IP
 */
async function checkProxyStatus(): Promise<void> {
  try {
    if (!proxyConfig.enabled) {
      proxyConfig.status = 'inactive';
      return;
    }
    
    // Generate authorization signature
    const timestamp = Date.now().toString();
    const signature = createHmac('sha256', proxyConfig.secret)
      .update(`${timestamp}:/api/status`)
      .digest('hex');
    
    // Make request to check status
    const response = await axios({
      method: 'GET',
      url: `${proxyConfig.proxyUrl}/api/status`,
      headers: {
        'X-API-Key': proxyConfig.apiKey,
        'X-Timestamp': timestamp,
        'X-Signature': signature
      }
    });
    
    // Update configuration
    if (response.data.success) {
      proxyConfig.ipAddress = response.data.ipAddress;
      proxyConfig.status = response.data.status;
      proxyConfig.lastChecked = new Date();
      
      // Save to database
      await storage.saveStaticIpConfig(proxyConfig);
    } else {
      console.error('Proxy status check failed:', response.data.message);
    }
  } catch (error) {
    console.error('Failed to check proxy status:', error);
    proxyConfig.status = 'inactive';
  }
}

/**
 * Provision new proxy API credentials
 * This is typically only done once during initial setup
 */
async function provisionProxyCredentials(): Promise<void> {
  try {
    // In a real implementation, this would make a request to a provisioning service
    // For this demo, we'll just use environment variables or defaults
    
    // If we have environment variables, use those
    if (process.env.STATIC_IP_PROXY_KEY && process.env.STATIC_IP_PROXY_SECRET) {
      proxyConfig.apiKey = process.env.STATIC_IP_PROXY_KEY;
      proxyConfig.secret = process.env.STATIC_IP_PROXY_SECRET;
      return;
    }
    
    // Otherwise, generate random credentials for demo purposes
    // In a real app, you would call an actual provisioning API
    proxyConfig.apiKey = `demo_${generateRandomString(24)}`;
    proxyConfig.secret = generateRandomString(32);
  } catch (error) {
    console.error('Failed to provision proxy credentials:', error);
    throw new Error('Failed to provision static IP proxy credentials');
  }
}

/**
 * Generate a random string for demo credentials
 */
function generateRandomString(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Initialize the service on module load
initStaticIpProxy().catch(console.error);