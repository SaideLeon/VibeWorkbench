import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface DbProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role: 'developer' | 'admin' | 'auditor';
  github_username?: string;
  created_at: string;
  updated_at: string;
}

export interface DbSubscription {
  id: string;
  user_id?: string;
  customer_email: string;
  customer_name?: string;
  customer_phone?: string;
  cakto_subscription_id?: string;
  plan: 'free' | 'starter' | 'pro' | 'studio';
  plan_name: string;
  status: 'active' | 'canceled' | 'overdue' | 'trialing';
  frequency: 'monthly' | 'annual';
  payment_method: 'pix_automatico' | 'credit_card' | 'boleto';
  amount_cents: number;
  currency: string;
  current_period_start: string;
  current_period_end?: string;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbBlueprintHistory {
  id: string;
  user_id?: string;
  user_email?: string;
  audit_id?: string;
  project_name: string;
  title: string;
  version_number: number;
  summary?: string;
  total_findings: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  blueprint_markdown: string;
  patch_content?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at?: string;
}

let browserClient: SupabaseClient | null = null;
let serverClient: SupabaseClient | null = null;

/**
 * Cliente Supabase seguro para uso no Browser / Client Components
 */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!browserClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseAnonKey) {
      try {
        browserClient = createClient(supabaseUrl, supabaseAnonKey);
      } catch (err) {
        console.warn('[Supabase] Falha ao inicializar client browser:', err);
      }
    }
  }

  return browserClient;
}

/**
 * Cliente Supabase com permissões de servidor (Service Role ou Anon)
 */
export function getSupabaseServerClient(): SupabaseClient | null {
  if (!serverClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && secretKey) {
      try {
        serverClient = createClient(supabaseUrl, secretKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        });
      } catch (err) {
        console.warn('[Supabase] Falha ao inicializar client server:', err);
      }
    }
  }

  return serverClient;
}

/**
 * Verifica se o Supabase está devidamente configurado com variáveis de ambiente
 */
export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}
