'use client'

import { useEffect, useState } from 'react'
import { Client, Project } from '@/lib/types'
import { Plus, Trash2, Sparkles, CheckSquare, Square, RefreshCw, ListTodo } from 'lucide-react'
import { Input } from '@/components/ui/input'

type TaskStatus   = 'todo' | 'in-progress' | 'done'
type TaskPriority = 'high' | 'medium' | 'low'

interface Task {
  id: string; title: string; description?: string
  client_id?: string; client_name?: string
  project_id?: string; project_name?: string
  status: TaskStatus; priority: TaskPriority
  due_date?: string; ai_generated: boolean; created_at: string
}

const PRIORITY_PILL: Record<TaskPriority, string> = {
  high:   'bg-down/10 text-down border border-down/20',
  medium: 'bg-warn/10 text-warn border border-warn/20',
  low:    'bg-[#1A1A1A] text-lo border border-[#1E1E1E]',
}

const field = 'bg-[#0A0A0A] border-[#1E1E1E] text-mid placeholder:text-lo/50 focus:border-signal/40 transition-colors rounded-xl'
const sel   = 'w-full bg-[#0A0A0A] border border-[#1E1E1E] text-mid rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-signal/40 transition-colors'
const lbl   = 'text-lo text-[9px] uppercase tracking-[0.15em] mb-1.5 block font-medium'

