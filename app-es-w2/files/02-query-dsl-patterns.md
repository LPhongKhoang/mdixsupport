# Elasticsearch OLAP Query DSL Patterns
# Tất cả query chạy trên index `sales_fact`

## ─────────────────────────────────────────────
## QUERY 1: Revenue by Category × Month (Pivot Table)
## Tương đương: GROUP BY category_name, order_month ORDER BY revenue DESC
## ─────────────────────────────────────────────

```json
POST /sales_fact/_search
{
  "size": 0,
  "query": {
    "range": {
      "order_date": {
        "gte": "2024-01-01",
        "lte": "2024-12-31"
      }
    }
  },
  "aggs": {
    "by_category": {
      "terms": {
        "field": "category_name",
        "size": 20,
        "order": { "total_revenue": "desc" }
      },
      "aggs": {
        "total_revenue":  { "sum": { "field": "net_amount" } },
        "total_profit":   { "sum": { "field": "gross_profit" } },
        "avg_margin":     { "avg": { "field": "gross_margin_pct" } },
        "by_month": {
          "date_histogram": {
            "field": "order_date",
            "calendar_interval": "month",
            "format": "MMM-yyyy"
          },
          "aggs": {
            "monthly_revenue": { "sum": { "field": "net_amount" } },
            "monthly_profit":  { "sum": { "field": "gross_profit" } }
          }
        }
      }
    }
  }
}
```

**Response shape (dùng cho Mendix Import Mapping):**
```json
{
  "aggregations": {
    "by_category": {
      "buckets": [
        {
          "key": "Electronics",
          "doc_count": 450,
          "total_revenue": { "value": 125000000 },
          "total_profit":  { "value": 42000000 },
          "avg_margin":    { "value": 33.6 },
          "by_month": {
            "buckets": [
              {
                "key_as_string": "Jan-2024",
                "doc_count": 38,
                "monthly_revenue": { "value": 10500000 },
                "monthly_profit":  { "value": 3570000 }
              }
            ]
          }
        }
      ]
    }
  }
}
```

---

## ─────────────────────────────────────────────
## QUERY 2: Top N Products by Gross Profit
## ─────────────────────────────────────────────

```json
POST /sales_fact/_search
{
  "size": 0,
  "aggs": {
    "top_products": {
      "terms": {
        "field": "product_name",
        "size": 10,
        "order": { "total_profit": "desc" }
      },
      "aggs": {
        "total_profit":  { "sum": { "field": "gross_profit" } },
        "total_revenue": { "sum": { "field": "net_amount" } },
        "total_qty":     { "sum": { "field": "quantity" } },
        "avg_margin":    { "avg": { "field": "gross_margin_pct" } },
        "category":      { "terms": { "field": "category_name", "size": 1 } }
      }
    }
  }
}
```

---

## ─────────────────────────────────────────────
## QUERY 3: Region × Quarter Heatmap
## ─────────────────────────────────────────────

```json
POST /sales_fact/_search
{
  "size": 0,
  "aggs": {
    "by_region": {
      "terms": {
        "field": "region_name",
        "size": 10
      },
      "aggs": {
        "by_quarter": {
          "terms": {
            "field": "order_quarter",
            "size": 8,
            "order": { "_key": "asc" }
          },
          "aggs": {
            "revenue":       { "sum":  { "field": "net_amount" } },
            "order_count":   { "value_count": { "field": "fact_sales_id" } },
            "avg_order_val": { "avg":  { "field": "net_amount" } }
          }
        }
      }
    }
  }
}
```

---

## ─────────────────────────────────────────────
## QUERY 4: Monthly Revenue Trend + Moving Average
## ─────────────────────────────────────────────

```json
POST /sales_fact/_search
{
  "size": 0,
  "aggs": {
    "monthly_trend": {
      "date_histogram": {
        "field": "order_date",
        "calendar_interval": "month",
        "format": "yyyy-MM"
      },
      "aggs": {
        "revenue": { "sum": { "field": "net_amount" } },
        "profit":  { "sum": { "field": "gross_profit" } },
        "moving_avg_revenue": {
          "moving_avg": {
            "buckets_path": "revenue",
            "window": 3,
            "model": "simple"
          }
        }
      }
    }
  }
}
```

