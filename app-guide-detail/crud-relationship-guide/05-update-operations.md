# 05 — UPDATE Operations (Change Data & Reassign Relationships)

Updating is two skills: changing **attributes**, and **reassigning associations** (the relationship-focused part). Both use the **Change Object** activity, and both must be **committed**.

## Table of contents

1. [Change Object & commit](#1-change-object--commit)
2. [Changing attributes](#2-changing-attributes)
3. [Reassigning a reference association](#3-reassigning-a-reference-association)
4. [Reassigning a self-reference (move category)](#4-reassigning-a-self-reference-move-category)
5. [Reassigning a reference set (collection)](#5-reassigning-a-reference-set-collection)
6. [Bulk update across a list](#6-bulk-update-across-a-list)
7. [Validation on update](#7-validation-on-update)
8. [Don't overwrite frozen data (OrderItem.unitPrice)](#8-dont-overwrite-frozen-data-orderitemunitprice)
9. [Undo before commit: Rollback](#9-undo-before-commit-rollback)
10. [Audit & updatedDate pattern](#10-audit--updateddate-pattern)

---

## 1. Change Object & commit

| Activity | What it does |
|----------|--------------|
| **Change Object** | Modifies attributes and/or associations of an **existing** object **in memory**. Has a **Commit** checkbox (persist immediately) and **Refresh in client**. |
| **Commit Object(s)** | Persists the changed object(s). Use when you batch several changes and commit once. |
| **Rollback Object** | Discards **uncommitted** changes to an object (reverts to its last committed state). |

Same transaction rule as [ch. 03 §2](03-create-operations.md#2-how-mendix-commits--transactions): one microflow = one transaction; multiple changes + one commit are atomic.

> 📖 [Change Object](https://docs.mendix.com/refguide10/change-object/) · [Rollback Object](https://docs.mendix.com/refguide10/rollback-object/)

---

## 2. Changing attributes

**Microflow `ACT_Product_UpdatePrice`**, parameters: `product` (Product), `newPrice` (Decimal):

1. **Change Object** `$product`
   - Commit: ☑
   - Attributes: `basePrice = $newPrice`, `updatedDate = [%CurrentDateTime%]`
2. **End**.

> If several fields change and you want one atomic commit, set Commit: ☐ on each Change and add a single **Commit Object(s)** `$product` at the end.

---

## 3. Reassigning a reference association

This is the heart of relationship updates. **Move a Product to a different Category and Supplier.**

**Microflow `ACT_Product_Reassign`**, parameters: `product` (Product), `newCategory` (Category), `newSupplier` (Supplier):

1. **Change Object** `$product`
   - Commit: ☑, Refresh in client ☑
   - Associations:
     - `Product.Category_Product (Category)` = `$newCategory` ← rewrites the FK
     - `Product.Supplier_Product (Supplier)` = `$newSupplier`

   ```
   oldCategory ◄── was ── Product ── was ──► oldSupplier
                               │ Change Object sets both to new parents
                               ▼
   newCategory ◄── now ── Product ── now ──► newSupplier
   ```

2. **End** → return `$product`.

**Reassign an Order's customer** (e.g., merge accounts): identical pattern — **Change Object** `$order`, set `Order.User_Order (User)` = `$newUser`.

**Change which variant an OrderItem points to**: **Change Object** `$orderItem`, set `OrderItem.OrderItem_ProductVariant` = `$otherVariant`. (Remember `unitPrice` is frozen — see §8.)

> Set the association from the **owner** side (the child). Reading from the old parent afterwards correctly shows the object gone from its old collection and present in the new one.

---

## 4. Reassigning a self-reference (move category)

Move a `Category` to a new parent (re-parent within the tree).

**Microflow `ACT_Category_Move`**, parameters: `category` (Category), `newParent` (Category):

1. **Guard against cycles** — an **Exclusive Split**:
   `if $newParent != $category and $newParent != empty then ... else` → throw "Invalid parent".
   - *(Optionally prevent moving a category under its own descendant — walk the subtree first per [ch. 04 §5](04-read-operations.md#5-walking-the-recursive-category-tree) and check membership.)*
2. **Change Object** `$category`
   - Commit: ☑
   - From the **child** end of `Category_Category` → set to `$newParent`.
3. **End**.

```
Before:  A ── child ── B ── child ── C
After moving C under A:   A ── child ── C
                          A ── child ── B   (B still child of A)
```

---

## 5. Reassigning a reference set (collection)

For a parent that owns a *collection* (one-to-many read from the parent side, or a true many-to-many), use **Change Object** on the parent with **Add / Remove** operations:

- **Add** a variant to a product's collection: from the product, **Change Object** → Associations → `Product.Product_ProductVariant` → operation **Add** → `$variantList`.
- **Remove**: operation **Remove**.

> In our model the variant owns the FK (`Product_ProductVariant` owner = `ProductVariant`), so the cleaner way to attach a variant to a product is to set `ProductVariant.Product_ProductVariant` on the **variant** (Pattern B in ch. 03). Use parent-side add/remove only when the parent is genuinely the owner.

---

## 6. Bulk update across a list

"Mark all of a supplier's inactive products as archived / deactivate them."

**Microflow `ACT_Product_BulkDeactivate`**, parameter: `supplier` (Supplier):

1. **Retrieve** `ECommerce.Product` where `[ECommerce.Supplier_Product = $supplier][isActive = true]` → `$products`.
2. **Loop** over `$products` (iterator `$p`):
   - **Change Object** `$p` → `isActive = false`, `updatedDate = [%CurrentDateTime%]` (Commit: ☐).
3. **Commit Object(s)** `$products` (the whole changed list — one DB round-trip) — Refresh in client ☑.
4. **End**.

> Committing a **list** is one operation; doing it once after the loop beats committing inside the loop (N round-trips).

---

## 7. Validation on update

Re-validate just like on create, **before** commit:

- **Exclusive Split** on business rules: `basePrice >= 0`, `quantity > 0`, etc.
- **Uniqueness** is still enforced — e.g. changing `Product.productCode` to a value another product uses throws on commit. Catch and show.
- **Cross-field rules**: e.g. an `Order` can't move from `Paid` back to `Pending` — check `if $order/orderStatus = Paid and $newStatus = Pending then throw`.

---

## 8. Don't overwrite frozen data (OrderItem.unitPrice)

`OrderItem.unitPrice` is a **snapshot** of the variant's price at order time (ch. 03 §6). A common bug: an "update variant price" flow accidentally recomputes historical `OrderItem.unitPrice`. **Never** do:

```
❌  Change OrderItem.unitPrice = OrderItem.ProductVariant.price
```

Historical line items must stay frozen. If you must support price corrections, add a **manual** `priceAdjustment` field and recompute `lineTotal` explicitly — never re-pull from the live variant.

---

## 9. Undo before commit: Rollback

If a flow builds changes on an object but then hits a validation failure, **Rollback Object** restores it to its last committed state (within the same session, before commit):

```
Retrieve $order (committed)
Change $order/orderStatus = Cancelled
Exclusive Split: "allowed?" ── no ──► Rollback Object $order  (reverts to Paid)
                              ── yes ─► Commit $order
```

Useful for edit popups: let the user edit a non-persistent **proxy** ([ch. 08](08-pages-and-ui-for-relationships.md)); on Cancel you simply discard the NPE — no rollback needed.

---

## 10. Audit & updatedDate pattern

For traceability, on every update:

- Set `updatedDate = [%CurrentDateTime%]` (entities that need it: `Product`, `Category`, `Supplier`, `User`).
- Optionally write an **AuditLog** row: who changed what, before/after. The reference relational design ([`planning-db-design/schema.prisma`](../../planning-db-design/schema.prisma), `audit_logs`) models exactly this. In Mendix, add an `AuditLog` entity associated to `User` and create a row inside each update microflow — or centralize via **event handlers** (Before/After Commit) so every entity is covered automatically. See [ch. 07](07-advanced-relationship-patterns.md).

> 📖 [Event Handlers](https://docs.mendix.com/refguide10/event-handlers/)

**Next:** [06-delete-operations.md](06-delete-operations.md) — configure cascade / block / keep and delete safely.
