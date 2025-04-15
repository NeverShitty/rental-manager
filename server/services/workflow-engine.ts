import { BaseConnector, ConnectorRegistry, connectorRegistry, Workflow, WorkflowEngine, workflowEngine } from './connector-framework';

/**
 * WorkflowTemplate - Pre-configured workflow templates for common real estate operations
 */
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'financial' | 'property' | 'tenant' | 'maintenance' | 'reporting';
  requiredConnectors: string[];
  workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt' | 'runCount' | 'ownerId'>;
}

// Real estate specific workflow templates
export const workflowTemplates: WorkflowTemplate[] = [
  {
    id: 'rent-collection-to-accounting',
    name: 'Rent Collection to Accounting',
    description: 'When rent is collected in DoorLoop, create a matching transaction in Wave',
    category: 'financial',
    requiredConnectors: ['doorloop', 'wave'],
    workflow: {
      name: 'Rent Collection to Accounting',
      description: 'Automatically create Wave transactions when rent is collected in DoorLoop',
      isActive: true,
      trigger: {
        connectorId: 'doorloop',
        event: 'paymentReceived',
        config: {
          transactionType: 'rent'
        }
      },
      actions: [
        {
          connectorId: 'wave',
          action: 'createTransaction',
          config: {
            mapFields: {
              description: "{{doorloop.description}}",
              amount: "{{doorloop.amount}}",
              date: "{{doorloop.date}}",
              category: "rent"
            }
          },
          order: 1
        }
      ],
      lastRun: undefined
    }
  },
  {
    id: 'bank-transaction-categorization',
    name: 'Bank Transaction Categorization',
    description: 'Automatically categorize Mercury bank transactions using AI',
    category: 'financial',
    requiredConnectors: ['mercury'],
    workflow: {
      name: 'Bank Transaction Categorization',
      description: 'Categorize new Mercury transactions using AI analysis',
      isActive: true,
      trigger: {
        connectorId: 'mercury',
        event: 'newTransaction',
        config: {
          minAmount: 0
        }
      },
      actions: [
        {
          connectorId: 'mercury',
          action: 'categorizeTransactions',
          config: {
            useAI: true,
            confidence: 0.7
          },
          order: 1
        }
      ],
      lastRun: undefined
    }
  },
  {
    id: 'maintenance-expense-tracking',
    name: 'Maintenance Expense Tracking',
    description: 'Track maintenance expenses by linking DoorLoop requests with bank transactions',
    category: 'maintenance',
    requiredConnectors: ['doorloop', 'mercury'],
    workflow: {
      name: 'Maintenance Expense Tracking',
      description: 'Link maintenance requests with corresponding bank transactions',
      isActive: true,
      trigger: {
        connectorId: 'doorloop',
        event: 'maintenanceRequest',
        config: {
          status: 'completed'
        }
      },
      actions: [
        {
          connectorId: 'mercury',
          action: 'getTransactions',
          config: {
            dateRange: {
              startDays: -10,
              endDays: 10
            },
            filter: {
              type: 'debit',
              category: 'maintenance'
            }
          },
          order: 1
        }
      ],
      lastRun: undefined
    }
  },
  {
    id: 'property-financial-report',
    name: 'Property Financial Report',
    description: 'Generate monthly financial reports for each property',
    category: 'reporting',
    requiredConnectors: ['doorloop', 'wave'],
    workflow: {
      name: 'Property Financial Report',
      description: 'Create detailed monthly financial reports for each property',
      isActive: true,
      trigger: {
        connectorId: 'system',
        event: 'schedule',
        config: {
          frequency: 'monthly',
          day: 1,
          time: '08:00'
        }
      },
      actions: [
        {
          connectorId: 'doorloop',
          action: 'getProperties',
          config: {},
          order: 1
        },
        {
          connectorId: 'wave',
          action: 'generateReport',
          config: {
            reportType: 'property_performance',
            period: 'previous_month',
            format: 'pdf',
            sendEmail: true
          },
          order: 2
        }
      ],
      lastRun: undefined
    }
  },
  {
    id: 'lease-renewal-alert',
    name: 'Lease Renewal Alert',
    description: 'Alert property managers about upcoming lease renewals',
    category: 'tenant',
    requiredConnectors: ['doorloop'],
    workflow: {
      name: 'Lease Renewal Alert',
      description: 'Send notifications when leases are approaching renewal dates',
      isActive: true,
      trigger: {
        connectorId: 'system',
        event: 'schedule',
        config: {
          frequency: 'daily',
          time: '09:00'
        }
      },
      actions: [
        {
          connectorId: 'doorloop',
          action: 'getTenants',
          config: {
            filter: {
              leaseEndingSoon: true,
              daysThreshold: 60
            }
          },
          order: 1
        },
        {
          connectorId: 'system',
          action: 'sendNotification',
          config: {
            notificationType: 'email',
            template: 'lease_renewal',
            recipients: ['{{user.email}}']
          },
          order: 2
        }
      ],
      lastRun: undefined
    }
  }
];

