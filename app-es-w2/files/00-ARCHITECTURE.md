# OLAP Sales Analytics – Snowflake Schema on Elasticsearch + Mendix Integration

## 1. Tổng quan kiến trúc

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MENDIX APPLICATION                           │
│                                                                     │
│  ┌──────────┐   ┌──────────────┐   ┌──────────────────────────┐   │
│  │  UI Page │──▶│  Nanoflow    │──▶│     Microflow            │   │
│  │ (Chart + │   │ (client-side │   │  ACT_OLAP_Query          │   │
│  │  Filter) │   │  trigger)    │   │  ACT_OLAP_Drilldown      │   │
│  └──────────┘   └──────────────┘   └────────────┬─────────────┘   │
│                                                  │                  │
│                                    ┌─────────────▼─────────────┐   │
│                                    │  Java Action               │   │
│                                    │  ES_ExecuteQuery           │   │
│                                    │  ES_BulkIndex              │   │
│                                    └─────────────┬─────────────┘   │
│                                                  │ HTTP             │
└──────────────────────────────────────────────────┼─────────────────┘
                                                   │ REST
                                    ┌──────────────▼──────────────┐
                                    │      ELASTICSEARCH 8.x       │
                                    │                              │
                                    │  Index: sales_fact           │
                                    │  (Denormalized Snowflake)    │
                                    │                              │
                                    │  Index: dim_product          │
                                    │  Index: dim_customer         │
                                    │  Index: dim_date             │
                                    │  Index: dim_geography        │
                                    └──────────────────────────────┘
```

## 2. Snowflake Schema Design

### Fact Table: `sales_fact`
```
fact_sales_id (keyword)
├── order_date (date)
├── quantity (integer)
├── unit_price (double)
├── discount_pct (double)
├── net_amount (double)           ← quantity × unit_price × (1 - discount)
├── cost_amount (double)
├── gross_profit (double)         ← net_amount - cost_amount
│
├── [DIM] product_id → dim_product
│       ├── product_name
│       ├── product_code
│       ├── category_name         ← JOIN từ dim_category
│       ├── category_id
│       └── base_price
│
├── [DIM] variant_id → dim_product_variant
│       ├── sku
│       ├── color
│       └── size
│
├── [DIM] customer_id → dim_customer
│       ├── customer_name
│       ├── customer_segment      (Retail / Wholesale / VIP)
│       ├── city
│       ├── region_name           ← JOIN từ dim_region
│       └── country
│
└── [DIM] date_id → dim_date
        ├── year
        ├── quarter
        ├── month
        ├── week
        └── day_of_week
```

### Lý do chọn Denormalized Flat Document trong ES
Elasticsearch hoạt động tốt nhất với **flat, denormalized documents**. Thay vì JOIN như RDBMS, ta **embed tất cả dimension attributes vào fact document**. Đây là pattern chuẩn cho OLAP trên Elasticsearch.

## 3. Tech Stack & Approach

| Component | Technology | Lý do chọn |
|---|---|---|
| Search/OLAP store | Elasticsearch 8.x | Aggregation DSL mạnh mẽ, near-realtime |
| Application layer | Mendix 10.24.9 | Existing platform |
| ES Integration | Java Action (elasticsearch-java 8.x) | Type-safe, performance tốt hơn plain HTTP |
| Fallback Option | Call REST API (Mendix built-in) | Không cần compile Java |
| Data Seeding | Python script + JSON bulk API | Nhanh, dễ tùy chỉnh |
| UI | Mendix Page + AnyChart widget | Chart built-in marketplace |

## 4. Các Multi-Dimension Analysis được hỗ trợ

| Analysis Type | ES Aggregation | Mendix UI |
|---|---|---|
| Doanh thu theo Category × Tháng | Terms + Date Histogram | Bar/Line Chart |
| Top N sản phẩm theo Gross Profit | Terms + Metric | Bar Chart |
| Heatmap Region × Quarter | Terms × Terms | Table/Heatmap |
| Drill-down Category → Product | Terms (nested) | Tree/Expand |
| Moving Average Revenue | Date Histogram + Moving Avg | Line Chart |
| Distribution giá theo Segment | Histogram + Terms | Box Plot |

## 5. Kế hoạch triển khai (Roadmap)

```
Phase 1: Elasticsearch Setup          (File: 01-es-setup/)
  ├── Index Mappings (4 indexes)
  └── Index Template

Phase 2: Data Seeding                  (File: 02-data-seeding/)
  ├── generate_snowflake_data.py
  ├── bulk_data_sales_fact.json
  └── README-seeding.md

Phase 3: Mendix Domain Model           (File: 03-mendix/)
  ├── Entities cho Request/Response
  └── Import Mapping config

Phase 4: Java Actions                  (File: 04-java-actions/)
  ├── ES_ExecuteAggQuery.java
  └── ES_ParseAggResponse.java

Phase 5: Microflows                    (File: 05-microflows/)
  ├── ACT_OLAP_RevenueByCategory.md
  ├── ACT_OLAP_TopProducts.md
  └── ACT_OLAP_DrillDown.md

Phase 6: Nanoflow + UI                 (File: 06-ui/)
  ├── Page layout guide
  └── AnyChart config JSON
```
