# Elasticsearch Query DSL - OLAP Multi-Dimension Analysis Guide

> Index: `sales_olap`
> Purpose: Complete reference for OLAP operations (Slice, Dice, Roll-up, Drill-down, Pivot, Top-N, Trend) using Elasticsearch Query DSL.

## Index Mapping Summary

```
sales_olap
├── Time:        sale_date (date), year (int), quarter (int), month (int), month_name (keyword), day_of_week (int)
├── Customer:    customer_name (text+keyword), customer_segment (keyword)
├── Geography:   country_name (keyword), country_region (keyword), city_name (keyword), store_name (text+keyword)
├── Product:     category_name (keyword), product_name (text+keyword), product_code (keyword),
│                variant_sku (keyword), variant_color (keyword), variant_size (keyword)
├── Measures:    quantity (int), unit_price (double), discount_amount (double), total_amount (double)
└── ID:          sale_id (keyword), order_number (keyword)
```

> **Convention**: All examples use `curl` against `http://localhost:9200`. Replace with your cluster URL as needed. For `text` fields used in aggregations, always use the `.keyword` sub-field.

---

## 1. Basic Aggregation (Tong quan)

### 1.1 Total Revenue, Quantity Sold, Transaction Count, Average Order Value

A single request that computes all four base KPIs at once using the `stats` and `value_count` aggregations.

```bash
curl -s -X POST "http://localhost:9200/sales_olap/_search?size=0" \
  -H 'Content-Type: application/json' \
  -d '
{
  "size": 0,

  "aggs": {
    "total_revenue": {
      "sum": {
        "field": "total_amount"
      }
    },
    "total_quantity": {
      "sum": {
        "field": "quantity"
      }
    },
    "transaction_count": {
      "value_count": {
        "field": "sale_id"
      }
    },
    "avg_order_value": {
      "avg": {
        "field": "total_amount"
      }
    },
    "total_discount": {
      "sum": {
        "field": "discount_amount"
      }
    }
  }
}'
```

**Response structure**:

```json
{
  "hits": { "total": { "value": 12345 } },
  "aggregations": {
    "total_revenue":      { "value": 9876543.21 },
    "total_quantity":     { "value": 543210 },
    "transaction_count":  { "value": 12345 },
    "avg_order_value":    { "value": 800.12 },
    "total_discount":     { "value": 123456.78 }
  }
}
```

**Explanation**:
- `size: 0` — suppresses document hits; we only want aggregation results.
- `sum` — totals a numeric field.
- `value_count` — counts non-null values of a field (equivalent to row count when the field is always present).
- `avg` — arithmetic mean of the field.

---

## 2. Slice (Loc theo 1 chieu)

A **Slice** fixes one dimension to a single value while keeping all other dimensions free.

### 2.1 Filter by category_name = "Electronics"

```bash
curl -s -X POST "http://localhost:9200/sales_olap/_search?size=0" \
  -H 'Content-Type: application/json' \
  -d '
{
  "size": 0,

  "query": {
    "term": {
      "category_name": "Electronics"
    }
  },

  "aggs": {
    "total_revenue": { "sum": { "field": "total_amount" } },
    "total_quantity": { "sum": { "field": "quantity" } },
    "transaction_count": { "value_count": { "field": "sale_id" } }
  }
}'
```

### 2.2 Filter by year = 2024

```bash
curl -s -X POST "http://localhost:9200/sales_olap/_search?size=0" \
  -H 'Content-Type: application/json' \
  -d '
{
  "size": 0,

  "query": {
    "term": {
      "year": 2024
    }
  },

  "aggs": {
    "total_revenue": { "sum": { "field": "total_amount" } },
    "total_quantity": { "sum": { "field": "quantity" } },
    "transaction_count": { "value_count": { "field": "sale_id" } }
  }
}'
```

### 2.3 Filter by customer_segment = "B2B"

```bash
curl -s -X POST "http://localhost:9200/sales_olap/_search?size=0" \
  -H 'Content-Type: application/json' \
  -d '
{
  "size": 0,

  "query": {
    "term": {
      "customer_segment": "B2B"
    }
  },

  "aggs": {
    "total_revenue": { "sum": { "field": "total_amount" } },
    "total_quantity": { "sum": { "field": "quantity" } },
    "transaction_count": { "value_count": { "field": "sale_id" } }
  }
}'
```

### 2.4 Filter by country_name = "Vietnam"

```bash
curl -s -X POST "http://localhost:9200/sales_olap/_search?size=0" \
  -H 'Content-Type: application/json' \
  -d '
{
  "size": 0,

  "query": {
    "term": {
      "country_name": "Vietnam"
    }
  },

  "aggs": {
    "total_revenue": { "sum": { "field": "total_amount" } },
    "total_quantity": { "sum": { "field": "quantity" } },
    "transaction_count": { "value_count": { "field": "sale_id" } }
  }
}'
```

**Explanation**:
- `term` query matches an exact keyword value (no analysis). Use it for `keyword`, `integer`, and `date` fields.
- For `text` fields that also have a `.keyword` sub-field, use `term` on the `.keyword` version.

---

## 3. Dice (Loc multi-chieu)

A **Dice** applies filters on two or more dimensions simultaneously, creating a sub-cube.

### 3.1 Electronics + 2024 + Vietnam