/**
 * Create a workflow from a template for a specific user
 */
export async function createWorkflowFromTemplate(
  templateId: string,
  ownerId: number,
  customConfig?: Record<string, any>
): Promise<{ success: boolean; workflowId?: string; error?: string }> {
  // Find the template
  const template = workflowTemplates.find(t => t.id === templateId);
  
  if (!template) {
    return { success: false, error: 'Workflow template not found' };
  }
  
  try {
    // Create a new workflow from the template
    const workflow: Workflow = {
      id: `wf_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: template.workflow.name,
      description: template.workflow.description,
      isActive: false, // Start inactive until configured
      trigger: { ...template.workflow.trigger },
      actions: [...template.workflow.actions],
      createdAt: new Date(),
      updatedAt: new Date(),
      runCount: 0,
      ownerId
    };
    
    // Apply custom configurations if provided
    if (customConfig) {
      // Override trigger config
      if (customConfig.trigger) {
        workflow.trigger.config = {
          ...workflow.trigger.config,
          ...customConfig.trigger
        };
      }
      
      // Override action configs
      if (customConfig.actions) {
        for (const actionConfig of customConfig.actions) {
          const actionIndex = workflow.actions.findIndex(a => 
            a.connectorId === actionConfig.connectorId && 
            a.action === actionConfig.action
          );
          
          if (actionIndex >= 0) {
            workflow.actions[actionIndex].config = {
              ...workflow.actions[actionIndex].config,
              ...actionConfig.config
            };
          }
        }
      }
    }
    
    // Register the workflow with the workflow engine
    workflowEngine.registerWorkflow(workflow);
    
    return { success: true, workflowId: workflow.id };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create workflow'
    };
  }
}

/**
 * Get all available workflow templates, optionally filtered by required connectors
 */
export function getWorkflowTemplates(connectorIds?: string[]): WorkflowTemplate[] {
  if (!connectorIds || connectorIds.length === 0) {
    return workflowTemplates;
  }
  
  // Filter templates that only require the connectors the user has
  return workflowTemplates.filter(template => 
    template.requiredConnectors.every(connectorId => 
      connectorIds.includes(connectorId)
    )
  );
}

/**
 * Execute a workflow manually with optional trigger data
 */
export async function executeWorkflow(
  workflowId: string, 
  triggerData?: Record<string, any>
): Promise<{ success: boolean; message?: string }> {
  return await workflowEngine.executeWorkflow(workflowId, triggerData);
}

/**
 * Activate or deactivate a workflow
 */
export function setWorkflowStatus(
  workflowId: string, 
  isActive: boolean
): { success: boolean; message?: string } {
  const workflow = workflowEngine.getWorkflow(workflowId);
  
  if (!workflow) {
    return { success: false, message: 'Workflow not found' };
  }
  
  workflow.isActive = isActive;
  workflow.updatedAt = new Date();
  
  return { 
    success: true, 
    message: `Workflow ${isActive ? 'activated' : 'deactivated'} successfully`
  };
}

/**
 * Update a workflow configuration
 */
export function updateWorkflow(
  workflowId: string,
  updates: Partial<Workflow>
): { success: boolean; message?: string } {
  const workflow = workflowEngine.getWorkflow(workflowId);
  
  if (!workflow) {
    return { success: false, message: 'Workflow not found' };
  }
  
  // Apply updates (except for id and creation date)
  const { id, createdAt, ...allowedUpdates } = updates as any;
  
  Object.assign(workflow, allowedUpdates);
  workflow.updatedAt = new Date();
  
  return { success: true, message: 'Workflow updated successfully' };
}

/**
 * Delete a workflow
 */
export function deleteWorkflow(workflowId: string): { success: boolean; message?: string } {
  const removed = workflowEngine.removeWorkflow(workflowId);
  
  if (!removed) {
    return { success: false, message: 'Workflow not found or could not be removed' };
  }
  
  return { success: true, message: 'Workflow deleted successfully' };
}

/**
 * Get all workflows for a user
 */
export function getUserWorkflows(userId: number): Workflow[] {
  return workflowEngine.listWorkflows(userId);
}