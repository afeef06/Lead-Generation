'use client'

import { useEffect, useState } from 'react'
import { Building2, Zap, Database, Shield, CheckCircle, XCircle, Loader2, Save } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface SystemStatus { label: string; status: 'ok' | 'error' | 'checking'; detail: string }
interface DataCounts   { clients: number; projects: number; invoices: number; tasks: number }

const lbl   = 'text-lo text-[9px] uppercase tracking-[0.15em] mb-1.5 block font-medium'
const field = 'bg-[#0A0A0A] border-[#1E1E1E] text-mid placeholder:text-lo/50 focus:border-signal/40 transition-colors rounded-xl'

const STACK_INFO = [
  { label: 'Framework',  value: 'Next.js (App Router)' },
  { label: 'Database',   value: 'Supabase (PostgreSQL)' },
  { label: 'AI Model',   value: 'Claude claude-sonnet-4-6' },
  { label: 'Styling',    value: 'Tailwind CSS v4' },
  { label: 'Charts',     value: 'Recharts' },
  { label: 'Version',    value: 'R&R Collective Hub v1.0' },
]

export default function SettingsPage() {
  const [profile, setProfile] = useState({
    businessName: '', tagline: '', website: '', founded: '', email: '', serviceArea: '',
  })
  const [saved, setSaved]       = useState(false)
  const [health, setHealth]     = useState<SystemStatus[]>([
    { label: 'Supabase (Database)', status: 'checking', detail: 'Checking connection...' },
    { label: 'AI Agent (Anthropic)', status: 'checking', detail: 'Checking API...' },
  ])
  const [counts, setCounts] = useState<DataCounts>({ clients: 0, projects: 0, invoices: 0, tasks: 0 })
  const [countsLoading, setCountsLoading] = useState(true)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('ai-hub-profile')
      if (stored) setProfile(JSON.parse(stored))
    } catch { /* silent */ }
  }, [])

  useEffect(() => {
    const checkSupabase = async () => {
      try {
        const r = await fetch('/api/clients')
        const d = await r.json()
        setHealth(h => h.map(s => s.label.includes('Supabase')
          ? { ...s, status: Array.isArray(d) ? 'ok' : 'error', detail: Array.isArray(d) ? 'Connected · responding normally' : 'Unexpected response' }
          : s))
      } catch {
        setHealth(h => h.map(s => s.label.includes('Supabase')
          ? { ...s, status: 'error', detail: 'Connection failed — check SUPABASE_URL' }
          : s))
      }
    }

    const checkAI = async () => {
      try {
        const r = await fetch('/api/agent', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: [{ role: 'user', content: 'ping' }] }),
        })
        const d = await r.json()
        setHealth(h => h.map(s => s.label.includes('Anthropic')
          ? { ...s, status: d.reply ? 'ok' : 'error', detail: d.reply ? 'API key valid · model responding' : (d.error ?? 'No response — check ANTHROPIC_API_KEY') }
          : s))
      } catch {
        setHealth(h => h.map(s => s.label.includes('Anthropic')
          ? { ...s, status: 'error', detail: 'Request failed — check ANTHROPIC_API_KEY' }
          : s))
      }
    }

    checkSupabase()
    checkAI()
  }, [])

  useEffect(() => {
    Promise.all([
      fetch('/api/clients').then(r => r.json()),
      fetch('/api/projects').then(r => r.json()),
      fetch('/api/invoices').then(r => r.json()),
      fetch('/api/tasks').then(r => r.json()),
    ]).then(([c, p, i, t]) => {
      setCounts({
        clients:  Array.isArray(c) ? c.length : 0,
        projects: Array.isArray(p) ? p.length : 0,
        invoices: Array.isArray(i) ? i.length : 0,
        tasks:    Array.isArray(t) ? t.length : 0,
      })
      setCountsLoading(false)
    }).catch(() => setCountsLoading(false))
  }, [])

  const handleSave = () => {
    localStorage.setItem('ai-hub-profile', JSON.stringify(profile))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <div className="mb-8">
        <p className="text-lo text-[9px] font-semibold uppercase tracking-[0.22em] mb-1">Configuration</p>
        <h1 className="text-hi text-xl font-semibold tracking-tight">Settings</h1>
        <p className="text-lo text-xs mt-1">Business profile, system health, and platform info</p>
      </div>

      <section className="bg-[#111111] border border-[#1E1E1E] rounded-2xl p-6 mb-4">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-7 h-7 rounded-xl bg-[#1C1C1C] border border-[#282828] flex items-center justify-center flex-shrink-0">
            <Building2 className="h-3.5 w-3.5 text-signal" />
          </div>
          <div>
            <p className="text-hi text-xs font-semibold">Business Profile</p>
            <p className="text-lo text-[10px]">Stored locally in your browser</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Business Name</label>
            <Input value={profile.businessName} onChange={e => setProfile({...profile, businessName: e.target.value})} placeholder="Acme AI Agency" className={field} />
          </div>
          <div>
            <label className={lbl}>Tagline</label>
            <Input value={profile.tagline} onChange={e => setProfile({...profile, tagline: e.target.value})} placeholder="AI-powered growth for modern businesses" className={field} />
          </div>
          <div>
            <label className={lbl}>Website</label>
            <Input value={profile.website} onChange={e => setProfile({...profile, website: e.target.value})} placeholder="https://yoursite.com" className={field} />
          </div>
          <div>
            <label className={lbl}>Contact Email</label>
            <Input type="email" value={profile.email} onChange={e => setProfile({...profile, email: e.target.value})} placeholder="hello@yoursite.com" className={field} />
          </div>
          <div>
            <label className={lbl}>Founded</label>
            <Input value={profile.founded} onChange={e => setProfile({...profile, founded: e.target.value})} placeholder="2024" className={field} />
          </div>
          <div>
            <label className={lbl}>Service Area</label>
            <Input value={profile.serviceArea} onChange={e => setProfile({...profile, serviceArea: e.target.value})} placeholder="Remote · Worldwide" className={field} />
          </div>
        </div>
        <div className="mt-5 flex items-center gap-3">
          <button onClick={handleSave}
            className="flex items-center gap-2 border border-signal/25 hover:border-signal/40 hover:bg-signal/5 text-signal px-5 py-2 rounded-xl text-xs tracking-wide transition-all">
            <Save className="h-3 w-3" />
            {saved ? 'Saved!' : 'Save Profile'}
          </button>
          {saved && <p className="text-up text-[10px] flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Saved to browser storage</p>}
        </div>
      </section>

      <section className="bg-[#111111] border border-[#1E1E1E] rounded-2xl p-6 mb-4">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-7 h-7 rounded-xl bg-[#121A12] border border-[#1D281D] flex items-center justify-center flex-shrink-0">
            <Shield className="h-3.5 w-3.5 text-up" />
          </div>
          <div>
            <p className="text-hi text-xs font-semibold">System Health</p>
            <p className="text-lo text-[10px]">Live connection checks</p>
          </div>
        </div>
        <div className="space-y-3">
          {health.map(s => (
            <div key={s.label} className="flex items-center justify-between py-3 border-b border-[#141414] last:border-0">
              <div>
                <p className="text-mid text-xs font-medium">{s.label}</p>
                <p className="text-lo text-[10px] mt-0.5">{s.detail}</p>
              </div>
              {s.status === 'checking' && <Loader2 className="h-4 w-4 text-lo animate-spin" />}
              {s.status === 'ok'       && <CheckCircle className="h-4 w-4 text-up" />}
              {s.status === 'error'    && <XCircle className="h-4 w-4 text-down" />}
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#111111] border border-[#1E1E1E] rounded-2xl p-6 mb-4">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-7 h-7 rounded-xl bg-[#141414] border border-ai/20 flex items-center justify-center flex-shrink-0">
            <Database className="h-3.5 w-3.5 text-ai" />
          </div>
          <div>
            <p className="text-hi text-xs font-semibold">Data Overview</p>
            <p className="text-lo text-[10px]">Records stored in Supabase</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Clients',  value: counts.clients,  color: 'text-signal' },
            { label: 'Projects', value: counts.projects, color: 'text-up' },
            { label: 'Invoices', value: counts.invoices, color: 'text-warn' },
            { label: 'Tasks',    value: counts.tasks,    color: 'text-ai' },
          ].map(d => (
            <div key={d.label} className="bg-[#0A0A0A] border border-[#1E1E1E] rounded-xl p-4 text-center">
              <p className={`text-2xl font-semibold tabular-nums ${countsLoading ? 'text-faint' : d.color}`}>
                {countsLoading ? '—' : d.value}
              </p>
              <p className="text-lo text-[10px] uppercase tracking-[0.12em] mt-1">{d.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#111111] border border-[#1E1E1E] rounded-2xl p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-7 h-7 rounded-xl bg-[#1C1C1C] border border-[#282828] flex items-center justify-center flex-shrink-0">
            <Zap className="h-3.5 w-3.5 text-signal" />
          </div>
          <div>
            <p className="text-hi text-xs font-semibold">Platform</p>
            <p className="text-lo text-[10px]">Stack & version information</p>
          </div>
        </div>
        <div className="divide-y divide-[#141414]">
          {STACK_INFO.map(row => (
            <div key={row.label} className="flex items-center justify-between py-2.5">
              <span className="text-lo text-xs">{row.label}</span>
              <span className="text-mid text-xs font-medium">{row.value}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
