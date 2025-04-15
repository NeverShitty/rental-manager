import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MarkerType,
  Handle,
  Position,
  Edge,
  Connection,
  Node
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  PlayCircle, 
  PauseCircle, 
  Plus, 
  Settings, 
  Trash2, 
  RotateCw, 
  AlertCircle, 
  CheckCircle, 
  Database, 
  Calendar, 
  DollarSign,
  Home,
  MessageSquare,
  RefreshCw
} from 'lucide-react';

// Custom node types
const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  connector: ConnectorNode,
};

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'financial' | 'property' | 'tenant' | 'maintenance' | 'reporting';
  requiredConnectors: string[];
}

interface ConnectorInfo {
  id: string;
  name: string;
  description: string;
  isConnected: boolean;
}

interface WorkflowData {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  lastRun?: string;
  runCount: number;
  createdAt: string;
  updatedAt: string;
}

function TriggerNode({ data }: { data: any }) {
  return (
    <div className="p-3 rounded-md border bg-orange-50 border-orange-200 shadow-sm">
      <div className="flex items-center">
        <div className="bg-orange-500 rounded-full p-2 mr-2">
          {data.icon || <PlayCircle className="h-4 w-4 text-white" />}
        </div>
        <div>
          <div className="font-medium text-sm">{data.label}</div>
          <div className="text-xs text-muted-foreground">{data.description}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} id="out" className="w-2 h-2 bg-orange-500" />
    </div>
  );
}

function ActionNode({ data }: { data: any }) {
  return (
    <div className="p-3 rounded-md border bg-blue-50 border-blue-200 shadow-sm">
      <Handle type="target" position={Position.Top} id="in" className="w-2 h-2 bg-blue-500" />
      <div className="flex items-center">
        <div className="bg-blue-500 rounded-full p-2 mr-2">
          {data.icon || <Settings className="h-4 w-4 text-white" />}
        </div>
        <div>
          <div className="font-medium text-sm">{data.label}</div>
          <div className="text-xs text-muted-foreground">{data.description}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} id="out" className="w-2 h-2 bg-blue-500" />
    </div>
  );
}

function ConnectorNode({ data }: { data: any }) {
  return (
    <div className="p-3 rounded-md border bg-purple-50 border-purple-200 shadow-sm">
      <Handle type="target" position={Position.Top} id="in" className="w-2 h-2 bg-purple-500" />
      <div className="flex items-center">
        <div className="bg-purple-500 rounded-full p-2 mr-2">
          {data.icon || <Database className="h-4 w-4 text-white" />}
        </div>
        <div>
          <div className="font-medium text-sm">{data.label}</div>
          <div className="text-xs text-muted-foreground">{data.connectorType}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} id="out" className="w-2 h-2 bg-purple-500" />
    </div>
  );
}

function getCategoryIcon(category: string) {
  switch (category) {
    case 'financial':
      return <DollarSign className="h-4 w-4" />;
    case 'property':
      return <Home className="h-4 w-4" />;
    case 'tenant':
      return <MessageSquare className="h-4 w-4" />;
    case 'maintenance':
      return <RotateCw className="h-4 w-4" />;
    case 'reporting':
      return <Calendar className="h-4 w-4" />;
    default:
      return <Settings className="h-4 w-4" />;
  }
}

