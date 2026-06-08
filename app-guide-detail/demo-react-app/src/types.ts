// ─── Filter State ─────────────────────────────────────────────
export interface Filters {
  year: string
  quarter: string
  category: string
  segment: string
  country: string
  dateFrom: string
  dateTo: string
}

export const EMPTY_FILTERS: Filters = {
  year: '', quarter: '', category: '', segment: '',
  country: '', dateFrom: '', dateTo: '',
}

// ─── API Response Types ───────────────────────────────────────
export interface KPIData {
  revenue: number
  quantity: number
  transactions: number
  avgOrder: number
  discount: number
}

export interface CategoryData {
  name: string
  revenue: number
  quantity: number
  transactions: number
}

export interface SegmentData {
  name: string
  revenue: number
  transactions: number
}

export interface CountryData {
  name: string
  revenue: number
  quantity: number
  transactions: number
}

export interface TrendData {
  month: string
  revenue: number
  quantity: number
  transactions: number
}

export interface TopProductData {
  name: string
  revenue: number
  quantity: number
  transactions: number
}

export interface CrossTabRow {
  category: string
  Q1?: number
  Q2?: number
  Q3?: number
  Q4?: number
}

export interface FilterOptions {
  years: number[]
  categories: string[]
  segments: string[]
  countries: string[]
}

// ─── Dashboard Data (all charts) ─────────────────────────────
export interface DashboardData {
  kpis: KPIData
  byCategory: CategoryData[]
  bySegment: SegmentData[]
  byCountry: CountryData[]
  monthlyTrend: TrendData[]
  topProducts: TopProductData[]
  crossTab: CrossTabRow[]
}

// Aliases for component prop compatibility
export type { CategoryData as CategoryChartData }
export type { SegmentData as SegmentChartData }
export type { CountryData as CountryChartData }
export type { TrendData as MonthlyTrendData }
export type { TopProductData as TopProductChartData }
