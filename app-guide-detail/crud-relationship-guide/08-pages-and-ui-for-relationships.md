# 08 — Pages & UI for Relationships

Every relationship in the model has a corresponding UI pattern. This chapter maps them so you can build forms that create, display, and edit related data cleanly.

## Table of contents

1. [Picking a parent on a form — Reference Selector](#1-picking-a-parent-on-a-form--reference-selector)
2. [Picking many — Reference Set Selector](#2-picking-many--reference-set-selector)
3. [Enumerations — Drop-down / Radio Buttons](#3-enumerations--drop-down--radio-buttons)
4. [Grids of related data — Association source](#4-grids-of-related-data--association-source)
5. [Nested Data Views on a detail page](#5-nested-data-views-on-a-detail-page)
6. [Master–detail with Listen to widget](#6-masterdetail-with-listen-to-widget)
7. [Popup create/edit forms (NPE proxy pattern)](#7-popup-createedit-forms-npe-proxy-pattern)
8. [Page wiring checklist](#8-page-wiring-checklist)

> 📖 [Input Elements](https://docs.mendix.com/refguide10/atom-designer/) → Reference Selector, Reference Set Selector, Drop-Down · [Data Containers](https://docs.mendix.com/refguide10/data-view/)

---

## 1. Picking a parent on a form — Reference Selector

On a **Product** edit form (a Data View over `Product`), to let the user pick the `Category` and `Supplier`:

1. Drop a **Reference Selector** for `Category_Product`.
   - **Selectable objects** = Database source `ECommerce.Category` (`[isActive = true]`), sorted by `categoryName`.
   - Display attribute: `categoryName`.
2. Drop another **Reference Selector** for `Supplier_Product`, source `ECommerce.Supplier`, display `supplierName`.

The widget writes the association (the FK) onto the `Product` when the page is saved — no microflow needed for the simple case.

> This is the UI equivalent of [ch. 03 Pattern B](03-create-operations.md#4-pattern-b--create-with-a-reference-product--category--supplier) and [ch. 05 reassign](05-update-operations.md#3-reassigning-a-reference-association).

---

## 2. Picking many — Reference Set Selector

For a **reference set** (many-to-many or a parent-owned collection), use **Reference Set Selector** (a two-pane pick list) or **Input Reference Set Selector** (type-ahead with multi-select). Example: assigning multiple tags/roles.

Our model has no bare many-to-many (we use `OrderItem` as a junction), so reference set selectors are rare here — but `Order → ProductVariant` *viewed as a multi-select* would be modeled with the junction `OrderItem`, not a reference set selector. **If a relationship carries data, it's a junction entity, not a reference set.**

---

## 3. Enumerations — Drop-down / Radio Buttons

Bind a **Drop-down** to an enumeration attribute (`Order.orderStatus`, `Shipping.shippingStatus`, `User.userRole`). The widget auto-populates from the enum values. You can constrain options with an XPath/attribute constraint if needed.

---

## 4. Grids of related data — Association source

On a **Category detail** page (Data View over `Category`), show all its products without writing XPath:

1. Add a **Data Grid** inside the Data View.
2. Data source = **Association** → `Category_Product` → `Product`.
3. Columns: `productCode`, `productName`, `basePrice`, `isActive`.

The grid automatically shows only products linked to the current category. Add a **New** button that creates a `Product` **in the context of** this category (the new product's `Category_Product` is pre-set — see §7).

> 📖 [Association Source](https://docs.mendix.com/refguide10/association-source/)

---

## 5. Nested Data Views on a detail page

An **Order detail** page composes several relationships with nested Data Views:

```
Data View (context: Order)
├── Text: orderNumber, orderDate, orderStatus (Drop-down)
├── Data View  ── Data source: Association  Order_User  ──► shows customer (userName, email)
├── Data Grid  ── Data source: Association  Order_OrderItem ──► line items
│       └── each row: quantity, unitPrice, lineTotal,
│                     + column over OrderItem_ProductVariant → sku / variantName
└── Data Grid  ── Data source: Association  Order_Shipping ──► shipments (tracking#, status)
```

- The **customer** Data View uses **Association source** on `Order_User` → displays the single related `User`.
- The **line items** grid uses **Association source** on `Order_OrderItem` → the list.
- A column can traverse one more hop (`OrderItem_ProductVariant/sku`) — that's a reference read from [ch. 04 §2](04-read-operations.md#2-reading-a-single-reference).

---

## 6. Master–detail with Listen to widget

For a browse-style layout: a **Data Grid** of Categories on the left, a **List View** of Products on the right that updates when you select a category.

1. Left: Data Grid `Category` (Database source).
2. Right: List View `Product`, Data source = **Listen to widget** → the Category grid.
3. Relationship: `Category_Product`.

No microflow — selection drives the list. 📖 [Listen to Widget Source](https://docs.mendix.com/refguide10/listen-to-widget-source/).

---

## 7. Popup create/edit forms (NPE proxy pattern)

For create/edit popups on related entities, the robust Mendix pattern is an **NPE proxy** (matches the repo's [frontend-state-management](../frontend-state-management/) guide):

1. **Non-persistent entity** `OrderEditProxy` mirrors the editable fields + holds associations (e.g. `OrderEditProxy.User_Order`, plus a list reference for items).
2. **Open the popup** with a Data View whose Data source is a **microflow** that creates the NPE and (for edit) copies the target Order's values into it.
3. User edits the **NPE** (safe — nothing is persisted until they click Save).
4. **Save button** calls `ACT_Order_SaveFromProxy`:
   - Validate the NPE fields.
   - Create/update the **persistent** `Order` (and children) from the NPE (ch. 03 Pattern E).
   - Commit. On error → keep the popup open and show validation feedback.
5. **Cancel** just closes the popup — no rollback needed (NPE is discarded).

> This avoids accidental auto-commits and gives you clean validation before any DB write. See [frontend-state-management/07-state-management-patterns.md](../frontend-state-management/07-state-management-patterns.md).

### Creating a child "in context"
A **New** button on the line-items grid should open an `OrderItem` edit popup whose context is the current `Order`. Use a Data View with **Data source = Create object**, association `Order_OrderItem` pre-linked to the page's Order — so the new item is already attached to the right order when saved.

---

## 8. Page wiring checklist

| Relationship | Widget / source |
|--------------|-----------------|
| Product → Category (pick one) | Reference Selector |
| Order → User (display parent) | Nested Data View, Association source |
| Category → Products (list children) | Data Grid, Association source |
| Order → OrderItems (list children) | Data Grid, Association source |
| OrderItem → ProductVariant (traverse) | Column over association path |
| Order.orderStatus | Drop-down (enumeration) |
| Browse products by category | Listen to widget source |
| Edit popup for Order | NPE proxy + Save microflow |

**Next:** [09-best-practices-checklist.md](09-best-practices-checklist.md) — naming, security, performance, and a full testing checklist.
