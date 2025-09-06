import type { User } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  username: string;
  coins: number;
  balance: number;
  email?: string;
  is_banned?: boolean;
  role: 'user' | 'admin';
}

export type TransactionStatus = 'pending' | 'approved' | 'rejected';

export interface Transaction {
  id: number;
  user_id: string;
  package: number;
  tid: string;
  screenshot_url: string;
  status: TransactionStatus;
  created_at: string;
  users?: { email: string; username: string };
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
  users?: { email: string; username: string };
}

export interface Video {
  id: number;
  title: string;
  description: string;
  video_url: string;
  required_coins: number;
  earning_pkr: number;
  watch_duration_seconds: number;
  created_at: string;
}

export interface WatchedVideo {
    id: number;
    user_id: string;
    video_id: number;
    watched_at: string;
}