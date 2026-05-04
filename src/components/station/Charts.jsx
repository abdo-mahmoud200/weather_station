import { useId } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatTime } from '../../utils/formatters'

const TICK = {
  fill: '#6b7a90',
  fontSize: 11,
  fontFamily: '"Space Mono", ui-monospace, monospace',
}

function CommonTooltip({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-md border border-bg-border bg-bg-surface p-2 shadow-xl">
      <p className="mb-1 font-mono text-[11px] text-text-muted">
        {new Date(label).toLocaleString()}
      </p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="metric-value text-xs text-text-primary">
          <span
            className="mr-1.5 inline-block h-2 w-2 rounded-full"
            style={{ background: entry.color }}
          />
          {entry.value?.toFixed ? entry.value.toFixed(2) : entry.value} {unit}
        </p>
      ))}
    </div>
  )
}

export function TimeSeriesChart({
  data,
  unit = '',
  color = '#3fb950',
  type = 'line',
  height = 220,
}) {
  const Chart = type === 'area' ? AreaChart : LineChart
  const reactId = useId().replace(/:/g, '')
  const gradientId = `grad-${reactId}`

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <Chart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="t"
            type="number"
            domain={['dataMin', 'dataMax']}
            scale="time"
            tickFormatter={(value) => formatTime(value)}
            tick={TICK}
            stroke="#222b3a"
          />
          <YAxis
            tick={TICK}
            stroke="#222b3a"
            width={42}
            tickFormatter={(value) => value.toFixed?.(0) ?? value}
          />
          <Tooltip content={<CommonTooltip unit={unit} />} />
          {type === 'area' ? (
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              isAnimationActive={false}
              dot={false}
            />
          ) : (
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          )}
        </Chart>
      </ResponsiveContainer>
    </div>
  )
}

export function MultiSeriesChart({ data, series, unit = '', height = 220 }) {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="t"
            type="number"
            domain={['dataMin', 'dataMax']}
            scale="time"
            tickFormatter={(value) => formatTime(value)}
            tick={TICK}
            stroke="#222b3a"
          />
          <YAxis
            tick={TICK}
            stroke="#222b3a"
            width={42}
            tickFormatter={(value) => value.toFixed?.(0) ?? value}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null

              return (
                <div className="rounded-md border border-bg-border bg-bg-surface p-2 shadow-xl">
                  <p className="mb-1 font-mono text-[11px] text-text-muted">
                    {new Date(label).toLocaleString()}
                  </p>
                  {payload.map((entry) => (
                    <p key={entry.dataKey} className="metric-value text-xs text-text-primary">
                      <span
                        className="mr-1.5 inline-block h-2 w-2 rounded-full"
                        style={{ background: entry.color }}
                      />
                      {series.find((item) => item.key === entry.dataKey)?.label || entry.dataKey}:{' '}
                      {entry.value?.toFixed ? entry.value.toFixed(2) : entry.value} {unit}
                    </p>
                  ))}
                </div>
              )
            }}
          />
          {series.map((entry) => (
            <Line
              key={entry.key}
              type="monotone"
              dataKey={entry.key}
              stroke={entry.color}
              strokeWidth={2}
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function RainfallBarChart({ data, unit = 'mm', height = 200 }) {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="day" tick={TICK} stroke="#222b3a" />
          <YAxis tick={TICK} stroke="#222b3a" width={36} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null

              return (
                <div className="rounded-md border border-bg-border bg-bg-surface p-2 shadow-xl">
                  <p className="mb-1 font-mono text-[11px] text-text-muted">{label}</p>
                  <p className="metric-value text-xs text-text-primary">
                    {payload[0].value.toFixed(2)} {unit}
                  </p>
                </div>
              )
            }}
          />
          <Bar
            dataKey="value"
            fill="#58a6ff"
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
