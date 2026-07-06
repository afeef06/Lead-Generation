'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Send, MessageSquare, Users, Circle, ArrowLeft } from 'lucide-react'

interface Employee { id: string; name: string; role: string; active: boolean }
interface Message  { id: string; employee_id: string; content: string; sender: 'admin'|'employee'; created_at: string; is_read: boolean }

const fmtTime = (ts: string) => {
  const d     = new Date(ts)
  const today = new Date()
  const time  = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return d.toDateString() === today.toDateString()
    ? time
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · ' + time
}

export default function MessagesPage() {
  const [employees, setEmployees]   = useState<Employee[]>([])
  const [selected, setSelected]     = useState<Employee | null>(null)
  const [messages, setMessages]     = useState<Message[]>([])
  const [input, setInput]           = useState('')
  const [sending, setSending]       = useState(false)
  const [unread, setUnread]         = useState<Record<string, number>>({})
  const [showChat, setShowChat]     = useState(false)
  const bottomRef                   = useRef<HTMLDivElement>(null)
  const inputRef                    = useRef<HTMLTextAreaElement>(null)
  const sbRef = useRef(createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder_key'
  ))

  const loadEmployees = useCallback(async () => {
    const emps = await fetch('/api/employees').then(r => r.json())
    if (!Array.isArray(emps)) return
    setEmployees(emps.filter((e: Employee) => e.active))
    const counts: Record<string, number> = {}
    await Promise.all(emps.map(async (emp: Employee) => {
      const msgs = await fetch(`/api/messages/${emp.id}`).then(r => r.json())
      if (Array.isArray(msgs)) {
        counts[emp.id] = msgs.filter((m: Message) => m.sender === 'employee' && !m.is_read).length
      }
    }))
    setUnread(counts)
  }, [])

  useEffect(() => { loadEmployees() }, [loadEmployees])

  const loadMessages = useCallback(async (empId: string) => {
    const data = await fetch(`/api/messages/${empId}`).then(r => r.json())
    setMessages(Array.isArray(data) ? data : [])
    await fetch(`/api/messages/${empId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender: 'employee' }),
    })
    setUnread(prev => ({ ...prev, [empId]: 0 }))
  }, [])

  const selectEmployee = (emp: Employee) => {
    setSelected(emp)
    loadMessages(emp.id)
    setInput('')
    setShowChat(true)
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const sb = sbRef.current
    const channel = sb
      .channel('admin-messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, payload => {
        const msg = payload.new as Message
        if (selected && msg.employee_id === selected.id) {
          loadMessages(selected.id)
        } else {
          if (msg.sender === 'employee') {
            setUnread(prev => ({ ...prev, [msg.employee_id]: (prev[msg.employee_id] ?? 0) + 1 }))
          }
        }
      })
      .subscribe()
    return () => { sb.removeChannel(channel) }
  }, [selected, loadMessages])

  const sendMessage = async () => {
    if (!input.trim() || !selected || sending) return
    setSending(true)
    await fetch(`/api/messages/${selected.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: input.trim(), sender: 'admin' }),
    })
    setInput('')
    setSending(false)
    loadMessages(selected.id)
    inputRef.current?.focus()
  }

  const totalUnread = Object.values(unread).reduce((s, n) => s + n, 0)

  return (
    <div className="h-[calc(100dvh-3.5rem)] md:h-screen flex flex-col overflow-hidden">

      {/* Page header */}
      <div className="px-4 md:px-6 py-4 md:py-5 border-b border-[#1A1A1A] flex items-center gap-3 flex-shrink-0">
        {showChat && selected && (
          <button
            onClick={() => setShowChat(false)}
            className="md:hidden p-1 -ml-1 text-lo hover:text-mid transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <MessageSquare className="h-4 w-4 text-signal flex-shrink-0" />
        <div>
          <h1 className="text-hi text-base font-semibold tracking-tight">
            {showChat && selected ? selected.name : 'Messages'}
            {!showChat && totalUnread > 0 && (
              <span className="ml-2 text-[10px] bg-down/20 text-down border border-down/30 px-1.5 py-0.5 rounded-full font-normal">
                {totalUnread} new
              </span>
            )}
          </h1>
          <p className="text-lo text-xs mt-0.5">
            {showChat && selected ? selected.role : 'Send updates and notes to your team'}
          </p>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">

        {/* Employee list */}
        <div className={`border-r border-[#1A1A1A] flex flex-col flex-shrink-0 overflow-y-auto
          ${showChat ? 'hidden md:flex' : 'flex w-full'} md:w-56`}>
          <p className="text-lo text-[9px] uppercase tracking-[0.2em] font-semibold px-4 py-3 border-b border-[#141414]">Team</p>
          {employees.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 px-4 text-center">
              <Users className="h-5 w-5 text-[#2A2A2A] mb-2" />
              <p className="text-lo text-xs">No employees yet</p>
            </div>
          ) : employees.map(emp => {
            const isActive = selected?.id === emp.id
            const badge    = unread[emp.id] ?? 0
            return (
              <button
                key={emp.id}
                onClick={() => selectEmployee(emp)}
                className={`w-full text-left px-4 py-3.5 border-b border-[#141414] transition-colors relative ${
                  isActive ? 'bg-[#141414]' : 'hover:bg-[#0F0F0F]'
                }`}
              >
                {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-signal rounded-r-full" />}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-[#1A1A1A] border border-[#252525] flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-mid">{emp.name.charAt(0)}</span>
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs font-medium truncate ${isActive ? 'text-hi' : 'text-mid'}`}>{emp.name}</p>
                      <p className="text-lo text-[9px] truncate">{emp.role}</p>
                    </div>
                  </div>
                  {badge > 0 && (
                    <span className="flex-shrink-0 w-4 h-4 rounded-full bg-down text-[#0A0A0A] text-[9px] font-bold flex items-center justify-center ml-1">
                      {badge}
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Conversation panel */}
        {!selected ? (
          <div className={`flex-1 flex-col items-center justify-center gap-3 ${showChat ? 'flex' : 'hidden md:flex'}`}>
            <MessageSquare className="h-8 w-8 text-[#1E1E1E]" />
            <p className="text-lo text-sm">Select an employee to start messaging</p>
          </div>
        ) : (
          <div className={`flex-1 flex-col min-w-0 min-h-0 ${showChat ? 'flex' : 'hidden md:flex'}`}>

            {/* Conversation header — desktop only */}
            <div className="hidden md:flex px-5 py-3.5 border-b border-[#1A1A1A] items-center gap-3 flex-shrink-0">
              <div className="w-7 h-7 rounded-xl bg-[#1A1A1A] border border-[#252525] flex items-center justify-center">
                <span className="text-[11px] font-semibold text-mid">{selected.name.charAt(0)}</span>
              </div>
              <div>
                <p className="text-hi text-sm font-medium">{selected.name}</p>
                <p className="text-lo text-[10px]">{selected.role}</p>
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                <Circle className="h-1.5 w-1.5 fill-up text-up" />
                <span className="text-lo text-[10px]">Portal active</span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-3 min-h-0">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2">
                  <MessageSquare className="h-6 w-6 text-[#1E1E1E]" />
                  <p className="text-lo text-xs">No messages yet — send one to get started</p>
                </div>
              ) : messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] md:max-w-[60%] px-4 py-2.5 rounded-2xl ${
                    msg.sender === 'admin'
                      ? 'bg-[#1A1A1A] border border-[#2A2A2A] text-[#BEBEBE] rounded-tr-sm'
                      : 'bg-[#170A0A] border border-[#A50000]/20 text-[#D8C8C6] rounded-tl-sm'
                  }`}>
                    {msg.sender === 'employee' && (
                      <p className="text-[#A50000] text-[9px] font-semibold uppercase tracking-wider mb-1">{selected.name}</p>
                    )}
                    <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    <p className="text-[9px] text-[#404040] mt-1.5 text-right">{fmtTime(msg.created_at)}</p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t border-[#1A1A1A] p-3 md:p-4 flex gap-3 flex-shrink-0">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                placeholder={`Message ${selected.name}…`}
                className="flex-1 bg-[#111111] border border-[#1E1E1E] text-mid rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:border-[#2A2A2A] placeholder:text-lo/40 transition-colors"
                style={{ maxHeight: 120 }}
              />
              <button
                onClick={sendMessage}
                disabled={sending || !input.trim()}
                className="bg-[#1A1A1A] border border-[#2A2A2A] hover:border-signal/30 hover:text-signal text-mid p-2.5 rounded-xl transition-all disabled:opacity-30 flex-shrink-0 self-end"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
