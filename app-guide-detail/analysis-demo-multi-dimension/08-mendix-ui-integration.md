# 08 - Mendix UI Integration (Studio Pro v10)

> **CRITICAL - ARCHITECTURE CHANGE (Read before implementing)**
>
> This guide uses a **NPE Association data source** pattern for Data Grid 2 and Chart widgets — NOT a direct Microflow data source. The architecture works as follows:
>
> 1. **Domain Model change required** (see `05-mendix-domain-model-guide.md`): Add a **Reference Set association** `OlapFilter_Results` from `OlapFilter` (1) to `SalesAggregateResult` (*) in the SalesOLAP domain model.
>
> 2. **Data Grid 2 data source**: Uses **Association** path `OlapFilter/SalesOLAP.OlapFilter_Results/SalesOLAP.SalesAggregateResult` — NOT a Microflow directly on the grid. The grid auto-refreshes whenever the association on OlapFilter changes.
>
> 3. **Nanoflows modify OlapFilter attributes and call the microflow**: Each nanoflow (NF_DrillDown, NF_RollUp, etc.) modifies OlapFilter attributes (drillLevel, selectedKey, etc.) and then calls `OLAP_GetSalesData`, which internally populates the `OlapFilter_Results` association with `SalesAggregateResult` objects. The Data Grid 2 detects the association change and auto-refreshes.
>
> 4. **Chart widget**: Shares the same association data source as Data Grid 2 — no separate ES call.
>
> **Why this pattern?** In Mendix v10, Data Grid 2 with a Microflow data source does NOT auto-refresh when nanoflows modify the parent context object. The association-based approach is the most Mendix-idiomatic solution for NPE + microflow data refresh.

## 1. Tổng quan

Guide này hướng dẫn tạo UI pages và tích hợp widgets trong Mendix Studio Pro v10 cho module **SalesOLAP**. Mọi entity đều là **Non-Persistent Entity (NPE)**, data được load từ Elasticsearch qua Microflow.

### 1.1 Microflow sẵn có

| Microflow | Input | Output | Mô tả |
|-----------|-------|--------|--------|
| `OLAP_InitializeFilter` | - | `OlapFilter` | Tạo filter mặc định |
| `OLAP_GetSalesData` | `OlapFilter` | `Nothing` (void) | Gọi ES, tạo SalesAggregateResult objects, populate association `OlapFilter_Results`. Data Grid 2 auto-refresh qua association. |
| `OLAP_DrillDown` | `OlapFilter`, `selectedKey` (String) | `Nothing` (void) | Modify OlapFilter (set selectedKey, increment drillLevel), gọi ES, populate association |
| `OLAP_RollUp` | `OlapFilter` | `Nothing` (void) | Modify OlapFilter (decrement drillLevel, clear selectedKey), gọi ES, populate association |
| `OLAP_ChangeDimension` | `OlapFilter`, `newDimension` (String) | `Nothing` (void) | Modify OlapFilter (set drillDimension, reset drillLevel), gọi ES, populate association |
| `OLAP_ResetFilters` | `OlapFilter` | `Nothing` (void) | Reset tất cả filter attributes in-place về mặc định, gọi ES, populate association |

### 1.2 NPE Attributes

**SalesAggregateResult:**

| Attribute | Type | Mô tả |
|-----------|------|--------|
| `dimensionValue` | String | Giá trị key (dùng trong filter) |
| `dimensionLabel` | String | Label hiển thị UI |
| `totalRevenue` | Decimal | Tổng doanh thu |
| `totalQuantity` | Integer | Tổng số lượng |
| `transactionCount` | Integer | Số transaction |
| `avgOrderValue` | Decimal | Giá trị trung bình / đơn |
| `drillDownLevel` | Integer | Level hiện tại (0, 1, 2...) |
| `parentKey` | String | Key của parent dimension |
| `hasChildren` | Boolean | Có thể drill-down tiếp không |

**OlapFilter:**

| Attribute | Type | Mô tả |
|-----------|------|--------|
| `drillDimension` | String | Dimension đang phân tích |
| `drillLevel` | Integer | Level drill-down hiện tại |
| `selectedKey` | String | Key đang được chọn |
| `yearFilter` | Integer | Filter theo năm |
| `quarterFilter` | Integer | Filter theo quý |
| `monthFilter` | Integer | Filter theo tháng |
| `categoryFilter` | String | Filter theo category |
| `productFilter` | String | Filter theo product |
| `customerFilter` | String | Filter theo customer |
| `segmentFilter` | String | Filter theo segment |
| `countryFilter` | String | Filter theo country |
| `regionFilter` | String | Filter theo region (Geography drill-down Level 1→2, ES field: `country_region`) |
| `cityFilter` | String | Filter theo city |
| `storeFilter` | String | Filter theo store |
| `dateFrom` | DateTime | Filter từ ngày |
| `dateTo` | DateTime | Filter đến ngày |

**Association (required in Domain Model):**

| Association | Parent | Child | Type | Mô tả |
|-------------|--------|-------|------|--------|
| `OlapFilter_Results` | `OlapFilter` (1) | `SalesAggregateResult` (*) | Reference Set | OlapFilter chứa danh sách kết quả aggregate. Data Grid 2 và Chart đọc data qua association này. |

> **QUAN TRỌNG:** Association `OlapFilter_Results` phải được tạo trong Domain Model (file `05-mendix-domain-model-guide.md`) trước khi triển khai UI này. OLAP_GetSalesData microflow sẽ tạo SalesAggregateResult objects và associate chúng với OlapFilter qua association này.

### 1.3 Layout page mục tiêu

