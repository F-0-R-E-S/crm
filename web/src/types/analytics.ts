export interface KPITile {
  key: string
  label: string
  value: number
  formatted: string
  delta_pct: number
  delta_abs: number
  trend: 'up' | 'down' | 'flat'
  icon: string
  color: string
}

export interface DashboardKPIs {
  tiles: KPITile[]
  period: string
  updated_at: string
}

export interface TimeSeriesPoint {
  date: string
  value: number
}

export interface TimeSeriesData {
  metric: string
  label: string
  color: string
  points: TimeSeriesPoint[]
}

export interface AffiliatePnL {
  affiliate_id: string
  affiliate_name: string
  leads_sent: number
  leads_accepted: number
  ftd_count: number
  ftd_rate: number
  revenue: number
  cost: number
  profit: number
  margin_pct: number
  epc: number
  children?: BrokerPnL[]
}

export interface BrokerPnL {
  broker_id: string
  broker_name: string
  leads_sent: number
  ftd_count: number
  cr_pct: number
  revenue: number
  cost: number
  profit: number
  roi_pct: number
  avg_response_ms: number
  rank_change?: number
  children?: GeoPnL[]
}

export interface GeoPnL {
  country: string
  leads: number
  ftd_count: number
  cr_pct: number
  revenue: number
}

export interface CohortRow {
  cohort_date: string
  cohort_size: number
  values: Array<{ period: number; value: number }>
}

export interface CohortData {
  metric: string
  granularity: 'day' | 'week' | 'month'
  rows: CohortRow[]
}

export interface CapStatus {
  broker_id: string
  broker_name: string
  daily_cap: number
  daily_used: number
  daily_pct: number
  total_cap: number
  total_used: number
  total_pct: number
  eta_full_minutes?: number
  fill_rate_per_hour: number
  status: 'normal' | 'warning' | 'critical' | 'full'
}

export interface ShaveEvent {
  id: string
  lead_id: string
  broker_id: string
  broker_name: string
  affiliate_id: string
  old_status: string
  new_status: string
  detected_at: string
  acknowledged: boolean
}

export interface ShaveStats {
  total_events: number
  shave_rate_pct: number
  by_broker: Array<{
    broker_id: string
    broker_name: string
    events: number
    rate_pct: number
    is_anomaly: boolean
  }>
  trend_30d: TimeSeriesPoint[]
}

export interface ReportDimension {
  key: string
  label: string
  type: 'string' | 'date' | 'number'
}

export interface ReportMetric {
  key: string
  label: string
  format: 'number' | 'currency' | 'percent' | 'duration'
  aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max'
}

export const REPORT_DIMENSIONS: ReportDimension[] = [
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'week', label: 'Week', type: 'date' },
  { key: 'month', label: 'Month', type: 'date' },
  { key: 'country', label: 'Country', type: 'string' },
  { key: 'affiliate_id', label: 'Affiliate', type: 'string' },
  { key: 'broker_id', label: 'Broker', type: 'string' },
  { key: 'funnel_id', label: 'Funnel', type: 'string' },
  { key: 'offer_id', label: 'Offer', type: 'string' },
  { key: 'status', label: 'Status', type: 'string' },
  { key: 'sale_status', label: 'Sale Status', type: 'string' },
  { key: 'source', label: 'Source', type: 'string' },
  { key: 'utm_source', label: 'UTM Source', type: 'string' },
  { key: 'utm_medium', label: 'UTM Medium', type: 'string' },
  { key: 'utm_campaign', label: 'UTM Campaign', type: 'string' },
  { key: 'device_type', label: 'Device', type: 'string' },
]

export const REPORT_METRICS: ReportMetric[] = [
  { key: 'leads_count', label: 'Leads', format: 'number', aggregation: 'count' },
  { key: 'leads_sent', label: 'Leads Sent', format: 'number', aggregation: 'count' },
  { key: 'leads_accepted', label: 'Accepted', format: 'number', aggregation: 'count' },
  { key: 'leads_rejected', label: 'Rejected', format: 'number', aggregation: 'count' },
  { key: 'ftd_count', label: 'FTD Count', format: 'number', aggregation: 'count' },
  { key: 'cr_pct', label: 'Conversion Rate', format: 'percent', aggregation: 'avg' },
  { key: 'revenue', label: 'Revenue', format: 'currency', aggregation: 'sum' },
  { key: 'cost', label: 'Cost', format: 'currency', aggregation: 'sum' },
  { key: 'profit', label: 'Profit', format: 'currency', aggregation: 'sum' },
  { key: 'margin_pct', label: 'Margin %', format: 'percent', aggregation: 'avg' },
  { key: 'roi_pct', label: 'ROI %', format: 'percent', aggregation: 'avg' },
  { key: 'epc', label: 'EPC', format: 'currency', aggregation: 'avg' },
  { key: 'avg_fraud_score', label: 'Avg Fraud Score', format: 'number', aggregation: 'avg' },
  { key: 'fraud_blocked', label: 'Fraud Blocked', format: 'number', aggregation: 'count' },
  { key: 'avg_response_ms', label: 'Avg Response Time', format: 'duration', aggregation: 'avg' },
  { key: 'shave_count', label: 'Shave Events', format: 'number', aggregation: 'count' },
  { key: 'shave_rate', label: 'Shave Rate', format: 'percent', aggregation: 'avg' },
  { key: 'cap_usage_pct', label: 'Cap Usage', format: 'percent', aggregation: 'avg' },
  { key: 'unique_countries', label: 'Unique GEOs', format: 'number', aggregation: 'count' },
  { key: 'avg_quality_score', label: 'Avg Quality', format: 'number', aggregation: 'avg' },
  { key: 'duplicate_pct', label: 'Duplicate Rate', format: 'percent', aggregation: 'avg' },
  { key: 'ftd_amount', label: 'FTD Amount', format: 'currency', aggregation: 'sum' },
  { key: 'avg_time_to_ftd', label: 'Avg Time to FTD', format: 'duration', aggregation: 'avg' },
  { key: 'fill_rate', label: 'Fill Rate', format: 'percent', aggregation: 'avg' },
  { key: 'rejection_rate', label: 'Rejection Rate', format: 'percent', aggregation: 'avg' },
]

export interface SavedReport {
  id: string
  name: string
  dimensions: string[]
  metrics: string[]
  filters: Record<string, unknown>
  sort?: { field: string; direction: 'asc' | 'desc' }
  created_at: string
}

export interface DashboardWidget {
  id: string
  type: 'kpi' | 'line' | 'bar' | 'pie' | 'table' | 'heatmap' | 'gauge' | 'funnel' | 'sparkline' | 'text'
  title: string
  config: Record<string, unknown>
  x: number
  y: number
  w: number
  h: number
}

export interface CustomDashboard {
  id: string
  name: string
  widgets: DashboardWidget[]
  auto_refresh_seconds?: number
  is_team: boolean
  created_at: string
  updated_at: string
}
