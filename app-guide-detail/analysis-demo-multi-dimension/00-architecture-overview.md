# 00 - Kiến trúc tổng quan

## 1. Kiến trúc hệ thống

```
┌──────────────────────────────────────────────────────────────────┐
│                        MENDIX STUDIO PRO v10                     │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                       UI Layer                              │  │
│  │  ┌───────────────┐  ┌──────────────┐  ┌─────────────────┐  │  │
│  │  │ Data Grid /   │  │ Charts       │  │ Filter Bar      │  │  │
│  │  │ Pivot Table   │  │ (Bar/Pie/    │  │ - Time Range    │  │  │
│  │  │               │  │  Line/Area)  │  │ - Category      │  │  │
│  │  └───────┬───────┘  └──────┬───────┘  │ - Customer Seg  │  │  │
│  │          │                 │          │ - Country       │  │  │
│  │          └─────────┬───────┘          │ - Drill Level   │  │  │
│  │                    │                  └────────┬────────┘  │  │
│  │                    ▼                           │            │  │
│  │  ┌─────────────────────────────────────────────┐           │  │
│  │  │   Nanoflow: NF_GetSalesAnalysis             │◄──────────┘  │
│  │  │   (Triggered by UI filter change)           │              │
│  │  └──────────────────┬──────────────────────────┘              │
│  │                     │ Call Microflow                          │
│  │                     ▼                                         │
│  │  ┌──────────────────────────────────────────────────────────┐│
│  │  │   Microflow: OLAP_GetSalesData(OlapFilter)              ││
│  │  │                                                          ││
│  │  │   ┌──────────┐  ┌──────────────┐  ┌──────────────────┐  ││
│  │  │   │ Step 1:  │  │ Step 2:      │  │ Step 3:          │  ││
│  │  │   │ Build ES │→ │ Call REST    │→ │ Import Mapping   │  ││
│  │  │   │ Query    │  │ POST to ES   │  │ JSON → NPE List  │  ││
│  │  │   └──────────┘  └──────────────┘  └──────────────────┘  ││
│  │  │         ↑                                    │           ││
│  │  │  Java Action:                        ┌───────▼────────┐  ││
│  │  │  JA_BuildEsAggregationQuery          │ Step 4:        │  ││
│  │  │  (Build query JSON from filter)      │ Return to UI   │  ││
│  │  │                                     └────────────────┘  ││
│  │  └──────────────────────────────────────────────────────────┘│
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────┐                               │
│  │ Domain Model: SalesOLAP       │                               │
│  │ (Non-Persistent Entities)     │                               │
│  │ - OlapFilter                  │                               │
│  │ - SalesAggregateResult        │                               │
│  │ - EsAggBucket                 │                               │
│  │ - EsResponseWrapper           │                               │
│  └───────────────────────────────┘                               │
└──────────────────────────┬───────────────────────────────────────┘
                           │ HTTP POST
                           │ Content-Type: application/json
                           ▼
              ┌─────────────────────────────┐
              │     Elasticsearch 7.10.2    │
              │     Index: sales_olap       │
              │                             │
              │  Flattened Snowflake Docs:  │
              │  {                          │
              │    "year": 2024,            │
              │    "quarter": 1,            │
              │    "category_name": "...",  │
              │    "total_amount": 15000,   │
              │    ...                      │
              │  }                          │
              │                             │
              │  Aggregations Engine:       │
              │  - terms                    │
              │  - date_histogram           │
              │  - sum/avg/min/max          │
              │  - filters                  │
              │  - nested aggs (drill-down) │
              └─────────────────────────────┘
```

## 2. Data Flow - Chi tiết

### 2.1 Data Seeding Flow

```
Python Script (03-generate-sample-data.py)
    │
    │ Generate ~20,000 sales transactions
    │ (3 years × 8 categories × ~50 customers × random)
    │
    ▼
ES Bulk API: POST /_bulk
    │
    │ 20,000 documents vào index sales_olap
    │
    ▼
Elasticsearch Index: sales_olap
    (flattened snowflake documents)
```

### 2.2 Query Flow (OLAP Operations)

