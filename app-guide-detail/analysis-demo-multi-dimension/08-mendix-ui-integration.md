# 08 - Mendix UI Integration (Studio Pro v10)

## 1. Tổng quan

Guide này hướng dẫn tạo UI pages và tích hợp widgets trong Mendix Studio Pro v10 cho module **SalesOLAP**. Mọi entity đều là **Non-Persistent Entity (NPE)**, data được load từ Elasticsearch qua Microflow.

### 1.1 Microflow sẵn có

| Microflow | Input | Output | Mô tả |
|-----------|-------|--------|--------|
| `OLAP_InitializeFilter` | - | `OlapFilter` | Tạo filter mặc định |
| `OLAP_GetSalesData` | `OlapFilter` | `List<SalesAggregateResult>` | Lấy dữ liệu aggregate |
| `OLAP_DrillDown` | `OlapFilter`, `selectedKey` (String) | `List<SalesAggregateResult>` | Drill-down vào dimension |
| `OLAP_RollUp` | `OlapFilter` | `List<SalesAggregateResult>` | Roll-up lên level trên |
| `OLAP_ChangeDimension` | `OlapFilter`, `newDimension` (String) | `List<SalesAggregateResult>` | Chuyển dimension analysis |
| `OLAP_ResetFilters` | `OlapFilter` | `OlapFilter` | Reset filter về mặc định |

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
| `cityFilter` | String | Filter theo city |
| `storeFilter` | String | Filter theo store |
| `dateFrom` | DateTime | Filter từ ngày |
| `dateTo` | DateTime | Filter đến ngày |

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

Trước khi tạo page, cần tạo 2 Enumeration trong module SalesOLAP.

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
│ End Event            │
│ Return: $olapFilter  │
└──────────────────────┘
```

**Chi tiết cấu hình:**
- **Microflow Call Activity**: Trong Properties panel:
  - **Microflow**: `SalesOLAP.OLAP_InitializeFilter`
  - **Output**: Variable name = `olapFilter`, Type = `OlapFilter`
- **End Event**: Return value = `$olapFilter`

### 3.2 NF_ApplyFilters

**Mục đích:** Gọi lại OLAP_GetSalesData khi user thay đổi filter.

**Cách tạo:**
1. Right-click module **SalesOLAP** → **Add nanoflow**
2. Đặt tên: `NF_ApplyFilters`

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
│ Output: resultList   │
│ (List<SAResult>)     │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ End Event            │
│ (No return - chỉ    │
│  refresh data)       │
└──────────────────────┘
```

**Chi tiết cấu hình:**
- **Microflow Call Activity**:
  - **Microflow**: `SalesOLAP.OLAP_GetSalesData`
  - **Input**: `$olapFilter`
  - **Output**: Variable name = `resultList`, Type = `List<SalesAggregateResult>`
- **End Event**: No return value

> **Lưu ý:** Nanoflow này sẽ được gắn vào button "Apply" hoặc trigger `on change` của filter widgets. Data grid sẽ tự refresh khi nhận được List mới.

### 3.3 NF_ResetFilters

**Mục đích:** Reset tất cả filter về mặc định và reload data.

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
│ Output: resetFilter  │
│ (OlapFilter)         │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Microflow Call       │
│ Call:                │
│ OLAP_GetSalesData    │
│ Input: $resetFilter  │
│ Output: resultList   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ End Event            │
└──────────────────────┘
```

**Chi tiết cấu hình:**
- **Microflow Call 1**:
  - **Microflow**: `SalesOLAP.OLAP_ResetFilters`
  - **Input**: `$olapFilter`
  - **Output**: Variable = `resetFilter`, Type = `OlapFilter`
- **Microflow Call 2**:
  - **Microflow**: `SalesOLAP.OLAP_GetSalesData`
  - **Input**: `$resetFilter`
  - **Output**: Variable = `resultList`, Type = `List<SalesAggregateResult>`

### 3.4 NF_DrillDown

**Mục đích:** Drill-down khi user click vào một row trong Data Grid.

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
│ Output: drillResults │
│ (List<SAResult>)     │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ End Event            │
└──────────────────────┘
```

