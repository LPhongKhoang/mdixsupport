# 11 - Microflow Implementation: Step-by-Step cho Mendix Studio Pro v10

## Mục lục

1. [DS_Product_GetFilteredList — Data Source](#1-ds_product_getfilteredlist)
2. [ACT_Product_ToggleStatus — Toggle Active/Inactive](#2-act_product_togglestatus)
3. [ACT_Product_SaveEdit — Save từ NPE Proxy](#3-act_product_saveedit)
4. [ACT_Product_CreateNew — Tạo Product mới](#4-act_product_createnew)
5. [ACT_Product_DeleteProduct — Xóa Product](#5-act_product_deleteproduct)
6. [CAL_Product_TopVariantName — Calculated Attribute](#6-cal_product_topvariantname)
7. [Import Microflows — Seed Data](#7-import-microflows)

---

## 1. DS_Product_GetFilteredList

**Mục đích:** Data source cho Data Grid 2. Lấy Product list đã filter.

**Location:** `ProductManagement/microflows/datasources/`

### Step-by-Step trong Studio Pro

**Bước 1: Tạo Microflow**
1. Right-click folder `datasources` → **Add Microflow**
2. Name: `DS_Product_GetFilteredList`

**Bước 2: Thêm Parameter**
1. Kéo **Parameter** từ toolbox vào microflow
2. Name: `FilterContext`
3. Type: `ProductManagement.ProductFilterContext`

**Bước 3: Set Return Type**
1. Double-click End event (green circle)
2. Return type: `List of ProductManagement.Product`

**Bước 4: Thêm Retrieve Activity**
1. Kéo **Retrieve** activity từ toolbox
2. Configure:

| Property | Value |
|----------|-------|
| Source | **From database** |
| Entity | `ProductManagement.Product` |
| XPath | (xem bên dưới) |
| Sort | `createdDate` DESC |
| Range | All |

**XPath Constraint (paste vào XPath builder):**

```
[ProductManagement.Product_Category = $FilterContext/FilterContext_Category]
[ProductManagement.Product_Supplier = $FilterContext/FilterContext_Supplier]
[createdDate >= $FilterContext/dateFrom]
[createdDate <= $FilterContext/dateTo]
```

> **Mendix XPath behavior:** Nếu association variable = empty → condition tự động bị skip. Nếu date = empty → date condition bị skip. Không cần if-else logic.

**Bước 5: Connect và Return**
1. Start → Retrieve → End
2. End event → Return: `$ProductList` (variable từ Retrieve)

**Microflow hoàn thành:**

```
[Start] → Parameter: FilterContext (ProductFilterContext)
   │
   ▼
[Retrieve] → Database → Product
   XPath: [Product_Category=$FC/FC_Category][Product_Supplier=$FC/FC_Supplier]
          [createdDate>=$FC/dateFrom][createdDate<=$FC/dateTo]
   Sort: createdDate DESC
   Variable: ProductList
   │
   ▼
[End] → Return: $ProductList
```

---

## 2. ACT_Product_ToggleStatus

**Location:** `ProductManagement/microflows/actions/`

### Step-by-Step

**Bước 1: Tạo Microflow + Parameter**
- Name: `ACT_Product_ToggleStatus`
- Parameter: `Product` (type: `ProductManagement.Product`)
- Return type: `ProductManagement.Product`

**Bước 2: Thêm Exclusive Split**

| Property | Value |
|----------|-------|
| Variable | `New` (tạo mới) |
| Name | `IsCurrentlyActive` |
| Condition | `$Product/status = ProductManagement.ProductStatus.Active` |
| Type | Boolean |

**Bước 3: Thêm Change Object (True branch)**
- Activity: **Change Object**
- Object: `$Product`
- Changes:
  - `status` = `ProductManagement.ProductStatus.Inactive`

**Bước 4: Thêm Change Object (False branch)**
- Activity: **Change Object**
- Object: `$Product`
- Changes:
  - `status` = `ProductManagement.ProductStatus.Active`

**Bước 5: Merge + Update Timestamps**
- Thêm **Merge** activity (hoặc connect cả 2 branches vào 1 Change Object)
- Activity: **Change Object**
- Object: `$Product`
- Changes:
  - `updatedDate` = `[%CurrentDateTime%]`
  - `changedBy` = `[%CurrentUser%]`

**Bước 6: Commit**
- Activity: **Commit**
- Object: `$Product`
- ✅ With events (nếu có before/after commit event handlers)
- Variable: `Product` (re-set sau commit)

**Bước 7: End Event**
- Return: `$Product`

**Diagram:**

```
[Start] → Param: Product
   │
   ▼
[Exclusive Split] IsCurrentlyActive?
   │                     │
   [Active=True]        [Active=False]
   │                     │
   ▼                     ▼
[Change: status=     [Change: status=
 Inactive]            Active]
   │                     │
   └────────┬────────────┘
            ▼
[Change: updatedDate=[%CurrentDateTime%], changedBy=[%CurrentUser%]]
            │
            ▼
[Commit: $Product (with events)]
            │
            ▼
[End] → Return $Product
```

---

## 3. ACT_Product_SaveEdit

**Location:** `ProductManagement/microflows/actions/`

### Step-by-Step

**Bước 1: Tạo Microflow + Parameter**
- Name: `ACT_Product_SaveEdit`
- Parameter: `EditProxy` (type: `ProductManagement.ProductEditProxy`)
- Return type: `Boolean`

**Bước 2: Retrieve Product từ Database**

| Property | Value |
|----------|-------|
| Source | **From database** |
| Entity | `ProductManagement.Product` |
| XPath | `[id = $EditProxy/targetProductId]` |
| Range | **First** |
| Variable | `Product` |

> **⚠️ Lưu ý quan trọng:** `EditProxy/targetProductId` là **String**, nhưng `id` trong XPath là **ObjectID**. Mendix **tự động convert** String → ObjectID trong XPath comparison. Nếu không tự động, dùng `toGUID($EditProxy/targetProductId)` hoặc change targetProductId type thành `GUID` thay vì String.

**Bước 3: Exclusive Split — Product Found?**
- Condition: `$Product != empty`
- Variable: `ProductFound`

**Bước 4: Validation (True branch)**
- Exclusive Split: `$EditProxy/productMinPrice <= $EditProxy/productMaxPrice`
- Variable: `PriceValid`

**Bước 5: Copy NPE → PE (PriceValid=True)**

Activity: **Change Object**
Object: `$Product`
Changes:
```
productName     = $EditProxy/productName
description     = $EditProxy/description
productMinPrice = $EditProxy/productMinPrice
productMaxPrice = $EditProxy/productMaxPrice
quickNote       = $EditProxy/quickNote
updatedDate     = [%CurrentDateTime%]
changedBy       = [%CurrentUser%]
```

**Bước 6: Set Category Association**

Activity: **Change Object**
Object: `$Product`
Changes:
```
Product_Category = $EditProxy/EditProxy_Category
```

> **Lưu ý:** `$EditProxy/EditProxy_Category` là NPE association → Mendix tự động resolve PE object. Nếu association = empty → association trên Product cũng cleared.

**Bước 7: Commit**
- Activity: **Commit`
- Object: `$Product`
- With events: ✅

**Bước 8: End Events**
- Success path: End → Return `true`
- Product not found: End (error) → Return `false`
- Price invalid: End (error) → Return `false`

**Error Handling Alternative:**

Thay vì return Boolean, có thể throw exception:

1. Thêm **Error** end event (red circle) trên validation fail path
2. Error message: `"Max price must be >= Min price"`
3. Nanoflow calling microflow sẽ catch error → hiển thị message cho user

```
[Start] → Param: EditProxy
   │
   ▼
[Retrieve: Product by ID] → Variable: Product
   │
   ▼
[Split: Product != empty?]
   │              │
   [Yes]         [No] → Error: "Product not found"
   │
   ▼
[Split: MinPrice <= MaxPrice?]
   │              │
   [Yes]         [No] → Error: "Max price must >= Min price"
   │
   ▼
[Change: Copy EditProxy → Product + update timestamps]
   │
   ▼
[Change: Set Product_Category = EditProxy/EditProxy_Category]
   │
   ▼
[Commit: $Product]
   │
   ▼
[End] → Return true
```

---

## 4. ACT_Product_CreateNew

**Location:** `ProductManagement/microflows/actions/`

### Step-by-Step

**Bước 1: Tạo Microflow + Parameter**
- Name: `ACT_Product_CreateNew`
- Parameter: `NewProductProxy` (type: `ProductManagement.ProductEditProxy`)
- Return type: `ProductManagement.Product`

**Bước 2: Create Product Object**

Activity: **Create Object**
Entity: `ProductManagement.Product`
Commit: **No** (chỉ tạo in memory)
Variable: `NewProduct`

**Bước 3: Generate Product Code (Java Action Call)**

Activity: **Java Action Call**
Java Action: `ProductManagement.JA_GenerateProductCode`
Return: `GeneratedCode` (String)

> Xem chi tiết Java Action trong [12-java-action.md](12-java-action.md).

**Bước 4: Copy Proxy → Product**

Activity: **Change Object**
Object: `$NewProduct`
Changes:
```
productCode     = $GeneratedCode
productName     = $NewProductProxy/productName
description     = $NewProductProxy/description
productMinPrice = $NewProductProxy/productMinPrice
productMaxPrice = $NewProductProxy/productMaxPrice
quickNote       = $NewProductProxy/quickNote
status          = ProductManagement.ProductStatus.Active
createdDate     = [%CurrentDateTime%]
updatedDate     = [%CurrentDateTime%]
createdBy       = [%CurrentUser%]
changedBy       = [%CurrentUser%]
```

**Bước 5: Set Category**

Activity: **Change Object**
Object: `$NewProduct`
Changes:
```
Product_Category = $NewProductProxy/EditProxy_Category
```

**Bước 6: Commit**

Activity: **Commit**
Object: `$NewProduct`
With events: ✅

**Bước 7: Return**

End event → Return: `$NewProduct`

**Diagram:**

```
[Start] → Param: NewProductProxy
   │
   ▼
[Create: Product (in memory)]
   │
   ▼
[Java Action: JA_GenerateProductCode → GeneratedCode]
   │
   ▼
[Change: Copy proxy → product + set defaults]
   │
   ▼
[Change: Set Product_Category = proxy/EditProxy_Category]
   │
   ▼
[Commit: $NewProduct (with events)]
   │
   ▼
[End] → Return $NewProduct
```

---

## 5. ACT_Product_DeleteProduct

**Location:** `ProductManagement/microflows/actions/`

### Step-by-Step

**Bước 1: Tạo Microflow**
- Name: `ACT_Product_DeleteProduct`
- Parameter: `Product` (type: `ProductManagement.Product`)
- Return type: Void

**Bước 2: Delete**

Activity: **Delete**
Object: `$Product`
- ✅ Delete associated ProductVariant objects (configured trong association delete behavior)

> **Lưu ý:** Delete behavior `Product → ProductVariant = "Delete ProductVariant objects"` đã configure trong domain model. Khi xóa Product → Mendix tự động xóa tất cả ProductVariant liên quan.

**Diagram:**

```
[Start] → Param: Product
   │
   ▼
[Delete: $Product]
   │
   ▼
[End]
```

---

## 6. CAL_Product_TopVariantName

**Location:** `ProductManagement/microflows/calculated/`

### Setup Calculated Attribute

1. Mở Domain Model → Entity **Product**
2. Thêm attribute:
   - Name: `calculated_TopVariantName`
   - Type: String (300)
   - ✅ **Stored** = false
   - ✅ **Calculated** = true
3. Chọn **Calculate with Microflow**
4. Mendix tự động tạo microflow `CAL_Product_TopVariantName`

### Microflow Logic

**Parameter:** `Product` (auto-generated)
**Return:** String

```
[Start] → Param: Product
   │
   ▼
[Retrieve from Database]
  Entity: ProductManagement.ProductVariant
  XPath: [ProductManagement.ProductVariant_Product = $Product]
  Sort: remainingQuantity DESC
  Range: First
  Variable: TopVariant
   │
   ▼
[Exclusive Split: TopVariant != empty?]
   │              │
   [Yes]         [No]
   │              │
   ▼              ▼
Return:          Return:
$TopVariant/     '—'
 variantName
```

---

## 7. Import Microflows — Seed Data

### 7.1 Microflow: ACT_Import_Categories

**Bước 1: Tạo Microflow**
- Name: `ACT_Import_Categories`
- Parameter: `JsonString` (type: String)
- Return type: Boolean

**Bước 2: Import Mapping**

Activity: **Import with Mapping**
- Mapping: `ProductManagement.IM_Category`
- Input: `$JsonString`
- Return: `CategoryList` (List\<Category\>)

**Bước 3: Loop + Commit**

```
[Start] → Param: JsonString
   │
   ▼
[Import Mapping: IM_Category → CategoryList]
   │
   ▼
[Loop: For each Category in CategoryList]
   │
   └── [Commit: $Category (in loop)]
   │
   ▼
[End] → Return true
```

### 7.2 Microflow: ACT_Import_Products

**Tương tự**, dùng `IM_Product` mapping. Mapping tự động:
1. Create Product objects
2. Lookup Category by `categoryName` (qua MLK microflow)
3. Lookup Supplier by `supplierCode` (qua MLK microflow)
4. Create nested ProductVariant objects + set association
5. Commit tất cả

---

## Tổng kết

| Microflow | Activities | Complexity |
|-----------|-----------|------------|
| DS_Product_GetFilteredList | 1 Retrieve | ⭐ Simple |
| ACT_Product_ToggleStatus | 3 Change + 1 Commit | ⭐⭐ Medium |
| ACT_Product_SaveEdit | 1 Retrieve + 2 Split + 2 Change + 1 Commit | ⭐⭐⭐ Complex |
| ACT_Product_CreateNew | 1 Create + 1 Java Action + 2 Change + 1 Commit | ⭐⭐⭐ Complex |
| ACT_Product_DeleteProduct | 1 Delete | ⭐ Simple |
| CAL_Product_TopVariantName | 1 Retrieve + 1 Split | ⭐ Simple |

**Tiếp theo:** [12-java-action.md](12-java-action.md) — Java Action cho unique product code
