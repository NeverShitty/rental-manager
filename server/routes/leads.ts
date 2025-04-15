
import { Router } from 'express';
import { createPropertyLead, updateApplicationStatus } from '../services/hubspot';
import { storage } from '../storage';

// Placeholder services for the future implementation
const signwellService = {
  createLeaseDocument: async (data: any) => {
    console.log('Creating lease document:', data);
    return { success: true, message: 'Lease document created successfully' };
  }
};

const chargeAutomationService = {
  setupRecurringPayment: async (data: any) => {
    console.log('Setting up recurring payment:', data);
    return { success: true, message: 'Recurring payment set up successfully' };
  }
};

const waveChitty = {
  getOrCreateWaveCustomer: async (data: any) => {
    console.log('Creating or getting Wave customer:', data);
    return { success: true, customerId: '12345', message: 'Customer created/retrieved successfully' };
  }
};

const router = Router();

// Handle new lead from any source
router.post('/capture', async (req, res) => {
  try {
    const { email, firstName, lastName, phone, propertyId, source } = req.body;
    
    const lead = await createPropertyLead({
      email,
      firstName,
      lastName,
      phone,
      propertyId,
      source: source as 'furnishedfinder' | 'zillow' | 'turbotenant' | 'openphone'
    });

    res.json({ success: true, data: lead });
  } catch (error) {
    console.error('Lead capture error:', error);
    res.status(500).json({ success: false, error: 'Failed to capture lead' });
  }
});

// Handle application status updates
router.post('/update-status', async (req, res) => {
  try {
    const { dealId, status, applicationData } = req.body;
    
    const updated = await updateApplicationStatus(dealId, status, applicationData);

    // If approved, trigger lease execution
    if (status === 'approved') {
      // Trigger lease signing
      await signwellService.createLeaseDocument({
        dealId,
        propertyId: applicationData.propertyId,
        tenantInfo: applicationData.tenantInfo
      });

      // Setup automatic payments
      await chargeAutomationService.setupRecurringPayment({
        dealId,
        amount: applicationData.rentAmount,
        startDate: applicationData.leaseStartDate,
        frequency: 'monthly'
      });

      // Create customer in Wave
      await waveChitty.getOrCreateWaveCustomer({
        name: `${applicationData.tenantInfo.firstName} ${applicationData.tenantInfo.lastName}`,
        email: applicationData.tenantInfo.email,
        address: applicationData.propertyAddress
      });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update status' });
  }
});

export default router;