```bash
curl -s -X POST "http://localhost:9200/sales_olap/_search?size=0" \
  -H 'Content-Type: application/json' \
  -d '
{
  "size": 0,

  "query": {
    "bool": {
      "filter": [
        { "term": { "category_name": "Electronics" } },
        { "term": { "year": 2024 } },
        { "term": { "country_name": "Vietnam" } }
      ]
    }
  },

  "aggs": {
    "total_revenue": { "sum": { "field": "total_amount" } },
    "total_quantity": { "sum": { "field": "quantity" } },
    "transaction_count": { "value_count": { "field": "sale_id" } },
    "avg_order_value": { "avg": { "field": "total_amount" } }
  }
}'
```

**Response structure**:

```json
{
  "hits": { "total": { "value": 876 } },
  "aggregations": {
    "total_revenue":     { "value": 543210.00 },
    "total_quantity":    { "value": 12340 },
    "transaction_count": { "value": 876 },
    "avg_order_value":   { "value": 620.56 }
  }
}
```

### 3.2 B2B + Q1 2024 + Ho Chi Minh

```bash
curl -s -X POST "http://localhost:9200/sales_olap/_search?size=0" \
  -H 'Content-Type: application/json' \
  -d '
{
  "size": 0,

  "query": {
    "bool": {
      "filter": [
        { "term": { "customer_segment": "B2B" } },
        { "term": { "year": 2024 } },
        { "term": { "quarter": 1 } },
        { "term": { "city_name": "Ho Chi Minh" } }
      ]
    }
  },

  "aggs": {
    "total_revenue": { "sum": { "field": "total_amount" } },
    "total_quantity": { "sum": { "field": "quantity" } },
    "transaction_count": { "value_count": { "field": "sale_id" } }
  }
}'
```

**Explanation**:
- `bool.filter` — combines multiple conditions with AND logic. Unlike `must`, `filter` does not score and is faster for exact-match filtering.
- Each `term` clause constrains one dimension.

---

## 4. Roll-up (Tong hop len muc cao hon)

Roll-up aggregates data from a fine-grained level to a coarser level by changing the `terms` aggregation field.

### 4.1 Product hierarchy: variant -> product -> category

**Level: Category (coarsest)**

```bash
curl -s -X POST "http://localhost:9200/sales_olap/_search?size=0" \
  -H 'Content-Type: application/json' \
  -d '
{
  "size": 0,

  "aggs": {
    "by_category": {
      "terms": {
        "field": "category_name",
        "size": 100,
        "order": { "total_revenue": "desc" }
      },
      "aggs": {
        "total_revenue": { "sum": { "field": "total_amount" } },
        "total_quantity": { "sum": { "field": "quantity" } }
      }
    }
  }
}'
```

**Level: Product**

```bash
curl -s -X POST "http://localhost:9200/sales_olap/_search?size=0" \
  -H 'Content-Type: application/json' \
  -d '
{
  "size": 0,

  "aggs": {
    "by_product": {
      "terms": {
        "field": "product_name.keyword",
        "size": 500,
        "order": { "total_revenue": "desc" }
      },
      "aggs": {
        "total_revenue": { "sum": { "field": "total_amount" } },
        "total_quantity": { "sum": { "field": "quantity" } }
      }
    }
  }
}'
```

**Level: Variant / SKU (finest)**

```bash
curl -s -X POST "http://localhost:9200/sales_olap/_search?size=0" \
  -H 'Content-Type: application/json' \
  -d '
{
  "size": 0,

  "aggs": {
    "by_variant_sku": {
      "terms": {
        "field": "variant_sku",
        "size": 2000,
        "order": { "total_revenue": "desc" }
      },
      "aggs": {
        "total_revenue": { "sum": { "field": "total_amount" } },
        "total_quantity": { "sum": { "field": "quantity" } }
      }
    }
  }
}'
```

### 4.2 Time hierarchy: date -> month -> quarter -> year

**Level: Year**

```bash
curl -s -X POST "http://localhost:9200/sales_olap/_search?size=0" \
  -H 'Content-Type: application/json' \
  -d '
{
  "size": 0,

  "aggs": {
    "by_year": {
      "terms": {
        "field": "year",
        "size": 20,
        "order": { "_key": "asc" }
      },
      "aggs": {
        "total_revenue": { "sum": { "field": "total_amount" } },
        "total_quantity": { "sum": { "field": "quantity" } }
      }
    }
  }
}'
```

**Level: Quarter**

```bash
curl -s -X POST "http://localhost:9200/sales_olap/_search?size=0" \
  -H 'Content-Type: application/json' \
  -d '
{
  "size": 0,

  "aggs": {
    "by_year": {
      "terms": {
        "field": "year",
        "size": 20,
        "order": { "_key": "asc" }
      },
      "aggs": {
        "by_quarter": {
          "terms": {
            "field": "quarter",
            "size": 4,
            "order": { "_key": "asc" }
          },
          "aggs": {
            "total_revenue": { "sum": { "field": "total_amount" } },
            "total_quantity": { "sum": { "field": "quantity" } }
          }
        }
      }
    }
  }
}'
```

**Response structure (Time roll-up)**:

