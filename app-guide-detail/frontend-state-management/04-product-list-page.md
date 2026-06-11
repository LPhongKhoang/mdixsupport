# 04 - Product List Page: Data Grid 2, Filter Bar & Action Buttons

## Mục lục

1. [Tạo Page Product_List](#1-tạo-page-product_list)
2. [Data View bọc ngoài (NPE Context)](#2-data-view-bọc-ngoài-npe-context)
3. [Filter Bar](#3-filter-bar)
4. [Data Grid 2 — Product List](#4-data-grid-2--product-list)
5. [Action Buttons](#5-action-buttons)
6. [Conditional Formatting & Visibility](#6-conditional-formatting--visibility)
7. [Layout tổng hợp](#7-layout-tổng-hợp)

---

## 1. Tạo Page Product_List

### Bước 1.1: Tạo Page mới

1. Right-click module **ProductManagement** → **Add** → **Page**
2. Cấu hình:
   - **Name:** `Product_List`
   - **Layout:** `Atlas_Default` → `Sidebar_Full_Responsive`
   - (hoặc layout tùy chọn dựa trên theme dự án)
3. Click **OK**

### Bước 1.2: Xóa nội dung mặc định

1. Xóa tất cả widgets mặc định trong page content area
2. Giữ lại chỉ **page title** nếu có

---

## 2. Data View bọc ngoài (NPE Context)

> **Đây là pattern cốt lõi:** Data View bọc toàn bộ page content, có Data Source là NPE `ProductFilterContext`. Tất cả filter widgets và Data Grid 2 đều nằm **bên trong** Data View này → chia sẻ cùng context object.

### Bước 2.1: Thêm Data View

1. Kéo **Data View** widget vào page content area
2. Cấu hình **Data Source:**

| Property | Value |
|----------|-------|
| Source type | **Nanoflow** |
| Nanoflow | `ProductManagement.NF_Page_Initialize` |
| Entity | `ProductManagement.ProductFilterContext` |

3. **Refresh on context update:** ✅ Enable (trong Data View properties)

### Bước 2.2: Data View Content

Bên trong Data View, thêm **Layout Grid** (3 rows):
- **Row 1:** Page Title + Create Button
- **Row 2:** Filter Bar
- **Row 3:** Data Grid 2

```
Data View (ProductFilterContext)
  │
  ├── Layout Grid
  │     │
  │     ├── Row 1: Title Bar
  │     │     ├── [Left]  Page Title "Product Management"
  │     │     └── [Right] Button "Create New Product"
  │     │
  │     ├── Row 2: Filter Bar
  │     │     ├── [Left]  Dropdown: Category
  │     │     ├── [Left]  Dropdown: Supplier
  │     │     ├── [Left]  DatePicker: Date From
  │     │     ├── [Left]  DatePicker: Date To
  │     │     └── [Left]  Button: Reset Filter
  │     │
  │     └── Row 3: Data Grid 2
  │           └── Product List
  │
```

---

## 3. Filter Bar

### Bước 3.1: Thêm Layout Grid cho Filter Bar

1. Bên trong Data View → Thêm **Layout Grid** (1 row, 5 columns)
2. Configure column widths:
   - Col 1: **2/12** (Category dropdown)
   - Col 2: **2/12** (Supplier dropdown)
   - Col 3: **2/12** (Date From)
   - Col 4: **2/12** (Date To)
   - Col 5: **4/12** (Reset button + spacing)

### Bước 3.2: Dropdown — Category Filter

1. Kéo **Dropdown** widget vào Column 1
2. Cấu hình:

| Property | Value |
|----------|-------|
| Data source | **Database** |
| Entity | `ProductManagement.Category` |
| Display attribute | `categoryName` |
| **Attribute** (value) | `ProductFilterContext/FilterContext_Category` (association) |
| Selectable objects | **Database** → XPath: `[isActive = true]` |
| Empty option text | "-- All Categories --" |
| On change | (none — auto-refresh qua NPE context) |

> **Quan trọng:** Dropdown attribute bind vào **NPE association** `FilterContext_Category`. Khi user chọn Category, Mendix tự động update association trên NPE → Data Grid 2 detect context change → reload.

### Bước 3.3: Dropdown — Supplier Filter

1. Kéo **Dropdown** widget vào Column 2
2. Cấu hình:

| Property | Value |
|----------|-------|
| Data source | **Database** |
| Entity | `ProductManagement.Supplier` |
| Display attribute | `supplierName` |
| **Attribute** (value) | `ProductFilterContext/FilterContext_Supplier` |
| Selectable objects | **Database** → XPath: `[isActive = true]` |
| Empty option text | "-- All Suppliers --" |
| On change | (none) |

### Bước 3.4: DatePicker — Date From

1. Kéo **Date Picker** widget vào Column 3
2. Cấu hình:

| Property | Value |
|----------|-------|
| Attribute | `ProductFilterContext/dateFrom` |
| Label | "From" |
| Date format | `dd/MM/yyyy` |
| Placeholder | "Created from..." |
| On change | (none — auto-refresh) |

### Bước 3.5: DatePicker — Date To

1. Kéo **Date Picker** widget vào Column 4
2. Cấu hình:

| Property | Value |
|----------|-------|
| Attribute | `ProductFilterContext/dateTo` |
| Label | "To" |
| Date format | `dd/MM/yyyy` |
| Placeholder | "Created to..." |
| On change | (none — auto-refresh) |

### Bước 3.6: Button — Reset Filter

1. Kéo **Button** widget vào Column 5
2. Cấu hình:

| Property | Value |
|----------|-------|
| Caption | "Reset Filter" |
| Style | Secondary / Default button |
| Icon | `fa-refresh` (hoặc `glyphicon-refresh`) |
| On click | **Call Nanoflow** → `NF_Filter_ResetFilter` |
| Nanoflow parameter | `$currentObject` (ProductFilterContext) |

> **Về auto-refresh mechanism:** Mendix Data Grid 2 với **Database** datasource có thể **không auto-refresh** khi NPE association thay đổi (vì NPE không nằm trong database query). Có 2 giải pháp:
>
> **Giải pháp A (Khuyến nghị):** Dùng **Microflow datasource** cho Data Grid 2
> - Data Grid 2 → Data source → **Microflow** → `DS_Product_GetFilteredList`
> - Microflow nhận `ProductFilterContext` làm parameter
> - Khi NPE change → Data View refresh → Data Grid 2 gọi lại microflow
>
> **Giải pháp B:** Thêm **On Change** nanoflow cho mỗi filter widget → Refresh context
> - Dropdown OnChange → Call Nanoflow → Refresh client
>
> **Guide này sử dụng Giải pháp A** (Microflow datasource).

---

## 4. Data Grid 2 — Product List

### Bước 4.1: Thêm Data Grid 2

1. Kéo **Data Grid 2** widget vào Row 3 của Layout Grid (bên trong Data View)
2. Cấu hình cơ bản:

| Property | Value |
|----------|-------|
| Data source | **Microflow** |
| Microflow | `ProductManagement.DS_Product_GetFilteredList` |
| Microflow parameter | `$currentObject` (ProductFilterContext từ Data View) |
| Entity | `ProductManagement.Product` |
| Show paging | ✅ Yes |
| Page size | **20** |
| Allow sorting | ✅ Yes (default sort: `createdDate` DESC) |
| Show empty message | ✅ "No products found" |
| Filter widget position | (none — filter bar riêng bên trên) |

### Bước 4.2: Thêm Columns

Thêm các columns theo yêu cầu. Mỗi column là một widget con của Data Grid 2.

#### Column 1: No (Row Number)

| Property | Value |
|----------|-------|
| Header | "No" |
| Width | **50px** |
| Content | **Dynamic text** → dùng calculated attribute `calculated_RowNumber` (xem bên dưới) |
| Sortable | ❌ |
| Align | Center |

> **Cách tạo row number trong Data Grid 2:**
>
> Mendix Data Grid 2 **không có built-in row number column** và **không expose** biến `$dataGrid2Objects` trong row context. Chỉ có `$currentObject` là available.
>
> **Giải pháp — Dùng calculated attribute trong datasource microflow:**
>
> Trong microflow `DS_Product_GetFilteredList`, sau khi retrieve Product list, loop qua từng Product và gán row number:
>
> ```
> [Start]
>    │
>    ▼
> Retrieve Product list (filtered, sorted)
>    │
>    ▼
> Iterator (loop qua ProductList):
>    ├── Counter variable: $rowNum (Integer, start = 1)
>    ├── For each Product:
>    │   ├── Change Object: $Product/calculated_RowNumber = $rowNum
>    │   └── $rowNum = $rowNum + 1
>    └── End loop
>    │
>    ▼
> Return: ProductList
> ```
>
> **Bước thêm attribute:**
> 1. Mở Domain Model → Entity **Product** → Add attribute:
>    - Name: `calculated_RowNumber`
>    - Type: **Integer**
>    - ✅ **Stored** = false (không lưu vào DB)
>    - ⚠️ **Calculated** = false (set manually trong microflow, không phải calculated by microflow)
>
> 2. Trong microflow `DS_Product_GetFilteredList`, sau retrieve → thêm **Loop** activity → gán `calculated_RowNumber` cho từng Product

> **Lưu ý về Microflow datasource và pagination:** Khi dùng Microflow datasource cho Data Grid 2, Mendix transfer **toàn bộ data** về client rồi apply paging/sorting/filter ở client-side (theo official docs Mendix). Với dataset nhỏ (< 1000 rows) thì OK, nhưng với dataset lớn cần cân nhắc dùng **Database datasource** với XPath constraint trực tiếp.

#### Column 2: Product Code

| Property | Value |
|----------|-------|
| Header | "Product Code" |
| Width | **120px** |
| Content | Dynamic text → `$currentObject/productCode` |
| Sortable | ✅ (sort attribute: `productCode`) |

#### Column 3: Product Name

| Property | Value |
|----------|-------|
| Header | "Product Name" |
| Width | **200px** |
| Content | Dynamic text → `$currentObject/productName` |
| Sortable | ✅ (sort attribute: `productName`) |
| Bold | ✅ |

#### Column 4: Category

| Property | Value |
|----------|-------|
| Header | "Category" |
| Width | **120px** |
| Content | Dynamic text → `$currentObject/Product_Category/categoryName` |
| Sortable | ✅ (sort attribute: `Product_Category/categoryName`) |

> **Note:** Navigate qua association dùng `/` trong Mendix expression.

#### Column 5: Variant (Most Stock)

| Property | Value |
|----------|-------|
| Header | "Top Variant (Most Stock)" |
| Width | **200px** |
| Content | **Complex** — cần calculated value (xem bên dưới) |

**Cách hiển thị "Product variant name with most remaining quantity":**

> **Thách thức:** Đây là **aggregated data** từ ProductVariant. Data Grid 2 không hỗ trợ aggregate trực tiếp trong column expression.
>
> **Giải pháp:** Thêm **calculated attribute** vào Product entity hoặc **tạo calculated column trong datasource microflow**.
>
> **Phương pháp khuyến nghị — Dùng Datasource Microflow:**
>
> Trong microflow `DS_Product_GetFilteredList`, sau khi retrieve Product list, loop qua từng Product:
>
> 1. **Retrieve** ProductVariant → XPath: `[ProductManagement.ProductVariant_Product/ProductManagement.Product = $Product]` → Sort: `remainingQuantity` DESC → Range: First
> 2. **Change Object** trên Product → Set attribute `calculated_TopVariantName` = `$TopVariant/variantName` (nếu có variant), hoặc `"N/A"` (nếu không có variant)
>
> **Cách khác (đơn giản hơn):** Dùng **OQL** hoặc **association sorting** trong microflow.

> **Tuy nhiên**, cách clean nhất là thêm một **transient attribute** trên Product:

**Thêm attribute calculated trên entity Product:**

1. Mở Domain Model → Entity **Product** → Add attribute:
   - Name: `calculated_TopVariantName`
   - Type: **String** (length 300)
   - ✅ **Stored** = false (không lưu vào DB)
   - ⚠️ **Calculated** = true

2. Chọn "Calculate with **Microflow**" → Tạo microflow `CAL_Product_TopVariantName`:

```
Parameters: Product (ProductManagement.Product)
Return: String

[Start]
   │
   ▼
Retrieve ProductVariant from Database:
  XPath: [ProductManagement.Product_ProductVariant = $Product]
  Sort: remainingQuantity DESC
  Range: First
  Variable: $TopVariant
   │
   ▼
Exclusive Split: $TopVariant != empty
   │
   ├── [True]  → Return: $TopVariant/variantName
   └── [False] → Return: '—'
```

**Column binding:**
- Content: Dynamic text → `$currentObject/calculated_TopVariantName`

#### Column 6: Min Price

| Property | Value |
|----------|-------|
| Header | "Min Price" |
| Width | **100px** |
| Content | Dynamic text → `$currentObject/productMinPrice` |
| Sortable | ✅ |
| Format | Currency → `$` hoặc `đ` |
| Align | Right |

**Thiết lập format:**
1. Click vào Dynamic text widget → Properties → **Format** → **Custom**
2. Expression: `formatDecimal($currentObject/productMinPrice, '¤#,##0.00')` → hoặc dùng built-in **Currency** formatter

#### Column 7: Max Price

| Property | Value |
|----------|-------|
| Header | "Max Price" |
| Width | **100px** |
| Content | Dynamic text → `$currentObject/productMaxPrice` |
| Sortable | ✅ |
| Format | Currency |
| Align | Right |

#### Column 8: Created At

| Property | Value |
|----------|-------|
| Header | "Created At" |
| Width | **130px** |
| Content | Dynamic text → `formatDateTime($currentObject/createdDate, 'dd/MM/yyyy HH:mm')` |
| Sortable | ✅ (sort: `createdDate`) |
| Align | Center |

#### Column 9: Updated At

| Property | Value |
|----------|-------|
| Header | "Updated At" |
| Width | **130px** |
| Content | Dynamic text → `formatDateTime($currentObject/updatedDate, 'dd/MM/yyyy HH:mm')` |
| Sortable | ✅ (sort: `updatedDate`) |
| Align | Center |

#### Column 10: Created By

| Property | Value |
|----------|-------|
| Header | "Created By" |
| Width | **100px** |
| Content | Dynamic text → `$currentObject/createdBy` |
| Sortable | ❌ |

#### Column 11: Updated By

| Property | Value |
|----------|-------|
| Header | "Updated By" |
| Width | **100px** |
| Content | Dynamic text → `$currentObject/changedBy` |
| Sortable | ❌ |

#### Column 12: Actions

| Property | Value |
|----------|-------|
| Header | "Actions" |
| Width | **200px** |
| Align | Center |
| Sortable | ❌ |

**Nội dung column Actions** — chứa 3 buttons (xem [Section 5](#5-action-buttons))

---

## 5. Action Buttons

### 5.1 Button: Toggle Active/Inactive

**Mục đích:** Toggle status Product. Phản ánh thay đổi **ngay lập tức** lên DB và UI.

1. Thêm **Button** widget vào column Actions
2. Cấu hình:

| Property | Value |
|----------|-------|
| Caption | (dynamic) |
| On click | **Call Nanoflow** → `NF_Product_ToggleStatus` |
| Parameter | `$currentObject` (Product) |
| Style | Conditional (xem section 6) |
| Icon | `fa-toggle-on` / `fa-toggle-off` (conditional) |

**Dynamic Caption — hiển thị trạng thái hiện tại:**

Sử dụng **conditional text** hoặc **2 buttons với visibility:**

**Phương pháp: 2 buttons với conditional visibility**

**Button A — "Deactivate" (hiện khi Product đang Active):**

| Property | Value |
|----------|-------|
| Caption | "Deactivate" |
| Render mode | Button |
| Style class | `btn-warning` |
| Icon | `fa-toggle-on` |
| **Visible** | `$currentObject/status = ProductManagement.ProductStatus.Active` |
| On click | Call Nanoflow → `NF_Product_ToggleStatus` |
| Parameter | `$currentObject` |

**Button B — "Activate" (hiện khi Product đang Inactive):**

| Property | Value |
|----------|-------|
| Caption | "Activate" |
| Render mode | Button |
| Style class | `btn-success` |
| Icon | `fa-toggle-off` |
| **Visible** | `$currentObject/status = ProductManagement.ProductStatus.Inactive` |
| On click | Call Nanoflow → `NF_Product_ToggleStatus` |
| Parameter | `$currentObject` |

> **Quan trọng về refresh sau toggle:**
>
> Sau khi `NF_Product_ToggleStatus` gọi microflow `ACT_Product_ToggleStatus` (commit trên server), Product object trong client session được **auto-updated** bởi Mendix sync mechanism. Data Grid 2 sẽ hiển thị status mới → button visibility tự thay đổi.
>
> Nếu auto-refresh không hoạt động, thêm **Refresh in client** trong Nanoflow sau Microflow call.

### 5.2 Button: View Detail

**Mục đích:** Điều hướng đến trang chi tiết Product (trang trống theo yêu cầu).

1. Thêm **Button** widget vào column Actions
2. Cấu hình:

| Property | Value |
|----------|-------|
| Caption | "View" |
| Render mode | Link (hoặc Button small) |
| Style class | `btn-info` |
| Icon | `fa-eye` |
| On click | **Show Page** → `ProductManagement.Product_Detail` |
| Page parameter | `$currentObject` (Product) |

**Tạo trang Product_Detail:**
1. Right-click module → **Add** → **Page** → Name: `Product_Detail`
2. Layout: `PopupLayout` (hoặc full page layout)
3. Nội dung: **Trống** (placeholder text: "Product detail page — to be implemented")

### 5.3 Button: Edit (Quick Edit)

**Mục đích:** Mở popup Quick Edit cho Product đang chọn.

1. Thêm **Button** widget vào column Actions
2. Cấu hình:

| Property | Value |
|----------|-------|
| Caption | "Edit" |
| Render mode | Button small |
| Style class | `btn-primary` |
| Icon | `fa-edit` |
| On click | **Call Nanoflow** → `NF_Product_OpenEditPopup` |
| Parameter | `$currentObject` (Product) |

> **Flow:** Click Edit → `NF_Product_OpenEditPopup` (copy PE → NPE) → Show popup page `Product_EditPopup` (data source: ProductEditProxy NPE)

---

## 6. Conditional Formatting & Visibility

### 6.1 Status Badge (thêm column hoặc overlay)

Nếu muốn hiển thị status dạng **badge** (thêm column hoặc trong column Product Name):

**Thêm Status Badge vào column Product Name:**

1. Trong cell Product Name, thêm **container** hoặc **text** widget
2. Text expression: `if $currentObject/status = ProductManagement.ProductStatus.Active then '● Active' else '● Inactive'`
3. **Conditional class:**
   - Active: `badge-success` (green badge)
   - Inactive: `badge-danger` (red badge)

**Cách thực hiện conditional styling trong Mendix:**

Mendix v10 hỗ trợ **Dynamic classes** trên widget:

1. Select text widget → Properties → **Common** → **Class**
2. Sử dụng expression:
   ```
   if $currentObject/status = ProductManagement.ProductStatus.Active
   then 'badge badge-success'
   else 'badge badge-danger'
   ```

> **Yêu cầu CSS:** Thêm vào theme:
> ```css
> .badge { padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
> .badge-success { background-color: #28a745; color: white; }
> .badge-danger { background-color: #dc3545; color: white; }
> ```

### 6.2 Row Highlighting (Inactive Products)

Để highlight toàn bộ row khi Product Inactive:

1. Data Grid 2 → **Row class** (trong Properties)
2. Expression:
   ```
   if $currentObject/status = ProductManagement.ProductStatus.Inactive
   then 'row-inactive'
   else ''
   ```

**CSS:**
```css
.row-inactive { opacity: 0.6; background-color: #f8f9fa !important; }
```

### 6.3 Action Buttons Layout

3 action buttons nên nằm ngang trong 1 cell. Dùng **Container** với **flex layout**:

1. Thêm Container → Properties → **Class**: `d-flex gap-2`
2. Đặt 3 buttons (Toggle, View, Edit) vào Container

> **Mendix v10 Atlas UI** hỗ trợ Bootstrap utility classes:
> - `d-flex` = display flex
> - `gap-2` = gap 8px
> - `align-items-center` = vertically center

---

## 7. Layout tổng hợp

### Page Structure (Widget Tree)

```
📄 Product_List (Page)
└── 📦 Data View [ProductFilterContext]
    │   DataSource: Nanoflow → NF_Page_Initialize
    │
    └── 📐 Layout Grid
        │
        ├── 📏 Row 1 — Header Bar
        │   ├── 📦 Container [col-md-6, d-flex, align-items-center]
        │   │   └── 📝 Title Text: "Product Management"
        │   │
        │   └── 📦 Container [col-md-6, d-flex, justify-content-end]
        │       └── 🔘 Button "Create New Product"
        │           Style: btn-primary
        │           Icon: fa-plus
        │           OnClick: Call Nanoflow → NF_Product_OpenCreatePopup
        │           Parameter: $currentObject (FilterContext)
        │
        ├── 📏 Row 2 — Filter Bar
        │   └── 📐 Layout Grid [5 columns]
        │       ├── 📦 Col 1: Dropdown [Category]
        │       │   Attribute: FilterContext/FilterContext_Category
        │       │   Selectable: Category from DB [isActive=true]
        │       │
        │       ├── 📦 Col 2: Dropdown [Supplier]
        │       │   Attribute: FilterContext/FilterContext_Supplier
        │       │   Selectable: Supplier from DB [isActive=true]
        │       │
        │       ├── 📦 Col 3: DatePicker [Date From]
        │       │   Attribute: FilterContext/dateFrom
        │       │
        │       ├── 📦 Col 4: DatePicker [Date To]
        │       │   Attribute: FilterContext/dateTo
        │       │
        │       └── 📦 Col 5: Button "Reset Filter"
        │           OnClick: Call Nanoflow → NF_Filter_ResetFilter
        │
        └── 📏 Row 3 — Data Grid 2
            └── 📊 Data Grid 2 [Product]
                DataSource: Microflow → DS_Product_GetFilteredList
                Parameter: $currentObject (FilterContext)
                PageSize: 20
                │
                ├── 📋 Col: No (row number)
                ├── 📋 Col: Product Code
                ├── 📋 Col: Product Name + Status Badge
                ├── 📋 Col: Category
                ├── 📋 Col: Top Variant (Most Stock)
                ├── 📋 Col: Min Price (currency)
                ├── 📋 Col: Max Price (currency)
                ├── 📋 Col: Created At (datetime)
                ├── 📋 Col: Updated At (datetime)
                ├── 📋 Col: Created By
                ├── 📋 Col: Updated By
                └── 📋 Col: Actions
                    └── 📦 Container [d-flex, gap-1]
                        ├── 🔘 Button "Deactivate" (conditional)
                        ├── 🔘 Button "Activate" (conditional)
                        ├── 🔘 Button "View"
                        └── 🔘 Button "Edit"
```

### CSS tùy chỉnh (thêm vào theme)

```css
/* === Product List Page Styles === */

/* Filter bar */
.filter-bar {
    background-color: #f8f9fa;
    padding: 12px 16px;
    border-radius: 8px;
    margin-bottom: 16px;
}

/* Status badges */
.badge { 
    padding: 2px 8px; 
    border-radius: 4px; 
    font-size: 12px; 
    font-weight: 600; 
    display: inline-block;
}
.badge-success { background-color: #28a745; color: white; }
.badge-danger { background-color: #dc3545; color: white; }

/* Inactive row */
.row-inactive { 
    opacity: 0.6; 
    background-color: #f8f9fa !important; 
}

/* Action buttons container */
.action-buttons {
    display: flex;
    gap: 4px;
    align-items: center;
    justify-content: center;
}

/* Small buttons */
.btn-sm {
    padding: 4px 10px;
    font-size: 13px;
}

/* Price column */
.text-right {
    text-align: right;
}
```

---

## Tổng kết

Sau khi hoàn thành file này, bạn đã có:
- ✅ Page `Product_List` với Data View bọc NPE context
- ✅ Filter bar (Category, Supplier, Date Range)
- ✅ Data Grid 2 với 12 columns (bao gồm calculated Top Variant)
- ✅ 3 action buttons (Toggle, View, Edit) với conditional visibility
- ✅ Conditional formatting (status badge, row highlight)
- ✅ Microflow datasource cho filtered product list

**Tiếp theo:** [05-quick-edit-modal.md](05-quick-edit-modal.md) — Tạo Quick Edit Popup Modal