```
┌─────────────────────────────────────────────────────┐
│  Sales OLAP - Multi-Dimension Analysis              │
├─────────────────────────────────────────────────────┤
│  ┌─ Filter Bar ──────────────────────────────────┐  │
│  │ [Dimension: ▼ product]  [Year: ▼] [Category: ▼]│ │
│  │ [Segment: ▼] [Country: ▼]                     │  │
│  │ [Date From: ___] [Date To: ___]                │  │
│  │ [🔍 Apply] [🔄 Reset]                          │  │
│  └────────────────────────────────────────────────┘  │
│                                                     │
│  ┌─ Navigation Bar ──────────────────────────────┐  │
│  │ ← Roll Up  |  Level: Category  |  Drill: →    │  │
│  └────────────────────────────────────────────────┘  │
│                                                     │
│  ┌─ Data Grid ───────────────────────────────────┐  │
│  │ Dimension    │ Revenue    │ Qty  │ Txns │ Avg  │  │
│  │──────────────│────────────│──────│──────│──────│  │
│  │ Electronics  │ 150B VND   │ 5000 │ 5000 │ 30M  │  │
│  │ Clothing     │  80B VND   │ 3000 │ 3000 │ 26M  │  │
│  │ Food         │  50B VND   │ 2000 │ 2000 │ 25M  │  │
│  │ ▶ Click to drill down...                      │  │
│  └────────────────────────────────────────────────┘  │
│                                                     │
│  ┌─ Chart ────────────────────────────────────────┐  │
│  │  [Bar Chart: Revenue by Dimension]             │  │
│  │  ████                                          │  │
│  │  ████████                                      │  │
│  │  ████████████                                  │  │
│  └────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## 2. Tạo Enumeration

> **Lưu ý:** `drillDimension` là kiểu String. Microflow guide sử dụng giá trị **lowercase** (`'product'`, `'time'`, `'customer'`, `'geography'`). Nếu dùng String attribute (khuyến nghị), dropdown values phải là lowercase. Nếu dùng Enumeration, enum values là PascalCase nhưng phải convert sang lowercase khi truyền vào microflow. Cách đơn giản nhất là dùng String với static values lowercase.

Trước khi tạo page, cần tạo Enumeration trong module SalesOLAP (nếu chọn dùng Enumeration thay vì String).

### 2.1 Enumeration `SalesOLAP_DimensionType`

**Cách tạo:**
1. Trong **Project Explorer**, right-click module **SalesOLAP**
2. Chọn **Add other** → **Enumeration**
3. Đặt tên: `SalesOLAP_DimensionType`
4. Thêm các giá trị (Click **New**):

| Name | Caption | Mô tả |
|------|---------|--------|
| `Product` | Product | Phân tích theo sản phẩm |
| `Time` | Time | Phân tích theo thời gian |
| `Customer` | Customer | Phân tích theo khách hàng |
| `Geography` | Geography | Phân tích theo địa lý |

> **Cảnh báo:** Nếu dùng Enumeration cho `drillDimension`, cần thêm logic convert enum value sang lowercase string trước khi truyền vào microflow (ví dụ: `toString($currentObject/drillDimension)` sẽ trả về `'Product'`, cần convert sang `'product'`). Khuyến nghị: dùng String attribute với static dropdown values lowercase để tránh mismatch.

### 2.2 Enumeration `SalesOLAP_TimeLevel`

**Cách tạo:** tương tự trên

| Name | Caption | Mô tả |
|------|---------|--------|
| `Year` | Year | Tổng theo năm |
| `Quarter` | Quarter | Tổng theo quý |
| `Month` | Month | Tổng theo tháng |
| `Date` | Date | Chi tiết theo ngày |

---

## 3. Tạo Nanoflows

Nanoflows chạy trên client, đóng vai trò bridge giữa UI widgets và Microflows (chạy trên server).

### 3.1 NF_InitializePage

**Mục đích:** Khởi tạo OlapFilter và load data lần đầu.

**Cách tạo:**
1. Right-click module **SalesOLAP** → **Add nanoflow**
2. Đặt tên: `NF_InitializePage`
3. Return type: `OlapFilter`

**Steps trong Nanoflow:**

```
┌──────────────────────┐
│ Start Event          │
│ Return: OlapFilter   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Microflow Call       │
│ Activity             │
│                      │
│ Call:                │
│ OLAP_InitializeFilter│
│ Output: olapFilter   │
│ (OlapFilter)         │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Microflow Call       │
│                      │
│ Call:                │
│ OLAP_GetSalesData    │
│ Input: $olapFilter   │
│ (Populates          │
│  association)        │
│ No output (void)     │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ End Event            │
│ Return: $olapFilter  │
└──────────────────────┘
```

**Chi tiết cấu hình:**
- **Microflow Call 1**: Trong Properties panel:
  - **Microflow**: `SalesOLAP.OLAP_InitializeFilter`
  - **Output**: Variable name = `olapFilter`, Type = `OlapFilter`
- **Microflow Call 2**: Load initial data into association:
  - **Microflow**: `SalesOLAP.OLAP_GetSalesData`
  - **Input**: `$olapFilter`
  - **Output**: None (void) — microflow populates `OlapFilter_Results` association
- **End Event**: Return value = `$olapFilter`

### 3.2 NF_ApplyFilters

**Mục đích:** Gọi OLAP_GetSalesData để populate association khi user thay đổi filter. Data Grid 2 auto-refresh qua association.

**Return type:** `Nothing` (void)

**Cách tạo:**
1. Right-click module **SalesOLAP** → **Add nanoflow**
2. Đặt tên: `NF_ApplyFilters`
3. Return type: Nothing

**Parameters:**
- `olapFilter` (Type: `OlapFilter`)

**Steps trong Nanoflow:**

```
┌──────────────────────┐
│ Start Event          │
│ Param: olapFilter    │
│ (OlapFilter)         │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Microflow Call       │
│                      │
│ Call:                │
│ OLAP_GetSalesData    │
│ Input: $olapFilter   │
│ No output (void)     │
│ (Populates           │
│  association)        │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ End Event            │
│ Return: Nothing      │
└──────────────────────┘
```

**Chi tiết cấu hình:**
- **Microflow Call Activity**:
  - **Microflow**: `SalesOLAP.OLAP_GetSalesData`
  - **Input**: `$olapFilter`
  - **Output**: None — microflow populates `OlapFilter_Results` association internally
- **End Event**: No return value (Nothing)

> **Lưu ý:** OLAP_GetSalesData tạo SalesAggregateResult objects và associate chúng với OlapFilter qua `OlapFilter_Results`. Data Grid 2 (đọc qua association) tự động phát hiện thay đổi và refresh.

### 3.3 NF_ResetFilters

**Mục đích:** Reset tất cả filter attributes in-place về mặc định và reload data qua association.

**Return type:** `Nothing` (void)

> **QUAN TRỌNG:** OLAP_ResetFilters phải modify OlapFilter **in-place** (set tất cả attributes về giá trị mặc định trên cùng object), KHÔNG tạo OlapFilter mới. Điều này tránh orphan object cũ và đảm bảo Data View context vẫn hợp lệ.

**Parameters:**
- `olapFilter` (Type: `OlapFilter`)

**Steps trong Nanoflow:**

```
┌──────────────────────┐
│ Start Event          │
│ Param: olapFilter    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Microflow Call       │
│ Call:                │
│ OLAP_ResetFilters    │
│ Input: $olapFilter   │
│ No output (void)     │
│ (Modifies in-place)  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Microflow Call       │
│ Call:                │
│ OLAP_GetSalesData    │
│ Input: $olapFilter   │
│ No output (void)     │
│ (Populates           │
│  association)        │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ End Event            │
│ Return: Nothing      │
└──────────────────────┘
```

**Chi tiết cấu hình:**
- **Microflow Call 1** (Reset in-place):
  - **Microflow**: `SalesOLAP.OLAP_ResetFilters`
  - **Input**: `$olapFilter`
  - **Output**: None — microflow modifies OlapFilter attributes in-place (drillLevel=0, selectedKey='', drillDimension='product', etc.)
- **Microflow Call 2** (Reload data):
  - **Microflow**: `SalesOLAP.OLAP_GetSalesData`
  - **Input**: `$olapFilter` (same object, now with reset attributes)
  - **Output**: None — microflow populates `OlapFilter_Results` association

### 3.4 NF_DrillDown

**Mục đích:** Drill-down khi user click vào một row trong Data Grid. OLAP_DrillDown modifies OlapFilter attributes (set selectedKey, increment drillLevel) và populates association.

**Return type:** `Nothing` (void)

**Parameters:**
- `olapFilter` (Type: `OlapFilter`)
- `selectedResult` (Type: `SalesAggregateResult`)

**Steps trong Nanoflow:**

```
┌──────────────────────┐
│ Start Event          │
│ Param: olapFilter    │
│ Param: selectedResult│
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Microflow Call       │
│ Call:                │
│ OLAP_DrillDown       │
│ Input:               │
│  - $olapFilter       │
│  - $selectedResult/  │
│    dimensionValue    │
│ No output (void)     │
│ (Modifies OlapFilter │
│  + populates         │
│  association)        │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ End Event            │
│ Return: Nothing      │
└──────────────────────┘
```

**Chi tiết cấu hình Microflow Call:**
- **Microflow**: `SalesOLAP.OLAP_DrillDown`
- **Input `OlapFilter`**: `$olapFilter`
- **Input `selectedKey`**: `$selectedResult/dimensionValue`
  - Gõ expression: `$selectedResult/dimensionValue`
- **Output**: None — microflow modifies OlapFilter in-place and populates `OlapFilter_Results` association

### 3.5 NF_RollUp

**Mục đích:** Roll-up lên level trước đó. OLAP_RollUp modifies OlapFilter (decrement drillLevel, clear selectedKey) và populates association.

**Return type:** `Nothing` (void)

**Parameters:**
- `olapFilter` (Type: `OlapFilter`)

**Steps trong Nanoflow:**

```
┌──────────────────────┐
│ Start Event          │
│ Param: olapFilter    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Microflow Call       │
│ Call:                │
│ OLAP_RollUp          │
│ Input: $olapFilter   │
│ No output (void)     │
│ (Modifies OlapFilter │
│  + populates         │
│  association)        │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ End Event            │
│ Return: Nothing      │
└──────────────────────┘
```

**Chi tiết cấu hình Microflow Call:**
- **Microflow**: `SalesOLAP.OLAP_RollUp`
- **Input**: `$olapFilter`
- **Output**: None — microflow modifies OlapFilter in-place and populates `OlapFilter_Results` association

### 3.6 NF_ChangeDimension

**Mục đích:** Chuyển sang phân tích theo dimension khác. OLAP_ChangeDimension modifies OlapFilter (set drillDimension, reset drillLevel) và populates association.

**Return type:** `Nothing` (void)

**Parameters:**
- `olapFilter` (Type: `OlapFilter`)
- `newDimension` (Type: `String`)

**Steps trong Nanoflow:**

```
┌──────────────────────┐
│ Start Event          │
│ Param: olapFilter    │
│ Param: newDimension  │
│ (String)             │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Microflow Call       │
│ Call:                │
│ OLAP_ChangeDimension │
│ Input:               │
│  - $olapFilter       │
│  - $newDimension     │
│ No output (void)     │
│ (Modifies OlapFilter │
│  + populates         │
│  association)        │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ End Event            │
│ Return: Nothing      │
└──────────────────────┘
```

**Chi tiết cấu hình Microflow Call:**
- **Microflow**: `SalesOLAP.OLAP_ChangeDimension`
- **Input `OlapFilter`**: `$olapFilter`
- **Input `newDimension`**: `$newDimension`
- **Output**: None — microflow modifies OlapFilter in-place and populates `OlapFilter_Results` association

---

## 4. Tạo Page SalesOLAP_Overview

### 4.1 Bước 1: Tạo Page

**Cách thực hiện:**
1. Trong **Project Explorer**, right-click module **SalesOLAP**
2. Chọn **Add page**
3. Trong dialog:
   - **Page name**: `SalesOLAP_Overview`
   - **Layout**: `Atlas_Default` (hoặc layout tùy chỉnh có sidebar)
   - **Navigation**: Tick vào mục muốn hiển thị trong navigation
4. Click **OK**

**Page properties:**
- **Title**: `Sales OLAP - Multi-Dimension Analysis`
- **Width**: Responsive (full-width)
- Trong **Properties** panel → **General** → **Page title** = `Sales OLAP - Multi-Dimension Analysis`

### 4.2 Bước 2: Data View bọc ngoài (OlapFilter Context)

Mọi UI element cần `OlapFilter` context. Ta dùng Data View để tạo context này.

**Cách thực hiện:**
1. Mở page `SalesOLAP_Overview`
2. Từ **Toolbox** panel (bên phải), kéo widget **Data View** vào page
3. Cấu hình Data View:

| Property | Value |
|----------|-------|
| **Data source** | Nanoflow |
| **Nanoflow** | `SalesOLAP.NF_InitializePage` |
| **Entity** | `SalesOLAP.OlapFilter` |

**Chi tiết cấu hình Data View:**
1. Click vào Data View widget
2. Trong **Properties** panel → tab **Data source**:
   - **Source type**: Nanoflow
   - **Nanoflow**: Click **Select** → chọn `NF_InitializePage`
3. Xóa default contents bên trong Data View (nếu có)

> **Lưu ý:** Data View này là "container" cho toàn bộ UI. Mọi widget bên trong đều truy cập được `$currentObject` (OlapFilter).

### 4.3 Bước 3: Filter Bar

Thêm filter controls bên trong Data View. Sử dụng **Layout Grid** để chia cột.

#### 3a. Thêm Layout Grid

1. Kéo **Layout Grid** (3 cột) vào Data View
2. Chọn template: **Full width** hoặc **3 equal columns**

```
Layout Grid (3 columns)
┌─────────────┬─────────────┬─────────────┐
│  Col 1/3    │  Col 1/3    │  Col 1/3    │
└─────────────┴─────────────┴─────────────┘
```

#### 3b. Dropdown: drillDimension

**Cách thực hiện:**
1. Kéo widget **Dropdown** (Reference Selector) vào Column 1
2. Cấu hình Properties:

| Property | Value |
|----------|-------|
| **Attribute** | `$currentObject/drillDimension` |
| **Label** | `Dimension` |
| **Empty option text** | `-- Select --` |

**Cách tạo dropdown values (Option 1 - Enumeration):**
- Nếu `drillDimension` dùng Enumeration `SalesOLAP_DimensionType`:
  - Reference Selector tự động hiển thị enum values

**Cách tạo dropdown values (Option 2 - Static values):**
- Nếu `drillDimension` là String, dùng widget **Drop Down** từ Toolbox:
  - Trong Properties → **Selectable objects** → **Enumerate**:
    - `product` → `Product` (giá trị lowercase, caption hiển thị PascalCase)
    - `time` → `Time`
    - `customer` → `Customer`
    - `geography` → `Geography`

**Event handler:**
- **On change**: KHÔNG gắn event handler (xóa nếu có)
- Dimension change được xử lý bởi **Dimension Selector Tabs** (Section 4d) — không dùng dropdown on-change để tránh double trigger
- Dropdown này chỉ hiển thị giá trị hiện tại, **Read-only**: Yes

#### 3c. Dropdown: yearFilter

> **Lưu ý quan trọng:** `yearFilter` là kiểu **Integer** trong domain model. Drop Down widget phải dùng Integer-compatible values, KHÔNG dùng String values.

1. Kéo widget **Drop Down** vào Column 2
2. Cấu hình:

| Property | Value |
|----------|-------|
| **Attribute** | `$currentObject/yearFilter` (Integer) |
| **Label** | `Year` |
| **Type** | Integer drop down |

Nếu dùng Drop Down với static values (Integer):
- **Selectable objects** → **Enumerate** (type: Integer):
  - Option 1: Value = `2022` (Integer, không có quotes), Caption = `2022`
  - Option 2: Value = `2023` (Integer), Caption = `2023`
  - Option 3: Value = `2024` (Integer), Caption = `2024`

> **Cách cấu hình:** Trong Drop Down Properties → **Selectable objects** → chọn **Enumerate** → thêm các options với **Type** = Integer, không phải String. Nếu widget không hỗ trợ Integer enumerate trực tiếp, dùng **Reference Selector** với một NPE hoặc dùng **Text Box** với validation expression: `isMatch($currentObject/yearFilter, '[0-9]{4}')`.

#### 3d. Dropdown: categoryFilter

1. Kéo widget **Text Box** vào Column 3
2. Cấu hình:

| Property | Value |
|----------|-------|
| **Attribute** | `$currentObject/categoryFilter` |
| **Label** | `Category` |
| **Placeholder** | `All categories` |

#### 3e. Thêm Layout Grid dòng 2

1. Kéo thêm **Layout Grid** (3 cột) vào Data View, bên dưới Layout Grid đầu tiên

```
Row 1: [Dimension ▼] [Year ▼] [Category ▼]
Row 2: [Segment ▼]   [Country ▼] [_______]
Row 3: [Date From]    [Date To]   [_______]
```

#### 3f. Dropdown: segmentFilter

| Property | Value |
|----------|-------|
| **Attribute** | `$currentObject/segmentFilter` |
| **Label** | `Segment` |
| **Placeholder** | `All segments` |

Static values (Enumerate):
- `B2B` → `B2B`
- `B2C` → `B2C`
- `Enterprise` → `Enterprise`

#### 3g. Dropdown: countryFilter

| Property | Value |
|----------|-------|
| **Attribute** | `$currentObject/countryFilter` |
| **Label** | `Country` |
| **Placeholder** | `All countries` |

#### 3h. Date Pickers: dateFrom, dateTo

1. Kéo widget **Date Picker** vào columns

**dateFrom:**

| Property | Value |
|----------|-------|
| **Attribute** | `$currentObject/dateFrom` |
| **Label** | `From Date` |
| **Date format** | `dd/MM/yyyy` |

**dateTo:**

| Property | Value |
|----------|-------|
| **Attribute** | `$currentObject/dateTo` |
| **Label** | `To Date` |
| **Date format** | `dd/MM/yyyy` |

#### 3i. Buttons: Apply và Reset

1. Kéo **Action Button** vào Layout Grid (dòng cuối của Filter Bar)

**Apply Button:**

| Property | Value |
|----------|-------|
| **Caption** | `Apply` |
| **Icon** | `search` (từ Atlas icon set) |
| **Style** | `btn-primary` (nền xanh) |
| **On click** | Call nanoflow |
| **Nanoflow** | `SalesOLAP.NF_ApplyFilters` |

**Cách cấu hình On Click:**
1. Click vào button → Properties → **Events** → **On click**
2. Chọn **Call a nanoflow**
3. Chọn `NF_ApplyFilters`
4. Nanoflow tự động nhận `OlapFilter` từ Data View context

**Reset Button:**

| Property | Value |
|----------|-------|
| **Caption** | `Reset` |
| **Icon** | `refresh` (từ Atlas icon set) |
| **Style** | `btn-default` (nền xám) |
| **On click** | Call nanoflow |
| **Nanoflow** | `SalesOLAP.NF_ResetFilters` |

**Kết quả Filter Bar:**

```
┌─────────────────────────────────────────────────────────┐
│  Dimension: [▼ Product ▼]  Year: [▼ 2024 ▼]            │
│  Category: [▼ All ▼]      Segment: [▼ All ▼]           │
│  Country:  [▼ All ▼]       From: [__.__.____]           │
│                            To:   [__.__.____]           │
│  [🔍 Apply]   [🔄 Reset]                                │
└─────────────────────────────────────────────────────────┘
```

### 4.4 Bước 4: Navigation Bar (Breadcrumb + Roll Up + Dimension Tabs)

Thêm section điều hướng phía trên Data Grid.

#### 4a. Thêm Container

1. Kéo **Container** vào Data View, bên dưới Filter Bar
2. Add **CSS class**: `nav-bar` (tuỳ chọn, để styling)

#### 4b. Roll Up Button

1. Kéo **Action Button** vào Container

| Property | Value |
|----------|-------|
| **Caption** | `← Roll Up` |
| **Style** | `btn-link` (button dạng link) |
| **On click** | Call nanoflow |
| **Nanoflow** | `SalesOLAP.NF_RollUp` |

#### 4c. Breadcrumb Text

1. Kéo **Text** widget vào Container (cùng dòng với Roll Up)
2. Hiển thị current drill level:

**Expression:**
```
'Level: ' + toString($currentObject/drillLevel) +
' | Dimension: ' + if $currentObject/drillDimension = '' then 'product' else $currentObject/drillDimension
```

#### 4d. Dimension Selector Tabs

Sử dụng **Tab Container** hoặc các buttons để chọn dimension.

**Cách dùng buttons:**

1. Kéo 4 **Action Buttons** vào Container, nằm cùng dòng

| Button | On Click Nanoflow | Parameter |
|--------|-------------------|-----------|
| `[Product]` | `NF_ChangeDimension` | `'product'` |
| `[Time]` | `NF_ChangeDimension` | `'time'` |
| `[Customer]` | `NF_ChangeDimension` | `'customer'` |
| `[Geography]` | `NF_ChangeDimension` | `'geography'` |

**Cách truyền parameter:**
1. Click button → Properties → **On click** → **Call nanoflow** → chọn `NF_ChangeDimension`
2. Nanoflow có 2 parameters: `olapFilter` (tự map từ context) và `newDimension` (cần set)
3. Trong **Parameters** dialog:
   - `olapFilter`: `$currentObject` (auto-filled)
   - `newDimension`: Gõ `'product'` (literal string, lowercase)

**Highlight active tab:**
- Dùng **Conditional visibility**:
  - Tab "Product" visible khi: `$currentObject/drillDimension = 'product'`
  - Thêm class `btn-primary` cho active, `btn-default` cho inactive

**Kết quả Navigation Bar:**

```
┌─────────────────────────────────────────────────────────┐
│  [← Roll Up]  Level: 0 | Dimension: Product             │
│  [Product*]  [Time]  [Customer]  [Geography]             │
└─────────────────────────────────────────────────────────┘
```

### 4.5 Bước 5: Data Grid 2 (SalesAggregateResult)

Đây là thành phần chính hiển thị dữ liệu OLAP. Data Grid 2 đọc data qua association từ OlapFilter.

#### 5a. Thêm Data Grid 2

1. Kéo widget **Data Grid 2** từ Toolbox vào Data View (bên trong DataView chứa OlapFilter)
   - **Bắt buộc dùng Data Grid 2** (không dùng legacy Data Grid) để hỗ trợ association data source cho NPE

#### 5b. Cấu hình Data Source (Association Pattern)

> **QUAN TRỌNG:** Data Grid 2 dùng **association** data source, KHÔNG dùng microflow trực tiếp. Nanoflows gọi microflow để populate association, Data Grid 2 auto-refresh khi association thay đổi.

| Property | Value |
|----------|-------|
| **Data source** | Database |
| **Entity** | `SalesOLAP.SalesAggregateResult` |
| **Path** | Via association from Data View context |

**Cách cấu hình chi tiết:**
1. Click Data Grid 2 → Properties → **Data source**
2. **Source type**: Database
3. **Entity**: Click **Select** → chọn `SalesOLAP.SalesAggregateResult`
4. **Context**: Vì Data Grid 2 nằm trong Data View (OlapFilter), chọn path qua association:
   - Trong **Constraint** hoặc **Path**: `SalesOLAP.OlapFilter_Results/SalesOLAP.SalesAggregateResult`
   - Hoặc: chọn association `OlapFilter_Results` từ context object
5. **Listen to widget**: Chọn Data View cha (OlapFilter) — đảm bảo grid refresh khi OlapFilter thay đổi

**Tại sao dùng association thay vì microflow trực tiếp?**
- Trong Mendix v10, Data Grid 2 với Microflow data source KHÔNG tự refresh khi nanoflows modify context object
- Association data source tự động phát hiện thay đổi khi OLAP_GetSalesData populate association `OlapFilter_Results`
- Đây là pattern chuẩn Mendix cho NPE + microflow data refresh

#### 5c. Thêm Columns

**Cách thêm columns:**
1. Click vào Data Grid header area
2. Chọn **Add column** hoặc kéo từ Toolbox

**Column 1: Dimension Label**

| Property | Value |
|----------|-------|
| **Header** | `Dimension` |
| **Attribute** | `dimensionLabel` |
| **Width** | `30%` |
| **Sortable** | Yes |

**Column 2: Total Revenue**

| Property | Value |
|----------|-------|
| **Header** | `Revenue (VND)` |
| **Attribute** | `totalRevenue` |
| **Width** | `25%` |
| **Sortable** | Yes |
| **Format** | Custom number format |
| **Decimal places** | 0 |
| **Thousands separator** | Yes |

**Format expression cho Revenue:**
- Trong column properties → **Display** → **Format**:
  - Pattern: `¤ #,##0` (hiển thị VND với dấu phẩy)
  - Hoặc dùng custom formatter: `'$' + formatDecimal($currentObject/totalRevenue, '#,##0')`