```json
{
  "aggregations": {
    "by_year": {
      "buckets": [
        {
          "key": 2023,
          "doc_count": 5000,
          "by_quarter": {
            "buckets": [
              { "key": 1, "doc_count": 1200, "total_revenue": { "value": 980000.00 } },
              { "key": 2, "doc_count": 1300, "total_revenue": { "value": 1050000.00 } },
              { "key": 3, "doc_count": 1250, "total_revenue": { "value": 1020000.00 } },
              { "key": 4, "doc_count": 1250, "total_revenue": { "value": 1010000.00 } }
            ]
          }
        },
        {
          "key": 2024,
          "doc_count": 7345,
          "by_quarter": { ... }
        }
      ]
    }
  }
}
```

**Level: Month**

```bash
curl -s -X POST "http://localhost:9200/sales_olap/_search?size=0" \
  -H 'Content-Type: application/json' \
  -d '
{
  "size": 0,

  "aggs": {
    "by_year": {
      "terms": { "field": "year", "size": 20, "order": { "_key": "asc" } },
      "aggs": {
        "by_quarter": {
          "terms": { "field": "quarter", "size": 4, "order": { "_key": "asc" } },
          "aggs": {
            "by_month": {
              "terms": { "field": "month", "size": 12, "order": { "_key": "asc" } },
              "aggs": {
                "total_revenue": { "sum": { "field": "total_amount" } },
                "total_quantity": { "sum": { "field": "quantity" } }
              }
            }
          }
        }
      }
    }
  }
}'
```

**Level: Date (finest, using date_histogram)**

```bash
curl -s -X POST "http://localhost:9200/sales_olap/_search?size=0" \
  -H 'Content-Type: application/json' \
  -d '
{
  "size": 0,

  "aggs": {
    "by_day": {
      "date_histogram": {
        "field": "sale_date",
        "calendar_interval": "day",
        "format": "yyyy-MM-dd",
        "min_doc_count": 0
      },
      "aggs": {
        "total_revenue": { "sum": { "field": "total_amount" } },
        "total_quantity": { "sum": { "field": "quantity" } }
      }
    }
  }
}'
```

### 4.3 Geography hierarchy: store -> city -> country

**Level: Country (coarsest)**

```bash
curl -s -X POST "http://localhost:9200/sales_olap/_search?size=0" \
  -H 'Content-Type: application/json' \
  -d '
{
  "size": 0,

  "aggs": {
    "by_country": {
      "terms": {
        "field": "country_name",
        "size": 100,
        "order": { "total_revenue": "desc" }
      },
      "aggs": {
        "total_revenue": { "sum": { "field": "total_amount" } },
        "total_quantity": { "sum": { "field": "quantity" } }
      }
    }
  }
}'
```

**Level: City**

```bash
curl -s -X POST "http://localhost:9200/sales_olap/_search?size=0" \
  -H 'Content-Type: application/json' \
  -d '
{
  "size": 0,

  "aggs": {
    "by_country": {
      "terms": {
        "field": "country_name",
        "size": 100,
        "order": { "total_revenue": "desc" }
      },
      "aggs": {
        "by_city": {
          "terms": {
            "field": "city_name",
            "size": 200,
            "order": { "total_revenue": "desc" }
          },
          "aggs": {
            "total_revenue": { "sum": { "field": "total_amount" } },
            "total_quantity": { "sum": { "field": "quantity" } }
          }
        }
      }
    }
  }
}'
```

**Level: Store (finest)**

```bash
curl -s -X POST "http://localhost:9200/sales_olap/_search?size=0" \
  -H 'Content-Type: application/json' \
  -d '
{
  "size": 0,

  "aggs": {
    "by_country": {
      "terms": { "field": "country_name", "size": 100 },
      "aggs": {
        "by_city": {
          "terms": { "field": "city_name", "size": 200 },
          "aggs": {
            "by_store": {
              "terms": {
                "field": "store_name.keyword",
                "size": 500,
                "order": { "total_revenue": "desc" }
              },
              "aggs": {
                "total_revenue": { "sum": { "field": "total_amount" } },
                "total_quantity": { "sum": { "field": "quantity" } }
              }
            }
          }
        }
      }
    }
  }
}'
```

**Explanation**:
- Nested `terms` aggregations build the hierarchy. Each level groups by the next coarser/finer attribute.
- `date_histogram` is the ES-native way to bucket dates by calendar interval.
- `min_doc_count: 0` ensures empty buckets are returned (useful for continuous time series).

---

## 5. Drill-down (Xem chi tiet hon)

Drill-down navigates from a coarse level to a finer level. Each step applies a `filter` on the parent level and groups by the child level.

### 5.1 Drill-down Product: Category -> Product -> Variant

**Level 0: Aggregate by category_name**

```bash
curl -s -X POST "http://localhost:9200/sales_olap/_search?size=0" \
  -H 'Content-Type: application/json' \
  -d '
{
  "size": 0,

  "aggs": {
    "categories": {
      "terms": {
        "field": "category_name",
        "size": 100,
        "order": { "total_revenue": "desc" }
      },
      "aggs": {
        "total_revenue": { "sum": { "field": "total_amount" } },
        "total_quantity": { "sum": { "field": "quantity" } },
        "transaction_count": { "value_count": { "field": "sale_id" } }
      }
    }
  }
}'
```

**Response structure**:

