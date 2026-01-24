import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

type PropertyQueryParams = z.infer<typeof api.properties.list.input>;

export function useProperties(params?: PropertyQueryParams) {
  // Serialize params to string for query key stability
  const paramsKey = JSON.stringify(params);

  return useQuery({
    queryKey: [api.properties.list.path, paramsKey],
    queryFn: async () => {
      // Build URL with query parameters
      const url = new URL(api.properties.list.path, window.location.origin);
      if (params) {
        if (params.minValue) url.searchParams.set("minValue", String(params.minValue));
        if (params.maxValue) url.searchParams.set("maxValue", String(params.maxValue));
        if (params.year) url.searchParams.set("year", String(params.year));
      }

      const res = await fetch(url.toString(), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch properties");
      
      const data = await res.json();
      return api.properties.list.responses[200].parse(data);
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes (data doesn't change often)
  });
}

export function useProperty(id: number) {
  return useQuery({
    queryKey: [api.properties.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.properties.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch property details");
      
      return api.properties.get.responses[200].parse(await res.json());
    },
  });
}
