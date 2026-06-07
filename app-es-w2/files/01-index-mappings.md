# Elasticsearch Index Mappings – Snowflake Schema

## Cách dùng file này
Chạy từng lệnh curl bên dưới theo thứ tự để tạo index trên Elasticsearch.
Thay `localhost:9200` bằng host/port thực tế của bạn.

---

## Index 1: `sales_fact` (Core – Denormalized Flat Document)

```bash
curl -X PUT "localhost:9200/sales_fact" -H "Content-Type: application/json" -d '
{
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 1,
    "refresh_interval": "5s"
  },
  "mappings": {
    "properties": {

      "fact_sales_id":    { "type": "keyword" },
      "order_date":       { "type": "date", "format": "yyyy-MM-dd" },
      "order_month":      { "type": "keyword" },
      "order_quarter":    { "type": "keyword" },
      "order_year":       { "type": "integer" },
      "order_week":       { "type": "integer" },
      "day_of_week":      { "type": "keyword" },

      "quantity":         { "type": "integer" },
      "unit_price":       { "type": "double" },
      "discount_pct":     { "type": "double" },
      "net_amount":       { "type": "double" },
      "cost_amount":      { "type": "double" },
      "gross_profit":     { "type": "double" },
      "gross_margin_pct": { "type": "double" },

      "product_id":       { "type": "keyword" },
      "product_name":     { "type": "keyword" },
      "product_code":     { "type": "keyword" },
      "product_base_price": { "type": "double" },

      "variant_id":       { "type": "keyword" },
      "sku":              { "type": "keyword" },
      "color":            { "type": "keyword" },
      "size":             { "type": "keyword" },

      "category_id":      { "type": "keyword" },
      "category_name":    { "type": "keyword" },

      "customer_id":      { "type": "keyword" },
      "customer_name":    { "type": "keyword" },
      "customer_segment": { "type": "keyword" },

      "city":             { "type": "keyword" },
      "region_name":      { "type": "keyword" },
      "country":          { "type": "keyword" }
    }
  }
}
'
```

---

## Index 2: `dim_product` (Product Dimension)

```bash
curl -X PUT "localhost:9200/dim_product" -H "Content-Type: application/json" -d '
{
  "mappings": {
    "properties": {
      "product_id":   { "type": "keyword" },
      "product_name": { "type": "text", "fields": { "keyword": { "type": "keyword" } } },
      "product_code": { "type": "keyword" },
      "base_price":   { "type": "double" },
      "is_active":    { "type": "boolean" },
      "category_id":  { "type": "keyword" },
      "category_name":{ "type": "keyword" },
      "description":  { "type": "text" },
      "variants": {
        "type": "nested",
        "properties": {
          "variant_id": { "type": "keyword" },
          "sku":        { "type": "keyword" },
          "color":      { "type": "keyword" },
          "size":       { "type": "keyword" },
          "price":      { "type": "double" }
        }
      }
    }
  }
}
'
```

---

## Index 3: `dim_customer`

```bash
curl -X PUT "localhost:9200/dim_customer" -H "Content-Type: application/json" -d '
{
  "mappings": {
    "properties": {
      "customer_id":      { "type": "keyword" },
      "customer_name":    { "type": "keyword" },
      "customer_segment": { "type": "keyword" },
      "email":            { "type": "keyword" },
      "phone":            { "type": "keyword" },
      "city":             { "type": "keyword" },
      "region_name":      { "type": "keyword" },
      "country":          { "type": "keyword" },
      "registration_date":{ "type": "date", "format": "yyyy-MM-dd" }
    }
  }
}
'
```

---

## Index 4: `dim_date`

```bash
curl -X PUT "localhost:9200/dim_date" -H "Content-Type: application/json" -d '
{
  "mappings": {
    "properties": {
      "date_id":      { "type": "keyword" },
      "full_date":    { "type": "date", "format": "yyyy-MM-dd" },
      "year":         { "type": "integer" },
      "quarter":      { "type": "keyword" },
      "month":        { "type": "integer" },
      "month_name":   { "type": "keyword" },
      "week":         { "type": "integer" },
      "day_of_month": { "type": "integer" },
      "day_of_week":  { "type": "keyword" },
      "is_weekend":   { "type": "boolean" }
    }
  }
}
'
```

---

## Kiểm tra index đã tạo

```bash
curl -X GET "localhost:9200/_cat/indices?v&index=sales_fact,dim_product,dim_customer,dim_date"
```

---

## Lưu ý quan trọng

- `sales_fact` là index chính cho mọi OLAP query.  
- Các `dim_*` index chủ yếu dùng để tra cứu lookup hoặc cho ETL future.  
- **Không dùng JOIN trong ES** → tất cả dimension attributes được denormalize vào `sales_fact`.
- `keyword` vs `text`: dùng `keyword` cho mọi field dùng trong aggregation (category_name, region_name, ...).
