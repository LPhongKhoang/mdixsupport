# Data Seeding Guide – Snowflake Schema on Elasticsearch

## Prerequisites

```bash
# Python 3.8+
python --version

# Cài requests library
pip install requests

# Elasticsearch 8.x đang chạy
curl http://localhost:9200
# Expected: {"name":"...","cluster_name":"...","version":{"number":"8.x.x",...}}
```

---

## Bước 1: Tạo Index Mappings

```bash
# Clone vào một thư mục bất kỳ
# Chạy từng lệnh curl trong file 01-index-mappings.md

# Hoặc dùng script nhanh:
curl -X PUT "localhost:9200/sales_fact"    -H "Content-Type: application/json" -d @mappings/sales_fact.json
curl -X PUT "localhost:9200/dim_product"   -H "Content-Type: application/json" -d @mappings/dim_product.json
curl -X PUT "localhost:9200/dim_customer"  -H "Content-Type: application/json" -d @mappings/dim_customer.json
curl -X PUT "localhost:9200/dim_date"      -H "Content-Type: application/json" -d @mappings/dim_date.json
```

---

## Bước 2: Generate & Seed Data

```bash
cd data-seeding/

# Option A: Generate + Index trực tiếp vào ES (cần requests)
python generate_snowflake_data.py \
    --es-host localhost:9200 \
    --count 5000 \
    --customers 100

# Option B: Chỉ tạo file, index thủ công sau
python generate_snowflake_data.py \
    --count 5000 \
    --no-index \
    --output-dir ./bulk-data

# Index thủ công từ file NDJSON:
curl -X POST "localhost:9200/_bulk" \
     -H "Content-Type: application/x-ndjson" \
     --data-binary @bulk-data/bulk_sales_fact.ndjson

curl -X POST "localhost:9200/_bulk" \
     -H "Content-Type: application/x-ndjson" \
     --data-binary @bulk-data/bulk_dim_product.ndjson

curl -X POST "localhost:9200/_bulk" \
     -H "Content-Type: application/x-ndjson" \
     --data-binary @bulk-data/bulk_dim_customer.ndjson
```

---

## Bước 3: Xác nhận Data

```bash
# Đếm số documents
curl "localhost:9200/sales_fact/_count"
# Expected: {"count": 5000, ...}

curl "localhost:9200/dim_product/_count"
# Expected: {"count": ~20, ...}

# Quick test aggregation
curl -X POST "localhost:9200/sales_fact/_search" \
     -H "Content-Type: application/json" \
     -d '{"size":0,"aggs":{"cats":{"terms":{"field":"category_name","size":10}}}}'
```

---

## Data Statistics (sau khi seed 5000 records)

```
Generated Sample Output:
  Products  : 22 (across 6 categories)
  Variants  : ~66 variants
  Customers : 100 (across 5 regions)
  Date range: 2023-01-01 → 2024-12-31
  Facts     : 5000 sales records

Approximate Revenue Distribution:
  Electronics : ~30% (highest AOV)
  Clothing    : ~25%
  Sports      : ~15%
  Home&Garden : ~12%
  Beauty      : ~10%
  Books       : ~8%

Customer Segments:
  Retail      : ~35%
  Online      : ~25%
  Wholesale   : ~20%
  VIP         : ~12%
  Corporate   : ~8%
```

---

## Nếu dùng Elasticsearch với Authentication (Elastic Cloud / Security enabled)

```bash
# Thêm -u flag vào curl
curl -u elastic:yourpassword "localhost:9200/sales_fact/_count"

# Hoặc dùng API Key header
curl -H "Authorization: ApiKey your_api_key_here" "localhost:9200/sales_fact/_count"

# Cho generate script:
python generate_snowflake_data.py \
    --es-host localhost:9200 \
    --count 5000 \
    --es-username elastic \
    --es-password yourpassword
```

⚠️ **Lưu ý**: Thêm `--es-username` và `--es-password` vào `argparse` trong script nếu cần.
Script hiện tại trong `generate_snowflake_data.py` chưa có flag này — thêm vào `main()`:
```python
parser.add_argument("--es-username", default="", help="ES username")
parser.add_argument("--es-password", default="", help="ES password")
```
Và pass vào `bulk_index()`.

---

## Reset / Re-seed Data

```bash
# Xóa toàn bộ index và tạo lại
curl -X DELETE "localhost:9200/sales_fact,dim_product,dim_customer,dim_date"

# Tạo lại index (chạy mappings)
# Rồi chạy lại generate script
python generate_snowflake_data.py --count 5000
```
