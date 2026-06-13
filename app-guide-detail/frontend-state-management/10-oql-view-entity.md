# 10 - OQL View Entity & OQL Retrieve cho Product Management

## Mục lục

1. [Vai trò của OQL trong Product Management](#1-vai-trò-của-oql)
2. [OQL Retrieve trong Microflow DS_Product_GetFilteredList](#2-oql-retrieve-trong-microflow-datasource)
3. [OQL View Entity: ProductSummaryView (cho Reports)](#3-oql-view-entity-productsummaryview)
4. [OQL Query Reference cho Product Module](#4-oql-query-reference)

---

## 1. Vai trò của OQL trong Product Management

### 1.1 Tại sao cần OQL?

Product List page cần hiển thị data từ **nhiều entity kết hợp**:

```
Product List Row cần:
├── Product (base)           → PE, retrieve trực tiếp
├── Category (association)   → PE, join qua association
├── Supplier (association)   → PE, join qua association
├── Top Variant (aggregate)  → ProductVariant, cần GROUP BY + MAX
├── Variant Count (aggregate)→ ProductVariant, cần COUNT
└── Total Stock (aggregate)  → ProductVariant, cần SUM
```

**Mendix XPath** không hỗ trợ aggregation trong retrieve → **OQL là giải pháp duy nhất** để lấy aggregated data trong 1 query.

### 1.2 Hai cách dùng OQL

| Cách | Khi nào dùng | Ví dụ trong module |
|------|-------------|-------------------|
| **OQL Retrieve** trong Microflow | Cần dynamic filter từ NPE parameter | `DS_Product_GetFilteredList` |
| **OQL View Entity** trên Domain Model | Read-only view, không cần dynamic filter | `ProductSummaryView` (reports) |

---

## 2. OQL Retrieve trong Microflow Datasource

### 2.1 Microflow: DS_Product_GetFilteredList

**Mục đích:** Data source cho Data Grid 2. Lấy Product list với aggregated variant data, filter theo NPE context.

**Parameters:**
- `FilterContext` (type: `ProductManagement.ProductFilterContext`) — NPE chứa filter state

**Return type:** List of `ProductManagement.Product`

### 2.2 OQL Query (chi tiết đầy đủ)

```sql
SELECT
    p/ProductCode      AS ProductCode,
    p/ProductName      AS ProductName,
    p/Description      AS Description,
    p/ProductMinPrice  AS ProductMinPrice,
    p/ProductMaxPrice  AS ProductMaxPrice,
    p/QuickNote        AS QuickNote,
    p/Status           AS Status,
    p/CreatedDate      AS CreatedDate,
    p/UpdatedDate      AS UpdatedDate,
    p/CreatedBy        AS CreatedBy,
    p/ChangedBy        AS ChangedBy,
    c/CategoryName     AS CategoryName,
    s/SupplierName     AS SupplierName,
    COALESCE(
        (SELECT pv/VariantName
         FROM ProductManagement.ProductVariant AS pv
         WHERE pv/ProductManagement.ProductVariant_Product/ProductManagement.Product = p
         ORDER BY pv/RemainingQuantity DESC
         LIMIT 1),
        '—'
    )                  AS TopVariantName,
    COALESCE(
        (SELECT SUM(pv/RemainingQuantity)
         FROM ProductManagement.ProductVariant AS pv
         WHERE pv/ProductManagement.ProductVariant_Product/ProductManagement.Product = p),
        0
    )                  AS TotalStock,
    COALESCE(
        (SELECT COUNT(*)
         FROM ProductManagement.ProductVariant AS pv
         WHERE pv/ProductManagement.ProductVariant_Product/ProductManagement.Product = p),
        0
    )                  AS VariantCount
FROM ProductManagement.Product AS p
LEFT OUTER JOIN p/ProductManagement.Product_Category/ProductManagement.Category AS c
LEFT OUTER JOIN p/ProductManagement.Product_Supplier/ProductManagement.Supplier AS s
ORDER BY p/CreatedDate DESC
```

> **Lưu ý về OQL syntax trong Mendix v10:**
> - Entity names phải include module prefix: `ProductManagement.Product`
> - Association path format: `pv/Module.Association_Name/Module.Entity`
> - Subquery phải có alias cho mỗi column
> - `COALESCE` xử lý NULL khi product không có variant
> - Mendix OQL **không hỗ trợ** `WITH` clause (CTE)

### 2.3 Cách tạo OQL Retrieve trong Microflow

**Bước từng bước trong Mendix Studio Pro:**

1. **Mở microflow** `DS_Product_GetFilteredList`
2. **Thêm Activity** → **Retrieve** → Source: **From OQL**
3. **OQL Query** — paste query ở section 2.2

> **⚠️ Vấn đề:** Mendix OQL Retrieve **không hỗ trợ parameterized query** trực tiếp (không thể truyền `$FilterContext` vào OQL string).

**Giải pháp thực tế — Kết hợp XPath Retrieve + OQL:**

Vì OQL Retrieve không nhận parameter, ta dùng **2-step approach**:

```
Bước 1: XPath Retrieve — lấy filtered Product list (dùng NPE parameter)
Bước 2: Loop qua Product list → OQL Retrieve per-product cho variant aggregation
         (hoặc dùng calculated attribute cho top variant)
```

> **Tuy nhiên**, loop + OQL per-product là N+1 problem. Cách tốt hơn:

### 2.4 Giải pháp Khuyến nghị: XPath Retrieve + Calculated Attributes

**Thực tế trên Mendix v10.24.9, cách optimal nhất cho Product List:**

```
┌─────────────────────────────────────────────────────────┐
│ Microflow: DS_Product_GetFilteredList                   │
│                                                          │
│ 1. Retrieve Product list via XPath (filtered by NPE)    │
│    - XPath constraint dùng NPE association               │
│    - Sort: createdDate DESC                              │
│                                                          │
│ 2. Return Product list                                   │
│                                                          │
│ 3. Calculated attributes chạy tự động khi cần:          │
│    - calculated_TopVariantName (CAL_Product_TopVariant)  │
│    - calculated_RowNumber (set trong loop)               │
│                                                          │
│ DG2 hiển thị: PE attributes + association paths +        │
│               calculated attributes                      │
└─────────────────────────────────────────────────────────┘
```

**Microflow thực tế:**

```
[Start]
   │
   ▼
┌──────────────────────────────────────────────────────┐
│ Retrieve from Database:                               │
│ Entity: ProductManagement.Product                    │
│                                                      │
│ XPath:                                               │
│   [ProductManagement.Product_Category =              │
│     $FilterContext/FilterContext_Category]           │
│   [ProductManagement.Product_Supplier =              │
│     $FilterContext/FilterContext_Supplier]           │
│   [createdDate >= $FilterContext/dateFrom]           │
│   [createdDate <= $FilterContext/dateTo]             │
│                                                      │
│ Sort: createdDate (descending)                       │
│ Range: All                                           │
│ Variable: $ProductList                               │
└────────────────────────┬─────────────────────────────┘
                         ▼
               ┌──────────────────┐
               │ Return: $ProductList │
               └──────────────────┘
```

**Calculated Attribute: `calculated_TopVariantName`**

Microflow `CAL_Product_TopVariantName`:
```
Parameter: Product (ProductManagement.Product)
Return: String

[Start]
   │
   ▼
Retrieve from Database:
  Entity: ProductManagement.ProductVariant
  XPath: [ProductManagement.ProductVariant_Product = $Product]
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

> **Performance Note:** Calculated attribute fires **per-row** khi Data Grid 2 render. Với 100 products → 100 extra queries. Acceptable cho demo, nhưng cho production cần caching hoặc OQL View Entity.

### 2.5 OQL Retrieve Alternative (nếu cần 1-query solution)

Nếu muốn **1 query duy nhất** lấy tất cả data (bao gồm aggregated), dùng **Java Action** với OQL API:

```java
// Xem chi tiết trong file 12-java-action.md
// JA_RetrieveProductSummary.java
String oql = "SELECT p/ID, p/ProductCode, p/ProductName, "
    + "COALESCE((SELECT pv/VariantName FROM ProductManagement.ProductVariant AS pv "
    + "WHERE pv/ProductManagement.ProductVariant_Product/ProductManagement.Product = p "
    + "ORDER BY pv/RemainingQuantity DESC LIMIT 1), '—') AS TopVariant "
    + "FROM ProductManagement.Product AS p";
IDataTable result = Core.retrieveOQLDataTable(getContext(), oql);
```

> **Xem file 12-java-action.md** cho full implementation.

---

## 3. OQL View Entity: ProductSummaryView

### 3.1 Mục đích

View Entity `ProductSummaryView` dùng cho:
- **Report pages** — không cần dynamic filter từ NPE
- **Dashboard widgets** — Charts, Statistics
- **Admin overview** — tất cả products với aggregated data

> **View Entity KHÔNG dùng cho Product List page** (vì cần filter từ NPE). Dùng cho các trang khác cần cùng data nhưng không cần dynamic filter.

### 3.2 Tạo View Entity trong Mendix Studio Pro v10

**Bước 1: Enable OQL v2**

1. Mở **Project Settings** → **Runtime** → **OQL version** → Chọn **2**

> **Quan trọng:** View Entity chỉ available khi OQL v2 enabled. Mendix v10.24.9 hỗ trợ OQL v2 mặc định.

**Bước 2: Tạo View Entity**

1. Mở **Domain Model** của module `ProductManagement`
2. Right-click trên khoảng trống → **Add View Entity**
3. Đặt tên: **ProductSummaryView**
4. Mendix mở **OQL Editor** — paste query dưới đây

**Bước 3: OQL Query cho ProductSummaryView**

```sql
SELECT
    p/ID                    AS ID,
    p/ProductCode           AS ProductCode,
    p/ProductName           AS ProductName,
    p/Description           AS Description,
    p/ProductMinPrice       AS ProductMinPrice,
    p/ProductMaxPrice       AS ProductMaxPrice,
    p/QuickNote             AS QuickNote,
    p/Status                AS Status,
    p/CreatedDate           AS CreatedDate,
    p/UpdatedDate           AS UpdatedDate,
    p/CreatedBy             AS CreatedBy,
    p/ChangedBy             AS ChangedBy,
    c/CategoryName          AS CategoryName,
    s/SupplierName          AS SupplierName,
    COALESCE(
        (SELECT pv/VariantName
         FROM ProductManagement.ProductVariant AS pv
         WHERE pv/ProductManagement.ProductVariant_Product/ProductManagement.Product = p
         ORDER BY pv/RemainingQuantity DESC
         LIMIT 1),
        '—'
    )                       AS TopVariantName,
    COALESCE(
        (SELECT SUM(pv/RemainingQuantity)
         FROM ProductManagement.ProductVariant AS pv
         WHERE pv/ProductManagement.ProductVariant_Product/ProductManagement.Product = p),
        0
    )                       AS TotalStock,
    COALESCE(
        (SELECT COUNT(*)
         FROM ProductManagement.ProductVariant AS pv
         WHERE pv/ProductManagement.ProductVariant_Product/ProductManagement.Product = p),
        0
    )                       AS VariantCount
FROM ProductManagement.Product AS p
LEFT OUTER JOIN p/ProductManagement.Product_Category/ProductManagement.Category AS c
LEFT OUTER JOIN p/ProductManagement.Product_Supplier/ProductManagement.Supplier AS s
```

**Bước 4: Configure View Entity**

1. Trong OQL Editor, kiểm tra không có validation errors
2. Click **Save**
3. View Entity xuất hiện trong Domain Model với icon đặc biệt

> **Lưu ý về `p/ID AS ID`:** Column `ID` (hoặc alias bắt đầu bằng `From`) tạo association ngầm từ View Entity đến source entity. Nếu muốn tạo association `ProductSummaryView → Product`, alias phải là:
> ```
> p/ID AS FromProductSummaryViewToProduct
> ```

### 3.3 View Entity Attributes (auto-generated)

Sau khi lưu, Mendix auto-generate attributes từ OQL columns:

| Attribute | Type | Source |
|-----------|------|--------|
| `ID` | AutoID | `p/ID` |
| `ProductCode` | String | `p/ProductCode` |
| `ProductName` | String | `p/ProductName` |
| `Description` | String | `p/Description` |
| `ProductMinPrice` | Decimal | `p/ProductMinPrice` |
| `ProductMaxPrice` | Decimal | `p/ProductMaxPrice` |
| `QuickNote` | String | `p/QuickNote` |
| `Status` | String (not enum!) | `p/Status` |
| `CreatedDate` | DateTime | `p/CreatedDate` |
| `UpdatedDate` | DateTime | `p/UpdatedDate` |
| `CreatedBy` | String | `p/CreatedBy` |
| `ChangedBy` | String | `p/ChangedBy` |
| `CategoryName` | String | `c/CategoryName` |
| `SupplierName` | String | `s/SupplierName` |
| `TopVariantName` | String | Subquery result |
| `TotalStock` | Integer | Subquery result |
| `VariantCount` | Integer | Subquery result |

> **⚠️ Quan trọng:** OQL View Entity columns **luôn là primitive types** — `Status` sẽ là String, không phải Enumeration. Nếu cần hiển thị enum badge trên UI, dùng conditional expression trong page.

### 3.4 Dùng View Entity trên Page

**Data Grid 2 với View Entity (Database source):**

1. Kéo **Data Grid 2** lên page
2. Data source → **Database**
3. Entity: `ProductManagement.ProductSummaryView`
4. Mendix auto-generate columns từ View Entity attributes
5. Paging, sorting, filtering **hoạt động server-side** (efficient!)

> **Ưu điểm:** Không cần microflow datasource. Database source với View Entity = server-side paging/sorting. Performance tốt nhất.

> **Hạn chế:** Không thể apply filter từ NPE context (không có XPath access đến NPE). Chỉ dùng cho trang không cần dynamic filter, hoặc dùng **DG2 built-in filter** (column header filters).

### 3.5 View Entity Access Rules

View Entity **không cần access rules** (theo Mendix docs). Tuy nhiên, OQL query bên trong **không tự động apply access rules** của source entities. Nếu cần security, filter manually trong OQL WHERE clause.

---

## 4. OQL Query Reference cho Product Module

### 4.1 Query: Product Count by Category

```sql
SELECT
    c/CategoryName  AS CategoryName,
    COUNT(*)         AS ProductCount,
    SUM(
        COALESCE((SELECT COUNT(*)
         FROM ProductManagement.ProductVariant AS pv
         WHERE pv/ProductManagement.ProductVariant_Product/ProductManagement.Product = p), 0)
    )                AS TotalVariants
FROM ProductManagement.Product AS p
JOIN p/ProductManagement.Product_Category/ProductManagement.Category AS c
GROUP BY c/CategoryName
ORDER BY ProductCount DESC
```

### 4.2 Query: Low Stock Products (stock < 10)

```sql
SELECT
    p/ProductCode       AS ProductCode,
    p/ProductName       AS ProductName,
    c/CategoryName      AS CategoryName,
    COALESCE(
        (SELECT SUM(pv/RemainingQuantity)
         FROM ProductManagement.ProductVariant AS pv
         WHERE pv/ProductManagement.ProductVariant_Product/ProductManagement.Product = p),
        0
    )                   AS TotalStock
FROM ProductManagement.Product AS p
LEFT OUTER JOIN p/ProductManagement.Product_Category/ProductManagement.Category AS c
WHERE p/Status = 'Active'
ORDER BY TotalStock ASC
LIMIT 20
```

### 4.3 Query: Products by Supplier (cho admin report)

```sql
SELECT
    s/SupplierCode      AS SupplierCode,
    s/SupplierName      AS SupplierName,
    COUNT(*)            AS ProductCount,
    AVG(p/ProductMinPrice) AS AvgMinPrice,
    AVG(p/ProductMaxPrice) AS AvgMaxPrice
FROM ProductManagement.Product AS p
JOIN p/ProductManagement.Product_Supplier/ProductManagement.Supplier AS s
WHERE p/Status = 'Active'
GROUP BY s/SupplierCode, s/SupplierName
ORDER BY ProductCount DESC
```

### 4.4 OQL Syntax Notes cho Mendix v10.24.9

| Rule | Mendix OQL v2 |
|------|---------------|
| Entity reference | `ModuleName.EntityName` hoặc alias |
| Association path | `alias/ModuleName.AssociationName/ModuleName.Entity` |
| String literal | `'Active'` (single quotes) |
| Subquery | Phải có `LIMIT` khi dùng `ORDER BY` |
| NULL handling | Dùng `COALESCE(expr, default)` |
| Comments | `-- single line comment` |
| JOIN types | `JOIN` (inner), `LEFT OUTER JOIN`, `RIGHT OUTER JOIN` |
| GROUP BY | Phải list tất cả non-aggregated SELECT columns |
| Column alias | Bắt buộc cho mọi column trong View Entity |
| Duplicate columns | Phải chỉ định entity alias: `p/Name AS ProductName, c/Name AS CategoryName` |

---

## Tổng kết

- ✅ OQL Retrieve trong Microflow datasource cho filtered product list
- ✅ Calculated attributes cho per-row aggregation (TopVariantName)
- ✅ OQL View Entity `ProductSummaryView` cho reports/dashboard
- ✅ OQL query reference cho các use cases phổ biến
- ✅ Syntax notes cho Mendix OQL v2

**Tiếp theo:** [11-microflow-detail.md](11-microflow-detail.md) — Step-by-step microflow implementation