**Column 3: Total Quantity**

| Property | Value |
|----------|-------|
| **Header** | `Quantity` |
| **Attribute** | `totalQuantity` |
| **Width** | `15%` |
| **Sortable** | Yes |
| **Format** | `#,##0` |

**Column 4: Transaction Count**

| Property | Value |
|----------|-------|
| **Header** | `Transactions` |
| **Attribute** | `transactionCount` |
| **Width** | `15%` |
| **Sortable** | Yes |
| **Format** | `#,##0` |

**Column 5: Average Order Value**

| Property | Value |
|----------|-------|
| **Header** | `Avg Order Value` |
| **Attribute** | `avgOrderValue` |
| **Width** | `15%` |
| **Sortable** | Yes |
| **Format** | `¤ #,##0` |

**Column 6: Drill-Down Action (tuỳ chọn)**

| Property | Value |
|----------|-------|
| **Header** | `Action` |
| **Type** | Action button |
| **Caption** | `▶ Drill Down` |
| **Visible** | `$currentObject/hasChildren = true` |

#### 5d. Cấu hình Row Click (Drill Down)

**Cách dùng Data Grid 2:**

1. Click vào row template trong Data Grid 2
2. Properties → **Events** → **On click**
3. **Action**: Call nanoflow → `NF_DrillDown`
4. Parameters tự động map:
   - `olapFilter` = OlapFilter từ DataView context
   - `selectedResult` = `SalesAggregateResult` của row được click
