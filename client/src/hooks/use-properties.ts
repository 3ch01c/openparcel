import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";
import { useState, useEffect, useRef } from "react";
import { getCachedProperties, setCachedProperties, clearPropertiesCache } from "@/lib/indexeddb-cache";

type PropertyQueryParams = z.infer<typeof api.properties.list.input>;

export function useProperties(params?: PropertyQueryParams) {
  const paramsKey = JSON.stringify(params);
  const cacheKey = `properties_${paramsKey}`;
  const queryKey = [api.properties.list.path, paramsKey] as const;
  const queryClient = useQueryClient();
  const [idbChecked, setIdbChecked] = useState(false);
  const [idbHasData, setIdbHasData] = useState(false);
  const checkedKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (checkedKeysRef.current.has(cacheKey)) {
      setIdbChecked(true);
      return;
    }
    let cancelled = false;
    getCachedProperties(cacheKey).then((cached) => {
      if (cancelled) return;
      checkedKeysRef.current.add(cacheKey);
      if (cached) {
        queryClient.setQueryData([...queryKey], cached.data);
        setIdbHasData(true);
      }
      setIdbChecked(true);
    }).catch(() => {
      if (!cancelled) {
        checkedKeysRef.current.add(cacheKey);
        setIdbChecked(true);
      }
    });
    return () => { cancelled = true; };
  }, [cacheKey]);

  const query = useQuery({
    queryKey: [...queryKey],
    queryFn: async () => {
      const url = new URL(api.properties.list.path, window.location.origin);
      if (params) {
        if (params.minValue) url.searchParams.set("minValue", String(params.minValue));
        if (params.maxValue) url.searchParams.set("maxValue", String(params.maxValue));
        if (params.year) url.searchParams.set("year", String(params.year));
      }

      const res = await fetch(url.toString(), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch properties");

      const data = await res.json();
      const parsed = api.properties.list.responses[200].parse(data);

      setCachedProperties(cacheKey, parsed).catch(() => {});

      return parsed;
    },
    enabled: idbChecked && !idbHasData,
    staleTime: Infinity,
  });

  return { ...query, idbChecked };
}

export async function invalidatePropertyCache() {
  await clearPropertiesCache();
}

export const PROPERTIES_QUERY_PREFIX = api.properties.list.path;

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
