
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Payment, Property } from "@shared/schema";
import { DollarSign, Home, Receipt, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function TenantPortalPage() {
  const { data: property } = useQuery<Property>({
    queryKey: ["/api/properties/current"],
  });

  const { data: payments } = useQuery<Payment[]>({
    queryKey: ["/api/payments/tenant"],
  });

  const stats = [
    {
      title: "Current Balance",
      value: "$0.00",
      icon: DollarSign,
    },
    {
      title: "Next Payment",
      value: property?.rentAmount ? `$${Number(property.rentAmount).toLocaleString()}` : "$0.00",
      icon: Receipt, 
    },
    {
      title: "Property",
      value: property?.name || "Not Assigned",
      icon: Home,
    }
  ];

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Tenant Portal</h1>

        {payments?.some(p => p.status === 'pending') && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Payment Due</AlertTitle>
            <AlertDescription>
              You have pending payments. Please review your payment schedule.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-3 mb-6">
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
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {payments?.map(payment => (
                  <div key={payment.id} className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{payment.description}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(payment.dueDate).toLocaleDateString()}
                      </div>
                    </div>
                    <div className={payment.status === 'completed' ? 'text-green-600' : 'text-amber-600'}>
                      ${Number(payment.amount).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Property Details</CardTitle>
            </CardHeader>
            <CardContent>
              {property ? (
                <div className="space-y-2">
                  <div>
                    <div className="font-medium">Address</div>
                    <div className="text-sm text-muted-foreground">{property.address}</div>
                  </div>
                  <div>
                    <div className="font-medium">Monthly Rent</div>
                    <div className="text-sm text-muted-foreground">
                      ${Number(property.rentAmount).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">Status</div>
                    <div className="text-sm text-muted-foreground capitalize">{property.status}</div>
                  </div>
                </div>
              ) : (
                <div className="text-muted-foreground">No property assigned</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
