import { Building2 } from "lucide-react";

interface LogoProps {
  className?: string;
}

export function Logo({ className = "h-8" }: LogoProps) {
  return (
    <div className={`flex items-center ${className}`}>
      <img 
        src="/assets/logo.png"
        alt="Chicago Furnished Condos Logo"
        className="h-full w-auto mr-2"
      />
      <span className="font-semibold text-lg whitespace-nowrap">Chicago Furnished Condos</span>
    </div>
  );
}