5. Sau khi NF_DrillDown chạy, OLAP_DrillDown modifies OlapFilter + populates association → Data Grid 2 auto-refresh

> **Lưu ý:** NF_DrillDown trả về Nothing (void). Data Grid refresh thông qua association change, không phải nanoflow return value.

#### 5e. Conditional Visibility cho Drill-Down Button

Nếu dùng button "▶ Drill Down" thay vì row click:

1. Click button → Properties → **Visibility**
2. **Visible**: Based on expression
3. **Expression**: `$currentObject/hasChildren = true`

**Kết quả Data Grid:**

```
┌──────────────────────────────────────────────────────────────────┐
│ Dimension      │ Revenue (VND) │ Quantity │ Txns │ Avg Value    │
│────────────────│───────────────│──────────│──────│──────────────│
│ Electronics    │ 150,000,000   │  5,000   │ 5000 │  30,000,000  │
│ Clothing       │  80,000,000   │  3,000   │ 3000 │  26,666,667  │
│ Food           │  50,000,000   │  2,000   │ 2000 │  25,000,000  │
│ ...            │  ...          │  ...     │ ...  │  ...         │
└──────────────────────────────────────────────────────────────────┘
 Click vào row → Drill Down (nếu hasChildren = true)
```

### 4.6 Bước 6: Chart Widget

