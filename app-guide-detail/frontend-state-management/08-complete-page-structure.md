# 08 - Complete Page Structure Reference & Testing Checklist

## Mục lục

1. [Complete Widget Tree](#1-complete-widget-tree)
2. [Complete Microflow & Nanoflow List](#2-complete-microflow--nanoflow-list)
3. [Complete Entity & Attribute Reference](#3-complete-entity--attribute-reference)
4. [Page Configuration Reference](#4-page-configuration-reference)
5. [Testing Checklist](#5-testing-checklist)
6. [Deployment Checklist](#6-deployment-checklist)

---

## 1. Complete Widget Tree

### 1.1 Product_List Page

```
📄 Product_List (Page)
│   Layout: Atlas_Default / Sidebar_Full_Responsive
│   Title: "Product Management"
│
└── 📦 Data View [ProductFilterContext]
    │   Data Source: Nanoflow → NF_Page_Initialize
    │   Entity: ProductManagement.ProductFilterContext
    │   Refresh on context: ✅
    │
    └── 📐 Layout Grid (3 rows)
        │
        ├── 📏 Row 1 — Header Bar
        │   ├── 📦 Container [col-md-8]
        │   │   └── 📝 Title Text: "📦 Product Management"
        │   │       Style: h3, font-weight-bold
        │   │
        │   └── 📦 Container [col-md-4, text-right]
        │       └── 🔘 Button "➕ Create New Product"
        │           Style: btn-primary
        │           OnClick: Call Nanoflow → NF_Product_OpenCreatePopup
        │           Parameter: $currentObject (FilterContext)
        │
        ├── 📏 Row 2 — Filter Bar
        │   └── 📐 Layout Grid (1 row, 5 columns)
        │       │   Class: filter-bar
        │       │
        │       ├── 📦 Col 1 (2/12)
        │       │   └── 📋 Reference Selector [Category]
        │       │       Association: FilterContext/FilterContext_Category
        │       │       Selectable: DB → Category [isActive=true]
        │       │       Display: categoryName
        │       │       Empty option: "-- All Categories --"
        │       │
        │       ├── 📦 Col 2 (2/12)
        │       │   └── 📋 Reference Selector [Supplier]
        │       │       Association: FilterContext/FilterContext_Supplier
        │       │       Selectable: DB → Supplier [isActive=true]
        │       │       Display: supplierName
        │       │       Empty option: "-- All Suppliers --"
        │       │
        │       ├── 📦 Col 3 (2/12)
        │       │   └── 📅 DatePicker [Date From]
        │       │       Attribute: FilterContext/dateFrom
        │       │       Format: dd/MM/yyyy
        │       │       Placeholder: "Created from..."
        │       │
        │       ├── 📦 Col 4 (2/12)
        │       │   └── 📅 DatePicker [Date To]
        │       │       Attribute: FilterContext/dateTo
        │       │       Format: dd/MM/yyyy
        │       │       Placeholder: "Created to..."
        │       │
        │       └── 📦 Col 5 (4/12)
        │           └── 🔘 Button "🔄 Reset Filter"
        │               Style: btn-default btn-sm
        │               OnClick: Call Nanoflow → NF_Filter_ResetFilter
        │               Parameter: $currentObject
        │
        └── 📏 Row 3 — Data Grid 2
            └── 📊 Data Grid 2 [Product]
                │   Data Source: Microflow → DS_Product_GetFilteredList
                │   Parameter: $currentObject (FilterContext)
                │   PageSize: 20
                │   Show Paging: ✅
                │   Show Empty Message: ✅ "No products found"
                │   Default Sort: createdDate DESC
                │
                ├── 📋 Column: No (50px, center)
                │   └── Calculated attribute: calculated_RowNumber
                │       (set trong datasource microflow DS_Product_GetFilteredList)
                │
                ├── 📋 Column: Product Code (120px)
                │   └── Attribute: productCode
                │   Sortable: ✅
                │
                ├── 📋 Column: Product Name (200px, bold)
                │   └── Container [d-flex, align-items-center, gap-2]
                │       ├── Text: productName (bold)
                │       └── Text (badge):
                │           Expression: if status=Active then '● Active' else '● Inactive'
                │           Class: if status=Active then 'badge badge-success' else 'badge badge-danger'
                │
                ├── 📋 Column: Category (120px)
                │   └── Association path: Product_Category/categoryName
                │
                ├── 📋 Column: Top Variant (200px)
                │   └── Calculated attribute: calculated_TopVariantName
                │
                ├── 📋 Column: Min Price (100px, right)
                │   └── Attribute: productMinPrice
                │   Format: Currency
                │
                ├── 📋 Column: Max Price (100px, right)
                │   └── Attribute: productMaxPrice
                │   Format: Currency
                │
                ├── 📋 Column: Created At (130px, center)
                │   └── Expression: formatDateTime(createdDate, 'dd/MM/yyyy HH:mm')
                │
                ├── 📋 Column: Updated At (130px, center)
                │   └── Expression: formatDateTime(updatedDate, 'dd/MM/yyyy HH:mm')
                │
                ├── 📋 Column: Created By (100px)
                │   └── Attribute: createdBy
                │
                ├── 📋 Column: Updated By (100px)
                │   └── Attribute: changedBy
                │
                └── 📋 Column: Actions (200px, center)
                    └── Container [d-flex, gap-1, justify-content-center]
                        │
                        ├── 🔘 Button "Deactivate"
                        │   Visible: status = Active
                        │   Style: btn-warning btn-sm
                        │   Icon: fa-toggle-on
                        │   OnClick: Call Nanoflow → NF_Product_ToggleStatus
                        │
                        ├── 🔘 Button "Activate"
                        │   Visible: status = Inactive
                        │   Style: btn-success btn-sm
                        │   Icon: fa-toggle-off
                        │   OnClick: Call Nanoflow → NF_Product_ToggleStatus
                        │
                        ├── 🔘 Link "View"
                        │   Style: text-info
                        │   Icon: fa-eye
                        │   OnClick: Show Page → Product_Detail
                        │
                        └── 🔘 Button "Edit"
                            Style: btn-primary btn-sm
                            Icon: fa-edit
                            OnClick: Call Nanoflow → NF_Product_OpenEditPopup
```

### 1.2 Product_EditPopup Page

```
📄 Product_EditPopup (Page)
│   Layout: PopupLayout
│   Title: "Quick Edit Product"
│   Entity: ProductManagement.ProductEditProxy
│
└── 📦 Data View [ProductEditProxy]
    │   Data Source: Page Parameter (từ Nanoflow)
    │
    └── 📐 Layout Grid (2 cols + footer)
        │
        ├── 📏 Row 1 — Form Fields
        │   ├── 📦 Col 1 (6/12)
        │   │   ├── 📝 Text Box [productName]
        │   │   │   Label: "Product Name *"
        │   │   │   Required: ✅
        │   │   │
        │   │   ├── 📋 Reference Selector [Category]
        │   │   │   Association: EditProxy/EditProxy_Category
        │   │   │   Label: "Category *"
        │   │   │   Required: ✅
        │   │   │
        │   │   └── 📝 Text Area [description]
        │   │       Label: "Description"
        │   │       Rows: 4
        │   │
        │   └── 📦 Col 2 (6/12)
        │       ├── 📝 Text Box [productMinPrice]
        │       │   Label: "Min Price *"
        │       │   Required: ✅
        │       │
        │       ├── 📝 Text Box [productMaxPrice]
        │       │   Label: "Max Price *"
        │       │   Required: ✅
        │       │
        │       └── 📝 Text Area [quickNote]
        │           Label: "Quick Note"
        │           Rows: 3
        │
        └── 📏 Row 2 — Footer Buttons
            └── 📦 Container [d-flex, justify-content-end, gap-2]
                ├── 🔘 Button "Cancel"
                │   Style: btn-default
                │   OnClick: Close Page
                │
                └── 🔘 Button "Save"
                    Style: btn-primary
                    Icon: fa-check
                    OnClick: Call Nanoflow → NF_Product_SaveEdit
                    Close Page: ✅ (on success)
```

### 1.3 Product_CreatePopup Page

```
📄 Product_CreatePopup (Page)
│   Layout: PopupLayout
│   Title: "Create New Product"
│   Entity: ProductManagement.ProductEditProxy
│
└── 📦 Data View [ProductEditProxy]
    │
    └── 📐 Layout Grid (identical to EditPopup)
        │   ... (same form fields via Snippet SN_Product_Form)
        │
        └── 📏 Row 2 — Footer Buttons
            └── 📦 Container [d-flex, justify-content-end, gap-2]
                ├── 🔘 Button "Cancel"
                │   OnClick: Close Page
                │
                └── 🔘 Button "Create New"
                    Style: btn-primary
                    Icon: fa-plus
                    OnClick: Call Nanoflow → NF_Product_SaveCreate
                    Close Page: ✅ (on success)
```

### 1.4 Product_Detail Page

```
📄 Product_Detail (Page)
│   Layout: PopupLayout (or Full Page)
│   Title: "Product Detail"
│   Entity: ProductManagement.Product
│
└── 📦 Data View [Product]
    │
    └── 📝 Text: "🚧 Product detail page — to be implemented"
        Style: text-muted, text-center, padding-large
```

---

## 2. Complete Microflow & Nanoflow List

### 2.1 Microflows (Server-side)

| # | Name | Purpose | Parameters | Return | Used by |
|---|------|---------|-----------|--------|---------|
| 1 | `ACT_Product_ToggleStatus` | Toggle Active ↔ Inactive | Product (PE) | Product | NF_Product_ToggleStatus |
| 2 | `ACT_Product_SaveEdit` | Copy NPE → PE + Commit | EditProxy (NPE) | Boolean | NF_Product_SaveEdit |
| 3 | `ACT_Product_CreateNew` | Create Product + Commit | NewProductProxy (NPE) | Product | NF_Product_SaveCreate |
| 4 | `ACT_Product_GenerateCode` | Generate PRD-YYYYMMDD-NNNN | Product (PE) | String | ACT_Product_CreateNew (sub-MF) |
| 5 | `DS_Product_GetFilteredList` | Data source cho DG2 | FilterContext (NPE) | List\<Product\> | Data Grid 2 datasource |
| 6 | `CAL_Product_TopVariantName` | Calculated: top variant by stock | Product (PE) | String | Product entity calculated attr |

### 2.2 Nanoflows (Client-side)

| # | Name | Purpose | Parameters | Return | Used by |
|---|------|---------|-----------|--------|---------|
| 1 | `NF_Page_Initialize` | Tạo FilterContext NPE | — | FilterContext | Data View (page load) |
| 2 | `NF_Filter_ResetFilter` | Reset tất cả filters | FilterContext | FilterContext | Reset button |
| 3 | `NF_Product_OpenEditPopup` | Copy PE → NPE + mở popup | Product (PE) | void | Edit button |
| 4 | `NF_Product_OpenCreatePopup` | Tạo NPE rỗng + mở popup | FilterContext | void | Create button |
| 5 | `NF_Product_ToggleStatus` | Gọi MF toggle | Product (PE) | void | Toggle buttons |
| 6 | `NF_Product_SaveEdit` | Validate + gọi MF save + close | EditProxy (NPE) | void | Save button (edit) |
| 7 | `NF_Product_SaveCreate` | Validate + gọi MF create + close | EditProxy (NPE) | void | Create button (popup) |

---

## 3. Complete Entity & Attribute Reference

### 3.1 Persistent Entities

#### Category

| Attribute | Type | Length | Default | Required |
|-----------|------|--------|---------|----------|
| categoryName | String | 200 | — | ✅ |
| description | String | 500 | empty | ❌ |
| isActive | Boolean | — | true | ✅ |

#### Supplier

| Attribute | Type | Length | Default | Required |
|-----------|------|--------|---------|----------|
| supplierCode | String | 50 | — | ✅ |
| supplierName | String | 200 | — | ✅ |
| contactEmail | String | 200 | empty | ❌ |
| contactPhone | String | 50 | empty | ❌ |
| isActive | Boolean | — | true | ✅ |

#### Product

| Attribute | Type | Length/ Precision | Default | Required | Notes |
|-----------|------|-------------------|---------|----------|-------|
| productCode | String | 50 | — | ✅ | Auto-generated |
| productName | String | 300 | — | ✅ | |
| description | String | 2000 | empty | ❌ | |
| productMinPrice | Decimal | (15,2) | 0.00 | ✅ | |
| productMaxPrice | Decimal | (15,2) | 0.00 | ✅ | |
| quickNote | String | 500 | empty | ❌ | |
| status | Enum | ProductStatus | Active | ✅ | |
| createdDate | DateTime | — | [%CurrentDateTime%] | ✅ | Auto |
| updatedDate | DateTime | — | [%CurrentDateTime%] | ✅ | Auto |
| createdBy | String | 200 | [%CurrentUser%] | ❌ | Auto |
| changedBy | String | 200 | [%CurrentUser%] | ❌ | Auto |
| calculated_TopVariantName | String | 300 | — | ❌ | Calculated, not stored |
| calculated_RowNumber | Integer | — | — | ❌ | Not stored, set in MF |

#### ProductVariant

| Attribute | Type | Length/Precision | Default | Required |
|-----------|------|-------------------|---------|----------|
| variantName | String | 300 | — | ✅ |
| sku | String | 100 | — | ✅ |
| price | Decimal | (15,2) | 0.00 | ✅ |
| remainingQuantity | Integer | — | 0 | ✅ |
| color | String | 50 | empty | ❌ |
| size | String | 50 | empty | ❌ |
| isActive | Boolean | — | true | ✅ |

### 3.2 Non-Persistent Entities

#### ProductFilterContext

| Attribute | Type | Length | Default | Required | Purpose |
|-----------|------|--------|---------|----------|---------|
| dateFrom | DateTime | — | empty | ❌ | Filter: created from |
| dateTo | DateTime | — | empty | ❌ | Filter: created to |
| searchText | String | 200 | empty | ❌ | Full-text search (future) |
| currentPage | Integer | — | 0 | ❌ | Pagination (future) |

**Associations (NPE owner):**
- `FilterContext_Category` → Category (Reference)
- `FilterContext_Supplier` → Supplier (Reference)

#### ProductEditProxy

| Attribute | Type | Length/Precision | Default | Required | Purpose |
|-----------|------|-------------------|---------|----------|---------|
| targetProductId | String | 200 | empty | ✅ | ID của Product đang edit |
| productName | String | 300 | empty | ✅ | Edit buffer |
| description | String | 2000 | empty | ❌ | Edit buffer |
| productMinPrice | Decimal | (15,2) | 0.00 | ✅ | Edit buffer |
| productMaxPrice | Decimal | (15,2) | 0.00 | ✅ | Edit buffer |
| quickNote | String | 500 | empty | ❌ | Edit buffer |

**Associations (NPE owner):**
- `EditProxy_Category` → Category (Reference)

---

## 4. Page Configuration Reference

### 4.1 Navigation Setup

Để truy cập Product List page từ navigation menu:

1. Mở **Project Explorer** → **Navigation**
2. Thêm menu item mới:

| Property | Value |
|----------|-------|
| Caption | "Products" |
| Icon | `fa-box` |
| Target | **Page** → `ProductManagement.Product_List` |
| Roles | User, Administrator |

### 4.2 Module Security Summary

| Entity | Create | Read | Update | Delete |
|--------|--------|------|--------|--------|
| Category | ✅ User | ✅ User | ✅ User | ✅ User |
| Supplier | ✅ User | ✅ User | ✅ User | ✅ User |
| Product | ✅ User | ✅ User | ✅ User | ✅ User |
| ProductVariant | ✅ User | ✅ User | ✅ User | ✅ User |
| ProductFilterContext (NPE) | N/A | ✅ | ✅ | N/A |
| ProductEditProxy (NPE) | N/A | ✅ | ✅ | N/A |

---

## 5. Testing Checklist

### 5.1 Domain Model

- [ ] Module `ProductManagement` đã tạo
- [ ] 4 Persistent Entities với đúng attributes
- [ ] 2 Non-Persistent Entities (viền cam trong domain model editor)
- [ ] 6 Associations với đúng type, owner, delete behavior (3 PE-PE + 3 NPE-PE)
- [ ] Enumeration `ProductStatus` với Active, Inactive
- [ ] Product.status attribute type = ProductStatus, default = Active
- [ ] Calculated attribute `calculated_TopVariantName` + microflow

### 5.2 Microflows

- [ ] `ACT_Product_ToggleStatus` — Toggle + commit, return Product
- [ ] `ACT_Product_SaveEdit` — Copy NPE → PE + commit, return Boolean
- [ ] `ACT_Product_CreateNew` — Create Product + generate code + commit
- [ ] `ACT_Product_GenerateCode` — Format PRD-YYYYMMDD-NNNN
- [ ] `DS_Product_GetFilteredList` — Retrieve with XPath filter, sort DESC
- [ ] `CAL_Product_TopVariantName` — Retrieve top variant by remainingQuantity

### 5.3 Nanoflows

- [ ] `NF_Page_Initialize` — Create FilterContext NPE, return NPE
- [ ] `NF_Filter_ResetFilter` — Reset all associations + attributes
- [ ] `NF_Product_OpenEditPopup` — Copy PE → NPE + show popup
- [ ] `NF_Product_OpenCreatePopup` — Create empty NPE + show popup
- [ ] `NF_Product_ToggleStatus` — Call MF + (optional) refresh
- [ ] `NF_Product_SaveEdit` — Validate + call MF + close popup
- [ ] `NF_Product_SaveCreate` — Validate + call MF + close popup

### 5.4 Pages

#### Product List Page
- [ ] Page loads without error
- [ ] Data View creates ProductFilterContext NPE on load
- [ ] Data Grid 2 displays all 12 columns
- [ ] Row number column correct (set in datasource microflow: 1, 2, 3...)
- [ ] Top Variant column shows correct variant name (most stock)
- [ ] Currency formatting on Min/Max Price columns
- [ ] Date formatting on Created/Updated At columns
- [ ] Status badge displays correctly (green/red)
- [ ] Inactive rows highlighted (opacity)

#### Filter Bar
- [ ] Category dropdown populates from DB
- [ ] Supplier dropdown populates from DB
- [ ] Date pickers allow date selection
- [ ] Selecting Category → Data Grid 2 filters
- [ ] Selecting Supplier → Data Grid 2 filters
- [ ] Setting Date From → Data Grid 2 filters
- [ ] Setting Date To → Data Grid 2 filters
- [ ] Combined filters (Category + Supplier + Date) work together
- [ ] Reset Filter → clears all, reloads all products

#### Toggle Status
- [ ] "Deactivate" button shows for Active products
- [ ] "Activate" button shows for Inactive products
- [ ] Click Toggle → Status changes in DB (verify in DB)
- [ ] Click Toggle → Button visibility updates immediately
- [ ] Click Toggle → Status badge updates
- [ ] Click Toggle → Row styling updates (if applicable)
- [ ] Toggle on multiple rows works independently

#### View Detail
- [ ] Click "View" → Opens Product_Detail page
- [ ] Detail page shows product data (or placeholder)
- [ ] Close detail → Returns to list, filter preserved

#### Quick Edit
- [ ] Click "Edit" → Opens popup with pre-filled data
- [ ] All fields editable: name, category, description, min/max price, note
- [ ] Category dropdown in popup shows current category selected
- [ ] Click "Save" → Data saved to DB
- [ ] Click "Save" → Popup closes
- [ ] Click "Save" → Data Grid 2 refreshes with updated data
- [ ] Click "Cancel" → Popup closes, no data changed
- [ ] Validation: empty name → error
- [ ] Validation: negative price → error
- [ ] Validation: minPrice > maxPrice → error
- [ ] Filter state preserved after edit

#### Create New Product
- [ ] Click "Create New" → Opens empty popup
- [ ] Category pre-filled from current filter (if any)
- [ ] Click "Create New" → Product created in DB
- [ ] Click "Create New" → Popup closes
- [ ] Click "Create New" → Data Grid 2 refreshes, new product visible
- [ ] Auto-generated product code format correct (PRD-YYYYMMDD-NNNN)
- [ ] Click "Cancel" → Popup closes, nothing created
- [ ] Filter state preserved after create
- [ ] New product appears in filtered list (if matches filter)

### 5.5 Edge Cases

- [ ] Empty state: No products → "No products found" message
- [ ] Product with no variants → Top Variant shows "—"
- [ ] Product with no category → Category column empty
- [ ] Filter returns 0 results → "No products found"
- [ ] Rapid toggle clicks → No duplicate commits
- [ ] Browser refresh (F5) → Page re-initializes, filters reset
- [ ] Multiple browser tabs → Each has independent filter state

### 5.6 Performance

- [ ] Page load time < 3 seconds
- [ ] Filter change → Grid refresh < 2 seconds
- [ ] Toggle status → UI update < 1 second
- [ ] With 100+ products → Grid responsive
- [ ] Pagination works correctly (20 per page)

---

## 6. Deployment Checklist

- [ ] All microflows compile without errors
- [ ] All nanoflows compile without errors
- [ ] All pages render in Studio Pro preview
- [ ] Module security configured
- [ ] Navigation menu entry added
- [ ] Test data seeded (Categories, Suppliers, Products, Variants)
- [ ] Custom CSS added to theme
- [ ] No unused entities/attributes/microflows
- [ ] Consistent naming conventions followed
- [ ] Application runs without runtime errors

---

## Tổng kết

Bạn đã hoàn thành toàn bộ hướng dẫn **Frontend State Management trong Mendix v10 — Product Management Demo**.

### Tóm tắt kiến trúc

```
┌───────────────────────────────────────────────────────┐
│                 PRODUCT MANAGEMENT MODULE              │
│                                                        │
│  Domain Model:                                        │
│  ├── 4 Persistent Entities (Category, Supplier,       │
│  │   Product, ProductVariant)                         │
│  ├── 2 Non-Persistent Entities (FilterContext,        │
│  │   EditProxy)                                       │
│  ├── 1 Enumeration (ProductStatus)                    │
│  └── 6 Associations (3 PE-PE + 3 NPE-PE)              │
│                                                        │
│  Business Logic:                                      │
│  ├── 6 Microflows (server-side DB operations)         │
│  └── 7 Nanoflows (client-side state management)       │
│                                                        │
│  Pages:                                               │
│  ├── Product_List (main page with DG2 + filters)      │
│  ├── Product_EditPopup (quick edit modal)             │
│  ├── Product_CreatePopup (create new modal)           │
│  └── Product_Detail (placeholder)                     │
│                                                        │
│  Key Patterns:                                        │
│  ├── NPE Context Pattern (filter state)               │
│  ├── NPE Proxy Pattern (edit buffer)                  │
│  ├── Microflow Datasource (filtered DG2)              │
│  └── Filter State Preservation across CRUD            │
└───────────────────────────────────────────────────────┘
```