**Chi tiết cấu hình Microflow Call:**
- **Microflow**: `SalesOLAP.OLAP_DrillDown`
- **Input `OlapFilter`**: `$olapFilter`
- **Input `selectedKey`**: `$selectedResult/dimensionValue`
  - Gõ expression: `$selectedResult/dimensionValue`
- **Output**: Variable = `drillResults`, Type = `List<SalesAggregateResult>`

### 3.5 NF_RollUp

**Mục đích:** Roll-up lên level trước đó.

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
│ Output: rollUpResults│
│ (List<SAResult>)     │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ End Event            │
└──────────────────────┘
```

### 3.6 NF_ChangeDimension

**Mục đích:** Chuyển sang phân tích theo dimension khác.

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
│ Output: changedResults│
│ (List<SAResult>)     │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ End Event            │
└──────────────────────┘
```

**Chi tiết cấu hình Microflow Call:**
- **Microflow**: `SalesOLAP.OLAP_ChangeDimension`
- **Input `OlapFilter`**: `$olapFilter`
- **Input `newDimension`**: `$newDimension`
- **Output**: Variable = `changedResults`, Type = `List<SalesAggregateResult>`

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
    - `Product` → `Product`
    - `Time` → `Time`
    - `Customer` → `Customer`
    - `Geography` → `Geography`

**Event handler:**
- **On change**: Gọi `NF_ChangeDimension`
- Expression truyền `newDimension`: `$currentObject/drillDimension`

#### 3c. Dropdown: yearFilter

1. Kéo widget **Text Box** (hoặc **Drop Down**) vào Column 2
2. Cấu hình:

| Property | Value |
|----------|-------|
| **Attribute** | `$currentObject/yearFilter` |
| **Label** | `Year` |

