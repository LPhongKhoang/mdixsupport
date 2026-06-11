# 02 - Enumerations, Associations & Validation Rules

## Mục lục

1. [Tạo Enumerations](#1-tạo-enumerations)
   - 1.1 [Enumeration: ProductStatus](#11-enumeration-productstatus)
2. [Hoàn thiện Associations](#2-hoàn-thiện-associations)
   - 2.1 [Kiểm tra và configure associations](#21-kiểm-tra-và-configure-associations)
   - 2.2 [Delete Behavior](#22-delete-behavior)
3. [Validation Rules](#3-validation-rules)
4. [Access Rules (Module Security)](#4-access-rules-module-security)
5. [Kết quả Domain Model hoàn chỉnh](#5-kết-quả-domain-model-hoàn-chỉnh)

---

## 1. Tạo Enumerations

### 1.1 Enumeration: ProductStatus

**Mục đích:** Trạng thái Active/Inactive của Product. Dùng cho toggle button và conditional visibility.

**Bước tạo:**
1. Right-click vào module **ProductManagement** → **Add** → **Enumeration**
2. Đặt tên: **ProductStatus**
3. Thêm 2 giá trị:

| Name | Caption | Image (optional) |
|------|---------|------------------|
| `Active` | Active | (green check icon) |
| `Inactive` | Inactive | (red cross icon) |

4. Click **OK** để lưu

**Gán enum cho Product.status attribute:**
1. Mở Domain Model → Double-click attribute `status` trên entity **Product**
2. Type → Chọn **Enumeration** → Select **ProductStatus**
3. Default value → **Active**
4. Click **OK**

> **Tại sao dùng Enum thay vì Boolean?**
>
> - Enum dễ mở rộng (có thể thêm `Draft`, `Archived`, `Discontinued` sau này)
> - Enum hỗ trợ **image per value** — hiển thị icon khác nhau trên UI
> - Enum phù hợp với **Dropdown** widget, dễ filter hơn Boolean
> - Mendix Data Grid 2 filter dropdown hoạt động tốt hơn với Enum

---

## 2. Hoàn thiện Associations

### 2.1 Kiểm tra và configure associations

Mở Domain Model editor, kiểm tra tất cả associations đã tạo đúng:

#### Association: Product → Category

| Property | Value |
|----------|-------|
| Name | `Product_Category` |
| Type | **Reference** (1-to-many) |
| Parent | Category |
| Child | Product |
| Owner | **Default** (Product owns the FK) |
| Navigability | Both directions |

**Verify:** Right-click association → Properties → Kiểm tra các giá trị trên

#### Association: Product → Supplier

| Property | Value |
|----------|-------|
| Name | `Product_Supplier` |
| Type | **Reference** (1-to-many) |
| Parent | Supplier |
| Child | Product |
| Owner | **Default** (Product owns the FK) |
| Navigability | Both directions |

#### Association: Product → ProductVariant

| Property | Value |
|----------|-------|
| Name | `Product_ProductVariant` |
| Type | **Reference** (1-to-many) |
| Parent | Product |
| Child | ProductVariant |
| Owner | **Default** (ProductVariant owns the FK) |
| Navigability | Both directions |

#### Association: ProductFilterContext (NPE) → Category

| Property | Value |
|----------|-------|
| Name | `FilterContext_Category` |
| Type | **Reference** |
| Owner | **ProductFilterContext** |
| Navigability | Both directions |

#### Association: ProductFilterContext (NPE) → Supplier

| Property | Value |
|----------|-------|
| Name | `FilterContext_Supplier` |
| Type | **Reference** |
| Owner | **ProductFilterContext** |
| Navigability | Both directions |

#### Association: ProductEditProxy (NPE) → Category

| Property | Value |
|----------|-------|
| Name | `EditProxy_Category` |
| Type | **Reference** |
| Owner | **ProductEditProxy** |
| Navigability | Both directions |

### 2.2 Delete Behavior

Configure **delete behavior** cho mỗi association — quyết định điều gì xảy ra khi xóa parent.

**Bước:** Right-click mỗi association → Properties → Tab **Delete behavior**

| Association | Parent → Child behavior | Lý do |
|-------------|------------------------|-------|
| Product → Category | **Error if Product exists** | Không cho xóa Category nếu còn Product |
| Product → Supplier | **Error if Product exists** | Không cho xóa Supplier nếu còn Product |
| Product → ProductVariant | **Delete ProductVariant objects** | Xóa Product thì xóa luôn tất cả Variants |
| FilterContext → Category | **Delete ProductFilterContext object** | NPE, ít quan trọng |
| FilterContext → Supplier | **Delete ProductFilterContext object** | NPE, ít quan trọng |
| EditProxy → Category | **Delete ProductEditProxy object** | NPE, ít quan trọng |

> **Lưu ý:** NPE associations không ảnh hưởng database, nhưng vẫn nên configure delete behavior để UI activity chính xác.

---

## 3. Validation Rules

### 3.1 Validation Rules cho Product

Mở entity **Product** → Tab **Validation rules**

| # | Attribute | Rule | Error Message |
|---|-----------|------|---------------|
| 1 | `productCode` | Required | "Product code is required" |
| 2 | `productName` | Required | "Product name is required" |
| 3 | `productMinPrice` | Required | "Minimum price is required" |
| 4 | `productMaxPrice` | Required | "Maximum price is required" |
| 5 | `productMinPrice` | >= 0 (microflow validation) | "Min price must be >= 0" |
| 6 | `productMaxPrice` | >= 0 (microflow validation) | "Max price must be >= 0" |

> **Lưu ý:** Rule "Min price ≤ Max price" được validate trong microflow `ACT_Product_Save` (file 03), không phải domain model validation rule, vì Mendix không hỗ trợ cross-attribute validation ở entity level.

### 3.2 Validation Rules cho ProductVariant

| # | Attribute | Rule | Error Message |
|---|-----------|------|---------------|
| 1 | `variantName` | Required | "Variant name is required" |
| 2 | `sku` | Required | "SKU is required" |
| 3 | `price` | Required | "Price is required" |

### 3.3 Validation Rules cho Category

| # | Attribute | Rule | Error Message |
|---|-----------|------|---------------|
| 1 | `categoryName` | Required | "Category name is required" |

### 3.4 Validation Rules cho Supplier

| # | Attribute | Rule | Error Message |
|---|-----------|------|---------------|
| 1 | `supplierCode` | Required | "Supplier code is required" |
| 2 | `supplierName` | Required | "Supplier name is required" |

---

## 4. Access Rules (Module Security)

### 4.1 Enable Module Security

1. Mở Domain Model → Menu **Model** → **Security** → Đảm bảo **Module security** enabled
2. Hoặc: Project Explorer → Right-click module → **Security** → **Module security**

### 4.2 Access Rules cho Persistent Entities

Cho mỗi Persistent Entity, cấu hình access rules cho user role **User**:

#### Entity: Product

| Operation | Access | XPath Constraint |
|-----------|--------|------------------|
| Create | ✅ | — |
| Read | ✅ | — (đọc tất cả) |
| Update | ✅ | — |
| Delete | ✅ | — |

**Member access:**

| Attribute | Read | Write |
|-----------|------|-------|
| productCode | ✅ | ✅ |
| productName | ✅ | ✅ |
| description | ✅ | ✅ |
| productMinPrice | ✅ | ✅ |
| productMaxPrice | ✅ | ✅ |
| quickNote | ✅ | ✅ |
| status | ✅ | ✅ |
| createdDate | ✅ | ❌ |
| updatedDate | ✅ | ❌ |
| createdBy | ✅ | ❌ |
| changedBy | ✅ | ❌ |

#### Entity: Category

| Operation | Access |
|-----------|--------|
| Create | ✅ |
| Read | ✅ |
| Update | ✅ |
| Delete | ✅ |

All attributes: Read ✅, Write ✅

#### Entity: Supplier

| Operation | Access |
|-----------|--------|
| Create | ✅ |
| Read | ✅ |
| Update | ✅ |
| Delete | ✅ |

All attributes: Read ✅, Write ✅

#### Entity: ProductVariant

| Operation | Access |
|-----------|--------|
| Create | ✅ |
| Read | ✅ |
| Update | ✅ |
| Delete | ✅ |

All attributes: Read ✅, Write ✅

### 4.3 Access Rules cho NPEs

Non-Persistent Entities **không cần access rules** vì chúng tồn tại chỉ trong client session. Mendix tự động cho phép truy cập NPE.

> **Tuy nhiên**, nếu bạn gặp lỗi access với NPE, thêm rule:
> - **Read**: ✅ (all members)
> - **Write**: ✅ (all members)
> - Create/Update/Delete: không cần cho NPE

---

## 5. Kết quả Domain Model hoàn chỉnh

Sau khi hoàn thành file này, Domain Model của bạn phải có:

### Checklist

- [ ] Enumeration `ProductStatus` với 2 values: Active, Inactive
- [ ] Attribute `Product.status` có type = `ProductStatus`, default = `Active`
- [ ] 3 PE-PE associations với đúng type và owner
- [ ] 3 NPE-PE associations (FilterContext→Category, FilterContext→Supplier, EditProxy→Category)
- [ ] Delete behavior configured cho tất cả associations
- [ ] Validation rules cho Product, ProductVariant, Category, Supplier
- [ ] Module security access rules cho tất cả PE entities
- [ ] NPE entities không có access rules (hoặc Read/Write all nếu cần)

### Entity Summary

| Entity | Type | Attributes | Associations (owner) |
|--------|------|------------|---------------------|
| Category | Persistent | 3 | — |
| Supplier | Persistent | 5 | — |
| Product | Persistent | 13 | → Category, → Supplier |
| ProductVariant | Persistent | 7 | → Product |
| ProductFilterContext | **Non-Persistent** | 4 | → Category (NPE), → Supplier (NPE) |
| ProductEditProxy | **Non-Persistent** | 6 | → Category (NPE) |

### Tổng số lượng

- **6 Entities** (4 Persistent + 2 Non-Persistent)
- **1 Enumeration** (ProductStatus)
- **6 Associations** (3 PE-PE + 3 NPE-PE)
- **Total attributes:** 38

**Tiếp theo:** [03-microflows-and-nanoflows.md](03-microflows-and-nanoflows.md) — Tạo business logic với Microflows và Nanoflows