Thêm chart để visualize data.

> **QUAN TRỌNG:** Chart widget phải dùng **cùng association data source** với Data Grid 2. KHÔNG dùng separate microflow call — điều này sẽ gây double ES API calls và data không đồng bộ.

#### 6a. Thêm Chart Widget

**Option 1 - Mendix Charts (built-in từ Atlas):**

1. Từ Toolbox, tìm **Charts** widget (hoặc **Any Chart**)
2. Kéo vào Data View, bên dưới Data Grid

**Option 2 - Cài đặt từ Marketplace:**

1. Vào **Marketplace** (trong Studio Pro)
2. Tìm **Charts** hoặc **Any Chart**
3. Click **Download** → import vào project

#### 6b. Cấu hình Bar Chart (Revenue by Dimension)

**Cách cấu hình Charts widget:**

1. Click vào Chart widget → Properties panel
2. **Chart type**: Bar Chart (Vertical)

**Data Source (dùng association — cùng Data Grid 2):**

| Property | Value |
|----------|-------|
| **Source type** | Database |
| **Entity** | `SalesOLAP.SalesAggregateResult` |
| **Path** | `SalesOLAP.OlapFilter_Results/SalesOLAP.SalesAggregateResult` (qua association từ DataView context) |

> **Tại sao không dùng Microflow data source?** Nếu Chart dùng `OLAP_GetSalesData` riêng, mỗi lần nanoflow chạy sẽ gọi ES API 2 lần (1 lần cho Data Grid qua association, 1 lần cho Chart qua microflow). Dùng association data source, cả Data Grid và Chart đọc từ cùng data đã được populate bởi nanoflow — chỉ 1 ES call.

