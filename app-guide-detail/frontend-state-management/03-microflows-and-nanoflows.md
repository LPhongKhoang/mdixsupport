# 03 - Microflows & Nanoflows: Business Logic và State Management

## Mục lục

1. [Microflow vs Nanoflow — Khi nào dùng cái nào?](#1-microflow-vs-nanoflow)
2. [Microflows (Server-side)](#2-microflows-server-side)
   - 2.1 [ACT_Product_ToggleStatus](#21-act_product_togglestatus)
   - 2.2 [ACT_Product_SaveEdit](#22-act_product_saveedit)
   - 2.3 [ACT_Product_CreateNew](#23-act_product_createnew)
   - 2.4 [ACT_Product_GenerateCode](#24-act_product_generatecode)
   - 2.5 [DS_Product_GetFilteredList](#25-ds_product_getfilteredlist)
3. [Nanoflows (Client-side)](#3-nanoflows-client-side)
   - 3.1 [NF_Page_Initialize](#31-nf_page_initialize)
   - 3.2 [NF_Filter_ApplyFilter](#32-nf_filter_applyfilter)
   - 3.3 [NF_Filter_ResetFilter](#33-nf_filter_resetfilter)
   - 3.4 [NF_Product_OpenEditPopup](#34-nf_product_openeditpopup)
   - 3.5 [NF_Product_OpenCreatePopup](#35-nf_product_opencreatepopup)
   - 3.6 [NF_Product_ToggleStatus](#36-nf_product_togglestatus)

---

## 1. Microflow vs Nanoflow — Khi nào dùng cái nào?

| Tiêu chí | Microflow (Server) | Nanoflow (Client) |
|-----------|-------------------|-------------------|
| Chạy trên | Mendix Runtime (server) | Browser (client) |
| Database access | ✅ Direct | ❌ Chỉ qua microflow call |
| NPE access | ⚠️ Có thể nhưng cần careful | ✅ Native |
| UI operations | ❌ Không manipulate UI trực tiếp | ✅ Refresh, show/hide, navigation |
| Speed | Network round-trip | Instant (no network) |
| Offline support | ❌ | ✅ (trong Mendix offline apps) |
| Commit/rollback | ✅ Explicit | Auto (NPE thay đổi tức thì) |
| Java actions | ✅ Có thể gọi | ❌ Không thể gọi |

### Nguyên tắc phân bổ

```
Microflow = DB operations (commit, rollback, complex XPath)
         = Java actions, email, integration
         = Batch operations, scheduled events

Nanoflow  = NPE state manipulation (filter, proxy)
         = UI navigation, popup open/close
         = Simple calculations, format
         = Client-side validation preview
```

---

## 2. Microflows (Server-side)

### 2.1 ACT_Product_ToggleStatus

**Mục đích:** Toggle status Product giữa Active ↔ Inactive. Commit trực tiếp vào DB.

**Parameters:**
- `Product` (type: `ProductManagement.Product`) — Product cần toggle

**Return type:** `ProductManagement.Product` (sau khi toggle)

**Microflow logic:**

```
[Start]
   │
   ▼
┌──────────────────────────────────────┐
│ Exclusive Split: Current Status      │
│ Condition: $Product/status =         │
│   ProductManagement.ProductStatus.Active │
└──────────┬──────────────┬────────────┘
           │              │
     [True branch]   [False branch]
           │              │
           ▼              ▼
   ┌─────────────┐  ┌──────────────┐
   │ Change      │  │ Change       │
   │ $Product/   │  │ $Product/    │
   │ status =    │  │ status =     │
   │ Inactive    │  │ Active       │
   └──────┬──────┘  └──────┬───────┘
          │                │
          └───────┬────────┘
                  ▼
         ┌─────────────────┐
         │ Change object   │
         │ $Product/       │
         │ updatedDate =   │
         │ [%CurrentDateTime%] │
         │ changedBy =     │
         │ [%CurrentUser%] │
         └────────┬────────┘
                  ▼
         ┌─────────────────┐
         │ Commit          │
         │ $Product        │
         │ (with events)   │
         └────────┬────────┘
                  ▼
              [End]
           Return: $Product
```

**Chi tiết từng bước:**

1. **Exclusive Split** — Kiểm tra status hiện tại
   - Condition: `$Product/status = ProductManagement.ProductStatus.Active`
   - Variable name: `IsCurrentlyActive` (Boolean)

2. **Change Object** (True branch) — Set inactive
   - Object: `$Product`
   - Member: `status` → Value: `ProductManagement.ProductStatus.Inactive`

3. **Change Object** (False branch) — Set active
   - Object: `$Product`
   - Member: `status` → Value: `ProductManagement.ProductStatus.Active`

4. **Change Object** (Merge point) — Update timestamps
   - Object: `$Product`
   - `updatedDate` = `[%CurrentDateTime%]`
   - `changedBy` = `[%CurrentUser%]`

5. **Commit** — Lưu vào DB
   - Object: `$Product`
   - ✅ With events (trigger before/after commit events nếu có)

6. **End** — Return `$Product`

---

### 2.2 ACT_Product_SaveEdit

**Mục đích:** Lưu data từ NPE ProductEditProxy sang Persistent Product. Đây là **proxy commit pattern** cốt lõi.

**Parameters:**
- `EditProxy` (type: `ProductManagement.ProductEditProxy`) — NPE chứa edited data

**Return type:** Boolean (`true` nếu save thành công)

**Microflow logic:**

```
[Start]
   │
   ▼
┌──────────────────────────────────────┐
│ Retrieve: Get Product by ID          │
│ Source: Database                     │
│ Entity: ProductManagement.Product    │
│ XPath: [id = $EditProxy/targetProductId] │
│ Range: First                         │
└──────────────────┬───────────────────┘
                   ▼
         ┌──────────────────┐
         │ Exclusive Split  │
         │ Product found?   │
         │ $Product != empty│
         └────┬─────────┬───┘
              │         │
         [True]     [False]
              │         │
              ▼         ▼
   ┌──────────────┐  ┌──────────┐
   │ Validation:  │  │ Log msg  │
   │ MinPrice ≤   │  │ "Product │
   │ MaxPrice     │  │ not found│
   └──────┬───────┘  └─────┬────┘
          │                │
     [Valid]          Return: false
          │
          ▼
   ┌──────────────────────────────────────┐
   │ Change Object: Copy from Proxy → PE  │
   │ $Product/productName =               │
   │   $EditProxy/productName             │
   │ $Product/description =               │
   │   $EditProxy/description             │
   │ $Product/productMinPrice =           │
   │   $EditProxy/productMinPrice         │
   │ $Product/productMaxPrice =           │
   │   $EditProxy/productMaxPrice         │
   │ $Product/quickNote =                 │
   │   $EditProxy/quickNote               │
   └──────────────────┬───────────────────┘
                      ▼
   ┌──────────────────────────────────────┐
   │ Set Category association             │
   │ Retrieve Category by                │
   │   $EditProxy/selectedCategoryId     │
   │ Set $Product/Product_Category =     │
   │   $Category                         │
   └──────────────────┬───────────────────┘
                      ▼
   ┌──────────────────────────────────────┐
   │ Change Object: Update timestamps     │
   │ $Product/updatedDate =               │
   │   [%CurrentDateTime%]               │
   │ $Product/changedBy =                 │
   │   [%CurrentUser%]                   │
   └──────────────────┬───────────────────┘
                      ▼
   ┌──────────────────────────────────────┐
   │ Commit $Product (with events)        │
   └──────────────────┬───────────────────┘
                      ▼
                 Return: true
```

**Chi tiết bước Set Category:**

1. **Retrieve from Database:**
   - Entity: `ProductManagement.Category`
   - XPath: `[id = $EditProxy/selectedCategoryId]`
   - Range: First
   - Variable: `CategoryObj`

2. **Change Object:**
   - `$Product` → Set association `Product_Category` = `$CategoryObj`

> **Quan trọng:** Nếu `selectedCategoryId` = empty → không set association (giữ nguyên category cũ).

---

### 2.3 ACT_Product_CreateNew

**Mục đích:** Tạo mới Product từ popup data. **Nhận NPE proxy làm input.**

**Parameters:**
- `NewProductProxy` (type: `ProductManagement.ProductEditProxy`) — Dùng lại NPE cho Create

**Return type:** `ProductManagement.Product` (product mới tạo)

**Microflow logic:**

```
[Start]
   │
   ▼
┌──────────────────────────────────────┐
│ Create: ProductManagement.Product    │
│ In Memory (no commit yet)            │
└──────────────────┬───────────────────┘
                   ▼
┌──────────────────────────────────────┐
│ Sub-microflow call:                  │
│ ACT_Product_GenerateCode             │
│ Param: $NewProduct                   │
│ Return: $NewProduct (with code set)  │
└──────────────────┬───────────────────┘
                   ▼
┌──────────────────────────────────────┐
│ Change Object: Copy from Proxy       │
│ $NewProduct/productName =            │
│   $NewProductProxy/productName       │
│ $NewProduct/description =            │
│   $NewProductProxy/description       │
│ $NewProduct/productMinPrice =        │
│   $NewProductProxy/productMinPrice   │
│ $NewProduct/productMaxPrice =        │
│   $NewProductProxy/productMaxPrice   │
│ $NewProduct/quickNote =              │
│   $NewProductProxy/quickNote         │
│ $NewProduct/status = ProductStatus.Active │
│ $NewProduct/createdDate =            │
│   [%CurrentDateTime%]                │
│ $NewProduct/updatedDate =            │
│   [%CurrentDateTime%]                │
│ $NewProduct/createdBy =              │
│   [%CurrentUser%]                    │
│ $NewProduct/changedBy =              │
│   [%CurrentUser%]                    │
└──────────────────┬───────────────────┘
                   ▼
┌──────────────────────────────────────┐
│ Set Category association             │
│ Retrieve Category by ID             │
│ Set $NewProduct/Product_Category     │
└──────────────────┬───────────────────┘
                   ▼
┌──────────────────────────────────────┐
│ Set Supplier association (optional)  │
│ Retrieve Supplier by ID             │
│ Set $NewProduct/Product_Supplier     │
└──────────────────┬───────────────────┘
                   ▼
┌──────────────────────────────────────┐
│ Commit $NewProduct (with events)     │
└──────────────────┬───────────────────┘
                   ▼
              Return: $NewProduct
```

---

### 2.4 ACT_Product_GenerateCode

**Mục đích:** Sinh mã productCode tự động. Format: `PRD-YYYYMMDD-NNNN`

**Parameters:**
- `Product` (type: `ProductManagement.Product`) — Product cần generate code

**Return type:** String (product code mới)

**Microflow logic:**

```
[Start]
   │
   ▼
┌──────────────────────────────────────┐
│ Variable: DatePart                   │
│ Value: formatDateTime(               │
│   [%CurrentDateTime%], 'yyyyMMdd')  │
└──────────────────┬───────────────────┘
                   ▼
┌──────────────────────────────────────┐
│ Variable: RandomPart                 │
│ Value: 'PRD-' + $DatePart + '-' +   │
│   toString(                          │
│     round(random()*9000+1000)        │
│   )                                  │
│ → Result: "PRD-20260612-3847"       │
└──────────────────┬───────────────────┘
                   ▼
┌──────────────────────────────────────┐
│ Change Object:                       │
│ $Product/productCode = $RandomPart   │
└──────────────────┬───────────────────┘
                   ▼
              Return: $RandomPart
```

> **Lưu ý:** `round(random()*9000+1000)` tạo số ngẫu nhiên 4 chữ số. Trong môi trường production, nên dùng sequence hoặc database auto-increment để đảm bảo uniqueness.

---

### 2.5 DS_Product_GetFilteredList

**Mục đích:** Data source microflow cho Data Grid 2. Lấy danh sách Product theo filter context.

**Parameters:**
- `FilterContext` (type: `ProductManagement.ProductFilterContext`) — NPE chứa filter state

**Return type:** List of `ProductManagement.Product`

**Microflow logic:**

```
[Start]
   │
   ▼
┌──────────────────────────────────────┐
│ Build XPath constraint dynamically   │
│ (Xem chi tiết XPath bên dưới)        │
└──────────────────┬───────────────────┘
                   ▼
┌──────────────────────────────────────┐
│ Retrieve from Database:              │
│ Entity: ProductManagement.Product    │
│ XPath: (dynamic constraint)          │
│ Sort: createdDate (desc)             │
│ Range: All (Data Grid 2 handles paging) │
└──────────────────┬───────────────────┘
                   ▼
              Return: ProductList
```

**XPath constraint (trong Mendix Microflow Retrieve):**

```
// Mendix XPath — tự động bỏ qua condition nếu variable = empty
// Vì vậy ta có thể viết tất cả conditions, Mendix chỉ apply những cái có giá trị

[ProductManagement.Product_Category = $FilterContext/FilterContext_Category]
[ProductManagement.Product_Supplier = $FilterContext/FilterContext_Supplier]
[createdDate >= $FilterContext/dateFrom]
[createdDate <= $FilterContext/dateTo]
```

> **Cách implement trong Mendix Microflow:**
>
> 1. Thêm **Retrieve** activity → Source: **From database**
> 2. Entity: `ProductManagement.Product`
> 3. XPath constraint (dùng **expression builder**):
>
> ```
> [ProductManagement.Product_Category = $FilterContext/FilterContext_Category]
> [ProductManagement.Product_Supplier = $FilterContext/FilterContext_Supplier]
> [createdDate >= $FilterContext/dateFrom]
> [createdDate <= $FilterContext/dateTo]
> ```
>
> 4. **Quan trọng về Mendix XPath behavior:** Mendix XPath **tự động bỏ qua** condition nếu variable (association hoặc attribute) = empty. Nếu `FilterContext_Category` = empty → condition `[Product_Category = empty]` được bỏ qua. Không cần if-else phức tạp.
>
> **Sort:** `createdDate` DESC
> **Range:** All (Data Grid 2 quản lý pagination ở client-side khi dùng MF datasource)

> **Lưu ý về Microflow datasource vs Database datasource:**
>
> - **Microflow datasource:** Mendix transfer **toàn bộ data** về client rồi apply paging/sorting ở client-side. OK cho dataset < 1000 rows.
> - **Database datasource:** Paging/sorting **server-side**, efficient hơn cho dataset lớn. Tuy nhiên, Database datasource **không thể** nhận NPE parameter trực tiếp — cần dùng XPath constraint với NPE association, điều này **không khả thi** trực tiếp (NPE không tồn tại trong DB).
> - **Kết luận:** Với pattern NPE filter, **Microflow datasource** là lựa chọn đúng. Dataset lớn → cân nhắc refactor sang persistent filter entity.

---

## 3. Nanoflows (Client-side)

### 3.1 NF_Page_Initialize

**Mục đích:** Khởi tạo NPE ProductFilterContext khi page load. Chạy trên **On Page Load** event.

**Parameters:** (không có)

**Return type:** `ProductManagement.ProductFilterContext`

**Nanoflow logic:**

```
[Start]
   │
   ▼
┌──────────────────────────────────────┐
│ Create: ProductManagement.           │
│   ProductFilterContext               │
│ In Memory                            │
└──────────────────┬───────────────────┘
                   ▼
┌──────────────────────────────────────┐
│ Change Object: Set defaults          │
│ $FilterContext/selectedCategoryId =  │
│   empty                              │
│ $FilterContext/selectedSupplierId =  │
│   empty                              │
│ $FilterContext/dateFrom = empty      │
│ $FilterContext/dateTo = empty       │
│ $FilterContext/searchText = empty    │
│ $FilterContext/currentPage = 0       │
└──────────────────┬───────────────────┘
                   ▼
              Return: $FilterContext
```

**Sử dụng:** Gắn nanoflow này vào Data View (bọc ngoài page) → Data source → **Nanoflow** → `NF_Page_Initialize`

> **Tại sao dùng Nanoflow thay vì Microflow?**
>
> - NPE tạo trên **client** → không cần round-trip đến server
> - Instant — user không thấy loading
> - Đây là **stateless initialization** — không cần DB access

---

### 3.2 NF_Filter_ApplyFilter

**Mục đích:** Trigger reload Data Grid 2 khi user thay đổi filter. Chạy trên **OnChange** của filter dropdowns/date pickers.

**Parameters:**
- `FilterContext` (type: `ProductManagement.ProductFilterContext`)

**Return type:** Void (không return)

**Nanoflow logic:**

```
[Start]
   │
   ▼
┌──────────────────────────────────────┐
│ (No explicit action needed!)         │
│                                      │
│ Data Grid 2 auto-refreshes when     │
│ its datasource XPath references      │
│ change (via NPE context update)      │
└──────────────────────────────────────┘
```

> **Đây là "magic" của Mendix Data Grid 2 với NPE context pattern:**
>
> Khi NPE `ProductFilterContext` thay đổi (user chọn category khác), Data Grid 2 auto-detect context change và reload datasource. **Không cần explicit refresh action.**
>
> **Tuy nhiên**, nếu bạn dùng **association-based filter** (NPE → Category association), Data Grid 2 sẽ **không** auto-refresh. Cần dùng **microflow datasource** hoặc **refresh button**.
>
> **Pattern khuyến nghị:** Dùng **NPE association** để Dropdown widget binding, và Data Grid 2 datasource là **Database** với XPath constraint reference đến NPE association. Xem file 04 để biết chi tiết setup.

**Nanoflow thực tế (nếu cần explicit refresh):**

```
[Start]
   │
   ▼
┌──────────────────────────────────────┐
│ Nanoflow Call: (optional)            │
│ Gọi nếu cần sync NPE → PE filter    │
└──────────────────────────────────────┘
```

> **Thực tế:** Nanoflow này thường **rỗng** vì Mendix auto-refresh. Nhưng tạo sẵn để:
> 1. Gắn vào OnChange event → đảm bảo UI flow đúng
> 2. Sau này có thể thêm logic (logging, analytics, v.v.)

---

### 3.3 NF_Filter_ResetFilter

**Mục đích:** Reset tất cả filter về giá trị mặc định.

**Parameters:**
- `FilterContext` (type: `ProductManagement.ProductFilterContext`)

**Return type:** `ProductManagement.ProductFilterContext`

**Nanoflow logic:**

```
[Start]
   │
   ▼
┌──────────────────────────────────────┐
│ Change Object: Reset all filters     │
│ $FilterContext/FilterContext_Category │
│   = empty                            │
│ $FilterContext/FilterContext_Supplier │
│   = empty                            │
│ $FilterContext/dateFrom = empty      │
│ $FilterContext/dateTo = empty       │
└──────────────────┬───────────────────┘
                   ▼
              Return: $FilterContext
```

**Sử dụng:** Gắn vào **Reset Filter** button → OnClick → Call Nanoflow → `NF_Filter_ResetFilter`
- Button Return: **Refresh context** (để Data Grid 2 reload)

> **Quan trọng:** Khi reset NPE association (set = empty), Data Grid 2 sẽ auto-detect change và reload với constraint mới (không có filter).

---

### 3.4 NF_Product_OpenEditPopup

**Mục đích:** Mở popup Quick Edit. Copy data từ Product sang NPE ProductEditProxy.

**Parameters:**
- `Product` (type: `ProductManagement.Product`) — Product đang edit

**Return type:** Void

**Nanoflow logic:**

```
[Start]
   │
   ▼
┌──────────────────────────────────────┐
│ Create: ProductManagement.           │
│   ProductEditProxy                   │
│ In Memory                            │
└──────────────────┬───────────────────┘
                   ▼
┌──────────────────────────────────────┐
│ Change Object: Copy Product → Proxy  │
│ $EditProxy/targetProductId =         │
│   toString($Product/id)              │
│ $EditProxy/productName =             │
│   $Product/productName               │
│ $EditProxy/description =             │
│   $Product/description               │
│ $EditProxy/productMinPrice =         │
│   $Product/productMinPrice           │
│ $EditProxy/productMaxPrice =         │
│   $Product/productMaxPrice           │
│ $EditProxy/quickNote =               │
│   $Product/quickNote                 │
│ $EditProxy/EditProxy_Category =      │
│   $Product/Product_Category          │
└──────────────────┬───────────────────┘
                   ▼
┌──────────────────────────────────────┐
│ Show Page: Product_EditPopup         │
│ Page: ProductManagement.             │
│   Product_EditPopup                  │
│ Parameter: $EditProxy                │
└──────────────────────────────────────┘
```

> **Quan trọng:** `toString($Product/id)` — Mendix ID là Object, cần convert sang String để store trong NPE.

---

### 3.5 NF_Product_OpenCreatePopup

**Mục đích:** Mở popup Create New Product. Tạo NPE ProductEditProxy rỗng.

**Parameters:**
- `FilterContext` (type: `ProductManagement.ProductFilterContext`) — Để giữ filter state

**Return type:** Void

**Nanoflow logic:**

```
[Start]
   │
   ▼
┌──────────────────────────────────────┐
│ Create: ProductManagement.           │
│   ProductEditProxy                   │
│ In Memory                            │
└──────────────────┬───────────────────┘
                   ▼
┌──────────────────────────────────────┐
│ Change Object: Set defaults          │
│ $EditProxy/targetProductId = empty   │
│ $EditProxy/productName = empty       │
│ $EditProxy/description = empty      │
│ $EditProxy/productMinPrice = 0.00   │
│ $EditProxy/productMaxPrice = 0.00   │
│ $EditProxy/quickNote = empty        │
│ $EditProxy/EditProxy_Category =     │
│   $FilterContext/FilterContext_Category │
│   ← KEEP current filter category!   │
└──────────────────┬───────────────────┘
                   ▼
┌──────────────────────────────────────┐
│ Show Page: Product_CreatePopup       │
│ Page: ProductManagement.             │
│   Product_CreatePopup                │
│ Parameter: $EditProxy                │
└──────────────────────────────────────┘
```

> **Lưu ý "Keep filter":** `$EditProxy/selectedCategoryId = $FilterContext/selectedCategoryId` — Pre-fill category từ filter hiện tại. User có thể thay đổi, nhưng default là category đang filter.

---

### 3.6 NF_Product_ToggleStatus

**Mục đích:** Client-side trigger toggle status. Gọi Microflow server-side.

**Parameters:**
- `Product` (type: `ProductManagement.Product`)

**Return type:** Void

**Nanoflow logic:**

```
[Start]
   │
   ▼
┌──────────────────────────────────────┐
│ Microflow Call:                      │
│ ACT_Product_ToggleStatus             │
│ Param: $Product                      │
│ Return: $UpdatedProduct              │
└──────────────────┬───────────────────┘
                   ▼
┌──────────────────────────────────────┐
│ (Data Grid 2 auto-refreshes)         │
│ Product object đã được updated       │
│ trong client session sau commit      │
└──────────────────────────────────────┘
```

> **Quan trọng về refresh sau Toggle:**
>
> Khi Microflow commit Product thay đổi, Mendix Runtime **push update** đến client (qua Mendix real-time sync). Data Grid 2 **auto-refreshes** hiển thị status mới.
>
> Tuy nhiên, nếu auto-refresh không hoạt động, thêm **Refresh in client** activity:
> - Trong Nanoflow sau khi gọi Microflow → Add **Refresh** activity
> - Object: `$UpdatedProduct`
> - Hoặc dùng **Change object** (no actual change) → force UI refresh

---

## Tổng kết Microflows & Nanoflows

### Tổng quan

| Type | Name | Purpose | Trigger |
|------|------|---------|---------|
| **Microflow** | ACT_Product_ToggleStatus | Toggle Active ↔ Inactive + commit | Từ Nanoflow |
| **Microflow** | ACT_Product_SaveEdit | Copy NPE → PE + commit | Từ Nanoflow (popup Save) |
| **Microflow** | ACT_Product_CreateNew | Tạo Product mới + commit | Từ Nanoflow (popup Create) |
| **Microflow** | ACT_Product_GenerateCode | Sinh mã PRD-YYYYMMDD-NNNN | Sub-microflow |
| **Nanoflow** | NF_Page_Initialize | Tạo FilterContext NPE | Page load |
| **Nanoflow** | NF_Filter_ApplyFilter | (Placeholder) trigger refresh | Filter onChange |
| **Nanoflow** | NF_Filter_ResetFilter | Reset tất cả filters | Button click |
| **Nanoflow** | NF_Product_OpenEditPopup | Copy PE → NPE + mở popup | Button click |
| **Nanoflow** | NF_Product_OpenCreatePopup | Tạo NPE rỗng + mở popup | Button click |
| **Nanoflow** | NF_Product_ToggleStatus | Gọi microflow toggle | Button click |

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│  Page: Product_List                                     │
│                                                         │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Data View: ProductFilterContext (NPE)              │ │
│  │ Data Source: NF_Page_Initialize                    │ │
│  │                                                    │ │
│  │  ┌─────────────┐  ┌──────────────┐                 │ │
│  │  │ Filter Bar  │  │ Data Grid 2  │                 │ │
│  │  │ Dropdowns   │  │ (Products)   │                 │ │
│  │  │ DatePickers │  │              │                 │ │
│  │  │             │  │ [Toggle] btn │─┐               │ │
│  │  │ [Reset] btn │  │ [View]   btn │ │               │ │
│  │  │ [Create] btn│  │ [Edit]   btn │─┼─┐             │ │
│  │  └─────────────┘  └──────────────┘ │ │             │ │
│  │                                    │ │             │ │
│  │          NF_Filter_ResetFilter      │ │             │ │
│  │                    ▲               │ │             │ │
│  │                    │               ▼ ▼             │ │
│  │        ┌───────────┴──────┐   NF_Toggle  NF_OpenEdit│ │
│  │        │  NPE State       │   (→ ACT_    (→ Popup) │ │
│  │        │  (auto-refresh   │    Toggle)              │ │
│  │        │   Data Grid 2)   │     ▼                   │ │
│  │        └──────────────────┘   Server commit         │ │
│  └────────────────────────────────────────────────────┘ │
│                                                         │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Popup: Product_EditPopup                           │ │
│  │ Data Source: ProductEditProxy (NPE)                │ │
│  │                                                    │ │
│  │  [Cancel]  → Close popup                           │ │
│  │  [Save]    → ACT_Product_SaveEdit → Close popup    │ │
│  │             → Data Grid 2 refreshes                │ │
│  └────────────────────────────────────────────────────┘ │
│                                                         │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Popup: Product_CreatePopup                         │ │
│  │ Data Source: ProductEditProxy (NPE)                │ │
│  │                                                    │ │
│  │  [Cancel]  → Close popup                           │ │
│  │  [Create]  → ACT_Product_CreateNew → Close popup   │ │
│  │             → Data Grid 2 refreshes                │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Tiếp theo:** [04-product-list-page.md](04-product-list-page.md) — Tạo Product List Page với Data Grid 2
