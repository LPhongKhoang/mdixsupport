import { useState, useEffect, useCallback } from 'react'
import { Row, Col, Typography } from 'antd'
import * as api from '../../api/elasticsearch'
import type { Filters, FilterOptions, DashboardData } from '../../types/dashboard'
import { EMPTY_FILTERS } from '../../types/dashboard'
import FilterBar from './FilterBar'
import KPICards from './KPICards'
import RevenueByCategoryChart from './RevenueByCategoryChart'
import RevenueBySegmentChart from './RevenueBySegmentChart'
import TrendChart from './TrendChart'
import RevenueByCountryChart from './RevenueByCountryChart'
import TopProductsChart from './TopProductsChart'
import CrossTabTable from './CrossTabTable'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ErrorState from '../../components/common/ErrorState'

const { Text, Title } = Typography

export default function DashboardPage() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [pendingFilters, setPendingFilters] = useState<Filters>(EMPTY_FILTERS)
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.fetchFilterOptions()
      .then(setFilterOptions)
      .catch((err) => console.error('Failed to load filter options:', err))
  }, [])

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

  const handleChartClick = useCallback((filterKey: string, value: string) => {
    setFilters((prev) => ({ ...prev, [filterKey]: value }))
    setPendingFilters((prev) => ({ ...prev, [filterKey]: value }))
  }, [])

  const handleFilterChange = useCallback((patch: Partial<Filters>) => {
    setPendingFilters((prev) => ({ ...prev, ...patch }))
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

  const activeFilters = Object.entries(filters)
    .filter(([, v]) => v !== '')
    .map(([key, value]) => ({ key, value }))

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>{'📊'} OLAP Sales Analysis Dashboard</Title>
        <Text type="secondary">Multi-Dimension Analysis — 20,000 transactions from Elasticsearch</Text>
      </div>

      <FilterBar
        filters={pendingFilters}
        filterOptions={filterOptions}
        onFilterChange={handleFilterChange}
        onApply={handleApply}
        onReset={handleReset}
        activeFilters={activeFilters}
      />

      {error && <ErrorState message={error} onRetry={() => loadDashboard(filters)} />}
      {loading && !data && <LoadingSpinner message="Loading dashboard data..." />}

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
    </>
  )
}
