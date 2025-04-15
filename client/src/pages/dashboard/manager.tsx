import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bar, Pie, Line } from 'recharts';
import { CalendarDays, DollarSign, Home, Users, BarChart2, FileText, Bell, ArrowUpRight } from 'lucide-react';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

export default function ManagerDashboard() {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState('overview');
  
  // Fetch properties data
  const { data: properties = [], isLoading: propertiesLoading } = useQuery({
    queryKey: ['/api/properties'],
  });
  
  // Fetch tenants data
  const { data: tenants = [], isLoading: tenantsLoading } = useQuery({
    queryKey: ['/api/tenants'],
  });
  
  // Fetch maintenance requests
  const { data: maintenanceRequests = [], isLoading: maintenanceLoading } = useQuery({
    queryKey: ['/api/maintenance'],
  });
  
  // Fetch financial data from Wave
  const { data: financialData, isLoading: financialLoading } = useQuery({
    queryKey: ['/api/wave/dashboard-summary'],
    enabled: false, // Will enable this once the API is fully set up
  });
  
  // Sync data from DoorLoop
  const handleSyncDoorloop = async () => {
    try {
      const response = await fetch('/api/doorloop/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Sync Successful",
          description: "DoorLoop data has been synchronized.",
        });
      } else {
        toast({
          title: "Sync Failed",
          description: result.message || "Failed to sync DoorLoop data.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error syncing DoorLoop data:', error);
      toast({
        title: "Sync Error",
        description: "An error occurred while syncing DoorLoop data.",
        variant: "destructive",
      });
    }
  };
  
  // Sync data from Wave
  const handleSyncWave = async () => {
    try {
      toast({
        title: "Syncing Wave Data",
        description: "Starting Wave data synchronization...",
      });
      
      // Implementation will be added when Wave API is ready
    } catch (error) {
      console.error('Error syncing Wave data:', error);
      toast({
        title: "Sync Error",
        description: "An error occurred while syncing Wave data.",
        variant: "destructive",
      });
    }
  };
  
  // Calculate summary statistics
  const totalProperties = properties.length;
  const occupiedUnits = tenants.filter(tenant => tenant.status === 'active').length;
  const occupancyRate = totalProperties > 0 ? Math.round((occupiedUnits / totalProperties) * 100) : 0;
  const openMaintenanceRequests = maintenanceRequests.filter(req => req.status === 'open').length;
  
  // Dummy financial data (will be replaced with actual data from Wave)
  const dummyFinancialData = {
    monthlyRevenue: 42500,
    outstandingPayments: 3850,
    projectedIncome: 45000,
    expensesByCategory: [
      { name: "Maintenance", value: 7500 },
      { name: "Utilities", value: 3200 },
      { name: "Insurance", value: 2100 },
      { name: "Property Management", value: 4250 },
      { name: "Taxes", value: 6300 }
    ]
  };
  
  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Property Manager Dashboard</h1>
        <div className="flex space-x-2">
          <Button onClick={handleSyncDoorloop} variant="outline" size="sm">
            Sync DoorLoop Data
          </Button>
          <Button onClick={handleSyncWave} variant="outline" size="sm">
            Sync Wave Data
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="overview" className="space-y-6" onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="properties">Properties</TabsTrigger>
          <TabsTrigger value="tenants">Tenants</TabsTrigger>
          <TabsTrigger value="financials">Financials</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Properties */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
                <Home className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalProperties}</div>
                <p className="text-xs text-muted-foreground">
                  {occupancyRate}% Occupied
                </p>
              </CardContent>
            </Card>
            
            {/* Active Tenants */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Active Tenants</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{occupiedUnits}</div>
                <p className="text-xs text-muted-foreground">
                  {tenants.length - occupiedUnits} Inactive
                </p>
              </CardContent>
            </Card>
            
            {/* Monthly Revenue */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${dummyFinancialData.monthlyRevenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  ${dummyFinancialData.outstandingPayments.toLocaleString()} outstanding
                </p>
              </CardContent>
            </Card>
            
            {/* Maintenance Requests */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Maintenance Requests</CardTitle>
                <Bell className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{openMaintenanceRequests}</div>
                <p className="text-xs text-muted-foreground">
                  {maintenanceRequests.length - openMaintenanceRequests} Resolved
                </p>
              </CardContent>
            </Card>
          </div>
          
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest updates across your properties</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {maintenanceRequests.slice(0, 5).map((request, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <Badge variant={request.status === 'open' ? 'destructive' : 'outline'} className="mt-0.5">
                      {request.status}
                    </Badge>
                    <div>
                      <p className="font-medium">{request.title}</p>
                      <p className="text-sm text-muted-foreground">{request.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(request.createdAt).toLocaleDateString()} - Property #{request.propertyId}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="properties" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Properties Overview</CardTitle>
              <CardDescription>All properties under management</CardDescription>
            </CardHeader>
            <CardContent>
              {propertiesLoading ? (
                <p>Loading properties data...</p>
              ) : (
                <div className="space-y-4">
                  {properties.map((property, index) => (
                    <div key={index} className="flex items-center justify-between border-b pb-3">
                      <div>
                        <p className="font-medium">{property.name || property.address}</p>
                        <p className="text-sm text-muted-foreground">{property.address}</p>
                        <div className="flex items-center mt-1">
                          <Badge variant="outline" className="mr-2">
                            {property.units || 1} {property.units === 1 ? 'Unit' : 'Units'}
                          </Badge>
                          {property.status && (
                            <Badge variant={property.status === 'active' ? 'default' : 'secondary'}>
                              {property.status}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        View Details
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="tenants" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tenant Management</CardTitle>
              <CardDescription>Overview of current and prospective tenants</CardDescription>
            </CardHeader>
            <CardContent>
              {tenantsLoading ? (
                <p>Loading tenant data...</p>
              ) : (
                <div className="space-y-4">
                  {tenants.map((tenant, index) => (
                    <div key={index} className="flex items-center justify-between border-b pb-3">
                      <div>
                        <p className="font-medium">{tenant.firstName} {tenant.lastName}</p>
                        <p className="text-sm">{tenant.email}</p>
                        <p className="text-sm text-muted-foreground">
                          {tenant.propertyId ? `Property #${tenant.propertyId}` : 'No property assigned'}
                        </p>
                        <div className="flex items-center mt-1">
                          <Badge variant={tenant.status === 'active' ? 'default' : 'secondary'} className="mr-2">
                            {tenant.status}
                          </Badge>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        View Details
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="financials" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Financial Overview</CardTitle>
                <CardDescription>Current financial status from Wave</CardDescription>
              </CardHeader>
              <CardContent>
                {financialLoading ? (
                  <p>Loading financial data...</p>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Monthly Revenue</p>
                        <p className="text-2xl font-bold">${dummyFinancialData.monthlyRevenue.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Outstanding Payments</p>
                        <p className="text-2xl font-bold">${dummyFinancialData.outstandingPayments.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Projected Income (30 days)</p>
                        <p className="text-2xl font-bold">${dummyFinancialData.projectedIncome.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Collection Rate</p>
                        <p className="text-2xl font-bold">
                          {Math.round(100 - (dummyFinancialData.outstandingPayments / dummyFinancialData.monthlyRevenue * 100))}%
                        </p>
                      </div>
                    </div>
                    
                    <div className="pt-4">
                      <h4 className="text-sm font-medium mb-3">Recent Transactions</h4>
                      <div className="space-y-2">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div key={i} className="flex justify-between items-center border-b pb-2">
                            <div>
                              <p className="font-medium">Rent Payment - Unit {100 + i}</p>
                              <p className="text-sm text-muted-foreground">Apr {i + 10}, 2025</p>
                            </div>
                            <p className="font-medium text-green-600">+$1,{500 + i * 100}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Expense Breakdown</CardTitle>
                <CardDescription>Monthly expenses by category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dummyFinancialData.expensesByCategory.map((category, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full bg-primary mr-2 opacity-${(index + 5) * 10}`}></div>
                        <span>{category.name}</span>
                      </div>
                      <span>${category.value.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="pt-4 border-t">
                    <div className="flex justify-between font-bold">
                      <span>Total Expenses</span>
                      <span>
                        ${dummyFinancialData.expensesByCategory.reduce((sum, cat) => sum + cat.value, 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="maintenance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Requests</CardTitle>
              <CardDescription>All current and resolved maintenance issues</CardDescription>
            </CardHeader>
            <CardContent>
              {maintenanceLoading ? (
                <p>Loading maintenance data...</p>
              ) : (
                <div className="space-y-4">
                  {maintenanceRequests.map((request, index) => (
                    <div key={index} className="flex items-start justify-between border-b pb-4">
                      <div className="flex items-start space-x-3">
                        <Badge variant={request.status === 'open' ? 'destructive' : 'outline'} className="mt-0.5">
                          {request.status}
                        </Badge>
                        <div>
                          <p className="font-medium">{request.title}</p>
                          <p className="text-sm">{request.description}</p>
                          <div className="flex items-center mt-1 text-sm text-muted-foreground">
                            <CalendarDays className="h-3 w-3 mr-1" />
                            <span>Reported: {new Date(request.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Property: {
                              properties.find(p => p.id === request.propertyId)?.name || 
                              `Property #${request.propertyId}`
                            }
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        View Details
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}