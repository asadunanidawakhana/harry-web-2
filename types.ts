import type { User } from '@supabase/supabase-js';

export interface Plan {
  id: string;
  name: string;
  price: number;
  daily_earning: number;
  validity_days: number;
  videos_per_day: number;
  created_at: string;
}

export interface UserProfile {
  id: string;
  username: string;
  balance: number;
  email?: string;
  is_banned?: boolean;
  role: 'user' | 'admin';
  plan_id: string | null;
  plan_activated_at: string | null;
  last_withdrawal_at: string | null;
  plans?: Plan; // For joined data
  isPlanCurrentlyActive?: boolean; // Centralized flag for plan status
  referral_code: string | null;
  referred_by: string | null;
  referral_earnings: number;
}

export type TransactionStatus = 'pending' | 'approved' | 'rejected';

export interface Transaction {
  id: number;
  user_id: string;
  amount: number;
  plan_id: string;
  tid: string;
  screenshot_url: string;
  status: TransactionStatus;
  created_at: string;
  users?: { email: string; username: string };
  plans?: { name: string };
}

export type WithdrawalStatus = 'pending' | 'approved' | 'rejected';

export interface Withdrawal {
  id: number;
  user_id: string;
  amount: number;
  payment_method: string;
  account_number: string;
  account_name: string;
  status: WithdrawalStatus;
  created_at: string;
  // FIX: Added 'balance' to the users object to match the data fetched in AdminPage.
  users?: { email: string; username: string; balance: number; };
}

export interface Video {
  id: number;
  title: string;
  description:string;
  video_url: string;
  watch_duration_seconds: number;
  created_at: string;
}

export interface WatchedVideo {
    id: number;
    user_id: string;
    video_id: number;
    watched_at: string;
}

export interface ChangelogEntry {
  id: number;
  version: string;
  date: string;
  title: string;
  description: string;
  created_at: string;
}

export interface ReferredUser {
  id: string;
  username: string;
  created_at: string;
  plan_id: string | null;
}
