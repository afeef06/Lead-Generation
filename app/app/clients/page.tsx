'use client'

import { useEffect, useState } from 'react'
import { Client, Employee, SERVICE_LABELS } from '@/lib/types'
import { Plus, Search, Trash2, Users } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useRole } from '@/lib/hooks/use-role'

const statusSelectColor = (s: string) => ({
  active: 'text-up', lead: 'text-signal', completed: 'text-mid', churned: 'text-down',
}[s] ?? 'text-lo')

const field = 'bg-[#0A0A0A] border-[#1E1E1E] text-mid placeholder:text-lo/50 focus:border-signal/40 transition-colors rounded-xl'
const sel   = 'w-full bg-[#0A0A0A] border border-[#1E1E1E] text-mid rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-signal/40 transition-colors'
const lbl   = 'text-lo text-[9px] uppercase tracking-[0.15em] mb-1.5 block font-medium'

export default function ClientsPage() {
  const role    = useRole()
  const isOwner = role === 'owner'

  const [clients, setClients]     = useState<Client[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [search, setSearch]       = useState('')
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [form, setForm] = useState({
    name: '', email: '', phone: '', company: '',
    service_type: 'ai-freelancing', acquisition_source: 'referral',
    status: 'lead', monthly_value: '', notes: '', assigned_to: '',
  })
  const [saving, setSaving] = useState(false)

  const load = () => {
    Promise.all([
      fetch('/api/clients').then(r => r.json()),
      fetch('/api/employees').then(r => r.json()),
    ]).then(([c, e]) => {
      setClients(Array.isArray(c) ? c : [])
      setEmployees(Array.isArray(e) ? e : [])
      setLoading(false)
    })
  }
  useEffect(() => { load() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    await fetch('/api/clients', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        monthly_value: Number(form.monthly_value) || 0,
        assigned_to: form.assigned_to || null,
      }),
    })
    setSaving(false); setShowForm(false)
    setForm({ name: '', email: '', phone: '', company: '', service_type: 'ai-freelancing', acquisition_source: 'referral', status: 'lead', monthly_value: '', notes: '', assigned_to: '' })
    load()
  }

  const handleAssign = async (id: string, assigned_to: string) => {
    await fetch(`/api/clients/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigned_to: assigned_to || null }),
    }); load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this client?')) return
    await fetch(`/api/clients/${id}`, { method: 'DELETE' }); load()
  }

  const handleStatus = async (id: string, status: string) => {
    await fetch(`/api/clients/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }); load()
  }

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (c.company ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-lo text-[9px] font-semibold uppercase tracking-[0.22em] mb-1">CRM</p>
          <h1 className="text-hi text-xl font-semibold tracking-tight">Clients</h1>
          <p className="text-lo text-xs mt-1">{clients.length} total · {clients.filter(c => c.status === 'active').length} active</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-[#111111] border border-[#1E1E1E] hover:border-[#2A2A2A] text-lo hover:text-mid px-4 py-2 rounded-xl text-xs tracking-wide transition-all">
          <Plus className="h-3.5 w-3.5" /> Add Client
        </button>
      </div>

      {showForm && (
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-2xl p-6 mb-6">
          <p className="text-hi text-sm font-semibold mb-5">New Client</p>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className={lbl}>Full Name *</label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="Jane Smith" className={field} /></div>
            <div><label className={lbl}>Email</label><Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="jane@company.com" className={field} /></div>
            <div><label className={lbl}>Phone</label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="(555) 000-0000" className={field} /></div>
            <div><label className={lbl}>Company</label><Input value={form.company} onChange={e => setForm({...form, company: e.target.value})} placeholder="Acme Corp" className={field} /></div>
            <div>
              <label className={lbl}>Service</label>
              <select value={form.service_type} onChange={e => setForm({...form, service_type: e.target.value})} className={sel}>
                <option value="brandscaling">Brandscaling</option>
                <option value="ai-freelancing">AI Freelancing</option>
                <option value="ai-consultation">AI Consultation</option>
                <option value="website-dashboard">Website / Dashboard</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className={lbl}>How they found you</label>
              <select value={form.acquisition_source} onChange={e => setForm({...form, acquisition_source: e.target.value})} className={sel}>
                <option value="referral">Referral</option>
                <option value="social-media">Social Media</option>
                <option value="cold-outreach">Cold Outreach</option>
                <option value="website">Website</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Status</label>
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className={sel}>
                <option value="lead">Lead</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="churned">Churned</option>
              </select>
            </div>
            <div><label className={lbl}>Monthly Value ($)</label><Input type="number" value={form.monthly_value} onChange={e => setForm({...form, monthly_value: e.target.value})} placeholder="0" className={field} /></div>
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
              <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Notes..." rows={2} className="w-full text-xs resize-none bg-[#0A0A0A] border border-[#1E1E1E] text-mid rounded-xl px-3 py-2 focus:outline-none focus:border-signal/40 placeholder:text-lo/50 transition-colors" />
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" disabled={saving} className="border border-signal/25 hover:border-signal/40 hover:bg-signal/5 text-signal px-5 py-2 rounded-xl text-xs tracking-wide disabled:opacity-40 transition-all">
                {saving ? 'Saving...' : 'Save Client'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="text-lo hover:text-mid text-xs px-4 py-2 transition-colors">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-lo" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients..." className={`pl-9 ${field}`} />
      </div>

      {loading ? (
        <p className="text-lo text-xs text-center py-16">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Users className="h-8 w-8 text-faint" />
          <p className="text-lo text-sm">{clients.length === 0 ? 'No clients yet' : 'No results found'}</p>
          <p className="text-lo text-xs opacity-70">{clients.length === 0 ? 'Add your first client to get started' : 'Try a different search term'}</p>
        </div>
      ) : (
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1A1A1A]">
                {['Name', 'Service', 'Source', 'Status', 'Monthly Value', ...(isOwner ? ['Assigned To'] : []), ''].map(h => (
                  <th key={h} className="text-left px-5 py-3.5 text-lo text-[9px] uppercase tracking-[0.18em] font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b border-[#141414] last:border-0 hover:bg-[#171717] transition-colors group">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#1A1A1A] border border-[#1E1E1E] flex items-center justify-center text-mid text-[11px] font-semibold flex-shrink-0">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-hi text-xs font-semibold">{c.name}</p>
                        <p className="text-lo text-[10px] mt-0.5">{c.company || c.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-mid text-xs">{SERVICE_LABELS[c.service_type]}</td>
                  <td className="px-5 py-3.5 text-lo text-xs capitalize hidden md:table-cell">{c.acquisition_source.replace('-', ' ')}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        c.status === 'active' ? 'bg-up' : c.status === 'lead' ? 'bg-signal' :
                        c.status === 'churned' ? 'bg-down' : 'bg-mid/40'
                      }`} />
                      <select
                        value={c.status}
                        onChange={e => handleStatus(c.id, e.target.value)}
                        className={`text-xs font-semibold bg-transparent border-0 cursor-pointer focus:outline-none ${statusSelectColor(c.status)}`}
                        style={{ appearance: 'none' }}
                      >
                        <option value="lead">Lead</option>
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                        <option value="churned">Churned</option>
                      </select>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-signal text-xs font-semibold">${Number(c.monthly_value).toLocaleString()}</span>
                    <span className="text-lo text-[10px]">/mo</span>
                  </td>
                  {isOwner && (
                    <td className="px-5 py-3.5">
                      <select
                        value={c.assigned_to ?? ''}
                        onChange={e => handleAssign(c.id, e.target.value)}
                        className="text-xs bg-transparent border-0 text-lo hover:text-mid cursor-pointer focus:outline-none"
                        style={{ appearance: 'none' }}
                      >
                        <option value="">Unassigned</option>
                        {employees.filter(e => e.active).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                      </select>
                    </td>
                  )}
                  <td className="px-5 py-3.5">
                    <button onClick={() => handleDelete(c.id)} className="text-[#1E1E1E] hover:text-down transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
