
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Building2, DollarSign, Users, FileText, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface DashboardMetrics {
  mercuryBalance: number;
  stripeBalance: number;
  doorloopTotal: number;
  propertyCount: number;
  tenantCount: number;
  maintenanceRequests: number;
  occupancyRate: number;
  monthlyRevenue: number;
}

interface Property {
  id: string;
  name: string;
  status: string;
  rentAmount: number;
  tenantName?: string;
  nextPaymentDue?: string;
}

export default function ManagerDashboard() {
  const { data: metrics } = useQuery<DashboardMetrics>({
    queryKey: ['/api/doorloop/reconcile/banks'],
  });

  const { data: properties } = useQuery<Property[]>({
    queryKey: ['/api/properties'],
  });

  const { data: maintenanceRequests } = useQuery({
    queryKey: ['/api/maintenance'],
  });

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">Property Manager Dashboard</h1>
          <p className="text-muted-foreground">Real-time overview of your properties and financials</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">DoorLoop Balance</h3>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">
                  ${metrics?.doorloopTotal?.toFixed(2) || '0.00'}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Mercury Balance</h3>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">
                  ${metrics?.mercuryBalance?.toFixed(2) || '0.00'}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Occupancy Rate</h3>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">
                  {metrics?.occupancyRate || 0}%
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Monthly Revenue</h3>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">
                  ${metrics?.monthlyRevenue?.toFixed(2) || '0.00'}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid gap-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Properties Overview</CardTitle>
              <CardDescription>Status and performance of your properties</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {properties?.map((property) => (
                  <Card key={property.id} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold">{property.name}</h3>
                      <span className={`px-2 py-1 rounded text-sm ${
                        property.status === 'occupied' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {property.status}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Rent Amount:</span>
                        <span className="font-medium">${property.rentAmount}</span>
                      </div>
                      {property.tenantName && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tenant:</span>
                          <span className="font-medium">{property.tenantName}</span>
                        </div>
                      )}
                      {property.nextPaymentDue && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Next Payment:</span>
                          <span className="font-medium">{new Date(property.nextPaymentDue).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Maintenance Overview</CardTitle>
              <CardDescription>Active maintenance requests and their status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {maintenanceRequests?.map((request: any) => (
                  <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{request.title}</h4>
                      <p className="text-sm text-muted-foreground">{request.property?.name}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-sm ${
                      request.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {request.status}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
