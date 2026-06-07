# Mendix Studio Pro – Step-by-step Implementation Guide
# OLAP Sales Analytics with Elasticsearch

## ════════════════════════════════════════════
## PHASE 1: Domain Model Setup
## ════════════════════════════════════════════

### 1.1 Tạo Entities trong Domain Model

Mở **ProductCatalogModule** → **Domain Model** → Thêm các entity sau:

---

#### Entity: `OlapFilterParams`
> Dùng để giữ trạng thái filter từ UI

| Attribute    | Type    | Length | Notes                          |
|-------------|---------|--------|--------------------------------|
| FilterYear   | Integer | -      | Ví dụ: 2024 (0 = tất cả)      |
| FilterCategory| String | 200    | "Electronics" hoặc "" = tất cả|
| FilterRegion  | String | 200    | "South" hoặc ""                |
| FilterSegment | String | 200    | "VIP" hoặc ""                  |
| DateFrom      | String | 20     | "yyyy-MM-dd"                   |
| DateTo        | String | 20     | "yyyy-MM-dd"                   |
| QueryType     | String | 100    | Enum string (xem bên dưới)     |
| TopN          | Integer| -      | Mặc định 10                    |

**QueryType values:** `REVENUE_BY_CATEGORY` | `TOP_PRODUCTS` | `REGION_HEATMAP` | `MONTHLY_TREND` | `DRILL_DOWN` | `SEGMENT_DIST`

---

#### Entity: `OlapBucket`
> Mỗi object = một bucket từ ES aggregation response

| Attribute   | Type    | Length | Notes                          |
|------------|---------|--------|--------------------------------|
| Label       | String  | 500    | Tên bucket (category/product)  |
| DocCount    | Long    | -      | Số records trong bucket        |
| Revenue     | Decimal | 28,2   | Tổng doanh thu                 |
| Profit      | Decimal | 28,2   | Tổng lợi nhuận                 |
| AvgMargin   | Decimal | 28,2   | Avg margin %                   |
| Quantity    | Long    | -      | Tổng số lượng bán              |
| AvgOrder    | Decimal | 28,2   | Avg order value                |
| OrderCount  | Long    | -      | Số đơn hàng                    |
| ExtraJson   | String  | -      | Sub-agg JSON (unlimited)       |

**Set ExtraJson length**: Click attribute → tab "General" → Length = **Unlimited**

---

#### Entity: `OlapChartDataPoint`
> Dùng cho time-series chart (monthly trend)

| Attribute   | Type    | Notes                    |
|------------|---------|--------------------------|
| PeriodLabel | String  | "Jan-2024", "2024-Q1"   |
| Revenue     | Decimal | -                        |
| Profit      | Decimal | -                        |
| MovingAvg   | Decimal | -                        |
| OrderCount  | Long    | -                        |

---

#### Entity: `EsConfiguration`
> Lưu cấu hình kết nối ES (có thể dùng Constants thay thế)

| Attribute   | Type   | Default          |
|------------|--------|------------------|
| EsHost      | String | localhost:9200   |
| EsUsername  | String | (trống)          |
| EsPassword  | String | (trống)          |
| IndexName   | String | sales_fact       |

---

### 1.2 Associations

- `OlapFilterParams` 1 -- * `OlapBucket` (association: `OlapFilterParams_OlapBucket`)
- `OlapFilterParams` 1 -- * `OlapChartDataPoint` (association: `OlapFilterParams_ChartData`)

---

### 1.3 Constants (thay thế EsConfiguration entity)

Vào **App** → **Add > Constant**:

| Constant Name          | Type   | Default Value  |
|-----------------------|--------|----------------|
| `ES_Host`             | String | localhost:9200 |
| `ES_Username`         | String | (blank)        |
| `ES_Password`         | String | (blank)        |
| `ES_SalesFact_Index`  | String | sales_fact     |

---

## ════════════════════════════════════════════
## PHASE 2: Java Actions
## ════════════════════════════════════════════

### 2.1 Tạo Java Actions trong Mendix Studio Pro

1. Right-click module **ProductCatalogModule** → **Add other > Java action**
2. Tạo 2 Java actions:

#### Action A: `ES_ExecuteOlapQuery`

| Parameter   | Type   | Notes                     |
|------------|--------|---------------------------|
| QueryBody   | String | ES query JSON             |
| IndexName   | String | Index name                |
| EsHost      | String | host:port                 |
| EsUsername  | String | optional                  |
| EsPassword  | String | optional                  |
| **Return**  | String | ES JSON response          |

