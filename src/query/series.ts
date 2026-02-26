import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { Booster, Series } from "../types";

async function fetchSeriesBySlug(slug: string): Promise<Series> {
  const { data, error } = await supabase
    .from("series")
    .select("id, name, slug, code, coverImage")
    .or(`slug.eq.${slug},code.eq.${slug}`)
    .single();

  if (error) {
    throw error;
  }

  return data as Series;
}

async function fetchBoosters(
  seriesId: string,
  shopOnly: boolean,
): Promise<Booster[]> {
  const query = supabase
    .from("boosters")
    .select("id, name, type, price_pc, image_url, is_daily_only")
    .eq("series_id", seriesId)
    .order("price_pc", { ascending: true });

  if (shopOnly) {
    query.eq("is_daily_only", false);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []) as Booster[];
}

export function useSeriesBySlugQuery(slug: string) {
  return useQuery({
    queryKey: ["series", slug],
    enabled: Boolean(slug),
    queryFn: () => fetchSeriesBySlug(slug),
  });
}

export function useBoosterSeriesQuery(slug: string) {
  return useQuery({
    queryKey: ["booster-series", slug],
    enabled: Boolean(slug),
    queryFn: () => fetchSeriesBySlug(slug),
  });
}

export function useSeriesBoostersQuery(seriesId?: string) {
  return useQuery({
    queryKey: ["series-boosters", seriesId],
    enabled: Boolean(seriesId),
    queryFn: () => fetchBoosters(seriesId!, false),
  });
}

export function useBoosterListQuery(seriesId?: string) {
  return useQuery({
    queryKey: ["booster-list", seriesId],
    enabled: Boolean(seriesId),
    queryFn: () => fetchBoosters(seriesId!, true),
  });
}
