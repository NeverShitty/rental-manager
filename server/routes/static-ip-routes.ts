import { Router, Request, Response } from 'express';
import { getProxyStatus, enableStaticIpProxy, disableStaticIpProxy } from '../services/static-ip-proxy';

const router = Router();

/**
 * GET /api/static-ip/status
 * Get the current status of the static IP proxy
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = await getProxyStatus();
    
    res.json({
      success: true,
      isEnabled: status.enabled,
      ipAddress: status.ipAddress,
      status: status.status,
    });
  } catch (error) {
    console.error('Error getting static IP status:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get static IP status'
    });
  }
});

/**
 * POST /api/static-ip/enable
 * Enable the static IP proxy
 */
router.post('/enable', async (req: Request, res: Response) => {
  try {
    const status = await enableStaticIpProxy();
    
    res.json({
      success: true,
      isEnabled: status.enabled,
      ipAddress: status.ipAddress,
      status: status.status,
      message: 'Static IP proxy is being configured. This may take a few minutes.'
    });
  } catch (error) {
    console.error('Error enabling static IP:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to enable static IP'
    });
  }
});

/**
 * POST /api/static-ip/disable
 * Disable the static IP proxy
 */
router.post('/disable', async (req: Request, res: Response) => {
  try {
    const status = await disableStaticIpProxy();
    
    res.json({
      success: true,
      isEnabled: status.enabled,
      status: status.status,
      message: 'Static IP proxy disabled successfully'
    });
  } catch (error) {
    console.error('Error disabling static IP:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to disable static IP'
    });
  }
});

export default router;