# Seed Data & Mendix Import Mapping Guide

## Tổng quan

Thư mục này chứa JSON seed data để import vào Mendix DB thông qua **Import Mapping**.

### Data Summary

| File | Records | Mô tả |
|------|---------|-------|
| [01-categories.json](01-categories.json) | 10 | Danh mục sản phẩm |
| [02-suppliers.json](02-suppliers.json) | 15 | Nhà cung cấp |
| [03-products-with-variants.json](03-products-with-variants.json) | 116 products, 385 variants | Sản phẩm + biến thể (nested) |

### Distribution

| Category | Products | Variants |
|----------|----------|----------|
| Electronics | 12 | 40 |
| Clothing | 12 | 66 |
| Food & Beverages | 12 | 44 |
| Home & Garden | 12 | 38 |
| Sports & Outdoors | 12 | 37 |
| Books & Media | 12 | 43 |
| Toys & Games | 12 | 36 |
| Health & Beauty | 12 | 32 |
| Automotive | 10 | 26 |
| Office Supplies | 10 | 23 |

---

## Import Order (QUAN TRỌNG)

**Phải import theo thứ tự này** vì có foreign key dependencies:

```
1. 01-categories.json   → Category (không dependency)
2. 02-suppliers.json    → Supplier (không dependency)
3. 03-products-with-variants.json → Product + ProductVariant (cần Category + Supplier đã tồn tại)
```

---

## Cách tạo Import Mapping trong Mendix Studio Pro v10

### Bước 1: Tạo JSON Structure

#### 1a. JSON Structure cho Category

1. Right-click module **ProductManagement** → **Add** → **JSON Structure**
2. Name: `JS_Category`
3. Paste JSON mẫu:
   ```json
   {
     "categoryName": "Electronics",
     "description": "Consumer electronics",
     "isActive": true
   }
   ```
4. Click **Generate** → Mendix auto-detect structure

#### 1b. JSON Structure cho Supplier

1. Tạo JSON Structure: `JS_Supplier`
2. Paste:
   ```json
   {
     "supplierCode": "TECH-VN",
     "supplierName": "TechViet Electronics Co., Ltd.",
     "contactEmail": "sales@techvietnam.vn",
     "contactPhone": "+84-28-3822-1234",
     "isActive": true
   }
   ```

#### 1c. JSON Structure cho Product (với nested Variants)

1. Tạo JSON Structure: `JS_Product`
2. Paste:
   ```json
   {
     "productCode": "PRD-ELEC-0001",
     "productName": "Wireless Bluetooth Headphones",
     "description": "Premium over-ear wireless headphones",
     "productMinPrice": 49.99,
     "productMaxPrice": 129.99,
     "quickNote": "",
     "status": "Active",
     "createdDate": "2025-06-15T10:30:00",
     "updatedDate": "2025-07-20T14:22:00",
     "createdBy": "admin",
     "changedBy": "admin",
     "category": {
       "categoryName": "Electronics"
     },
     "supplier": {
       "supplierCode": "TECH-VN"
     },
     "variants": [
       {
         "variantName": "Black",
         "sku": "ELEC-0001-BLK-01",
         "price": 99.99,
         "remainingQuantity": 150,
         "color": "Black",
         "size": "",
         "isActive": true
       }
     ]
   }
   ```

---

### Bước 2: Tạo Import Mapping

#### 2a. Import Mapping cho Category

1. Right-click module → **Add** → **Import Mapping**
2. Name: `IM_Category`
3. Cấu hình:

| Property | Value |
|----------|-------|
| JSON Structure | `JS_Category` |
| Root entity | **Category** (Persistent) |

4. Map fields:

| JSON Field | → Entity Attribute | Type Match |
|------------|-------------------|------------|
| `categoryName` | `Category/categoryName` | String ✅ |
| `description` | `Category/description` | String ✅ |
| `isActive` | `Category/isActive` | Boolean ✅ |

