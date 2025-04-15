import { useQuery } from "@tanstack/react-query";
import { MercuryAccount } from "@shared/schema";
import { getQueryFn } from "./queryClient";

export function useMercuryAccounts() {
  return useQuery<MercuryAccount[]>({
    queryKey: ["/api/mercury/accounts"],
    queryFn: getQueryFn(),
  });
}
