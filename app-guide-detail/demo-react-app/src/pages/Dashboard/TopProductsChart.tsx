import { Card } from 'antd'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts'
import ChartTooltip from './ChartTooltip'
import type { TopProductData } from '../../types/dashboard'

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899']
const VND = (v: number) =>
  v >= 1_000_000_000 ? `${(v / 1_000_000_000).toFixed(1)}B ₫`
    : v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M ₫`
    : new Intl.NumberFormat('vi-VN').format(v) + ' ₫'

interface TopProductsChartProps {
  data: TopProductData[]
}

export default function TopProductsChart({ data }: TopProductsChartProps) {
  return (
    <Card title="Top 10 Products" size="small" styles={{ body: { height: 340 } }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis type="number" tickFormatter={(v) => VND(v)} tick={{ fontSize: 11 }} />
          <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={140} />
          <Tooltip content={<ChartTooltip />} />
          <Legend />
          <Bar dataKey="revenue" name="Revenue" radius={[0, 4, 4, 0]}>
            {data.map((_entry: any, index: number) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}
