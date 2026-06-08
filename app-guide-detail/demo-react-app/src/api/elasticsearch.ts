/**
 * Elasticsearch API Service (TypeScript)
 * Calls ES via Vite proxy: /es → localhost:9200
 */

import type {
  Filters, KPIData, CategoryData, SegmentData, CountryData,
  TrendData, TopProductData, CrossTabRow, FilterOptions,
} from '../types'

const ES_BASE = '/es/sales_olap'

// ─── Generic ES Search ────────────────────────────────────────
async function esSearch(query: object) {
  const res = await fetch(`${ES_BASE}/_search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
  })
  if (!res.ok) throw new Error(`ES error: ${res.status} ${res.statusText}`)
  return res.json()
}

// ─── Build filter clauses ─────────────────────────────────────
function buildFilters(filters: Filters): object {
  const clauses: object[] = []
  if (filters.year) clauses.push({ term: { year: Number(filters.year) } })
  if (filters.quarter) clauses.push({ term: { quarter: Number(filters.quarter) } })
  if (filters.category) clauses.push({ term: { category_name: filters.category } })
  if (filters.segment) clauses.push({ term: { customer_segment: filters.segment } })
  if (filters.country) clauses.push({ term: { country_name: filters.country } })
  if (filters.dateFrom || filters.dateTo) {
    const range: Record<string, string> = {}
    if (filters.dateFrom) range.gte = filters.dateFrom
    if (filters.dateTo) range.lte = filters.dateTo
    clauses.push({ range: { sale_date: range } })
  }
  return clauses.length > 0 ? { bool: { filter: clauses } } : { match_all: {} }
}

// ─── KPI Summary ──────────────────────────────────────────────
export async function fetchKPIs(filters: Filters): Promise<KPIData> {
  const r = await esSearch({
    size: 0,
    query: buildFilters(filters),
    aggs: {
      total_revenue: { sum: { field: 'total_amount' } },
      total_quantity: { sum: { field: 'quantity' } },
      avg_order: { avg: { field: 'total_amount' } },
      total_discount: { sum: { field: 'discount_amount' } },
    },
  })
  const a = r.aggregations
  return {
    revenue: a.total_revenue.value || 0,
    quantity: a.total_quantity.value || 0,
    transactions: r.hits.total.value || 0,
    avgOrder: a.avg_order.value || 0,
    discount: a.total_discount.value || 0,
  }
}

// ─── Revenue by Category ──────────────────────────────────────
export async function fetchRevenueByCategory(filters: Filters): Promise<CategoryData[]> {
  const r = await esSearch({
    size: 0, query: buildFilters(filters),
    aggs: {
      by_cat: { terms: { field: 'category_name', size: 20, order: { total_revenue: 'desc' } },
        aggs: {
          total_revenue: { sum: { field: 'total_amount' } },
          total_qty: { sum: { field: 'quantity' } },
        },
      },
    },
  })
  return r.aggregations.by_cat.buckets.map((b: any) => ({
    name: b.key,
    revenue: b.total_revenue.value,
    quantity: b.total_qty.value,
    transactions: b.doc_count,
  }))
}

// ─── Revenue by Segment ───────────────────────────────────────
export async function fetchRevenueBySegment(filters: Filters): Promise<SegmentData[]> {
  const r = await esSearch({
    size: 0, query: buildFilters(filters),
    aggs: {
      by_seg: { terms: { field: 'customer_segment', size: 10 },
        aggs: { total_revenue: { sum: { field: 'total_amount' } } },
      },
    },
  })
  return r.aggregations.by_seg.buckets.map((b: any) => ({
    name: b.key,
    revenue: b.total_revenue.value,
    transactions: b.doc_count,
  }))
}

// ─── Revenue by Country ───────────────────────────────────────
export async function fetchRevenueByCountry(filters: Filters): Promise<CountryData[]> {
  const r = await esSearch({
    size: 0, query: buildFilters(filters),
    aggs: {
      by_country: { terms: { field: 'country_name', size: 20, order: { total_revenue: 'desc' } },
        aggs: {
          total_revenue: { sum: { field: 'total_amount' } },
          total_qty: { sum: { field: 'quantity' } },
        },
      },
    },
  })
  return r.aggregations.by_country.buckets.map((b: any) => ({
    name: b.key,
    revenue: b.total_revenue.value,
    quantity: b.total_qty.value,
    transactions: b.doc_count,
  }))
}

// ─── Monthly Trend ────────────────────────────────────────────
export async function fetchMonthlyTrend(filters: Filters): Promise<TrendData[]> {
  const r = await esSearch({
    size: 0, query: buildFilters(filters),
    aggs: {
      by_month: {
        date_histogram: { field: 'sale_date', calendar_interval: 'month', format: 'yyyy-MM', min_doc_count: 0 },
        aggs: {
          total_revenue: { sum: { field: 'total_amount' } },
          total_qty: { sum: { field: 'quantity' } },
        },
      },
    },
  })
  return r.aggregations.by_month.buckets.map((b: any) => ({
    month: b.key_as_string,
    revenue: b.total_revenue.value,
    quantity: b.total_qty.value,
    transactions: b.doc_count,
  }))
}

// ─── Top Products ─────────────────────────────────────────────
export async function fetchTopProducts(filters: Filters, size = 10): Promise<TopProductData[]> {
  const r = await esSearch({
    size: 0, query: buildFilters(filters),
    aggs: {
      by_product: { terms: { field: 'product_name.keyword', size, order: { total_revenue: 'desc' } },
        aggs: {
          total_revenue: { sum: { field: 'total_amount' } },
          total_qty: { sum: { field: 'quantity' } },
        },
      },
    },
  })
  return r.aggregations.by_product.buckets.map((b: any) => ({
    name: b.key,
    revenue: b.total_revenue.value,
    quantity: b.total_qty.value,
    transactions: b.doc_count,
  }))
}

// ─── Category × Quarter Cross-Tab ────────────────────────────
export async function fetchCategoryQuarterMatrix(filters: Filters): Promise<CrossTabRow[]> {
  const r = await esSearch({
    size: 0, query: buildFilters(filters),
    aggs: {
      by_cat: { terms: { field: 'category_name', size: 20 },
        aggs: {
          by_q: { terms: { field: 'quarter', size: 4, order: { _key: 'asc' } },
            aggs: { revenue: { sum: { field: 'total_amount' } } },
          },
        },
      },
    },
  })
  return r.aggregations.by_cat.buckets.map((b: any) => {
    const row: CrossTabRow = { category: b.key }
    for (const qb of b.by_q.buckets) {
      row[`Q${qb.key}` as 'Q1' | 'Q2' | 'Q3' | 'Q4'] = qb.revenue.value
    }
    return row
  })
}

// ─── Filter Options (for dropdowns) ───────────────────────────
export async function fetchFilterOptions(): Promise<FilterOptions> {
  const r = await esSearch({
    size: 0,
    aggs: {
      years: { terms: { field: 'year', size: 10, order: { _key: 'asc' } } },
      categories: { terms: { field: 'category_name', size: 50 } },
      segments: { terms: { field: 'customer_segment', size: 10 } },
      countries: { terms: { field: 'country_name', size: 50 } },
    },
  })
  return {
    years: r.aggregations.years.buckets.map((b: any) => b.key),
    categories: r.aggregations.categories.buckets.map((b: any) => b.key as string),
    segments: r.aggregations.segments.buckets.map((b: any) => b.key as string),
    countries: r.aggregations.countries.buckets.map((b: any) => b.key as string),
  }
}
