export interface Lead {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  phone_e164?: string
  country: string
  city?: string
  ip_address?: string
  user_agent?: string
  status: LeadStatus
  sub_status?: string
  quality_score?: number
  fraud_score?: number
  fraud_checks?: FraudCheck[]
  affiliate_id?: string
  affiliate_name?: string
  aff_sub1?: string
  aff_sub2?: string
  aff_sub3?: string
  aff_sub4?: string
  aff_sub5?: string
  aff_sub6?: string
  aff_sub7?: string
  aff_sub8?: string
  aff_sub9?: string
  aff_sub10?: string
  broker_id?: string
  broker_name?: string
  offer_id?: string
  funnel_id?: string
  funnel_name?: string
  click_id?: string
  source?: string
  campaign?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
  landing_page?: string
  language?: string
  device_type?: string
  os?: string
  browser?: string
  referrer?: string
  sale_status?: string
  ftd_at?: string
  ftd_amount?: number
  autologin_status?: string
  autologin_url?: string
  integration_response?: string
  rejection_reason?: string
  retry_count?: number
  last_broker_response?: string
  tags?: string[]
  comment?: string
  custom1?: string
  custom2?: string
  custom3?: string
  custom4?: string
  custom5?: string
  created_at: string
  updated_at: string
  sent_at?: string
}

export type LeadStatus = 'new' | 'processing' | 'qualified' | 'routed' | 'delivered' | 'deposited' | 'rejected' | 'fraud' | 'duplicate' | 'invalid'

export interface FraudCheck {
  check: string
  category?: string
  passed: boolean
  score?: number
  max_score?: number
  details?: string
  provider?: string
}

export interface LeadEvent {
  id: string
  lead_id: string
  event_type: string
  broker_id?: string
  payload?: Record<string, unknown>
  status_code?: number
  duration_ms?: number
  error?: string
  created_at: string
}

export interface LeadRegistration {
  id: string
  lead_id: string
  broker_id: string
  broker_name: string
  result: 'success' | 'rejected' | 'timeout' | 'error'
  rejection_reason?: string
  response_time_ms: number
  raw_response?: Record<string, unknown>
  created_at: string
}

export interface LeadComment {
  id: string
  lead_id: string
  user_id: string
  user_name: string
  content: string
  created_at: string
  updated_at: string
}

export interface LeadsResponse {
  leads: Lead[]
  total: number
  limit: number
  offset: number
}

export interface LeadDetailResponse {
  lead: Lead
  events: LeadEvent[]
  registrations?: LeadRegistration[]
  comments?: LeadComment[]
}

export interface FilterPreset {
  id: string
  name: string
  filters: LeadFilters
  is_team: boolean
  created_at: string
}

export interface LeadFilters {
  search?: string
  status?: string[]
  country?: string[]
  affiliate_id?: string
  broker_id?: string
  offer_id?: string
  funnel_id?: string
  fraud_score_min?: number
  fraud_score_max?: number
  quality_score_min?: number
  quality_score_max?: number
  date_from?: string
  date_to?: string
  sent_from?: string
  sent_to?: string
  ftd_from?: string
  ftd_to?: string
  source?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  sale_status?: string
  tags?: string[]
  has_comment?: boolean
  ip?: string
}

export interface SavedView {
  id: string
  name: string
  columns: string[]
  column_widths?: Record<string, number>
  filters: LeadFilters
  sort: SortConfig[]
  page_size: number
  is_team: boolean
  created_at: string
}

export interface SortConfig {
  field: string
  direction: 'asc' | 'desc'
}

export interface BulkImportResponse {
  total: number
  accepted: number
  rejected: number
  errors?: Array<{ row: number; field?: string; message: string }>
}

export interface BulkActionRequest {
  action: string
  lead_ids: string[]
  params?: Record<string, unknown>
}

export interface BulkActionResponse {
  total: number
  processed: number
  errors: number
  error_details?: Array<{ lead_id: string; error: string }>
}

export interface ExportRequest {
  columns: string[]
  format: 'csv' | 'xlsx'
  filters: LeadFilters
}

export interface ColumnDef {
  key: string
  label: string
  group: string
  width?: number
  sortable?: boolean
  filterable?: boolean
}

export const COLUMN_GROUPS: Record<string, string> = {
  core: 'Core',
  contact: 'Contact',
  traffic: 'Traffic',
  status: 'Status',
  finance: 'Finance',
  technical: 'Technical',
  custom: 'Custom',
}

