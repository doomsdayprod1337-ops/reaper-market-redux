/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

// Authentication types
export interface LoginRequest {
  email?: string;
  username?: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    username: string;
    wallet_balance: number;
    is_admin: boolean;
  };
  token?: string;
  error?: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  inviteCode: string;
  referralCode?: string;
}

export interface RegisterResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    username: string;
  };
  error?: string;
}

export interface VerifyEmailRequest {
  email: string;
  code: string;
}

export interface VerifyEmailResponse {
  success: boolean;
  error?: string;
}

// User types
export interface User {
  id: string;
  email: string;
  username: string;
  wallet_balance: number;
  is_admin: boolean;
  created_at: string;
  email_verified: boolean;
}

export interface ProfileUpdateRequest {
  username?: string;
  email?: string;
}

// Deposit types
export interface CreateDepositRequest {
  amount: number;
  currency: string;
  payment_processor?: string;
}

export interface Deposit {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'failed';
  payment_processor?: string;
  created_at: string;
  user_id: string;
}

export interface DepositResponse {
  success: boolean;
  deposit?: Deposit;
  error?: string;
}

// Admin types
export interface AdminStats {
  total_users: number;
  total_deposits: number;
  total_revenue: number;
  pending_deposits: number;
}

export interface AdminSettings {
  walletSettings: {
    minimumDeposit: number;
    supportedCurrencies: string[];
  };
}

// Enhanced Invites types
export interface InvitePackage {
  id: number;
  name: string;
  price: number;
  invites: number;
}

export interface InviteStats {
  freeInvitesRemaining: number;
  totalInvitesGenerated: number;
  totalInvitesUsed: number;
  activeInvites: number;
  usedInvites: number;
  totalSpentOnInvites: number;
}

// Checker File types
export interface CheckerFile {
  id: string;
  filename: string;
  size: number;
  uploaded_at: string;
  user_id: string;
}

export interface CheckerFileConfig {
  id: string;
  name: string;
  config: Record<string, any>;
  created_at: string;
}

// News types
export interface NewsArticle {
  id: string;
  title: string;
  content: string;
  author_id: string;
  created_at: string;
  updated_at: string;
  status: 'draft' | 'published' | 'archived';
}

// Ticket types
export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'closed';
  priority: 'low' | 'medium' | 'high';
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface TicketReply {
  id: string;
  ticket_id: string;
  user_id: string;
  content: string;
  created_at: string;
  is_admin: boolean;
}

// Credit Card types
export interface CreditCard {
  id: string;
  card_number: string;
  expiry_month: string;
  expiry_year: string;
  cvv: string;
  card_type: string;
  bank_name?: string;
  country?: string;
  user_id: string;
  created_at: string;
}

// Service types
export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  is_active: boolean;
  created_at: string;
}

// Bot types
export interface Bot {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  is_active: boolean;
  created_at: string;
}

// Generic API response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Pagination types
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: PaginationMeta;
}
