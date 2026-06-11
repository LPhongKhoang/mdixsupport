# 07 - State Management Patterns: NPE Context, Refresh Strategy & Data Flow

## Mục lục

1. [NPE Context Pattern — Tổng quan](#1-npe-context-pattern--tổng-quan)
2. [Data Flow Patterns](#2-data-flow-patterns)
3. [Refresh Strategies](#3-refresh-strategies)
4. [Common Anti-Patterns & Pitfalls](#4-common-anti-patterns--pitfalls)
5. [Advanced Patterns](#5-advanced-patterns)
6. [Decision Matrix — Khi nào dùng pattern nào](#6-decision-matrix--khi-nào-dùng-pattern-nào)

---

## 1. NPE Context Pattern — Tổng quan

### 1.1 NPE là gì?

**Non-Persistent Entity (NPE)** trong Mendix là entity **không map vào database table**. Data chỉ tồn tại trong **client session** (browser memory) hoặc **server session** (tạm thời trong microflow execution).

**Đặc điểm:**
- ❌ Không lưu vào database
- ✅ Tồn tại trong browser memory (khi tạo qua Nanoflow)
- ✅ Có thể pass giữa pages, widgets, nanoflows
- ✅ Có thể association với Persistent Entity
- ❌ Mất khi user refresh browser (F5) hoặc session timeout
- ⚠️ Không hỗ trợ Mendix standard validation (trong Data View) giống PE

### 1.2 Tại sao NPE là State Management solution trong Mendix?

Trong Mendix **không có "useState" hay Redux** như React. Thay vào đó:

| React Pattern | Mendix Equivalent |
|---------------|-------------------|
| `useState()` | NPE attribute |
| Context API | Data View + NPE context |
| Props | Page parameters / Widget data source |
| Redux store | NPE singleton trên page |
| URL params | Deep link / Page URL parameters |
| LocalStorage | Persistent Entity (DB) |

### 1.3 NPE Context Pattern Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Page Lifecycle                        │
│                                                         │
│  1. Page Load                                           │
│     ├── Nanoflow: NF_Page_Initialize                    │
│     │   └── Create ProductFilterContext (NPE)           │
│     │       ├── selectedCategoryId = empty              │
│     │       ├── selectedSupplierId = empty              │
│     │       ├── dateFrom = empty                        │
│     │       └── dateTo = empty                          │
│     │                                                   │
│     └── Data View receives NPE as data source           │
│         ├── Filter widgets bind to NPE attributes       │
│         └── Data Grid 2 uses NPE as datasource param    │
│                                                         │
│  2. User Interaction                                    │
│     ├── Select Category dropdown                        │
│     │   └── NPE.FilterContext_Category = selected       │
│     │       └── Data View detects change                │
│     │           └── Data Grid 2 re-fetches data         │
│     │                                                   │
│     ├── Click "Edit" button                             │
│     │   └── Nanoflow creates EditProxy NPE              │
│     │       └── Copy PE data → NPE                      │
│     │           └── Show popup with NPE data source     │
│     │                                                   │
│     └── Click "Create" button                           │
│         └── Nanoflow creates EditProxy NPE (empty)      │
│             └── Show popup with NPE data source         │
│                                                         │
│  3. Data Mutation                                       │
│     ├── User edits form in popup (NPE changes only)     │
│     ├── User clicks Save                                │
│     │   └── Nanoflow → Microflow (server)               │
│     │       └── Copy NPE → PE + Commit                  │
│     │           └── Return to client                    │
│     │               └── Close popup + Refresh grid      │
│     │                                                   │
│     └── User clicks Toggle Status                       │
│         └── Nanoflow → Microflow (server)               │
│             └── Change PE status + Commit               │
│                 └── Client sync → Grid auto-updates     │
│                                                         │
│  4. Page Unload                                         │
│     └── NPE garbage collected (data lost)               │
│         └── Next page load starts fresh (step 1)        │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Data Flow Patterns

### 2.1 Filter Data Flow

```
┌──────────┐     bind      ┌─────────────────┐     param     ┌──────────────────┐
│ Dropdown │──────────────→│ ProductFilter   │─────────────→│ Data Grid 2      │
│ Category │               │ Context (NPE)   │              │ DataSource: MF   │
└──────────┘               │                 │              │ DS_Product_      │
                           │ .Category ────→ │              │ GetFilteredList  │
┌──────────┐     bind      │ .Supplier ────→ │              │                  │
│ Dropdown │──────────────→│ .dateFrom ────→ │              │ XPath uses NPE  │
│ Supplier │               │ .dateTo ─────→ │              │ params to filter │
└──────────┘               └─────────────────┘              └──────────────────┘
                                                                  │
                                                                  ▼
                                                           ┌──────────────┐
                                                           │ Database     │
                                                           │ SELECT FROM  │
                                                           │ Product WHERE│
                                                           │ category = ? │
                                                           │ AND supplier │
                                                           │ = ? AND ...  │
                                                           └──────────────┘
```

### 2.2 Edit Data Flow (Proxy Pattern)

```
┌────────────┐                    ┌─────────────────┐
│ Data Grid  │                    │ ProductEditProxy │
│ Product PE │                    │ (NPE)            │
│            │                    │                  │
│ Click Edit │──── Nanoflow ────→ │ Copy PE → NPE   │
│            │                    │                  │
│            │                    │ .productName     │ ← editable
│            │                    │ .description     │ ← editable
│            │                    │ .minPrice        │ ← editable
│            │                    │ .maxPrice        │ ← editable
│            │                    │ .quickNote       │ ← editable
│            │                    │ .Category        │ ← editable
│            │                    └────────┬─────────┘
│            │                             │
│            │                    User edits NPE
│            │                    (PE unchanged!)
│            │                             │
│            │                    User clicks Save
│            │                             │
│            │◄──── Nanoflow + MF ─────────┘
│            │     Copy NPE → PE + Commit
│ Refreshed  │
│ with new   │
│ data       │
└────────────┘
```

### 2.3 Toggle Data Flow (Direct PE Update)

```
┌────────────┐              ┌─────────────────┐
│ Data Grid  │              │ Microflow       │
│ Product PE │              │ (Server-side)   │
│            │              │                 │
│ Click Toggle├──Nanoflow──→│ Toggle status   │
│            │              │ Active↔Inactive │
│            │              │ Update timestamp│
│            │              │ Commit to DB    │
│            │◄──sync───────┤                 │
│ Auto-update│              └─────────────────┘
│ status     │
└────────────┘
```

> **Key insight:** Toggle là **direct PE mutation** — không qua NPE proxy vì:
> 1. Chỉ thay đổi 1 attribute (`status`)
> 2. Không cần undo/cancel
> 3. Action là immediate — không cần user confirmation (có thể thêm confirmation sau)

---

## 3. Refresh Strategies

### 3.1 Khi nào Data Grid 2 cần refresh?

| Scenario | Refresh mechanism | User action needed? |
|----------|-------------------|---------------------|
| Filter change (dropdown) | Auto (via NPE context) | ❌ Auto |
| Filter change (date) | Auto (via NPE context) | ❌ Auto |
| Reset filter | Auto (NPE context cleared) | ❌ Auto |
| Toggle status | Auto (Mendix client sync) | ❌ Auto |
| Quick Edit save | Auto (PE commit → sync) | ❌ Auto |
| Create new product | Auto (PE commit → sync) | ❌ Auto |
| Another user edits same data | ⚠️ NOT auto | ✅ Manual refresh |
| External system update | ⚠️ NOT auto | ✅ Manual refresh |

### 3.2 Refresh Methods

#### Method 1: NPE Context Change (Auto-refresh)

**Khi hoạt động:** Data Grid 2 datasource là **Microflow** nhận **NPE parameter** từ Data View.

```
NPE attribute changes → Data View re-evaluates → Data Grid 2 datasource re-executes
```

**Configuration:**
1. Data View → Properties → **Refresh on context update** = ✅
2. Data Grid 2 → Data source → Microflow → Parameter = `$currentObject` (NPE từ Data View)

#### Method 2: Mendix Client Sync (Auto-refresh after commit)

**Khi hoạt động:** Khi Microflow commit PE thay đổi, Mendix Runtime **push** update đến tất cả client sessions đang subscribe.

**Limitation:** Chỉ sync objects đã **loaded trong client**. Nếu Product mới tạo chưa từng load → không tự động xuất hiện.

**Workaround:** Trong Nanoflow, sau Microflow call → thêm **Refresh in client** activity:
- Object: `$currentObject` (NPE context) → triggers full Data Grid 2 refresh

#### Method 3: Manual Refresh Button

**Thêm refresh button trên Data Grid 2:**
1. Data Grid 2 → Properties → **Show refresh button** = ✅
2. User clicks → Data Grid 2 re-fetches data

**Hoặc custom refresh button:**
1. Thêm Button → OnClick → Call Nanoflow
2. Nanoflow: **Change object** (NPE) → set any attribute → triggers context refresh

#### Method 4: JavaScript Widget Refresh (Advanced)

Trong Mendix v10, có thể dùng **JavaScript Action** hoặc **Pluggable Widget** để programmatic refresh:

```javascript
// Mendix Client API (diagrammatic — không phải code thực tế)
mx.data.action({
    params: {
        actionname: "ProductManagement.DS_Product_GetFilteredList",
    },
    callback: function(result) {
        // Refresh Data Grid 2
    }
});
```

> **Khuyến nghị:** Dùng **Method 1** (NPE Context) cho filter refresh, **Method 2** (Client Sync) cho CRUD refresh. Chỉ dùng Method 3/4 khi cần.

### 3.3 Refresh Decision Tree

```
Cần refresh Data Grid 2?
       │
       ├── Trigger = Filter change?
       │   └── YES → Method 1: NPE Context (auto)
       │
       ├── Trigger = PE CRUD (same user)?
       │   └── YES → Method 2: Client Sync (auto)
       │       └── Nếu không auto → Method 1: Force NPE refresh
       │
       ├── Trigger = External data change?
       │   └── YES → Method 3: Manual refresh button
       │
       └── Trigger = Timer-based?
           └── YES → Method 4: JavaScript interval
               (hoặc Mendix Scheduled Event + push notification)
```

---

## 4. Common Anti-Patterns & Pitfalls

### 4.1 Anti-Pattern: Edit trực tiếp PE trong Popup

```
❌ BAD:
   Open Popup with Product (PE) → User edits → Widget auto-commits → Cancel không rollback
```

**Vấn đề:**
- Một số Mendix widgets auto-commit PE khi mất focus
- Cancel popup **không rollback** committed data
- User vô tình thay đổi data

**Fix:**
```
✅ GOOD:
   Open Popup with ProductEditProxy (NPE) → User edits → Copy NPE → PE → Commit
   Cancel = discard NPE (PE untouched)
```

### 4.2 Anti-Pattern: NPE dùng làm Data Grid datasource trực tiếp

```
❌ BAD:
   Data Grid 2 → Data source → Nanoflow → Create list of NPE objects
```

**Vấn đề:**
- NPE không sortable/paggable bởi Data Grid 2
- NPE list không persist qua page navigation
- Performance issue với large datasets

**Fix:**
```
✅ GOOD:
   Data Grid 2 → Data source → Microflow → Retrieve PE from DB → Return PE list
   NPE chỉ dùng làm filter parameter, không phải data container
```

### 4.3 Anti-Pattern: Multiple NPE Contexts trên 1 Page

```
❌ BAD:
   Data View 1 (NPE Context A)
     Data View 2 (NPE Context B)  ← nested, confusing data flow
       Data Grid
```

**Vấn đề:**
- Nested Data Views với NPE → unpredictable refresh behavior
- Hard to debug which NPE triggers refresh

**Fix:**
```
✅ GOOD:
   Data View 1 (Single NPE Context) ← tất cả state trong 1 NPE
     ├── Filter widgets (bind to NPE)
     └── Data Grid 2 (NPE as parameter)
```

### 4.4 Pitfall: NPE Association không load trong Data Grid 2

**Vấn đề:** Data Grid 2 với **Database** datasource **không thể** navigate qua NPE-PE association trong XPath.

```
❌ DOES NOT WORK:
   Data Grid 2 → Database source → XPath:
   [ProductManagement.Product/ProductManagement.ProductFilterContext = $NPE]
   ← NPE không tồn tại trong DB, XPath không thể reference
```

**Fix:** Dùng **Microflow datasource** → Retrieve PE → Filter bằng NPE parameter trong microflow.

### 4.5 Pitfall: NPE Lost on Browser Refresh

**Vấn đề:** User nhấn F5 (refresh browser) → Tất cả NPE data bị mất → Page re-initialize.

**Fix:**
- Không thể prevent browser refresh
- **Mitigation:** Nếu cần persist state qua refresh → Lưu vào:
  - **URL parameters** (Mendix deep link)
  - **localStorage** (qua JavaScript widget)
  - **Persistent Entity** (DB — overkill cho filter state)

---

## 5. Advanced Patterns

### 5.1 Multi-Level Filter with NPE

Mở rộng `ProductFilterContext` cho complex filtering:

```sql
-- Thêm vào ProductFilterContext:
searchText          String(200)   -- Full-text search
priceRange          String(20)    -- "0-50", "50-100", "100-500", "500+"
statusFilter        ProductStatus -- Filter by status
sortBy              String(50)    -- "name", "price", "date"
sortOrder           String(4)     -- "asc", "desc"
```

### 5.2 Undo/Redo Pattern với NPE Stack

```
┌──────────────────────────────────────┐
│ Nanoflow: NF_Filter_SaveToHistory    │
│                                      │
│ 1. Retrieve existing FilterHistory   │
│    (NPE list trong client session)   │
│ 2. Create new FilterSnapshot (NPE)   │
│ 3. Copy current filter → snapshot    │
│ 4. Add snapshot to history list      │
│                                      │
│ Undo: Pop last snapshot → restore    │
└──────────────────────────────────────┘
```

### 5.3 Optimistic UI Update

Thay vì đợi server response, update NPE ngay:

```
User clicks Toggle →
  1. NPE: Immediately update UI (show new status)
  2. Call Microflow → Server commit
  3. If fail → Revert NPE → Show error
```

**Implementation:**
1. Trong Nanoflow `NF_Product_ToggleStatus`:
   - **Change Object** `$Product/status` (trực tiếp, optimistic)
   - **Call Microflow** `ACT_Product_ToggleStatus` (server commit)
   - If exception → **Revert** `$Product/status` về giá trị cũ

### 5.4 Page-Level State Object

Tạo một **master NPE** chứa reference đến tất cả sub-contexts:

```
PageState (NPE)
  ├── PageState_FilterContext (association → ProductFilterContext)
  ├── PageState_SelectedProduct (association → Product)
  ├── PageState_EditMode (String: "view", "edit", "create")
  ├── PageState_ShowModal (Boolean)
  └── PageState_MessageText (String)
```

> **Use case:** Khi page có nhiều complex interactions cần centralized state. Giống Redux store pattern.

---

## 6. Decision Matrix — Khi nào dùng pattern nào

| Scenario | Pattern | Entity Type | Datasource | Refresh |
|----------|---------|-------------|------------|---------|
| Filter state | NPE Context | ProductFilterContext (NPE) | Nanoflow init | Auto (context) |
| Data display | PE List | Product (PE) | Microflow | Auto (sync) |
| Edit form | NPE Proxy | ProductEditProxy (NPE) | Nanoflow create | Manual (save) |
| Create form | NPE Proxy | ProductEditProxy (NPE) | Nanoflow create | Manual (create) |
| Toggle action | Direct PE | Product (PE) | — | Auto (commit sync) |
| Calculated column | PE + MF | Product (PE, calculated attr) | Microflow | Auto (data change) |
| Row number | Expression | — (expression in DG2) | — | Auto (render) |
| Complex validation | NPE + MF | ProductEditProxy (NPE) | Nanoflow | On save |

### Summary: PE vs NPE Usage

| Data type | Store in | Reason |
|-----------|----------|--------|
| Product master data | **PE** (database) | Persistent, shared, queryable |
| Category/Supplier master data | **PE** (database) | Persistent, shared, queryable |
| Product Variant data | **PE** (database) | Persistent, associated to Product |
| Filter selections | **NPE** (memory) | Temporary, per-session, discardable |
| Edit form buffer | **NPE** (memory) | Temporary, cancelable, not committed |
| Pagination state | **NPE** (memory) | Temporary, auto-managed by DG2 |
| Calculated display values | **PE calculated attr** | Per-row, evaluated on access |
| UI state (modal open/close) | **NPE** (memory) | Temporary, client-only |

---

## Tổng kết

File này cover:
- ✅ NPE Context Pattern architecture và lifecycle
- ✅ Data Flow: Filter, Edit Proxy, Toggle
- ✅ Refresh Strategies: Auto vs Manual, khi nào dùng cái nào
- ✅ Anti-patterns: Edit PE directly, NPE as DG2 data, nested NPEs
- ✅ Advanced: Optimistic UI, Undo stack, Centralized state
- ✅ Decision matrix: PE vs NPE cho từng data type

**Tiếp theo:** [08-complete-page-structure.md](08-complete-page-structure.md) — Full Page Layout Reference & Testing Checklist
