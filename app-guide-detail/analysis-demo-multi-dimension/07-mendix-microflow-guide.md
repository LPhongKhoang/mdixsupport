# 07 - Mendix Microflow Guide: SalesOLAP Module

> Hướng dẫn chi tiết từng bước tạo tat ca cac Microflow trong Mendix Studio Pro v10 cho module **SalesOLAP**.
> Tat ca cac entity deu la **Non-Persistent (NPE)**.

---

## Muc luc

1. [Tong quan kien truc Microflow](#1-tong-quan-kien-truc-microflow)
2. [MF 1: OLAP_GetSalesData (MAIN microflow)](#2-mf-1-olap_getsalesdata-main-microflow)
3. [MF 2: OLAP_DrillDown](#3-mf-2-olap_drilldown)
4. [MF 3: OLAP_RollUp](#4-mf-3-olap_rollup)
5. [MF 4: OLAP_GetFilterOptions](#5-mf-4-olap_getfilteroptions)
6. [MF 5: OLAP_InitializeFilter](#6-mf-5-olap_initializefilter)
7. [MF 6: OLAP_ChangeDimension](#7-mf-6-olap_changedimension)
8. [MF 7: OLAP_ResetFilters](#8-mf-7-olap_resetfilters)
9. [Error Handling chung](#9-error-handling-chung)
10. [Tips & Troubleshooting](#10-tips--troubleshooting)

---

## 1. Tong quan kien truc Microflow

### 1.1 So do tong the cac Microflow

```
OLAP_InitializeFilter  ──>  OlapFilter (new)
                               │
                               ▼
                    ┌─── OLAP_GetSalesData ◄──────────────────────┐
                    │        (MAIN)                                │
                    │         │                                    │
                    │         ▼                                    │
                    │   List<SalesAggregateResult>                │
                    │                                              │
OLAP_ChangeDimension ──────►│                                     │
OLAP_DrillDown ─────────────►│                                    │
OLAP_RollUp ────────────────►│                                    │
                    │                                              │
                    └──────────────────────────────────────────────┘

OLAP_ResetFilters ──>  OlapFilter (reset)
OLAP_GetFilterOptions ──>  List<String> (dropdown values)
```

### 1.2 Entity va Association reminder

```
OlapFilter (NPE)
├── drillDimension  : String
├── drillLevel      : Integer (default 0)
├── selectedKey     : String
├── yearFilter      : Integer
├── quarterFilter   : String
├── monthFilter     : String
├── categoryFilter    : String
├── productFilter     : String
├── variantSkuFilter  : String
├── customerFilter    : String
├── segmentFilter     : String
├── countryFilter     : String
├── regionFilter      : String
├── cityFilter        : String
├── storeFilter       : String
├── dateFrom        : DateTime
└── dateTo          : DateTime

SalesAggregateResult (NPE)
├── dimensionValue    : String
├── dimensionLabel    : String
├── totalRevenue      : Decimal
├── totalQuantity     : Integer
├── transactionCount  : Integer
├── avgOrderValue     : Decimal
├── drillDownLevel    : Integer
├── parentKey         : String
└── hasChildren       : Boolean

EsResponseWrapper (NPE)
├── took        : Integer
├── totalHits   : Integer
└── _EsResponseWrapper_EsAggregationWrapper (1-1 assoc)
        │
        ▼
    EsAggregationWrapper (NPE)
    └── _EsAggregationWrapper_EsAggBucket (1-*) assoc
            │
            ▼
        EsAggBucket (NPE)
        ├── key          : String
        ├── keyAsString  : String
        ├── docCount     : Integer
        ├── amountSum    : Decimal
        ├── quantitySum    : Decimal
        └── avgOrderValue  : Decimal

OlapConfig (NPE)
├── esBaseUrl    : String   (default: "http://localhost:9200")
├── esIndexName  : String   (default: "sales_olap")
└── esTimeout    : Integer  (default: 30000)
```

### 1.3 Quy uoc dat ten

| Loai                   | Quy uoc                       | Vi du                        |
|------------------------|-------------------------------|------------------------------|
| Microflow              | `OLAP_` + PascalCase          | `OLAP_GetSalesData`          |
| Variable trong MF      | camelCase                     | `queryJson`, `bucketList`    |
| Parameter              | camelCase                     | `olapFilter`, `filterField`  |
| Java Action call       | Ten JA nguyen                 | `JA_BuildEsAggregationQuery` |

---

## 2. MF 1: OLAP_GetSalesData (MAIN microflow)

### 2.1 Thong tin chung

| Thuoc tinh   | Gia tri                                     |
|--------------|---------------------------------------------|
| Name         | `OLAP_GetSalesData`                         |
| Module       | `SalesOLAP`                                 |
| Parameters   | `olapFilter` (OlapFilter)                   |
| Return type  | `List<SalesAggregateResult>`                |
| Usage        | Duoc goi boi tat ca cac microflow khac      |

### 2.2 So do Flow (box diagram)

```
[Start] → [Retrieve OlapConfig] → [Build Query via JA]
    → [Build URL string] → [Call REST POST]
    → [Extract Bucket List] → [Loop: ForEach bucket]
        → [Create SalesAggregateResult] → [Add to Result List]
    → [End: Return List<SalesAggregateResult>]

    Error path: → [Log Error] → [Return Empty List]
```

### 2.3 Huong dan tao Microflow tung buoc

---

#### Buoc 1: Tao Microflow moi

1. Trong **App Explorer**, click phai vao folder `SalesOLAP` > **Add microflow**
2. Dat ten: `OLAP_GetSalesData`
3. Double-click vao microflow moi tao de mo **Microflow Editor**

---

#### Buoc 2: Cau hinh Parameter

1. Click vao **Start Event** (hinh tron xanh)
2. Trong **Properties** panel, click **Add Parameter**
3. Cau hinh:
   - **Name**: `olapFilter`
   - **Type**: `Object`
   - **Entity**: `SalesOLAP.OlapFilter`

---

#### Buoc 3: Cau hinh Return Type

1. Click vao **End Event** (hinh tron do)
2. Trong **Properties** panel:
   - **Return type**: `List`
   - **Entity**: `SalesOLAP.SalesAggregateResult`

---

#### Buoc 4: Retrieve OlapConfig

1. Tu **Toolbox**, keo **Retrieve** activity vao canvas
2. Cau hinh trong **Properties**:
   - **Source**: `From database`
   - **Entity**: `SalesOLAP.OlapConfig`
   - **Range**: `First` (chi can 1 record config)
3. Dat ten variable: `olapConfig`
4. **Luu y**: Vi OlapConfig la NPE, ban phai tao logic khoi tao OlapConfig truoc. Mot cach khac la dung **Retrieve by association** neu OlapConfig da duoc associate voi OlapFilter. Gia su phuong an don gian nhat: Retrieve from database voi range = First.

> **Cach thay the (khuyen dung)**: Thay vi Retrieve, ban co the truyen them parameter `olapConfig` vao microflow, hoac dung constant/hardcode cho demo.

---

#### Buoc 5: Goi Java Action - Build ES Query

1. Tu **Toolbox**, keo **Java Action Call** activity vao canvas
2. Cau hinh trong **Properties**:
   - **Java action**: `SalesOLAP.JA_BuildEsAggregationQuery`
   - **Parameters**: truyen `olapFilter` vao parameter tuong ung
3. Dat ten output variable: `queryJson` (Type: `String`)

> **Luu y**: Java Action `JA_BuildEsAggregationQuery` nhan vao `OlapFilter` va tra ve mot String la JSON query cho Elasticsearch.

---

#### Buoc 6: Build URL String

1. Tu **Toolbox**, keo **Create Variable** activity vao canvas
2. Cau hinh trong **Properties**:
   - **Variable name**: `esUrl`
   - **Data type**: `String`
   - **Expression**:
     ```
     $olapConfig/esBaseUrl + '/' + $olapConfig/esIndexName + '/_search'
     ```
3. Kiem tra: Ket qua se la `http://localhost:9200/sales_olap/_search`

---

#### Buoc 7: Call REST - POST to Elasticsearch

1. Tu **Toolbox**, keo **Call REST** activity vao canvas
2. Cau hinh tung phan:

**Tab: Location**
- **Method**: `POST`
- **URL**: `$esUrl` (click Edit expression, chon variable `esUrl`)
- **Do NOT tick** "Use HTTP authentication" (ES local khong can auth)

**Tab: Request body**
- Chon **Custom request template**
- **Request body type**: `String`
- **Template**: `$queryJson` (chon variable queryJson)

**Tab: Response**
- **Response handling**: `Apply import mapping`
- **Import mapping**: Chon mapping da tao truoc (vi du: `IM_EsResponseToJson`)
- **Output entity**: `SalesOLAP.EsResponseWrapper`
- **Variable name**: `esResponse`

**Tab: Advanced** (optional)
- **Timeout**: `30000` (30 giay)
- **Headers**: `Content-Type: application/json`

3. Ket noi activity nay voi buoc truoc do

---

#### Buoc 8: Extract EsAggBucket List

1. Tu **Toolbox**, keo **Retrieve** activity vao canvas
2. Cau hinh trong **Properties**:
   - **Source**: `By association`
   - **Association**: `SalesOLAP.EsResponseWrapper_EsAggregationWrapper` (tu `esResponse`)
3. Dat variable: `aggWrapper` (Type: `EsAggregationWrapper`)
4. Tiep tuc, keo them mot **Retrieve** activity nua:
   - **Source**: `By association`
   - **Association**: `SalesOLAP.EsAggregationWrapper_EsAggBucket` (tu `aggWrapper`)
   - **Variable name**: `bucketList`
   - **Type**: `List<SalesOLAP.EsAggBucket>`

> **Cach don gian hon**: Neu Import Mapping tra truc tiep association, ban co the dung **Retrieve by association** chain tu `esResponse` den `bucketList`.

---

#### Buoc 9: Tao Empty Result List

1. Tu **Toolbox**, keo **Create Variable** activity vao canvas
2. Cau hinh:
   - **Variable name**: `resultList`
   - **Data type**: `List<SalesOLAP.SalesAggregateResult>`
   - **Expression**:
     ```
     empty
     ```

---

#### Buoc 10: Loop qua Bucket List

1. Tu **Toolbox**, keo **Loop** (Iterator) activity vao canvas
2. Cau hinh trong **Properties**:
   - **Iterate over**: `bucketList`
   - **Variable name**: `currentBucket` (Type: `SalesOLAP.EsAggBucket`)

---

#### Buoc 11: Create SalesAggregateResult (ben trong Loop)

**Activity 11a: Create SalesAggregateResult**

1. Keo **Create Object** activity vao ben trong loop
2. Cau hinh:
   - **Entity**: `SalesOLAP.SalesAggregateResult`
   - **Variable name**: `aggResult`

**Cac truong duoc gan (commit member values)**:

| Attribute            | Expression                                                                    |
|----------------------|-------------------------------------------------------------------------------|
| `dimensionValue`     | `$currentBucket/key`                                                          |
| `dimensionLabel`     | `if $currentBucket/keyAsString != empty then $currentBucket/keyAsString else $currentBucket/key` |
| `totalRevenue`       | `if $currentBucket/amountSum != empty then $currentBucket/amountSum else 0`   |
| `totalQuantity`      | `if $currentBucket/quantitySum != empty then $currentBucket/quantitySum else 0` |
| `transactionCount`   | `$currentBucket/docCount`                                                     |
| `avgOrderValue`      | `if $currentBucket/docCount > 0 then $currentBucket/amountSum / $currentBucket/docCount else 0` |
| `drillDownLevel`     | `$olapFilter/drillLevel + 1`                                                  |
| `parentKey`          | `$olapFilter/selectedKey`                                                     |
| `hasChildren`        | `true` (mac dinh, se duoc cap nhat boi UI hoac logic khac)                    |

**Activity 11b: Add to List**

1. Keo **Change List** activity vao ben trong loop (sau Create Object)
2. Cau hinh:
   - **Variable**: `resultList`
   - **Operation**: `Add`
   - **Value**: `$aggResult`

---

#### Buoc 12: Ket noi End Event

1. Ket noi output cua Loop toi **End Event**
2. End Event return variable: `resultList`

---

#### Buoc 13: Them Error Handler

1. Click vao **Call REST** activity
2. Trong **Properties** > **Error handling**:
   - Tick **Set as error handler flow** (tren activity duoc them vao)
   - Keo mot **End Event** moi cho error path
3. Cau hinh Error End Event:
   - **Return type**: `List<SalesOLAP.SalesAggregateResult>`
   - **Expression**: `empty`

4. **Luu y**: Tat ca cac activity co the loi nen dat error handler o cap do cao nhat. Cach don gian:
   - Click phai vao background cua microflow > **Add error handler**
   - Keo **Log message** activity vao error flow:
     - **Log level**: `Error`
     - **Message**: `'OLAP_GetSalesData error: ' + $latestError/Message`
   - Keo **End Event** return `empty` list

---

### 2.4 Tom tat expression quan trong

```
// Build URL
$olapConfig/esBaseUrl + '/' + $olapConfig/esIndexName + '/_search'

// avgOrderValue
if $currentBucket/docCount > 0 then $currentBucket/amountSum / $currentBucket/docCount else 0

// dimensionLabel
if $currentBucket/keyAsString != empty then $currentBucket/keyAsString else $currentBucket/key
```

---

## 3. MF 2: OLAP_DrillDown

### 3.1 Thong tin chung

| Thuoc tinh   | Gia tri                                     |
|--------------|---------------------------------------------|
| Name         | `OLAP_DrillDown`                            |
| Parameters   | `olapFilter` (OlapFilter), `selectedDimensionValue` (String) |
| Return type  | `List<SalesAggregateResult>`                |
| Mo ta        | Drill down vao mot chieu du lieu cu the     |

### 3.2 So do Flow

```
[Start] → [Set selectedKey] → [Increment drillLevel]
    → [Decision: drillDimension?]
        ├── "product"  → [Decision: current level?] → Set categoryFilter / productFilter / variantSkuFilter
        ├── "time"     → [Decision: current level?] → Set yearFilter / quarterFilter / monthFilter
        ├── "customer" → [Decision: current level?] → Set segmentFilter
        └── "geography"→ [Decision: current level?] → Set countryFilter / regionFilter / cityFilter
    → [Merge] → [Call OLAP_GetSalesData(olapFilter)]
    → [End: Return result]

    Error path → [Log + Return empty list]
```

### 3.3 Huong dan tao tung buoc

---

#### Buoc 1: Tao Microflow va Parameters

1. Tao microflow moi: `OLAP_DrillDown`
2. **Parameters**:
   - `olapFilter` : Object > `SalesOLAP.OlapFilter`
   - `selectedDimensionValue` : `String`

3. **Return type**: `List<SalesOLAP.SalesAggregateResult>`

---

#### Buoc 2: Set selectedKey

1. Keo **Change Object** activity vao canvas
2. Cau hinh:
   - **Object**: `$olapFilter`
   - **Member**: `selectedKey`
   - **Value**: `$selectedDimensionValue`
3. Khong can commit (NPE khong commit vao database)

---

#### Buoc 3: Increment drillLevel

1. Keo **Change Object** activity vao canvas
2. Cau hinh:
   - **Object**: `$olapFilter`
   - **Member**: `drillLevel`
   - **Value**:
     ```
     $olapFilter/drillLevel + 1
     ```

---

#### Buop 4: Decision - drillDimension

1. Keo **Exclusive Split** (Decision diamond) vao canvas
2. Cau hinh:
   - **Caption**: `Check dimension`
   - **Expression**:
     ```
     $olapFilter/drillDimension
     ```
3. Cac nhanh (outgoing flows):

| Flow condition                  | Caption        |
|---------------------------------|----------------|
| `$olapFilter/drillDimension = 'product'`   | `product`      |
| `$olapFilter/drillDimension = 'time'`      | `time`         |
| `$olapFilter/drillDimension = 'customer'`  | `customer`     |
| `$olapFilter/drillDimension = 'geography'` | `geography`    |

---

#### Buoc 5: Product branch - Set filter theo level

**5a: Sub-decision cho product level**

Keo **Exclusive Split** vao nhanh `product`:
- **Expression**:
  ```
  $olapFilter/drillLevel
  ```
- Cac nhanh:

| Condition                    | Caption      | Action                                                |
|------------------------------|--------------|-------------------------------------------------------|
| `$olapFilter/drillLevel = 1` | Level 0→1   | Set `categoryFilter = $selectedDimensionValue`        |
| `$olapFilter/drillLevel = 2` | Level 1→2   | Set `productFilter = $selectedDimensionValue`         |
| `$olapFilter/drillLevel = 3` | Level 2→3   | Set `variantSkuFilter = $selectedDimensionValue`      |
| `else`                       | Other       | Khong lam gi (default)                                |

**5b: Change Object cho level 0→1 (categoryFilter)**

Keo **Change Object**:
- **Object**: `$olapFilter`
- **Members to change**:
  - `categoryFilter` = `$selectedDimensionValue`

**5c: Change Object cho level 1→2 (productFilter)**

Keo **Change Object**:
- **Object**: `$olapFilter`
- **Members to change**:
  - `productFilter` = `$selectedDimensionValue`

> **Luu y**: ES field cho Level 1 la `product_name.keyword` (can `.keyword` suffix vi `product_name` la text field). Xem them Appendix C.

**5d: Change Object cho level 2→3 (variantSkuFilter)**

Keo **Change Object**:
- **Object**: `$olapFilter`
- **Members to change**:
  - `variantSkuFilter` = `$selectedDimensionValue`

---

#### Buoc 6: Time branch - Set filter theo level

**6a: Sub-decision cho time level**

Keo **Exclusive Split** vao nhanh `time`:
- **Expression**:
  ```
  $olapFilter/drillLevel
  ```
- Cac nhanh:

| Condition                    | Caption      | Action                                                |
|------------------------------|--------------|-------------------------------------------------------|
| `$olapFilter/drillLevel = 1` | Level 0→1   | Set `yearFilter = $selectedDimensionValue`            |
| `$olapFilter/drillLevel = 2` | Level 1→2   | Set `quarterFilter = $selectedDimensionValue`         |
| `$olapFilter/drillLevel = 3` | Level 2→3   | Set `monthFilter = $selectedDimensionValue`           |
| `else`                       | Other       | Khong lam gi                                          |

**6b: Change Object cho tung level**

| Level transition | Change Object member    | Value                        |
|------------------|-------------------------|------------------------------|
| 0→1              | `yearFilter`            | `$selectedDimensionValue`    |
| 1→2              | `quarterFilter`         | `$selectedDimensionValue`    |
| 2→3              | `monthFilter`           | `$selectedDimensionValue`    |

---

#### Buoc 7: Customer branch - Set filter

**7a: Sub-decision cho customer level**

Keo **Exclusive Split** vao nhanh `customer`:
- **Expression**:
  ```
  $olapFilter/drillLevel
  ```
- Cac nhanh:

| Condition                    | Caption      | Action                                                |
|------------------------------|--------------|-------------------------------------------------------|
| `$olapFilter/drillLevel = 1` | Level 0→1   | Set `segmentFilter = $selectedDimensionValue`         |

**7b: Change Object cho level 0→1**

- **Object**: `$olapFilter`
- **Members to change**:
  - `segmentFilter` = `$selectedDimensionValue`

> **Luu y**: Neu mo rong them Level 1→2 cho Customer (theo ten khach hang), ES field la `customer_name.keyword` (can `.keyword` suffix vi `customer_name` la text field). Xem them Appendix C.

---

#### Buoc 8: Geography branch - Set filter

**8a: Sub-decision cho geography level**

Keo **Exclusive Split** vao nhanh `geography`:
- **Expression**:
  ```
  $olapFilter/drillLevel
  ```
- Cac nhanh:

| Condition                    | Caption      | Action                                                |
|------------------------------|--------------|-------------------------------------------------------|
| `$olapFilter/drillLevel = 1` | Level 0→1   | Set `countryFilter = $selectedDimensionValue`         |
| `$olapFilter/drillLevel = 2` | Level 1→2   | Set `regionFilter = $selectedDimensionValue`          |
| `$olapFilter/drillLevel = 3` | Level 2→3   | Set `cityFilter = $selectedDimensionValue`            |

**8b: Change Object cho tung level**

| Level transition | Change Object member    | Value                        |
|------------------|-------------------------|------------------------------|
| 0→1              | `countryFilter`         | `$selectedDimensionValue`    |
| 1→2              | `regionFilter`          | `$selectedDimensionValue`    |
| 2→3              | `cityFilter`            | `$selectedDimensionValue`    |

---

#### Buoc 9: Merge va Call OLAP_GetSalesData

1. Keo **Merge** activity (hinh thoi) vao canvas de hop tat ca cac nhanh
2. Keo **Microflow Call** activity sau Merge:
   - **Microflow**: `SalesOLAP.OLAP_GetSalesData`
   - **Parameter**: `olapFilter` = `$olapFilter`
   - **Variable name**: `resultList`
   - **Return type**: `List<SalesOLAP.SalesAggregateResult>`

---

#### Buoc 10: End Event

1. Ket noi `resultList` toi **End Event**
2. **Return variable**: `resultList`

---

### 3.4 Tom tat expression quan trong

```
// Increment drillLevel
$olapFilter/drillLevel + 1

// Decision: dimension type
$olapFilter/drillDimension

// Decision: current level
$olapFilter/drillLevel
```

---

## 4. MF 3: OLAP_RollUp

### 4.1 Thong tin chung

| Thuoc tinh   | Gia tri                                     |
|--------------|---------------------------------------------|
| Name         | `OLAP_RollUp`                               |
| Parameters   | `olapFilter` (OlapFilter)                   |
| Return type  | `List<SalesAggregateResult>`                |
| Mo ta        | Roll up (di len) mot cap trong drill-down   |

### 4.2 So do Flow

```
[Start] → [Decision: drillLevel > 0?]
    ├── No (level = 0) → [Return empty list] (khong the roll up)
    └── Yes → [Decrement drillLevel]
        → [Decision: drillDimension?]
            ├── "product"  → [Decision: new level?] → Clear variantSkuFilter / productFilter / categoryFilter
            ├── "time"     → [Decision: new level?] → Clear monthFilter / quarterFilter / yearFilter
            ├── "customer" → [Decision: new level?] → Clear segmentFilter
            └── "geography"→ [Decision: new level?] → Clear cityFilter / regionFilter / countryFilter
        → [Clear selectedKey]
        → [Call OLAP_GetSalesData(olapFilter)]
        → [End: Return result]
```

### 4.3 Huong dan tao tung buoc

---

#### Buoc 1: Tao Microflow va Parameters

1. Tao microflow moi: `OLAP_RollUp`
2. **Parameter**: `olapFilter` : Object > `SalesOLAP.OlapFilter`
3. **Return type**: `List<SalesOLAP.SalesAggregateResult>`

---

#### Buoc 2: Decision - Co the roll up khong?

1. Keo **Exclusive Split** vao canvas
2. Cau hinh:
   - **Caption**: `Can roll up?`
   - **Expression**:
     ```
     $olapFilter/drillLevel > 0
     ```
3. Cac nhanh:
   - `true`: Tiep tuc roll up
   - `false`: Return empty list

---

#### Buoc 3: Decrement drillLevel

1. Keo **Change Object** activity vao nhanh `true`
2. Cau hinh:
   - **Object**: `$olapFilter`
   - **Member**: `drillLevel`
   - **Value**:
     ```
     $olapFilter/drillLevel - 1
     ```

---

#### Buoc 4: Decision - drillDimension

1. Keo **Exclusive Split** sau buoc 3
2. Cau hinh:
   - **Expression**:
     ```
     $olapFilter/drillDimension
     ```
4. Cac nhanh giong nhu trong OLAP_DrillDown (product, time, customer, geography)

---

#### Buoc 5: Product branch - Clear filter

Keo **Exclusive Split** vao nhanh `product`:
- **Expression**: `$olapFilter/drillLevel`

| Condition (new level sau khi da giam) | Caption     | Action                                     |
|---------------------------------------|-------------|--------------------------------------------|
| `$olapFilter/drillLevel = 2`          | Was level 3 | Clear `variantSkuFilter` = `empty`         |
| `$olapFilter/drillLevel = 1`          | Was level 2 | Clear `productFilter` = `empty`            |
| `$olapFilter/drillLevel = 0`          | Was level 1 | Clear `categoryFilter` = `empty`           |

**Change Object cho tung truong hop**:

- **Level 3→2**:
  - `variantSkuFilter` = `empty`

- **Level 2→1**:
  - `productFilter` = `empty`

- **Level 1→0**:
  - `categoryFilter` = `empty`

---

#### Buoc 6: Time branch - Clear filter

Keo **Exclusive Split** vao nhanh `time`:
- **Expression**: `$olapFilter/drillLevel`

| Condition (new level) | Caption      | Action                                    |
|-----------------------|--------------|-------------------------------------------|
| `$olapFilter/drillLevel = 2` | Was 3 | Clear `monthFilter` = `empty`             |
| `$olapFilter/drillLevel = 1` | Was 2 | Clear `quarterFilter` = `empty`           |
| `$olapFilter/drillLevel = 0` | Was 1 | Clear `yearFilter` = `empty`              |

**Change Object**:

| Level transition | Change Object member    | Value   |
|------------------|-------------------------|---------|
| 3→2              | `monthFilter`           | `empty` |
| 2→1              | `quarterFilter`         | `empty` |
| 1→0              | `yearFilter`            | `empty` |

---

#### Buoc 7: Customer branch - Clear filter

| Condition (new level)     | Action                             |
|---------------------------|------------------------------------|
| `$olapFilter/drillLevel = 0` | Clear `segmentFilter` = `empty` |

**Change Object**:
- `segmentFilter` = `empty`

---

#### Buop 8: Geography branch - Clear filter

| Condition (new level)          | Action                             |
|--------------------------------|------------------------------------|
| `$olapFilter/drillLevel = 2`   | Clear `cityFilter` = `empty`       |
| `$olapFilter/drillLevel = 1`   | Clear `regionFilter` = `empty`     |
| `$olapFilter/drillLevel = 0`   | Clear `countryFilter` = `empty`    |

**Change Object**:

| Level transition | Change Object member    | Value   |
|------------------|-------------------------|---------|
| 3→2              | `cityFilter`            | `empty` |
| 2→1              | `regionFilter`          | `empty` |
| 1→0              | `countryFilter`         | `empty` |

---

#### Buoc 9: Clear selectedKey

1. Keo **Change Object** activity (sau Merge, truoc khi call MF)
2. Cau hinh:
   - **Object**: `$olapFilter`
   - **Member**: `selectedKey`
   - **Value**: `empty`

---

#### Buoc 10: Call OLAP_GetSalesData va Return

1. Keo **Microflow Call** activity:
   - **Microflow**: `SalesOLAP.OLAP_GetSalesData`
   - **Parameter**: `olapFilter` = `$olapFilter`
   - **Variable name**: `resultList`
2. Ket noi toi **End Event** return `resultList`

---

### 4.4 Tom tat expression quan trong

```
// Check co the roll up
$olapFilter/drillLevel > 0

// Decrement level
$olapFilter/drillLevel - 1

// Clear filter (dat ve empty)
empty
```

---

## 5. MF 4: OLAP_GetFilterOptions

### 5.1 Thong tin chung

| Thuoc tinh   | Gia tri                                     |
|--------------|---------------------------------------------|
| Name         | `OLAP_GetFilterOptions`                     |
| Parameters   | `filterField` (String)                      |
| Return type  | `List<String>`                              |
| Mo ta        | Lay danh sach gia tri cho UI dropdown       |

### 5.2 So do Flow

```
[Start] → [Retrieve OlapConfig] → [Build terms agg query JSON]
    → [Build URL string] → [Call REST POST]
    → [Extract bucket keys] → [Loop: ForEach bucket]
        → [Extract key string] → [Add to result list]
    → [End: Return List<String>]

    Error path → [Log + Return empty list]
```

### 5.3 Huong dan tao tung buoc

---

#### Buoc 1: Tao Microflow va Parameters

1. Tao microflow moi: `OLAP_GetFilterOptions`
2. **Parameter**: `filterField` : `String`
3. **Return type**: `List<String>`

---

#### Buoc 2: Retrieve OlapConfig

Giong nhu trong MF 1 (Retrieve `SalesOLAP.OlapConfig`, range = First).
Variable: `olapConfig`

---

#### Buoc 3: Build terms aggregation query JSON

1. Keo **Create Variable** activity vao canvas
2. Cau hinh:
   - **Variable name**: `queryJson`
   - **Data type**: `String`
   - **Expression**:
     ```
     '{' +
       '"size": 0,' +
       '"aggs": {' +
         '"field_values": {' +
           '"terms": {' +
             '"field": "' + $filterField + '",' +
             '"size": 100' +
           '}' +
         '}' +
       '}' +
     '}'
     ```

> **Luu y**: Mendix su dung single quote cho string literals. Dau `+` de noi chuoi. Expression tren se tao JSON nhu sau:
> ```json
> {
>   "size": 0,
>   "aggs": {
>     "field_values": {
>       "terms": {
>         "field": "category",
>         "size": 100
>       }
>     }
>   }
> }
> ```

---

#### Buoc 4: Build URL

1. Keo **Create Variable** activity
2. Cau hinh:
   - **Variable name**: `esUrl`
   - **Data type**: `String`
   - **Expression**:
     ```
     $olapConfig/esBaseUrl + '/' + $olapConfig/esIndexName + '/_search'
     ```

---

#### Buoc 5: Call REST POST

1. Keo **Call REST** activity vao canvas
2. Cau hinh tuong tu MF 1:

**Tab: Location**
- **Method**: `POST`
- **URL**: `$esUrl`

**Tab: Request body**
- **Custom request template**
- **Body type**: `String`
- **Template**: `$queryJson`

**Tab: Response**
- **Apply import mapping**
- **Import mapping**: `IM_EsResponseToJson` (cung mapping nhu MF 1)
- **Variable name**: `esResponse`

---

#### Buoc 6: Extract bucket list

Giong nhu MF 1:
1. Retrieve `EsAggregationWrapper` by association tu `esResponse`
2. Retrieve `List<EsAggBucket>` by association tu wrapper
3. Variable: `bucketList`

---

#### Buoc 7: Tao result list va Loop

1. **Create Variable**: `resultList` = `empty` (Type: `List<String>`)

2. **Loop**: Iterate over `bucketList`
   - Variable: `currentBucket` (Type: `EsAggBucket`)

3. Ben trong loop:
   - **Change List** activity:
     - **Variable**: `resultList`
     - **Operation**: `Add`
     - **Value**: `$currentBucket/key`

---

#### Buoc 8: End Event

1. **Return variable**: `resultList` (Type: `List<String>`)

---

#### Buoc 9: Error Handling

Giong MF 1: Error handler → Log → Return `empty` list.

---

### 5.4 Expression JSON query

```
// Full expression de build terms agg query
'{' +
  '"size": 0,' +
  '"aggs": {' +
    '"field_values": {' +
      '"terms": {' +
        '"field": "' + $filterField + '",' +
        '"size": 100' +
      '}' +
    '}' +
  '}' +
'}'
```

---

## 6. MF 5: OLAP_InitializeFilter

### 6.1 Thong tin chung

| Thuoc tinh   | Gia tri                                     |
|--------------|---------------------------------------------|
| Name         | `OLAP_InitializeFilter`                     |
| Parameters   | (khong co)                                  |
| Return type  | `OlapFilter`                                |
| Mo ta        | Khoi tao OlapFilter voi gia tri mac dinh    |

### 6.2 So do Flow

```
[Start] → [Create OlapFilter with defaults] → [End: Return OlapFilter]
```

### 6.3 Huong dan tao tung buoc

---

#### Buoc 1: Tao Microflow

1. Tao microflow moi: `OLAP_InitializeFilter`
2. **Parameters**: Khong co
3. **Return type**: `SalesOLAP.OlapFilter`

---

#### Buoc 2: Create OlapFilter Object

1. Keo **Create Object** activity vao canvas
2. Cau hinh:
   - **Entity**: `SalesOLAP.OlapFilter`
   - **Variable name**: `olapFilter`
   - **Members to initialize** (click **New** de them tung truong):

| Member             | Value          |
|--------------------|----------------|
| `drillLevel`       | `0`            |
| `drillDimension`   | `'product'`    |
| `selectedKey`      | `empty`        |
| `yearFilter`       | `empty`        |
| `quarterFilter`    | `empty`        |
| `monthFilter`      | `empty`        |
| `categoryFilter`    | `empty`        |
| `productFilter`     | `empty`        |
| `variantSkuFilter`  | `empty`        |
| `customerFilter`    | `empty`        |
| `segmentFilter`     | `empty`        |
| `countryFilter`     | `empty`        |
| `regionFilter`      | `empty`        |
| `cityFilter`        | `empty`        |
| `storeFilter`       | `empty`        |

3. Khong can commit (NPE)

---

#### Buoc 3: End Event

1. Ket noi **Create Object** toi **End Event**
2. **Return variable**: `olapFilter`

---

### 6.4 Day la microflow don gian nhat

Chi can 1 activity Create Object va 1 End Event. Thuong duoc goi tu page load event de khoi tao filter ban dau.

---

## 7. MF 6: OLAP_ChangeDimension

### 7.1 Thong tin chung

| Thuoc tinh   | Gia tri                                     |
|--------------|---------------------------------------------|
| Name         | `OLAP_ChangeDimension`                      |
| Parameters   | `olapFilter` (OlapFilter), `newDimension` (String) |
| Return type  | `List<SalesAggregateResult>`                |
| Mo ta        | Chuyen sang phan tich theo chieu moi        |

### 7.2 So do Flow

```
[Start] → [Set new dimension] → [Reset drillLevel = 0]
    → [Clear all specific filters]
    → [Clear selectedKey]
    → [Call OLAP_GetSalesData(olapFilter)]
    → [End: Return result]
```

### 7.3 Huong dan tao tung buoc

---

#### Buoc 1: Tao Microflow va Parameters

1. Tao microflow moi: `OLAP_ChangeDimension`
2. **Parameters**:
   - `olapFilter` : Object > `SalesOLAP.OlapFilter`
   - `newDimension` : `String`
3. **Return type**: `List<SalesOLAP.SalesAggregateResult>`

---

#### Buoc 2: Set new dimension

1. Keo **Change Object** activity vao canvas
2. Cau hinh:
   - **Object**: `$olapFilter`
   - **Members to change** (click **New** de them):
     - `drillDimension` = `$newDimension`

---

#### Buoc 3: Reset drillLevel ve 0

1. Keo **Change Object** activity
2. Cau hinh:
   - **Object**: `$olapFilter`
   - **Members to change**:
     - `drillLevel` = `0`

---

#### Buoc 4: Clear all specific filters

1. Keo **Change Object** activity
2. Cau hinh:
   - **Object**: `$olapFilter`
   - **Members to change** (click **New** de them tat ca):

| Member            | Value    |
|-------------------|----------|
| `yearFilter`      | `empty`  |
| `quarterFilter`   | `empty`  |
| `monthFilter`     | `empty`  |
| `categoryFilter`  | `empty`  |
| `productFilter`   | `empty`  |
| `variantSkuFilter`| `empty`  |
| `customerFilter`  | `empty`  |
| `segmentFilter`   | `empty`  |
| `countryFilter`   | `empty`  |
| `regionFilter`    | `empty`  |
| `cityFilter`      | `empty`  |
| `storeFilter`     | `empty`  |
| `selectedKey`     | `empty`  |

> **Luu y**: Giu nguyen `dateFrom` va `dateTo` (chi clear cac dimension-specific filters).

> **Gop cac buoc**: Ban co the gop tat ca cac Change Object tren thanh 1 hoac 2 Change Object activities de don gian hoa flow. Trong Mendix, mot Change Object co the thay doi nhieu member cung luc.

**Cach gop (khuyen dung)**:

Keo **1 Change Object** activity duy nhat:
- **Object**: `$olapFilter`
- **Members to change** (tat ca trong 1 activity):

| Member              | Value             |
|---------------------|-------------------|
| `drillDimension`    | `$newDimension`   |
| `drillLevel`        | `0`               |
| `selectedKey`       | `empty`           |
| `yearFilter`        | `empty`           |
| `quarterFilter`     | `empty`           |
| `monthFilter`       | `empty`           |
| `categoryFilter`    | `empty`           |
| `productFilter`     | `empty`           |
| `variantSkuFilter`  | `empty`           |
| `customerFilter`    | `empty`           |
| `segmentFilter`     | `empty`           |
| `countryFilter`     | `empty`           |
| `regionFilter`      | `empty`           |
| `cityFilter`        | `empty`           |
| `storeFilter`       | `empty`           |

---

#### Buoc 5: Call OLAP_GetSalesData

1. Keo **Microflow Call** activity:
   - **Microflow**: `SalesOLAP.OLAP_GetSalesData`
   - **Parameter**: `olapFilter` = `$olapFilter`
   - **Variable name**: `resultList`

---

#### Buoc 6: End Event

1. **Return variable**: `resultList`

---

### 7.4 Expression quan trong

```
// Dat dimension moi (trong Change Object)
$newDimension

// Reset level
0

// Clear filters
empty
```

---

## 8. MF 7: OLAP_ResetFilters

### 8.1 Thong tin chung

| Thuoc tinh   | Gia tri                                     |
|--------------|---------------------------------------------|
| Name         | `OLAP_ResetFilters`                         |
| Parameters   | `olapFilter` (OlapFilter)                   |
| Return type  | `OlapFilter`                                |
| Mo ta        | Reset tat ca filter ve trang thai ban dau   |

### 8.2 So do Flow

```
[Start] → [Clear all filters + Reset level] → [End: Return OlapFilter]
```

### 8.3 Huong dan tao tung buoc

---

#### Buoc 1: Tao Microflow va Parameters

1. Tao microflow moi: `OLAP_ResetFilters`
2. **Parameter**: `olapFilter` : Object > `SalesOLAP.OlapFilter`
3. **Return type**: `SalesOLAP.OlapFilter`

---

#### Buoc 2: Clear all filters

1. Keo **Change Object** activity vao canvas
2. Cau hinh:
   - **Object**: `$olapFilter`
   - **Members to change** (click **New** de them tat ca):

| Member              | Value    |
|---------------------|----------|
| `drillLevel`        | `0`      |
| `selectedKey`       | `empty`  |
| `yearFilter`        | `empty`  |
| `quarterFilter`     | `empty`  |
| `monthFilter`       | `empty`  |
| `categoryFilter`    | `empty`  |
| `productFilter`     | `empty`  |
| `variantSkuFilter`  | `empty`  |
| `customerFilter`    | `empty`  |
| `segmentFilter`     | `empty`  |
| `countryFilter`     | `empty`  |
| `regionFilter`      | `empty`  |
| `cityFilter`        | `empty`  |
| `storeFilter`       | `empty`  |
| `dateFrom`          | `empty`  |
| `dateTo`            | `empty`  |

> **Luu y**: Trong MF nay, clear ca `dateFrom` va `dateTo` (reset hoan toan). Neu ban muon giu date range, bo 2 dong cuoi.

---

#### Buoc 3: End Event

1. Ket noi **Change Object** toi **End Event**
2. **Return variable**: `olapFilter`

---

### 8.4 Day la microflow don gian thu 2

Chi can 1 Change Object activity va 1 End Event. Thuong duoc goi tu nut "Reset Filters" tren UI.

---

## 9. Error Handling chung

### 9.1 Chien luoc Error Handling

```
Cap do 1: Microflow-level error handler (bac nhat cho tat ca)
Cap do 2: Activity-level error handler (cho REST call, JA call)
Cap do 3: Custom error handling trong business logic
```

### 9.2 Cau hinh Microflow-level Error Handler

Cho **MF 1 (OLAP_GetSalesData)** va **MF 4 (OLAP_GetFilterOptions)**:

1. Click phai vao background trang cua microflow editor
2. Chon **Add error handler**
3. Mot **Error Event** (hinh tam giac vang) xuat hien
4. Keo cac activity sau error event:

**Activity 1: Log Message**
- **Log level**: `Error`
- **Message**:
  ```
  'OLAP Error in ' + $microflowName + ': ' + $latestError/Message
  ```
- **Category**: `SalesOLAP`

**Activity 2: End Event (cho MF tra ve List)**
- Return `empty`

**Activity 2 alt: End Event (cho MF tra ve Object)**
- Return `empty`

### 9.3 Cau hinh Activity-level Error Handler

Cho **Call REST** activity:

1. Click vao **Call REST** activity
2. Trong **Properties** panel, mo rong **Error handling**
3. Cau hinh:
   - **Error handling type**: `Custom without rollback`
   - **On error**: Chon activity tiep theo trong error flow

> **Tai sao `Custom without rollback`?** Vi NPE khong co database transaction, rollback khong co y nghia.

### 9.4 Variable `$latestError`

Mendix tu dong cung cap variable `$latestError` trong error handler flow:
- `$latestError/Message` : Loi message
- `$latestError/Stacktrace` : Stack trace (optional, co the log)

### 9.5 Error handling cho tung Microflow

| Microflow                  | Error return                | Ghi chu                         |
|----------------------------|-----------------------------|---------------------------------|
| OLAP_GetSalesData          | `empty` (List)              | UI hien thi "Khong co du lieu"  |
| OLAP_DrillDown             | `empty` (List)              | UI giu nguyen trang thai cu     |
| OLAP_RollUp                | `empty` (List)              | UI giu nguyen trang thai cu     |
| OLAP_GetFilterOptions      | `empty` (List)              | Dropdown rong                   |
| OLAP_InitializeFilter      | Tao filter mac dinh anyway  | Khong can error handler         |
| OLAP_ChangeDimension       | `empty` (List)              | UI hien thi "Khong co du lieu"  |
| OLAP_ResetFilters          | Tra ve olapFilter nhu cu    | Khong can error handler         |

---

## 10. Tips & Troubleshooting

### 10.1 Nhung loi thuong gap

**Loi 1: "Entity is not persistable"**
- Nguyen nhan: NPE khong the commit vao database
- Giai phap: Khong dung **Commit** activity cho NPE. Chi dung **Create Object** va **Change Object** (khong tick "Commit").

**Loi 2: "Association not found"**
- Nguyen nhen: Quen tao association giua cac NPE
- Giai phap: Kiem tra lai domain model, dam bao cac association da duoc tao dung huong.

**Loi 3: Import Mapping tra ve empty**
- Nguyen nhen: JSON response tu ES khong khop voi Import Mapping
- Giai phap:
  1. Dung Postman/ curl test ES query truoc
  2. Check Import Mapping co dung structure khong
  3. Enable **Log REST request/response** trong Mendix (Project Settings > Log levels > REST > Trace)

**Loi 4: JA_BuildEsAggregationQuery tra ve empty string**
- Nguyen nhen: Thieu dependency hoac parameter null
- Giai phap: Check Java Action implementation, dam bao tat ca dependencies duoc deploy.

### 10.2 Debug tips

1. **Set breakpoint**: Click phai vao activity > **Set breakpoint**. Khi chay, Mendix se dung tai breakpoint va cho xem gia tri cac variable.

2. **Log intermediate values**: Them **Log message** activity giua cac buoc:
   ```
   'Query JSON: ' + $queryJson
   ```
   ```
   'ES URL: ' + $esUrl
   ```
   ```
   'Bucket count: ' + toString(length($bucketList))
   ```

3. **Check microflow return**: Luon kiem tra return type va return variable cua End Event.

### 10.3 Performance tips

1. **Gioi han bucket size**: Trong ES query, dat `"size": 100` cho terms aggregation de tranh qua tai.

2. **Cache OlapConfig**: Retrieve OlapConfig 1 lan, khong can retrieve nhieu lan trong cung mot microflow chain.

3. **NPE lifecycle**: NPE chi ton tai trong memory trong mot request. Neu can giu du lieu qua nhieu request, dung Persistent Entity hoac session storage.

### 10.4 Checklist truoc khi chay

- [ ] Tat ca NPE da duoc tao dung attributes
- [ ] Tat ca associations da duoc tao dung huong (1-1, 1-*)
- [ ] OlapConfig da co record trong database (hoac duoc khoi tao)
- [ ] Elasticsearch dang chay tai `http://localhost:9200`
- [ ] Index `sales_olap` da ton tai va co data
- [ ] Java Action `JA_BuildEsAggregationQuery` da duoc implement va deploy
- [ ] Import Mapping da duoc tao va test voi sample JSON
- [ ] Tat ca microflow return type dung
- [ ] Error handler da duoc cau hinh cho REST call

### 10.5 Thu tu tao Microflow (khuyen nghi)

Thu tu nay dam bao cac dependency da san sang truoc khi tao microflow goi no:

```
1. OLAP_InitializeFilter     (khong phu thuoc)
2. OLAP_ResetFilters         (khong phu thuoc)
3. OLAP_GetSalesData         (MAIN - phu thuoc JA + REST)
4. OLAP_GetFilterOptions     (phu thuoc REST)
5. OLAP_ChangeDimension      (goi OLAP_GetSalesData)
6. OLAP_DrillDown            (goi OLAP_GetSalesData)
7. OLAP_RollUp               (goi OLAP_GetSalesData)
```

---

## Phu luc A: Bang tong hop cac Microflow

| # | Microflow               | Parameters                                      | Return                          | Mo ta                              |
|---|-------------------------|-------------------------------------------------|---------------------------------|------------------------------------|
| 1 | OLAP_GetSalesData       | `olapFilter` (OlapFilter)                      | `List<SalesAggregateResult>`   | Main: Goi ES, map ket qua          |
| 2 | OLAP_DrillDown          | `olapFilter`, `selectedDimensionValue` (String) | `List<SalesAggregateResult>`   | Drill down vao chieu chi tiet hon  |
| 3 | OLAP_RollUp             | `olapFilter` (OlapFilter)                      | `List<SalesAggregateResult>`   | Roll up len cap cha                |
| 4 | OLAP_GetFilterOptions   | `filterField` (String)                         | `List<String>`                  | Lay gia tri cho UI dropdown        |
| 5 | OLAP_InitializeFilter   | (none)                                          | `OlapFilter`                    | Khoi tao filter mac dinh           |
| 6 | OLAP_ChangeDimension    | `olapFilter`, `newDimension` (String)           | `List<SalesAggregateResult>`   | Chuyen sang chieu phan tich moi    |
| 7 | OLAP_ResetFilters       | `olapFilter` (OlapFilter)                      | `OlapFilter`                    | Reset tat ca filter                |

## Phu luc B: Bang mapping Dimension - Filter - Level

| Dimension  | Level 0 (Top)    | Level 1            | Level 2            | Level 3          |
|------------|-------------------|--------------------|--------------------|-------------------|
| product    | (tong hop)        | categoryFilter     | productFilter      | variantSkuFilter  |
| time       | (tong hop)        | yearFilter         | quarterFilter      | monthFilter       |
| customer   | (tong hop)        | segmentFilter      | -                  | -                 |
| geography  | (tong hop)        | countryFilter      | regionFilter       | cityFilter        |

## Phu luc C: Bang mapping ES field names

| Filter Field (Mendix) | ES Field Name for Terms Agg   | Raw ES Type   | Ghi chu                                              |
|------------------------|-------------------------------|---------------|------------------------------------------------------|
| categoryFilter         | `category_name`               | keyword       | OK - khong can `.keyword` suffix                     |
| productFilter          | `product_name.keyword`        | text+keyword  | **PHAI DUNG** `.keyword` suffix cho terms agg        |
| variantSkuFilter       | `variant_sku`                 | keyword       | OK - khong can `.keyword` suffix                     |
| yearFilter             | `year`                        | integer       | Dung cho term query (khong phai terms agg)           |
| quarterFilter          | `quarter`                     | integer       | Dung cho term query (khong phai terms agg)           |
| monthFilter            | `month`                       | integer       | Dung cho term query (khong phai terms agg)           |
| segmentFilter          | `customer_segment`            | keyword       | OK - khong can `.keyword` suffix                     |
| countryFilter          | `country_name`                | keyword       | OK - khong can `.keyword` suffix                     |
| regionFilter           | `country_region`              | keyword       | OK - khong can `.keyword` suffix                     |
| cityFilter             | `city_name`                   | keyword       | OK - khong can `.keyword` suffix                     |
| storeFilter            | `store_name.keyword`          | text+keyword  | **PHAI DUNG** `.keyword` suffix cho terms agg        |

> **Quy tac chung**: Cac field co type `text` trong ES mapping se co sub-field `.keyword` (duoc dinh nghia boi mapping). Khi dung cho `terms` aggregation hoac `term` query chinh xac, **phai** dung ten field kem `.keyword` suffix (vi du: `product_name.keyword`, `store_name.keyword`). Cac field da la `keyword` type thuoc tinh (vi du: `category_name`, `variant_sku`, `country_name`) khong can `.keyword` suffix.

---

> **Ket luan**: Huong dan nay cung cap tat ca 7 microflow can thiet cho module SalesOLAP voi chi tiet tung buoc tao trong Mendix Studio Pro v10. Theo dung thu tu tao nhu muc [10.5](#105-thu-tu-tao-microflow-khuyen-nghi) de dam bao moi phu thuoc duoc giai quyet dung cach.