```
User tương tác UI (chọn filter / click drill-down)
    │
    ▼
Nanoflow: NF_GetSalesAnalysis
    - Thu thập filter values từ UI widgets
    - Tạo OlapFilter NPE
    - Gọi MF_OLAP_GetSalesData(OlapFilter)
    │
    ▼
Microflow: OLAP_GetSalesData
    │
    ├─ Step 1: JA_BuildEsAggregationQuery(OlapFilter)
    │    → Trả về queryJson (String)
    │    → Logic:
    │      - drillDimension = "product" → terms aggs on category/product/variant
    │      - drillDimension = "time" → date_histogram aggs on year/quarter/month
    │      - drillDimension = "customer" → terms aggs on segment/customer
    │      - drillDimension = "geography" → terms aggs on country/city/store
    │      - Kết hợp filter clauses từ OlapFilter
    │
    ├─ Step 2: Call REST
    │    → Method: POST
    │    → URL: http://localhost:9200/sales_olap/_search
    │    → Body: queryJson
    │    → Response: jsonString
    │
    ├─ Step 3: Import Mapping
    │    → JSON structure: aggregations.*.buckets[]
    │    → Map → List<EsAggBucket>
    │
    └─ Step 4: Transform
         → Loop qua EsAggBucket list
         → Tạo List<SalesAggregateResult>
         → Return cho UI
```

### 2.3 Drill-down Flow (Ví dụ: Product)

```
Level 0 (Summary):
  Query: aggs by category_name
  Result: [Electronics: 50B, Clothing: 30B, Food: 20B, ...]

Level 1 (Click "Electronics"):
  Query: filter category="Electronics" + aggs by product_name
  Result: [iPhone 15: 15B, Samsung S24: 12B, MacBook: 10B, ...]

Level 2 (Click "iPhone 15"):
  Query: filter product="iPhone 15" + aggs by variant_sku
  Result: [IP15-128-BLK: 5B, IP15-256-WHT: 4B, IP15-512-BLU: 3B, ...]
```

### 2.4 Roll-up Flow (Ngược lại Drill-down)

```
Level 2 → Level 1: Xóa variant filter, aggs by product_name
Level 1 → Level 0: Xóa product filter, aggs by category_name
```

## 3. Snowflake Schema (Conceptual) → ES Document (Physical)

```
CONCEPTUAL (Snowflake)           PHYSICAL (ES Document)
─────────────────────            ──────────────────────
DimYear                          "year": 2024,
  └─ DimQuarter                  "quarter": 1,
       └─ DimMonth               "month": 3,
            └─ DimDate           "date": "2024-03-15",

DimCustomerSegment               "customer_segment": "B2B",
  └─ DimCustomer                 "customer_name": "ABC Corp",

DimCountry                       "country": "Vietnam",
  └─ DimCity                     "city": "Ho Chi Minh",
       └─ DimStore               "store_name": "HCM Store #1",

DimCategory                      "category_name": "Electronics",
  └─ DimProduct                  "product_name": "iPhone 15 Pro",
       └─ DimProductVariant      "variant_sku": "IP15P-256-BLK",

FactSales                        "quantity": 5,
                                 "unit_price": 29990000,
                                 "discount_amount": 1499500,
                                 "total_amount": 148450500,
                                 "order_number": "ORD-2024-00001"
```

## 4. Component Mapping

| Component | Technology | Mô tả |
|-----------|-----------|--------|
| Data Storage | Elasticsearch 7.10.2 | Index `sales_olap`, flattened documents |
| Data Generator | Python 3 | Sinh 20,000+ transactions |
| Query Builder | Mendix Java Action | Build ES Query DSL từ filter params |
| HTTP Client | Mendix Call REST | POST query đến ES |
| Data Parser | Mendix Import Mapping | JSON response → NPE list |
| Business Logic | Mendix Microflow | Orchestrate query + parse + transform |
| UI Trigger | Mendix Nanoflow | Kết nối UI widget với microflow |
| UI Display | Mendix Data Grid / Charts | Hiển thị aggregate results |
