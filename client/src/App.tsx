import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard";
import PropertiesPage from "@/pages/properties";
import MaintenancePage from "@/pages/maintenance";
import AdsPage from "@/pages/ads";
import MercuryDashboard from "@/pages/mercury-dashboard";
import DocumentsPage from "@/pages/documents";
import BookkeepingPage from "@/pages/bookkeeping";
import BookkeepingIntegrationsPage from "@/pages/bookkeeping/integrations";
import WavePage from "@/pages/wave";
import TenantsPage from "@/pages/tenants";
import TenantPortalPage from "@/pages/tenant-portal";

function Router() {
  return (
    <Switch>
      {/* Auth route */}
      <Route path="/auth" component={AuthPage} />

      {/* Protected routes */}
      <ProtectedRoute path="/" component={DashboardPage} />
      <ProtectedRoute path="/dashboard" component={DashboardPage} />
      <ProtectedRoute path="/properties" component={PropertiesPage} />
      <ProtectedRoute path="/maintenance" component={MaintenancePage} />
      <ProtectedRoute path="/ads" component={AdsPage} />
      <ProtectedRoute path="/documents" component={DocumentsPage} />
      <ProtectedRoute path="/mercury" component={MercuryDashboard} />
      <ProtectedRoute path="/bookkeeping" component={BookkeepingPage} />
      <ProtectedRoute path="/bookkeeping/integrations" component={BookkeepingIntegrationsPage} />
      <ProtectedRoute path="/wave" component={WavePage} />
      <ProtectedRoute path="/tenants" component={TenantsPage} />
      <ProtectedRoute path="/tenant-portal" component={TenantPortalPage} />

      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;