export interface Env {
  DB: D1Database;
  R2?: R2Bucket;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  CSV_SIGNING_SECRET: string;
  CSV_URL_TTL_SECONDS?: string;
  CORS_ORIGIN?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_19?: string;
  STRIPE_PRICE_39?: string;
  DODO_PAYMENTS_API_KEY?: string;
  DODO_WEBHOOK_SECRET?: string;
  DODO_PRODUCT_ID_PRO?: string;
  DODO_PRODUCT_ID_SCALE?: string;
  BREVO_API_KEY?: string;
  BREVO_SENDER_EMAIL?: string;
}

export interface ShopifyProduct {
  id: string;
  title: string;
  description: string;
  gtin: string | null;
  category: string | null;
  variants: number;
  images: number;
  variantTitles?: string[];
  variantsAsProducts?: boolean;
  imageAltText?: boolean;
  brand?: string | null;
  sku?: string | null;
  price?: number | string | null;
  availability?: string | null;
  handle?: string | null;
  identifierExists?: "yes" | "no" | "unknown" | null;
}

export interface AuditRow {
  id: string;
  user_id: string;
  store_url: string;
  audit_data: string | null;
  score: number | null;
  status: 'pending' | 'completed' | 'error';
  csv_key: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string | null;
}