```json
{
  "aggregations": {
    "categories": {
      "buckets": [
        {
          "key": "Electronics",
          "doc_count": 4200,
          "total_revenue":     { "value": 3210000.00 },
          "total_quantity":    { "value": 89000 },
          "transaction_count": { "value": 4200 }
        },
        {
          "key": "Clothing",
          "doc_count": 3100,
          ...
        }
      ]
    }
  }
}
```

**Level 1: Filter category = "Electronics", aggregate by product_name.keyword**

```bash
curl -s -X POST "http://localhost:9200/sales_olap/_search?size=0" \
  -H 'Content-Type: application/json' \
  -d '
{
  "size": 0,

  "query": {
    "bool": {
      "filter": [
        { "term": { "category_name": "Electronics" } }
      ]
    }
  },

  "aggs": {
    "products": {
      "terms": {
        "field": "product_name.keyword",
        "size": 200,
        "order": { "total_revenue": "desc" }
      },
      "aggs": {
        "total_revenue": { "sum": { "field": "total_amount" } },
        "total_quantity": { "sum": { "field": "quantity" } },
        "transaction_count": { "value_count": { "field": "sale_id" } }
      }
    }
  }
}'
```

**Level 2: Filter product, aggregate by variant_sku**

```bash
curl -s -X POST "http://localhost:9200/sales_olap/_search?size=0" \
  -H 'Content-Type: application/json' \
  -d '
{
  "size": 0,

  "query": {
    "bool": {
      "filter": [
        { "term": { "category_name": "Electronics" } },
        { "term": { "product_name.keyword": "Wireless Bluetooth Headphones" } }
      ]
    }
  },

  "aggs": {
    "variants": {
      "terms": {
        "field": "variant_sku",
        "size": 100,
        "order": { "total_revenue": "desc" }
      },
      "aggs": {
        "total_revenue": { "sum": { "field": "total_amount" } },
        "total_quantity": { "sum": { "field": "quantity" } },
        "avg_unit_price": { "avg": { "field": "unit_price" } },
        "color_info": {
          "terms": { "field": "variant_color", "size": 10 }
        },
        "size_info": {
          "terms": { "field": "variant_size", "size": 10 }
        }
      }
    }
  }
}'
```

**Response structure**:

```json
{
  "aggregations": {
    "variants": {
      "buckets": [
        {
          "key": "WBH-BLK-S",
          "doc_count": 230,
          "total_revenue":   { "value": 22770.00 },
          "total_quantity":  { "value": 230 },
          "avg_unit_price":  { "value": 99.00 },
          "color_info": { "buckets": [{ "key": "Black", "doc_count": 230 }] },
          "size_info":  { "buckets": [{ "key": "Standard", "doc_count": 230 }] }
        },
        {
          "key": "WBH-WHT-S",
          "doc_count": 180,
          ...
        }
      ]
    }
  }
}
```

### 5.2 Drill-down Time: Year -> Quarter -> Month -> Date

**Level 0: Aggregate by year**

```bash
curl -s -X POST "http://localhost:9200/sales_olap/_search?size=0" \
  -H 'Content-Type: application/json' \
  -d '
{
  "size": 0,

  "aggs": {
    "by_year": {
      "terms": {
        "field": "year",
        "size": 20,
        "order": { "_key": "asc" }
      },
      "aggs": {
        "total_revenue": { "sum": { "field": "total_amount" } },
        "total_quantity": { "sum": { "field": "quantity" } },
        "transaction_count": { "value_count": { "field": "sale_id" } }
      }
    }
  }
}'
```

**Level 1: Filter year = 2024, aggregate by quarter**

```bash
curl -s -X POST "http://localhost:9200/sales_olap/_search?size=0" \
  -H 'Content-Type: application/json' \
  -d '
{
  "size": 0,

  "query": {
    "bool": {
      "filter": [
        { "term": { "year": 2024 } }
      ]
    }
  },

  "aggs": {
    "by_quarter": {
      "terms": {
        "field": "quarter",
        "size": 4,
        "order": { "_key": "asc" }
      },
      "aggs": {
        "total_revenue": { "sum": { "field": "total_amount" } },
        "total_quantity": { "sum": { "field": "quantity" } },
        "transaction_count": { "value_count": { "field": "sale_id" } }
      }
    }
  }
}'
```

**Level 2: Filter quarter = 1, aggregate by month**

```bash
curl -s -X POST "http://localhost:9200/sales_olap/_search?size=0" \
  -H 'Content-Type: application/json' \
  -d '
{
  "size": 0,

  "query": {
    "bool": {
      "filter": [
        { "term": { "year": 2024 } },
        { "term": { "quarter": 1 } }
      ]
    }
  },

  "aggs": {
    "by_month": {
      "terms": {
        "field": "month",
        "size": 12,
        "order": { "_key": "asc" }
      },
      "aggs": {
        "total_revenue": { "sum": { "field": "total_amount" } },
        "total_quantity": { "sum": { "field": "quantity" } },
        "transaction_count": { "value_count": { "field": "sale_id" } }
      }
    }
  }
}'
```

**Level 3: Filter month = 1, date_histogram by day**