5. Click **Map automatically** → Verify mapping → **Save**

#### 2b. Import Mapping cho Supplier

1. Tạo Import Mapping: `IM_Supplier`
2. Root entity: **Supplier**

| JSON Field | → Entity Attribute |
|------------|-------------------|
| `supplierCode` | `Supplier/supplierCode` |
| `supplierName` | `Supplier/supplierName` |
| `contactEmail` | `Supplier/contactEmail` |
| `contactPhone` | `Supplier/contactPhone` |
| `isActive` | `Supplier/isActive` |

#### 2c. Import Mapping cho Product + Variants (Complex)

1. Tạo Import Mapping: `IM_Product`
2. Root entity: **Product**

**Mapping chính:**

| JSON Field | → Entity/Association |
|------------|---------------------|
| `productCode` | `Product/productCode` |
| `productName` | `Product/productName` |
| `description` | `Product/description` |
| `productMinPrice` | `Product/productMinPrice` |
| `productMaxPrice` | `Product/productMaxPrice` |
| `quickNote` | `Product/quickNote` |
| `status` | `Product/status` ⚠️ cần converter |
| `createdDate` | `Product/createdDate` |
| `updatedDate` | `Product/updatedDate` |
| `createdBy` | `Product/createdBy` |
| `changedBy` | `Product/changedBy` |
| `category` | **Association lookup** (xem bên dưới) |
| `supplier` | **Association lookup** (xem bên dưới) |
| `variants[]` | **Association + child mapping** |

**Mapping nested `category` object → Association:**

1. Click vào element `category` trong mapping tree
2. **Type:** Object → Select **Category** entity
3. **Mapping type:** **Call Microflow** (để lookup Category theo `categoryName`)
4. Tạo microflow `MLK_Category_ByName`:

```
Parameter: categoryName (String)
Return: Category (Object)

[Start]
   │
   ▼
Retrieve from Database:
  Entity: ProductManagement.Category
  XPath: [categoryName = $categoryName]
  Range: First
  Variable: $CategoryObj
   │
   ▼
Return: $CategoryObj
```

5. Assign result → `Product/Product_Category` association

**Mapping nested `supplier` object → Association:**

1. Click vào element `supplier`
2. **Call Microflow:** `MLK_Supplier_ByCode` (tương tự, lookup theo `supplierCode`)

**Mapping nested `variants[]` → ProductVariant:**

1. Click vào element `variants` → **Primitive type:** List of objects
2. Entity: **ProductVariant**
3. Association: `Product/Product_ProductVariant`
4. Map mỗi variant:

| JSON Field | → ProductVariant Attribute |
|------------|--------------------------|
| `variantName` | `variantName` |
| `sku` | `sku` |
| `price` | `price` |
| `remainingQuantity` | `remainingQuantity` |
| `color` | `color` |
| `size` | `size` |
| `isActive` | `isActive` |

> **Lưu ý về `status` field:** JSON có giá trị string `"Active"` / `"Inactive"`, nhưng Mendix entity attribute type là Enumeration `ProductStatus`. Mendix Import Mapping **tự động convert** string → enum nếu giá trị khớp với enum values. Đảm bảo enum values chính xác: `Active`, `Inactive`.

---

### Bước 3: Tạo Microflow Import

#### 3a. Import Categories

Tạo microflow `ACT_Import_Categories`:

```
[Start]
   │
   ▼
File Document → Read contents (hoặc dùng REST call)
   │
   ▼
Import with Mapping:
  Mapping: IM_Category
  Input: JSON string từ file
  Result: List<Category>
   │
   ▼
Loop: For each Category → Commit
   │
   ▼
[End]
```

**Hoặc đơn giản hơn — Dùng REST endpoint:**

1. Tạo REST endpoint nhận JSON
2. Hoặc dùng **Mendix Excel Importer** (nếu convert sang Excel)

**Cách nhanh nhất cho development:**

1. Tạo page có **File Upload** widget
2. User upload file JSON
3. Microflow đọc file → Import Mapping → Commit

