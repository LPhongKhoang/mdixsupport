# 09 - Backend Architecture: Microflows, OQL View Entity & Data Flow

## Mục lục

1. [Backend Architecture Overview](#1-backend-architecture-overview)
2. [Module Structure & Folder Organization](#2-module-structure--folder-organization)
3. [Entity Strategy: PE vs NPE vs View Entity](#3-entity-strategy-pe-vs-npe-vs-view-entity)
4. [Key Design Decisions](#4-key-design-decisions)
5. [Complete Backend Component List](#5-complete-backend-component-list)

---

## 1. Backend Architecture Overview

### 1.1 High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                        BROWSER (Client)                            │
│                                                                    │
│  ┌────────────────┐   ┌─────────────────┐   ┌──────────────────┐  │
│  │ Pages          │   │ Nanoflows       │   │ NPE Objects      │  │
│  │ - Product_List │   │ - NF_Page_Init  │   │ - FilterContext  │  │
│  │ - EditPopup    │   │ - NF_Toggle     │   │ - EditProxy      │  │
│  │ - CreatePopup  │   │ - NF_OpenEdit   │   │                  │  │
│  └───────┬────────┘   └────────┬────────┘   └──────────────────┘  │
│          │                     │                                    │
└──────────┼─────────────────────┼────────────────────────────────────┘
           │                     │
           │  Mendix Client API  │
           │  (auto-managed)     │
           ▼                     ▼
┌────────────────────────────────────────────────────────────────────┐
│                    MENDIX RUNTIME (Server)                         │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ Microflows (Business Logic Layer)                           │  │
│  │                                                             │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │  │
│  │  │ DS_Product   │  │ ACT_Product  │  │ ACT_Product      │  │  │
│  │  │ GetFiltered  │  │ ToggleStatus │  │ CreateNew        │  │  │
│  │  │ List         │  │              │  │                  │  │  │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────────┘  │  │
│  │         │                 │                  │              │  │
│  │  ┌──────┴───────┐  ┌─────┴────────┐  ┌─────┴────────────┐ │  │
│  │  │ ACT_Product  │  │ ACT_Product  │  │ ACT_Product      │ │  │
│  │  │ SaveEdit     │  │ GenerateCode │  │ DeleteProduct    │ │  │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘ │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ OQL Layer (Data Aggregation)                                │  │
│  │                                                             │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │ View Entity: ProductSummaryView                      │  │  │
│  │  │ - Product info + Category + Supplier                 │  │  │
│  │  │ - Aggregated: topVariant, totalStock, variantCount   │  │  │
│  │  │ - Used as Data Grid 2 datasource (Database source)  │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ Java Actions (Platform Extensions)                         │  │
│  │                                                             │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │ JA_GenerateProductCode                                │  │  │
│  │  │ - Sequence-based unique code generation               │  │  │
│  │  │ - Format: PRD-YYYYMMDD-NNNN (guaranteed unique)      │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ Database (PostgreSQL / H2)                                  │  │
│  │                                                             │  │
│  │  ┌──────────┐ ┌──────────┐ ┌─────────┐ ┌───────────────┐  │  │
│  │  │ Category │ │ Supplier │ │ Product │ │ProductVariant │  │  │
│  │  │ (10 rows)│ │(15 rows) │ │(116 rw) │ │ (385 rows)    │  │  │
│  │  └──────────┘ └──────────┘ └─────────┘ └───────────────┘  │  │
│  └─────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

---

## 2. Module Structure & Folder Organization

### 2.1 Mendix Module Folder Convention

Trong Mendix Studio Pro, organize bằng **folder** trong Project Explorer:

```
📦 ProductManagement
├── 📁 domainmodel
│   └── Domain Model (entities, associations, view entities)
│
├── 📁 pages
│   ├── 📁 admin
│   │   └── Product_ImportData
│   ├── Product_List
│   ├── Product_EditPopup
│   ├── Product_CreatePopup
│   └── Product_Detail
│
├── 📁 microflows
│   ├── 📁 datasources
│   │   └── DS_Product_GetFilteredList
│   ├── 📁 actions
│   │   ├── ACT_Product_ToggleStatus
│   │   ├── ACT_Product_SaveEdit
│   │   ├── ACT_Product_CreateNew
│   │   ├── ACT_Product_DeleteProduct
│   │   └── ACT_Product_GenerateCode
│   ├── 📁 lookups
│   │   ├── MLK_Category_ByName
│   │   └── MLK_Supplier_ByCode
│   ├── 📁 imports
│   │   ├── ACT_Import_Categories
│   │   ├── ACT_Import_Suppliers
│   │   └── ACT_Import_Products
│   └── 📁 calculated
│       └── CAL_Product_TopVariantName
│
├── 📁 nanoflows
│   ├── 📁 page
│   │   └── NF_Page_Initialize
│   ├── 📁 filter
│   │   ├── NF_Filter_ResetFilter
│   │   └── NF_Filter_ApplyFilter
│   └── 📁 actions
│       ├── NF_Product_ToggleStatus
│       ├── NF_Product_OpenEditPopup
│       ├── NF_Product_OpenCreatePopup
│       ├── NF_Product_SaveEdit
│       └── NF_Product_SaveCreate
│
├── 📁 enumerations
│   └── ProductStatus
│
├── 📁 json_structures
│   ├── JS_Category
│   ├── JS_Supplier
│   └── JS_Product
│
├── 📁 import_mappings
│   ├── IM_Category
│   ├── IM_Supplier
│   └── IM_Product
│
├── 📁 java_actions
│   └── JA_GenerateProductCode
│
└── 📁 security
    └── Module Security
```

### 2.2 Naming Convention Summary

| Loại | Prefix | Ví dụ | Mô tả |
|------|--------|-------|-------|
| Microflow - Data source | `DS_` | `DS_Product_GetFilteredList` | Dùng làm Data Grid datasource |
| Microflow - Action | `ACT_` | `ACT_Product_ToggleStatus` | Thực hiện business action |
| Microflow - Lookup | `MLK_` | `MLK_Category_ByName` | Lookup entity cho import mapping |
| Microflow - Calculated | `CAL_` | `CAL_Product_TopVariantName` | Calculated attribute |
| Nanoflow - Page | `NF_` | `NF_Page_Initialize` | Client-side state init |
| Java Action | `JA_` | `JA_GenerateProductCode` | Java-based logic |
| View Entity | `*View` | `ProductSummaryView` | OQL View Entity |

---

## 3. Entity Strategy: PE vs NPE vs View Entity

### 3.1 Decision Matrix

```
Khi nào dùng loại Entity nào?

┌──────────────────────────┬────────────────────────────────────────┐
│ Persistent Entity (PE)   │ Dữ liệu cần lưu DB, query, share      │
│ Viền xanh trong DM       │ → Product, Category, Supplier, Variant │
├──────────────────────────┼────────────────────────────────────────┤
│ Non-Persistent (NPE)     │ Tạm thời, per-session, UI state        │
│ Viền cam trong DM        │ → FilterContext, EditProxy             │
├──────────────────────────┼────────────────────────────────────────┤
│ View Entity              │ Read-only aggregated, computed columns │
│ Icon đặc biệt trong DM   │ → ProductSummaryView (OQL query)      │
└──────────────────────────┴────────────────────────────────────────┘
```

### 3.2 View Entity: ProductSummaryView

**Vai trò:** Thay thế datasource microflow `DS_Product_GetFilteredList` bằng **OQL View Entity** — chạy trực tiếp trên database, efficient hơn microflow retrieve + loop.

**Tại sao View Entity thay vì Microflow datasource?**

| Tiêu chí | Microflow Datasource | OQL View Entity |
|----------|---------------------|-----------------|
| Performance | N+1 queries (retrieve + loop) | 1 SQL query |
| Paging | Client-side (ALL data transferred) | **Server-side** (efficient) |
| Sort/Filter | Manual trong MF | Native Data Grid 2 support |
| Aggregation | Loop trong MF | SQL aggregation (efficient) |
| Maintainability | Complex MF logic | 1 OQL query |
| Refresh | Trigger via context change | Auto (DB query mỗi lần) |

**Kết luận:** View Entity là lựa chọn tốt hơn cho Product List datasource.

### 3.3 Revised Architecture with View Entity

```
┌─────────────────────────────────────────────────────────┐
│  Product List Page                                       │
│                                                          │
│  Data View (ProductFilterContext NPE)                    │
│    ├── Filter Bar → bind to NPE associations             │
│    └── Data Grid 2                                       │
│         │                                                │
│         │  Data Source: DATABASE → ProductSummaryView    │
│         │  (View Entity — NOT Microflow!)                │
│         │                                                │
│         │  XPath Constraint:                             │
│         │  [ProductSummaryView/ProductSummaryView_Category = │
│         │    $currentObject/FilterContext_Category]      │
│         │  ...                                           │
│         │                                                │
│         │  ⚠️ Vấn đề: DG2 Database source KHÔNG thể     │
│         │  nhận NPE parameter làm XPath constraint!      │
│         │                                                │
│         │  ✅ Giải pháp: Dùng Microflow datasource       │
│         │  với OQL retrieve trong MF                     │
│  └──────────────────────────────────────────────────────│
```

> **Quan trọng:** Data Grid 2 **Database datasource** không thể reference NPE associations trong XPath constraint. Vậy nên ta cần **kết hợp**: OQL View Entity để define aggregated data + Microflow datasource để apply filter từ NPE context.

---

## 4. Key Design Decisions

### Decision 1: Product List Datasource

**Chọn: Microflow datasource + OQL retrieve bên trong microflow**

Lý do:
1. Data Grid 2 Database source không nhận NPE parameter
2. Cần filter dynamic từ NPE context (category, supplier, date range)
3. OQL retrieve trong microflow cho phép parameterized query
4. View Entity vẫn được dùng cho các trang **không cần dynamic filter** (reports, dashboards)

### Decision 2: Top Variant Column

**Chọn: OQL subquery trong microflow retrieve**

Thay vì calculated attribute (N+1 query) hay View Entity (không filter được), ta dùng **OQL retrieve** trong microflow `DS_Product_GetFilteredList` — 1 query lấy tất cả data cần thiết.

### Decision 3: Product Code Generation

**Chọn: Java Action**

Lý do:
- Microflow `random()` không guarantee uniqueness
- Cần access DB để check existing codes
- Java Action cho phép atomic sequence generation
- Format: `PRD-YYYYMMDD-NNNN` với guaranteed uniqueness

### Decision 4: Import Data

**Chọn: REST Import Mapping**

Lý do:
- JSON data sẵn có
- Import Mapping hỗ trợ nested objects + association lookup
- REST endpoint cho phép import qua cURL (development convenience)

---

## 5. Complete Backend Component List

### 5.1 Microflows (8 total)

| # | Name | Folder | Purpose | Called by |
|---|------|--------|---------|-----------|
| 1 | `DS_Product_GetFilteredList` | datasources | Product list với filter + aggregated columns | DG2 datasource |
| 2 | `ACT_Product_ToggleStatus` | actions | Toggle Active ↔ Inactive + commit | NF_Toggle |
| 3 | `ACT_Product_SaveEdit` | actions | Copy NPE→PE + validate + commit | NF_SaveEdit |
| 4 | `ACT_Product_CreateNew` | actions | Create Product + generate code + commit | NF_SaveCreate |
| 5 | `ACT_Product_DeleteProduct` | actions | Delete Product + cascade variants | Delete button |
| 6 | `ACT_Product_GenerateCode` | actions | Generate unique PRD code via Java Action | ACT_CreateNew |
| 7 | `MLK_Category_ByName` | lookups | Lookup Category by categoryName | Import mapping |
| 8 | `MLK_Supplier_ByCode` | lookups | Lookup Supplier by supplierCode | Import mapping |

### 5.2 Nanoflows (7 total)

| # | Name | Folder | Purpose |
|---|------|--------|---------|
| 1 | `NF_Page_Initialize` | page | Create FilterContext NPE |
| 2 | `NF_Filter_ResetFilter` | filter | Reset all filters |
| 3 | `NF_Product_ToggleStatus` | actions | Call MF toggle + refresh |
| 4 | `NF_Product_OpenEditPopup` | actions | Copy PE→NPE + open popup |
| 5 | `NF_Product_OpenCreatePopup` | actions | Create NPE + open popup |
| 6 | `NF_Product_SaveEdit` | actions | Validate + call MF + close |
| 7 | `NF_Product_SaveCreate` | actions | Validate + call MF + close |

### 5.3 Java Actions (1 total)

| # | Name | Purpose |
|---|------|---------|
| 1 | `JA_GenerateProductCode` | Generate unique product code with sequence |

### 5.4 OQL Queries

| # | Location | Purpose |
|---|----------|---------|
| 1 | OQL Retrieve trong `DS_Product_GetFilteredList` | Get products with top variant aggregation |

### 5.5 Pages (4 total)

| # | Name | Layout | Entity |
|---|------|--------|--------|
| 1 | `Product_List` | Sidebar_Full_Responsive | FilterContext (NPE) |
| 2 | `Product_EditPopup` | PopupLayout | EditProxy (NPE) |
| 3 | `Product_CreatePopup` | PopupLayout | EditProxy (NPE) |
| 4 | `Product_Detail` | PopupLayout | Product (PE) |

---

## Tổng kết

File này thiết lập kiến trúc backend hoàn chỉnh:
- ✅ Module folder structure chuẩn Mendix
- ✅ Entity strategy (PE / NPE / View Entity) cho từng use case
- ✅ 8 Microflows + 7 Nanoflows + 1 Java Action
- ✅ Key design decisions với rationale
- ✅ Complete component list

**Tiếp theo:** [10-oql-view-entity.md](10-oql-view-entity.md) — OQL View Entity cho aggregated product data
