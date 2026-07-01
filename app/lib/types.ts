export type ServiceType =
  | 'brandscaling'
  | 'ai-freelancing'
  | 'ai-consultation'
  | 'website-dashboard'
  | 'other'

export type ClientStatus = 'lead' | 'active' | 'completed' | 'churned'
export type AcquisitionSource =
  | 'referral'
  | 'social-media'
  | 'cold-outreach'
  | 'website'
  | 'other'
export type TransactionType = 'income' | 'expense'
export type ProjectStatus =
  | 'planning'
  | 'in-progress'
  | 'review'
  | 'completed'
  | 'paused'

export interface Employee {
  id: string
  name: string
  email?: string
  phone?: string
  role?: string
  commission_rate?: number
  active: boolean
  user_id?: string
  created_at: string
}

export interface Client {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  service_type: ServiceType
  acquisition_source: AcquisitionSource
  status: ClientStatus
  monthly_value: number
  notes?: string
  assigned_to?: string | null
  created_at: string
}

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  category: string
  description: string
  client_id?: string
  client_name?: string
  date: string
  created_at: string
}

export interface Project {
  id: string
  name: string
  client_id?: string
  client_name?: string
  service_type: ServiceType
  status: ProjectStatus
  start_date: string
  end_date?: string
  value: number
  notes?: string
  assigned_to?: string | null
  created_at: string
}

export interface AgentMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export const SERVICE_LABELS: Record<ServiceType, string> = {
  brandscaling: 'Brandscaling',
  'ai-freelancing': 'AI Freelancing',
  'ai-consultation': 'AI Consultation',
  'website-dashboard': 'Website / Dashboard',
  other: 'Other',
}

export const STATUS_LABELS: Record<ClientStatus, string> = {
  lead: 'Lead',
  active: 'Active',
  completed: 'Completed',
  churned: 'Churned',
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: 'Planning',
  'in-progress': 'In Progress',
  review: 'In Review',
  completed: 'Completed',
  paused: 'Paused',
}

export const ACQUISITION_LABELS: Record<AcquisitionSource, string> = {
  referral: 'Referral',
  'social-media': 'Social Media',
  'cold-outreach': 'Cold Outreach',
  website: 'Website',
  other: 'Other',
}
