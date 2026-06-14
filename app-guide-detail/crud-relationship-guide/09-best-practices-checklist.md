# 09 — Best Practices & Testing Checklist

Everything in one place: naming, security, performance, and a checklist you can run through before shipping. Cross-references the official [Best Practices for Development](https://docs.mendix.com/refguide10/dev-best-practices/).

## Table of contents

1. [Naming conventions](#1-naming-conventions)
2. [Module structure & layering](#2-module-structure--layering)
3. [Security & access rules](#3-security--access-rules)
4. [Performance](#4-performance)
5. [Transaction & commit discipline](#5-transaction--commit-discipline)
6. [Validation & error handling](#6-validation--error-handling)
7. [Data-modeling decisions recap](#7-data-modeling-decisions-recap)
8. [Testing checklist](#8-testing-checklist)
9. [Common consistency errors](#9-common-consistency-errors)
10. [Further reading](#10-further-reading)

---

## 1. Naming conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Module | PascalCase | `ECommerce` |
| Entity | PascalCase, singular | `Product`, `OrderItem` |
| Attribute | camelCase | `productName`, `unitPrice` |
| Boolean flag | `is*` / `has*` | `isActive`, `hasShipped` |
| Association | `{Parent}_{Child}` | `Category_Product`, `Order_OrderItem` |
| Self-association | `{Entity}_{Entity}` with parent/child ends | `Category_Category` |
| Enumeration | PascalCase; values PascalCase | `OrderStatus` → `Pending` |
| Microflow | `ACT_{Entity}_{Action}` | `ACT_Order_CreateWithItems` |
| Data-source microflow | `DS_{Entity}_{Purpose}` | `DS_Category_Subtree` |
| Nanoflow | `NF_{Entity}_{Action}` | `NF_Order_RefreshTotal` |
| Page | `{Entity}_{Purpose}` | `Order_Detail`, `Product_EditPopup` |

---

## 2. Module structure & layering

Keep logic in **microflows** (server-side: DB, integration, validation) and reserve **nanoflows** for client-only concerns (UI state, offline). Group by domain:

```
ECommerce/
├── Domain Model            (entities, enums, associations)
├── pages/                  (UI)
├── microflows/
│   ├── actions/  ACT_*     (CRUD entry points)
│   ├── datasources/ DS_*   (page/grid sources)
│   └── helpers/   SUB_*    (reusable sub-flows, e.g. code generation)
└── resources/              (Java actions if any)
```

> 📖 [Extracting and Using Sub-Microflows](https://docs.mendix.com/refguide10/extracting-and-using-sub-microflows/) — factor reusable logic (e.g. `SUB_Order_ComputeTotal`) out of `ACT_*` flows.

---

## 3. Security & access rules

Move from demo security to **Production** before go-live:

1. **App Security** → Production level.
2. **User roles**: define `Customer`, `Admin`, `Planner` (etc.). Map to module roles.
3. **Access rules per entity** — least privilege:
   - `Customer`: **read** `Order` where `[ECommerce.User_Order = '[%CurrentUser%]']`; read/write their own `OrderItem`s; **read** catalog (`Product`, `ProductVariant`, `Category`).
   - `Admin`: full read/write.
   - Tick the **associations** each role is allowed to traverse — access rules cover associations, not just attributes.
4. **Unique** + **required** validations stay declared on attributes (enforced regardless of role).

> 📖 [Access Rules](https://docs.mendix.com/refguide10/access-rules/) · [Define Access Rules Using XPath](https://docs.mendix.com/refguide10/define-access-rules-using-xpath/) · [Best Practices for App Security](https://docs.mendix.com/howto10/security/best-practices-for-app-security/)

---

## 4. Performance

| Practice | Why |
|----------|-----|
| **Index** filter/sort attributes | `productCode`, `sku`, `orderNumber`, `orderStatus`, FK-backed lookups. 📖 [Indexes](https://docs.mendix.com/refguide10/indexes/) |
| **Push filters into XPath** | Let the DB filter; avoid retrieve-all-then-filter in microflow. |
| **Use OQL** for reporting | Set-based, multi-table, one round-trip. ([ch. 04](04-read-operations.md)) |
| **Commit lists, not loops** | One `Commit Object(s)` on a list beats N commits. |
| **Denormalize hot reads** | Cache `categoryName`, materialized category path. ([ch. 07](07-advanced-relationship-patterns.md)) |
| **Limit retrieved columns/objects** | Don't load entire graphs you won't use. |
| **Retrieve scope** | Default DB scope; use "first"/single where you expect one. |

> 📖 [Best Practices for App Performance](https://docs.mendix.com/refguide10/best-practices-for-app-performance/) · [Detect and Resolve Performance Issues](https://docs.mendix.com/refguide10/detect-and-resolve-performance-issues/)

---

## 5. Transaction & commit discipline

- **One microflow = one transaction.** Build the graph in memory (Create Object with Commit off), validate, then commit once. ([ch. 03 §7](03-create-operations.md#7-pattern-e--create-a-full-object-graph-order--items--shipping))
- **Never commit half a graph.** If validation fails mid-flow, throw (or Rollback) — don't persist partial data.
- **Avoid committing inside loops** when you can commit the list after.
- **Auto-commit beware:** some widgets auto-commit on focus loss. Use **NPE proxies** for edits ([ch. 08 §7](08-pages-and-ui-for-relationships.md#7-popup-createedit-forms-npe-proxy-pattern)) so nothing persists until Save.

> 📖 [Objects and Caching](https://docs.mendix.com/refguide10/objects-and-caching/) · [Synchronization & Auto-Committed Objects](https://docs.mendix.com/refguide10/synchronization-auto-committed-objects/)

---

## 6. Validation & error handling

- Declare **required**, **unique**, **range**, **regex** validations on attributes — the runtime enforces them on commit and in the UI.
- Add **business rules** in microflows with Exclusive Splits **before** commit (stock, status transitions, price ≥ 0).
- For **blocked deletes** (referential integrity), pre-check with `count()` and show a friendly message; provide **error handlers** as a fallback. ([ch. 06 §5](06-delete-operations.md#5-pattern-c--referential-block-user-with-orders))
- Make validation messages **translatable**. 📖 [Using Translatable Validation Messages](https://docs.mendix.com/refguide10/using-translatable-validation-messages/)

---

## 7. Data-modeling decisions recap

| Decision | Recommendation |
|----------|----------------|
| M:N with attributes | Model as a **junction entity** (`OrderItem`), not a bare M:N association. |
| Ownership (one-to-many) | Owner = **child** (the `*` side stores the FK). |
| Cascade delete | Only for true composition (`Product→Variant`, `Order→Item`). |
| Referential block | For master data referenced by history (`User→Order`, `ProductVariant→OrderItem`). |
| Self-reference delete | Keep on-delete = **Keep**; delete trees explicitly. |
| Business-data deletion | Prefer **soft delete** (`isActive=false`) over hard delete. |
| Frozen snapshots | Copy volatile data (`unitPrice`) onto the junction at create time. |

---

## 8. Testing checklist

Work through per entity, then per relationship.

### Per entity (CRUD)
- [ ] **Create** — required/unique validations fire; defaults applied; generated codes unique.
- [ ] **Read** — list page loads; detail page shows all attributes; access rules restrict correctly per role.
- [ ] **Update** — changes persist; `updatedDate` set; uniqueness re-validated; frozen fields untouched.
- [ ] **Delete** — soft-delete hides row; hard-delete respects on-delete behavior.

### Per relationship (this guide's focus)
- [ ] `Category_Category` — create sub-category under parent; re-parent; recursive subtree retrieval; recursive delete guarded by product check.
- [ ] `Category_Product` / `Supplier_Product` — create product with both refs; reassign category/supplier; delete category keeps products (orphaned or reassigned).
- [ ] `Product_ProductVariant` — create variants; **delete product cascades to variants**; deleting variant **blocked** if referenced by OrderItems.
- [ ] `User_Order` — create order for a customer; **deleting a user with orders is blocked** with the configured message; customer-only sees own orders (access rule).
- [ ] `Order_OrderItem` — **delete order cascades items**; order total recomputes on add/remove item.
- [ ] `OrderItem_ProductVariant` — line item points to variant; `unitPrice` frozen after variant price changes; stock restored on order delete/cancel.
- [ ] `Order_Shipping` — shipments listed per order; deleting order keeps shipment history.

### Concurrency & transactions
- [ ] Two simultaneous orders on the last stock unit → only one succeeds.
- [ ] Order-graph creation fails on stock shortage → **nothing** persisted (rollback verified).
- [ ] Block-delete error is surfaced to the user, not a stack trace.

### Performance smoke
- [ ] Category subtree fetch uses denormalized path (no deep recursion).
- [ ] Report pages use OQL, not retrieve-and-loop.
- [ ] Filtered columns are indexed.

---

## 9. Common consistency errors

| Error | Cause / Fix |
|-------|-------------|
| *"Association owner is not allowed..."* | Owner set on the wrong end — flip it in association properties. |
| *"Object of type X has no access rule for Y"* (production) | Add a read access rule for the user's module role. |
| *"Value of required attribute is empty"* on commit | A required attribute wasn't set in Create Object. |
| *"Delete object failed: associated objects exist"* | A **Delete only if no associated** association blocked it — pre-check or reassign. |
| Uniqueness violation on generated code | Code already exists; regenerate or use a robust sequence. |
| Popup changes persist on Cancel | You bound the form to a **persistent** entity; switch to an **NPE proxy**. |

---

## 10. Further reading

**Official docs (v10):**
- [Development Best Practices](https://docs.mendix.com/refguide10/dev-best-practices/)
- [Domain Model](https://docs.mendix.com/refguide10/domain-model/) · [Associations](https://docs.mendix.com/refguide10/associations/) · [Association Properties](https://docs.mendix.com/refguide10/association-properties/)
- [Querying Over Self-References](https://docs.mendix.com/refguide10/querying-over-self-references/)
- [Object Activities](https://docs.mendix.com/refguide10/object-activities/) · [Microflows](https://docs.mendix.com/refguide10/microflows/)
- [OQL v2](https://docs.mendix.com/refguide10/oql-v2/)
- [Denormalize Data to Improve Performance](https://docs.mendix.com/howto10/data-models/denormalize-data-to-improve-performance/)
- [Best Practices for App Security](https://docs.mendix.com/howto10/security/best-practices-for-app-security/)

**In this repo:**
- Reference relational schema: [`planning-db-design/schema.prisma`](../../planning-db-design/schema.prisma), [`planning-db-design/README.md`](../../planning-db-design/README.md)
- Product/Category/Supplier/Variant model & NPE patterns: [`frontend-state-management/`](../frontend-state-management/)
- OQL deep dive: [`oql-guide/`](../oql-guide/)

---

✅ **End of guide.** You've modeled and CRUD'd every relationship pattern Mendix offers: 1:N, self-referencing trees, M:N-via-junction, with cascade / block / keep delete semantics — across a realistic e-commerce domain.
