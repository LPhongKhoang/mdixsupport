import { useState, useEffect, useCallback } from 'react'
import {
  Layout, Card, Row, Col, Select, Button, Tag, Statistic, Table, Space, Typography, ConfigProvider, Flex, Tooltip as AntTooltip, theme,
} from 'antd'
import {
  DollarOutlined, ShoppingCartOutlined, TransactionOutlined, BarChartOutlined, TagOutlined, ReloadOutlined, FilterOutlined, ClearOutlined,
} from '@ant-design/icons'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts'
import * as api from './api/elasticsearch'
import type { Filters, FilterOptions, DashboardData, KPIData, CategoryData, SegmentData, CountryData, TrendData, TopProductData, CrossTabRow } from './types'
import { EMPTY_FILTERS } from './types'

// ─── Constants ────────────────────────────────────────────────
const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899']
const VND = (v: number) =>
  v >= 1_000_000_000 ? `${(v / 1_000_000_000).toFixed(1)}B ₫`
    : v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M ₫`
    : new Intl.NumberFormat('vi-VN').format(v) + ' ₫'
const NUM = (v: number) => new Intl.NumberFormat('vi-VN').format(v)

const { Text, Title } = Typography

// ─── Custom Recharts Tooltip ──────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
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

// ─── Header ───────────────────────────────────────────────────
function Header() {
  return (
    <div style={{ marginBottom: 16 }}>
      <Title level={3} style={{ margin: 0 }}>{'📊'} OLAP Sales Analysis Dashboard</Title>
      <Text type="secondary">Multi-Dimension Analysis — 20,000 transactions from Elasticsearch</Text>
    </div>
  )
}

// ─── FilterBar ────────────────────────────────────────────────
interface FilterBarProps {
  filters: Filters
  filterOptions: FilterOptions | null
  onFilterChange: (patch: Partial<Filters>) => void
  onApply: () => void
  onReset: () => void
  activeFilters: { key: string; value: string }[]
}

function FilterBar({ filters, filterOptions, onFilterChange, onApply, onReset, activeFilters }: FilterBarProps) {
  return (
    <Card size="small" style={{ marginBottom: 16 }}>
      <Flex wrap="wrap" gap="middle" align="center">
        <Select
          allowClear
          placeholder="All Years"
          value={filters.year || undefined}
          onChange={(v) => onFilterChange({ year: v ?? '' })}
          style={{ minWidth: 140 }}
          options={filterOptions?.years.map((y) => ({ label: String(y), value: String(y) }))}
        />
        <Select
          allowClear
          placeholder="All Quarters"
          value={filters.quarter || undefined}
          onChange={(v) => onFilterChange({ quarter: v ?? '' })}
          style={{ minWidth: 140 }}
          options={['Q1', 'Q2', 'Q3', 'Q4'].map((q) => ({ label: q, value: q }))}
        />
        <Select
          allowClear
          placeholder="All Categories"
          value={filters.category || undefined}
          onChange={(v) => onFilterChange({ category: v ?? '' })}
          style={{ minWidth: 160 }}
          showSearch
          options={filterOptions?.categories.map((c) => ({ label: c, value: c }))}
        />
        <Select
          allowClear
          placeholder="All Segments"
          value={filters.segment || undefined}
          onChange={(v) => onFilterChange({ segment: v ?? '' })}
          style={{ minWidth: 160 }}
          showSearch
          options={filterOptions?.segments.map((s) => ({ label: s, value: s }))}
        />
        <Select
          allowClear
          placeholder="All Countries"
          value={filters.country || undefined}
          onChange={(v) => onFilterChange({ country: v ?? '' })}
          style={{ minWidth: 160 }}
          showSearch
          options={filterOptions?.countries.map((c) => ({ label: c, value: c }))}
        />
        <Button type="primary" icon={<FilterOutlined />} onClick={onApply}>
          Apply
        </Button>
        <Button icon={<ClearOutlined />} onClick={onReset}>
          Reset
        </Button>
      </Flex>
      {activeFilters.length > 0 && (
        <Flex wrap="wrap" gap={6} style={{ marginTop: 12 }}>
          <Text type="secondary" style={{ lineHeight: '24px' }}>Active filters:</Text>
          {activeFilters.map(({ key, value }) => (
            <Tag
              key={key}
              color="blue"
              closable
              onClose={() => onFilterChange({ [key]: '' })}
            >
              {key}: {value}
            </Tag>
          ))}
          <Button
            type="link"
            size="small"
            icon={<ClearOutlined />}
            onClick={onReset}
            style={{ padding: 0, height: 24 }}
          >
            Clear all
          </Button>
        </Flex>
      )}
    </Card>
  )
}

// ─── KPI Cards ────────────────────────────────────────────────
interface KPICardsProps {
  kpis: KPIData
}

const KPI_CONFIG = [
  { key: 'revenue', title: 'Revenue', icon: <DollarOutlined />, color: '#6366f1', format: VND },
  { key: 'quantity', title: 'Quantity', icon: <ShoppingCartOutlined />, color: '#10b981', format: NUM },
  { key: 'transactions', title: 'Transactions', icon: <TransactionOutlined />, color: '#f59e0b', format: NUM },
  { key: 'avgOrder', title: 'Avg Order', icon: <BarChartOutlined />, color: '#8b5cf6', format: VND },
  { key: 'discount', title: 'Discount', icon: <TagOutlined />, color: '#ef4444', format: VND },
] as const

function KPICards({ kpis }: KPICardsProps) {
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

// ─── Revenue By Category Chart (Interactive) ──────────────────
interface RevenueByCategoryChartProps {
  data: CategoryData[]
  onChartClick: (filterKey: string, value: string) => void
}

function RevenueByCategoryChart({ data, onChartClick }: RevenueByCategoryChartProps) {
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

// ─── Revenue By Segment Chart (Interactive) ───────────────────
interface RevenueBySegmentChartProps {
  data: SegmentData[]
  onChartClick: (filterKey: string, value: string) => void
}

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

function RevenueBySegmentChart({ data, onChartClick }: RevenueBySegmentChartProps) {
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

// ─── Trend Chart ──────────────────────────────────────────────
interface TrendChartProps {
  data: TrendData[]
}

function TrendChart({ data }: TrendChartProps) {
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

// ─── Revenue By Country Chart (Interactive) ───────────────────
interface RevenueByCountryChartProps {
  data: CountryData[]
  onChartClick: (filterKey: string, value: string) => void
}

function RevenueByCountryChart({ data, onChartClick }: RevenueByCountryChartProps) {
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

// ─── Top Products Chart ───────────────────────────────────────
interface TopProductsChartProps {
  data: TopProductData[]
}

function TopProductsChart({ data }: TopProductsChartProps) {
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

// ─── Cross-Tab Table ──────────────────────────────────────────
interface CrossTabTableProps {
  data: CrossTabRow[]
}

function CrossTabTable({ data }: CrossTabTableProps) {
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
                <Table.Summary.Cell index={i + 1} align="right">
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

// ─── Loading Spinner ──────────────────────────────────────────
function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
      <Space direction="vertical" align="center">
        <AntTooltip title="Fetching data from Elasticsearch...">
          <div className="ant-spin ant-spin-lg">
            <span className="ant-spin-dot ant-spin-dot-spin">
              <i className="ant-spin-dot-item" />
              <i className="ant-spin-dot-item" />
              <i className="ant-spin-dot-item" />
              <i className="ant-spin-dot-item" />
            </span>
          </div>
        </AntTooltip>
        <Text type="secondary">Loading dashboard data...</Text>
      </Space>
    </div>
  )
}

// ─── Error State ──────────────────────────────────────────────
interface ErrorStateProps {
  message: string
  onRetry: () => void
}

function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <Card style={{ textAlign: 'center', padding: 40 }}>
      <Space direction="vertical" size="large" align="center">
        <Text type="danger" style={{ fontSize: 48 }}>{'⚠️'}</Text>
        <Title level={4} type="danger" style={{ margin: 0 }}>Failed to load dashboard</Title>
        <Text type="secondary">{message}</Text>
        <Button type="primary" icon={<ReloadOutlined />} onClick={onRetry}>
          Retry
        </Button>
      </Space>
    </Card>
  )
}

// ─── App (Root) ───────────────────────────────────────────────
export default function App() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [pendingFilters, setPendingFilters] = useState<Filters>(EMPTY_FILTERS)
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load filter options on mount
  useEffect(() => {
    api.fetchFilterOptions()
      .then(setFilterOptions)
      .catch((err) => console.error('Failed to load filter options:', err))
  }, [])

  // Load dashboard data when filters change
  const loadDashboard = useCallback(async (f: Filters) => {
    setLoading(true)
    setError(null)
    try {
      const [kpis, byCategory, bySegment, byCountry, monthlyTrend, topProducts, crossTab] = await Promise.all([
        api.fetchKPIs(f),
        api.fetchRevenueByCategory(f),
        api.fetchRevenueBySegment(f),
        api.fetchRevenueByCountry(f),
        api.fetchMonthlyTrend(f),
        api.fetchTopProducts(f),
        api.fetchCategoryQuarterMatrix(f),
      ])
      setData({ kpis, byCategory, bySegment, byCountry, monthlyTrend, topProducts, crossTab })
    } catch (err: any) {
      setError(err?.message ?? 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboard(filters)
  }, [filters, loadDashboard])

  // Chart click handler — sets filter directly and triggers reload
  const handleChartClick = useCallback((filterKey: string, value: string) => {
    setFilters((prev) => ({ ...prev, [filterKey]: value }))
    setPendingFilters((prev) => ({ ...prev, [filterKey]: value }))
  }, [])

  // Filter bar handlers
  const handleFilterChange = useCallback((patch: Partial<Filters>) => {
    setPendingFilters((prev) => ({ ...prev, ...patch }))
    // Immediately apply single-filter removal for tag close
    const hasEmpty = Object.values(patch).some((v) => v === '')
    if (hasEmpty) {
      setFilters((prev) => ({ ...prev, ...patch }))
    }
  }, [])

  const handleApply = useCallback(() => {
    setFilters(pendingFilters)
  }, [pendingFilters])

  const handleReset = useCallback(() => {
    setPendingFilters(EMPTY_FILTERS)
    setFilters(EMPTY_FILTERS)
  }, [])

  // Active filters for tags
  const activeFilters = Object.entries(filters)
    .filter(([, v]) => v !== '')
    .map(([key, value]) => ({ key, value }))

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: { colorPrimary: '#6366f1', borderRadius: 8 },
      }}
    >
      <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
        <Layout.Content style={{ maxWidth: 1400, margin: '0 auto', padding: 24, width: '100%' }}>
          <Header />

          <FilterBar
            filters={pendingFilters}
            filterOptions={filterOptions}
            onFilterChange={handleFilterChange}
            onApply={handleApply}
            onReset={handleReset}
            activeFilters={activeFilters}
          />

          {error && <ErrorState message={error} onRetry={() => loadDashboard(filters)} />}

          {loading && !data && <LoadingSpinner />}

          {data && (
            <>
              <KPICards kpis={data.kpis} />

              <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                  <RevenueByCategoryChart data={data.byCategory} onChartClick={handleChartClick} />
                </Col>
                <Col xs={24} lg={12}>
                  <RevenueBySegmentChart data={data.bySegment} onChartClick={handleChartClick} />
                </Col>
                <Col xs={24} lg={12}>
                  <TrendChart data={data.monthlyTrend} />
                </Col>
                <Col xs={24} lg={12}>
                  <RevenueByCountryChart data={data.byCountry} onChartClick={handleChartClick} />
                </Col>
                <Col xs={24} lg={12}>
                  <TopProductsChart data={data.topProducts} />
                </Col>
                <Col xs={24} lg={12}>
                  <CrossTabTable data={data.crossTab} />
                </Col>
              </Row>
            </>
          )}
        </Layout.Content>
      </Layout>
    </ConfigProvider>
  )
}