```bash
curl -s -X POST "http://localhost:9200/sales_olap/_search?size=0" \
  -H 'Content-Type: application/json' \
  -d '
{
  "size": 0,

  "query": {
    "bool": {
      "filter": [
        { "term": { "year": 2024 } },
        { "term": { "quarter": 1 } },
        { "term": { "month": 1 } }
      ]
    }
  },

  "aggs": {
    "by_day": {
      "date_histogram": {
        "field": "sale_date",
        "calendar_interval": "day",
        "format": "yyyy-MM-dd",
        "min_doc_count": 0
      },
      "aggs": {
        "total_revenue": { "sum": { "field": "total_amount" } },
        "total_quantity": { "sum": { "field": "quantity" } },
        "transaction_count": { "value_count": { "field": "sale_id" } }
      }
    }
  }
}'
```

**Response structure**:

```json
{
  "aggregations": {
    "by_day": {
      "buckets": [
        {
          "key_as_string": "2024-01-01",
          "key": 1704067200000,
          "doc_count": 45,
          "total_revenue":     { "value": 36000.00 },
          "total_quantity":    { "value": 980 },
          "transaction_count": { "value": 45 }
        },
        {
          "key_as_string": "2024-01-02",
          "key": 1704153600000,
          "doc_count": 52,
          ...
        }
      ]
    }
  }
}
```

### 5.3 Drill-down Customer: Segment -> Customer

**Level 0: Aggregate by customer_segment**

```bash
curl -s -X POST "http://localhost:9200/sales_olap/_search?size=0" \
  -H 'Content-Type: application/json' \
  -d '
{
  "size": 0,

  "aggs": {
    "by_segment": {
      "terms": {
        "field": "customer_segment",
        "size": 20,
        "order": { "total_revenue": "desc" }
      },
      "aggs": {
        "total_revenue": { "sum": { "field": "total_amount" } },
        "total_quantity": { "sum": { "field": "quantity" } },
        "transaction_count": { "value_count": { "field": "sale_id" } }
      }
    }
  }
}'
```

**Level 1: Filter segment = "B2B", aggregate by customer_name.keyword**

```bash
curl -s -X POST "http://localhost:9200/sales_olap/_search?size=0" \
  -H 'Content-Type: application/json' \
  -d '
{
  "size": 0,

  "query": {
    "bool": {
      "filter": [
        { "term": { "customer_segment": "B2B" } }
      ]
    }
  },

  "aggs": {
    "by_customer": {
      "terms": {
        "field": "customer_name.keyword",
        "size": 500,
        "order": { "total_revenue": "desc" }
      },
      "aggs": {
        "total_revenue": { "sum": { "field": "total_amount" } },
        "total_quantity": { "sum": { "field": "quantity" } },
        "transaction_count": { "value_count": { "field": "sale_id" } }
      }
    }
  }
}'
```

### 5.4 Drill-down Geography: Country -> City -> Store

**Level 0: Aggregate by country_name**

```bash
curl -s -X POST "http://localhost:9200/sales_olap/_search?size=0" \
  -H 'Content-Type: application/json' \
  -d '
{
  "size": 0,

  "aggs": {
    "by_country": {
      "terms": {
        "field": "country_name",
        "size": 100,
        "order": { "total_revenue": "desc" }
      },
      "aggs": {
        "total_revenue": { "sum": { "field": "total_amount" } },
        "total_quantity": { "sum": { "field": "quantity" } },
        "transaction_count": { "value_count": { "field": "sale_id" } }
      }
    }
  }
}'
```

**Level 1: Filter country = "Vietnam", aggregate by city_name**

```bash
curl -s -X POST "http://localhost:9200/sales_olap/_search?size=0" \
  -H 'Content-Type: application/json' \
  -d '
{
  "size": 0,

  "query": {
    "bool": {
      "filter": [
        { "term": { "country_name": "Vietnam" } }
      ]
    }
  },

  "aggs": {
    "by_city": {
      "terms": {
        "field": "city_name",
        "size": 100,
        "order": { "total_revenue": "desc" }
      },
      "aggs": {
        "total_revenue": { "sum": { "field": "total_amount" } },
        "total_quantity": { "sum": { "field": "quantity" } },
        "transaction_count": { "value_count": { "field": "sale_id" } }
      }
    }
  }
}'
```

**Level 2: Filter city = "Ho Chi Minh", aggregate by store_name.keyword**

```bash
curl -s -X POST "http://localhost:9200/sales_olap/_search?size=0" \
  -H 'Content-Type: application/json' \
  -d '
{
  "size": 0,

  "query": {
    "bool": {
      "filter": [
        { "term": { "country_name": "Vietnam" } },
        { "term": { "city_name": "Ho Chi Minh" } }
      ]
    }
  },

  "aggs": {
    "by_store": {
      "terms": {
        "field": "store_name.keyword",
        "size": 200,
        "order": { "total_revenue": "desc" }
      },
      "aggs": {
        "total_revenue": { "sum": { "field": "total_amount" } },
        "total_quantity": { "sum": { "field": "quantity" } },
        "transaction_count": { "value_count": { "field": "sale_id" } }
      }
    }
  }
}'
```

**Explanation**:
- Drill-down is the inverse of roll-up: you add a `filter` for the parent level and switch the `terms` field to the child level.
- This mimics clicking on a bar in a chart to see its breakdown.

---

## 6. Combined Operations

### 6.1 Slice + Drill-down: Filter by country + drill-down product

This slices the cube to Vietnam only, then drills down the product dimension from category to product.

