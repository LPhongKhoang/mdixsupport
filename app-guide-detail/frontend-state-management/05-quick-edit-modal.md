# 05 - Quick Edit Modal: Popup Page, Form Editing & State Persistence

## Mục lục

1. [Tạo Popup Page Product_EditPopup](#1-tạo-popup-page-product_editpopup)
2. [Form Layout — Editable Fields](#2-form-layout--editable-fields)
3. [Save Action — Proxy Commit Pattern](#3-save-action--proxy-commit-pattern)
4. [Cancel Action — Hủy bỏ không ảnh hưởng data](#4-cancel-action--hủy-bỏ-không-ảnh-hưởng-data)
5. [Validation trong Popup](#5-validation-trong-popup)
6. [Refresh Data Grid sau khi đóng Popup](#6-refresh-data-grid-sau-khi-đóng-popup)

---

## 1. Tạo Popup Page Product_EditPopup

### Bước 1.1: Tạo Page mới

1. Right-click module **ProductManagement** → **Add** → **Page**
2. Cấu hình:

| Property | Value |
|----------|-------|
| Name | `Product_EditPopup` |
| Layout | **PopupLayout** (Atlas_Default) |
| Entity | `ProductManagement.ProductEditProxy` |

3. Click **OK**

### Bước 1.2: Page Title

1. Thay thế page title mặc định bằng: **"Quick Edit Product"**

### Bước 1.3: Data View wrapper

Page popup tự động có Data View với entity `ProductEditProxy` (NPE) — vì page được mở với NPE parameter từ nanoflow `NF_Product_OpenEditPopup`.

> **Verity:** Double-click vào page background → Kiểm tra **Page data** = `ProductManagement.ProductEditProxy`

---

## 2. Form Layout — Editable Fields

### Bước 2.1: Thêm Layout Grid

1. Bên trong Data View → Thêm **Layout Grid** (2 columns, 1 row)
   - Col 1: **6/12** (trái)
   - Col 2: **6/12** (phải)

### Bước 2.2: Field Configuration

Thêm các **Text Box**, **Text Area**, **Dropdown** cho từng field:

#### Field 1: Product Name (bắt buộc)

| Widget | **Text Box** |
|--------|-------------|
| Attribute | `productName` (ProductEditProxy) |
| Label | "Product Name *" |
| Required | ✅ Yes |
| Max length | 300 |
| Placeholder | "Enter product name..." |
| Column | Col 1 |

#### Field 2: Product Category (Dropdown)

| Widget | **Dropdown** (Reference Selector) |
|--------|----------------------------------|
| Attribute | `FilterContext_Category` (NPE association đến Category) |

> **Lưu ý:** ProductEditProxy không có association đến Category. Dùng **Reference Selector** widget hoặc **Dropdown** vớiSelectable Objects.

**Cách tốt nhất:** Thêm association `ProductEditProxy → Category` (NPE-PE Reference) trên domain model.

**Hoặc dùng Dropdown + Selectable Objects:**

| Widget | **Dropdown** |
|--------|-------------|
| Attribute | `selectedCategoryId` (String) |
| Selectable objects | **Database** → `ProductManagement.Category` [isActive = true] |
| Display attribute | `categoryName` |
| Value attribute | `id` (toString) |

> **Lưu ý:** Dropdown String → ID matching không phải pattern chuẩn Mendix. Cách chuẩn là:
>
> 1. Thêm **Reference** association từ `ProductEditProxy` → `Category` trên domain model
> 2. Dùng **Reference Selector** widget → bind vào association
> 3. Reference Selector cho phép chọn Category object trực tiếp

**Cách khuyến nghị — Thêm NPE Association:**

1. Mở Domain Model → Thêm association: `ProductEditProxy` → `Category` (Reference, owner: ProductEditProxy)
2. Quay lại popup page → Dùng **Reference Selector** widget:

| Property | Value |
|----------|-------|
| Association | `ProductEditProxy/EditProxy_Category` |
| Label | "Category *" |
| Required | ✅ |
| Selectable objects | Database → `ProductManagement.Category` [isActive = true] |
| Display attribute | `categoryName` |

**Update Nanoflow `NF_Product_OpenEditPopup`:**
- Khi copy data từ Product sang EditProxy, thêm:
  ```
  $EditProxy/EditProxy_Category = $Product/Product_Category
  ```

**Update Microflow `ACT_Product_SaveEdit`:**
- Khi copy ngược từ EditProxy sang Product:
  ```
  $Product/Product_Category = $EditProxy/EditProxy_Category
  ```

#### Field 3: Product Description

| Widget | **Text Area** |
|--------|--------------|
| Attribute | `description` (ProductEditProxy) |
| Label | "Description" |
| Max length | 2000 |
| Rows | 4 |
| Placeholder | "Enter product description..." |
| Column | Col 1 (full width) |

#### Field 4: Min Price

| Widget | **Text Box** |
|--------|-------------|
| Attribute | `productMinPrice` (ProductEditProxy) |
| Label | "Min Price *" |
| Required | ✅ |
| Input mask | Decimal |
| Placeholder | "0.00" |
| Column | Col 2 |

#### Field 5: Max Price

| Widget | **Text Box** |
|--------|-------------|
| Attribute | `productMaxPrice` (ProductEditProxy) |
| Label | "Max Price *" |
| Required | ✅ |
| Input mask | Decimal |
| Placeholder | "0.00" |
| Column | Col 2 |

#### Field 6: Quick Note

| Widget | **Text Area** |
|--------|--------------|
| Attribute | `quickNote` (ProductEditProxy) |
| Label | "Quick Note" |
| Max length | 500 |
| Rows | 3 |
| Placeholder | "Add a quick note..." |
| Column | Col 2 (full width) |

### Layout hoàn chỉnh

```
┌─────────────── Product EditPopup ───────────────┐
│                                                  │
│  ┌─── Col 1 (6/12) ──┐  ┌─── Col 2 (6/12) ──┐  │
│  │                     │  │                    │  │
│  │ Product Name *      │  │ Min Price *        │  │
│  │ [________________]  │  │ [____________]     │  │
│  │                     │  │                    │  │
│  │ Category *          │  │ Max Price *        │  │
│  │ [Dropdown ▼]       │  │ [____________]     │  │
│  │                     │  │                    │  │
│  │ Description         │  │ Quick Note         │  │
│  │ [________________]  │  │ [______________]   │  │
│  │ [________________]  │  │ [______________]   │  │
│  │                     │  │                    │  │
│  └─────────────────────┘  └────────────────────┘  │
│                                                  │
│  ┌──────────────────────────────────────────────┐ │
│  │         [Cancel]              [Save]          │ │
│  └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

---

## 3. Save Action — Proxy Commit Pattern

### Bước 3.1: Thêm Save Button

1. Kéo **Button** widget vào bottom area của popup
2. Cấu hình:

| Property | Value |
|----------|-------|
| Caption | "Save" |
| Style | `btn-primary` |
| Icon | `fa-check` |
| Button type | **Action button** |
| On click | **Call Microflow** → `ACT_Product_SaveEdit` |
| Parameter | `$currentObject` (ProductEditProxy NPE) |

### Bước 3.2: Microflow ACT_Product_SaveEdit — Chi tiết

Xem [03-microflows-and-nanoflows.md → 2.2](03-microflows-and-nanoflows.md#22-act_product_saveedit) cho logic đầy đủ.

**Flow tổng hợp:**

```
User clicks [Save]
       │
       ▼
Nanoflow: (optional client-side validation preview)
       │
       ▼
Microflow: ACT_Product_SaveEdit
       │
       ├── Retrieve Product by EditProxy/targetProductId
       ├── Validate minPrice ≤ maxPrice
       ├── Copy all fields: EditProxy → Product (PE)
       ├── Set Category association
       ├── Update timestamps (updatedDate, changedBy)
       ├── Commit Product
       └── Return: true (success)
       │
       ▼
Popup closes (Mendix auto-closes on microflow success)
       │
       ▼
Data Grid 2 refreshes (Product committed → sync to client)
```

### Bước 3.3: Cấu hình Popup Close Behavior

**Important:** Khi Button gọi Microflow trong Popup Page, cần cấu hình **Close behavior**:

1. Select Save Button → Properties → **Close page** → **Yes** (sau khi microflow thành công)

> **Hoặc** cấu hình trong Microflow: End event → **Close page** property
>
> Trong microflow `ACT_Product_SaveEdit`:
> - End event type: **Close page** (nếu return `true`)
> - End event type: **Nothing** (nếu validation fail → giữ popup mở)

**Thực tế:** Mendix microflow **không thể close page trực tiếp**. Cần dùng:
- **Nanoflow** gọi Microflow → check result → close page
- Hoặc Button properties → **Close page** = Yes + **Call microflow**

**Cách khuyến nghị — Button với Save + Close:**

1. Save Button properties:
   - **On click:** Call Microflow → `ACT_Product_SaveEdit`
   - **Close page:** ✅ Yes
   - **Synchronize:** ✅ Yes (để push changes lên client)

> **Lưu ý:** Nếu microflow throw exception, popup **không đóng**. Tận dụng điều này cho validation: nếu validation fail → throw exception với message.

---

## 4. Cancel Action — Hủy bỏ không ảnh hưởng data

### Bước 4.1: Thêm Cancel Button

1. Kéo **Button** widget vào bottom area (bên cạnh Save)
2. Cấu hình:

| Property | Value |
|----------|-------|
| Caption | "Cancel" |
| Style | `btn-default` (secondary) |
| Icon | `fa-times` |
| Button type | **Back button** (hoặc Action → Close page) |
| On click | **Close page** |

> **Tại sao Cancel an toàn?**
>
> Vì ta edit trên **NPE ProductEditProxy**, không phải trên Persistent Entity Product. Khi đóng popup:
> - NPE EditProxy bị garbage collect (không lưu vào DB)
> - Product gốc trong Data Grid 2 hoàn toàn **không bị thay đổi**
> - Không cần rollback hay undo

> **So sánh với Edit trực tiếp trên PE:**
>
> | Approach | Cancel | Auto-commit risk |
> |----------|--------|------------------|
> | **NPE Proxy (this guide)** | ✅ Safe — PE untouched | ❌ None |
> | Direct PE edit | ⚠️ Need explicit rollback | ⚠️ Some widgets auto-commit |

---

## 5. Validation trong Popup

### 5.1 Client-side Validation (Nanoflow)

**Optional:** Thêm nanoflow validation trước khi gọi microflow.

1. Tạo Nanoflow: `NF_Product_ValidateEdit`
2. Parameters: `EditProxy` (ProductEditProxy)
3. Logic:

```
[Start]
   │
   ├── Check: $EditProxy/productName = empty
   │   → Show validation feedback: "Product name is required"
   │   → Return: false
   │
   ├── Check: $EditProxy/productMinPrice < 0
   │   → Show validation feedback: "Min price must be >= 0"
   │   → Return: false
   │
   ├── Check: $EditProxy/productMaxPrice < $EditProxy/productMinPrice
   │   → Show validation feedback: "Max price must >= Min price"
   │   → Return: false
   │
   └── All checks passed → Return: true
```

**Cách integrate:**
1. Save Button → OnClick → **Call Nanoflow** → `NF_Product_ValidateEdit`
2. Nanoflow `NF_Product_ValidateEdit`:
   - Nếu valid → gọi Microflow `ACT_Product_SaveEdit`
   - Nếu invalid → show message, không gọi microflow

### 5.2 Server-side Validation (Microflow)

Validation trong `ACT_Product_SaveEdit`:

```
if $EditProxy/productMinPrice > $EditProxy/productMaxPrice then
    // Throw exception with message → popup stays open
    throw "Max price must be greater than or equal to Min price"
end if
```

**Cách throw exception trong Mendix Microflow:**
1. Thêm **Error** end event (red circle)
2. Set error message: "Max price must be greater than or equal to Min price"
3. Error handler trên calling nanoflow → hiển thị message

### 5.3 Built-in Widget Validation

Mendix Text Box hỗ trợ **Required** validation tự động:

1. Select Text Box widget → Properties → **Validation** → **Required**
2. Error message: "This field is required"
3. Validation fires khi user clicks Save

---

## 6. Refresh Data Grid sau khi đóng Popup

### 6.1 Auto-Refresh Mechanism

Khi popup đóng sau khi microflow commit Product:
1. Mendix Runtime **syncs** committed changes đến client
2. Data Grid 2 datasource (microflow) **re-executes** vì context có thể đã thay đổi
3. Data Grid 2 hiển thị data mới nhất

**Điều kiện auto-refresh hoạt động:**
- Data Grid 2 datasource là **Microflow** (không phải Database trực tiếp)
- Microflow datasource nhận **NPE parameter** từ Data View context
- Khi popup đóng → Data View có thể trigger refresh

### 6.2 Manual Refresh (nếu auto-refresh không hoạt động)

**Phương pháp 1: Refresh Button trên Data Grid 2**
- Data Grid 2 → Properties → Show refresh button: ✅ Yes
- User manually click refresh sau khi edit

**Phương pháp 2: On Close Page Event**
1. Trong page `Product_List` → Add **Page OnClose** event
2. Không khả thi trực tiếp trong Mendix cho popup...

**Phương pháp 3: Nanoflow-based Save (khuyến nghị)**

Thay vì Button gọi Microflow trực tiếp, dùng **Nanoflow wrapper:**

1. Tạo Nanoflow: `NF_Product_SaveEdit`
2. Logic:
   ```
   [Start]
      │
      ▼
   Call Microflow: ACT_Product_SaveEdit
   Parameter: $EditProxy
   Result: $success (Boolean)
      │
      ▼
   if $success = true then
      Close Page (popup)
      // Data Grid 2 sẽ refresh vì NPE context trigger
   else
      Show Message: "Save failed"
   end if
   ```
3. Save Button → OnClick → **Call Nanoflow** → `NF_Product_SaveEdit`

> **Ưu điểm:** Nanoflow chạy trên client → có thể close page programmatically + trigger refresh

### 6.3 Complete Save Flow

```
User clicks [Save] in Edit Popup
       │
       ▼
┌──────────────────────────────────────────┐
│ Nanoflow: NF_Product_SaveEdit (client)   │
│                                          │
│  1. Call Microflow: ACT_Product_SaveEdit │
│     → Server: Copy NPE → PE + Commit    │
│     → Return: $success                  │
│                                          │
│  2. If $success = true:                 │
│     → Close Page (popup)                │
│     → Data Grid 2 auto-refreshes        │
│                                          │
│  3. If $success = false:                │
│     → Show error message                │
│     → Popup stays open                  │
└──────────────────────────────────────────┘
       │
       ▼ (popup closed, data refreshed)
┌──────────────────────────────────────────┐
│ Product_List Page                        │
│ Data Grid 2 shows updated product list   │
│ Filter state PRESERVED (NPE unchanged)   │
└──────────────────────────────────────────┘
```

> **Filter State Preservation:** Vì ProductFilterContext (NPE) **không thay đổi** khi edit product — ta chỉ modify Product PE — filter dropdowns giữ nguyên giá trị. Data Grid 2 reload với cùng filter → hiển thị product vừa edit với data mới.

---

## Tổng kết

Sau khi hoàn thành file này, bạn đã có:
- ✅ Popup Page `Product_EditPopup` với Data View (NPE ProductEditProxy)
- ✅ 6 editable fields (name, category, description, min/max price, quick note)
- ✅ Save button → Nanoflow wrapper → Microflow commit → Auto-refresh
- ✅ Cancel button → Close popup (NPE discarded, PE untouched)
- ✅ Client-side + Server-side validation
- ✅ Filter state preserved sau edit

**Tiếp theo:** [06-create-product-modal.md](06-create-product-modal.md) — Tạo Create New Product Popup
