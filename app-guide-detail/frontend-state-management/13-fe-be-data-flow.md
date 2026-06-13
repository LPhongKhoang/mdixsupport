# 13 - FE↔BE Data Flow: Complete Communication Patterns

## Mục lục

1. [Data Flow Overview](#1-data-flow-overview)
2. [Pattern 1: Page Load → Initialize State](#2-pattern-1-page-load)
3. [Pattern 2: Filter Change → Reload Data](#3-pattern-2-filter-change)
4. [Pattern 3: Toggle Status → Direct PE Mutation](#4-pattern-3-toggle-status)
5. [Pattern 4: Edit Product → NPE Proxy → Save](#5-pattern-4-edit-product)
6. [Pattern 5: Create Product → NPE Proxy → Create](#6-pattern-5-create-product)
7. [Pattern 6: Import Seed Data → REST/Mapping](#7-pattern-6-import-data)
8. [Complete Sequence Diagrams](#8-complete-sequence-diagrams)

---

## 1. Data Flow Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                    COMPLETE DATA FLOW MAP                        │
│                                                                  │
│  CLIENT (Browser)              SERVER (Mendix Runtime)          │
│  ════════════════              ════════════════════════          │
│                                                                  │
│  ┌──────────────┐              ┌──────────────────────┐         │
│  │ Pages        │  ──call──→  │ Microflows           │         │
│  │ (Data View,  │  ←return──  │ (DS_, ACT_, MLK_)    │         │
│  │  Data Grid,  │              └──────────┬───────────┘         │
│  │  Popup)      │                         │                     │
│  └──────┬───────┘              ┌──────────▼───────────┐         │
│         │                      │ Java Actions         │         │
│  ┌──────▼───────┐              │ (JA_GenerateCode)    │         │
│  │ Nanoflows    │  ──call──→  └──────────┬───────────┘         │
│  │ (NF_)        │  ←sync──              │                     │
│  └──────┬───────┘              ┌──────────▼───────────┐         │
│         │                      │ Database             │         │
│  ┌──────▼───────┐              │ (PE tables)          │         │
│  │ NPE Objects  │              │                      │         │
│  │ (FilterCtx,  │              │ Category             │         │
│  │  EditProxy)  │              │ Supplier             │         │
│  └──────────────┘              │ Product              │         │
│                                │ ProductVariant       │         │
│  NPE sống trong               └──────────────────────┘         │
│  browser memory                ↕ OQL queries                    │
│  (không qua server)                                            │
└──────────────────────────────────────────────────────────────────┘
```

### Key Principles

1. **NPE = Client-only** — Tạo, thay đổi, xóa tất cả ở client. Không bao giờ gửi NPE lên server để commit.
2. **PE = Server-only commit** — Mọi thay đổi PE phải qua Microflow → Commit trên server.
3. **Nanoflow = Bridge** — NF tạo NPE, copy data, gọi MF, xử lý response.
4. **Mendix Auto-Sync** — Sau khi MF commit PE → runtime push update về client.

---

## 2. Pattern 1: Page Load

### Sequence: User mở Product List page

```
User                Browser                Server (Runtime)
  │                    │                         │
  │  Navigate to       │                         │
  │  /products         │                         │
  │──────────────────→ │                         │
  │                    │  Page load event        │
  │                    │                         │
  │                    │  ┌─────────────────┐    │
  │                    │  │ Data View        │    │
  │                    │  │ DataSource:      │    │
  │                    │  │ NF_Page_Initialize│   │
  │                    │  │                  │    │
  │                    │  │ 1. Create NPE    │    │
  │                    │  │    FilterContext  │    │
  │                    │  │ 2. Set defaults  │    │
  │                    │  │ 3. Return NPE    │    │
  │                    │  └─────────────────┘    │
  │                    │                         │
  │                    │  Data View receives     │
  │                    │  ProductFilterContext   │
  │                    │  (NPE in memory)        │
  │                    │                         │
  │                    │  ┌─────────────────┐    │
  │                    │  │ Data Grid 2      │    │
  │                    │  │ DataSource: MF   │    │
  │                    │  │                  │    │
  │                    │  │ Call: ──────────→│    │
  │                    │  │ DS_Product_      │    │
  │                    │  │ GetFilteredList  │    │
  │                    │  │ Param: NPE       │    │
  │                    │  │                  │    │
  │                    │  │                  │──→ │ MF executes
  │                    │  │                  │    │ XPath Retrieve
  │                    │  │                  │    │ (no filter =
  │                    │  │                  │    │  all products)
  │                    │  │                  │←── │ Return: List
  │                    │  │  Render grid     │    │
  │                    │  └─────────────────┘    │
  │                    │                         │
  │  ← Page rendered  │                         │
  │    with products  │                         │
```

### Mendix Auto-Operations

| Step | Auto? | Trigger |
|------|-------|---------|
| NPE creation | ✅ | Data View data source = Nanoflow |
| DG2 data fetch | ✅ | DG2 data source = Microflow |
| NPE → MF parameter | ✅ | Data View passes context to DG2 |
| Calculated attrs | ✅ | Auto-eval when DG2 renders rows |

---

## 3. Pattern 2: Filter Change

### Sequence: User chọn Category filter

```
User                Browser                Server
  │                    │                     │
  │  Select Category   │                     │
  │  in dropdown       │                     │
  │──────────────────→ │                     │
  │                    │                     │
  │                    │  ┌───────────────┐  │
  │                    │  │ Reference      │  │
  │                    │  │ Selector       │  │
  │                    │  │ onChange event  │  │
  │                    │  │                │  │
  │                    │  │ Update NPE:    │  │
  │                    │  │ FilterContext.  │  │
  │                    │  │ Category =     │  │
  │                    │  │ selected obj   │  │
  │                    │  └───────┬───────┘  │
  │                    │          │           │
  │                    │  Data View detects  │
  │                    │  NPE change         │
  │                    │          │           │
  │                    │  ┌───────▼───────┐  │
  │                    │  │ Data Grid 2    │  │
  │                    │  │ re-fetches     │  │
  │                    │  │                │  │
  │                    │  │ Call: ────────→│  │
  │                    │  │ DS_Product_    │  │
  │                    │  │ GetFiltered    │  │
  │                    │  │ List           │  │
  │                    │  │                │  │
  │                    │  │                │──→│ MF: XPath
  │                    │  │                │  │ [Product_Category
  │                    │  │                │  │  = selected]
  │                    │  │                │←──│ Return: filtered
  │                    │  │  Re-render     │  │
  │                    │  └───────────────┘  │
  │                    │                     │
  │  ← Grid shows     │                     │
  │    filtered       │                     │
  │    products       │                     │
```

### Auto-Refresh Mechanism

**Cách Mendix detect NPE change và trigger DG2 refresh:**

1. Reference Selector update NPE association → `FilterContext_Category = selectedCategory`
2. Data View wraps everything → detects child NPE change
3. Data Grid 2 datasource (Microflow) depends on Data View context → re-executes
4. DG2 renders new data

> **Điều kiện để auto-refresh hoạt động:**
> - DG2 datasource = **Microflow** (không phải Database)
> - Microflow nhận parameter = `$currentObject` từ Data View
> - Data View data source = NPE (ProductFilterContext)
> - Filter widgets bind vào NPE attributes/associations

---

## 4. Pattern 3: Toggle Status

### Sequence: User click Toggle button

```
User                Browser                Server
  │                    │                     │
  │  Click "Deactivate"│                     │
  │──────────────────→ │                     │
  │                    │                     │
  │                    │  ┌───────────────┐  │
  │                    │  │ Nanoflow:      │  │
  │                    │  │ NF_Product_    │  │
  │                    │  │ ToggleStatus   │  │
  │                    │  │                │  │
  │                    │  │ Call MF: ─────→│  │
  │                    │  │                │──→│ ACT_Product_
  │                    │  │                │  │ ToggleStatus
  │                    │  │                │  │
  │                    │  │                │  │ 1. Check status
  │                    │  │                │  │ 2. Toggle
  │                    │  │                │  │ 3. Update date
  │                    │  │                │  │ 4. COMMIT ←──
  │                    │  │                │  │
  │                    │  │                │←──│ Return: updated
  │                    │  │                │  │ Product object
  │                    │  │                │  │
  │                    │  │ Mendix client  │  │
  │                    │  │ auto-sync:     │  │
  │                    │  │                │  │
  │                    │  │ • Product obj  │  │
  │                    │  │   in DG2       │  │
  │                    │  │   updated      │  │
  │                    │  │ • Status badge │  │
  │                    │  │   changes      │  │
  │                    │  │ • Button       │  │
  │                    │  │   visibility   │  │
  │                    │  │   swaps        │  │
  │                    │  └───────────────┘  │
  │                    │                     │
  │  ← Row updated    │                     │
  │    automatically  │                     │
```

### Data transferred

| Direction | Data |
|-----------|------|
| Client → Server | Product ID (implicit qua MF parameter) |
| Server → Client | Updated Product object (status, updatedDate, changedBy) |

### FE State Changes

```
Before toggle:
  Product.status = Active
  → "Deactivate" button visible
  → Status badge: "● Active" (green)

After toggle (server committed):
  Product.status = Inactive  ← auto-sync from server
  → "Activate" button visible
  → Status badge: "● Inactive" (red)
  → Row class: "row-inactive" (opacity 0.6)
```

---

## 5. Pattern 4: Edit Product

### Sequence: User click Edit → Modify → Save

```
User            Browser                    Server
  │                │                          │
  │ Click "Edit"   │                          │
  │──────────────→ │                          │
  │                │                          │
  │                │ ┌──────────────────────┐ │
  │                │ │ Nanoflow:             │ │
  │                │ │ NF_Product_           │ │
  │                │ │ OpenEditPopup         │ │
  │                │ │                       │ │
  │                │ │ 1. Create NPE         │ │
  │                │ │    EditProxy          │ │
  │                │ │                       │ │
  │                │ │ 2. Copy PE→NPE:       │ │
  │                │ │    proxy.name =       │ │
  │                │ │      product.name     │ │
  │                │ │    proxy.price =      │ │
  │                │ │      product.price    │ │
  │                │ │    proxy.category =   │ │
  │                │ │      product.category │ │
  │                │ │    ...                │ │
  │                │ │                       │ │
  │                │ │ 3. Show Page:         │ │
  │                │ │    Product_EditPopup  │ │
  │                │ │    Param: $EditProxy  │ │
  │                │ └──────────────────────┘ │
  │                │                          │
  │ ← Popup opens │                          │
  │   with filled │                          │
  │   data        │                          │
  │                │                          │
  │ User edits    │                          │
  │ fields        │                          │
  │──────────────→ │                          │
  │                │                          │
  │                │ NPE updated in memory:  │
  │                │ EditProxy.productName   │
  │                │   = "New Name"          │
  │                │ Product PE UNCHANGED    │
  │                │ ← Still original values │
  │                │                          │
  │ Click "Save"  │                          │
  │──────────────→ │                          │
  │                │                          │
  │                │ ┌──────────────────────┐ │
  │                │ │ Nanoflow:             │ │
  │                │ │ NF_Product_SaveEdit   │ │
  │                │ │                       │ │
  │                │ │ 1. Client validate    │ │
  │                │ │    (optional)         │ │
  │                │ │                       │ │
  │                │ │ 2. Call MF: ─────────→│ │
  │                │ │                       │─→│ ACT_Product_
  │                │ │                       │  │ SaveEdit
  │                │ │                       │  │
  │                │ │                       │  │ 3a. Retrieve
  │                │ │                       │  │     Product
  │                │ │                       │  │     by ID
  │                │ │                       │  │
  │                │ │                       │  │ 3b. Validate
  │                │ │                       │  │
  │                │ │                       │  │ 3c. Copy:
  │                │ │                       │  │  NPE → PE
  │                │ │                       │  │
  │                │ │                       │  │ 3d. Set
  │                │ │                       │  │  association
  │                │ │                       │  │
  │                │ │                       │  │ 3e. COMMIT
  │                │ │                       │  │
  │                │ │                       │←─│ Return: true
  │                │ │                       │  │
  │                │ │ 4. Close popup       │  │
  │                │ │                       │  │
  │                │ │ 5. DG2 auto-refreshes │  │
  │                │ │    (server committed) │  │
  │                │ └──────────────────────┘ │
  │                │                          │
  │ ← List shows  │                          │
  │   updated     │                          │
  │   product     │                          │
  │   filter kept │                          │
```

### Key Data Points

| Step | Where | What happens to data |
|------|-------|---------------------|
| Open popup | Client (NF) | PE data copied → NPE. PE untouched. |
| User edits | Client (browser) | NPE attributes updated. PE unchanged. |
| Save | Client (NF) → Server (MF) | NPE data sent to MF → MF copies to PE → Commit |
| Cancel | Client (NF) | NPE discarded. PE unchanged. No server call. |
| After save | Client (auto) | Server syncs committed PE to client. DG2 refreshes. |

### Why Filter is Preserved

```
Before edit:
  FilterContext NPE: Category=Electronics, Supplier=All, Date=empty
  DG2 shows: Electronics products only

During edit:
  EditProxy NPE created (new NPE, separate object)
  FilterContext NPE: UNCHANGED (Category still = Electronics)

After save:
  EditProxy NPE: discarded (popup closed)
  FilterContext NPE: STILL UNCHANGED
  DG2 re-fetches with same filter → shows Electronics products
  Updated product appears in list (if still matches filter)
```

---

## 6. Pattern 5: Create Product

### Sequence: User click Create → Fill → Create New

Giống Pattern 4, ngoại trừ:

| Difference | Edit | Create |
|-----------|------|--------|
| NPE initial state | Pre-filled từ PE | Empty (defaults) |
| Category pre-fill | From product | **From filter context** |
| MF called | `ACT_Product_SaveEdit` | `ACT_Product_CreateNew` |
| MF creates PE | ❌ (update existing) | ✅ (create new) |
| Product code | Keep existing | Auto-generate (Java Action) |
| Filter after | Preserved | Preserved (new product appears if matches filter) |

### Category Pre-fill Logic

```
NF_Product_OpenCreatePopup:
  1. Create EditProxy (empty NPE)
  2. EditProxy/EditProxy_Category = FilterContext/FilterContext_Category
     ↑ PRE-FILL from current filter!
  3. Show popup

Result: If user was filtering by "Electronics" →
        New product popup has "Electronics" pre-selected in Category dropdown
```

---

## 7. Pattern 6: Import Data

### Sequence: Admin import seed data via REST

```
Admin              cURL                  Mendix REST          Database
  │                  │                    Endpoint              │
  │                  │                    │                     │
  │ Step 1: Import Categories             │                     │
  │──────────────────│                    │                     │
  │                  │ POST /rest/v1/     │                     │
  │                  │ import-categories  │                     │
  │                  │───────────────────→│                     │
  │                  │                    │                     │
  │                  │                    │ MF: ACT_Import_    │
  │                  │                    │ Categories          │
  │                  │                    │────────────────────→│
  │                  │                    │ 10 Category rows    │
  │                  │                    │ committed           │
  │                  │                    │←────────────────────│
  │                  │←───────────────────│ 201 OK              │
  │                  │                    │                     │
  │ Step 2: Import Suppliers              │                     │
  │──────────────────│                    │                     │
  │                  │ POST /rest/v1/     │                     │
  │                  │ import-suppliers   │                     │
  │                  │───────────────────→│                     │
  │                  │                    │────────────────────→│
  │                  │                    │ 15 Supplier rows    │
  │                  │                    │←────────────────────│
  │                  │←───────────────────│ 201 OK              │
  │                  │                    │                     │
  │ Step 3: Import Products + Variants    │                     │
  │──────────────────│                    │                     │
  │                  │ POST /rest/v1/     │                     │
  │                  │ import-products    │                     │
  │                  │───────────────────→│                     │
  │                  │                    │ MF: ACT_Import_    │
  │                  │                    │ Products            │
  │                  │                    │                     │
  │                  │                    │ For each product:   │
  │                  │                    │ 1. Lookup Category  │
  │                  │                    │    by name          │
  │                  │                    │ 2. Lookup Supplier  │
  │                  │                    │    by code          │
  │                  │                    │ 3. Create Product   │
  │                  │                    │ 4. Create Variants  │
  │                  │                    │ 5. Set associations │
  │                  │                    │ 6. Commit all       │
  │                  │                    │────────────────────→│
  │                  │                    │ 116 Products +      │
  │                  │                    │ 385 Variants        │
  │                  │                    │←────────────────────│
  │                  │←───────────────────│ 201 OK              │
  │                  │                    │                     │
```

---

## 8. Complete Sequence Diagrams

### 8.1 Full User Journey: Open → Filter → Edit → Create

```
Time →

Browser                              Server              Database
  │                                    │                   │
  │ 1. Open Product List page          │                   │
  │──────────────────────────────────→ │                   │
  │   NF_Page_Initialize (create NPE) │                   │
  │   DS_Product_GetFilteredList ─────→│──Retrieve all──→  │
  │←──DG2 renders 116 products──────←──│←──List of PE─────│
  │                                    │                   │
  │ 2. Select Category "Electronics"   │                   │
  │──────────────────────────────────→ │                   │
  │   NPE association updated          │                   │
  │   DS_Product_GetFilteredList ─────→│──Retrieve──────→  │
  │     XPath: [Category=Electronics]  │  filtered         │
  │←──DG2 renders 12 products───────←──│←──Filtered list──│
  │                                    │                   │
  │ 3. Click "Edit" on product #3      │                   │
  │──────────────────────────────────→ │                   │
  │   NF_Product_OpenEditPopup         │                   │
  │     Create EditProxy NPE           │                   │
  │     Copy PE→NPE                    │                   │
  │←──Popup opens with data──────────  │                   │
  │                                    │                   │
  │ 4. User edits name, clicks Save    │                   │
  │──────────────────────────────────→ │                   │
  │   NF_Product_SaveEdit              │                   │
  │     Call: ACT_Product_SaveEdit ───→│                   │
  │                                    │──Retrieve PE──→   │
  │                                    │←──Product obj────│
  │                                    │ Copy NPE→PE       │
  │                                    │──Commit──────────→│
  │                                    │←──Committed──────│
  │←──Popup closes, DG2 refreshes───←──│                   │
  │   Filter STILL: Electronics        │                   │
  │                                    │                   │
  │ 5. Click "Create New Product"      │                   │
  │──────────────────────────────────→ │                   │
  │   NF_Product_OpenCreatePopup       │                   │
  │     Create empty EditProxy         │                   │
  │     Pre-fill category=Electronics  │                   │
  │←──Popup opens (empty form)───────  │                   │
  │                                    │                   │
  │ 6. User fills form, clicks Create  │                   │
  │──────────────────────────────────→ │                   │
  │   NF_Product_SaveCreate            │                   │
  │     Call: ACT_Product_CreateNew ──→│                   │
  │                                    │ JA_GenerateCode──→│
  │                                    │←──"PRD-xxx"──────│
  │                                    │ Create PE object  │
  │                                    │──Commit──────────→│
  │                                    │←──Committed──────│
  │←──Popup closes, DG2 refreshes───←──│                   │
  │   New product appears in list      │                   │
  │   Filter STILL: Electronics        │                   │
  │                                    │                   │
```

### 8.2 Data Objects Lifecycle

```
                    Browser Memory              Server Database
                    (session-scoped)            (persistent)

ProductFilterContext ────────┐
  (NPE)                     │ Created on page load
  │ .FilterContext_Category  │ Modified on filter change
  │ .FilterContext_Supplier  │ Modified on filter change
  │ .dateFrom                │ Modified on filter change
  │ .dateTo                  │ Modified on filter change
  └────────────── Discarded on page unload

ProductEditProxy ───────────┐
  (NPE)                     │ Created on popup open
  │ .targetProductId         │ Set on edit (has value)
  │ .productName             │ Set from PE or user input
  │ .EditProxy_Category      │ Set from PE or filter
  └────────────── Discarded on popup close

Product ────────────────────┐
  (PE)                      │ Exists in DB
  │ .productCode             │ Modified via MF commit
  │ .status                  │ Toggled via MF commit
  │ .updatedDate             │ Auto-updated in MF
  └────────────── Persists across sessions

ProductVariant ─────────────┐
  (PE)                      │ Exists in DB
  │ .remainingQuantity       │ Read via calculated attr
  │ .variantName             │ Read for TopVariantName
  └────────────── Persists across sessions
```

---

## Tổng kết

- ✅ 6 complete data flow patterns with sequence diagrams
- ✅ Page Load → NPE init → DG2 data fetch
- ✅ Filter Change → NPE update → auto-refresh
- ✅ Toggle → Direct PE mutation via MF
- ✅ Edit → NPE proxy → MF save → auto-sync
- ✅ Create → NPE proxy → MF create + Java Action → auto-sync
- ✅ Import → REST → Import Mapping → DB commit
- ✅ Full user journey sequence diagram
- ✅ Data objects lifecycle (NPE vs PE)

**Tiếp theo:** [14-build-and-test.md](14-build-and-test.md) — Full Build, Integration Testing & Debugging
