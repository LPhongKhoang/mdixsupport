# 📊 OLAP Sales Analytics – Complete Implementation Guide
# Snowflake Schema on Elasticsearch + Mendix Studio Pro 10

---

## Mục lục

1. [Kiến trúc tổng quan](#architecture)
2. [Cấu trúc thư mục](#files)
3. [Quick Start (15 phút)](#quickstart)
4. [Phase chi tiết](#phases)
5. [Troubleshooting](#troubleshooting)

---

## 1. Kiến trúc tổng quan {#architecture}

```
USER BROWSER
    │
    ▼
MENDIX PAGE (OlapDashboard)
    │  Filter Form (Year, Category, Region, Segment)
    │  AnyChart Widgets (Bar, Line, Pie, Table)
    │  KPI Cards
    │
    ▼ Nanoflow trigger
MENDIX MICROFLOW
    │  ACT_OLAP_LoadRevenueByCategoryChart
    │  ACT_OLAP_DrillDown
    │  ACT_OLAP_ApplyFilter
    │
    ▼ Java Action
ES_BuildOlapQuery   → dynamic Query DSL JSON
ES_ExecuteOlapQuery → HTTP POST to Elasticsearch
ES_ParseAggResponse → JSON → List<OlapBucket>
ES_GetAggName       → QueryType → aggKey mapping
    │
    ▼ HTTP REST
ELASTICSEARCH 8.x (Index: sales_fact)
    ├── 5000+ denormalized sales documents
    ├── Embedded: product, variant, category, customer, region, date
    └── Aggregation queries: Terms, Date Histogram, Moving Avg
```

---

## 2. Cấu trúc thư mục {#files}

```
analysis-demo-multi-dimension/
│
├── 00-ARCHITECTURE.md               ← Tổng quan kiến trúc
│
├── elasticsearch/
│   ├── 01-index-mappings.md         ← Curl commands để tạo 4 indexes
│   └── 02-query-dsl-patterns.md     ← 7 OLAP query patterns với sample responses
│
├── data-seeding/
│   ├── generate_snowflake_data.py   ← Python script tạo mock data
│   └── README-seeding.md            ← Hướng dẫn seeding từng bước
│
├── java-actions/
│   ├── ES_ExecuteOlapQuery.java     ← HTTP POST to ES (no external JAR)
│   ├── ES_BuildOlapQuery.java       ← Dynamic Query DSL builder
│   ├── ES_ParseAggResponse.java     ← JSON → List<OlapBucket> parser
│   └── ES_GetAggName.java           ← QueryType → aggKey mapper
│
└── mendix/
    ├── 03-mendix-step-by-step.md    ← Domain model + Microflow guide (main)
    ├── 04-callrest-alternative.md   ← Call REST API alternative (no Java)
    └── 05-anychart-config.md        ← AnyChart widget config JSON
```

---

## 3. Quick Start {#quickstart}

### Step 1: Elasticsearch Setup (5 phút)
```bash
# Tạo indexes
# Copy-paste từ elasticsearch/01-index-mappings.md vào terminal

# Verify
curl "localhost:9200/_cat/indices?v"
```

### Step 2: Seed Data (3 phút)
```bash
pip install requests
cd data-seeding/
python generate_snowflake_data.py --count 3000 --es-host localhost:9200
```

### Step 3: Test Query (1 phút)
```bash
curl -X POST "localhost:9200/sales_fact/_search" \
     -H "Content-Type: application/json" \
     -d '{"size":0,"aggs":{"cats":{"terms":{"field":"category_name"},"aggs":{"rev":{"sum":{"field":"net_amount"}}}}}}'
```

### Step 4: Mendix Setup (~1 giờ)
Theo file `mendix/03-mendix-step-by-step.md`:
1. Tạo 3 entities: OlapFilterParams, OlapBucket, OlapChartDataPoint
2. Tạo 4 Java Actions (copy code từ java-actions/)
3. Tạo microflows: SUB_ES_ExecuteAndParse, ACT_OLAP_LoadRevenueByCategoryChart
4. Tạo page OlapDashboard với AnyChart widget
5. Test!

---

## 4. Phases {#phases}

| Phase | File | Thời gian ước tính |
|-------|------|--------------------|
| ES Index Setup | `elasticsearch/01-index-mappings.md` | 10 phút |
| Data Seeding | `data-seeding/` | 15 phút |
| Domain Model | `mendix/03-mendix-step-by-step.md` §1 | 20 phút |
| Java Actions | `mendix/03-mendix-step-by-step.md` §2 | 30 phút |
| Microflows | `mendix/03-mendix-step-by-step.md` §3 | 45 phút |
| Pages & UI | `mendix/03-mendix-step-by-step.md` §5 | 45 phút |
| **Total** | | **~2.5 giờ** |

---

## 5. Troubleshooting {#troubleshooting}

### Java Action không compile
```
Error: cannot find symbol ES_ExecuteOlapQuery
```
→ Kiểm tra package name phải match: `package productcatalogmodule.actions;`
→ File phải đặt đúng trong `javasource/productcatalogmodule/actions/`
→ F4 (Mendix Deploy) hoặc right-click module → "Deploy"

### ES query trả về empty buckets
→ Check index name đúng chưa: `curl localhost:9200/sales_fact/_count`
→ Check filter quá chặt: thử remove tất cả filter
→ Log `$QueryJson` trước khi send để debug

### Jackson not found
```
ClassNotFoundException: com.fasterxml.jackson.databind.ObjectMapper
```
→ Copy file jackson-databind-2.15.x.jar vào `[ProjectFolder]/userlib/`
→ Restart Mendix Studio Pro
→ Alternatively: dùng Java built-in `javax.json` hoặc parse manually

### Call REST alternative không map đúng
→ Ensure JSON Structure được tạo từ REAL ES response, không phải template
→ Run query thủ công → copy response → paste vào JSON Structure → Refresh
→ Đảm bảo Import Mapping entity match đúng

### AnyChart không hiện data
→ Check microflow source của chart widget trả về đúng list
→ Check X và Y mapping attribute names
→ Test microflow riêng: right-click microflow → Run

---

## Recommended Next Steps (sau khi demo chạy)

1. **ETL Pipeline**: Mendix Scheduled Event → đọc từ PostgreSQL product catalog → index vào ES
2. **Real-time**: Thêm ES indexing vào microflow Save/Update Product/Order
3. **React Dashboard**: Thay thế AnyChart bằng React widget với Recharts/ECharts
4. **Redis Cache**: Cache ES response 5 phút để giảm load
5. **Row-level Security**: Filter theo user role (region managers chỉ thấy region của họ)
6. **Export**: Export chart data ra Excel (dùng Mendix Excel Exporter module)

---

*Generated for Mendix Studio Pro 10.24.9 + Elasticsearch 8.x*
*Last updated: 2024*