```bash
curl -s -X POST "http://localhost:9200/sales_olap/_search?size=0" \
  -H 'Content-Type: application/json' \
  -d '
{
  "size": 0,

  "query": {
    "bool": {
      "filter": [
        { "term": { "country_name": "Vietnam" } }
      ]
    }
  },

  "aggs": {
    "by_category": {
      "terms": {
        "field": "category_name",
        "size": 100,
        "order": { "total_revenue": "desc" }
      },
      "aggs": {
        "total_revenue": { "sum": { "field": "total_amount" } },
        "total_quantity": { "sum": { "field": "quantity" } },
        "by_product": {
          "terms": {
            "field": "product_name.keyword",
            "size": 50,
            "order": { "total_revenue": "desc" }
          },
          "aggs": {
            "total_revenue": { "sum": { "field": "total_amount" } },
            "total_quantity": { "sum": { "field": "quantity" } }
          }
        }
      }
    }
  }
}'
```

**Response structure**:

```json
{
  "aggregations": {
    "by_category": {
      "buckets": [
        {
          "key": "Electronics",
          "doc_count": 2100,
          "total_revenue":  { "value": 1680000.00 },
          "total_quantity": { "value": 42000 },
          "by_product": {
            "buckets": [
              {
                "key": "Wireless Bluetooth Headphones",
                "doc_count": 450,
                "total_revenue":  { "value": 44550.00 },
                "total_quantity": { "value": 450 }
              },
              {
                "key": "Smart Watch Pro",
                "doc_count": 380,
                "total_revenue":  { "value": 114000.00 },
                "total_quantity": { "value": 380 }
              }
            ]
          }
        }
      ]
    }
  }
}
```

### 6.2 Dice + Roll-up: Multi-filter + aggregate at category level

Apply a multi-dimension filter (dice), then roll up product to the category level.

```bash
curl -s -X POST "http://localhost:9200/sales_olap/_search?size=0" \
  -H 'Content-Type: application/json' \
  -d '
{
  "size": 0,

  "query": {
    "bool": {
      "filter": [
        { "term": { "customer_segment": "B2B" } },
        { "term": { "year": 2024 } },
        { "term": { "country_name": "Vietnam" } }
      ]
    }
  },

  "aggs": {
    "by_category": {
      "terms": {
        "field": "category_name",
        "size": 100,
        "order": { "total_revenue": "desc" }
      },
      "aggs": {
        "total_revenue": { "sum": { "field": "total_amount" } },
        "total_quantity": { "sum": { "field": "quantity" } },
        "avg_discount": { "avg": { "field": "discount_amount" } },
        "transaction_count": { "value_count": { "field": "sale_id" } }
      }
    }
  }
}'
```

**Explanation**:
- The `bool.filter` creates a sub-cube (B2B, 2024, Vietnam).
- The `terms` aggregation on `category_name` rolls product data up to the category level within that sub-cube.
- Additional metrics (`avg_discount`, `transaction_count`) provide richer insight into each category.

---

## 7. Cross-Tab / Pivot (Bang cheo)

Cross-tabulation creates a matrix by nesting one dimension's buckets inside another's.

### 7.1 Revenue by Category x Quarter (matrix)

```bash
curl -s -X POST "http://localhost:9200/sales_olap/_search?size=0" \
  -H 'Content-Type: application/json' \
  -d '
{
  "size": 0,

  "query": {
    "bool": {
      "filter": [
        { "term": { "year": 2024 } }
      ]
    }
  },

  "aggs": {
    "by_category": {
      "terms": {
        "field": "category_name",
        "size": 100
      },
      "aggs": {
        "by_quarter": {
          "terms": {
            "field": "quarter",
            "size": 4,
            "order": { "_key": "asc" }
          },
          "aggs": {
            "total_revenue": { "sum": { "field": "total_amount" } },
            "total_quantity": { "sum": { "field": "quantity" } }
          }
        }
      }
    }
  }
}'
```

**Response structure (pivot table)**:

```json
{
  "aggregations": {
    "by_category": {
      "buckets": [
        {
          "key": "Electronics",
          "doc_count": 4200,
          "by_quarter": {
            "buckets": [
              { "key": 1, "doc_count": 980,  "total_revenue": { "value": 780000.00 } },
              { "key": 2, "doc_count": 1050, "total_revenue": { "value": 840000.00 } },
              { "key": 3, "doc_count": 1080, "total_revenue": { "value": 812000.00 } },
              { "key": 4, "doc_count": 1090, "total_revenue": { "value": 778000.00 } }
            ]
          }
        },
        {
          "key": "Clothing",
          "doc_count": 3100,
          "by_quarter": { ... }
        }
      ]
    }
  }
}
```

**How to read it as a pivot table**:

| Category     | Q1        | Q2        | Q3        | Q4        | Total      |
|-------------|-----------|-----------|-----------|-----------|------------|
| Electronics | 780,000   | 840,000   | 812,000   | 778,000   | 3,210,000  |
| Clothing    | ...       | ...       | ...       | ...       | ...        |

### 7.2 Revenue by Segment x Country