**Cách cấu hình chi tiết:**
1. Click Chart → Properties → **Data source**
2. **Source type**: Database
3. **Entity**: `SalesOLAP.SalesAggregateResult`
4. **Path**: Chọn qua association `OlapFilter_Results` từ DataView context object

**Series Configuration:**

| Property | Value |
|----------|-------|
| **Series type** | Bar |
| **Data source** | SalesAggregateResult (qua association `OlapFilter_Results`) |
| **X-axis attribute** | `dimensionLabel` |
| **Y-axis attribute** | `totalRevenue` |
| **Series name** | `Revenue (VND)` |

**Chart Options:**

| Property | Value |
|----------|-------|
| **Title** | `Revenue by Dimension` |
| **X-axis label** | `Dimension` |
| **Y-axis label** | `Revenue (VND)` |
| **Show legend** | Yes |
| **Show tooltip** | Yes |
| **Enable animation** | Yes |

#### 6c. Thêm Pie Chart (tuỳ chọn - Distribution)

1. Kéo thêm **Charts** widget bên cạnh (dùng Layout Grid 2 cột)
2. **Chart type**: Pie Chart

**Series Configuration:**

| Property | Value |
|----------|-------|
| **Data source** | Database, cùng association path `OlapFilter_Results` |
| **Name attribute** | `dimensionLabel` |
| **Value attribute** | `totalRevenue` |

**Chart Options:**

| Property | Value |
|----------|-------|
| **Title** | `Revenue Distribution` |
| **Show labels** | Yes |
| **Inner size** (donut) | `50%` (để tạo donut chart) |

#### 6d. Layout Grid cho Charts