export default function TasksPage() {
  const [tasks, setTasks]         = useState<Task[]>([])
  const [clients, setClients]     = useState<Client[]>([])
  const [projects, setProjects]   = useState<Project[]>([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [filter, setFilter]       = useState('all')
  const [saving, setSaving]       = useState(false)
  const [form, setForm] = useState({
    title: '', description: '', client_id: '', project_id: '',
    priority: 'medium', due_date: '', status: 'todo',
  })

  const load = () => {
    Promise.all([
      fetch('/api/tasks').then(r => r.json()),
      fetch('/api/clients').then(r => r.json()),
      fetch('/api/projects').then(r => r.json()),
    ]).then(([t, c, p]) => {
      setTasks(Array.isArray(t) ? t : [])
      setClients(Array.isArray(c) ? c : [])
      setProjects(Array.isArray(p) ? p : [])
      setLoading(false)
    })
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    await fetch('/api/tasks', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, client_id: form.client_id || null, project_id: form.project_id || null, due_date: form.due_date || null, ai_generated: false }),
    })
    setSaving(false); setShowForm(false)
    setForm({ title: '', description: '', client_id: '', project_id: '', priority: 'medium', due_date: '', status: 'todo' })
    load()
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' }); load()
  }

  const handleToggle = async (task: Task) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done'
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    }); load()
  }

  const generateAITasks = async () => {
    setAiLoading(true)
    const activeProjects = projects.filter(p => p.status === 'in-progress').slice(0, 5)
    const activeClients  = clients.filter(c => c.status === 'active').slice(0, 5)
    const context = `Active projects: ${activeProjects.map(p => `${p.name} (${p.service_type})`).join(', ') || 'none'}. Active clients: ${activeClients.map(c => `${c.name} – ${c.service_type}`).join(', ') || 'none'}.`
    try {
      const res  = await fetch('/api/agent', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: `Generate 6 specific actionable tasks for this week based on: ${context}\n\nReturn ONLY a JSON array: [{"title":"...","description":"...","priority":"high|medium|low"}]` }] }),
      })
      const data = await res.json()
      const match = (data.reply ?? '').match(/\[[\s\S]*\]/)
      if (match) {
        const generated = JSON.parse(match[0])
        for (const t of generated) {
          await fetch('/api/tasks', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...t, status: 'todo', ai_generated: true }),
          })
        }
        load()
      }
    } catch { /* silent */ }
    setAiLoading(false)
  }

  const filtered = tasks.filter(t => {
    if (filter === 'all') return true
    if (filter === 'ai')  return t.ai_generated
    return t.status === filter
  })

  const done  = tasks.filter(t => t.status === 'done').length
  const total = tasks.length

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-lo text-[9px] font-semibold uppercase tracking-[0.22em] mb-1">Operations</p>
          <h1 className="text-hi text-xl font-semibold tracking-tight">Tasks</h1>
          {total > 0 && <p className="text-lo text-xs mt-1">{done}/{total} complete · {Math.round((done / total) * 100)}%</p>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={generateAITasks} disabled={aiLoading}
            className="flex items-center gap-2 bg-[#141414] border border-ai/20 hover:border-ai/40 text-ai px-4 py-2 rounded-xl text-xs tracking-wide transition-all disabled:opacity-40">
            {aiLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            {aiLoading ? 'Generating...' : 'AI Generate'}
          </button>
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-[#111111] border border-[#1E1E1E] hover:border-[#2A2A2A] text-lo hover:text-mid px-4 py-2 rounded-xl text-xs tracking-wide transition-all">
            <Plus className="h-3.5 w-3.5" /> Add Task
          </button>
        </div>
      </div>

      {total > 0 && (
        <div className="mb-6">
          <div className="h-1 bg-[#1A1A1A] rounded-full overflow-hidden">
            <div className="h-full bg-signal/60 rounded-full transition-all duration-700" style={{ width: `${(done / total) * 100}%` }} />
          </div>
        </div>
      )}

      {showForm && (
        <div className="bg-[#111111] border border-[#1E1E1E] rounded-2xl p-6 mb-6">
          <p className="text-hi text-sm font-semibold mb-5">New Task</p>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={lbl}>Task Title *</label>
              <Input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Follow up with client about scope" className={field} />
            </div>
            <div className="sm:col-span-2">
              <label className={lbl}>Description</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Optional details..." rows={2}
                className="w-full text-xs resize-none bg-[#0A0A0A] border border-[#1E1E1E] text-mid rounded-xl px-3 py-2 focus:outline-none focus:border-signal/40 placeholder:text-lo/50 transition-colors" />
            </div>
            <div>
              <label className={lbl}>Priority</label>
              <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} className={sel}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div><label className={lbl}>Due Date</label><Input type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} className={field} /></div>
            <div>
              <label className={lbl}>Client</label>
              <select value={form.client_id} onChange={e => setForm({...form, client_id: e.target.value})} className={sel}>
                <option value="">No client</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Project</label>
              <select value={form.project_id} onChange={e => setForm({...form, project_id: e.target.value})} className={sel}>
                <option value="">No project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" disabled={saving}
                className="border border-signal/25 hover:border-signal/40 hover:bg-signal/5 text-signal px-5 py-2 rounded-xl text-xs tracking-wide disabled:opacity-40 transition-all">
                {saving ? 'Saving...' : 'Add Task'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="text-lo hover:text-mid text-xs px-4 py-2 transition-colors">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="flex gap-1.5 mb-5 flex-wrap">
        {[
          { key: 'all',         label: 'All' },
          { key: 'todo',        label: 'To Do' },
          { key: 'in-progress', label: 'In Progress' },
          { key: 'done',        label: 'Done' },
          { key: 'ai',          label: '✦ AI Generated' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-xl text-xs tracking-wide transition-all ${
              filter === f.key ? 'border border-signal/25 text-signal bg-signal/5' : 'border border-[#1E1E1E] text-lo hover:text-mid hover:border-[#2A2A2A]'
            }`}>{f.label}</button>
        ))}
      </div>

      {loading ? (
        <p className="text-lo text-xs text-center py-16">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <ListTodo className="h-8 w-8 text-faint" />
          <p className="text-lo text-sm">{tasks.length === 0 ? 'No tasks yet' : 'No tasks match'}</p>
          <p className="text-lo text-xs opacity-70">{tasks.length === 0 ? 'Use AI Generate to auto-create tasks from active projects' : 'Try a different filter'}</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map(task => (
            <div key={task.id} className={`group flex items-start gap-3.5 border rounded-xl p-4 transition-all ${
              task.status === 'done'
                ? 'border-[#141414] bg-[#0F0F0F] opacity-60'
                : 'border-[#1E1E1E] bg-[#111111] hover:border-[#2A2A2A]'
            }`}>
              <button onClick={() => handleToggle(task)} className="mt-0.5 flex-shrink-0 transition-colors">
                {task.status === 'done'
                  ? <CheckSquare className="h-4 w-4 text-up" />
                  : <Square className="h-4 w-4 text-lo hover:text-signal transition-colors" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <p className={`text-xs font-medium leading-snug ${task.status === 'done' ? 'line-through text-lo' : 'text-hi'}`}>{task.title}</p>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {task.ai_generated && (
                      <span className="flex items-center gap-1 text-[9px] text-ai bg-ai/10 border border-ai/20 rounded-full px-2 py-0.5">
                        <Sparkles className="h-2.5 w-2.5" /> AI
                      </span>
                    )}
                    <span className={`text-[9px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${PRIORITY_PILL[task.priority]}`}>
                      {task.priority}
                    </span>
                    <button onClick={() => handleDelete(task.id)} className="text-[#1E1E1E] hover:text-down transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {task.description && <p className="text-lo text-[10px] mt-1 leading-relaxed">{task.description}</p>}
                {(task.client_name || task.project_name || task.due_date) && (
                  <div className="flex items-center gap-3 mt-2">
                    {task.client_name  && <span className="text-lo text-[10px] bg-[#0F0F0F] border border-[#1A1A1A] rounded-full px-2 py-0.5">{task.client_name}</span>}
                    {task.project_name && <span className="text-lo text-[10px] bg-[#0F0F0F] border border-[#1A1A1A] rounded-full px-2 py-0.5">{task.project_name}</span>}
                    {task.due_date     && <span className="text-lo text-[10px]">Due {task.due_date}</span>}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
