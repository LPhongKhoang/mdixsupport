import { Card, Table, Typography } from 'antd'
import type { CrossTabRow } from '../../types/dashboard'

const { Text } = Typography

const VND = (v: number) =>
  v >= 1_000_000_000 ? `${(v / 1_000_000_000).toFixed(1)}B ₫`
    : v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M ₫`
    : new Intl.NumberFormat('vi-VN').format(v) + ' ₫'

interface CrossTabTableProps {
  data: CrossTabRow[]
}

export default function CrossTabTable({ data }: CrossTabTableProps) {
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'] as const

  const maxValues: Record<string, number> = {}
  quarters.forEach((q) => {
    maxValues[q] = Math.max(...data.map((r) => r[q] ?? 0))
  })

  const totals = data.reduce(
    (acc, row) => {
      acc.Q1 = (acc.Q1 ?? 0) + (row.Q1 ?? 0)
      acc.Q2 = (acc.Q2 ?? 0) + (row.Q2 ?? 0)
      acc.Q3 = (acc.Q3 ?? 0) + (row.Q3 ?? 0)
      acc.Q4 = (acc.Q4 ?? 0) + (row.Q4 ?? 0)
      return acc
    },
    { Q1: 0, Q2: 0, Q3: 0, Q4: 0 } as Record<string, number>,
  )
  const grandTotal = (totals.Q1 ?? 0) + (totals.Q2 ?? 0) + (totals.Q3 ?? 0) + (totals.Q4 ?? 0)

  const columns = [
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      fixed: 'left' as const,
      width: 160,
      render: (text: string) => <Text strong>{text}</Text>,
    },
    ...quarters.map((q) => ({
      title: q,
      dataIndex: q,
      key: q,
      width: 160,
      align: 'right' as const,
      render: (value: number | undefined) => {
        const isMax = value === maxValues[q] && value !== undefined
        return (
          <span style={{ fontWeight: isMax ? 700 : 400, color: isMax ? '#6366f1' : undefined }}>
            {VND(value ?? 0)}
          </span>
        )
      },
    })),
    {
      title: 'Total',
      key: 'total',
      width: 160,
      align: 'right' as const,
      render: (_: unknown, record: CrossTabRow) => {
        const total = quarters.reduce((sum, q) => sum + (record[q] ?? 0), 0)
        return <Text strong style={{ color: '#1f2937' }}>{VND(total)}</Text>
      },
    },
  ]

  return (
    <Card title="Category × Quarter Cross-Tab" size="small">
      <Table<CrossTabRow>
        columns={columns}
        dataSource={data}
        rowKey="category"
        pagination={false}
        size="small"
        bordered
        scroll={{ x: 900 }}
        summary={() => (
          <Table.Summary fixed>
            <Table.Summary.Row style={{ background: '#fafafa' }}>
              <Table.Summary.Cell index={0}>
                <Text strong style={{ color: '#6366f1' }}>Total</Text>
              </Table.Summary.Cell>
              {quarters.map((q, i) => (
                <Table.Summary.Cell key={q} index={i + 1} align="right">
                  <Text strong style={{ color: '#6366f1' }}>{VND(totals[q] ?? 0)}</Text>
                </Table.Summary.Cell>
              ))}
              <Table.Summary.Cell index={5} align="right">
                <Text strong style={{ color: '#6366f1' }}>{VND(grandTotal)}</Text>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />
    </Card>
  )
}
