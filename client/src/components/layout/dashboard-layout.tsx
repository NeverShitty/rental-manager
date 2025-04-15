import { useAuth } from "@/hooks/use-auth";
import { SidebarNav } from "./sidebar-nav";
import { UserRole } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { LogOut, HelpCircle } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { useLocation } from "wouter";
import { 
  OnboardingTour, 
  useOnboarding 
} from "@/hooks/use-onboarding";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  
  // Determine which tour to show based on the current location
  const getTourKey = () => {
    if (location.startsWith('/documents')) return 'documents';
    if (location.startsWith('/properties')) return 'properties';
    if (location.startsWith('/maintenance')) return 'maintenance';
    return 'main';
  };
  
  // Initialize the hook first, then use its values
  const onboardingData = useOnboarding({ 
    tourKey: getTourKey(),
    autoStart: false // Don't auto-start based on tourCompleted here to avoid the initialization error
  });
  
  const { startTour } = onboardingData;

  return (
    <OnboardingTour tourKey={getTourKey()} autoStart={location === '/dashboard'}>
      <div className="flex min-h-screen">
        <aside className="w-64 bg-sidebar border-r" data-tour="sidebar">
          <div className="p-4 border-b">
            <Logo />
          </div>
          <div className="p-4">
            <div className="mb-4" data-tour="user-menu">
              <p className="text-sm text-sidebar-foreground/60">Logged in as</p>
              <p className="font-medium">{user?.fullName}</p>
              <p className="text-sm text-sidebar-foreground/60 capitalize">{user?.role}</p>
            </div>
            <SidebarNav role={user?.role as keyof typeof UserRole} />
          </div>
          <div className="absolute bottom-4 left-4 flex gap-2">
            <Button 
              variant="ghost" 
              className="text-sidebar-foreground/60"
              onClick={() => startTour()}
              title="Start guided tour"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              className="text-sidebar-foreground/60"
              onClick={() => logoutMutation.mutate()}
              title="Log out"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </aside>
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </OnboardingTour>
  );
}