```bash
curl -s -X POST "http://localhost:9200/sales_olap/_search?size=0" \
  -H 'Content-Type: application/json' \
  -d '
{
  "size": 0,

  "aggs": {
    "by_segment": {
      "terms": {
        "field": "customer_segment",
        "size": 20
      },
      "aggs": {
        "by_country": {
          "terms": {
            "field": "country_name",
            "size": 100
          },
          "aggs": {
            "total_revenue": { "sum": { "field": "total_amount" } },
            "total_quantity": { "sum": { "field": "quantity" } },
            "transaction_count": { "value_count": { "field": "sale_id" } }
          }
        }
      }
    }
  }
}'
```

**How to read it as a pivot table**:

| Segment | Vietnam    | Thailand   | Singapore  | Total      |
|---------|-----------|-----------|-----------|------------|
| B2B     | 1,200,000 | 980,000   | 650,000   | 2,830,000  |
| B2C     | 890,000   | 720,000   | 540,000   | 2,150,000  |

**Explanation**:
- The outer `terms` aggregation defines the rows (first dimension).
- The inner nested `terms` aggregation defines the columns (second dimension).
- Each cell contains the aggregated measure value.
- To transpose the matrix, simply swap the order of the nested aggregations.

---

## 8. Top N Analysis

### 8.1 Top 10 products by revenue

```bash
curl -s -X POST "http://localhost:9200/sales_olap/_search?size=0" \
  -H 'Content-Type: application/json' \
  -d '
{
  "size": 0,

  "aggs": {
    "top_products": {
      "terms": {
        "field": "product_name.keyword",
        "size": 10,
        "order": { "total_revenue": "desc" }
      },
      "aggs": {
        "total_revenue": { "sum": { "field": "total_amount" } },
        "total_quantity": { "sum": { "field": "quantity" } },
        "transaction_count": { "value_count": { "field": "sale_id" } },
        "avg_unit_price": { "avg": { "field": "unit_price" } }
      }
    }
  }
}'
```

**Response structure**:

```json
{
  "aggregations": {
    "top_products": {
      "buckets": [
        {
          "key": "Premium Laptop 15 inch",
          "doc_count": 890,
          "total_revenue":    { "value": 1335000.00 },
          "total_quantity":   { "value": 890 },
          "transaction_count":{ "value": 890 },
          "avg_unit_price":   { "value": 1500.00 }
        },
        {
          "key": "Smart Watch Pro",
          "doc_count": 1200,
          "total_revenue":    { "value": 480000.00 },
          ...
        }
      ]
    }
  }
}
```

### 8.2 Top 5 customers by quantity purchased

```bash
curl -s -X POST "http://localhost:9200/sales_olap/_search?size=0" \
  -H 'Content-Type: application/json' \
  -d '
{
  "size": 0,

  "aggs": {
    "top_customers": {
      "terms": {
        "field": "customer_name.keyword",
        "size": 5,
        "order": { "total_quantity": "desc" }
      },
      "aggs": {
        "total_quantity": { "sum": { "field": "quantity" } },
        "total_revenue": { "sum": { "field": "total_amount" } },
        "transaction_count": { "value_count": { "field": "sale_id" } }
      }
    }
  }
}'
```

**Explanation**:
- `size: 10` (or `5`) limits the number of buckets returned.
- `order: { "total_revenue": "desc" }` sorts buckets by a sub-aggregation instead of doc count.
- This is the ES equivalent of SQL's `ORDER BY total_revenue DESC LIMIT 10`.

---

## 9. Trend Analysis

### 9.1 Monthly revenue trend (date_histogram)

```bash
curl -s -X POST "http://localhost:9200/sales_olap/_search?size=0" \
  -H 'Content-Type: application/json' \
  -d '
{
  "size": 0,

  "aggs": {
    "monthly_trend": {
      "date_histogram": {
        "field": "sale_date",
        "calendar_interval": "month",
        "format": "yyyy-MM",
        "min_doc_count": 0
      },
      "aggs": {
        "total_revenue": { "sum": { "field": "total_amount" } },
        "total_quantity": { "sum": { "field": "quantity" } },
        "transaction_count": { "value_count": { "field": "sale_id" } },
        "avg_order_value": { "avg": { "field": "total_amount" } },
        "total_discount": { "sum": { "field": "discount_amount" } }
      }
    }
  }
}'
```

**Response structure**:

```json
{
  "aggregations": {
    "monthly_trend": {
      "buckets": [
        {
          "key_as_string": "2023-01",
          "key": 1672531200000,
          "doc_count": 850,
          "total_revenue":    { "value": 680000.00 },
          "total_quantity":   { "value": 21000 },
          "transaction_count":{ "value": 850 },
          "avg_order_value":  { "value": 800.00 },
          "total_discount":   { "value": 34000.00 }
        },
        {
          "key_as_string": "2023-02",
          "key": 1675209600000,
          "doc_count": 790,
          "total_revenue":    { "value": 632000.00 },
          ...
        },
        {
          "key_as_string": "2023-03",
          ...
        }
      ]
    }
  }
}
```

**Explanation**:
- `calendar_interval: "month"` aligns buckets to calendar month boundaries.
- `format: "yyyy-MM"` controls the display format of the bucket key.
- `min_doc_count: 0` fills gaps in the time series so that months with no data still appear as empty buckets.

### 9.2 Year-over-year comparison

Compare monthly revenue across multiple years by nesting year inside month.

