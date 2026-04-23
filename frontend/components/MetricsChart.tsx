'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, defs, linearGradient,
  stop, Area, AreaChart,
} from 'recharts'

interface MetricsChartProps {
  data: Array<{ time: string; cpu: number; memory: number }>
  title: string
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-[#142336] border border-[#dae2ef] dark:border-[#1e3a5f] rounded-xl px-3.5 py-2.5 shadow-none text-xs">
      <p className="text-[#5a7a9e] dark:text-[#7aa0c4] mb-1.5 font-medium">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-[#5a7a9e] dark:text-[#7aa0c4]">{p.name}</span>
          <span className="font-semibold tabular-nums ml-auto pl-4" style={{ color: p.color }}>
            {p.value.toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  )
}

export default function MetricsChart({ data, title }: MetricsChartProps) {
  return (
    <div className="rounded-2xl border border-[#dae2ef] dark:border-[#1e3a5f] bg-white dark:bg-[#0f2035] overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#dae2ef]/60 dark:border-[#1e3a5f]/60">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-[#dae2ef] dark:bg-[#1a3558]">
            <svg className="w-4 h-4 text-[#4072af] dark:text-[#7aa8d8]" viewBox="0 0 20 20" fill="none">
              <path d="M3 15l4-5 4 3 8-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="text-sm font-medium text-[#102d4d] dark:text-[#dae2ef]">{title}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-[11px] text-[#5a7a9e] dark:text-[#7aa0c4]">CPU %</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
            <span className="text-[11px] text-[#5a7a9e] dark:text-[#7aa0c4]">Memory %</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="px-2 pt-4 pb-2">
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradCpu" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradMem" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(64,114,175,0.08)"
              vertical={false}
            />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: 'rgba(90,122,158,0.6)' }}
              axisLine={false}
              tickLine={false}
              dy={6}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: 'rgba(90,122,158,0.6)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(64,114,175,0.15)', strokeWidth: 1 }} />

            <Area
              type="monotone"
              dataKey="cpu"
              name="CPU %"
              stroke="#10b981"
              strokeWidth={1.8}
              fill="url(#gradCpu)"
              dot={false}
              activeDot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
            />
            <Area
              type="monotone"
              dataKey="memory"
              name="Memory %"
              stroke="#0ea5e9"
              strokeWidth={1.8}
              fill="url(#gradMem)"
              dot={false}
              activeDot={{ r: 4, fill: '#0ea5e9', strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

    </div>
  )
}