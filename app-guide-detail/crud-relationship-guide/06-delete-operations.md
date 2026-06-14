# 06 — DELETE Operations (Cascade, Block, and Safe Deletion)

Deleting is where the **on-delete behavior** you configured in [ch. 02](02-build-domain-model.md) actually fires. Get it wrong and you either **orphan data**, **cascade too aggressively**, or **crash on a blocked delete**. This chapter shows each pattern and how to handle the errors.

## Table of contents

1. [The Delete Object(s) activity](#1-the-delete-objects-activity)
2. [How on-delete behavior fires at runtime](#2-how-on-delete-behavior-fires-at-runtime)
3. [Pattern A — Leaf delete (Shipping)](#3-pattern-a--leaf-delete-shipping)
4. [Pattern B — Cascade delete (Order → OrderItems)](#4-pattern-b--cascade-delete-order--orderitems)
5. [Pattern C — Referential block (User with Orders)](#5-pattern-c--referential-block-user-with-orders)
6. [Pattern D — Recursive tree deletion (Category)](#6-pattern-d--recursive-tree-deletion-category)
7. [Pattern E — Reassign-then-delete / soft delete](#7-pattern-e--reassign-then-delete--soft-delete)
8. [Restoring stock on delete](#8-restoring-stock-on-delete)
9. [Common pitfalls](#9-common-pitfalls)

---

## 1. The Delete Object(s) activity

**Delete Object(s)** removes one object or a **list** from the database. It also removes the object from the client cache. As it runs, Mendix consults each association's **on-delete behavior** to decide what happens to related objects.

> 📖 [Delete Object(s)](https://docs.mendix.com/refguide10/delete-objects/) · [On-delete behavior](https://docs.mendix.com/refguide10/association-properties/) (see "On Delete Behavior")

---

## 2. How on-delete behavior fires at runtime

Recap of the three modes ([ch. 01 §7](01-domain-model-concepts.md#7-on-delete-behavior)) and what each does **when you delete**:

| On-delete config (on the side you delete) | Runtime effect on the *associated* objects |
|-------------------------------------------|---------------------------------------------|
| **Keep** *(default)* | Link removed; associated objects **kept** (possibly orphaned) |
| **Delete as well** | Associated objects are **deleted too** (cascade) |
| **Delete only if no associated** | Deletion **blocked** if any associated object exists → runtime throws the custom error message |

Mapped to our model:

| Delete this… | …and this happens |
|--------------|-------------------|
| `Product` | its `ProductVariant`s are **cascade-deleted** (`Product_ProductVariant` = Delete as well) |
| `Order` | its `OrderItem`s are **cascade-deleted** (`Order_OrderItem` = Delete as well) |
| `OrderItem` | the `ProductVariant` is **kept** (`OrderItem_ProductVariant` = Keep) |
| `User` with Orders | **blocked** (`User_Order` = Delete only if no associated) |
| `ProductVariant` referenced by OrderItems | **blocked** (`OrderItem_ProductVariant` variant-side = Delete only if no associated) |
| `Category` | products/children are **kept** (`Category_Product`, `Category_Category` = Keep) — handle explicitly |

---

## 3. Pattern A — Leaf delete (Shipping)

Deleting a `Shipping` record (order side is kept):

**Microflow `ACT_Shipping_Delete`**, parameter: `shipping` (Shipping):

1. **Delete Object(s)** `$shipping` — Refresh in client ☑.
2. **End**.

The parent `Order` survives because `Order_Shipping` is configured **Keep**. Simple and safe.

---

## 4. Pattern B — Cascade delete (Order → OrderItems)

Deleting an `Order` must also remove its line items — that's why we set `Order_OrderItem` = **Delete as well** in ch. 02.

**Microflow `ACT_Order_Delete`**, parameter: `order` (Order):

1. *(Optional guard)* **Exclusive Split**: only allow delete when `orderStatus` in (`Pending`, `Cancelled`) — refuse deleting `Paid`/`Shipped` orders. Show message + End if not allowed.
2. *(Optional)* Restore stock for each item — see §8. **Do this before the delete**, because after cascade the `OrderItem`s are gone.
3. **Delete Object(s)** `$order` — Refresh in client ☑.
   - The runtime **automatically** deletes all associated `OrderItem`s (cascade).
   - `Shipping` records are **kept** (`Order_Shipping` = Keep); they become orphaned shipment history — if you don't want that, set `Order_Shipping` to **Delete as well** instead.

> You **don't** loop and delete items yourself — the cascade does it. Manual deletion + cascade is redundant and slower.

---

## 5. Pattern C — Referential block (User with Orders)

Deleting a `User` who has `Order`s is **blocked** by design (`User_Order` = Delete only if no associated). Two ways to handle the block cleanly:

### Option 1 — Pre-check with `count()` (recommended UX)
**Microflow `ACT_User_Delete`**, parameter: `user` (User):

1. **Aggregate** / `count()`: `$orderCount = count(ECommerce.Order[ECommerce.User_Order = $user])`.
2. **Exclusive Split**: `if $orderCount = 0 then` → proceed; **else** → **Show Message** the same message configured on the association ("Cannot delete a User who still has Orders…") and **End**.

### Option 2 — Catch the runtime error
1. **Delete Object(s)** `$user` — set its error handling to **Custom** with an **Error handler** (catch all).
2. On the error path: **Show Message** `$latestError/feedback` (or a fixed text) and continue.

Pre-checking (Option 1) gives a better, localized message and avoids exception overhead.

> 📖 [Error Handling in Microflows](https://docs.mendix.com/refguide10/error-handling-in-microflows/)

---

## 6. Pattern D — Recursive tree deletion (Category)

Deleting a `Category` is the trickiest case: it may have **children** and **products**. We deliberately set both `Category_Category` and `Category_Product` to **Keep** in ch. 02 — auto-cascade on a self-reference is dangerous (you could wipe a whole subtree by accident). So we delete **explicitly** and **in order**.

**Microflow `ACT_Category_DeleteRecursive`**, parameter: `category` (Category):

1. **Retrieve the subtree** including the node itself:
   - Call **`DS_Category_Subtree`** ([ch. 04 §5](04-read-operations.md#5-walking-the-recursive-category-tree)) with `$category` → `$descendants`.
   - **Change List** `$toDelete` → **Add** `$category` (include the root), then Add all `$descendants`.
2. **Guard — are there products under any of these?**
   `$productCount = count(ECommerce.Product[ECommerce.Category_Product = $toDelete])`
   - **Exclusive Split**: `if $productCount > 0 then` → **Show Message** "Cannot delete: N products are still in this category. Reassign or archive them first." → **End**.
3. **Delete Object(s)** `$toDelete` (the whole list — children first is fine; Mendix orders correctly within the transaction).
   - Because children's `Category_Category` is **Keep**, deleting the parent doesn't try to auto-delete children — but we're deleting them ourselves anyway, so it's consistent.
4. **End**.

> **Bottom-to-top vs top-to-bottom:** since you delete the full set in one transaction and the on-delete is **Keep**, order doesn't matter here. If you'd configured **Delete as well** on the self-ref, you'd only delete the root and let it cascade — but we avoid that on self-refs for safety.

---

## 7. Pattern E — Reassign-then-delete / soft delete

When you **must** remove a node that still has references, either **reassign first** or **soft-delete**.

**Reassign-then-delete (Category):**
1. Retrieve the category's products.
2. **Change Object** each product → `Category_Product` = `$replacementCategory` (or empty).
3. Now the category has no products → delete it.

**Soft delete (best practice for business data):**
Don't delete at all — set `isActive = false`. This preserves history (orders still reference the right category/supplier/variant) and is what the reference design implies with its `status` enums (`active`/`inactive`/`archived`). Use **access rules** + grid filters to hide inactive rows.

> 📖 [Deleted Flag](https://docs.mendix.com/howto10/mobile/best-practices-for-mobile-apps/deleted-flag/) pattern · [Best Practices for Development](https://docs.mendix.com/refguide10/dev-best-practices/)

---

## 8. Restoring stock on delete

If you decrement stock at order time ([ch. 03 §7](03-create-operations.md#7-pattern-e--create-a-full-object-graph-order--items--shipping)), a delete/cancellation should **restore** it — **before** the cascade removes the items:

**In `ACT_Order_Delete` (before the Delete activity):**
1. Retrieve the Order's `OrderItem`s (`[Order_OrderItem = $order]`).
2. **Loop**: for each item, **Change Object** `$item/OrderItem_ProductVariant`: `stockQuantity = stockQuantity + $item/quantity`.
3. Commit the variants.
4. Then **Delete Object(s)** `$order` (cascades the items).

> Order **cancellation** (set status = Cancelled) usually does the same stock restoration without deleting — preferred over hard delete for auditability.

---

## 9. Common pitfalls

| Pitfall | Fix |
|---------|-----|
| "Object cannot be deleted" runtime error | A **Delete only if no associated** association blocked it. Pre-check with `count()` or reassign first. |
| Orphaned products after deleting a category | `Category_Product` is **Keep** by design. Reassign products first (Pattern E) or soft-delete the category. |
| Whole subtree vanished unexpectedly | You set **Delete as well** on a self-reference. Keep it **Keep** and delete explicitly (Pattern D). |
| Stock not restored on order delete | You deleted the order before reading its items. Restore stock **first**, then delete. |
| Historical line items lost their variant | You hard-deleted a `ProductVariant` that OrderItems reference. It's **blocked** by design — use soft-delete (`isActive=false`). |
| Deleting in a loop is slow | Pass a **list** to one **Delete Object(s)** activity instead of looping. |

**Next:** [07-advanced-relationship-patterns.md](07-advanced-relationship-patterns.md) — deep-copy, denormalization, audit logging, stock reservation.