#### 3b. Import Suppliers

Tương tự, dùng `IM_Supplier`.

#### 3c. Import Products + Variants

Tương tự, dùng `IM_Product` (mapping phức tạp hơn).

---

## Quick Setup: Import bằng Mendix REST

### Tạo Published REST Service

1. Right-click module → **Add** → **Published REST service**
2. Name: `SeedDataService`
3. Thêm resource: `import-categories`
   - Method: POST
   - Microflow: `ACT_Import_Categories`
4. Thêm resource: `import-suppliers`
   - Method: POST
   - Microflow: `ACT_Import_Suppliers`
5. Thêm resource: `import-products`
   - Method: POST
   - Microflow: `ACT_Import_Products`

### Import bằng cURL

```bash
# 1. Import Categories
curl -X POST http://localhost:8080/rest/seeddata/v1/import-categories \
  -H "Content-Type: application/json" \
  -d @01-categories.json

# 2. Import Suppliers
curl -X POST http://localhost:8080/rest/seeddata/v1/import-suppliers \
  -H "Content-Type: application/json" \
  -d @02-suppliers.json

# 3. Import Products + Variants
curl -X POST http://localhost:8080/rest/seeddata/v1/import-products \
  -H "Content-Type: application/json" \
  -d @03-products-with-variants.json
```

---

## Alternative: Import bằng Database Scripts

Nếu không muốn dùng Import Mapping, có thể insert trực tiếp vào database (PostgreSQL):

```sql
-- Categories đã có trong product-catalog-module/mock-data.sql
-- Chỉ cần adjust schema name cho module ProductManagement

INSERT INTO "productmanagement$category" ("name", description, isactive)
VALUES ('Electronics', 'Consumer electronics, gadgets, and smart devices', true);
-- ... (10 rows total)

-- Suppliers
INSERT INTO "productmanagement$supplier" (suppliercode, suppliername, contactemail, contactphone, isactive)
VALUES ('TECH-VN', 'TechViet Electronics Co., Ltd.', 'sales@techvietnam.vn', '+84-28-3822-1234', true);
-- ... (15 rows total)

-- Products và ProductVariants tương tự
```

> **Lưu ý:** Database direct insert yêu cầu Mendix **Synchronize** afterward để runtime nhận biết data mới.

---

## JSON Format Reference

### 03-products-with-variants.json Structure

```json
[
  {
    "productCode": "PRD-ELEC-0001",
    "productName": "Wireless Bluetooth Headphones",
    "description": "Premium over-ear wireless headphones with ANC",
    "productMinPrice": 49.99,
    "productMaxPrice": 129.99,
    "quickNote": "",
    "status": "Active",
    "createdDate": "2025-06-15T10:30:00",
    "updatedDate": "2025-07-20T14:22:00",
    "createdBy": "admin",
    "changedBy": "john.doe",
    "category": {
      "categoryName": "Electronics"
    },
    "supplier": {
      "supplierCode": "TECH-VN"
    },
    "variants": [
      {
        "variantName": "Black",
        "sku": "ELEC-0001-BLK-01",
        "price": 99.99,
        "remainingQuantity": 150,
        "color": "Black",
        "size": "",
        "isActive": true
      },
      {
        "variantName": "White",
        "sku": "ELEC-0001-WHT-02",
        "price": 109.99,
        "remainingQuantity": 200,
        "color": "White",
        "size": "",
        "isActive": true
      }
    ]
  }
]
```

### Key Points

- **`category`** và **`supplier`** là nested objects dùng cho **lookup** (không insert mới)
- **`variants`** là array → Import Mapping tạo ProductVariant objects + association tự động
- **`status`** values phải khớp chính xác với enum: `"Active"` / `"Inactive"`
- **`createdDate`/`updatedDate`** format: ISO 8601 (`YYYY-MM-DDTHH:mm:ss`)
- **Decimal prices** có 2 decimal places
