'use client'

import { useEffect, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend,
} from 'recharts'

const C_SIGNAL = '#909090'
const C_UP     = '#2A8C68'
const C_DOWN   = '#9B4545'
const C_SKY    = '#707070'
const C_VIOLET = '#6E5A9E'
const C_AMBER  = '#9E7A30'
const PALETTE  = [C_SIGNAL, C_UP, C_AMBER, C_VIOLET, C_DOWN]

const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

const tipStyle = { background: '#141414', border: '1px solid #1E1E1E', borderRadius: 12, fontSize: 11, color: '#888888' }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DarkTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={tipStyle} className="px-4 py-3 shadow-2xl">
      {label && <p className="text-lo text-xs mb-2">{label}</p>}
      {payload.map((p: { name: string; value: number; color: string }, i: number) => (
        <p key={i} className="text-xs" style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' && p.value > 100 ? fmt(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}

interface AnalyticsData {
  monthlyData: { label: string; income: number; expenses: number; profit: number }[]
  serviceRevenue: { name: string; value: number }[]
  acquisitionSources: { name: string; count: number }[]
  clientStatus: { name: string; value: number }[]
  projectPipeline: { name: string; count: number; value: number }[]
  topClients: { name: string; value: number; service: string }[]
  expensesByCategory: { name: string; value: number }[]
}

function ChartCard({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#111111] border border-[#1E1E1E] rounded-2xl p-5">
      <p className="text-hi text-sm font-semibold mb-0.5">{title}</p>
      {sub && <p className="text-lo text-[10px] mb-5 tracking-wide">{sub}</p>}
      {children}
    </div>
  )
}

const axis  = { fill: '#5F6872', fontSize: 10 }
const grd   = { strokeDasharray: '3 6', stroke: '#1E1E1E' }

export default function AnalyticsPage() {
  const [data, setData]       = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/analytics').then(r => r.json()).then(d => {
      if (!d.error) setData(d)
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-lo text-[10px] tracking-[0.2em] uppercase">Loading analytics</p>
    </div>
  )
  if (!data) return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-lo text-xs">Unable to load. Check your Supabase connection.</p>
    </div>
  )

  const totalIncome   = data.monthlyData.reduce((s, m) => s + m.income,   0)
  const totalExpenses = data.monthlyData.reduce((s, m) => s + m.expenses, 0)
  const avgProfit     = data.monthlyData.length
    ? data.monthlyData.reduce((s, m) => s + m.profit, 0) / data.monthlyData.length : 0
  const bestMonth = [...data.monthlyData].sort((a, b) => b.income - a.income)[0]

  return (
    <div className="p-4 md:p-8 max-w-7xl">
      <div className="mb-8">
        <p className="text-lo text-[9px] font-semibold uppercase tracking-[0.22em] mb-1">Reports</p>
        <h1 className="text-hi text-xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-lo text-xs mt-1">Performance metrics and business intelligence</p>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: '7-Month Revenue',    value: fmt(totalIncome),   color: 'text-signal', bg: 'bg-[#1C1C1C]' },
          { label: '7-Month Expenses',   value: fmt(totalExpenses), color: 'text-down',   bg: 'bg-[#181818]' },
          { label: 'Avg Monthly Profit', value: fmt(avgProfit),     color: avgProfit >= 0 ? 'text-up' : 'text-down', bg: avgProfit >= 0 ? 'bg-[#121A12]' : 'bg-[#181818]' },
          { label: 'Best Month',         value: bestMonth?.label ?? '—', color: 'text-mid', bg: 'bg-[#171717]' },
        ].map(stat => (
          <div key={stat.label} className={`${stat.bg} border border-[#1E1E1E] rounded-2xl p-4`}>
            <p className="text-lo text-[9px] uppercase tracking-[0.15em] mb-2">{stat.label}</p>
            <p className={`text-xl font-semibold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

        <ChartCard title="Revenue Trend" sub="Income vs Expenses — 7 months">
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={data.monthlyData} margin={{ left: -24 }}>
              <defs>
                <linearGradient id="gI2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C_UP}   stopOpacity={0.18} />
                  <stop offset="95%" stopColor={C_UP}   stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gE2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C_DOWN} stopOpacity={0.14} />
                  <stop offset="95%" stopColor={C_DOWN} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...grd} />
              <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} />
              <YAxis tick={axis} axisLine={false} tickLine={false}
                tickFormatter={v => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
              <Tooltip content={<DarkTip />} />
              <Area type="monotone" dataKey="income"   name="Income"
                stroke={C_UP}   strokeWidth={1.5} fill="url(#gI2)" dot={{ fill: C_UP,   r: 2.5 }} />
              <Area type="monotone" dataKey="expenses" name="Expenses"
                stroke={C_DOWN} strokeWidth={1.5} fill="url(#gE2)" dot={{ fill: C_DOWN, r: 2.5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Monthly Profit / Loss" sub="Net performance each month">
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={data.monthlyData} margin={{ left: -24 }}>
              <CartesianGrid {...grd} vertical={false} />
              <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} />
              <YAxis tick={axis} axisLine={false} tickLine={false}
                tickFormatter={v => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
              <Tooltip content={<DarkTip />} />
              <Bar dataKey="profit" name="Profit" radius={[4, 4, 0, 0]}>
                {data.monthlyData.map((e, i) => (
                  <Cell key={i} fill={e.profit >= 0 ? C_UP : C_DOWN} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Revenue by Service" sub="Monthly value per service line">
          {data.serviceRevenue.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="45%" height={170}>
                <PieChart>
                  <Pie data={data.serviceRevenue} cx="50%" cy="50%"
                    innerRadius={44} outerRadius={70} paddingAngle={3} dataKey="value">
                    {data.serviceRevenue.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} opacity={0.9} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => fmt(Number(v))} contentStyle={tipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2.5 flex-1">
                {data.serviceRevenue.map((s, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-mid text-[10px]">
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: PALETTE[i % PALETTE.length] }} />
                      {s.name}
                    </span>
                    <span className="text-lo text-[10px]">{fmt(s.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[170px] flex items-center justify-center text-lo text-xs">Add clients with monthly values</div>
          )}
        </ChartCard>

        <ChartCard title="Client Acquisition" sub="How clients are finding you">
          {data.acquisitionSources.length > 0 ? (
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={data.acquisitionSources} layout="vertical" margin={{ right: 16 }}>
                <CartesianGrid {...grd} horizontal={false} />
                <XAxis type="number" tick={axis} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={axis} axisLine={false} tickLine={false} width={90} />
                <Tooltip contentStyle={tipStyle} />
                <Bar dataKey="count" name="Clients" fill={C_SKY} radius={[0, 4, 4, 0]} fillOpacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[170px] flex items-center justify-center text-lo text-xs">No client data yet</div>
          )}
        </ChartCard>

        <ChartCard title="Top Clients by Value" sub="Ranked by monthly contract value">
          {data.topClients.length > 0 ? (
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={data.topClients} layout="vertical" margin={{ right: 16 }}>
                <CartesianGrid {...grd} horizontal={false} />
                <XAxis type="number" tick={axis} axisLine={false} tickLine={false}
                  tickFormatter={v => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                <YAxis type="category" dataKey="name" tick={axis} axisLine={false} tickLine={false} width={90} />
                <Tooltip formatter={(v) => fmt(Number(v))} contentStyle={tipStyle} />
                <Bar dataKey="value" name="Monthly Value" fill={C_SIGNAL} radius={[0, 4, 4, 0]} fillOpacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[170px] flex items-center justify-center text-lo text-xs">No clients yet</div>
          )}
        </ChartCard>

        <ChartCard title="Project Pipeline" sub="Status breakdown by count and value">
          {data.projectPipeline.length > 0 ? (
            <ResponsiveContainer width="100%" height={170}>
              <RadarChart data={data.projectPipeline}>
                <PolarGrid stroke="#1E1E1E" />
                <PolarAngleAxis dataKey="name" tick={{ fill: '#5F6872', fontSize: 10 }} />
                <Radar name="Count"    dataKey="count" stroke={C_SIGNAL} fill={C_SIGNAL} fillOpacity={0.14} strokeWidth={1} />
                <Radar name="Value $k" dataKey="value" stroke={C_UP}     fill={C_UP}     fillOpacity={0.10} strokeWidth={1} />
                <Legend wrapperStyle={{ fontSize: 10, color: '#888888' }} />
                <Tooltip contentStyle={tipStyle} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[170px] flex items-center justify-center text-lo text-xs">No projects yet</div>
          )}
        </ChartCard>

      </div>

      {data.expensesByCategory.length > 0 && (
        <ChartCard title="Expense Breakdown" sub="All-time spend per category">
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={data.expensesByCategory} margin={{ left: -24 }}>
              <CartesianGrid {...grd} vertical={false} />
              <XAxis dataKey="name" tick={axis} axisLine={false} tickLine={false} />
              <YAxis tick={axis} axisLine={false} tickLine={false}
                tickFormatter={v => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
              <Tooltip formatter={(v) => fmt(Number(v))} contentStyle={tipStyle} />
              <Bar dataKey="value" name="Amount" fill={C_DOWN} radius={[4, 4, 0, 0]} fillOpacity={0.75} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  )
}
