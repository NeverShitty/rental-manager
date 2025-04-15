import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Wrench, DollarSign, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Property, MaintenanceRequest } from "@shared/schema";

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: maintenanceRequests } = useQuery<MaintenanceRequest[]>({
    queryKey: ["/api/maintenance"],
  });

  const stats = [
    {
      title: "Total Properties",
      value: properties?.length || 0,
      icon: Building2,
    },
    {
      title: "Active Maintenance",
      value: maintenanceRequests?.filter(r => r.status !== 'completed').length || 0,
      icon: Wrench,
    },
    {
      title: "Total Revenue",
      value: `$${properties?.reduce((acc, p) => acc + Number(p.rentAmount), 0).toLocaleString()}`,
      icon: DollarSign,
    },
    {
      title: "Active Tenants",
      value: properties?.filter(p => p.status === 'occupied').length || 0,
      icon: Users,
    },
  ] as const;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.fullName}</h1>
          <p className="text-muted-foreground">
            Here's what's happening with your properties today.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" data-tour="dashboard-summary">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Properties</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {properties?.slice(0, 5).map(property => (
                  <div key={property.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{property.name}</p>
                      <p className="text-sm text-muted-foreground">{property.address}</p>
                    </div>
                    <span className="text-sm capitalize">{property.status}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Maintenance Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {maintenanceRequests?.slice(0, 5).map(request => (
                  <div key={request.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{request.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="text-sm capitalize">{request.status.replace('_', ' ')}</span>
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