```bash
curl -s -X POST "http://localhost:9200/sales_olap/_search?size=0" \
  -H 'Content-Type: application/json' \
  -d '
{
  "size": 0,

  "aggs": {
    "by_month": {
      "terms": {
        "field": "month",
        "size": 12,
        "order": { "_key": "asc" }
      },
      "aggs": {
        "by_year": {
          "terms": {
            "field": "year",
            "size": 10,
            "order": { "_key": "asc" }
          },
          "aggs": {
            "total_revenue": { "sum": { "field": "total_amount" } },
            "total_quantity": { "sum": { "field": "quantity" } },
            "transaction_count": { "value_count": { "field": "sale_id" } }
          }
        }
      }
    }
  }
}'
```

**Response structure**:

```json
{
  "aggregations": {
    "by_month": {
      "buckets": [
        {
          "key": 1,
          "doc_count": 2500,
          "by_year": {
            "buckets": [
              { "key": 2022, "doc_count": 700,  "total_revenue": { "value": 560000.00 } },
              { "key": 2023, "doc_count": 850,  "total_revenue": { "value": 680000.00 } },
              { "key": 2024, "doc_count": 950,  "total_revenue": { "value": 760000.00 } }
            ]
          }
        },
        {
          "key": 2,
          "doc_count": 2400,
          "by_year": {
            "buckets": [
              { "key": 2022, "total_revenue": { "value": 520000.00 } },
              { "key": 2023, "total_revenue": { "value": 632000.00 } },
              { "key": 2024, "total_revenue": { "value": 710000.00 } }
            ]
          }
        }
      ]
    }
  }
}
```

**How to read it as a YoY table**:

| Month | 2022     | 2023     | 2024     | YoY Growth (23->24) |
|-------|----------|----------|----------|---------------------|
| Jan   | 560,000  | 680,000  | 760,000  | +11.8%              |
| Feb   | 520,000  | 632,000  | 710,000  | +12.3%              |
| Mar   | ...      | ...      | ...      | ...                 |

**YoY Growth formula**: `(revenue_2024 - revenue_2023) / revenue_2023 * 100`

### 9.3 Year-over-year with explicit filter (fixed range alternative)

An alternative approach using `filters` aggregation for explicit year comparison, useful when you want to label the series clearly.

```bash
curl -s -X POST "http://localhost:9200/sales_olap/_search?size=0" \
  -H 'Content-Type: application/json' \
  -d '
{
  "size": 0,

  "aggs": {
    "years": {
      "filters": {
        "filters": {
          "year_2023": { "term": { "year": 2023 } },
          "year_2024": { "term": { "year": 2024 } }
        }
      },
      "aggs": {
        "monthly": {
          "date_histogram": {
            "field": "sale_date",
            "calendar_interval": "month",
            "format": "MM",
            "min_doc_count": 0
          },
          "aggs": {
            "total_revenue": { "sum": { "field": "total_amount" } }
          }
        }
      }
    }
  }
}'
```

**Response structure**:

```json
{
  "aggregations": {
    "years": {
      "buckets": {
        "year_2023": {
          "doc_count": 12000,
          "monthly": {
            "buckets": [
              { "key_as_string": "01", "doc_count": 850,  "total_revenue": { "value": 680000.00 } },
              { "key_as_string": "02", "doc_count": 790,  "total_revenue": { "value": 632000.00 } }
            ]
          }
        },
        "year_2024": {
          "doc_count": 14500,
          "monthly": {
            "buckets": [
              { "key_as_string": "01", "doc_count": 950,  "total_revenue": { "value": 760000.00 } },
              { "key_as_string": "02", "doc_count": 920,  "total_revenue": { "value": 710000.00 } }
            ]
          }
        }
      }
    }
  }
}
```

**Explanation**:
- The `filters` aggregation creates named buckets (`year_2023`, `year_2024`) so each year is a separate series.
- Inside each year bucket, `date_histogram` with `calendar_interval: "month"` produces 12 monthly sub-buckets.
- This structure maps directly to a multi-series line chart (one line per year, X-axis = month).

---

## Quick Reference

| OLAP Operation | ES Mechanism |
|---|---|
| **Slice** (1 dimension filter) | `query.term` on one field |
| **Dice** (multi-dimension filter) | `query.bool.filter` with multiple `term` clauses |
| **Roll-up** (aggregate coarser) | `terms` agg on the coarser-level field |
| **Drill-down** (see finer detail) | `query.term` filter on parent + `terms` agg on child |
| **Cross-tab / Pivot** | Nested `terms` aggs (outer = rows, inner = columns) |
| **Top N** | `terms` agg with `size: N` and `order` by sub-agg |
| **Trend** | `date_histogram` with `calendar_interval` |
| **YoY Comparison** | Nested `terms` (month outer, year inner) or `filters` agg |

### Common Patterns

```json
// Exact match on keyword field
{ "term": { "category_name": "Electronics" } }

// Exact match on text field (must use .keyword sub-field)
{ "term": { "product_name.keyword": "Smart Watch Pro" } }

// Range filter on numeric field
{ "range": { "total_amount": { "gte": 100, "lte": 1000 } } }

// Range filter on date field
{ "range": { "sale_date": { "gte": "2024-01-01", "lte": "2024-12-31" } } }

// Match multiple values (IN clause)
{ "terms": { "category_name": ["Electronics", "Clothing"] } }

// Full-text search on text field
{ "match": { "product_name": "wireless headphone" } }
```
