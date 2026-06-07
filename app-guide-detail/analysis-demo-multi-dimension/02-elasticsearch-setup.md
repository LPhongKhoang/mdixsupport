# 02 - Elasticsearch Setup

## 1. Chạy Elasticsearch bằng Docker

Nếu chưa có ES running, dùng docker-compose từ `mendix-infra/` hoặc chạy trực tiếp:

```bash
docker run -d \
  --name elasticsearch-olap \
  -p 9200:9200 \
  -p 9300:9300 \
  -e "discovery.type=single-node" \
  -e "ES_JAVA_OPTS=-Xms512m -Xmx512m" \
  docker.elastic.co/elasticsearch/elasticsearch-oss:7.10.2
```

Kiểm tra ES đang chạy:

```bash
curl http://localhost:9200
```

Expected response:
```json
{
  "name" : "...",
  "cluster_name" : "docker-cluster",
  "version" : {
    "number" : "7.10.2"
  },
  "tagline" : "You Know, for Search"
}
```

## 2. Tạo Index với Mapping

Tạo file `es-index-mapping.json` (xem file đính kèm) và gửi lên ES:

```bash
curl -X PUT "http://localhost:9200/sales_olap" \
  -H 'Content-Type: application/json' \
  -d '{
  "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 0
  },
  "mappings": {
    "properties": {
      "sale_id":          { "type": "keyword" },
      "order_number":     { "type": "keyword" },
      "sale_date":        { "type": "date", "format": "yyyy-MM-dd" },

      "year":             { "type": "integer" },
      "quarter":          { "type": "integer" },
      "month":            { "type": "integer" },
      "month_name":       { "type": "keyword" },
      "day_of_week":      { "type": "integer" },

      "customer_name":    { "type": "text", "fields": { "keyword": { "type": "keyword" } } },
      "customer_segment": { "type": "keyword" },

      "country_name":     { "type": "keyword" },
      "country_region":   { "type": "keyword" },
      "city_name":        { "type": "keyword" },
      "store_name":       { "type": "text", "fields": { "keyword": { "type": "keyword" } } },

      "category_name":    { "type": "keyword" },
      "product_name":     { "type": "text", "fields": { "keyword": { "type": "keyword" } } },
      "product_code":     { "type": "keyword" },
      "variant_sku":      { "type": "keyword" },
      "variant_color":    { "type": "keyword" },
      "variant_size":     { "type": "keyword" },

      "quantity":         { "type": "integer" },
      "unit_price":       { "type": "double" },
      "discount_amount":  { "type": "double" },
      "total_amount":     { "type": "double" }
    }
  }
}'
```

### Giải thích Mapping

| Field | Type | Lý do |
|-------|------|--------|
| `category_name`, `customer_segment`, `country_name` | `keyword` | Dùng cho `terms` aggregation + exact filter. Không cần full-text search. |
| `product_name`, `customer_name`, `store_name` | `text` + `keyword` sub-field | Cả full-text search (text) lẫn exact match/agg (keyword). Aggregation dùng `.keyword`. |
| `sale_date` | `date` | Dùng cho `date_histogram` aggregation. |
| `total_amount`, `unit_price` | `double` | Dùng cho `sum`, `avg`, `min`, `max` aggregations. |
| `year`, `quarter`, `month` | `integer` | Dùng cho `terms` aggregation (drill-down time). |
| `variant_sku`, `order_number` | `keyword` | Exact match, dùng trong filter. |

**QUAN TRỌNG**: Các field dùng trong `terms` aggregation PHẢI là `keyword` type hoặc dùng `.keyword` sub-field. ES không cho phép `terms` agg trên `text` field.

## 3. Load Data vào ES

Chạy Python data generator (file `03-generate-sample-data.py`):

```bash
# Cài dependencies (chỉ cần Python standard library)
python3 03-generate-sample-data.py

# Output: sales_olap_bulk.json (~20,000 documents)
```

Load vào ES:

```bash
curl -X POST "http://localhost:9200/sales_olap/_bulk" \
  -H 'Content-Type: application/json' \
  --data-binary @sales_olap_bulk.json
```

Hoặc nếu generator có option auto-load:

```bash
python3 03-generate-sample-data.py --load http://localhost:9200
```

## 4. Kiểm tra Data

```bash
# Đếm số documents
curl "http://localhost:9200/sales_olap/_count"

# Xem 5 documents đầu
curl "http://localhost:9200/sales_olap/_search?size=5"

# Test aggregation: tổng sales theo category
curl -X POST "http://localhost:9200/sales_olap/_search" \
  -H 'Content-Type: application/json' \
  -d '{
    "size": 0,
    "aggs": {
      "by_category": {
        "terms": { "field": "category_name", "size": 20 },
        "aggs": {
          "total_revenue": { "sum": { "field": "total_amount" } },
          "total_qty": { "sum": { "field": "quantity" } }
        }
      }
    }
  }'
```

## 5. Xóa và Tạo lại (nếu cần)

```bash
# Xóa index
curl -X DELETE "http://localhost:9200/sales_olap"

# Tạo lại từ bước 2
```
