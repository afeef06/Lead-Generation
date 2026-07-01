'use client'

import { useEffect, useState } from 'react'
import { Project, Client, Employee, SERVICE_LABELS, PROJECT_STATUS_LABELS, ProjectStatus } from '@/lib/types'
import { Plus, Trash2, Briefcase } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useRole } from '@/lib/hooks/use-role'

const STATUS_DOT: Record<ProjectStatus, string> = {
  planning:     'bg-lo/50',
  'in-progress':'bg-signal',
  review:       'bg-warn',
  completed:    'bg-up',
  paused:       'bg-lo/30',
}

const STATUS_TEXT: Record<ProjectStatus, string> = {
  planning:     'text-lo',
  'in-progress':'text-signal',
  review:       'text-warn',
  completed:    'text-up',
  paused:       'text-lo',
}

const fmt   = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const field = 'bg-[#0A0A0A] border-[#1E1E1E] text-mid placeholder:text-lo/50 focus:border-signal/40 transition-colors rounded-xl'
const sel   = 'w-full bg-[#0A0A0A] border border-[#1E1E1E] text-mid rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-signal/40 transition-colors'
const lbl   = 'text-lo text-[9px] uppercase tracking-[0.15em] mb-1.5 block font-medium'

export default function ProjectsPage() {
  const role    = useRole()
  const isOwner = role === 'owner'

  const [projects, setProjects]   = useState<Project[]>([])
  const [clients, setClients]     = useState<Client[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [filter, setFilter]       = useState('all')
  const [saving, setSaving]       = useState(false)
  const [form, setForm] = useState({
    name: '', client_id: '', service_type: 'ai-freelancing',
    status: 'planning', start_date: new Date().toISOString().split('T')[0],
    end_date: '', value: '', notes: '', assigned_to: '',
  })

  const load = () => {
    Promise.all([
      fetch('/api/projects').then(r => r.json()),
      fetch('/api/clients').then(r => r.json()),
      fetch('/api/employees').then(r => r.json()),
    ]).then(([p, c, e]) => {
      setProjects(Array.isArray(p) ? p : [])
      setClients(Array.isArray(c) ? c : [])
      setEmployees(Array.isArray(e) ? e : [])
      setLoading(false)
    })
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    await fetch('/api/projects', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        value: Number(form.value) || 0,
        client_id: form.client_id || null,
        end_date: form.end_date || null,
        assigned_to: form.assigned_to || null,
      }),
    })
    setSaving(false); setShowForm(false)
    setForm({ name: '', client_id: '', service_type: 'ai-freelancing', status: 'planning', start_date: new Date().toISOString().split('T')[0], end_date: '', value: '', notes: '', assigned_to: '' })
    load()
  }

  const handleAssign = async (id: string, assigned_to: string) => {
    await fetch(`/api/projects/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigned_to: assigned_to || null }),
    }); load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this project?')) return
    await fetch(`/api/projects/${id}`, { method: 'DELETE' }); load()
  }

  const handleStatus = async (id: string, status: string) => {
    await fetch(`/api/projects/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }); load()
  }

  const filtered    = filter === 'all' ? projects : projects.filter(p => p.status === filter)
  const totalValue  = projects.reduce((s, p) => s + Number(p.value), 0)
  const activeCount = projects.filter(p => p.status === 'in-progress').length

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-lo text-[9px] font-semibold uppercase tracking-[0.22em] mb-1">Work</p>
          <h1 className="text-hi text-xl font-semibold tracking-tight">Projects</h1>
          <p className="text-lo text-xs mt-1">{activeCount} active · {fmt(totalValue)} pipeline</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-[#111111] border border-[#1E1E1E] hover:border-[#2A2A2A] text-lo hover:text-mid px-4 py-2 rounded-xl text-xs tracking-wide transition-all">
          <Plus className="h-3.5 w-3.5" /> New Project
        </button>
      </div>

      {showForm && (
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-2xl p-6 mb-6">
          <p className="text-hi text-sm font-semibold mb-5">New Project</p>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={lbl}>Project Name *</label>
              <Input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Brand Identity for Acme" className={field} />
            </div>
            <div>
              <label className={lbl}>Client</label>
              <select value={form.client_id} onChange={e => setForm({...form, client_id: e.target.value})} className={sel}>
                <option value="">No client</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Service Type</label>
              <select value={form.service_type} onChange={e => setForm({...form, service_type: e.target.value})} className={sel}>
                <option value="brandscaling">Brandscaling</option>
                <option value="ai-freelancing">AI Freelancing</option>
                <option value="ai-consultation">AI Consultation</option>
                <option value="website-dashboard">Website / Dashboard</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Status</label>
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className={sel}>
                <option value="planning">Planning</option>
                <option value="in-progress">In Progress</option>
                <option value="review">In Review</option>
                <option value="completed">Completed</option>
                <option value="paused">Paused</option>
              </select>
            </div>
            <div><label className={lbl}>Project Value ($)</label><Input type="number" value={form.value} onChange={e => setForm({...form, value: e.target.value})} placeholder="0" className={field} /></div>
            <div><label className={lbl}>Start Date</label><Input type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} className={field} /></div>
            <div><label className={lbl}>End Date</label><Input type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} className={field} /></div>
            {isOwner && (
              <div>
                <label className={lbl}>Assign to</label>
                <select value={form.assigned_to} onChange={e => setForm({...form, assigned_to: e.target.value})} className={sel}>
                  <option value="">Unassigned</option>
                  {employees.filter(e => e.active).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
            )}
            <div className="sm:col-span-2">
              <label className={lbl}>Notes</label>
              <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Scope, deliverables..." rows={2}
                className="w-full text-xs resize-none bg-[#0A0A0A] border border-[#1E1E1E] text-mid rounded-xl px-3 py-2 focus:outline-none focus:border-signal/40 placeholder:text-lo/50 transition-colors" />
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" disabled={saving}
                className="border border-signal/25 hover:border-signal/40 hover:bg-signal/5 text-signal px-5 py-2 rounded-xl text-xs tracking-wide disabled:opacity-40 transition-all">
                {saving ? 'Saving...' : 'Save Project'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="text-lo hover:text-mid text-xs px-4 py-2 transition-colors">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="flex gap-1.5 mb-6 flex-wrap">
        {(['all','planning','in-progress','review','completed','paused'] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-xl text-xs capitalize tracking-wide transition-all ${
              filter === s ? 'border border-signal/25 text-signal bg-signal/5' : 'border border-[#1E1E1E] text-lo hover:text-mid hover:border-[#2A2A2A]'
            }`}>
            {s === 'all' ? 'All' : PROJECT_STATUS_LABELS[s as ProjectStatus]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-lo text-xs text-center py-16">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Briefcase className="h-8 w-8 text-faint" />
          <p className="text-lo text-sm">{projects.length === 0 ? 'No projects yet' : 'No projects match this filter'}</p>
          <p className="text-lo text-xs opacity-70">{projects.length === 0 ? 'Create your first project to get started' : 'Try a different filter'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(p => (
            <div key={p.id} className="bg-[#111111] border border-[#1E1E1E] rounded-2xl p-5 group hover:border-[#2A2A2A] transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <p className="text-hi text-xs font-semibold leading-tight">{p.name}</p>
                  <p className="text-lo text-[10px] mt-0.5">{p.client_name ?? 'No client'}</p>
                </div>
                <button onClick={() => handleDelete(p.id)} className="text-[#1E1E1E] hover:text-down transition-colors opacity-0 group-hover:opacity-100 ml-2 flex-shrink-0">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[p.status as ProjectStatus]}`} />
                  <select
                    value={p.status}
                    onChange={e => handleStatus(p.id, e.target.value)}
                    className={`text-xs font-semibold bg-transparent border-0 cursor-pointer focus:outline-none ${STATUS_TEXT[p.status as ProjectStatus]}`}
                    style={{ appearance: 'none' }}
                  >
                    <option value="planning">Planning</option>
                    <option value="in-progress">In Progress</option>
                    <option value="review">In Review</option>
                    <option value="completed">Completed</option>
                    <option value="paused">Paused</option>
                  </select>
                </div>
                <span className="text-faint">·</span>
                <span className="text-lo text-[10px]">{SERVICE_LABELS[p.service_type]}</span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#141414]">
                <span className="text-signal text-sm font-semibold tabular-nums">{fmt(Number(p.value))}</span>
                <span className="text-lo text-[10px]">{p.start_date}{p.end_date ? ` → ${p.end_date}` : ''}</span>
              </div>

              {isOwner && (
                <div className="mt-3 pt-2 border-t border-[#141414]">
                  <select
                    value={p.assigned_to ?? ''}
                    onChange={e => handleAssign(p.id, e.target.value)}
                    className="w-full text-[10px] bg-transparent border-0 text-lo hover:text-mid cursor-pointer focus:outline-none"
                    style={{ appearance: 'none' }}
                  >
                    <option value="">Unassigned</option>
                    {employees.filter(e => e.active).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
              )}

              {p.notes && <p className="text-lo text-[10px] mt-2.5 line-clamp-2 leading-relaxed">{p.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
