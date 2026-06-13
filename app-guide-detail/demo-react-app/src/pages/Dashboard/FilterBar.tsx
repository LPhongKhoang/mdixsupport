import { Card, Select, Button, Tag, Flex, Typography } from 'antd'
import { FilterOutlined, ClearOutlined } from '@ant-design/icons'
import type { Filters, FilterOptions } from '../../types/dashboard'

const { Text } = Typography

interface FilterBarProps {
  filters: Filters
  filterOptions: FilterOptions | null
  onFilterChange: (patch: Partial<Filters>) => void
  onApply: () => void
  onReset: () => void
  activeFilters: { key: string; value: string }[]
}

export default function FilterBar({
  filters, filterOptions, onFilterChange, onApply, onReset, activeFilters,
}: FilterBarProps) {
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
