import { Card, Row, Col, Statistic } from 'antd'
import {
  DollarOutlined, ShoppingCartOutlined, TransactionOutlined, BarChartOutlined, TagOutlined,
} from '@ant-design/icons'
import type { KPIData } from '../../types/dashboard'

const VND = (v: number) =>
  v >= 1_000_000_000 ? `${(v / 1_000_000_000).toFixed(1)}B ₫`
    : v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M ₫`
    : new Intl.NumberFormat('vi-VN').format(v) + ' ₫'

const NUM = (v: number) => new Intl.NumberFormat('vi-VN').format(v)

const KPI_CONFIG = [
  { key: 'revenue', title: 'Revenue', icon: <DollarOutlined />, color: '#6366f1', format: VND },
  { key: 'quantity', title: 'Quantity', icon: <ShoppingCartOutlined />, color: '#10b981', format: NUM },
  { key: 'transactions', title: 'Transactions', icon: <TransactionOutlined />, color: '#f59e0b', format: NUM },
  { key: 'avgOrder', title: 'Avg Order', icon: <BarChartOutlined />, color: '#8b5cf6', format: VND },
  { key: 'discount', title: 'Discount', icon: <TagOutlined />, color: '#ef4444', format: VND },
] as const

interface KPICardsProps {
  kpis: KPIData
}

export default function KPICards({ kpis }: KPICardsProps) {
  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
      {KPI_CONFIG.map(({ key, title, icon, color, format }) => (
        <Col xs={12} sm={8} md={4} key={key}>
          <Card size="small" style={{ borderLeft: `4px solid ${color}` }} styles={{ body: { padding: '16px 20px' } }}>
            <Statistic
              title={title}
              value={kpis[key as keyof KPIData]}
              prefix={icon}
              formatter={(val) => format(val as number)}
              valueStyle={{ fontWeight: 700, color }}
            />
          </Card>
        </Col>
      ))}
    </Row>
  )
}