Nếu dùng Drop Down với static values:
- **Selectable objects** → **Enumerate**:
  - `2022` → `2022`
  - `2023` → `2023`
  - `2024` → `2024`

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
' | Dimension: ' + if $currentObject/drillDimension = '' then 'Product' else $currentObject/drillDimension
```

#### 4d. Dimension Selector Tabs

Sử dụng **Tab Container** hoặc các buttons để chọn dimension.

**Cách dùng buttons:**

1. Kéo 4 **Action Buttons** vào Container, nằm cùng dòng

| Button | On Click Nanoflow | Parameter |
|--------|-------------------|-----------|
| `[Product]` | `NF_ChangeDimension` | `'Product'` |
| `[Time]` | `NF_ChangeDimension` | `'Time'` |
| `[Customer]` | `NF_ChangeDimension` | `'Customer'` |
| `[Geography]` | `NF_ChangeDimension` | `'Geography'` |

**Cách truyền parameter:**
1. Click button → Properties → **On click** → **Call nanoflow** → chọn `NF_ChangeDimension`
2. Nanoflow có 2 parameters: `olapFilter` (tự map từ context) và `newDimension` (cần set)
3. Trong **Parameters** dialog:
   - `olapFilter`: `$currentObject` (auto-filled)
   - `newDimension`: Gõ `'Product'` (literal string)

**Highlight active tab:**
- Dùng **Conditional visibility**:
  - Tab "Product" visible khi: `$currentObject/drillDimension = 'Product'`
  - Thêm class `btn-primary` cho active, `btn-default` cho inactive

**Kết quả Navigation Bar:**

```
┌─────────────────────────────────────────────────────────┐
│  [← Roll Up]  Level: 0 | Dimension: Product             │
│  [Product*]  [Time]  [Customer]  [Geography]             │
└─────────────────────────────────────────────────────────┘
```

### 4.5 Bước 5: Data Grid (SalesAggregateResult)

Đây là thành phần chính hiển thị dữ liệu OLAP.

#### 5a. Thêm Data Grid

1. Kéo widget **Data Grid 2** (phiên bản nâng cấp) từ Toolbox vào Data View
   - Nếu không có Data Grid 2, dùng **Data Grid** thông thường

#### 5b. Cấu hình Data Source

**Option A - Dùng Microflow trực tiếp (khuyến nghị cho lần đầu):**

| Property | Value |
|----------|-------|
| **Data source** | Microflow |
| **Microflow** | `SalesOLAP.OLAP_GetSalesData` |
| **Input** | `$currentObject` (OlapFilter từ DataView) |

**Cách cấu hình:**
1. Click Data Grid → Properties → **Data source**
2. **Source type**: Microflow
3. **Microflow**: Click **Select** → chọn `OLAP_GetSalesData`
4. **Parameter**: `$currentObject` (tự map OlapFilter)

**Option B - Dùng NPE Association (nếu có关联):**

Nếu OlapFilter có association `_SalesAggregateResult` (1-N):
- Data source type: **Database**
- Entity: `SalesOLAP.SalesAggregateResult`
- Path: qua association từ DataView context

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

**Cách dùng Default Data Grid:**

1. Click Data Grid → Properties → **Events** → **On click**
2. **Action**: Call nanoflow
3. **Nanoflow**: `NF_DrillDown`
4. Parameters tự động map:
   - `olapFilter` = OlapFilter từ DataView context
   - `selectedResult` = `SalesAggregateResult` của row được click

**Cách dùng Data Grid 2:**

1. Click vào row template trong Data Grid 2
2. Properties → **Events** → **On click**
3. **Action**: Call nanoflow → `NF_DrillDown`

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

**Data Source:**

| Property | Value |
|----------|-------|
| **Source type** | Microflow |
| **Microflow** | `OLAP_GetSalesData` |
| **Parameter** | `$currentObject` (OlapFilter) |

**Hoặc dùng cùng data source với Data Grid:**
- Nếu dùng association từ OlapFilter → SalesAggregateResult:
  - Source type: Database
  - Entity path: `SalesOLAP.OlapFilter_SalesAggregateResult/SalesOLAP.SalesAggregateResult`

**Series Configuration:**

| Property | Value |
|----------|-------|
| **Series type** | Bar |
| **Data source** | List<SalesAggregateResult> |
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
| **Data source** | Cùng List<SalesAggregateResult> |
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
    │   │   ├── Dropdown: drillDimension (Product/Time/Customer/Geography)
    │   │   ├── Dropdown: yearFilter (2022/2023/2024)
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
    │   ├── Button: "← Roll Up" → NF_RollUp
    │   ├── Text: breadcrumb (Level + Dimension)
    │   └── Container (Dimension Tabs):
    │       ├── Button: "Product" → NF_ChangeDimension('Product')
    │       ├── Button: "Time" → NF_ChangeDimension('Time')
    │       ├── Button: "Customer" → NF_ChangeDimension('Customer')
    │       └── Button: "Geography" → NF_ChangeDimension('Geography')
    │
    ├── Data Grid 2 (List<SalesAggregateResult>)
    │   ├── Source: OLAP_GetSalesData($currentObject)
    │   ├── Column: dimensionLabel ("Dimension")
    │   ├── Column: totalRevenue ("Revenue") - format ¤ #,##0
    │   ├── Column: totalQuantity ("Quantity") - format #,##0
    │   ├── Column: transactionCount ("Transactions") - format #,##0
    │   ├── Column: avgOrderValue ("Avg Value") - format ¤ #,##0
    │   ├── Column: Action Button "▶ Drill Down" → NF_DrillDown
    │   │   └── Visible: hasChildren = true
    │   └── On row click → NF_DrillDown
    │
    └── Layout Grid (Charts) - 2 columns (60/40)
        ├── Bar Chart
        │   ├── Source: List<SalesAggregateResult>
        │   ├── X: dimensionLabel
        │   └── Y: totalRevenue
        └── Pie Chart
            ├── Source: List<SalesAggregateResult>
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
' | ' + if $currentObject/drillDimension = '' then 'Product' else $currentObject/drillDimension
```