→ Sau khi tạo, Mendix tạo file `.java`. **Copy nội dung từ** `java-actions/ES_ExecuteOlapQuery.java` vào file đó.

#### Action B: `ES_BuildOlapQuery`

| Parameter      | Type    | Notes          |
|---------------|---------|----------------|
| QueryType      | String  | -              |
| FilterYear     | Integer | -              |
| FilterCategory | String  | -              |
| FilterRegion   | String  | -              |
| FilterSegment  | String  | -              |
| DateFrom       | String  | -              |
| DateTo         | String  | -              |
| TopN           | Integer | -              |
| **Return**     | String  | Query JSON     |

→ Copy nội dung từ `java-actions/ES_BuildOlapQuery.java`

#### Action C: `ES_ParseAggResponse`

| Parameter        | Type              | Notes               |
|-----------------|-------------------|---------------------|
| EsResponseJson   | String            | Raw ES JSON         |
| AggName          | String            | e.g. "by_category"  |
| **Return**       | List of OlapBucket| Mendix objects      |

→ Copy nội dung từ `java-actions/ES_ParseAggResponse.java`

### 2.2 Thêm Jackson JAR vào userlib

1. Download `jackson-databind-2.15.x.jar`, `jackson-core-2.15.x.jar`, `jackson-annotations-2.15.x.jar`
2. Copy vào `[ProjectFolder]/userlib/`
3. Mendix tự pick up khi Deploy

---

## ════════════════════════════════════════════
## PHASE 3: Microflows
## ════════════════════════════════════════════

### 3.1 SUB_ES_ExecuteAndParse (Reusable Helper)

**Purpose**: Build query → Execute → Parse → Return list of OlapBucket

```
INPUT:  OlapFilterParams $FilterParams
OUTPUT: List of OlapBucket

STEPS:
┌─────────────────────────────────────────────────────┐
│ 1. Java Action: ES_BuildOlapQuery                    │
│    - QueryType      = $FilterParams/QueryType        │
│    - FilterYear     = $FilterParams/FilterYear       │
│    - FilterCategory = $FilterParams/FilterCategory   │
│    - FilterRegion   = $FilterParams/FilterRegion     │
│    - FilterSegment  = $FilterParams/FilterSegment    │
│    - DateFrom       = $FilterParams/DateFrom         │
│    - DateTo         = $FilterParams/DateTo           │
│    - TopN           = $FilterParams/TopN             │
│    → $QueryJson (String)                             │
├─────────────────────────────────────────────────────┤
│ 2. Java Action: ES_ExecuteOlapQuery                  │
│    - QueryBody  = $QueryJson                         │
│    - IndexName  = [ES_SalesFact_Index]               │
│    - EsHost     = [ES_Host]                          │
│    - EsUsername = [ES_Username]                      │
│    - EsPassword = [ES_Password]                      │
│    → $EsResponse (String)                            │
├─────────────────────────────────────────────────────┤
│ 3. Decision: [empty($EsResponse)]                    │
│    True  → Log error, return empty list              │
│    False → continue                                  │
├─────────────────────────────────────────────────────┤
│ 4. Retrieve aggName based on QueryType               │
│    (Java Action or String variable)                  │
│    REVENUE_BY_CATEGORY → "by_category"               │
│    TOP_PRODUCTS        → "top_products"              │
│    REGION_HEATMAP      → "by_region"                 │
│    MONTHLY_TREND       → "monthly_trend"             │
│    DRILL_DOWN          → "products_in_category"      │
│    SEGMENT_DIST        → "by_segment"                │
│    → $AggName (String)                               │
├─────────────────────────────────────────────────────┤
│ 5. Java Action: ES_ParseAggResponse                  │
│    - EsResponseJson = $EsResponse                    │
│    - AggName        = $AggName                       │
│    → $BucketList (List of OlapBucket)                │
└─────────────────────────────────────────────────────┘
RETURN: $BucketList
```

**Cách build bước 4 trong Mendix (Map QueryType → AggName):**
Dùng một loạt Decision node hoặc dùng Java Action đơn giản:
```java
// ES_GetAggName.java (simple mapping action)
public String executeAction() {
    switch(queryType) {
        case "REVENUE_BY_CATEGORY": return "by_category";
        case "TOP_PRODUCTS":        return "top_products";
        case "REGION_HEATMAP":      return "by_region";
        case "MONTHLY_TREND":       return "monthly_trend";
        case "DRILL_DOWN":          return "products_in_category";
        default:                    return "by_segment";
    }
}
```

---

### 3.2 ACT_OLAP_LoadRevenueByCategoryChart

