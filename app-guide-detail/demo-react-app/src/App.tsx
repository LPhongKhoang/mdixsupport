import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts'
import * as api from './api/elasticsearch'
import type { Filters, FilterOptions, DashboardData, KPIData, CategoryData, SegmentData, CountryData, TrendData, TopProductData, CrossTabRow } from './types'
import { EMPTY_FILTERS } from './types'

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899']

const VND = (v: number) =>
  v >= 1_000_000_000
    ? `${(v / 1_000_000_000).toFixed(1)}B ₫`
    : v >= 1_000_000
      ? `${(v / 1_000_000).toFixed(1)}M ₫`
      : new Intl.NumberFormat('vi-VN').format(v) + ' ₫'

const NUM = (v: number) => new Intl.NumberFormat('vi-VN').format(v)

// ---------------------------------------------------------------------------
// Shared chart tooltip
// ---------------------------------------------------------------------------

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white/95 backdrop-blur border border-gray-200 rounded-lg px-4 py-3 shadow-lg text-sm">
      <p className="font-semibold text-gray-800 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-gray-600">
          <span
            className="inline-block w-2 h-2 rounded-full mr-2"
            style={{ background: p.color }}
          />
          {p.name}:{' '}
          <span className="font-semibold text-indigo-600">
            {typeof p.value === 'number' && p.value > 1000 ? VND(p.value) : NUM(p.value)}
          </span>
        </p>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

function Header() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">
        {'📊'} OLAP Sales Analysis
      </h1>
      <p className="text-sm text-gray-500 mt-1">
        Multi-Dimension Analysis Dashboard — 20,000 transactions from Elasticsearch
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// FilterBar
// ---------------------------------------------------------------------------

interface FilterBarProps {
  filters: Filters
  filterOptions: FilterOptions
  onFilterChange: (patch: Partial<Filters>) => void
  onApply: () => void
  onReset: () => void
}

