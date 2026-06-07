# 01 - Snowflake Schema Design

## 1. Schema Diagram (Conceptual - Snowflake)

```
                        ┌──────────────┐
                        │  FactSales   │
                        │──────────────│
                        │ sale_id (PK) │
                        │ date_key(FK) │───────┐
                        │ cust_key(FK) │────┐  │
                        │ store_key(FK)│─┐  │  │
                        │ variant_key  │ │  │  │
                        │  (FK)        │ │  │  │
                        │ quantity     │ │  │  │
                        │ unit_price   │ │  │  │
                        │ discount_amt │ │  │  │
                        │ total_amount │ │  │  │
                        │ order_number │ │  │  │
                        └──────────────┘ │  │  │
                                         │  │  │
    ┌────────────────────────────────────┘  │  │
    │                                       │  │
    ▼                                       │  │
┌────────────┐                              │  │
│ DimStore   │                              │  │
│────────────│                              │  │
│ store_key  │                              │  │
│ store_name │                              │  │
│ address    │                              │  │
│ city_key   │──┐                           │  │
└────────────┘  │                           │  │
                ▼                           │  │
         ┌────────────┐                     │  │
         │ DimCity    │                     │  │
         │────────────│                     │  │
         │ city_key   │                     │  │
         │ city_name  │                     │  │
         │ country_key│──┐                  │  │
         └────────────┘  │                  │  │
                         ▼                  │  │
                  ┌──────────────┐          │  │
                  │ DimCountry   │          │  │
                  │──────────────│          │  │
                  │ country_key  │          │  │
                  │ country_name │          │  │
                  │ region       │          │  │
                  └──────────────┘          │  │
                                            │  │
    ┌───────────────────────────────────────┘  │
    │                                          │
    ▼                                          │
┌────────────────────┐                         │
│ DimCustomer        │                         │
│────────────────────│                         │
│ customer_key       │                         │
│ customer_name      │                         │
│ email              │                         │
│ phone              │                         │
│ segment_key (FK)   │──┐                      │
└────────────────────┘  │                      │
                        ▼                      │
                 ┌────────────────────┐        │
                 │ DimCustomerSegment │        │
                 │────────────────────│        │
                 │ segment_key        │        │
                 │ segment_name       │        │
                 └────────────────────┘        │
                                              │
    ┌─────────────────────────────────────────┘
    │
    ▼
┌──────────────────────┐
│ DimProductVariant    │
│──────────────────────│
│ variant_key          │
│ sku                  │
│ color                │
│ size                 │
│ price                │
│ product_key (FK)     │──┐
└──────────────────────┘  │
                          ▼
                   ┌──────────────┐
                   │ DimProduct   │
                   │──────────────│
                   │ product_key  │
                   │ name         │
                   │ code         │
                   │ base_price   │
                   │ category_key │──┐
                   │  (FK)        │  │
                   └──────────────┘  │
                                    ▼
                             ┌──────────────┐
                             │ DimCategory  │
                             │──────────────│
                             │ category_key │
                             │ name         │
                             │ description  │
                             └──────────────┘

(Dimension Time - riêng biệt)

┌──────────────┐
│ DimDate      │
│──────────────│
│ date_key     │
│ full_date    │
│ day_of_week  │
│ month_key(FK)│──┐
└──────────────┘  │
                  ▼
           ┌──────────────┐
           │ DimMonth     │
           │──────────────│
           │ month_key    │
           │ month_num    │
           │ month_name   │
           │ quarter_key  │──┐
           │  (FK)        │  │
           └──────────────┘  │
                             ▼
                      ┌──────────────┐
                      │ DimQuarter   │
                      │──────────────│
                      │ quarter_key  │
                      │ quarter_num  │
                      │ year_key(FK) │──┐
                      └──────────────┘  │
                                        ▼
                                 ┌──────────────┐
                                 │ DimYear      │
                                 │──────────────│
                                 │ year_key     │
                                 │ year         │
                                 └──────────────┘
```