**Trigger**: Button "Load Revenue by Category" hoặc Page onLoad

```
INPUT:  OlapFilterParams $FilterParams (passed từ page)
OUTPUT: (void) – updates association list on $FilterParams

STEPS:
┌─────────────────────────────────────────────────────┐
│ 1. Change Object $FilterParams                       │
│    QueryType = "REVENUE_BY_CATEGORY"                 │
├─────────────────────────────────────────────────────┤
│ 2. Delete existing OlapBucket associated with        │
│    $FilterParams (Delete Objects activity)           │
│    XPath: [OlapFilterParams_OlapBucket/              │
│            OlapFilterParams = $FilterParams]         │
├─────────────────────────────────────────────────────┤
│ 3. Call SUB_ES_ExecuteAndParse($FilterParams)        │
│    → $BucketList                                     │
├─────────────────────────────────────────────────────┤
│ 4. Loop over $BucketList (Iterate)                   │
│    For each $Bucket:                                 │
│      - Change $Bucket: associate to $FilterParams    │
│      - Commit $Bucket                                │
├─────────────────────────────────────────────────────┤
│ 5. Commit $FilterParams                              │
└─────────────────────────────────────────────────────┘
```

---

### 3.3 ACT_OLAP_DrillDown

**Trigger**: Click on chart bar (category name passed as parameter)

```
INPUT:  String $CategoryName, OlapFilterParams $FilterParams
OUTPUT: (void) – populates drill-down bucket list

STEPS:
┌─────────────────────────────────────────────────────┐
│ 1. Change Object $FilterParams                       │
│    FilterCategory = $CategoryName                    │
│    QueryType = "DRILL_DOWN"                          │
├─────────────────────────────────────────────────────┤
│ 2. Delete existing OlapBucket (same as 3.2 step 2)  │
├─────────────────────────────────────────────────────┤
│ 3. Call SUB_ES_ExecuteAndParse($FilterParams)        │
│    → $BucketList                                     │
├─────────────────────────────────────────────────────┤
│ 4. Loop and commit buckets (same as 3.2 step 4)     │
├─────────────────────────────────────────────────────┤
│ 5. Show popup page: POP_DrillDownDetail              │
│    Pass: $FilterParams                               │
└─────────────────────────────────────────────────────┘
```

---

### 3.4 ACT_OLAP_ApplyFilter (Universal Filter Handler)

**Trigger**: "Apply Filter" button on dashboard page

```
INPUT:  OlapFilterParams $FilterParams
OUTPUT: (void)

STEPS:
1. Decision: $FilterParams/QueryType
   - "REVENUE_BY_CATEGORY" → Call ACT_OLAP_LoadRevenueByCategoryChart
   - "TOP_PRODUCTS"        → Call ACT_OLAP_LoadTopProducts
   - "MONTHLY_TREND"       → Call ACT_OLAP_LoadMonthlyTrend
   - "REGION_HEATMAP"      → Call ACT_OLAP_LoadRegionHeatmap
   - "SEGMENT_DIST"        → Call ACT_OLAP_LoadSegmentDist
2. Refresh page / Refresh data source
```

---

## ════════════════════════════════════════════
## PHASE 4: Nanoflows
## ════════════════════════════════════════════

### 4.1 NF_OLAP_OnCategoryClick (Drill-down trigger)

```
INPUT:  String $CategoryName
OUTPUT: (void)

STEPS:
1. Retrieve $FilterParams (from Page variable or Session)
2. Call Microflow ACT_OLAP_DrillDown($CategoryName, $FilterParams)
   [Client-side: use "Call microflow" nanoflow activity]
3. (Optional) Navigate to drill-down page
```

### 4.2 NF_OLAP_ResetFilters

```
STEPS:
1. Retrieve $FilterParams
2. Change $FilterParams:
   - FilterYear     = 0
   - FilterCategory = ""
   - FilterRegion   = ""
   - FilterSegment  = ""
   - DateFrom       = ""
   - DateTo         = ""
   - QueryType      = "REVENUE_BY_CATEGORY"
3. Call ACT_OLAP_ApplyFilter($FilterParams)
```

---

## ════════════════════════════════════════════
## PHASE 5: Pages & UI
## ════════════════════════════════════════════

### 5.1 Page: `OlapDashboard` (Main Analytics Dashboard)

**Layout**: Atlas_TopBar hoặc Atlas_Sidebar

