import { UserRole } from "@shared/schema";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Home, 
  Wrench, 
  Users, 
  Calculator,
  Truck,
  FileText,
  BarChart4,
  CreditCard
} from "lucide-react";

const roleBasedNavItems = {
  [UserRole.MANAGER]: [
    { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
    { label: "Properties", icon: Home, href: "/properties" },
    { label: "Maintenance", icon: Wrench, href: "/maintenance" },
    { label: "Documents", icon: FileText, href: "/documents" },
    { label: "Bookkeeping", icon: BarChart4, href: "/bookkeeping" },
    { label: "Tenants", icon: Users, href: "/tenants" },
    { label: "Manager Dashboard", icon: LayoutDashboard, href: "/manager-dashboard" },
  ],
  [UserRole.GUEST]: [
    { label: "Portal", icon: LayoutDashboard, href: "/tenant-portal" },
    { label: "Maintenance", icon: Wrench, href: "/maintenance" },
  ],
  [UserRole.OWNER]: [
    { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
    { label: "Properties", icon: Home, href: "/properties" },
    { label: "Maintenance", icon: Wrench, href: "/maintenance" },
    { label: "Documents", icon: FileText, href: "/documents" },
  ],
  [UserRole.VENDOR]: [
    { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
    { label: "Work Orders", icon: Truck, href: "/maintenance" },
  ],
  [UserRole.ACCOUNTANT]: [
    { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
    { label: "Documents", icon: FileText, href: "/documents" },
    { label: "Bookkeeping", icon: BarChart4, href: "/bookkeeping" },
    { label: "Financials", icon: Calculator, href: "/financials" },
  ],
} as const;

export function SidebarNav({ role }: { role: keyof typeof UserRole }) {
  const [location] = useLocation();
  // Handle case insensitive role name and provide a default if not found
  const navItems = role && roleBasedNavItems[role.toLowerCase() as keyof typeof roleBasedNavItems] 
    ? roleBasedNavItems[role.toLowerCase() as keyof typeof roleBasedNavItems] 
    : roleBasedNavItems.guest;

  return (
    <nav className="space-y-2">
      {navItems.map((item) => {
        const isActive = location === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
              isActive 
                ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
            }`}
          >
            <item.icon className="h-4 w-4 mr-2" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}