## 2. DDL - Dimension Tables

### 2.1 DimTime (Snowflake: Year → Quarter → Month → Date)

```sql
CREATE TABLE dim_year (
    year_key     SERIAL PRIMARY KEY,
    year         INT4 NOT NULL
);

CREATE TABLE dim_quarter (
    quarter_key  SERIAL PRIMARY KEY,
    quarter_num  INT4 NOT NULL CHECK (quarter_num BETWEEN 1 AND 4),
    year_key     INT4 REFERENCES dim_year(year_key)
);

CREATE TABLE dim_month (
    month_key    SERIAL PRIMARY KEY,
    month_num    INT4 NOT NULL CHECK (month_num BETWEEN 1 AND 12),
    month_name   VARCHAR(20) NOT NULL,
    quarter_key  INT4 REFERENCES dim_quarter(quarter_key)
);

CREATE TABLE dim_date (
    date_key     SERIAL PRIMARY KEY,
    full_date    DATE NOT NULL,
    day_of_week  INT4 NOT NULL,  -- 1=Mon, 7=Sun
    month_key    INT4 REFERENCES dim_month(month_key)
);
```

### 2.2 DimCustomer (Snowflake: Segment → Customer)

```sql
CREATE TABLE dim_customer_segment (
    segment_key  SERIAL PRIMARY KEY,
    segment_name VARCHAR(50) NOT NULL  -- B2B, B2C, VIP, Retail
);

CREATE TABLE dim_customer (
    customer_key SERIAL PRIMARY KEY,
    customer_name VARCHAR(200) NOT NULL,
    email        VARCHAR(200),
    phone        VARCHAR(50),
    segment_key  INT4 REFERENCES dim_customer_segment(segment_key)
);
```

### 2.3 DimGeography (Snowflake: Country → City → Store)

```sql
CREATE TABLE dim_country (
    country_key  SERIAL PRIMARY KEY,
    country_name VARCHAR(100) NOT NULL,
    region       VARCHAR(100)  -- VD: Southeast Asia
);

CREATE TABLE dim_city (
    city_key     SERIAL PRIMARY KEY,
    city_name    VARCHAR(100) NOT NULL,
    country_key  INT4 REFERENCES dim_country(country_key)
);

CREATE TABLE dim_store (
    store_key    SERIAL PRIMARY KEY,
    store_name   VARCHAR(200) NOT NULL,
    address      VARCHAR(500),
    city_key     INT4 REFERENCES dim_city(city_key)
);
```

### 2.4 DimProduct (Từ DDL hiện có, mở rộng)

```sql
-- Giữ nguyên bảng category hiện có
-- ALTER TABLE chỉ thêm cột nếu cần

CREATE TABLE dim_category (
    category_key   SERIAL PRIMARY KEY,
    category_name  VARCHAR(200) NOT NULL,
    description    VARCHAR(500)
);

CREATE TABLE dim_product (
    product_key    SERIAL PRIMARY KEY,
    product_name   VARCHAR(200) NOT NULL,
    product_code   VARCHAR(50),
    base_price     NUMERIC(28, 8),
    category_key   INT4 REFERENCES dim_category(category_key)
);

CREATE TABLE dim_product_variant (
    variant_key    SERIAL PRIMARY KEY,
    sku            VARCHAR(100) NOT NULL,
    color          VARCHAR(20),
    size           VARCHAR(50),
    price          NUMERIC(28, 8),
    product_key    INT4 REFERENCES dim_product(product_key)
);
```

### 2.5 FactSales

