import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const missingEnv = !supabaseUrl || !supabaseAnonKey;

function createSupabaseStub() {
  const error = (method?: string) => {
    throw new Error(
      `Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to use${method ? ` ${method}` : " Supabase"}.`,
    );
  };

  const queryBuilder = new Proxy(
    {},
    {
      get: () => error("database methods"),
      apply: () => error("database methods"),
    },
  );

  return {
    from: () => queryBuilder,
    rpc: () => error("rpc"),
    storage: {
      from: () => ({ download: error, upload: error, remove: error }),
    },
    auth: {
      signInWithPassword: error,
      signInWithOtp: error,
      signOut: error,
      getSession: error,
      onAuthStateChange: error,
    },
  } as any;
}

export const supabase: any = missingEnv
  ? (console.warn(
      "Supabase env not set. The app will run, but any Supabase call will fail until you configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
    ),
    createSupabaseStub())
  : createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });

// Auth types for TypeScript
export type AuthUser = {
  id: string;
  email: string;
  user_metadata?: {
    username?: string;
    full_name?: string;
  };
};

// Database types for user (matches existing users table)
export interface UserProfile {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  is_admin?: boolean;
  role?: string;
  admin?: boolean;
  status?: string;
  wallet_balance?: number;
  telegram_username?: string;
  telegram_synced_at?: string;
  last_login?: string;
  referral_code?: string;
  is_verified?: boolean;
  created_at: string;
  updated_at: string;
  tier?: string;
  fee_reduction?: number;
  benefits?: string[];
  referral_earnings?: number;
  total_referrals?: number;
}

// Registration data type
export interface RegistrationData {
  email: string;
  username: string;
  password: string;
  inviteCode: string;
}
