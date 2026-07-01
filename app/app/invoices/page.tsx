'use client'

import { useEffect, useState } from 'react'
import { Client } from '@/lib/types'
import { Plus, Trash2, FileText, CheckCircle, Clock, AlertCircle, Download, Mail, Send, X, BellRing, Link2, Copy, ExternalLink } from 'lucide-react'
import { Input } from '@/components/ui/input'

type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue'

interface Invoice {
  id: string; invoice_number: string; client_id?: string; client_name?: string
  amount: number; status: InvoiceStatus; due_date?: string; issued_date: string; notes?: string; created_at: string
}

const STATUS_PILL: Record<InvoiceStatus, string> = {
  draft:   'bg-[#1A1A1A] text-lo border border-[#1E1E1E]',
  sent:    'bg-signal/10 text-signal border border-signal/20',
  paid:    'bg-up/10 text-up border border-up/20',
  overdue: 'bg-down/10 text-down border border-down/20',
}

const STATUS_SELECT_COLOR: Record<InvoiceStatus, string> = {
  draft: 'text-lo', sent: 'text-signal', paid: 'text-up', overdue: 'text-down',
}

const STATUS_DOT: Record<InvoiceStatus, string> = {
  draft: 'bg-lo/40', sent: 'bg-signal', paid: 'bg-up', overdue: 'bg-down',
}

const fmt   = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const field = 'bg-[#0A0A0A] border-[#1E1E1E] text-mid placeholder:text-lo/50 focus:border-signal/40 transition-colors rounded-xl'
const sel   = 'w-full bg-[#0A0A0A] border border-[#1E1E1E] text-mid rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-signal/40 transition-colors'
const lbl   = 'text-lo text-[9px] uppercase tracking-[0.15em] mb-1.5 block font-medium'

type EmailModalState = { open: boolean; invoice: Invoice | null; type: 'invoice' | 'followup'; sending: boolean; sent: boolean; message: string; error: string }

const emptyEmail = (): EmailModalState => ({ open: false, invoice: null, type: 'invoice', sending: false, sent: false, message: '', error: '' })