```sql
CREATE TABLE fact_sales (
    sale_id         BIGSERIAL PRIMARY KEY,
    order_number    VARCHAR(50) NOT NULL,
    date_key        INT4 REFERENCES dim_date(date_key),
    customer_key    INT4 REFERENCES dim_customer(customer_key),
    store_key       INT4 REFERENCES dim_store(store_key),
    variant_key     INT4 REFERENCES dim_product_variant(variant_key),
    quantity        INT4 NOT NULL,
    unit_price      NUMERIC(28, 8) NOT NULL,
    discount_amount NUMERIC(28, 8) DEFAULT 0,
    total_amount    NUMERIC(28, 8) NOT NULL,
    -- Denormalized fields for ES (để query nhanh)
    sale_date       DATE NOT NULL,
    year            INT4 NOT NULL,
    quarter         INT4 NOT NULL,
    month           INT4 NOT NULL,
    month_name      VARCHAR(20),
    day_of_week     INT4,
    customer_name   VARCHAR(200),
    customer_segment VARCHAR(50),
    country_name    VARCHAR(100),
    city_name       VARCHAR(100),
    store_name      VARCHAR(200),
    category_name   VARCHAR(200),
    product_name    VARCHAR(200),
    variant_sku     VARCHAR(100),
    variant_color   VARCHAR(20),
    variant_size    VARCHAR(50)
);
```

## 3. Mapping: Snowflake → ES Document

Mỗi record trong `fact_sales` (đã denormalize) map 1:1 thành 1 document trong ES index `sales_olap`:

```
┌─────────────────────────────────────────────────────────────┐
│ ES Document Structure                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Time Dimension:                                            │
│    "sale_date"      : "2024-03-15"                          │
│    "year"           : 2024                                  │
│    "quarter"        : 1                                     │
│    "month"          : 3                                     │
│    "month_name"     : "March"                               │
│    "day_of_week"    : 5                                     │
│                                                             │
│  Customer Dimension:                                        │
│    "customer_name"  : "ABC Corporation"                     │
│    "customer_segment": "B2B"                                │
│                                                             │
│  Geography Dimension:                                       │
│    "country_name"   : "Vietnam"                             │
│    "country_region" : "Southeast Asia"                      │
│    "city_name"      : "Ho Chi Minh"                         │
│    "store_name"     : "HCM Downtown Store"                  │
│                                                             │
│  Product Dimension:                                         │
│    "category_name"  : "Electronics"                         │
│    "product_name"   : "iPhone 15 Pro"                       │
│    "product_code"   : "ELEC-001"                            │
│    "variant_sku"    : "IP15P-256-BLK"                       │
│    "variant_color"  : "Black"                               │
│    "variant_size"   : "256GB"                               │
│                                                             │
│  Measures (Fact):                                           │
│    "order_number"   : "ORD-2024-00001"                      │
│    "quantity"       : 5                                     │
│    "unit_price"     : 29990000.0                            │
│    "discount_amount": 1499500.0                             │
│    "total_amount"   : 148450500.0                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 4. Drill-down Paths

```
TIME:
  Level 0: terms aggs on "year"                    → [2022, 2023, 2024]
  Level 1: terms aggs on "quarter" (filter year)   → [Q1, Q2, Q3, Q4]
  Level 2: terms aggs on "month" (filter quarter)  → [Jan, Feb, Mar, ...]
  Level 3: date_histogram on "sale_date" (filter month)

PRODUCT:
  Level 0: terms aggs on "category_name.keyword"              → [Electronics, Clothing, ...]
  Level 1: terms aggs on "product_name.keyword" (filter cat)  → [iPhone 15, Samsung, ...]
  Level 2: terms aggs on "variant_sku.keyword" (filter prod)  → [IP15-128, IP15-256, ...]

CUSTOMER:
  Level 0: terms aggs on "customer_segment.keyword"           → [B2B, B2C, VIP, Retail]
  Level 1: terms aggs on "customer_name.keyword" (filter seg) → [ABC Corp, XYZ Ltd, ...]

GEOGRAPHY:
  Level 0: terms aggs on "country_name.keyword"              → [Vietnam, Thailand, ...]
  Level 1: terms aggs on "city_name.keyword" (filter country)→ [HCM, Hanoi, ...]
  Level 2: terms aggs on "store_name.keyword" (filter city)  → [Store #1, Store #2, ...]
```
