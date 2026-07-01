'use client'

import { useEffect, useState, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Plus, X, Trash2, Edit2, Trophy, Target, DollarSign, TrendingUp, Users, Star, Copy, CheckCircle2 } from 'lucide-react'

interface Employee { id: string; name: string; email?: string; phone?: string; role: string; commission_rate: number; active: boolean; created_at: string }
interface Lead { id: string; employee_id?: string; employee_name?: string; outreach_status: string; contract_value: number; commission_amount: number }

const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const lbl = 'text-lo text-[9px] uppercase tracking-[0.15em] mb-1.5 block font-medium'
const field = 'w-full bg-[#0A0A0A] border border-[#1E1E1E] text-mid rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-signal/40 placeholder:text-lo/40 transition-colors'

const BLANK = { name: '', email: '', phone: '', role: 'Sales Rep', commission_rate: '10', active: true }

export default function TeamPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [leads, setLeads]         = useState<Lead[]>([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState<Employee | null>(null)
  const [saving, setSaving]       = useState(false)
  const [form, setForm]           = useState({ ...BLANK })
  const [copied, setCopied]       = useState<string | null>(null)
  const sbRef = useRef(createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder_key'
  ))

  const load = async () => {
    const [emps, lds] = await Promise.all([
      fetch('/api/employees').then(r => r.json()),
      fetch('/api/crm-leads').then(r => r.json()),
    ])
    setEmployees(Array.isArray(emps) ? emps : [])
    setLeads(Array.isArray(lds) ? lds : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // ── Realtime ──────────────────────────────────────────────────────────
  useEffect(() => {
    const sb = sbRef.current
    const channel = sb
      .channel('team-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_leads' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => load())
      .subscribe()
    return () => { sb.removeChannel(channel) }
  }, [])

  const copyPortalLink = async (id: string) => {
    const url = `${window.location.origin}/portal/${id}`
    await navigator.clipboard.writeText(url)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const openAdd = () => { setEditing(null); setForm({ ...BLANK }); setShowModal(true) }
  const openEdit = (e: Employee) => {
    setEditing(e)
    setForm({ name: e.name, email: e.email ?? '', phone: e.phone ?? '', role: e.role, commission_rate: String(e.commission_rate), active: e.active })
    setShowModal(true)
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault(); setSaving(true)
    const payload = { ...form, commission_rate: Number(form.commission_rate) }
    if (editing) {
      await fetch(`/api/employees/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    } else {
      await fetch('/api/employees', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    }
    setSaving(false); setShowModal(false); load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this employee?')) return
    await fetch(`/api/employees/${id}`, { method: 'DELETE' }); load()
  }

  // Per-employee stats
  const stats = employees.map(emp => {
    const empLeads   = leads.filter(l => l.employee_id === emp.id || l.employee_name === emp.name)
    const closed     = empLeads.filter(l => l.outreach_status === 'closed_won')
    const active     = empLeads.filter(l => !['closed_won','closed_lost'].includes(l.outreach_status))
    const revenue    = closed.reduce((s, l) => s + Number(l.contract_value), 0)
    const commission = empLeads.reduce((s, l) => s + Number(l.commission_amount), 0)
    const meetings   = empLeads.filter(l => ['meeting_booked','proposal_sent','negotiating','closed_won'].includes(l.outreach_status))
    return { emp, total: empLeads.length, closed: closed.length, active: active.length, revenue, commission, meetings: meetings.length }
  }).sort((a, b) => b.revenue - a.revenue)

  // Team KPIs
  const teamTotalLeads   = leads.length
  const teamClosedDeals  = leads.filter(l => l.outreach_status === 'closed_won').length
  const teamRevenue      = leads.filter(l => l.outreach_status === 'closed_won').reduce((s, l) => s + Number(l.contract_value), 0)

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-lo text-[9px] font-semibold uppercase tracking-[0.22em] mb-1">People</p>
          <h1 className="text-hi text-xl font-semibold tracking-tight">Team Performance</h1>
          <p className="text-lo text-xs mt-1">{employees.filter(e => e.active).length} active · {employees.length} total</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-[#111111] border border-[#1E1E1E] hover:border-[#2A2A2A] text-lo hover:text-mid px-4 py-2 rounded-xl text-xs tracking-wide transition-all">
          <Plus className="h-3.5 w-3.5" /> Add Employee
        </button>
      </div>

      {/* Team KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Team Members',   value: employees.length,  icon: Users,     color: 'text-signal' },
          { label: 'Total Leads',    value: teamTotalLeads,    icon: Target,    color: 'text-warn' },
          { label: 'Deals Closed',   value: teamClosedDeals,   icon: Trophy,    color: 'text-up' },
          { label: 'Team Revenue',   value: fmt(teamRevenue),  icon: DollarSign, color: 'text-up' },
        ].map(k => (
          <div key={k.label} className="bg-[#111111] border border-[#1E1E1E] rounded-2xl p-5 flex items-center gap-4">
            <div className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-xl p-2.5 flex-shrink-0">
              <k.icon className={`h-4 w-4 ${k.color}`} />
            </div>
            <div>
              <p className="text-lo text-[9px] uppercase tracking-[0.12em] mb-1">{k.label}</p>
              <p className={`text-xl font-semibold ${k.color}`}>{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <p className="text-lo text-xs text-center py-16">Loading...</p>
      ) : employees.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Users className="h-8 w-8 text-faint" />
          <p className="text-lo text-sm">No employees yet</p>
          <p className="text-lo text-xs opacity-60">Add your first team member to start tracking performance</p>
          <button onClick={openAdd} className="mt-2 text-signal text-xs border border-signal/25 px-4 py-2 rounded-xl hover:bg-signal/5 transition-all">Add Employee</button>
        </div>
      ) : (
        <>
          {/* Leaderboard */}
          <div className="mb-6">
            <p className="text-lo text-[9px] font-semibold uppercase tracking-[0.22em] mb-4">Leaderboard</p>
            <div className="bg-[#111111] border border-[#1E1E1E] rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1A1A1A]">
                    {['Rank','Employee','Role','Leads','Meetings','Closed','Revenue','Commission'].map(h => (
                      <th key={h} className="text-left px-5 py-3.5 text-lo text-[9px] uppercase tracking-[0.18em] font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.map((s, i) => (
                    <tr key={s.emp.id} className="border-b border-[#141414] last:border-0 hover:bg-[#161616] transition-colors group">
                      <td className="px-5 py-4">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                          i === 0 ? 'bg-warn/10 text-warn border border-warn/20' :
                          i === 1 ? 'bg-signal/10 text-signal border border-signal/20' :
                          i === 2 ? 'bg-[#1A1A1A] text-lo border border-[#242424]' :
                          'bg-[#111111] text-faint border border-[#1A1A1A]'
                        }`}>
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-xl bg-[#1A1A1A] border border-[#222] flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] font-semibold text-mid">{s.emp.name.charAt(0).toUpperCase()}</span>
                          </div>
                          <div>
                            <p className="text-hi text-xs font-medium">{s.emp.name}</p>
                            {!s.emp.active && <span className="text-[9px] text-down">Inactive</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-lo text-xs">{s.emp.role}</td>
                      <td className="px-5 py-4 text-mid text-xs font-medium">{s.total}</td>
                      <td className="px-5 py-4 text-ai text-xs font-medium">{s.meetings}</td>
                      <td className="px-5 py-4 text-up text-xs font-semibold">{s.closed}</td>
                      <td className="px-5 py-4 text-up text-xs font-semibold tabular-nums">{s.revenue > 0 ? fmt(s.revenue) : '—'}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-between">
                          <span className="text-warn text-xs font-medium tabular-nums">{s.commission > 0 ? fmt(s.commission) : '—'}</span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                            <button
                              onClick={() => copyPortalLink(s.emp.id)}
                              title="Copy employee portal link"
                              className={`p-1.5 rounded-lg transition-all ${copied === s.emp.id ? 'text-up' : 'text-lo hover:text-ai hover:bg-[#1C1C1C]'}`}
                            >
                              {copied === s.emp.id ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            </button>
                            <button onClick={() => openEdit(s.emp)} className="p-1.5 rounded-lg hover:bg-[#1C1C1C] text-lo hover:text-signal transition-all">
                              <Edit2 className="h-3 w-3" />
                            </button>
                            <button onClick={() => handleDelete(s.emp.id)} className="p-1.5 rounded-lg hover:bg-[#1C1C1C] text-lo hover:text-down transition-all">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Employee Cards */}
          <div>
            <p className="text-lo text-[9px] font-semibold uppercase tracking-[0.22em] mb-4">Employee Profiles</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {stats.map((s, i) => (
                <div key={s.emp.id} className="bg-[#111111] border border-[#1E1E1E] rounded-2xl p-5 hover:border-[#2A2A2A] transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] border border-[#222] flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold text-mid">{s.emp.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="text-hi text-sm font-semibold">{s.emp.name}</p>
                        <p className="text-lo text-[10px]">{s.emp.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {i === 0 && s.revenue > 0 && <Star className="h-3.5 w-3.5 text-warn" />}
                      <span className={`text-[9px] px-2 py-0.5 rounded-full border ${s.emp.active ? 'text-up border-up/20 bg-up/5' : 'text-lo border-[#1E1E1E] bg-[#1A1A1A]'}`}>
                        {s.emp.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[
                      { label: 'Leads',    value: s.total,    color: 'text-signal' },
                      { label: 'Meetings', value: s.meetings, color: 'text-ai' },
                      { label: 'Closed',   value: s.closed,   color: 'text-up' },
                    ].map(stat => (
                      <div key={stat.label} className="bg-[#0D0D0D] border border-[#1A1A1A] rounded-xl p-2.5 text-center">
                        <p className={`text-base font-semibold ${stat.color}`}>{stat.value}</p>
                        <p className="text-lo text-[9px] uppercase tracking-wide mt-0.5">{stat.label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1.5 text-[10px]">
                    <div className="flex justify-between">
                      <span className="text-lo">Revenue Generated</span>
                      <span className="text-up font-semibold">{s.revenue > 0 ? fmt(s.revenue) : '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-lo">Commission Earned</span>
                      <span className="text-warn font-medium">{s.commission > 0 ? fmt(s.commission) : '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-lo">Commission Rate</span>
                      <span className="text-mid">{s.emp.commission_rate}%</span>
                    </div>
                    {s.emp.email && (
                      <div className="flex justify-between">
                        <span className="text-lo">Email</span>
                        <span className="text-mid truncate max-w-[150px]">{s.emp.email}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-4 pt-4 border-t border-[#1A1A1A]">
                    <button onClick={() => openEdit(s.emp)} className="flex-1 text-[10px] text-lo hover:text-signal border border-[#1E1E1E] hover:border-signal/25 rounded-xl py-1.5 transition-all">Edit</button>
                    <button onClick={() => handleDelete(s.emp.id)} className="text-[10px] text-lo hover:text-down border border-[#1E1E1E] hover:border-down/25 rounded-xl px-3 py-1.5 transition-all">Remove</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
          <div className="bg-[#111111] border border-[#1E1E1E] rounded-2xl w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1A1A1A]">
              <p className="text-hi text-sm font-semibold">{editing ? 'Edit Employee' : 'Add Employee'}</p>
              <button onClick={() => setShowModal(false)} className="text-lo hover:text-mid transition-colors"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className={lbl}>Full Name *</label><input required value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className={field} placeholder="Jane Smith" /></div>
                <div><label className={lbl}>Email</label><input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} className={field} placeholder="jane@company.com" /></div>
                <div><label className={lbl}>Phone</label><input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} className={field} placeholder="+1 (555) 000-0000" /></div>
                <div><label className={lbl}>Role / Title</label><input value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value}))} className={field} placeholder="Sales Rep" /></div>
                <div><label className={lbl}>Commission Rate %</label><input type="number" min="0" max="100" value={form.commission_rate} onChange={e => setForm(f => ({...f, commission_rate: e.target.value}))} className={field} /></div>
                <div className="col-span-2 flex items-center gap-3">
                  <input type="checkbox" id="active" checked={form.active} onChange={e => setForm(f => ({...f, active: e.target.checked}))} className="rounded" />
                  <label htmlFor="active" className="text-mid text-xs">Active employee</label>
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={saving}
                  className="flex-1 border border-signal/25 hover:border-signal/40 hover:bg-signal/5 text-signal px-5 py-2.5 rounded-xl text-xs tracking-wide disabled:opacity-40 transition-all">
                  {saving ? 'Saving...' : editing ? 'Update Employee' : 'Add Employee'}
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