export default function InvoicesPage() {
  const [invoices, setInvoices]   = useState<Invoice[]>([])
  const [clients, setClients]     = useState<Client[]>([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [filter, setFilter]       = useState('all')
  const [saving, setSaving]         = useState(false)
  const [payingId, setPayingId]     = useState<string | null>(null)
  const [copiedId, setCopiedId]     = useState<string | null>(null)
  const [emailModal, setEmailModal] = useState<EmailModalState>(emptyEmail())
  const [form, setForm] = useState({
    invoice_number: `INV-${String(Date.now()).slice(-4)}`,
    client_id: '', amount: '', status: 'draft',
    due_date: '', issued_date: new Date().toISOString().split('T')[0], notes: '',
  })

  const load = () => {
    Promise.all([
      fetch('/api/invoices').then(r => r.json()),
      fetch('/api/clients').then(r => r.json()),
    ]).then(([inv, cls]) => {
      setInvoices(Array.isArray(inv) ? inv : [])
      setClients(Array.isArray(cls) ? cls : [])
      setLoading(false)
    })
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    await fetch('/api/invoices', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, amount: Number(form.amount), client_id: form.client_id || null, due_date: form.due_date || null }),
    })
    setSaving(false); setShowForm(false)
    setForm({ invoice_number: `INV-${String(Date.now()).slice(-4)}`, client_id: '', amount: '', status: 'draft', due_date: '', issued_date: new Date().toISOString().split('T')[0], notes: '' })
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this invoice?')) return
    await fetch(`/api/invoices/${id}`, { method: 'DELETE' }); load()
  }

  const handleStatus = async (id: string, status: string) => {
    await fetch(`/api/invoices/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }); load()
  }

  // ─── Stripe Payment Link ──────────────────────────────────────────────────
  const getPaymentLink = async (inv: Invoice) => {
    setPayingId(inv.id)
    try {
      const res  = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: inv.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create payment link')
      await navigator.clipboard.writeText(data.url)
      setCopiedId(inv.id)
      setTimeout(() => setCopiedId(null), 3000)
      window.open(data.url, '_blank')
      load()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      alert(`Stripe error: ${message}\n\nMake sure STRIPE_SECRET_KEY is set in your environment variables.`)
    } finally {
      setPayingId(null)
    }
  }

  // ─── PDF Download ─────────────────────────────────────────────────────────
  const downloadPDF = async (inv: Invoice) => {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

    const W = 210
    const MARGIN = 20
    const COL2  = 130

    doc.setFillColor(10, 10, 10)
    doc.rect(0, 0, W, 297, 'F')

    doc.setFillColor(17, 17, 17)
    doc.roundedRect(MARGIN, 16, W - MARGIN * 2, 34, 3, 3, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(136, 136, 136)
    doc.text('R&R COLLECTIVE', MARGIN + 8, 27)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(235, 235, 235)
    doc.text(inv.invoice_number, MARGIN + 8, 40)

    const statusColors: Record<InvoiceStatus, [number, number, number]> = {
      draft: [50, 50, 50], sent: [100, 100, 100], paid: [42, 140, 104], overdue: [155, 69, 69],
    }
    const [sr, sg, sb] = statusColors[inv.status]
    doc.setFillColor(sr, sg, sb)
    doc.roundedRect(COL2, 32, 30, 8, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(235, 235, 235)
    doc.text(inv.status.toUpperCase(), COL2 + 3, 37.5)

    let y = 66
    const rows: [string, string][] = [
      ['BILLED TO',    inv.client_name ?? '—'],
      ['INVOICE #',    inv.invoice_number],
      ['ISSUED',       inv.issued_date],
      ['DUE DATE',     inv.due_date ?? '—'],
      ['STATUS',       inv.status.charAt(0).toUpperCase() + inv.status.slice(1)],
    ]

    rows.forEach(([label, value]) => {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(85, 85, 85)
      doc.text(label, MARGIN, y)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(200, 200, 200)
      doc.text(value, MARGIN, y + 6)
      y += 16
    })

    y += 4
    doc.setFillColor(17, 17, 17)
    doc.roundedRect(MARGIN, y, W - MARGIN * 2, 26, 3, 3, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(85, 85, 85)
    doc.text('AMOUNT DUE', MARGIN + 8, y + 9)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(22)
    doc.setTextColor(235, 235, 235)
    doc.text(fmt(Number(inv.amount)), MARGIN + 8, y + 20)
    y += 34

    if (inv.notes) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(85, 85, 85)
      doc.text('NOTES', MARGIN, y + 8)
      doc.setTextColor(136, 136, 136)
      doc.setFontSize(9)
      const noteLines = doc.splitTextToSize(inv.notes, W - MARGIN * 2)
      doc.text(noteLines, MARGIN, y + 16)
      y += 16 + noteLines.length * 5
    }

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(51, 51, 51)
    doc.text('Thank you for your business · R&R Collective', W / 2, 278, { align: 'center' })

    doc.save(`${inv.invoice_number}.pdf`)
  }

  // ─── Email Send ────────────────────────────────────────────────────────────
  const openEmailModal = (inv: Invoice, type: 'invoice' | 'followup') => {
    setEmailModal({ open: true, invoice: inv, type, sending: false, sent: false, message: '', error: '' })
  }

  const sendEmail = async () => {
    if (!emailModal.invoice) return
    const client = clients.find(c => c.id === emailModal.invoice!.client_id)
    const email  = client?.email

    if (!email) {
      setEmailModal(prev => ({ ...prev, error: `No email on file for ${emailModal.invoice?.client_name ?? 'this client'}. Add one in the Clients page.` }))
      return
    }

    setEmailModal(prev => ({ ...prev, sending: true, error: '' }))
    const res  = await fetch('/api/email', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type:          emailModal.type,
        invoiceId:     emailModal.invoice.id,
        toEmail:       email,
        customMessage: emailModal.message,
      }),
    })
    const data = await res.json()
    if (data.ok) {
      setEmailModal(prev => ({ ...prev, sending: false, sent: true }))
      setTimeout(() => setEmailModal(emptyEmail()), 2000)
    } else {
      setEmailModal(prev => ({ ...prev, sending: false, error: data.error ?? 'Failed to send' }))
    }
  }

  const filtered         = filter === 'all' ? invoices : invoices.filter(i => i.status === filter)
  const totalPaid        = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0)
  const totalOutstanding = invoices.filter(i => ['sent','overdue'].includes(i.status)).reduce((s, i) => s + Number(i.amount), 0)
  const totalOverdue     = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + Number(i.amount), 0)

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-lo text-[9px] font-semibold uppercase tracking-[0.22em] mb-1">Billing</p>
          <h1 className="text-hi text-xl font-semibold tracking-tight">Invoices</h1>
          <p className="text-lo text-xs mt-1">{invoices.length} total · {invoices.filter(i => i.status === 'paid').length} paid</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-[#111111] border border-[#1E1E1E] hover:border-[#2A2A2A] text-lo hover:text-mid px-4 py-2 rounded-xl text-xs tracking-wide transition-all">
          <Plus className="h-3.5 w-3.5" /> New Invoice
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Collected',   value: fmt(totalPaid),        color: 'text-up',     icon: <CheckCircle className="h-3.5 w-3.5" />, bg: 'bg-[#121A12] border-[#1D281D]' },
          { label: 'Outstanding', value: fmt(totalOutstanding), color: 'text-signal', icon: <Clock className="h-3.5 w-3.5" />,        bg: 'bg-[#1C1C1C] border-[#282828]' },
          { label: 'Overdue',     value: fmt(totalOverdue),     color: 'text-down',   icon: <AlertCircle className="h-3.5 w-3.5" />,   bg: 'bg-[#181818] border-[#252525]' },
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
          <p className="text-hi text-sm font-semibold mb-5">New Invoice</p>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className={lbl}>Invoice #</label><Input value={form.invoice_number} onChange={e => setForm({...form, invoice_number: e.target.value})} required className={field} /></div>
            <div>
              <label className={lbl}>Client</label>
              <select value={form.client_id} onChange={e => setForm({...form, client_id: e.target.value})} className={sel}>
                <option value="">No client</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div><label className={lbl}>Amount ($) *</label><Input type="number" step="0.01" required value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} placeholder="0.00" className={field} /></div>
            <div>
              <label className={lbl}>Status</label>
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className={sel}>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
            <div><label className={lbl}>Issue Date</label><Input type="date" value={form.issued_date} onChange={e => setForm({...form, issued_date: e.target.value})} className={field} /></div>
            <div><label className={lbl}>Due Date</label><Input type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} className={field} /></div>
            <div className="sm:col-span-2">
              <label className={lbl}>Notes</label>
              <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Invoice notes..." rows={2}
                className="w-full text-xs resize-none bg-[#0A0A0A] border border-[#1E1E1E] text-mid rounded-xl px-3 py-2 focus:outline-none focus:border-signal/40 placeholder:text-lo/50 transition-colors" />
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" disabled={saving}
                className="border border-signal/25 hover:border-signal/40 hover:bg-signal/5 text-signal px-5 py-2 rounded-xl text-xs tracking-wide disabled:opacity-40 transition-all">
                {saving ? 'Saving...' : 'Create Invoice'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="text-lo hover:text-mid text-xs px-4 py-2 transition-colors">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="flex gap-1.5 mb-5 flex-wrap">
        {(['all','draft','sent','paid','overdue'] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-xl text-xs capitalize tracking-wide transition-all ${
              filter === s ? 'border border-signal/25 text-signal bg-signal/5' : 'border border-[#1E1E1E] text-lo hover:text-mid hover:border-[#2A2A2A]'
            }`}>{s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}</button>
        ))}
      </div>

      {loading ? (
        <p className="text-lo text-xs text-center py-16">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <FileText className="h-8 w-8 text-faint" />
          <p className="text-lo text-sm">{invoices.length === 0 ? 'No invoices yet' : 'No invoices match'}</p>
          <p className="text-lo text-xs opacity-70">{invoices.length === 0 ? 'Create your first invoice to start billing' : 'Try a different filter'}</p>
        </div>
      ) : (
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1A1A1A]">
                {['Invoice #','Client','Issued','Due','Status','Amount','Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-3.5 text-lo text-[9px] uppercase tracking-[0.18em] font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => (
                <tr key={inv.id} className="border-b border-[#141414] last:border-0 hover:bg-[#171717] transition-colors group">
                  <td className="px-5 py-3.5 font-mono text-xs text-mid">{inv.invoice_number}</td>
                  <td className="px-5 py-3.5 text-hi text-xs font-medium">{inv.client_name ?? '—'}</td>
                  <td className="px-5 py-3.5 text-lo text-xs">{inv.issued_date}</td>
                  <td className="px-5 py-3.5 text-lo text-xs">{inv.due_date ?? '—'}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[inv.status]}`} />
                      <select value={inv.status} onChange={e => handleStatus(inv.id, e.target.value)}
                        className={`text-xs font-semibold bg-transparent border-0 cursor-pointer focus:outline-none ${STATUS_SELECT_COLOR[inv.status]}`}
                        style={{ appearance: 'none' }}>
                        <option value="draft">Draft</option>
                        <option value="sent">Sent</option>
                        <option value="paid">Paid</option>
                        <option value="overdue">Overdue</option>
                      </select>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-semibold tabular-nums ${inv.status === 'paid' ? 'text-up' : inv.status === 'overdue' ? 'text-down' : 'text-hi'}`}>
                      {fmt(Number(inv.amount))}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {inv.status !== 'paid' && (
                        <button
                          onClick={() => getPaymentLink(inv)}
                          disabled={payingId === inv.id}
                          title={copiedId === inv.id ? 'Link copied!' : 'Create Stripe Payment Link'}
                          className={`p-1.5 rounded-lg hover:bg-[#1C1C1C] transition-all ${
                            copiedId === inv.id ? 'text-up' : 'text-lo hover:text-[#635BFF]'
                          } disabled:opacity-40`}
                        >
                          {copiedId === inv.id
                            ? <Copy className="h-3.5 w-3.5" />
                            : payingId === inv.id
                              ? <ExternalLink className="h-3.5 w-3.5 animate-pulse" />
                              : <Link2 className="h-3.5 w-3.5" />
                          }
                        </button>
                      )}
                      <button onClick={() => downloadPDF(inv)} title="Download PDF"
                        className="p-1.5 rounded-lg hover:bg-[#1C1C1C] text-lo hover:text-signal transition-all">
                        <Download className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => openEmailModal(inv, 'invoice')} title="Send Invoice Email"
                        className="p-1.5 rounded-lg hover:bg-[#1C1C1C] text-lo hover:text-mid transition-all">
                        <Mail className="h-3.5 w-3.5" />
                      </button>
                      {(inv.status === 'sent' || inv.status === 'overdue') && (
                        <button onClick={() => openEmailModal(inv, 'followup')} title="Send Follow-up"
                          className="p-1.5 rounded-lg hover:bg-[#1C1C1C] text-lo hover:text-warn transition-all">
                          <BellRing className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button onClick={() => handleDelete(inv.id)} title="Delete"
                        className="p-1.5 rounded-lg hover:bg-[#1C1C1C] text-lo hover:text-down transition-all">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Email Modal ──────────────────────────────────────────────── */}
      {emailModal.open && emailModal.invoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#111111] border border-[#1E1E1E] rounded-2xl w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1A1A1A]">
              <div className="flex items-center gap-2.5">
                {emailModal.type === 'invoice'
                  ? <Mail className="h-4 w-4 text-signal" />
                  : <BellRing className="h-4 w-4 text-warn" />}
                <p className="text-hi text-sm font-semibold">
                  {emailModal.type === 'invoice' ? 'Send Invoice' : 'Send Follow-up'}
                </p>
              </div>
              <button onClick={() => setEmailModal(emptyEmail())} className="text-lo hover:text-mid transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl px-4 py-3 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-lo">Invoice</span>
                  <span className="text-mid font-mono">{emailModal.invoice.invoice_number}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-lo">Client</span>
                  <span className="text-mid">{emailModal.invoice.client_name ?? '—'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-lo">Amount</span>
                  <span className="text-hi font-semibold">{fmt(Number(emailModal.invoice.amount))}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-lo">Recipient</span>
                  <span className="text-signal text-xs">
                    {clients.find(c => c.id === emailModal.invoice!.client_id)?.email ?? 'No email on file'}
                  </span>
                </div>
              </div>

              <div>
                <label className={lbl}>Personal Message (optional)</label>
                <textarea
                  value={emailModal.message}
                  onChange={e => setEmailModal(prev => ({ ...prev, message: e.target.value }))}
                  placeholder={emailModal.type === 'invoice'
                    ? 'Add a personal note to include with the invoice...'
                    : 'Add a custom follow-up message...'}
                  rows={3}
                  className="w-full text-xs resize-none bg-[#0A0A0A] border border-[#1E1E1E] text-mid rounded-xl px-3 py-2.5 focus:outline-none focus:border-signal/40 placeholder:text-lo/40 transition-colors"
                />
              </div>

              {emailModal.error && (
                <p className="text-down text-xs bg-down/5 border border-down/20 rounded-xl px-4 py-2.5">{emailModal.error}</p>
              )}

              {emailModal.sent && (
                <p className="text-up text-xs bg-up/5 border border-up/20 rounded-xl px-4 py-2.5 flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5" /> Email sent successfully!
                </p>
              )}
            </div>

            <div className="flex gap-3 px-6 pb-5">
              <button
                onClick={sendEmail}
                disabled={emailModal.sending || emailModal.sent}
                className="flex-1 flex items-center justify-center gap-2 bg-[#1C1C1C] hover:bg-[#242424] border border-[#2A2A2A] text-hi text-xs font-medium px-4 py-2.5 rounded-xl transition-all disabled:opacity-40"
              >
                <Send className="h-3.5 w-3.5" />
                {emailModal.sending ? 'Sending...' : emailModal.sent ? 'Sent!' : `Send ${emailModal.type === 'invoice' ? 'Invoice' : 'Follow-up'}`}
              </button>
              <button onClick={() => setEmailModal(emptyEmail())} className="text-lo hover:text-mid text-xs px-4 py-2 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
