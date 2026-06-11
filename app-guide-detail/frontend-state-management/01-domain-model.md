# 01 - Domain Model: Persistent & Non-Persistent Entities cho Product Management

## Mục lục

1. [Tạo Module ProductManagement](#1-tạo-module-productmanagement)
2. [Persistent Entities](#2-persistent-entities)
   - 2.1 [Entity: Category](#21-entity-category)
   - 2.2 [Entity: Supplier](#22-entity-supplier)
   - 2.3 [Entity: Product](#23-entity-product)
   - 2.4 [Entity: ProductVariant](#24-entity-productvariant)
3. [Non-Persistent Entities (State Management)](#3-non-persistent-entities-state-management)
   - 3.1 [Entity: ProductFilterContext](#31-entity-productfiltercontext)
   - 3.2 [Entity: ProductEditProxy](#32-entity-producteditproxy)
4. [Associations](#4-associations)
5. [Domain Model Diagram tổng hợp](#5-domain-model-diagram-tổng-hợp)
6. [Naming Conventions](#6-naming-conventions)

---

## 1. Tạo Module ProductManagement

### Bước 1.1: Thêm module mới

1. Trong Mendix Studio Pro → Right-click vào project root → **Add Module**
2. Đặt tên: **ProductManagement**
3. Chọn template: **Blank** (không cần layout mặc định)

### Bước 1.2: Mở Domain Model Editor

1. Mở **ProductManagement** → Double-click **Domain Model**
2. Trên thanh công cụ, đảm bảo đang ở chế độ **Edit**

> **Lưu ý quan trọng:** Tất cả entities trong guide này đều thuộc module `ProductManagement`. Khi reference trong pages/microflows, tên đầy đủ sẽ là `ProductManagement.Product`, `ProductManagement.Category`, v.v.

---

## 2. Persistent Entities

### 2.1 Entity: Category

**Mục đích:** Danh mục sản phẩm (Electronics, Clothing, Food & Beverages...)

| Attribute | Type | Length | Default Value | Required | Notes |
|-----------|------|--------|---------------|----------|-------|
| `categoryName` | String | 200 | — | ✅ | Tên danh mục, unique |
| `description` | String | 500 | empty | ❌ | Mô tả ngắn |
| `isActive` | Boolean | — | `true` | ✅ | Trạng thái active |

**Bước tạo:**
1. Kéo **Entity** từ toolbox vào domain model → Đặt tên: **Category**
2. Right-click Category → **Add** → **Attribute**
3. Thêm lần lượt các attributes theo bảng trên

**Validation Rules cho Category:**
- `categoryName`: Required, max length 200

---

### 2.2 Entity: Supplier

**Mục đích:** Nhà cung cấp sản phẩm

| Attribute | Type | Length | Default Value | Required | Notes |
|-----------|------|--------|---------------|----------|-------|
| `supplierCode` | String | 50 | — | ✅ | Mã nhà cung cấp, unique |
| `supplierName` | String | 200 | — | ✅ | Tên nhà cung cấp |
| `contactEmail` | String | 200 | empty | ❌ | Email liên hệ |
| `contactPhone` | String | 50 | empty | ❌ | Số điện thoại |
| `isActive` | Boolean | — | `true` | ✅ | Trạng thái active |

**Validation Rules cho Supplier:**
- `supplierCode`: Required, max length 50
- `supplierName`: Required, max length 200

---

### 2.3 Entity: Product

**Mục đích:** Sản phẩm chính — entity trung tâm của module

| Attribute | Type | Length | Default Value | Required | Notes |
|-----------|------|--------|---------------|----------|-------|
| `productCode` | String | 50 | — | ✅ | Mã sản phẩm, unique, auto-generated |
| `productName` | String | 300 | — | ✅ | Tên sản phẩm |
| `description` | String | 2000 | empty | ❌ | Mô tả chi tiết |
| `productMinPrice` | Decimal (15,2) | — | `0.00` | ✅ | Giá tối thiểu |
| `productMaxPrice` | Decimal (15,2) | — | `0.00` | ✅ | Giá tối đa |
| `quickNote` | String | 500 | empty | ❌ | Ghi chú nhanh |
| `status` | Enumeration `ProductStatus` | — | `Active` | ✅ | Active / Inactive |
| `createdDate` | Date and Time | — | `[%CurrentDateTime%]` | ✅ | Ngày tạo (auto) |
| `updatedDate` | Date and Time | — | `[%CurrentDateTime%]` | ✅ | Ngày cập nhật (auto) |
| `systemModule_CreatedBy` | String | 200 | `[%CurrentUser%]` | ❌ | Tạo bởi (auto-filled) |
| `systemModule_ChangedBy` | String | 200 | `[%CurrentUser%]` | ❌ | Cập nhật bởi (auto-filled) |
| `calculated_TopVariantName` | String | 300 | — | ❌ | Calculated (stored=false), MF: CAL_Product_TopVariantName |
| `calculated_RowNumber` | Integer | — | — | ❌ | Not stored, set manually trong DS_Product_GetFilteredList |

**Bước tạo:**
1. Kéo **Entity** từ toolbox → Đặt tên: **Product**
2. ✅ Tick **Enable access rules** (để cấu hình security sau)
3. Thêm từng attribute theo bảng trên

> **Quan trọng về `status` attribute:** Chưa tạo enumeration lúc này. Ta sẽ tạo enum `ProductStatus` ở file [02-enumerations-and-associations.md](02-enumerations-and-associations.md), sau đó quay lại gán type cho attribute này.

> **Quan trọng về auto-generated fields:**
> - `productCode`: Sẽ được generate trong microflow `ACT_Product_GenerateCode` (xem file 03)
> - `createdDate`: Set default value `[%CurrentDateTime%]` trong attribute properties
> - `updatedDate`: Sẽ được update mỗi lần save trong microflow
> - `systemModule_CreatedBy` / `systemModule_ChangedBy`: Set default `[%CurrentUser%]`, nhưng cần update manual trong microflow vì Mendix chỉ set giá trị default khi tạo mới object

**Validation Rules cho Product:**
- `productCode`: Required, max length 50
- `productName`: Required, max length 300
- `productMinPrice`: Required, >= 0
- `productMaxPrice`: Required, >= 0
- `productMinPrice` ≤ `productMaxPrice` (check trong microflow)

---

### 2.4 Entity: ProductVariant

**Mục đích:** Phiên bản biến thể của sản phẩm (màu sắc, kích thước, SKU)

| Attribute | Type | Length | Default Value | Required | Notes |
|-----------|------|--------|---------------|----------|-------|
| `variantName` | String | 300 | — | ✅ | Tên biến thể (vd: "Red - Large") |
| `sku` | String | 100 | — | ✅ | Mã SKU, unique |
| `price` | Decimal (15,2) | — | `0.00` | ✅ | Giá biến thể |
| `remainingQuantity` | Integer | — | `0` | ✅ | Số lượng tồn kho |
| `color` | String | 50 | empty | ❌ | Màu sắc |
| `size` | String | 50 | empty | ❌ | Kích thước |
| `isActive` | Boolean | — | `true` | ✅ | Trạng thái active |

**Validation Rules cho ProductVariant:**
- `variantName`: Required
- `sku`: Required, max length 100
- `price`: Required, >= 0
- `remainingQuantity`: >= 0

---

## 3. Non-Persistent Entities (State Management)

> **Đây là phần cốt lõi của Frontend State Management trong Mendix.**
>
> Non-Persistent Entities (NPE) **không lưu vào database** — chúng tồn tại chỉ trong **client session** (browser memory). NPE được dùng để:
> - Lưu trữ **filter state** (categories đã chọn, date range, v.v.)
> - Làm **proxy/edit buffer** — tách biệt dữ liệu đang edit với dữ liệu hiển thị
> - Pass **context** giữa các widgets trên cùng page
> - Manage **UI state** (modal open/close, selected row)

### 3.1 Entity: ProductFilterContext

**Mục đích:** Lưu trữ trạng thái filter trên page Product List. Là **single source of truth** cho mọi filter operation.

| Attribute | Type | Length | Default Value | Required | Notes |
|-----------|------|--------|---------------|----------|-------|
| `dateFrom` | Date and Time | — | empty | ❌ | Ngày bắt đầu filter (createdDate) |
| `dateTo` | Date and Time | — | empty | ❌ | Ngày kết thúc filter (createdDate) |
| `searchText` | String | 200 | empty | ❌ | Tìm kiếm text (tương lai mở rộng) |
| `currentPage` | Integer | — | `0` | ❌ | Trang hiện tại (pagination) |

**Associations (NPE owner):**
- `FilterContext_Category` → `Category` (Reference) — Category đang filter
- `FilterContext_Supplier` → `Supplier` (Reference) — Supplier đang filter

**Bước tạo:**
1. Kéo **Entity** từ toolbox → Đặt tên: **ProductFilterContext**
2. ⚠️ **Tick "Non-persistent"** trong entity properties → Entity sẽ có viền màu **cam** (thay vì xanh dương)
3. Thêm từng attribute theo bảng trên

> **Về Association-based Filter Pattern:**
>
> Ta dùng **NPE → PE association** (`FilterContext_Category`, `FilterContext_Supplier`) thay vì String ID. Khi dùng Microflow datasource cho Data Grid 2:
> - Microflow nhận `ProductFilterContext` (NPE) làm parameter
> - Trong microflow, retrieve Product list → filter bằng cách so sánh association:
>   `XPath: [Product_Category = $FilterContext/FilterContext_Category]`
> - Khi user chọn Category mới trên dropdown → NPE association update → Data View context change → Microflow datasource re-execute → Data Grid 2 refresh
>
> **Ưu điểm:** Type-safe, Mendix-standard, Reference Selector widget bind trực tiếp.
> **Lưu ý:** Dropdown/Reference Selector bind vào NPE association hoạt động tốt trong Data View context (Mendix v10 đã fix issue liên quan ở version 9.20+).

---

### 3.2 Entity: ProductEditProxy

**Mục đích:** Edit buffer (proxy) cho Quick Edit modal. Thay vì edit trực tiếp Persistent Entity Product (và rủi ro auto-commit), ta copy data sang NPE, edit trên NPE, rồi commit ngược lại PE.

| Attribute | Type | Length | Default Value | Required | Notes |
|-----------|------|--------|---------------|----------|-------|
| `targetProductId` | String | 200 | empty | ✅ | ID của Product đang edit |
| `productName` | String | 300 | — | ✅ | Buffer cho Product.productName |
| `description` | String | 2000 | empty | ❌ | Buffer cho Product.description |
| `productMinPrice` | Decimal (15,2) | — | `0.00` | ✅ | Buffer cho Product.productMinPrice |
| `productMaxPrice` | Decimal (15,2) | — | `0.00` | ✅ | Buffer cho Product.productMaxPrice |
| `quickNote` | String | 500 | empty | ❌ | Buffer cho Product.quickNote |

**Associations (NPE owner):**
- `EditProxy_Category` → `Category` (Reference) — Category được chọn trong edit form

**Bước tạo:**
1. Kéo **Entity** từ toolbox → Đặt tên: **ProductEditProxy**
2. ⚠️ **Tick "Non-persistent"** → Viền **cam**
3. Thêm từng attribute

> **Tại sao cần ProductEditProxy thay vì edit trực tiếp Product?**
>
> 1. **Undo support:** Nếu user mở popup edit rồi Cancel → không ảnh hưởng data gốc
> 2. **Avoid auto-commit:** Một số widget trong Mendix auto-commit object khi mất focus. NPE không commit vào DB nên an toàn
> 3. **Validation trước commit:** Có thể validate trên NPE trước, chỉ copy sang PE khi tất cả valid
> 4. **Popup pattern chuẩn:** Mendix khuyến nghị pattern "NPE proxy" cho mọi popup edit form

---

## 4. Associations

### Bước 4.1: Category → Product (1-to-many)

1. Kéo đường association từ **Category** đến **Product**
2. Cấu hình:
   - **Type:** Reference (1-to-many) — một Category có nhiều Product
   - **Owner:** Default (Product sở hữu foreign key)
   - **Name:** `Category_Product` (hoặc để Mendix tự generate: `Product_Category`)

```
Category 1 ────── * Product
```

### Bước 4.2: Supplier → Product (1-to-many)

1. Kéo đường association từ **Supplier** đến **Product**
2. Cấu hình:
   - **Type:** Reference (1-to-many) — một Supplier có nhiều Product
   - **Owner:** Default
   - **Name:** `Supplier_Product`

```
Supplier 1 ────── * Product
```

### Bước 4.3: Product → ProductVariant (1-to-many)

1. Kéo đường association từ **Product** đến **ProductVariant**
2. Cấu hình:
   - **Type:** Reference (1-to-many) — một Product có nhiều ProductVariant
   - **Owner:** Default
   - **Name:** `Product_ProductVariant`

```
Product 1 ────── * ProductVariant
```

### Bước 4.4: ProductFilterContext → Product (Reference Set — optional)

> **Tùy chọn:** Nếu muốn NPE association thay vì String ID
>
> 1. Kéo association từ **ProductFilterContext** đến **Category** → Type: **Reference**
> 2. Kéo association từ **ProductFilterContext** đến **Supplier** → Type: **Reference**

> **Khuyến nghị:** Dùng **NPE-PE association pattern** với Reference Selector widget. Khi kết hợp với Microflow datasource cho Data Grid 2, association-based filter hoạt động ổn định trong Mendix v10.

### Bảng tổng hợp Associations

| # | Từ Entity | Đến Entity | Type | Name | Owner |
|---|-----------|-----------|------|------|-------|
| 1 | Product | Category | Reference | `Product_Category` | Product |
| 2 | Product | Supplier | Reference | `Product_Supplier` | Product |
| 3 | Product | ProductVariant | Reference | `Product_ProductVariant` | Product |
| 4 | ProductFilterContext | Category | Reference | `FilterContext_Category` | ProductFilterContext (NPE) |
| 5 | ProductFilterContext | Supplier | Reference | `FilterContext_Supplier` | ProductFilterContext (NPE) |
| 6 | ProductEditProxy | Category | Reference | `EditProxy_Category` | ProductEditProxy (NPE) |

---

## 5. Domain Model Diagram tổng hợp

```
╔══════════════════════════════════════════════════════════════════════════╗
║                    PERSISTENT ENTITIES (vien xanh)                      ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                         ║
║  ┌──────────────────┐         ┌──────────────────────────────────┐      ║
║  │    Category      │ 1─────* │          Product                 │      ║
║  ├──────────────────┤         ├──────────────────────────────────┤      ║
║  │ categoryName  ✅ │         │ productCode       ✅  (auto-gen) │      ║
║  │ description      │         │ productName        ✅             │      ║
║  │ isActive      ✅ │         │ description                       │      ║
║  └──────────────────┘         │ productMinPrice ✅ (Decimal 15,2)│      ║
║                               │ productMaxPrice ✅ (Decimal 15,2)│      ║
║                               │ quickNote                         │      ║
║  ┌──────────────────┐         │ status          ✅ (ProductStatus)│      ║
║  │    Supplier      │ 1─────* │ createdDate     ✅ (auto)         │      ║
║  ├──────────────────┤         │ updatedDate     ✅ (auto)         │      ║
║  │ supplierCode  ✅ │         │ createdBy                        │      ║
║  │ supplierName  ✅ │         │ changedBy                        │      ║
║  │ contactEmail     │         └───────────┬──────────────────────┘      ║
║  │ contactPhone     │                     │ 1                           ║
║  │ isActive      ✅ │                     │                             ║
║  └──────────────────┘                     *                             ║
║                               ┌──────────────────────────────────┐      ║
║                               │       ProductVariant             │      ║
║                               ├──────────────────────────────────┤      ║
║                               │ variantName       ✅              │      ║
║                               │ sku               ✅              │      ║
║                               │ price          ✅ (Decimal 15,2)  │      ║
║                               │ remainingQuantity ✅ (Integer)    │      ║
║                               │ color                             │      ║
║                               │ size                              │      ║
║                               │ isActive       ✅                 │      ║
║                               └──────────────────────────────────┘      ║
╠══════════════════════════════════════════════════════════════════════════╣
║                  NON-PERSISTENT ENTITIES (vien cam)                     ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                         ║
║  ┌──────────────────────────────┐   ┌──────────────────────────────┐   ║
║  │   ProductFilterContext (NPE) │   │    ProductEditProxy (NPE)    │   ║
║  ├──────────────────────────────┤   ├──────────────────────────────┤   ║
║  │ dateFrom       (DateTime)   │   │ targetProductId    (String)  │   ║
║  │ dateTo         (DateTime)   │   │ productName        (String)  │   ║
║  │ searchText        (String)  │   │ description        (String)  │   ║
║  │ currentPage      (Integer)  │   │ productMinPrice   (Decimal)  │   ║
║  │                              │   │ productMaxPrice   (Decimal)  │   ║
║  │ ASSOCIATIONS:                │   │ quickNote          (String)  │   ║
║  │ → Category (Reference)      │   │                              │   ║
║  │ → Supplier (Reference)      │   │ ASSOCIATION:                  │   ║
║  └──────────────────────────────┘   │ → Category (Reference)      │   ║
║                                     └──────────────────────────────┘   ║
║   → Data Source cho Data View                                           ║
║     bọc ngoài Page                   → Data Source cho Popup Page       ║
║                                        (Edit + Create Modal)            ║
╚══════════════════════════════════════════════════════════════════════════╝
```

---

## 6. Naming Conventions

### Quy tắc đặt tên trong module ProductManagement

| Loại | Format | Ví dụ |
|------|--------|-------|
| Entity | PascalCase | `Product`, `Category`, `ProductFilterContext` |
| Attribute | camelCase | `productName`, `createdDate`, `selectedCategoryId` |
| Association | `{Owner}_{Target}` | `Product_Category`, `Product_ProductVariant` |
| Enumeration | PascalCase | `ProductStatus` |
| Enum value | PascalCase | `Active`, `Inactive` |
| Microflow | `ACT_{Entity}_{Action}` | `ACT_Product_ToggleStatus` |
| Nanoflow | `NF_{Entity}_{Action}` | `NF_Filter_ResetFilters` |
| Page | `{Entity}_{Purpose}` | `Product_List`, `Product_EditPopup` |

### Quy tắc quan trọng

1. **NPE luôn có suffix** mô tả purpose: `*Context` (state holder), `*Proxy` (edit buffer)
2. **String ID attributes** trên NPE luôn bắt đầu bằng `selected*` hoặc `target*` → phân biệt với real association
3. **Microflow = Server-side** (DB operations, email, integration)
4. **Nanoflow = Client-side** (UI state, NPE manipulation, navigation)
5. **Mọi Persistent Entity** cần có `createdDate`, `updatedDate` để tracking

---

## Tổng kết

Sau khi hoàn thành file này, bạn đã có:
- ✅ Module `ProductManagement` với 4 Persistent Entities
- ✅ 2 Non-Persistent Entities cho state management
- ✅ 3 PE-PE Associations (Product→Category, Product→Supplier, Product→ProductVariant)
- ✅ 3 NPE-PE Associations (FilterContext→Category, FilterContext→Supplier, EditProxy→Category)
- ✅ Naming conventions nhất quán

**Tiếp theo:** [02-enumerations-and-associations.md](02-enumerations-and-associations.md) — Tạo Enumerations và hoàn thiện Associations
