'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Client, Transaction, Project } from '@/lib/types'
import { useRole } from '@/lib/hooks/use-role'
import {
  TrendingUp, TrendingDown, Users, Sparkles, RefreshCw,
  ArrowUpRight, DollarSign, Activity, Briefcase, Target, Flame, AlertCircle,
} from 'lucide-react'
import { format } from 'date-fns'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'

/* Muted premium chart palette */
const C_SIGNAL = '#7A8699'
const C_UP     = '#10B981'
const C_DOWN   = '#F43F5E'
const C_SKY    = '#3B82F6'
const C_VIOLET = '#A855F7'
const C_CYAN   = '#22D3EE'
const PALETTE  = [C_SIGNAL, C_UP, C_CYAN, C_VIOLET, C_DOWN]

const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

const tipStyle = { background: '#0B0E13', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: 11, color: '#8A93A3' }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Tip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={tipStyle} className="px-4 py-3 shadow-2xl">
      {label && <p className="text-lo text-xs mb-2">{label}</p>}
      {payload.map((p: { name: string; value: number; color: string }, i: number) => (
        <p key={i} className="text-xs font-medium" style={{ color: p.color }}>
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  )
}

interface MonthlyPoint { label: string; income: number; expenses: number; profit: number }
interface ServicePoint  { name: string; value: number }

function StatCard({
  title, value, sub, icon, trend,
}: {
  title: string; value: string; sub?: string; icon: React.ReactNode; trend?: 'up' | 'down' | 'neutral'
}) {
  const iconColor   = trend === 'up' ? 'text-up'   : trend === 'down' ? 'text-down'   : 'text-signal'
  const iconBg      = trend === 'up' ? 'bg-[#121A12] border-[#1D281D]'
                    : trend === 'down' ? 'bg-[#181818] border-[#252525]'
                    : 'bg-[#1C1C1C] border-[#282828]'
  const badgeColor  = trend === 'up' ? 'bg-up/10 text-up'   : trend === 'down' ? 'bg-down/10 text-down'   : 'bg-signal/10 text-signal'
  const badgeLabel  = trend === 'up' ? '↑ Positive' : trend === 'down' ? '↓ Review' : 'Tracking'

  return (
    <div className="relative bg-[#111111] border border-[#1E1E1E] rounded-2xl p-5 overflow-hidden group hover:border-[#2A2A2A] transition-all duration-200">
      <div className="flex items-start justify-between mb-5">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${iconBg}`}>
          <span className={iconColor}>{icon}</span>
        </div>
        <span className={`text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${badgeColor}`}>
          {badgeLabel}
        </span>
      </div>
      <p className="text-lo text-[9px] uppercase tracking-[0.18em] mb-1">{title}</p>
      <p className="text-hi text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      {sub && (
        <p className={`text-[11px] mt-1.5 ${trend === 'up' ? 'text-up' : trend === 'down' ? 'text-down' : 'text-lo'}`}>
          {sub}
        </p>
      )}
    </div>
  )
}

const axis = { fill: '#5F6872', fontSize: 10 }
const grid = { strokeDasharray: '3 6', stroke: '#1E1E1E' }

interface CRMSummary { total: number; hot: number; pipelineValue: number; overdueFollowUps: number }

export default function DashboardPage() {
  const role = useRole()
  const isOwner = role === 'owner'

  const [clients, setClients]           = useState<Client[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [projects, setProjects]         = useState<Project[]>([])
  const [monthlyData, setMonthlyData]   = useState<MonthlyPoint[]>([])
  const [serviceRevenue, setServiceRevenue] = useState<ServicePoint[]>([])
  const [crm, setCrm]                   = useState<CRMSummary>({ total: 0, hot: 0, pipelineValue: 0, overdueFollowUps: 0 })
  const [insights, setInsights]         = useState('')
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [loading, setLoading]           = useState(true)
  const sbRef = useRef(createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder_key'
  ))

  const loadCRM = useCallback(async () => {
    const res = await fetch('/api/crm-leads').then(r => r.json()).catch(() => [])
    const leadsArr = Array.isArray(res) ? res : []
    const today = new Date().toISOString().split('T')[0]
    setCrm({
      total: leadsArr.length,
      hot: leadsArr.filter((l: { lead_temperature: string }) => l.lead_temperature === 'hot').length,
      pipelineValue: leadsArr.filter((l: { outreach_status: string }) => !['closed_won','closed_lost'].includes(l.outreach_status)).reduce((s: number, l: { contract_value: number }) => s + Number(l.contract_value), 0),
      overdueFollowUps: leadsArr.filter((l: { follow_up_date?: string; outreach_status: string }) => l.follow_up_date && l.follow_up_date < today && !['closed_won','closed_lost'].includes(l.outreach_status)).length,
    })
  }, [])

  const load = useCallback(() => {
    Promise.all([
      fetch('/api/clients').then(r => r.json()),
      fetch('/api/finance').then(r => r.json()),
      fetch('/api/projects').then(r => r.json()),
      fetch('/api/analytics').then(r => r.json()),
    ]).then(([c, t, p, a]) => {
      setClients(Array.isArray(c) ? c : [])
      setTransactions(Array.isArray(t) ? t : [])
      setProjects(Array.isArray(p) ? p : [])
      if (a && !a.error) { setMonthlyData(a.monthlyData ?? []); setServiceRevenue(a.serviceRevenue ?? []) }
      setLoading(false)
    })
    loadCRM()
  }, [loadCRM])

  useEffect(() => { load() }, [load])

  // ── Realtime: re-fetch leads when any employee updates them ──────────
  useEffect(() => {
    const sb = sbRef.current
    const channel = sb
      .channel('dashboard-crm')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_leads' }, () => loadCRM())
      .subscribe()
    return () => { sb.removeChannel(channel) }
  }, [loadCRM])

  const loadInsights = async () => {
    setInsightsLoading(true); setInsights('')
    const d = await fetch('/api/insights').then(r => r.json())
    setInsights(d.insights ?? d.error ?? 'Unable to generate insights.')
    setInsightsLoading(false)
  }

  const now       = new Date()
  const thisMonth = format(now, 'yyyy-MM')
  const income    = transactions.filter(t => t.type === 'income'  && t.date?.startsWith(thisMonth)).reduce((s, t) => s + Number(t.amount), 0)
  const expenses  = transactions.filter(t => t.type === 'expense' && t.date?.startsWith(thisMonth)).reduce((s, t) => s + Number(t.amount), 0)
  const profit    = income - expenses
  const mrr       = clients.filter(c => c.status === 'active').reduce((s, c) => s + Number(c.monthly_value), 0)
  const active    = clients.filter(c => c.status === 'active').length
  const crmLeads  = crm.total

  if (loading || role === null) return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-lo text-xs tracking-[0.2em] uppercase">Loading</p>
    </div>
  )

  return (
    <div className="p-4 md:p-8 max-w-7xl">

      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-lo text-[9px] font-semibold uppercase tracking-[0.22em] mb-1.5">
            {format(now, 'EEEE · MMMM d, yyyy')}
          </p>
          <h1 className="text-hi text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="text-lo text-xs mt-1">Your AI-powered business at a glance</p>
        </div>
        <button
          onClick={loadInsights} disabled={insightsLoading}
          className="flex items-center gap-2 border border-[#1E1E1E] hover:border-signal/30 text-mid hover:text-signal px-4 py-2 rounded-xl text-xs tracking-wide transition-all disabled:opacity-40 bg-[#111111]"
        >
          {insightsLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          {insightsLoading ? 'Analyzing...' : 'AI Insights'}
        </button>
      </div>

      {/* AI Insights */}
      {insights && (
        <div className="mb-6 border border-ai/20 bg-[#141414] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-3 w-3 text-ai" />
            <p className="text-ai text-[9px] uppercase tracking-[0.22em] font-semibold">AI Analysis</p>
          </div>
          <p className="text-mid text-sm leading-relaxed whitespace-pre-line">{insights}</p>
        </div>
      )}

      {/* KPI Cards — Financial (owner only) */}
      {isOwner && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          <StatCard title="Monthly MRR"    value={fmt(mrr)}      sub="Recurring revenue"           icon={<Activity   className="h-3.5 w-3.5" />} trend="neutral" />
          <StatCard title="Net Profit"     value={fmt(profit)}   sub={profit >= 0 ? 'Month positive' : 'Month negative'} icon={profit >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />} trend={profit >= 0 ? 'up' : 'down'} />
          <StatCard title="Expenses"       value={fmt(expenses)} sub={format(now, 'MMMM')}         icon={<DollarSign className="h-3.5 w-3.5" />} trend="neutral" />
          <StatCard title="Active Clients" value={String(active)} sub={`${crmLeads} CRM leads`}   icon={<Users      className="h-3.5 w-3.5" />} trend={active > 0 ? 'up' : 'neutral'} />
        </div>
      )}

      {/* KPI Cards — CRM Pipeline (live) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard title="Pipeline Value"   value={fmt(crm.pipelineValue)}    sub="Open deal value"            icon={<Target      className="h-3.5 w-3.5" />} trend={crm.pipelineValue > 0 ? 'up' : 'neutral'} />
        <StatCard title="Hot Leads"        value={String(crm.hot)}           sub={`of ${crm.total} total`}   icon={<Flame       className="h-3.5 w-3.5" />} trend={crm.hot > 0 ? 'up' : 'neutral'} />
        <StatCard title="CRM Leads"        value={String(crm.total)}         sub="Tracked by team"           icon={<Briefcase   className="h-3.5 w-3.5" />} trend="neutral" />
        <StatCard title="Overdue Follow-ups" value={String(crm.overdueFollowUps)} sub="Need attention"      icon={<AlertCircle className="h-3.5 w-3.5" />} trend={crm.overdueFollowUps > 0 ? 'down' : 'up'} />
      </div>

      {/* Row 1: Revenue chart + service mix (owner only) */}
      {isOwner && <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">

        <div className="lg:col-span-2 bg-[#111111] border border-[#1E1E1E] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-hi text-sm font-semibold">Revenue vs Expenses</p>
              <p className="text-lo text-xs mt-0.5">7-month rolling view</p>
            </div>
            <div className="flex gap-4 text-[10px] text-lo">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-px rounded" style={{ background: C_UP }} /> Income
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-px rounded" style={{ background: C_DOWN }} /> Expenses
              </span>
            </div>
          </div>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={monthlyData} margin={{ left: -24 }}>
                <defs>
                  <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C_UP}   stopOpacity={0.18} />
                    <stop offset="95%" stopColor={C_UP}   stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gD" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C_DOWN} stopOpacity={0.12} />
                    <stop offset="95%" stopColor={C_DOWN} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...grid} />
                <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} />
                <YAxis tick={axis} axisLine={false} tickLine={false} tickFormatter={v => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                <Tooltip content={<Tip />} />
                <Area type="monotone" dataKey="income"   name="Income"   stroke={C_UP}   strokeWidth={1.5} fill="url(#gS)" dot={false} />
                <Area type="monotone" dataKey="expenses" name="Expenses" stroke={C_DOWN} strokeWidth={1.5} fill="url(#gD)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex flex-col items-center justify-center gap-2">
              <TrendingUp className="h-6 w-6 text-faint" />
              <p className="text-lo text-xs">Add transactions to see your revenue trend</p>
            </div>
          )}
        </div>

        <div className="bg-[#111111] border border-[#1E1E1E] rounded-2xl p-5">
          <p className="text-hi text-sm font-semibold mb-0.5">By Service</p>
          <p className="text-lo text-xs mb-5">Monthly value mix</p>
          {serviceRevenue.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={serviceRevenue} cx="50%" cy="50%" innerRadius={40} outerRadius={64} paddingAngle={3} dataKey="value">
                    {serviceRevenue.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} opacity={0.9} />)}
                  </Pie>
                  <Tooltip formatter={v => fmt(Number(v))} contentStyle={tipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-3">
                {serviceRevenue.map((s, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-mid text-[10px]">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
                      {s.name}
                    </span>
                    <span className="text-lo text-[10px]">{fmt(s.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[140px] flex flex-col items-center justify-center gap-2">
              <Briefcase className="h-5 w-5 text-faint" />
              <p className="text-lo text-xs">Add clients to see mix</p>
            </div>
          )}
        </div>
      </div>}

      {/* Row 2: Profit bars + recent transactions (owner only) */}
      {isOwner && <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

        <div className="bg-[#111111] border border-[#1E1E1E] rounded-2xl p-5">
          <p className="text-hi text-sm font-semibold mb-0.5">Monthly Profit</p>
          <p className="text-lo text-xs mb-4">Net after all expenses</p>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={monthlyData} margin={{ left: -24 }}>
                <CartesianGrid {...grid} vertical={false} />
                <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} />
                <YAxis tick={axis} axisLine={false} tickLine={false} tickFormatter={v => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                <Tooltip content={<Tip />} />
                <Bar dataKey="profit" name="Profit" radius={[4, 4, 0, 0]}>
                  {monthlyData.map((e, i) => <Cell key={i} fill={e.profit >= 0 ? C_UP : C_DOWN} fillOpacity={0.8} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[150px] flex items-center justify-center">
              <p className="text-lo text-xs">No data yet</p>
            </div>
          )}
        </div>

        <div className="bg-[#111111] border border-[#1E1E1E] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-hi text-sm font-semibold">Recent Transactions</p>
              <p className="text-lo text-xs mt-0.5">Latest financial activity</p>
            </div>
            <a href="/finance" className="text-lo hover:text-signal text-[10px] flex items-center gap-1 transition-colors">
              All <ArrowUpRight className="h-3 w-3" />
            </a>
          </div>
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <DollarSign className="h-5 w-5 text-faint" />
              <p className="text-lo text-xs">No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {transactions.slice(0, 5).map(t => (
                <div key={t.id} className="flex items-center justify-between py-2.5 border-b border-[#171717] last:border-0">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${t.type === 'income' ? 'bg-up' : 'bg-down'}`} />
                    <div>
                      <p className="text-mid text-xs">{t.description || t.category}</p>
                      <p className="text-lo text-[10px]">{t.date}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold tabular-nums ${t.type === 'income' ? 'text-up' : 'text-down'}`}>
                    {t.type === 'income' ? '+' : '−'}{fmt(Number(t.amount))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>}

      {/* Bottom: Clients + Active projects */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        <div className="bg-[#111111] border border-[#1E1E1E] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-hi text-sm font-semibold">Clients</p>
              <p className="text-lo text-xs mt-0.5">{active} active · {clients.filter(c => c.status === 'lead').length} leads</p>
            </div>
            <a href="/clients" className="text-lo hover:text-signal text-[10px] flex items-center gap-1 transition-colors">
              All <ArrowUpRight className="h-3 w-3" />
            </a>
          </div>
          {clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <Users className="h-5 w-5 text-faint" />
              <p className="text-lo text-xs">No clients yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {clients.slice(0, 4).map(c => (
                <div key={c.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-[#171717] border border-[#1E1E1E] flex items-center justify-center text-mid text-[11px] font-semibold flex-shrink-0">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-mid text-xs font-medium">{c.name}</p>
                      <p className="text-lo text-[10px]">{c.service_type.replace(/-/g, ' ')}</p>
                    </div>
                  </div>
                  <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${
                    c.status === 'active'    ? 'bg-up/10 text-up' :
                    c.status === 'lead'      ? 'bg-signal/10 text-signal' :
                    c.status === 'completed' ? 'bg-[#1A1A1A] text-mid' :
                    'bg-down/10 text-down'
                  }`}>
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-[#111111] border border-[#1E1E1E] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-hi text-sm font-semibold">Active Projects</p>
              <p className="text-lo text-xs mt-0.5">{projects.filter(p => p.status === 'in-progress').length} in progress</p>
            </div>
            <a href="/projects" className="text-lo hover:text-signal text-[10px] flex items-center gap-1 transition-colors">
              All <ArrowUpRight className="h-3 w-3" />
            </a>
          </div>
          {projects.filter(p => p.status === 'in-progress').length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <Briefcase className="h-5 w-5 text-faint" />
              <p className="text-lo text-xs">No active projects</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {projects.filter(p => p.status === 'in-progress').slice(0, 4).map(p => (
                <div key={p.id} className="border border-[#1E1E1E] rounded-xl p-3.5 hover:border-[#2A2A2A] hover:bg-[#171717] transition-all">
                  <div className="flex items-start justify-between mb-1.5">
                    <p className="text-mid text-xs font-semibold leading-tight">{p.name}</p>
                    <span className="text-[8px] font-semibold bg-signal/10 text-signal px-1.5 py-0.5 rounded-full ml-2 flex-shrink-0">Active</span>
                  </div>
                  <p className="text-lo text-[10px] mb-2.5">{p.client_name ?? 'No client'}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-lo text-[10px]">{p.service_type.replace(/-/g, ' ')}</span>
                    {isOwner && <span className="text-up text-xs font-semibold">{fmt(Number(p.value))}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
