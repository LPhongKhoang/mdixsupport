import { Card } from 'antd'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import ChartTooltip from './ChartTooltip'
import type { CategoryData } from '../../types/dashboard'

const VND = (v: number) =>
  v >= 1_000_000_000 ? `${(v / 1_000_000_000).toFixed(1)}B ₫`
    : v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M ₫`
    : new Intl.NumberFormat('vi-VN').format(v) + ' ₫'

interface RevenueByCategoryChartProps {
  data: CategoryData[]
  onChartClick: (filterKey: string, value: string) => void
}

export default function RevenueByCategoryChart({ data, onChartClick }: RevenueByCategoryChartProps) {
  return (
    <Card title="Revenue by Category" size="small" styles={{ body: { height: 340 } }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={(v) => VND(v)} tick={{ fontSize: 11 }} width={90} />
          <Tooltip content={<ChartTooltip />} />
          <Legend />
          <Bar
            dataKey="revenue"
            name="Revenue"
            fill="#6366f1"
            radius={[4, 4, 0, 0]}
            cursor="pointer"
            onClick={(data) => onChartClick('category', data.name)}
          />
          <Bar
            dataKey="quantity"
            name="Quantity"
            fill="#10b981"
            radius={[4, 4, 0, 0]}
            cursor="pointer"
            onClick={(data) => onChartClick('category', data.name)}
          />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}
