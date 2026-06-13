import { Card } from 'antd'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import ChartTooltip from './ChartTooltip'
import type { TrendData } from '../../types/dashboard'

const VND = (v: number) =>
  v >= 1_000_000_000 ? `${(v / 1_000_000_000).toFixed(1)}B ₫`
    : v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M ₫`
    : new Intl.NumberFormat('vi-VN').format(v) + ' ₫'

interface TrendChartProps {
  data: TrendData[]
}

export default function TrendChart({ data }: TrendChartProps) {
  return (
    <Card title="Revenue & Quantity Trend" size="small" styles={{ body: { height: 340 } }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorQuantity" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis yAxisId="revenue" tickFormatter={(v) => VND(v)} tick={{ fontSize: 11 }} width={90} />
          <YAxis yAxisId="quantity" orientation="right" tick={{ fontSize: 11 }} width={50} />
          <Tooltip content={<ChartTooltip />} />
          <Legend />
          <Area
            yAxisId="revenue"
            type="monotone"
            dataKey="revenue"
            name="Revenue"
            stroke="#6366f1"
            strokeWidth={2}
            fill="url(#colorRevenue)"
          />
          <Area
            yAxisId="quantity"
            type="monotone"
            dataKey="quantity"
            name="Quantity"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#colorQuantity)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  )
}
