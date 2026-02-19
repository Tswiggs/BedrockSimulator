export interface ModelPricing {
  input_1k: number;
  output_1k: number;
  cache_write_1k: number | null;
  cache_write_1hour_1k: number | null;
  cache_read_1k: number | null;
  batch_input_1k: number | null;
  batch_output_1k: number | null;
}

export interface ModelConstraints {
  min_cache_ttl_seconds: number | null;
  supports_batch: boolean;
  supports_vision: boolean;
  supports_caching: boolean;
  supports_1hour_cache: boolean;
  supported_tiers: string[];
}

export interface BedrockModel {
  id: string;
  name: string;
  provider: string;
  pricing: ModelPricing;
  constraints: ModelConstraints;
}

export interface PricingData {
  metadata: {
    last_updated: string;
    currency: string;
    source?: string;
  };
  models: BedrockModel[];
}

let cachedData: PricingData | null = null;

export async function fetchPricingData(): Promise<PricingData> {
  if (cachedData) return cachedData;
  const resp = await fetch(`${import.meta.env.BASE_URL}data/pricing.json`);
  if (!resp.ok) throw new Error(`Failed to load pricing data: ${resp.status}`);
  cachedData = await resp.json();
  return cachedData!;
}

export function getPricingData(): PricingData {
  if (!cachedData) throw new Error("Pricing data not loaded. Call fetchPricingData() first.");
  return cachedData;
}
