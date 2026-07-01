'use client'

import { useState, useRef, useEffect } from 'react'
import { Bot, Send, User, Sparkles, RotateCcw } from 'lucide-react'

interface Message { role: 'user' | 'assistant'; content: string }

const QUICK_PROMPTS = [
  'Draft a welcome email for a new AI Freelancing client',
  'Write a proposal for a brandscaling project for a local restaurant',
  'Create an onboarding checklist for new website clients',
  'Suggest 5 upsell strategies for my AI consultation clients',
  'Write a follow-up to a lead who hasn\'t responded in a week',
  'Give me a pricing strategy for my AI freelancing services',
]

function FormattedMessage({ content }: { content: string }) {
  const lines = content.split('\n')
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith('### ')) return <p key={i} className="text-hi font-semibold text-xs mt-3 mb-1 uppercase tracking-widest">{line.slice(4)}</p>
        if (line.startsWith('## '))  return <p key={i} className="text-hi font-semibold text-xs mt-3 mb-1">{line.slice(3)}</p>
        if (line.startsWith('# '))   return <p key={i} className="text-hi font-semibold mt-3 mb-1">{line.slice(2)}</p>
        if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="text-mid font-medium text-xs">{line.slice(2, -2)}</p>
        if (line.startsWith('- ') || line.startsWith('* ')) return (
          <p key={i} className="flex gap-2 text-xs">
            <span className="text-signal flex-shrink-0 mt-0.5">·</span>
            <span className="text-mid">{line.slice(2)}</span>
          </p>
        )
        if (/^\d+\. /.test(line)) {
          const m = line.match(/^(\d+)\. (.*)/)
          if (m) return (
            <p key={i} className="flex gap-2 text-xs">
              <span className="text-signal flex-shrink-0 w-3 font-medium">{m[1]}.</span>
              <span className="text-mid">{m[2]}</span>
            </p>
          )
        }
        if (line === '') return <div key={i} className="h-1" />
        return <p key={i} className="text-mid text-xs whitespace-pre-wrap leading-relaxed">{line}</p>
      })}
    </div>
  )
}

export default function AgentPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const bottomRef   = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async (text?: string) => {
    const content = text ?? input.trim()
    if (!content || loading) return
    const newMessages = [...messages, { role: 'user' as const, content }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    try {
      const res  = await fetch('/api/agent', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })
      const data = await res.json()
      setMessages([...newMessages, {
        role: 'assistant',
        content: data.reply ?? data.error ?? 'Something went wrong. Check your ANTHROPIC_API_KEY.',
      }])
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: 'Connection error. Please try again.' }])
    }
    setLoading(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px'
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem)] md:h-screen">

      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-[#1A1A1A]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#141414] border border-ai/25 flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-3.5 w-3.5 text-ai" />
          </div>
          <div>
            <p className="text-hi text-xs font-semibold">AI Business Agent</p>
            <p className="text-lo text-[10px] tracking-wide">Powered by Claude · claude-sonnet-4-6</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button onClick={() => setMessages([])}
            className="flex items-center gap-1.5 text-lo hover:text-mid text-xs transition-colors border border-[#1E1E1E] hover:border-[#2A2A2A] px-3 py-1.5 rounded-xl">
            <RotateCcw className="h-3 w-3" /> Clear chat
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-6 space-y-5">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center pb-12">
            <div className="w-12 h-12 rounded-2xl bg-[#141414] border border-ai/20 flex items-center justify-center mb-5">
              <Sparkles className="h-5 w-5 text-ai" />
            </div>
            <p className="text-hi text-sm font-semibold mb-1.5">AI Business Agent</p>
            <p className="text-lo text-xs max-w-sm mb-8 leading-relaxed">
              Draft emails, write proposals, create documents, and get strategic advice for your AI agency.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {QUICK_PROMPTS.map((prompt, i) => (
                <button key={i} onClick={() => send(prompt)}
                  className="text-left border border-[#1E1E1E] hover:border-ai/25 hover:bg-[#141414] text-lo hover:text-mid text-xs px-4 py-3 rounded-xl transition-all leading-relaxed">
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`flex-shrink-0 w-7 h-7 rounded-full border flex items-center justify-center ${
              msg.role === 'user' ? 'border-signal/25 bg-signal/10' : 'border-ai/25 bg-[#141414]'
            }`}>
              {msg.role === 'user'
                ? <User className="h-3 w-3 text-signal" />
                : <Sparkles className="h-3 w-3 text-ai" />}
            </div>
            <div className={`max-w-[78%] px-4 py-3 rounded-2xl text-xs ${
              msg.role === 'user'
                ? 'bg-[#1C1C1C] border border-signal/15 rounded-tr-sm'
                : 'bg-[#111111] border border-[#1E1E1E] rounded-tl-sm'
            }`}>
              {msg.role === 'user'
                ? <p className="whitespace-pre-wrap text-mid">{msg.content}</p>
                : <FormattedMessage content={msg.content} />}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full border border-ai/25 bg-[#141414] flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-3 w-3 text-ai" />
            </div>
            <div className="bg-[#111111] border border-[#1E1E1E] rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1 items-center h-4">
                {[0, 150, 300].map(d => (
                  <span key={d} className="w-1 h-1 bg-ai/60 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[#1A1A1A] px-4 md:px-6 py-4">
        <div className="flex items-end gap-3 bg-[#111111] border border-[#1E1E1E] focus-within:border-ai/30 rounded-xl px-4 py-3 transition-colors">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Ask your agent anything..."
            rows={1}
            className="flex-1 bg-transparent text-mid text-xs placeholder:text-lo/50 resize-none outline-none max-h-36 leading-relaxed"
          />
          <button onClick={() => send()} disabled={!input.trim() || loading}
            className="w-7 h-7 rounded-lg border border-[#1E1E1E] hover:border-ai/40 hover:bg-ai/10 flex items-center justify-center transition-all disabled:opacity-30 flex-shrink-0">
            <Send className="h-3 w-3 text-lo hover:text-ai" />
          </button>
        </div>
        <p className="text-lo text-[9px] text-center mt-2 tracking-wider opacity-40 uppercase">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  )
}