```
┌─────────────────────────────────────────────────────────┐
│  ┌── Layout Grid (2 columns) ────────────────────────┐  │
│  │  ┌── Col 60% ──────┐  ┌── Col 40% ──────────┐    │  │
│  │  │  Bar Chart       │  │  Pie Chart           │    │  │
│  │  │  Revenue by      │  │  Revenue             │    │  │
│  │  │  Dimension       │  │  Distribution         │    │  │
│  │  └──────────────────┘  └───────────────────────┘    │  │
│  └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Cách tạo layout:**
1. Kéo **Layout Grid** (2 cột, 60/40 split) vào Data View
2. Kéo Bar Chart vào column 60%
3. Kéo Pie Chart vào column 40%

---

## 5. Tổng hợp cấu trúc Page

Cấu trúc hoàn chỉnh của page `SalesOLAP_Overview`:

```
Page: SalesOLAP_Overview
└── Data View (OlapFilter) - source: NF_InitializePage
    │
    ├── [Page Title: "Sales OLAP - Multi-Dimension Analysis"]
    │
    ├── Layout Grid (Filter Bar) - 3 columns x 3 rows
    │   ├── Row 1:
    │   │   ├── Dropdown (read-only): drillDimension (product/time/customer/geography)
    │   │   ├── Dropdown: yearFilter (2022/2023/2024, Integer)
    │   │   └── Dropdown: categoryFilter
    │   ├── Row 2:
    │   │   ├── Dropdown: segmentFilter
    │   │   ├── Dropdown: countryFilter
    │   │   └── (empty or more filters)
    │   └── Row 3:
    │       ├── Date Picker: dateFrom
    │       ├── Date Picker: dateTo
    │       └── Container: [Apply Button] [Reset Button]
    │
    ├── Container (Navigation Bar)
    │   ├── Button: "← Roll Up" → NF_RollUp (void, modifies OlapFilter + populates association)
    │   ├── Text: breadcrumb (Level + Dimension)
    │   └── Container (Dimension Tabs):
    │       ├── Button: "Product" → NF_ChangeDimension('product')
    │       ├── Button: "Time" → NF_ChangeDimension('time')
    │       ├── Button: "Customer" → NF_ChangeDimension('customer')
    │       └── Button: "Geography" → NF_ChangeDimension('geography')
    │
    ├── Data Grid 2 (SalesAggregateResult)
    │   ├── Source: Database → Association OlapFilter_Results (NOT microflow)
    │   ├── Listen to: Data View (OlapFilter)
    │   ├── Column: dimensionLabel ("Dimension")
    │   ├── Column: totalRevenue ("Revenue") - format ¤ #,##0
    │   ├── Column: totalQuantity ("Quantity") - format #,##0
    │   ├── Column: transactionCount ("Transactions") - format #,##0
    │   ├── Column: avgOrderValue ("Avg Value") - format ¤ #,##0
    │   ├── Column: Action Button "▶ Drill Down" → NF_DrillDown
    │   │   └── Visible: hasChildren = true
    │   └── On row click → NF_DrillDown (void, modifies OlapFilter + populates association)
    │
    └── Layout Grid (Charts) - 2 columns (60/40)
        ├── Bar Chart
        │   ├── Source: Database → Association OlapFilter_Results (same as Data Grid 2)
        │   ├── X: dimensionLabel
        │   └── Y: totalRevenue
        └── Pie Chart
            ├── Source: Database → Association OlapFilter_Results (same as Data Grid 2)
            ├── Name: dimensionLabel
            └── Value: totalRevenue
```

---

## 6. Expression & Formatting Reference

### 6.1 Number Formatting

| Attribute | Format Pattern | Ví dụ Output |
|-----------|---------------|--------------|
| `totalRevenue` | `¤ #,##0` | `150,000,000` |
| `totalQuantity` | `#,##0` | `5,000` |
| `transactionCount` | `#,##0` | `3,000` |
| `avgOrderValue` | `¤ #,##0` | `30,000,000` |

### 6.2 Conditional Expressions

**Hiển thị drill-down button chỉ khi có children:**
```
$currentObject/hasChildren = true
```

**Hiển thị Roll Up button chỉ khi drillLevel > 0:**
```
$currentObject/drillLevel > 0
```

**Breadcrumb text hiển thị dimension label:**
```
'Level ' + toString($currentObject/drillLevel) +
' | ' + if $currentObject/drillDimension = '' then 'product' else $currentObject/drillDimension
```

**Hiển thị selected filter:**
```
if $currentObject/categoryFilter = '' then 'All' else $currentObject/categoryFilter
```

### 6.3 Nanoflow Parameter Mapping & Return Types

| Nanoflow | Return Type | Parameter | Expression |
|----------|-------------|-----------|------------|
| `NF_InitializePage` | `OlapFilter` | (none) | — |
| `NF_ApplyFilters` | `Nothing` (void) | `olapFilter` | `$currentObject` (auto) |
| `NF_ResetFilters` | `Nothing` (void) | `olapFilter` | `$currentObject` (auto) |
| `NF_DrillDown` | `Nothing` (void) | `olapFilter` | `$currentObject` (auto) |
| `NF_DrillDown` | | `selectedResult` | Row context (auto) |
| `NF_RollUp` | `Nothing` (void) | `olapFilter` | `$currentObject` (auto) |
| `NF_ChangeDimension` | `Nothing` (void) | `olapFilter` | `$currentObject` (auto) |
| `NF_ChangeDimension` | | `newDimension` | Literal: `'product'` / `'time'` / `'customer'` / `'geography'` |

---

## 7. Tips & Troubleshooting

### 7.1 NPE Data Source

> **QUAN TRỌNG:** Vì `SalesAggregateResult` và `OlapFilter` là **Non-Persistent Entity**, data KHÔNG tồn tại trong database. Tuy nhiên, Data Grid 2 dùng **Database source type qua association** — điều này hoạt động vì Mendix cho phép NPE objects tồn tại trong client memory session. Association `OlapFilter_Results` liên kết NPE objects trong memory.
>
> **Pattern đúng:**
> - Nanoflows gọi Microflows (server-side) → Microflows gọi ES REST API → tạo SalesAggregateResult NPE objects → associate với OlapFilter qua `OlapFilter_Results`
> - Data Grid 2 và Chart đọc data qua association path từ OlapFilter context
> - Data Grid 2 auto-refresh khi association thay đổi
>
> **KHÔNG:**
> - KHÔNG dùng "Database" source type cho NPE không có association
> - KHÔNG dùng Microflow data source trực tiếp trên Data Grid 2 (sẽ không auto-refresh)