function FilterBar({ filters, filterOptions, onFilterChange, onApply, onReset }: FilterBarProps) {
  const selectCls =
    'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white'

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 mt-4">
      <div className="flex flex-wrap items-end gap-3">
        {/* Year */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 uppercase">Year</label>
          <select
            className={selectCls}
            value={filters.year}
            onChange={(e) => onFilterChange({ year: e.target.value })}
          >
            <option value="">All Years</option>
            {filterOptions.years.map((y) => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </select>
        </div>

        {/* Category */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 uppercase">Category</label>
          <select
            className={selectCls}
            value={filters.category}
            onChange={(e) => onFilterChange({ category: e.target.value })}
          >
            <option value="">All Categories</option>
            {filterOptions.categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Segment */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 uppercase">Segment</label>
          <select
            className={selectCls}
            value={filters.segment}
            onChange={(e) => onFilterChange({ segment: e.target.value })}
          >
            <option value="">All Segments</option>
            {filterOptions.segments.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Country */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 uppercase">Country</label>
          <select
            className={selectCls}
            value={filters.country}
            onChange={(e) => onFilterChange({ country: e.target.value })}
          >
            <option value="">All Countries</option>
            {filterOptions.countries.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Buttons */}
        <button
          onClick={onApply}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
        >
          Apply
        </button>
        <button
          onClick={onReset}
          className="bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-medium rounded-lg px-4 py-2 transition-colors"
        >
          Reset
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// KPI Cards
// ---------------------------------------------------------------------------

interface KPICardsProps {
  kpis: KPIData
}

const KPI_CONFIG = [
  { key: 'revenue' as const, label: 'Revenue', icon: '💰', border: 'border-indigo-500', isMoney: true },
  { key: 'quantity' as const, label: 'Quantity', icon: '📦', border: 'border-emerald-500', isMoney: false },
  { key: 'transactions' as const, label: 'Transactions', icon: '🧾', border: 'border-amber-500', isMoney: false },
  { key: 'avgOrder' as const, label: 'Avg Order', icon: '📊', border: 'border-purple-500', isMoney: true },
  { key: 'discount' as const, label: 'Discount', icon: '🏷️', border: 'border-red-500', isMoney: true },
] as const

function KPICards({ kpis }: KPICardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-6">
      {KPI_CONFIG.map(({ key, label, icon, border, isMoney }) => (
        <div key={key} className={`bg-white rounded-xl p-5 shadow-sm border-t-4 ${border}`}>
          <div className="text-2xl">{icon}</div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mt-2">{label}</p>
          <p className="text-xl font-bold text-gray-900 mt-1">
            {isMoney ? VND(kpis[key]) : NUM(kpis[key])}
          </p>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Revenue by Category – BarChart
// ---------------------------------------------------------------------------

interface RevenueByCategoryChartProps {
  data: CategoryData[]
}

function RevenueByCategoryChart({ data }: RevenueByCategoryChartProps) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <h3 className="text-base font-semibold text-gray-800 mb-4">Revenue by Category</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="category" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={(v: number) => VND(v)} tick={{ fontSize: 11 }} width={80} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="revenue" name="Revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Revenue by Segment – PieChart (donut)
// ---------------------------------------------------------------------------

interface RevenueBySegmentChartProps {
  data: SegmentData[]
}

const RADIAN = Math.PI / 180

function renderCustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  const radius = innerRadius + (outerRadius - innerRadius) * 1.4
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="central" className="text-xs fill-gray-600">
      {`${(percent * 100).toFixed(1)}%`}
    </text>
  )
}

function RevenueBySegmentChart({ data }: RevenueBySegmentChartProps) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <h3 className="text-base font-semibold text-gray-800 mb-4">Revenue by Segment</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            dataKey="revenue"
            nameKey="segment"
            label={renderCustomLabel}
            labelLine={false}
            paddingAngle={2}
          >
            {data.map((_entry: SegmentData, index: number) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) => [VND(value), name]}
          />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Trend Chart – AreaChart (dual axis)
// ---------------------------------------------------------------------------

interface TrendChartProps {
  data: TrendData[]
}

function TrendChart({ data }: TrendChartProps) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <h3 className="text-base font-semibold text-gray-800 mb-4">Revenue &amp; Quantity Trend</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <defs>
            <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradQuantity" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="period" tick={{ fontSize: 12 }} />
          <YAxis yAxisId="left" tickFormatter={(v: number) => VND(v)} tick={{ fontSize: 11 }} width={80} />
          <YAxis yAxisId="right" orientation="right" tickFormatter={(v: number) => NUM(v)} tick={{ fontSize: 11 }} width={50} />
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="revenue"
            name="Revenue"
            stroke="#6366f1"
            strokeWidth={2}
            fill="url(#gradRevenue)"
          />
          <Area
            yAxisId="right"
            type="monotone"
            dataKey="quantity"
            name="Quantity"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#gradQuantity)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Revenue by Country – horizontal BarChart
// ---------------------------------------------------------------------------

interface RevenueByCountryChartProps {
  data: CountryData[]
}

function RevenueByCountryChart({ data }: RevenueByCountryChartProps) {
  const sorted = [...data].sort((a, b) => b.revenue - a.revenue)
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <h3 className="text-base font-semibold text-gray-800 mb-4">Revenue by Country</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={sorted} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis type="number" tickFormatter={(v: number) => VND(v)} tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="country" tick={{ fontSize: 12 }} width={90} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="revenue" name="Revenue" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Top Products – BarChart with COLORS
// ---------------------------------------------------------------------------

interface TopProductsChartProps {
  data: TopProductData[]
}

function TopProductsChart({ data }: TopProductsChartProps) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <h3 className="text-base font-semibold text-gray-800 mb-4">Top 10 Products</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="product" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
          <YAxis tickFormatter={(v: number) => VND(v)} tick={{ fontSize: 11 }} width={80} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="revenue" name="Revenue" radius={[4, 4, 0, 0]}>
            {data.map((_entry: TopProductData, index: number) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Cross-Tab Table
// ---------------------------------------------------------------------------

interface CrossTabTableProps {
  data: CrossTabRow[]
}

function CrossTabTable({ data }: CrossTabTableProps) {
  if (!data.length) return null

  // Derive column keys (Q1..Q4 from our cross-tab data)
  const columns = Array.from(
    new Set(data.flatMap((r) => Object.keys(r).filter((k) => k !== 'category')))
  ).sort()

  // Column totals
  const colTotals: Record<string, number> = {}
  columns.forEach((col) => {
    colTotals[col] = data.reduce((sum, row) => sum + ((row as any)[col] ?? 0), 0)
  })

  // Row totals
  const rowsWithTotal = data.map((row) => {
    const total = columns.reduce((sum, col) => sum + ((row as any)[col] ?? 0), 0)
    return { ...row, _total: total }
  })

  const grandTotal = rowsWithTotal.reduce((sum, r) => sum + r._total, 0)

  // Find max value per column
  const colMaxes: Record<string, number> = {}
  columns.forEach((col) => {
    colMaxes[col] = Math.max(...data.map((r) => (r as any)[col] ?? 0))
  })
  const totalMax = Math.max(...rowsWithTotal.map((r) => r._total))

  const thCls = 'bg-gray-50 px-4 py-3 text-right font-semibold text-gray-600 border-b-2 border-gray-200'
  const tdCls = 'px-4 py-3 text-right text-gray-700 border-b border-gray-100'

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <h3 className="text-base font-semibold text-gray-800 mb-4">Cross-Tab: Category × Quarter</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className={`${thCls} text-left`}>Category</th>
              {columns.map((col) => (
                <th key={col} className={thCls}>{col}</th>
              ))}
              <th className={thCls}>Total</th>
            </tr>
          </thead>
          <tbody>
            {rowsWithTotal.map((row, ri) => (
              <tr key={ri}>
                <td className="px-4 py-3 text-left font-medium text-gray-700 border-b border-gray-100">
                  {row.category}
                </td>
                {columns.map((col) => {
                  const val = (row as any)[col] ?? 0
                  const isMax = val === colMaxes[col] && val > 0
                  return (
                    <td
                      key={col}
                      className={`${tdCls} ${isMax ? 'bg-indigo-50 text-indigo-700 font-semibold' : ''}`}
                    >
                      {VND(val)}
                    </td>
                  )
                })}
                <td
                  className={`${tdCls} font-semibold ${row._total === totalMax && row._total > 0 ? 'bg-indigo-50 text-indigo-700' : ''}`}
                >
                  {VND(row._total)}
                </td>
              </tr>
            ))}
            {/* Totals row */}
            <tr>
              <td className="px-4 py-3 text-left font-bold text-gray-900 border-b border-gray-100">
                Total
              </td>
              {columns.map((col) => (
                <td key={col} className="px-4 py-3 text-right font-bold text-gray-900 border-b border-gray-100">
                  {VND(colTotals[col] ?? 0)}
                </td>
              ))}
              <td className="px-4 py-3 text-right font-bold text-gray-900 border-b border-gray-100">
                {VND(grandTotal)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Loading Spinner
// ---------------------------------------------------------------------------

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-20 text-gray-400">
      <div className="w-8 h-8 border-[3px] border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
      <span className="ml-3 text-sm">Loading dashboard data...</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Error State
// ---------------------------------------------------------------------------

interface ErrorStateProps {
  message: string
  onRetry: () => void
}

function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-500">
      <div className="text-4xl mb-4">{'⚠️'}</div>
      <p className="text-lg font-medium text-gray-700 mb-2">Something went wrong</p>
      <p className="text-sm text-gray-500 mb-4">{message}</p>
      <button
        onClick={onRetry}
        className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg px-5 py-2 transition-colors"
      >
        Retry
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// App (root)
// ---------------------------------------------------------------------------

export default function App() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    years: [],
    categories: [],
    segments: [],
    countries: [],
  })
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load filter options once
  useEffect(() => {
    api
      .fetchFilterOptions()
      .then(setFilterOptions)
      .catch(() => {
        /* filter options are best-effort */
      })
  }, [])

  // Load dashboard data
  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [kpis, byCategory, bySegment, byCountry, monthlyTrend, topProducts, crossTab] =
        await Promise.all([
          api.fetchKPIs(filters),
          api.fetchRevenueByCategory(filters),
          api.fetchRevenueBySegment(filters),
          api.fetchRevenueByCountry(filters),
          api.fetchMonthlyTrend(filters),
          api.fetchTopProducts(filters),
          api.fetchCategoryQuarterMatrix(filters),
        ])
      setData({ kpis, byCategory, bySegment, byCountry, monthlyTrend, topProducts, crossTab })
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  // Filter handlers
  const handleFilterChange = useCallback((patch: Partial<Filters>) => {
    setFilters((prev) => ({ ...prev, ...patch }))
  }, [])

  const handleApply = useCallback(() => {
    // filters state already updated; loadDashboard will react via useEffect
    loadDashboard()
  }, [loadDashboard])

  const handleReset = useCallback(() => {
    setFilters(EMPTY_FILTERS)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <Header />
        <FilterBar
          filters={filters}
          filterOptions={filterOptions}
          onFilterChange={handleFilterChange}
          onApply={handleApply}
          onReset={handleReset}
        />

        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <ErrorState message={error} onRetry={loadDashboard} />
        ) : data ? (
          <>
            <KPICards kpis={data.kpis} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <RevenueByCategoryChart data={data.byCategory} />
              <RevenueBySegmentChart data={data.bySegment} />
              <TrendChart data={data.monthlyTrend} />
              <RevenueByCountryChart data={data.byCountry} />
              <TopProductsChart data={data.topProducts} />
              <CrossTabTable data={data.crossTab} />
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
