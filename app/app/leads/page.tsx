'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import {
  Plus, X, Trash2, ChevronUp, ChevronDown, Search,
  Flame, Thermometer, Snowflake, Edit2, Target,
  TrendingUp, DollarSign, Users, AlertCircle,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
type OutreachStatus = 'not_contacted'|'contacted'|'responded'|'meeting_booked'|'proposal_sent'|'negotiating'|'closed_won'|'closed_lost'
type Temperature    = 'cold'|'warm'|'hot'
type DealStatus     = 'new'|'in_progress'|'proposal'|'closed_won'|'closed_lost'

interface Lead {
  id: string; company_name: string; industry?: string
  contact_person?: string; contact_email?: string; contact_phone?: string; contact_socials?: string
  employee_id?: string; employee_name?: string
  outreach_status: OutreachStatus; date_contacted?: string; follow_up_date?: string
  lead_temperature: Temperature; notes?: string; services_pitched?: string
  deal_status: DealStatus; is_signed: boolean
  contract_value: number; monthly_recurring_revenue: number
  commission_amount: number; next_action?: string; close_probability: number
  created_at: string; updated_at: string
}

interface Employee { id: string; name: string; role: string; commission_rate: number; active: boolean }

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUSES: { value: OutreachStatus; label: string; color: string }[] = [
  { value: 'not_contacted',  label: 'Not Contacted',  color: 'text-lo' },
  { value: 'contacted',      label: 'Contacted',      color: 'text-signal' },
  { value: 'responded',      label: 'Responded',      color: 'text-warn' },
  { value: 'meeting_booked', label: 'Meeting Booked', color: 'text-ai' },
  { value: 'proposal_sent',  label: 'Proposal Sent',  color: 'text-warn' },
  { value: 'negotiating',    label: 'Negotiating',    color: 'text-warn' },
  { value: 'closed_won',     label: 'Closed Won',     color: 'text-up' },
  { value: 'closed_lost',    label: 'Closed Lost',    color: 'text-down' },
]

const STATUS_DOT: Record<OutreachStatus, string> = {
  not_contacted: 'bg-lo/40', contacted: 'bg-signal', responded: 'bg-warn',
  meeting_booked: 'bg-ai', proposal_sent: 'bg-warn/70', negotiating: 'bg-warn',
  closed_won: 'bg-up', closed_lost: 'bg-down',
}

const TEMP_ICON = { cold: Snowflake, warm: Thermometer, hot: Flame }
const TEMP_COLOR = { cold: 'text-signal', warm: 'text-warn', hot: 'text-down' }

const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const lbl = 'text-lo text-[9px] uppercase tracking-[0.15em] mb-1.5 block font-medium'
const field = 'w-full bg-[#0A0A0A] border border-[#1E1E1E] text-mid rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-signal/40 placeholder:text-lo/40 transition-colors'

