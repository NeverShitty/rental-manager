import { useEffect } from "react";
import { Advertisement } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface AdProps {
  placement: string;
  className?: string;
}

export function Advertisement({ placement, className = "" }: AdProps) {
  const { data: ads } = useQuery<Advertisement[]>({
    queryKey: [`/api/ads/active/${placement}`],
  });

  useEffect(() => {
    // Track impression for the displayed ad
    if (ads?.[0]) {
      apiRequest("POST", `/api/ads/${ads[0].id}/track/impression`);
    }
  }, [ads]);

  if (!ads?.length) return null;

  const ad = ads[0]; // Show the first active ad for the placement

  return (
    <a
      href={ad.targetUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`block w-full overflow-hidden ${className}`}
      onClick={() => apiRequest("POST", `/api/ads/${ad.id}/track/click`)}
    >
      <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
        <img
          src={ad.imageUrl}
          alt={ad.title}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="mt-2">
        <h3 className="font-medium text-sm">{ad.title}</h3>
        <p className="text-sm text-muted-foreground">{ad.description}</p>
      </div>
    </a>
  );
}
