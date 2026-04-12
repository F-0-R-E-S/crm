export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface Tenant {
  id: string;
  name: string;
}

export interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  country: string;
  status: string;
  affiliate_id: string;
  broker_id?: string;
  fraud_score?: number;
  fraud_checks?: FraudCheck[];
  ip_address?: string;
  user_agent?: string;
  funnel_id?: string;
  offer_id?: string;
  click_id?: string;
  created_at: string;
  updated_at: string;
}

export interface FraudCheck {
  check: string;
  passed: boolean;
  score?: number;
  details?: string;
}

export interface LeadEvent {
  id: string;
  event_type: string;
  payload?: Record<string, unknown>;
  created_at: string;
}

export interface LeadsResponse {
  leads: Lead[];
  total: number;
  page: number;
  per_page: number;
}

export interface DashboardStats {
  total_leads: number;
  recent_new: number;
  recent_delivered: number;
  avg_fraud_score: number;
}

export interface LoginResponse {
  token: string;
  refresh_token: string;
  expires_at: string;
  user: User;
}

export interface RegisterResponse {
  token: string;
  refresh_token: string;
  user: User;
  tenant: Tenant;
}
