import { Card, Typography } from 'antd'

const { Text } = Typography

const VND = (v: number) =>
  v >= 1_000_000_000 ? `${(v / 1_000_000_000).toFixed(1)}B ₫`
    : v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M ₫`
    : new Intl.NumberFormat('vi-VN').format(v) + ' ₫'

export default function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <Card size="small" style={{ borderColor: '#e5e7eb', borderRadius: 8, fontSize: 13 }} styles={{ body: { padding: '8px 12px' } }}>
      <Text strong style={{ color: '#1f2937' }}>{label}</Text>
      <div style={{ marginTop: 4 }}>
        {payload.map((p: any, i: number) => (
          <div key={i} style={{ color: '#4b5563' }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: p.color, marginRight: 6 }} />
            {p.name}: <Text strong style={{ color: '#6366f1' }}>{VND(p.value)}</Text>
          </div>
        ))}
      </div>
    </Card>
  )
}