const BLANK_LEAD = {
  company_name: '', industry: '', contact_person: '', contact_email: '',
  contact_phone: '', contact_socials: '', employee_id: '', employee_name: '',
  outreach_status: 'not_contacted' as OutreachStatus, date_contacted: '',
  follow_up_date: '', lead_temperature: 'cold' as Temperature, notes: '',
  services_pitched: '', deal_status: 'new' as DealStatus, is_signed: false,
  contract_value: '', monthly_recurring_revenue: '', commission_amount: '',
  next_action: '', close_probability: '0',
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function LeadsPage() {
  const [leads, setLeads]         = useState<Lead[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState<Lead | null>(null)
  const [saving, setSaving]       = useState(false)
  const [search, setSearch]       = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterTemp, setFilterTemp]     = useState('all')
  const [filterEmp, setFilterEmp]       = useState('all')
  const [sortCol, setSortCol]           = useState<string>('created_at')
  const [sortDir, setSortDir]           = useState<'asc'|'desc'>('desc')
  const [form, setForm] = useState({ ...BLANK_LEAD })

  const sbRef = useRef(createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder_key'
  ))

  const load = async () => {
    const [leadsRes, empsRes] = await Promise.all([
      fetch('/api/crm-leads').then(r => r.json()),
      fetch('/api/employees').then(r => r.json()),
    ])
    setLeads(Array.isArray(leadsRes) ? leadsRes : [])
    setEmployees(Array.isArray(empsRes) ? empsRes : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // ── Realtime: auto-refresh when any crm_lead or employee changes ──────────
  useEffect(() => {
    const sb = sbRef.current
    const channel = sb
      .channel('leads-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_leads' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => load())
      .subscribe()
    return () => { sb.removeChannel(channel) }
  }, [])

  const openAdd = () => { setEditing(null); setForm({ ...BLANK_LEAD }); setShowModal(true) }
  const openEdit = (l: Lead) => {
    setEditing(l)
    setForm({
      company_name: l.company_name, industry: l.industry ?? '',
      contact_person: l.contact_person ?? '', contact_email: l.contact_email ?? '',
      contact_phone: l.contact_phone ?? '', contact_socials: l.contact_socials ?? '',
      employee_id: l.employee_id ?? '', employee_name: l.employee_name ?? '',
      outreach_status: l.outreach_status, date_contacted: l.date_contacted ?? '',
      follow_up_date: l.follow_up_date ?? '', lead_temperature: l.lead_temperature,
      notes: l.notes ?? '', services_pitched: l.services_pitched ?? '',
      deal_status: l.deal_status, is_signed: l.is_signed,
      contract_value: String(l.contract_value), monthly_recurring_revenue: String(l.monthly_recurring_revenue),
      commission_amount: String(l.commission_amount), next_action: l.next_action ?? '',
      close_probability: String(l.close_probability),
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    const payload = {
      ...form,
      contract_value: Number(form.contract_value) || 0,
      monthly_recurring_revenue: Number(form.monthly_recurring_revenue) || 0,
      commission_amount: Number(form.commission_amount) || 0,
      close_probability: Number(form.close_probability) || 0,
      employee_id: form.employee_id || null,
      date_contacted: form.date_contacted || null,
      follow_up_date: form.follow_up_date || null,
      is_signed: form.outreach_status === 'closed_won',
    }
    if (editing) {
      await fetch(`/api/crm-leads/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    } else {
      await fetch('/api/crm-leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    }
    setSaving(false); setShowModal(false); load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this lead?')) return
    await fetch(`/api/crm-leads/${id}`, { method: 'DELETE' }); load()
  }

  const handleStatusChange = async (id: string, outreach_status: OutreachStatus) => {
    await fetch(`/api/crm-leads/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outreach_status, is_signed: outreach_status === 'closed_won' }),
    }); load()
  }

  const sort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const filtered = useMemo(() => {
    let result = [...leads]
    if (search) result = result.filter(l =>
      l.company_name.toLowerCase().includes(search.toLowerCase()) ||
      (l.contact_person ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (l.employee_name ?? '').toLowerCase().includes(search.toLowerCase())
    )
    if (filterStatus !== 'all') result = result.filter(l => l.outreach_status === filterStatus)
    if (filterTemp   !== 'all') result = result.filter(l => l.lead_temperature === filterTemp)
    if (filterEmp    !== 'all') result = result.filter(l => l.employee_name === filterEmp)
    result.sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sortCol] ?? ''
      const bv = (b as unknown as Record<string, unknown>)[sortCol] ?? ''
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1)
    })
    return result
  }, [leads, search, filterStatus, filterTemp, filterEmp, sortCol, sortDir])

  // KPIs
  const totalLeads      = leads.length
  const hotLeads        = leads.filter(l => l.lead_temperature === 'hot').length
  const pipelineValue   = leads.filter(l => !['closed_won','closed_lost'].includes(l.outreach_status)).reduce((s, l) => s + Number(l.contract_value), 0)
  const closedRevenue   = leads.filter(l => l.outreach_status === 'closed_won').reduce((s, l) => s + Number(l.contract_value), 0)
  const overdueFollowUps = leads.filter(l => l.follow_up_date && new Date(l.follow_up_date) < new Date() && !['closed_won','closed_lost'].includes(l.outreach_status)).length

  const SortBtn = ({ col }: { col: string }) => (
    <button onClick={() => sort(col)} className="inline-flex flex-col ml-1 opacity-40 hover:opacity-100">
      <ChevronUp   className={`h-2 w-2 ${sortCol === col && sortDir === 'asc'  ? 'text-signal opacity-100' : ''}`} />
      <ChevronDown className={`h-2 w-2 ${sortCol === col && sortDir === 'desc' ? 'text-signal opacity-100' : ''}`} />
    </button>
  )

  const uniqueEmployees = [...new Set(leads.map(l => l.employee_name).filter(Boolean))] as string[]

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-lo text-[9px] font-semibold uppercase tracking-[0.22em] mb-1">CRM</p>
          <h1 className="text-hi text-xl font-semibold tracking-tight">Lead Tracker</h1>
          <p className="text-lo text-xs mt-1">{totalLeads} leads · {leads.filter(l => l.outreach_status === 'closed_won').length} closed</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-[#111111] border border-[#1E1E1E] hover:border-[#2A2A2A] text-lo hover:text-mid px-4 py-2 rounded-xl text-xs tracking-wide transition-all">
          <Plus className="h-3.5 w-3.5" /> Add Lead
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Total Leads',    value: totalLeads,                       icon: Users,        color: 'text-signal' },
          { label: 'Hot Leads',      value: hotLeads,                         icon: Flame,        color: 'text-down' },
          { label: 'Pipeline Value', value: fmt(pipelineValue),               icon: TrendingUp,   color: 'text-warn' },
          { label: 'Closed Revenue', value: fmt(closedRevenue),               icon: DollarSign,   color: 'text-up' },
          { label: 'Overdue Follow-ups', value: overdueFollowUps,             icon: AlertCircle,  color: overdueFollowUps > 0 ? 'text-down' : 'text-lo' },
        ].map(k => (
          <div key={k.label} className="bg-[#111111] border border-[#1E1E1E] rounded-2xl p-4 flex items-center gap-3">
            <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-xl p-2 flex-shrink-0">
              <k.icon className={`h-3.5 w-3.5 ${k.color}`} />
            </div>
            <div>
              <p className="text-lo text-[9px] uppercase tracking-[0.12em] mb-0.5">{k.label}</p>
              <p className={`text-base font-semibold ${k.color}`}>{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5 items-center">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-lo" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search leads..."
            className="w-full bg-[#111111] border border-[#1E1E1E] rounded-xl pl-8 pr-3 py-2 text-xs text-mid placeholder:text-lo/50 focus:outline-none focus:border-signal/30 transition-colors" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="bg-[#111111] border border-[#1E1E1E] text-lo rounded-xl px-3 py-2 text-xs focus:outline-none">
          <option value="all">All Statuses</option>
          {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={filterTemp} onChange={e => setFilterTemp(e.target.value)}
          className="bg-[#111111] border border-[#1E1E1E] text-lo rounded-xl px-3 py-2 text-xs focus:outline-none">
          <option value="all">All Temps</option>
          <option value="hot">🔥 Hot</option>
          <option value="warm">🌡 Warm</option>
          <option value="cold">❄ Cold</option>
        </select>
        {uniqueEmployees.length > 0 && (
          <select value={filterEmp} onChange={e => setFilterEmp(e.target.value)}
            className="bg-[#111111] border border-[#1E1E1E] text-lo rounded-xl px-3 py-2 text-xs focus:outline-none">
            <option value="all">All Employees</option>
            {uniqueEmployees.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-lo text-xs text-center py-16">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Target className="h-8 w-8 text-faint" />
          <p className="text-lo text-sm">{leads.length === 0 ? 'No leads yet' : 'No leads match'}</p>
          <p className="text-lo text-xs opacity-60">{leads.length === 0 ? 'Add your first lead to start tracking' : 'Try a different filter'}</p>
          {leads.length === 0 && <button onClick={openAdd} className="mt-2 text-signal text-xs border border-signal/25 px-4 py-2 rounded-xl hover:bg-signal/5 transition-all">Add Lead</button>}
        </div>
      ) : (
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-[#1A1A1A]">
                  {[
                    { label: 'Company', col: 'company_name' },
                    { label: 'Contact', col: 'contact_person' },
                    { label: 'Employee', col: 'employee_name' },
                    { label: 'Status', col: 'outreach_status' },
                    { label: 'Temp', col: 'lead_temperature' },
                    { label: 'Follow-up', col: 'follow_up_date' },
                    { label: 'Value', col: 'contract_value' },
                    { label: 'Prob %', col: 'close_probability' },
                    { label: '', col: '' },
                  ].map(h => (
                    <th key={h.label} className="text-left px-4 py-3.5 text-lo text-[9px] uppercase tracking-[0.18em] font-semibold whitespace-nowrap">
                      {h.label}{h.col && <SortBtn col={h.col} />}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(lead => {
                  const TempIcon  = TEMP_ICON[lead.lead_temperature]
                  const isOverdue = lead.follow_up_date && new Date(lead.follow_up_date) < new Date() && !['closed_won','closed_lost'].includes(lead.outreach_status)
                  return (
                    <tr key={lead.id} className="border-b border-[#141414] last:border-0 hover:bg-[#161616] transition-colors group">
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-hi text-xs font-medium">{lead.company_name}</p>
                          {lead.industry && <p className="text-lo text-[10px] mt-0.5">{lead.industry}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-mid text-xs">{lead.contact_person ?? '—'}</p>
                          {lead.contact_email && <p className="text-lo text-[10px] mt-0.5">{lead.contact_email}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-mid text-xs">{lead.employee_name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[lead.outreach_status]}`} />
                          <select value={lead.outreach_status}
                            onChange={e => handleStatusChange(lead.id, e.target.value as OutreachStatus)}
                            className={`text-xs font-medium bg-transparent border-0 cursor-pointer focus:outline-none ${STATUSES.find(s => s.value === lead.outreach_status)?.color ?? 'text-lo'}`}
                            style={{ appearance: 'none' }}>
                            {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <TempIcon className={`h-3.5 w-3.5 ${TEMP_COLOR[lead.lead_temperature]}`} />
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs ${isOverdue ? 'text-down font-medium' : 'text-lo'}`}>
                          {lead.follow_up_date ?? '—'}
                          {isOverdue && <span className="ml-1 text-[9px]">OVERDUE</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold tabular-nums ${lead.outreach_status === 'closed_won' ? 'text-up' : 'text-hi'}`}>
                          {lead.contract_value > 0 ? fmt(Number(lead.contract_value)) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1 bg-[#1A1A1A] rounded-full overflow-hidden">
                            <div className="h-full bg-signal/60 rounded-full" style={{ width: `${lead.close_probability}%` }} />
                          </div>
                          <span className="text-lo text-[10px]">{lead.close_probability}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(lead)} className="p-1.5 rounded-lg hover:bg-[#1C1C1C] text-lo hover:text-signal transition-all">
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleDelete(lead.id)} className="p-1.5 rounded-lg hover:bg-[#1C1C1C] text-lo hover:text-down transition-all">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#111111] border border-[#1E1E1E] rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1A1A1A] sticky top-0 bg-[#111111] z-10">
              <p className="text-hi text-sm font-semibold">{editing ? 'Edit Lead' : 'Add New Lead'}</p>
              <button onClick={() => setShowModal(false)} className="text-lo hover:text-mid transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Company Info */}
              <div>
                <p className="text-lo text-[9px] uppercase tracking-[0.2em] mb-3 font-semibold">Company</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={lbl}>Company Name *</label><input required value={form.company_name} onChange={e => setForm(f => ({...f, company_name: e.target.value}))} className={field} placeholder="Acme Corp" /></div>
                  <div><label className={lbl}>Industry / Niche</label><input value={form.industry} onChange={e => setForm(f => ({...f, industry: e.target.value}))} className={field} placeholder="E-commerce, SaaS, Restaurant..." /></div>
                </div>
              </div>

              {/* Contact Info */}
              <div>
                <p className="text-lo text-[9px] uppercase tracking-[0.2em] mb-3 font-semibold">Contact</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={lbl}>Contact Person</label><input value={form.contact_person} onChange={e => setForm(f => ({...f, contact_person: e.target.value}))} className={field} placeholder="John Smith" /></div>
                  <div><label className={lbl}>Email</label><input type="email" value={form.contact_email} onChange={e => setForm(f => ({...f, contact_email: e.target.value}))} className={field} placeholder="john@acme.com" /></div>
                  <div><label className={lbl}>Phone</label><input value={form.contact_phone} onChange={e => setForm(f => ({...f, contact_phone: e.target.value}))} className={field} placeholder="+1 (555) 000-0000" /></div>
                  <div><label className={lbl}>Socials / LinkedIn</label><input value={form.contact_socials} onChange={e => setForm(f => ({...f, contact_socials: e.target.value}))} className={field} placeholder="linkedin.com/in/johnsmith" /></div>
                </div>
              </div>

              {/* Outreach */}
              <div>
                <p className="text-lo text-[9px] uppercase tracking-[0.2em] mb-3 font-semibold">Outreach</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>Assigned Employee</label>
                    <select
                      value={form.employee_id === '' && form.employee_name === 'Rohan Rahman (Admin)' ? '__admin__' : form.employee_id}
                      onChange={e => {
                        if (e.target.value === '__admin__') {
                          setForm(f => ({ ...f, employee_id: '', employee_name: 'Rohan Rahman (Admin)' }))
                        } else {
                          setForm(f => ({ ...f, employee_id: e.target.value, employee_name: '' }))
                        }
                      }}
                      className={field}
                    >
                      <option value="">Unassigned</option>
                      <option value="__admin__">Rohan Rahman (Admin)</option>
                      {employees.filter(e => e.active).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Outreach Status</label>
                    <select value={form.outreach_status} onChange={e => setForm(f => ({...f, outreach_status: e.target.value as OutreachStatus}))} className={field}>
                      {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div><label className={lbl}>Date Contacted</label><input type="date" value={form.date_contacted} onChange={e => setForm(f => ({...f, date_contacted: e.target.value}))} className={field} /></div>
                  <div><label className={lbl}>Follow-up Date</label><input type="date" value={form.follow_up_date} onChange={e => setForm(f => ({...f, follow_up_date: e.target.value}))} className={field} /></div>
                  <div>
                    <label className={lbl}>Lead Temperature</label>
                    <select value={form.lead_temperature} onChange={e => setForm(f => ({...f, lead_temperature: e.target.value as Temperature}))} className={field}>
                      <option value="cold">❄ Cold</option>
                      <option value="warm">🌡 Warm</option>
                      <option value="hot">🔥 Hot</option>
                    </select>
                  </div>
                  <div><label className={lbl}>Close Probability %</label><input type="number" min="0" max="100" value={form.close_probability} onChange={e => setForm(f => ({...f, close_probability: e.target.value}))} className={field} placeholder="0–100" /></div>
                </div>
              </div>

              {/* Deal Info */}
              <div>
                <p className="text-lo text-[9px] uppercase tracking-[0.2em] mb-3 font-semibold">Deal</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={lbl}>Contract Value ($)</label><input type="number" min="0" value={form.contract_value} onChange={e => setForm(f => ({...f, contract_value: e.target.value}))} className={field} placeholder="0.00" /></div>
                  <div><label className={lbl}>Monthly MRR ($)</label><input type="number" min="0" value={form.monthly_recurring_revenue} onChange={e => setForm(f => ({...f, monthly_recurring_revenue: e.target.value}))} className={field} placeholder="0.00" /></div>
                  <div><label className={lbl}>Commission Amount ($)</label><input type="number" min="0" value={form.commission_amount} onChange={e => setForm(f => ({...f, commission_amount: e.target.value}))} className={field} placeholder="0.00" /></div>
                  <div>
                    <label className={lbl}>Services Pitched</label>
                    <input value={form.services_pitched} onChange={e => setForm(f => ({...f, services_pitched: e.target.value}))} className={field} placeholder="AI Consultation, Brandscaling..." />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <p className="text-lo text-[9px] uppercase tracking-[0.2em] mb-3 font-semibold">Notes & Actions</p>
                <div className="space-y-3">
                  <div><label className={lbl}>Next Action Needed</label><input value={form.next_action} onChange={e => setForm(f => ({...f, next_action: e.target.value}))} className={field} placeholder="Send proposal, Schedule demo call..." /></div>
                  <div><label className={lbl}>Notes</label>
                    <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} rows={3}
                      className="w-full bg-[#0A0A0A] border border-[#1E1E1E] text-mid rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-signal/40 placeholder:text-lo/40 transition-colors resize-none"
                      placeholder="Additional context, conversation history..." />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving}
                  className="flex-1 border border-signal/25 hover:border-signal/40 hover:bg-signal/5 text-signal px-5 py-2.5 rounded-xl text-xs tracking-wide disabled:opacity-40 transition-all">
                  {saving ? 'Saving...' : editing ? 'Update Lead' : 'Add Lead'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="text-lo hover:text-mid text-xs px-4 py-2 transition-colors">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