export function WorkflowBuilder() {
  const { toast } = useToast();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowData | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [newWorkflowDescription, setNewWorkflowDescription] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [nodeConfig, setNodeConfig] = useState<Record<string, any>>({});

  // Fetch workflow templates
  const { data: templates, isLoading: loadingTemplates } = useQuery({
    queryKey: ['/api/workflows/templates'],
    retry: 1,
  });

  // Fetch existing workflows
  const { data: workflows, isLoading: loadingWorkflows, refetch: refetchWorkflows } = useQuery({
    queryKey: ['/api/workflows'],
    retry: 1,
  });

  // Fetch available connectors
  const { data: connectors, isLoading: loadingConnectors } = useQuery({
    queryKey: ['/api/connectors/installed'],
    retry: 1,
  });

  // Create workflow
  const createWorkflow = useMutation({
    mutationFn: async ({ name, description, templateId }: { name: string; description: string; templateId: string }) => {
      return await apiRequest('/api/workflows', {
        method: 'POST',
        data: {
          name,
          description,
          templateId,
        },
      });
    },
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: 'Workflow created successfully',
      });
      setIsCreateDialogOpen(false);
      refetchWorkflows();
      setSelectedWorkflow(data);
      loadWorkflowNodes(data);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to create workflow: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Update workflow
  const updateWorkflow = useMutation({
    mutationFn: async ({ workflowId, updates }: { workflowId: string; updates: any }) => {
      return await apiRequest(`/api/workflows/${workflowId}`, {
        method: 'PATCH',
        data: updates,
      });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Workflow updated successfully',
      });
      refetchWorkflows();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to update workflow: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Delete workflow
  const deleteWorkflow = useMutation({
    mutationFn: async (workflowId: string) => {
      return await apiRequest(`/api/workflows/${workflowId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Workflow deleted successfully',
      });
      setSelectedWorkflow(null);
      setNodes([]);
      setEdges([]);
      refetchWorkflows();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to delete workflow: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Execute workflow
  const executeWorkflow = useMutation({
    mutationFn: async (workflowId: string) => {
      return await apiRequest(`/api/workflows/${workflowId}/execute`, {
        method: 'POST',
      });
    },
    onSuccess: (data) => {
      toast({
        title: 'Workflow Executed',
        description: data.message || 'Workflow executed successfully',
      });
      refetchWorkflows();
    },
    onError: (error: Error) => {
      toast({
        title: 'Execution Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Save node configuration
  const saveNodeConfig = useMutation({
    mutationFn: async ({ workflowId, nodeId, config }: { workflowId: string; nodeId: string; config: any }) => {
      return await apiRequest(`/api/workflows/${workflowId}/node/${nodeId}/config`, {
        method: 'POST',
        data: { config },
      });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Node configuration saved successfully',
      });
      setIsConfigDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to save node configuration: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Generate workflow nodes from template
  const loadWorkflowNodes = (workflow: WorkflowData) => {
    // In a real implementation, we would fetch the actual workflow structure
    // For demo purposes, we'll create some sample nodes
    
    const newNodes: Node[] = [
      {
        id: 'trigger-1',
        type: 'trigger',
        position: { x: 250, y: 50 },
        data: {
          label: 'When rent is collected',
          description: 'Triggered when rent payment is received',
          icon: <DollarSign className="h-4 w-4 text-white" />,
        },
      },
      {
        id: 'action-1',
        type: 'action',
        position: { x: 250, y: 200 },
        data: {
          label: 'Create accounting entry',
          description: 'Add transaction to Wave accounting',
          icon: <Database className="h-4 w-4 text-white" />,
        },
      },
      {
        id: 'connector-1',
        type: 'connector',
        position: { x: 250, y: 350 },
        data: {
          label: 'Wave Accounting',
          connectorType: 'Accounting System',
          icon: <Database className="h-4 w-4 text-white" />,
        },
      },
    ];

    const newEdges: Edge[] = [
      {
        id: 'edge-1',
        source: 'trigger-1',
        target: 'action-1',
        type: 'smoothstep',
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      },
      {
        id: 'edge-2',
        source: 'action-1',
        target: 'connector-1',
        type: 'smoothstep',
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      },
    ];

    setNodes(newNodes);
    setEdges(newEdges);
  };

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, type: 'smoothstep', animated: true, markerEnd: { type: MarkerType.ArrowClosed } }, eds)),
    [setEdges]
  );

  const handleCreateWorkflow = () => {
    if (!selectedTemplate) {
      toast({
        title: 'Select a template',
        description: 'Please select a workflow template',
        variant: 'destructive',
      });
      return;
    }

    createWorkflow.mutate({
      name: newWorkflowName,
      description: newWorkflowDescription,
      templateId: selectedTemplate,
    });
  };

  const handleNodeClick = (e: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setNodeConfig(node.data.config || {});
    setIsConfigDialogOpen(true);
  };

  const handleSaveNodeConfig = () => {
    if (!selectedWorkflow || !selectedNode) return;

    saveNodeConfig.mutate({
      workflowId: selectedWorkflow.id,
      nodeId: selectedNode.id,
      config: nodeConfig,
    });

    // Update the node in the current state
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNode.id) {
          return {
            ...node,
            data: {
              ...node.data,
              config: nodeConfig,
            },
          };
        }
        return node;
      })
    );
  };

  const handleToggleWorkflowStatus = (workflow: WorkflowData) => {
    updateWorkflow.mutate({
      workflowId: workflow.id,
      updates: {
        isActive: !workflow.isActive,
      },
    });
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Workflow Builder</h1>
          <p className="text-muted-foreground">
            Create automated workflows between your property management systems
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Workflow
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Workflow</DialogTitle>
              <DialogDescription>
                Start with a template or create a custom workflow
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="workflow-name">Workflow Name</Label>
                <Input
                  id="workflow-name"
                  placeholder="Enter workflow name"
                  value={newWorkflowName}
                  onChange={(e) => setNewWorkflowName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="workflow-description">Description (optional)</Label>
                <Input
                  id="workflow-description"
                  placeholder="Enter workflow description"
                  value={newWorkflowDescription}
                  onChange={(e) => setNewWorkflowDescription(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Start with a Template</Label>
                <ScrollArea className="h-60 rounded-md border p-2">
                  {loadingTemplates ? (
                    <div className="flex justify-center items-center h-32">
                      <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {templates?.map((template: WorkflowTemplate) => (
                        <div
                          key={template.id}
                          className={`p-3 rounded-md border cursor-pointer transition-colors ${
                            selectedTemplate === template.id
                              ? 'bg-primary/10 border-primary/30'
                              : 'hover:bg-muted'
                          }`}
                          onClick={() => setSelectedTemplate(template.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center">
                              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center mr-2">
                                {getCategoryIcon(template.category)}
                              </div>
                              <div>
                                <h4 className="font-medium text-sm">{template.name}</h4>
                                <p className="text-xs text-muted-foreground">
                                  {template.description}
                                </p>
                              </div>
                            </div>
                            <Badge variant="outline" className="capitalize">
                              {template.category}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateWorkflow}
                disabled={
                  createWorkflow.isPending ||
                  !newWorkflowName.trim() ||
                  !selectedTemplate
                }
              >
                {createWorkflow.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Workflow'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Workflows</CardTitle>
              <CardDescription>Your automation workflows</CardDescription>
            </CardHeader>
            <CardContent className="pb-2">
              {loadingWorkflows ? (
                <div className="flex justify-center items-center h-32">
                  <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : workflows?.length > 0 ? (
                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {workflows.map((workflow: WorkflowData) => (
                      <div
                        key={workflow.id}
                        className={`p-3 rounded-md border cursor-pointer transition-colors ${
                          selectedWorkflow?.id === workflow.id
                            ? 'bg-primary/10 border-primary/30'
                            : 'hover:bg-muted'
                        }`}
                        onClick={() => {
                          setSelectedWorkflow(workflow);
                          loadWorkflowNodes(workflow);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{workflow.name}</span>
                          {workflow.isActive ? (
                            <Badge className="bg-green-100 text-green-800">Active</Badge>
                          ) : (
                            <Badge variant="outline">Inactive</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{workflow.description}</p>
                        {workflow.lastRun && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Last run: {new Date(workflow.lastRun).toLocaleString()}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No workflows yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Create your first workflow to get started
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Connected Services</CardTitle>
              <CardDescription>Available for workflows</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingConnectors ? (
                <div className="flex justify-center items-center h-16">
                  <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                </div>
              ) : connectors?.length > 0 ? (
                <div className="space-y-2">
                  {connectors.map((connector: ConnectorInfo) => (
                    <div key={connector.id} className="flex items-center justify-between text-sm p-2 border-b last:border-0">
                      <span>{connector.name}</span>
                      {connector.isConnected ? (
                        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                          Connected
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
                          Disconnected
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground text-sm">No connectors installed</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="col-span-1 lg:col-span-3">
          {selectedWorkflow ? (
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-0">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{selectedWorkflow.name}</CardTitle>
                    <CardDescription>{selectedWorkflow.description}</CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => executeWorkflow.mutate(selectedWorkflow.id)}
                      disabled={executeWorkflow.isPending || !selectedWorkflow.isActive}
                    >
                      {executeWorkflow.isPending ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Running...
                        </>
                      ) : (
                        <>
                          <PlayCircle className="mr-2 h-4 w-4" />
                          Run Now
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedWorkflow.isActive ? 'outline' : 'default'}
                      onClick={() => handleToggleWorkflowStatus(selectedWorkflow)}
                      disabled={updateWorkflow.isPending}
                    >
                      {updateWorkflow.isPending ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : selectedWorkflow.isActive ? (
                        <>
                          <PauseCircle className="mr-2 h-4 w-4" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <PlayCircle className="mr-2 h-4 w-4" />
                          Activate
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteWorkflow.mutate(selectedWorkflow.id)}
                      disabled={deleteWorkflow.isPending}
                    >
                      {deleteWorkflow.isPending ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-grow pb-0">
                <div className="border rounded-md h-[600px] mt-4">
                  <ReactFlowProvider>
                    <ReactFlow
                      nodes={nodes}
                      edges={edges}
                      onNodesChange={onNodesChange}
                      onEdgesChange={onEdgesChange}
                      onConnect={onConnect}
                      nodeTypes={nodeTypes}
                      onNodeClick={handleNodeClick}
                      fitView
                    >
                      <Controls />
                      <Background color="#f8f9fa" gap={16} />
                    </ReactFlow>
                  </ReactFlowProvider>
                </div>
              </CardContent>
              <CardFooter className="mt-4">
                <div className="text-sm text-muted-foreground">
                  Click on nodes to configure their settings. Connect nodes by dragging from output handles to input handles.
                </div>
              </CardFooter>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center">
              <div className="text-center p-8">
                <h3 className="text-lg font-medium mb-2">No Workflow Selected</h3>
                <p className="text-muted-foreground mb-6">
                  Select a workflow from the sidebar or create a new one to get started
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Workflow
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Node Configuration Dialog */}
      <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configure {selectedNode?.data.label}</DialogTitle>
            <DialogDescription>
              Set up the configuration for this node
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {selectedNode?.type === 'trigger' && (
              <>
                <div className="space-y-2">
                  <Label>Trigger Type</Label>
                  <Select value={nodeConfig.triggerType || ''} onValueChange={(value) => setNodeConfig({ ...nodeConfig, triggerType: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select trigger type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="payment_received">Payment Received</SelectItem>
                      <SelectItem value="lease_signed">Lease Signed</SelectItem>
                      <SelectItem value="maintenance_requested">Maintenance Requested</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {nodeConfig.triggerType === 'scheduled' && (
                  <div className="space-y-2">
                    <Label>Schedule Frequency</Label>
                    <Select
                      value={nodeConfig.frequency || ''}
                      onValueChange={(value) => setNodeConfig({ ...nodeConfig, frequency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {nodeConfig.triggerType === 'payment_received' && (
                  <div className="space-y-2">
                    <Label>Minimum Amount</Label>
                    <div className="flex items-center">
                      <span className="mr-2">$</span>
                      <Input
                        type="number"
                        value={nodeConfig.minAmount || ''}
                        onChange={(e) => setNodeConfig({ ...nodeConfig, minAmount: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {selectedNode?.type === 'action' && (
              <>
                <div className="space-y-2">
                  <Label>Action Type</Label>
                  <Select
                    value={nodeConfig.actionType || ''}
                    onValueChange={(value) => setNodeConfig({ ...nodeConfig, actionType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select action type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="create_transaction">Create Transaction</SelectItem>
                      <SelectItem value="send_notification">Send Notification</SelectItem>
                      <SelectItem value="update_property">Update Property</SelectItem>
                      <SelectItem value="create_task">Create Task</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {nodeConfig.actionType === 'create_transaction' && (
                  <>
                    <div className="space-y-2">
                      <Label>Transaction Type</Label>
                      <Select
                        value={nodeConfig.transactionType || ''}
                        onValueChange={(value) => setNodeConfig({ ...nodeConfig, transactionType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select transaction type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="income">Income</SelectItem>
                          <SelectItem value="expense">Expense</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select
                        value={nodeConfig.category || ''}
                        onValueChange={(value) => setNodeConfig({ ...nodeConfig, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rent">Rent</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                          <SelectItem value="utilities">Utilities</SelectItem>
                          <SelectItem value="taxes">Taxes</SelectItem>
                          <SelectItem value="insurance">Insurance</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {nodeConfig.actionType === 'send_notification' && (
                  <>
                    <div className="space-y-2">
                      <Label>Notification Method</Label>
                      <Select
                        value={nodeConfig.notificationMethod || ''}
                        onValueChange={(value) => setNodeConfig({ ...nodeConfig, notificationMethod: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="sms">SMS</SelectItem>
                          <SelectItem value="app">App Notification</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Template</Label>
                      <Select
                        value={nodeConfig.template || ''}
                        onValueChange={(value) => setNodeConfig({ ...nodeConfig, template: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select template" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="payment_receipt">Payment Receipt</SelectItem>
                          <SelectItem value="maintenance_update">Maintenance Update</SelectItem>
                          <SelectItem value="lease_reminder">Lease Reminder</SelectItem>
                          <SelectItem value="custom">Custom Message</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </>
            )}

            {selectedNode?.type === 'connector' && (
              <>
                <div className="space-y-2">
                  <Label>Connector</Label>
                  <Select
                    value={nodeConfig.connector || ''}
                    onValueChange={(value) => setNodeConfig({ ...nodeConfig, connector: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select connector" />
                    </SelectTrigger>
                    <SelectContent>
                      {connectors?.map((connector: ConnectorInfo) => (
                        <SelectItem key={connector.id} value={connector.id} disabled={!connector.isConnected}>
                          {connector.name} {!connector.isConnected && '(Not Connected)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Action</Label>
                  <Select
                    value={nodeConfig.connectorAction || ''}
                    onValueChange={(value) => setNodeConfig({ ...nodeConfig, connectorAction: value })}
                    disabled={!nodeConfig.connector}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="createTransaction">Create Transaction</SelectItem>
                      <SelectItem value="getAccounts">Get Accounts</SelectItem>
                      <SelectItem value="getCustomers">Get Customers</SelectItem>
                      <SelectItem value="createCustomer">Create Customer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsConfigDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveNodeConfig}
              disabled={saveNodeConfig.isPending}
            >
              {saveNodeConfig.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Configuration'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}