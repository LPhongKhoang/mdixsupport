# 14 - Build, Integration Testing & Debugging Guide

## Mục lục

1. [Build Order — Thứ tự triển khai](#1-build-order)
2. [Integration Testing Checklist](#2-integration-testing-checklist)
3. [Common Runtime Errors & Fixes](#3-common-runtime-errors)
4. [Performance Tuning](#4-performance-tuning)
5. [Debugging Techniques](#5-debugging-techniques)

---

## 1. Build Order

### Phase 1: Domain Model (30 min)

```
1.1  Tạo module ProductManagement
1.2  Tạo 4 PE: Category, Supplier, Product, ProductVariant
1.3  Tạo 2 NPE: ProductFilterContext, ProductEditProxy
1.4  Tạo Enum: ProductStatus
1.5  Tạo 6 Associations (3 PE-PE + 3 NPE-PE)
1.6  Set delete behavior cho associations
1.7  Add validation rules
1.8  Configure module security
1.9  ✓ F5 → Run → Verify no compile errors
```

### Phase 2: Java Action (15 min)

```
2.1  Tạo JA_GenerateProductCode
2.2  Generate Java template
2.3  Implement Java code
2.4  ✓ Deploy for Eclipse → Verify compile
```

### Phase 3: Microflows (45 min)

```
3.1  CAL_Product_TopVariantName (calculated attribute)
3.2  DS_Product_GetFilteredList (datasource)
3.3  ACT_Product_ToggleStatus
3.4  ACT_Product_SaveEdit
3.5  ACT_Product_CreateNew
3.6  ACT_Product_DeleteProduct
3.7  MLK_Category_ByName + MLK_Supplier_ByCode
3.8  ✓ F5 → Run → Verify no errors
```

### Phase 4: Nanoflows (30 min)

```
4.1  NF_Page_Initialize
4.2  NF_Filter_ResetFilter
4.3  NF_Product_ToggleStatus
4.4  NF_Product_OpenEditPopup
4.5  NF_Product_OpenCreatePopup
4.6  NF_Product_SaveEdit
4.7  NF_Product_SaveCreate
```

### Phase 5: Pages (45 min)

```
5.1  Product_List (main page)
     - Data View (NPE context)
     - Filter bar (Reference Selectors, DatePickers)
     - Data Grid 2 (12 columns + action buttons)
5.2  Product_EditPopup
5.3  Product_CreatePopup
5.4  Product_Detail (placeholder)
5.5  Add navigation menu entry
```

### Phase 6: Seed Data (15 min)

```
6.1  Tạo JSON Structures (JS_Category, JS_Supplier, JS_Product)
6.2  Tạo Import Mappings (IM_Category, IM_Supplier, IM_Product)
6.3  Tạo Import Microflows (ACT_Import_*)
6.4  Tạo Published REST Service (optional)
6.5  Import seed data
```

### Phase 7: Test & Fix (30 min)

```
7.1  Run integration tests (checklist below)
7.2  Fix issues
7.3  Performance test
7.4  ✓ Deploy
```

**Total estimated time: ~3.5 hours**

---

## 2. Integration Testing Checklist

### 2.1 Domain Model

- [ ] Module `ProductManagement` visible in Project Explorer
- [ ] 4 PE entities có viền xanh trong Domain Model editor
- [ ] 2 NPE entities có viền cam trong Domain Model
- [ ] 6 associations hiển thị đúng (kiểm tra type, owner)
- [ ] `Product.status` attribute type = `ProductStatus` enum
- [ ] `calculated_TopVariantName` hiển thị calculated icon
- [ ] No validation errors trong Domain Model

### 2.2 Security

- [ ] Module security enabled
- [ ] User role có access: Read/Write all PE attributes
- [ ] App security level = **Production** (hoặc **Prototype** cho dev)
- [ ] Test with non-admin user → can see/edit products

### 2.3 Seed Data Import

- [ ] Import categories → 10 rows trong DB
- [ ] Import suppliers → 15 rows trong DB
- [ ] Import products → 116 products + 385 variants
- [ ] Verify: Product → Category association set correctly
- [ ] Verify: Product → Supplier association set correctly
- [ ] Verify: ProductVariant → Product association set correctly

### 2.4 Product List Page

**Page Load:**
- [ ] Page opens without error
- [ ] FilterContext NPE created (check via debug breakpoint)
- [ ] Data Grid 2 shows products with all 12 columns
- [ ] Row numbers correct (1, 2, 3...)
- [ ] Top Variant column shows variant names (not "—" for products with variants)
- [ ] Products with no variants show "—"
- [ ] Currency format on Min/Max Price columns
- [ ] Date format on Created/Updated columns
- [ ] Status badges: green for Active, red for Inactive
- [ ] Inactive rows have reduced opacity
- [ ] Pagination works (20 per page)

**Filter Bar:**
- [ ] Category dropdown shows 10 categories
- [ ] Supplier dropdown shows 14 active suppliers
- [ ] Select Category → Grid filters correctly
- [ ] Select Supplier → Grid filters correctly
- [ ] Set Date From → Grid filters correctly
- [ ] Set Date To → Grid filters correctly
- [ ] Combined filters work together
- [ ] Reset Filter → clears all → shows all products
- [ ] After reset, dropdowns show "-- All --"

### 2.5 Toggle Status

- [ ] "Deactivate" button visible for Active products
- [ ] "Activate" button visible for Inactive products
- [ ] Click Toggle → Status changes in database
- [ ] Click Toggle → Status badge updates immediately
- [ ] Click Toggle → Button visibility swaps
- [ ] Click Toggle → Row styling updates
- [ ] Toggle same product twice → returns to original state
- [ ] Toggle multiple products independently

### 2.6 View Detail

- [ ] Click "View" → Opens detail page
- [ ] Detail page shows product data
- [ ] Close detail → Returns to list
- [ ] Filter state preserved after viewing detail

### 2.7 Quick Edit

- [ ] Click "Edit" → Opens popup
- [ ] Popup shows pre-filled data from product
- [ ] Product Name field editable
- [ ] Category dropdown shows current category selected
- [ ] Description field editable
- [ ] Min Price / Max Price fields editable
- [ ] Quick Note field editable

**Save:**
- [ ] Click "Save" → Data saves to database
- [ ] Click "Save" → Popup closes
- [ ] Click "Save" → Grid refreshes with updated data
- [ ] Click "Save" → Filter state preserved
- [ ] updatedDate updated
- [ ] changedBy updated

**Cancel:**
- [ ] Click "Cancel" → Popup closes
- [ ] Click "Cancel" → No data changed in DB
- [ ] Click "Cancel" → Grid unchanged

**Validation:**
- [ ] Empty name → validation error
- [ ] Negative price → validation error
- [ ] Min price > Max price → validation error

### 2.8 Create Product

- [ ] Click "Create New" → Opens empty popup
- [ ] Category pre-filled from current filter
- [ ] Fill all required fields → Click "Create New"
- [ ] Product created in DB with auto-generated code
- [ ] Popup closes
- [ ] Grid refreshes → New product visible
- [ ] Filter state preserved
- [ ] New product matches filter conditions

**Cancel:**
- [ ] Click "Cancel" → Popup closes
- [ ] Nothing created in DB

### 2.9 Edge Cases

- [ ] Empty state: Delete all products → "No products found" message
- [ ] Filter returns 0 results → "No products found"
- [ ] Product with no category → Category column empty
- [ ] Product with no supplier → Supplier column empty
- [ ] Browser refresh (F5) → Page re-initializes, filters reset
- [ ] Rapid toggle clicks → No errors, last state wins
- [ ] Very long product name → Truncated in grid, full in popup
- [ ] Special characters in name → Handled correctly

---

## 3. Common Runtime Errors & Fixes

### Error 1: "Object of type ProductFilterContext was not found"

**Cause:** NPE Data View data source returns empty instead of creating new NPE.

**Fix:** Verify `NF_Page_Initialize` returns `ProductFilterContext` (not void). Ensure **Create Object** activity creates NPE correctly.

### Error 2: "No read access on entity ProductManagement.Product"

**Cause:** Module security not configured.

**Fix:** Open Domain Model → Right-click entity → **Access rules** → Add rule for User role → Enable Read.

### Error 3: "Association 'Product_Category' is empty" in Data Grid

**Cause:** Product created without setting Category association.

**Fix:** In import microflow or create microflow, ensure association is set:
```
$Product/Product_Category = $CategoryObject
```

### Error 4: Calculated attribute always returns "—"

**Cause:** ProductVariant association path wrong in calculated microflow.

**Fix:** Verify XPath in Retrieve:
```
[ProductManagement.ProductVariant_Product = $Product]
```
Ensure association name matches exactly (case-sensitive).

### Error 5: Data Grid 2 doesn't refresh after edit

**Cause:** Auto-sync not triggering.

**Fix Options:**
1. In Nanoflow, after Microflow call → add **Refresh in client** activity on Product object
2. In Microflow, ensure **Commit** (not just Change Object) is called
3. Check Data Grid 2 → Properties → **Refresh on context change** = enabled

### Error 6: "Type mismatch: cannot convert String to GUID"

**Cause:** `targetProductId` attribute is String, but XPath comparison with `id` expects GUID.

**Fix:** Change `targetProductId` attribute type from **String** to **GUID** (Mendix auto-convertible type). Or use `toGUID()` function in XPath.

### Error 7: Reference Selector shows empty dropdown

**Cause:** NPE-PE association not set, or selectable objects XPath too restrictive.

**Fix:**
1. Verify association exists on domain model
2. Check Reference Selector → **Selectable objects** → Remove restrictive XPath
3. Ensure source entity has data in database

### Error 8: Java Action compile error

**Cause:** JDK version mismatch or API changes.

**Fix:**
1. Verify JDK 17 configured: **Project Settings** → **Runtime** → **JDK**
2. Clean build: **Project** → **Clean**
3. Regenerate Java template: Right-click Java Action → **Generate Java action template**

---

## 4. Performance Tuning

### 4.1 Calculated Attribute Optimization

**Issue:** `calculated_TopVariantName` fires N+1 queries.

**Solutions by dataset size:**

| Products | Approach | Performance |
|----------|----------|-------------|
| < 100 | Calculated attribute | ✅ Acceptable |
| 100-500 | OQL View Entity (file 10) | ✅ Good |
| > 500 | Java Action batch retrieve | ✅ Best |

**Implement caching (optional):**

Add attribute `cached_TopVariantName` (stored, String) trên Product. Update trong microflow mỗi khi ProductVariant thay đổi:

```
Microflow: ACT_ProductVariant_AfterCommit
  │
  ├── Retrieve Product (parent of variant)
  ├── Retrieve Top Variant (by remainingQuantity DESC)
  ├── Change: Product.cached_TopVariantName = TopVariant.variantName
  └── Commit Product
```

### 4.2 Microflow Datasource vs Database Datasource

| Aspect | Microflow DS | Database DS |
|--------|-------------|-------------|
| Paging | Client-side | **Server-side** ✅ |
| Sorting | Client-side | **Server-side** ✅ |
| Total data transfer | ALL rows | Only current page |
| Dynamic filter | ✅ Via NPE param | ❌ No NPE access |
| Recommended | Filtered lists | Static/URL-param lists |

**Tip:** For product list with filter → Microflow datasource (accept client-side paging tradeoff). For reports without dynamic filter → Database datasource with View Entity.

### 4.3 Index Recommendations

Add database indexes cho frequently queried columns:

1. **Product.status** — Toggle filter, conditional visibility
2. **Product.createdDate** — Default sort DESC
3. **ProductVariant.remainingQuantity** — Top variant calculation
4. **ProductVariant.sku** — Lookup by SKU

**How to add index in Mendix:**
1. Open Domain Model
2. Double-click entity → **Indexes** tab
3. Add index: select attributes → **OK**

---

## 5. Debugging Techniques

### 5.1 Microflow Debugging

**Built-in Debugger:**
1. Studio Pro → **View** → **Debug Panel**
2. Set breakpoint: Right-click activity → **Set Breakpoint**
3. Run app → Trigger microflow → Debugger pauses
4. Inspect variables, step through

### 5.2 Nanoflow Debugging

Nanoflows chạy trên client → không thể dùng Studio Pro debugger.

**Alternatives:**
1. **Log messages:** Add **Log** activity in nanoflow → View in Console
2. **Browser DevTools:** Open browser console (F12) → Check Mendix client logs
3. **Show Message:** Add **Show Message** activity để inspect variable values

### 5.3 NPE State Inspection

Kiểm tra NPE values tại runtime:

1. **Data View → Tooltip:** Hover over Data View → Shows current NPE attribute values
2. **Text widget debug:** Temporarily add text widgets showing NPE attributes
3. **Browser console:**
   ```javascript
   // Mendix Client API (in browser console)
   mx.data.get({ guid: "NPE_GUID", callback: function(obj) {
       console.log(obj.getJSON());
   }});
   ```

### 5.4 OQL Query Testing

Test OQL queries trước khi deploy:

1. Studio Pro → **View** → **OQL Query Window**
2. Paste OQL query
3. Click **Execute** → View results
4. Verify column names, data types, aggregation results

### 5.5 Network Traffic Inspection

Inspect FE↔BE communication:

1. Browser → **F12** → **Network** tab
2. Filter: `xhr` or `runtimeOperation`
3. Each Data Grid 2 refresh appears as a network request
4. Inspect request payload → See XPath constraints sent to server
5. Inspect response → See data returned

---

## Tổng kết

### Build Summary

| Phase | Time | Components |
|-------|------|-----------|
| Domain Model | 30 min | 6 entities, 1 enum, 6 associations |
| Java Action | 15 min | 1 Java Action |
| Microflows | 45 min | 8 microflows |
| Nanoflows | 30 min | 7 nanoflows |
| Pages | 45 min | 4 pages |
| Seed Data | 15 min | JSON structures, import mappings |
| Testing | 30 min | 50+ test cases |
| **Total** | **~3.5 hours** | **Full working app** |

### What You've Built

A complete **Product Management** module in Mendix v10.24.9 with:
- ✅ CRUD operations (Create, Read, Update, Delete)
- ✅ Dynamic filtering (Category, Supplier, Date Range)
- ✅ Filter state preservation across CRUD
- ✅ NPE Proxy Pattern for safe editing
- ✅ Toggle Active/Inactive with instant DB update
- ✅ OQL for aggregated data (Top Variant by Stock)
- ✅ Java Action for unique code generation
- ✅ 116 products + 385 variants seed data
- ✅ 50+ integration test cases

### Architecture Summary

```
Frontend (Client)                    Backend (Server)
├── Pages (4)                        ├── Microflows (8)
│   ├── Product_List                 │   ├── Datasources (1)
│   ├── Product_EditPopup            │   ├── Actions (4)
│   ├── Product_CreatePopup          │   ├── Lookups (2)
│   └── Product_Detail               │   └── Calculated (1)
├── Nanoflows (7)                    ├── Java Actions (1)
│   ├── Page (1)                     ├── OQL Queries (1)
│   ├── Filter (1)                   └── Import Mappings (3)
│   └── Actions (5)                      └── Seed Data (3 JSON files)
└── NPE Objects (2)
    ├── ProductFilterContext
    └── ProductEditProxy
```