---

## ─────────────────────────────────────────────
## QUERY 5: Drill-down – Category → Products (Dynamic)
## Tham số: category_name (thay vào filter)
## ─────────────────────────────────────────────

```json
POST /sales_fact/_search
{
  "size": 0,
  "query": {
    "bool": {
      "filter": [
        { "term": { "category_name": "Electronics" } },
        {
          "range": {
            "order_date": { "gte": "2024-01-01", "lte": "2024-12-31" }
          }
        }
      ]
    }
  },
  "aggs": {
    "products_in_category": {
      "terms": {
        "field": "product_name",
        "size": 20,
        "order": { "revenue": "desc" }
      },
      "aggs": {
        "revenue":       { "sum": { "field": "net_amount" } },
        "profit":        { "sum": { "field": "gross_profit" } },
        "qty_sold":      { "sum": { "field": "quantity" } },
        "avg_margin":    { "avg": { "field": "gross_margin_pct" } },
        "by_segment": {
          "terms": {
            "field": "customer_segment",
            "size": 5
          },
          "aggs": {
            "segment_revenue": { "sum": { "field": "net_amount" } }
          }
        }
      }
    }
  }
}
```

---

## ─────────────────────────────────────────────
## QUERY 6: Customer Segment Revenue Distribution
## ─────────────────────────────────────────────

```json
POST /sales_fact/_search
{
  "size": 0,
  "aggs": {
    "by_segment": {
      "terms": { "field": "customer_segment", "size": 10 },
      "aggs": {
        "revenue":    { "sum": { "field": "net_amount" } },
        "profit":     { "sum": { "field": "gross_profit" } },
        "order_count":{ "value_count": { "field": "fact_sales_id" } },
        "avg_order":  { "avg": { "field": "net_amount" } },
        "percentiles":{
          "percentiles": {
            "field": "net_amount",
            "percents": [25, 50, 75, 90, 95]
          }
        }
      }
    }
  }
}
```

---

## ─────────────────────────────────────────────
## QUERY 7: Multi-dimension Filter (Dynamic – dùng cho Mendix UI Filter)
## Tham số động: year, category, region, segment
## ─────────────────────────────────────────────

```json
POST /sales_fact/_search
{
  "size": 0,
  "query": {
    "bool": {
      "filter": [
        { "term":  { "order_year":        2024       } },
        { "term":  { "category_name":     "Clothing" } },
        { "term":  { "region_name":       "South"    } },
        { "term":  { "customer_segment":  "VIP"      } }
      ]
    }
  },
  "aggs": {
    "by_product": {
      "terms": { "field": "product_name", "size": 20 },
      "aggs": {
        "revenue":  { "sum": { "field": "net_amount" } },
        "profit":   { "sum": { "field": "gross_profit" } },
        "qty_sold": { "sum": { "field": "quantity" } }
      }
    },
    "summary": {
      "stats": { "field": "net_amount" }
    },
    "total_revenue": { "sum": { "field": "net_amount" } },
    "total_profit":  { "sum": { "field": "gross_profit" } }
  }
}
```

---

## Ghi chú sử dụng trong Mendix

1. **Query 1** → dùng cho Chart "Revenue by Category over Time" (AnyChart Bar/Line)
2. **Query 2** → dùng cho Chart "Top 10 Products" (Horizontal Bar)
3. **Query 3** → dùng cho Table "Heatmap Region × Quarter"
4. **Query 4** → dùng cho Chart "Monthly Trend + Moving Avg" (Line Chart)
5. **Query 5** → trigger từ click event trên chart (Drill-down Nanoflow)
6. **Query 7** → trigger từ Filter form trên page

Tất cả query body được build dynamically trong Java Action `ES_BuildOlapQuery.java`.