**Hiển thị selected filter:**
```
if $currentObject/categoryFilter = '' then 'All' else $currentObject/categoryFilter
```

### 6.3 Nanoflow Parameter Mapping

| Nanoflow | Parameter | Expression |
|----------|-----------|------------|
| `NF_ApplyFilters` | `olapFilter` | `$currentObject` (auto) |
| `NF_ResetFilters` | `olapFilter` | `$currentObject` (auto) |
| `NF_DrillDown` | `olapFilter` | `$currentObject` (auto) |
| `NF_DrillDown` | `selectedResult` | Row context (auto) |
| `NF_RollUp` | `olapFilter` | `$currentObject` (auto) |
| `NF_ChangeDimension` | `olapFilter` | `$currentObject` (auto) |
| `NF_ChangeDimension` | `newDimension` | Literal: `'Product'` / `'Time'` / `'Customer'` / `'Geography'` |

---

## 7. Tips & Troubleshooting

### 7.1 NPE Data Source

> **QUAN TRỌNG:** Vì `SalesAggregateResult` và `OlapFilter` là **Non-Persistent Entity**, data KHÔNG tồn tại trong database. Data source PHẢI là:
> - **Microflow** (gọi ES REST API)
> - **Nanoflow** (gọi Microflow)
> - KHÔNG dùng "Database" source type cho NPE

### 7.2 Refresh Data sau Drill-Down/Roll-Up

Sau khi NF_DrillDown hoặc NF_RollUp hoàn thành, Data Grid cần refresh. Có 2 cách:

**Cách 1 - Dùng Listen-to-Widget (Data Grid 2):**
- Data Grid 2 có tính năng **Listen to widget**
- Nếu OlapFilter thay đổi → Data Grid tự refresh
- Cấu hình: Data Grid → Properties → **Listen to** → chọn DataView widget

**Cách 2 - Manual Refresh trong Nanoflow:**
- Trong Nanoflow, sau khi gọi Microflow → kết quả List<SalesAggregateResult> được return
- Data Grid dùng Microflow source → cần trigger reload
- Cách: Thay đổi attribute của OlapFilter (ví dụ: set `drillLevel` = `drillLevel`) để trigger change event

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
| "No data" trên Data Grid | Microflow không trả data hoặc NPE không có source | Kiểm tra Microflow source, test riêng MF trong Studio Pro |
| "Entity not accessible" | NPE không có Read access | Module Security → Entity Access → thêm rule cho User role |
| Drill-down không hoạt động | `selectedKey` truyền sai attribute | Kiểm tra expression: `$selectedResult/dimensionValue` |
| Chart rỗng | Data source không match | Đảm bảo chart source = cùng microflow hoặc association path |
| "Nanoflow parameter mismatch" | Nanoflow parameters không khớp | Kiểm tra parameter types và expressions |

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

- [ ] Page mở được, Data View load OlapFilter mặc định
- [ ] Data Grid hiển thị data (gọi OLAP_GetSalesData thành công)
- [ ] Bar Chart hiển thị đúng data
- [ ] Dropdown Dimension → chuyển data (Product/Time/Customer/Geography)
- [ ] Dropdown Year → filter theo năm
- [ ] Apply Button → reload data với filters
- [ ] Reset Button → clear tất cả filters
- [ ] Click row → Drill Down (hiển thị data chi tiết hơn)
- [ ] Roll Up Button → quay lại level trước
- [ ] Dimension Tabs → chuyển dimension analysis
- [ ] Drill Down chỉ hiện khi `hasChildren = true`
- [ ] Roll Up chỉ hiện khi `drillLevel > 0`
- [ ] Date picker filter hoạt động
- [ ] Revenue format đúng (thousands separator)
- [ ] Module Security cho user role
