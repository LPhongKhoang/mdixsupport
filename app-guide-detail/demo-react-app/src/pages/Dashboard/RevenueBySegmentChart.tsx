import { Card } from 'antd'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import type { SegmentData } from '../../types/dashboard'

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899']

const VND = (v: number) =>
  v >= 1_000_000_000 ? `${(v / 1_000_000_000).toFixed(1)}B ₫`
    : v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M ₫`
    : new Intl.NumberFormat('vi-VN').format(v) + ' ₫'

function renderCustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) {
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  if (percent < 0.05) return null
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
      {`${name} ${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

interface RevenueBySegmentChartProps {
  data: SegmentData[]
  onChartClick: (filterKey: string, value: string) => void
}

export default function RevenueBySegmentChart({ data, onChartClick }: RevenueBySegmentChartProps) {
  return (
    <Card title="Revenue by Segment" size="small" styles={{ body: { height: 340 } }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="revenue"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={120}
            label={renderCustomLabel}
            labelLine={false}
            cursor="pointer"
            onClick={(data) => onChartClick('segment', data.name)}
          >
            {data.map((_entry: any, index: number) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) => [VND(value), name]}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  )
}