**Structure:**
```
┌─────────────────────────────────────────────────────────┐
│  HEADER: "Sales Analytics Dashboard"                     │
├─────────────────────────────────────────────────────────┤
│  FILTER BAR (Data View – OlapFilterParams)               │
│  ┌──────┐ ┌────────────┐ ┌──────────┐ ┌───────────┐   │
│  │ Year │ │  Category  │ │  Region  │ │  Segment  │   │
│  │ Drop │ │  Dropdown  │ │ Dropdown │ │ Dropdown  │   │
│  └──────┘ └────────────┘ └──────────┘ └───────────┘   │
│  [Apply Filter]  [Reset]  [Date Range: From - To]       │
├──────────────────┬──────────────────────────────────────┤
│  KPI CARDS       │                                       │
│  Total Revenue   │  Chart: Revenue by Category           │
│  Total Profit    │  (AnyChart Bar/Column)                 │
│  Avg Margin      │                                       │
│  Total Orders    │                                       │
├──────────────────┴──────────────────────────────────────┤
│  Chart: Monthly Revenue Trend (Line + Moving Average)    │
├──────────────────────────────────────────────────────────┤
│  LEFT: Top 10 Products Table  │  RIGHT: Region Heatmap   │
└──────────────────────────────────────────────────────────┘
```

**Data source cho Filter Bar:**
- Data view source: Microflow `DS_GetOrCreateFilterParams`
  ```
  DS_GetOrCreateFilterParams:
    1. Retrieve $FilterParams from Session (or create new)
    2. If not exists: Create OlapFilterParams with defaults
       - FilterYear = 2024
       - QueryType  = "REVENUE_BY_CATEGORY"
       - TopN       = 10
    3. Return $FilterParams
  ```

**KPI Cards:**
- Dùng Data view → source: Microflow `DS_GetOlapSummary`
- DS_GetOlapSummary chạy query `REVENUE_BY_CATEGORY` và sum tất cả buckets
- Hoặc chạy riêng một ES query `{"size":0,"aggs":{"total_rev":{"sum":...},...}}`

---

### 5.2 AnyChart Widget Configuration

**Chart 1: Revenue by Category (Bar Chart)**

Marketplace: tìm "AnyChart" hoặc "Charts" widget

```javascript
// AnyChart config JSON (paste vào widget config)
{
  "chart": {
    "type": "bar",
    "title": { "text": "Revenue by Category" },
    "data": [
      // Generated dynamically from OlapBucket list
      // Label = Category Name, Value = Revenue
    ],
    "series": [{
      "name": "Revenue (VND)",
      "data": "$dataFromMicroflow"
    }]
  }
}
```

**Mendix AnyChart Data Microflow** `DS_Chart_RevByCategory`:
```
1. Retrieve list of OlapBucket associated with $FilterParams
2. Return list (AnyChart widget maps Label → X axis, Revenue → Y axis)
```

**AnyChart → Mendix click event (Drill-down):**
- In AnyChart widget: On Click → Call Nanoflow `NF_OLAP_OnCategoryClick`
- Pass: `{category}` template → maps to $CategoryName parameter

---

### 5.3 Page: `POP_DrillDownDetail` (Popup)

```
┌──────────────────────────────────┐
│  Drill-down: [CategoryName]       │
│  ──────────────────────────────  │
│  Products in category             │
│  (ListView or DataGrid)           │
│  ┌──────────────────────────────┐ │
│  │ Product Name │ Revenue │ QTY │ │
│  │ ...          │ ...     │ ... │ │
│  └──────────────────────────────┘ │
│  [Close]                          │
└──────────────────────────────────┘
```

- Data source: List view → source microflow `DS_DrillDown_Products`
- DS_DrillDown_Products: Retrieve OlapBucket list associated with $FilterParams (where QueryType = DRILL_DOWN)

---

## ════════════════════════════════════════════
## PHASE 6: Kết nối Navigation
## ════════════════════════════════════════════

1. **App** → **Navigation** → Add menu item
   - Caption: "Sales Analytics"
   - On click: Open page `OlapDashboard`
   - Icon: chart icon

2. **Page access**: Set page access to Administrators + Users

3. **Microflow access**: Tất cả ACT_OLAP_* phải allow User role

---

## ════════════════════════════════════════════
## TESTING CHECKLIST
## ════════════════════════════════════════════

- [ ] ES indexes tạo thành công (curl check)
- [ ] Data seed script chạy OK (5000+ docs)
- [ ] Java Action compile thành công (F4 trong Studio Pro)
- [ ] SUB_ES_ExecuteAndParse trả về list (check Log)
- [ ] Dashboard page load không lỗi
- [ ] Filter → Apply → Chart update
- [ ] Click chart → Drill-down popup mở
- [ ] Reset filter → về default view
