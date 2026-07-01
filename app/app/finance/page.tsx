'use client'

import { useEffect, useState } from 'react'
import { Transaction, Client } from '@/lib/types'
import { Plus, Trash2, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import { Input } from '@/components/ui/input'

const INCOME_CATS  = ['Client Payment','Retainer','Consultation Fee','Project Fee','Other Income']
const EXPENSE_CATS = ['Software/Tools','Marketing','Contractor','Equipment','Legal/Accounting','Office','Other Expense']

const fmt   = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const field = 'bg-[#0A0A0A] border-[#1E1E1E] text-mid placeholder:text-lo/50 focus:border-signal/40 transition-colors rounded-xl'
const sel   = 'w-full bg-[#0A0A0A] border border-[#1E1E1E] text-mid rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-signal/40 transition-colors'
const lbl   = 'text-lo text-[9px] uppercase tracking-[0.15em] mb-1.5 block font-medium'

export default function FinancePage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [clients, setClients]           = useState<Client[]>([])
  const [loading, setLoading]           = useState(true)
  const [showForm, setShowForm]         = useState(false)
  const [tab, setTab]                   = useState<'all'|'income'|'expense'>('all')
  const [saving, setSaving]             = useState(false)
  const [form, setForm] = useState({
    type: 'income', amount: '', category: 'Client Payment',
    description: '', client_id: '', date: new Date().toISOString().split('T')[0],
  })

  const load = () => {
    Promise.all([
      fetch('/api/finance').then(r => r.json()),
      fetch('/api/clients').then(r => r.json()),
    ]).then(([t, c]) => {
      setTransactions(Array.isArray(t) ? t : [])
      setClients(Array.isArray(c) ? c : [])
      setLoading(false)
    })
  }
  useEffect(() => { load() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    await fetch('/api/finance', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, amount: Number(form.amount), client_id: form.client_id || null }),
    })
    setSaving(false); setShowForm(false)
    setForm({ type: 'income', amount: '', category: 'Client Payment', description: '', client_id: '', date: new Date().toISOString().split('T')[0] })
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this transaction?')) return
    await fetch(`/api/finance/${id}`, { method: 'DELETE' }); load()
  }

  const filtered      = transactions.filter(t => tab === 'all' || t.type === tab)
  const totalIncome   = transactions.filter(t => t.type === 'income').reduce((s, t)  => s + Number(t.amount), 0)
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const netProfit     = totalIncome - totalExpenses
  const categories    = form.type === 'income' ? INCOME_CATS : EXPENSE_CATS

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-lo text-[9px] font-semibold uppercase tracking-[0.22em] mb-1">Money</p>
          <h1 className="text-hi text-xl font-semibold tracking-tight">Finance</h1>
          <p className="text-lo text-xs mt-1">Track income, expenses, and net profit</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-[#111111] border border-[#1E1E1E] hover:border-[#2A2A2A] text-lo hover:text-mid px-4 py-2 rounded-xl text-xs tracking-wide transition-all">
          <Plus className="h-3.5 w-3.5" /> Log Transaction
        </button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Total Income',   value: fmt(totalIncome),   color: 'text-up',     icon: <TrendingUp className="h-3.5 w-3.5" />,   bg: 'bg-[#121A12] border-[#1D281D]' },
          { label: 'Total Expenses', value: fmt(totalExpenses), color: 'text-down',   icon: <TrendingDown className="h-3.5 w-3.5" />, bg: 'bg-[#181818] border-[#252525]' },
          { label: 'Net Profit',     value: fmt(netProfit),     color: netProfit >= 0 ? 'text-signal' : 'text-down', icon: <DollarSign className="h-3.5 w-3.5" />, bg: netProfit >= 0 ? 'bg-[#1C1C1C] border-[#282828]' : 'bg-[#181818] border-[#252525]' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border rounded-2xl p-5 flex items-center gap-4`}>
            <div className={`${s.bg} border rounded-xl p-2 flex-shrink-0`}>
              <span className={s.color}>{s.icon}</span>
            </div>
            <div>
              <p className="text-lo text-[9px] uppercase tracking-[0.15em] mb-1">{s.label}</p>
              <p className={`text-xl font-semibold ${s.color}`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-2xl p-6 mb-6">
          <p className="text-hi text-sm font-semibold mb-5">Log Transaction</p>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Type</label>
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value, category: e.target.value === 'income' ? 'Client Payment' : 'Software/Tools'})} className={sel}>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
            <div><label className={lbl}>Amount ($)</label><Input type="number" step="0.01" required value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} placeholder="0.00" className={field} /></div>
            <div>
              <label className={lbl}>Category</label>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className={sel}>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><label className={lbl}>Date</label><Input type="date" required value={form.date} onChange={e => setForm({...form, date: e.target.value})} className={field} /></div>
            <div><label className={lbl}>Description</label><Input value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="e.g. Invoice #001" className={field} /></div>
            <div>
              <label className={lbl}>Client (optional)</label>
              <select value={form.client_id} onChange={e => setForm({...form, client_id: e.target.value})} className={sel}>
                <option value="">No client</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" disabled={saving} className="border border-signal/25 hover:border-signal/40 hover:bg-signal/5 text-signal px-5 py-2 rounded-xl text-xs tracking-wide disabled:opacity-40 transition-all">
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="text-lo hover:text-mid text-xs px-4 py-2 transition-colors">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="flex gap-1.5 mb-5">
        {(['all','income','expense'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-xl text-xs capitalize tracking-wide transition-all ${
              tab === t ? 'border border-signal/25 text-signal bg-signal/5' : 'border border-[#1E1E1E] text-lo hover:text-mid hover:border-[#2A2A2A]'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-lo text-xs text-center py-16">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <DollarSign className="h-8 w-8 text-faint" />
          <p className="text-lo text-sm">No transactions yet</p>
        </div>
      ) : (
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1A1A1A]">
                {['Date','Description','Category','Client','Amount',''].map(h => (
                  <th key={h} className="text-left px-5 py-3.5 text-lo text-[9px] uppercase tracking-[0.18em] font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id} className="border-b border-[#141414] last:border-0 hover:bg-[#171717] transition-colors group">
                  <td className="px-5 py-3.5 text-lo text-xs whitespace-nowrap">{t.date}</td>
                  <td className="px-5 py-3.5 text-hi text-xs font-medium">{t.description || t.category}</td>
                  <td className="px-5 py-3.5 text-mid text-xs hidden sm:table-cell">{t.category}</td>
                  <td className="px-5 py-3.5 text-lo text-xs hidden md:table-cell">{t.client_name ?? '—'}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-semibold tabular-nums ${t.type === 'income' ? 'text-up' : 'text-down'}`}>
                      {t.type === 'income' ? '+' : '−'}{fmt(Number(t.amount))}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <button onClick={() => handleDelete(t.id)} className="text-[#1E1E1E] hover:text-down transition-colors opacity-0 group-hover:opacity-100">
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