### 7.2 Refresh Data sau Drill-Down/Roll-Up

Với association pattern, Data Grid 2 tự động refresh khi association thay đổi:

**Refresh flow:**
1. User click Drill Down / Roll Up / Apply / Change Dimension
2. Nanoflow gọi Microflow (server-side)
3. Microflow modify OlapFilter attributes + tạo SalesAggregateResult objects + associate với OlapFilter
4. Khi Nanoflow hoàn thành, Data Grid 2 phát hiện association `OlapFilter_Results` thay đổi
5. Data Grid 2 tự động re-read qua association → hiển thị data mới

> **Lưu ý:** Nếu Data Grid 2 không tự refresh, kiểm tra:
> - Association `OlapFilter_Results` đã được tạo trong Domain Model chưa
> - Data Grid 2 **Listen to** đã trỏ đúng Data View (OlapFilter) chưa
> - Microflow thực sự clear old objects và create new objects trong association

### 7.3 Charts Widget Data Binding

Nếu dùng **Any Chart** widget (từ Marketplace):
- Cần JSON configuration cho chart
- Xem thêm: Mendix Charts documentation

Nếu dùng **Mendix Charts** (built-in):
- Cấu hình trực tiếp trong Properties panel
- Chọn Chart type → bind attributes

### 7.4 Common Errors

| Error | Nguyên nhân | Cách fix |
|-------|-------------|----------|
| "No data" trên Data Grid | Association chưa được populate hoặc association path sai | Kiểm tra Microflow có tạo SalesAggregateResult và associate với OlapFilter qua `OlapFilter_Results` |
| "Entity not accessible" | NPE không có Read access | Module Security → Entity Access → thêm rule cho User role |
| Drill-down không hoạt động | `selectedKey` truyền sai attribute | Kiểm tra expression: `$selectedResult/dimensionValue` |
| Chart rỗng | Association path sai hoặc không cùng Data View context | Đảm bảo chart dùng cùng association path `OlapFilter_Results` |
| "Nanoflow parameter mismatch" | Nanoflow parameters không khớp | Kiểm tra parameter types và expressions |
| Data Grid không refresh sau nanoflow | Association không thay đổi hoặc Listen-to chưa cấu hình | Đảm bảo Microflow clear old + create new objects trong association. Kiểm tra Data Grid 2 **Listen to** = DataView |
| Dimension filter không match ES data | `drillDimension` giá trị PascalCase thay vì lowercase | Kiểm tra dropdown values dùng lowercase: `'product'`, `'time'`, `'customer'`, `'geography'` |
| yearFilter type error | Drop Down dùng String values thay vì Integer | Cấu hình Drop Down options với type Integer, không có quotes |

### 7.5 Module Security

Để user có thể truy cập page:

1. Mở **Module Security** cho SalesOLAP
2. Cho từng User Role:
   - **Entity access**: Read cho `OlapFilter`, `SalesAggregateResult`
   - **Microflow access**: Allow tất cả OLAP_* microflows và NF_* nanoflows
   - **Page access**: Allow `SalesOLAP_Overview`

### 7.6 Styling Tips

**Tạo visual hierarchy:**

| Element | CSS Class | Mô tả |
|---------|-----------|--------|
| Filter Bar | `filter-bar` | Background nhẹ, border bottom |
| Navigation Bar | `nav-bar` | Inline layout |
| Active Dimension Tab | `btn-primary` | Nền xanh, text trắng |
| Inactive Tab | `btn-default` | Nền xám |
| Drill Down Button | `btn-link` | Button dạng link |
| Data Grid Header | Bold, darker background | |
| Revenue Column | Right-aligned | |

**Custom CSS (thêm trong theme):**

```css
/* Filter Bar */
.filter-bar {
    background-color: #f5f5f5;
    padding: 16px;
    border-radius: 4px;
    margin-bottom: 16px;
    border: 1px solid #e0e0e0;
}

/* Navigation Bar */
.nav-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 0;
    border-bottom: 2px solid #e0e0e0;
    margin-bottom: 16px;
}

/* Dimension Tabs */
.dimension-tab.active {
    background-color: #1a73e8;
    color: white;
    border-radius: 4px;
}
```

---

## 8. Testing Checklist

Sau khi hoàn thành, test từng chức năng:

- [ ] Domain Model: Association `OlapFilter_Results` (1-to-*) đã được tạo
- [ ] Page mở được, Data View load OlapFilter mặc định
- [ ] NF_InitializePage gọi cả OLAP_InitializeFilter và OLAP_GetSalesData
- [ ] Data Grid 2 hiển thị data (đọc qua association `OlapFilter_Results`)
- [ ] Data Grid 2 **Listen to** = Data View (OlapFilter)
- [ ] Bar Chart hiển thị đúng data (cùng association path)
- [ ] Dimension Selector Tabs → chuyển data (product/time/customer/geography, lowercase)
- [ ] Dropdown drillDimension chỉ read-only, KHÔNG có on-change handler
- [ ] Dropdown Year dùng Integer values (không String)
- [ ] Apply Button → gọi OLAP_GetSalesData, populate association, Data Grid auto-refresh
- [ ] Reset Button → reset OlapFilter in-place, populate association, Data Grid auto-refresh
- [ ] Click row → Drill Down (OLAP_DrillDown modifies OlapFilter + populates association)
- [ ] Roll Up Button → quay lại level trước (OLAP_RollUp modifies OlapFilter + populates association)
- [ ] Drill Down chỉ hiện khi `hasChildren = true`
- [ ] Roll Up chỉ hiện khi `drillLevel > 0`
- [ ] Date picker filter hoạt động
- [ ] Revenue format đúng (thousands separator)
- [ ] Chart KHÔNG có separate microflow call (chỉ dùng association)
- [ ] Nanoflows return Nothing/void (trừ NF_InitializePage returns OlapFilter)
- [ ] Module Security cho user role