export const ALL_COLUMNS: ColumnDef[] = [
  { key: 'id', label: 'ID', group: 'core', width: 100, sortable: true },
  { key: 'first_name', label: 'First Name', group: 'core', width: 120, sortable: true },
  { key: 'last_name', label: 'Last Name', group: 'core', width: 120, sortable: true },
  { key: 'email', label: 'Email', group: 'core', width: 200, sortable: true },
  { key: 'country', label: 'Country', group: 'core', width: 80, sortable: true },
  { key: 'status', label: 'Status', group: 'core', width: 110, sortable: true },
  { key: 'fraud_score', label: 'Fraud Score', group: 'core', width: 100, sortable: true },
  { key: 'quality_score', label: 'Quality', group: 'core', width: 90, sortable: true },
  { key: 'phone', label: 'Phone', group: 'contact', width: 140 },
  { key: 'ip_address', label: 'IP', group: 'contact', width: 130 },
  { key: 'city', label: 'City', group: 'contact', width: 110 },
  { key: 'language', label: 'Language', group: 'contact', width: 80 },
  { key: 'affiliate_id', label: 'Affiliate', group: 'traffic', width: 120, sortable: true },
  { key: 'broker_id', label: 'Broker', group: 'traffic', width: 120, sortable: true },
  { key: 'offer_id', label: 'Offer', group: 'traffic', width: 100 },
  { key: 'funnel_id', label: 'Funnel', group: 'traffic', width: 100 },
  { key: 'click_id', label: 'Click ID', group: 'traffic', width: 100 },
  { key: 'source', label: 'Source', group: 'traffic', width: 100 },
  { key: 'campaign', label: 'Campaign', group: 'traffic', width: 120 },
  { key: 'utm_source', label: 'UTM Source', group: 'traffic', width: 100 },
  { key: 'utm_medium', label: 'UTM Medium', group: 'traffic', width: 100 },
  { key: 'utm_campaign', label: 'UTM Campaign', group: 'traffic', width: 110 },
  { key: 'utm_content', label: 'UTM Content', group: 'traffic', width: 110 },
  { key: 'utm_term', label: 'UTM Term', group: 'traffic', width: 100 },
  { key: 'aff_sub1', label: 'Sub1', group: 'traffic', width: 80 },
  { key: 'aff_sub2', label: 'Sub2', group: 'traffic', width: 80 },
  { key: 'aff_sub3', label: 'Sub3', group: 'traffic', width: 80 },
  { key: 'aff_sub4', label: 'Sub4', group: 'traffic', width: 80 },
  { key: 'aff_sub5', label: 'Sub5', group: 'traffic', width: 80 },
  { key: 'sale_status', label: 'Sale Status', group: 'status', width: 110, sortable: true },
  { key: 'sub_status', label: 'Sub-Status', group: 'status', width: 110 },
  { key: 'autologin_status', label: 'Autologin', group: 'status', width: 100 },
  { key: 'rejection_reason', label: 'Rejection', group: 'status', width: 120 },
  { key: 'retry_count', label: 'Retries', group: 'status', width: 70 },
  { key: 'ftd_amount', label: 'FTD Amount', group: 'finance', width: 100, sortable: true },
  { key: 'ftd_at', label: 'FTD Date', group: 'finance', width: 120, sortable: true },
  { key: 'device_type', label: 'Device', group: 'technical', width: 90 },
  { key: 'os', label: 'OS', group: 'technical', width: 90 },
  { key: 'browser', label: 'Browser', group: 'technical', width: 100 },
  { key: 'landing_page', label: 'Landing', group: 'technical', width: 150 },
  { key: 'referrer', label: 'Referrer', group: 'technical', width: 150 },
  { key: 'user_agent', label: 'User Agent', group: 'technical', width: 200 },
  { key: 'custom1', label: 'Custom 1', group: 'custom', width: 100 },
  { key: 'custom2', label: 'Custom 2', group: 'custom', width: 100 },
  { key: 'custom3', label: 'Custom 3', group: 'custom', width: 100 },
  { key: 'custom4', label: 'Custom 4', group: 'custom', width: 100 },
  { key: 'custom5', label: 'Custom 5', group: 'custom', width: 100 },
  { key: 'created_at', label: 'Created', group: 'core', width: 140, sortable: true },
  { key: 'updated_at', label: 'Updated', group: 'core', width: 140, sortable: true },
  { key: 'sent_at', label: 'Sent At', group: 'core', width: 140, sortable: true },
]

export const DEFAULT_COLUMNS = [
  'id', 'first_name', 'last_name', 'email', 'country',
  'status', 'fraud_score', 'quality_score', 'affiliate_id',
  'broker_id', 'created_at', 'sale_status',
]

export const DEFAULT_VIEWS: Omit<SavedView, 'id' | 'created_at'>[] = [
  { name: 'All Leads', columns: DEFAULT_COLUMNS, filters: {}, sort: [{ field: 'created_at', direction: 'desc' }], page_size: 50, is_team: true },
  { name: "Today's Leads", columns: DEFAULT_COLUMNS, filters: { date_from: new Date().toISOString().split('T')[0] }, sort: [{ field: 'created_at', direction: 'desc' }], page_size: 50, is_team: true },
  { name: 'Fraud Review', columns: ['id', 'first_name', 'last_name', 'email', 'country', 'status', 'fraud_score', 'ip_address', 'affiliate_id', 'created_at'], filters: { fraud_score_min: 61 }, sort: [{ field: 'fraud_score', direction: 'desc' }], page_size: 50, is_team: true },
  { name: 'Pending', columns: DEFAULT_COLUMNS, filters: { status: ['new', 'processing'] }, sort: [{ field: 'created_at', direction: 'desc' }], page_size: 50, is_team: true },
  { name: 'Converted (FTD)', columns: [...DEFAULT_COLUMNS, 'ftd_amount', 'ftd_at'], filters: { sale_status: 'ftd' }, sort: [{ field: 'ftd_at', direction: 'desc' }], page_size: 50, is_team: true },
]
