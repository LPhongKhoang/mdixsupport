# OLAP Multi-Dimension Analysis với Snowflake Schema trên Elasticsearch + Mendix

## Tổng quan

Hệ thống OLAP phân tích doanh số bán hàng sử dụng **Snowflake Schema** (conceptual) lưu trữ trên **Elasticsearch** (flattened documents), tích hợp với **Mendix Studio Pro v10** thông qua REST Call + Import Mapping + Microflow.

## Kiến trúc

```
User → Mendix UI (Data Grid / Charts)
         ↓
    Nanoflow / Microflow (build filter → call ES)
         ↓
    Microflow: OLAP_GetSalesData
      → Build ES Query JSON
      → Call REST: POST /sales_olap/_search
      → Import Mapping: JSON → List<NPE>
      → Return to UI
         ↓
    Elasticsearch 7.10.2 (Docker)
      Index: sales_olap (flattened snowflake documents)
```

## 4 Chiều phân tích (Dimensions)

| Chiều | Hierarchy (Drill-down path) |
|-------|-----------------------------|
| **Time** | Year → Quarter → Month → Date |
| **Product** | Category → Product → Variant |
| **Customer** | Segment → Customer |
| **Geography** | Country → City → Store |

## OLAP Operations

- **Slice**: Lọc theo 1 chiều (VD: chỉ xem category "Electronics")
- **Dice**: Lọc multi-chiều (VD: Electronics + 2024-Q1 + Vietnam)
- **Drill-down**: Xem chi tiết hơn (Category → Product → Variant)
- **Roll-up**: Tổng hợp lên mức cao hơn (Variant → Product → Category)

## Danh sách file hướng dẫn

| # | File | Nội dung |
|---|------|----------|
| 1 | [00-architecture-overview.md](00-architecture-overview.md) | Kiến trúc chi tiết toàn hệ thống |
| 2 | [01-snowflake-schema-design.md](01-snowflake-schema-design.md) | Snowflake schema + DDL + mapping |
| 3 | [02-elasticsearch-setup.md](02-elasticsearch-setup.md) | ES index mapping + cài đặt |
| 4 | [03-generate-sample-data.py](03-generate-sample-data.py) | Script Python sinh data mẫu |
| 5 | [04-es-query-dsl-guide.md](04-es-query-dsl-guide.md) | ES Query DSL cho từng OLAP operation |
| 6 | [05-mendix-domain-model-guide.md](05-mendix-domain-model-guide.md) | Tạo Domain Model trong Mendix |
| 7 | [06-mendix-rest-import-mapping.md](06-mendix-rest-import-mapping.md) | Cấu hình REST Call + Import Mapping |
| 8 | [07-mendix-microflow-guide.md](07-mendix-microflow-guide.md) | Tạo tất cả Microflow cần thiết |
| 9 | [08-mendix-ui-integration.md](08-mendix-ui-integration.md) | Tích hợp UI widget + Nanoflow |
| 10 | [JA_BuildEsAggregationQuery.java](JA_BuildEsAggregationQuery.java) | Java Action build ES query |
| 11 | [sample-es-queries.json](sample-es-queries.json) | Sample ES queries để test nhanh |

## Thứ tự thực hiện

1. **Setup Elasticsearch** → tạo index, load data (File 02, 03)
2. **Test ES queries** → verify data (File 04, 11)
3. **Mendix Domain Model** → tạo entities (File 05)
4. **REST + Import Mapping** → cấu hình kết nối ES (File 06)
5. **Java Action** → build query logic (File JA_BuildEsAggregationQuery.java)
6. **Microflows** → tạo business logic (File 07)
7. **UI Integration** → trang + widget + nanoflow (File 08)

## Prerequisites

- Mendix Studio Pro v10.x
- Docker + Docker Compose
- Python 3.8+ (để chạy data generator)
- Elasticsearch OSS 7.10.2 (qua Docker, port 9200)
