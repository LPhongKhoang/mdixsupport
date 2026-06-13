import { Card } from 'antd'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import ChartTooltip from './ChartTooltip'
import type { CountryData } from '../../types/dashboard'

const VND = (v: number) =>
  v >= 1_000_000_000 ? `${(v / 1_000_000_000).toFixed(1)}B ₫`
    : v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M ₫`
    : new Intl.NumberFormat('vi-VN').format(v) + ' ₫'

interface RevenueByCountryChartProps {
  data: CountryData[]
  onChartClick: (filterKey: string, value: string) => void
}

export default function RevenueByCountryChart({ data, onChartClick }: RevenueByCountryChartProps) {
  return (
    <Card title="Revenue by Country" size="small" styles={{ body: { height: 340 } }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis type="number" tickFormatter={(v) => VND(v)} tick={{ fontSize: 11 }} />
          <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={100} />
          <Tooltip content={<ChartTooltip />} />
          <Legend />
          <Bar
            dataKey="revenue"
            name="Revenue"
            fill="#8b5cf6"
            radius={[0, 4, 4, 0]}
            cursor="pointer"
            onClick={(data) => onChartClick('country', data.name)}
          />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}
