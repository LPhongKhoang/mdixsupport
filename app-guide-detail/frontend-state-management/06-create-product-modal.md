# 06 - Create Product Modal: New Product Popup & Filter Keep

## Mục lục

1. [Tạo Popup Page Product_CreatePopup](#1-tạo-popup-page-product_createpopup)
2. [Form Layout — Tương tự Quick Edit](#2-form-layout--tương-tự-quick-edit)
3. [Create Action — Tạo mới Product](#3-create-action--tạo-mới-product)
4. [Keep Filter State](#4-keep-filter-state)
5. [Auto-generated Product Code](#5-auto-generated-product-code)
6. [Post-Create Flow](#6-post-create-flow)

---

## 1. Tạo Popup Page Product_CreatePopup

### Bước 1.1: Tạo Page mới

1. Right-click module **ProductManagement** → **Add** → **Page**
2. Cấu hình:

| Property | Value |
|----------|-------|
| Name | `Product_CreatePopup` |
| Layout | **PopupLayout** (Atlas_Default) |
| Entity | `ProductManagement.ProductEditProxy` |

3. Click **OK**

> **Tại sao dùng cùng entity `ProductEditProxy` cho Create?**
>
> - **Reuse:** Form fields giống hệt Quick Edit (name, category, description, min/max price, quick note)
> - **Single pattern:** Chỉ khác ở: `targetProductId` = empty (tạo mới) vs. có giá trị (edit)
> - **Dễ maintain:** Thay đổi form → chỉ cần update 1 popup (hoặc dùng Snippet)

### Bước 1.2: Page Title

Thay page title bằng: **"Create New Product"**

### Bước 1.3: Data View

Page tự động có Data View với entity `ProductEditProxy` (NPE) — mở từ nanoflow `NF_Product_OpenCreatePopup`.

---

## 2. Form Layout — Tương tự Quick Edit

> Form layout **giống hệt** [05-quick-edit-modal.md → Section 2](05-quick-edit-modal.md#2-form-layout--editable-fields). Có thể:
>
> **Option A:** Copy layout từ `Product_EditPopup` page
> **Option B (khuyến nghị):** Tạo **Snippet** dùng chung cho cả 2 popup

### Option B: Tạo Snippet chung

**Tạo Snippet:**

1. Right-click module **ProductManagement** → **Add** → **Snippet**
2. Name: `SN_Product_Form`
3. Parameter: `ProductEditProxy` (NPE)
4. Thêm tất cả form fields vào snippet (giống Quick Edit layout)

**Dùng Snippet trong cả 2 popup:**

1. Trong `Product_EditPopup` → Kéo **Snippet** widget → Chọn `SN_Product_Form`
2. Trong `Product_CreatePopup` → Kéo **Snippet** widget → Chọn `SN_Product_Form`

> **Ưu điểm Snippet:** Thay đổi form 1 lần → apply cho cả Edit và Create popup.

### Differences so với Quick Edit

| Field | Quick Edit | Create New |
|-------|-----------|------------|
| Product Name | Pre-filled | Empty |
| Category | Pre-filled từ Product | **Pre-filled từ Filter** (keep filter!) |
| Description | Pre-filled | Empty |
| Min Price | Pre-filled | Default: 0.00 |
| Max Price | Pre-filled | Default: 0.00 |
| Quick Note | Pre-filled | Empty |

---

## 3. Create Action — Tạo mới Product

### Bước 3.1: Thêm Create Button

1. Kéo **Button** widget vào bottom area
2. Cấu hình:

| Property | Value |
|----------|-------|
| Caption | "Create New" |
| Style | `btn-primary` |
| Icon | `fa-plus` |
| Button type | Action button |
| On click | **Call Nanoflow** → `NF_Product_SaveCreate` (xem bên dưới) |
| Parameter | `$currentObject` (ProductEditProxy NPE) |

### Bước 3.2: Nanoflow NF_Product_SaveCreate

**Mục đích:** Wrapper nanoflow — validate client-side, gọi microflow, close popup, refresh.

**Parameters:**
- `EditProxy` (type: `ProductManagement.ProductEditProxy`)

**Return type:** Void

**Nanoflow logic:**

```
[Start]
   │
   ▼
┌──────────────────────────────────────┐
│ Client-side Validation (optional)    │
│ Check: productName != empty          │
│ Check: productMinPrice >= 0          │
│ Check: productMaxPrice >= minPrice   │
└──────────────────┬───────────────────┘
                   ▼
         ┌──────────────────┐
         │ Exclusive Split  │
         │ Valid?           │
         └────┬─────────┬───┘
              │         │
         [Valid]    [Invalid]
              │         │
              ▼         ▼
   ┌──────────────┐  Show validation
   │ Call MF:     │  message, stop
   │ ACT_Product  │
   │ _CreateNew   │
   │ Param: Proxy │
   │ Return: $New │
   │   Product    │
   └──────┬───────┘
          ▼
   ┌──────────────────────────────────┐
   │ Close Page                       │
   │ (Popup đóng, trở về list page)   │
   └──────────────────┬───────────────┘
                      ▼
                 [End]
```

### Bước 3.3: Microflow ACT_Product_CreateNew

Chi tiết xem [03-microflows-and-nanoflows.md → 2.3](03-microflows-and-nanoflows.md#23-act_product_createnew).

**Key steps:**
1. Create new `Product` object in memory
2. Call `ACT_Product_GenerateCode` → assign `productCode`
3. Copy all fields from EditProxy → Product
4. Set Category association (từ EditProxy/EditProxy_Category)
5. Set Supplier association (optional — nếu có filter supplier)
6. Set timestamps, user tracking
7. Commit Product
8. Return: $NewProduct

---

## 4. Keep Filter State

> **Đây là yêu cầu quan trọng:** Sau khi tạo product mới, Data Grid 2 phải reload **với cùng filter** đang áp dụng trước khi bấm "Create New".

### 4.1 Tại sao Filter tự động được giữ?

**Filter state lưu trong NPE `ProductFilterContext`:**

```
ProductFilterContext (NPE) ← nằm trong Data View bọc ngoài page
   │
   ├── selectedCategoryId = "xxx"   ← dropdown Category binding
   ├── selectedSupplierId = "yyy"   ← dropdown Supplier binding
   ├── dateFrom = 01/06/2026        ← DatePicker binding
   ├── dateTo = 12/06/2026          ← DatePicker binding
```

**Khi tạo product mới:**
1. Nanoflow `NF_Product_OpenCreatePopup` → Tạo NPE `ProductEditProxy` rỗng
2. **ProductFilterContext NPE KHÔNG thay đổi** — vẫn giữ filter values
3. Popup mở → User điền form → Click Create → Microflow commit Product
4. Popup đóng → Data View context (với ProductFilterContext) **vẫn nguyên**
5. Data Grid 2 datasource re-execute với **cùng filter parameters**
6. Product mới tạo **xuất hiện trong list** (nếu thỏa filter condition)

### 4.2 Pre-fill Category từ Filter

**Đặc biệt:** Nếu user đang filter theo Category "Electronics" → Mở Create popup → Category dropdown **auto-select "Electronics"**

**Implement trong Nanoflow `NF_Product_OpenCreatePopup`:**

```
[Start]
   │
   ▼
Create ProductEditProxy (NPE)
   │
   ▼
Change Object:
   $EditProxy/EditProxy_Category =
     $FilterContext/FilterContext_Category    ← PRE-FILL từ filter!
```

> Xem chi tiết trong [03-microflows-and-nanoflows.md → 3.5](03-microflows-and-nanoflows.md#35-nf_product_opencreatepopup)

### 4.3 Filter Keep Diagram

```
┌─────────────────────────────────────────────────────┐
│  Product List Page                                   │
│                                                      │
│  Filter: [Category: Electronics ▼] [Supplier: All ▼]│
│                                                      │
│  Data Grid 2:                                        │
│  ┌──────────────────────────────────────────┐        │
│  │ PRD-001 │ Wireless Headphones │ ...       │        │
│  │ PRD-002 │ Smart Watch Pro     │ ...       │        │
│  └──────────────────────────────────────────┘        │
│                                                      │
│  User clicks [Create New Product] ─────────┐         │
│                                              │         │
│  ┌───────────────────────────────────────────┘         │
│  │                                                     │
│  │  ┌──────── Create Popup ────────┐                   │
│  │  │ Product Name: [________]     │                   │
│  │  │ Category: [Electronics ▼] ← PRE-FILLED!         │
│  │  │ Min Price: [0.00]            │                   │
│  │  │ Max Price: [0.00]            │                   │
│  │  │                              │                   │
│  │  │    [Cancel]    [Create New]  │                   │
│  │  └──────────────────────────────┘                   │
│  │         │                                           │
│  │    User clicks [Create New]                         │
│  │         │                                           │
│  │         ▼                                           │
│  │  ACT_Product_CreateNew → Commit                     │
│  │         │                                           │
│  │    Popup closes                                     │
│  │         │                                           │
│  └─────────┼───────────────────────────────────────────┘
│            │                                           │
│            ▼                                           │
│  Filter: [Category: Electronics ▼] ← PRESERVED!       │
│                                                      │
│  Data Grid 2 (refreshed):                             │
│  ┌──────────────────────────────────────────┐          │
│  │ PRD-003 │ NEW PRODUCT HERE   │ ...       │ ← NEW!  │
│  │ PRD-001 │ Wireless Headphones │ ...       │          │
│  │ PRD-002 │ Smart Watch Pro     │ ...       │          │
│  └──────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────┘
```

---

## 5. Auto-generated Product Code

### 5.1 Format

`PRD-YYYYMMDD-NNNN` (vd: `PRD-20260612-3847`)

### 5.2 Implementation

Xem [03-microflows-and-nanoflows.md → 2.4](03-microflows-and-nanoflows.md#24-act_product_generatecode).

**Product code được generate trong microflow `ACT_Product_CreateNew`:**
1. Sub-microflow call `ACT_Product_GenerateCode`
2. Format: `PRD-` + `formatDateTime([%CurrentDateTime%], 'yyyyMMdd')` + `-` + random 4 digits

> **Production note:** Trong môi trường production, nên dùng:
> - **Database sequence** để đảm bảo uniqueness
> - Hoặc **Mendix AutoNumber** attribute (tuy nhiên AutoNumber chỉ là integer, không có prefix)

---

## 6. Post-Create Flow

### 6.1 Complete Create Flow

```
User clicks [Create New Product] trên list page
       │
       ▼
┌──────────────────────────────────────────┐
│ Nanoflow: NF_Product_OpenCreatePopup     │
│                                          │
│  1. Create ProductEditProxy (NPE)       │
│  2. Pre-fill category từ filter context │
│  3. Show Page: Product_CreatePopup      │
│     Parameter: $EditProxy (NPE)         │
└──────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│ Popup: Product_CreatePopup               │
│                                          │
│  User fills form:                        │
│  - Product Name: "Bluetooth Speaker X"   │
│  - Category: Electronics (pre-filled)    │
│  - Min Price: 49.99                      │
│  - Max Price: 79.99                      │
│  - Quick Note: "New arrival Q3"          │
│                                          │
│  User clicks [Create New]                │
└──────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│ Nanoflow: NF_Product_SaveCreate          │
│                                          │
│  1. Validate form                        │
│  2. Call Microflow: ACT_Product_CreateNew│
│     → Server: Create Product + Commit    │
│     → Return: $NewProduct                │
│  3. If success:                          │
│     → Close Page (popup)                 │
│     → Data Grid 2 auto-refreshes         │
│  4. If fail:                             │
│     → Show error, keep popup open        │
└──────────────────────────────────────────┘
       │
       ▼ (popup closed, data refreshed)
┌──────────────────────────────────────────┐
│ Product_List Page                        │
│ Filter: PRESERVED                        │
│ Data Grid 2: shows new product in list   │
└──────────────────────────────────────────┘
```

### 6.2 Cancel Flow

```
User clicks [Cancel] trong Create Popup
       │
       ▼
Close Page (popup)
       │
       ▼
Product_List Page — unchanged, filter preserved
```

**Cancel hoàn toàn an toàn** vì:
- NPE `ProductEditProxy` bị discard (không lưu vào DB)
- Không có Product PE nào bị tạo
- ProductFilterContext NPE không thay đổi

---

## Tổng kết

Sau khi hoàn thành file này, bạn đã có:
- ✅ Popup Page `Product_CreatePopup` (dùng Snippet hoặc form riêng)
- ✅ Create action: Nanoflow validate → Microflow create + commit → Refresh
- ✅ Filter state preserved sau khi create
- ✅ Category pre-filled từ filter hiện tại
- ✅ Auto-generated product code
- ✅ Cancel flow an toàn (NPE discard)

**Tiếp theo:** [07-state-management-patterns.md](07-state-management-patterns.md) — Deep dive NPE State Management Patterns
