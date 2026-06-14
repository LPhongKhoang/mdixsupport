# 07 — Advanced Relationship Patterns

These patterns appear in real applications once the basic CRUD works. Each maps to a documented Mendix best practice.

## Table of contents

1. [Deep-copy (clone) a relationship graph](#1-deep-copy-clone-a-relationship-graph)
2. [Denormalization for read performance](#2-denormalization-for-read-performance)
3. [Audit logging across relationships (event handlers)](#3-audit-logging-across-relationships-event-handlers)
4. [Optional / nullable references](#4-optional--nullable-references)
5. [Stock reservation (a transactional validation)](#5-stock-reservation-a-transactional-validation)
6. [Generalization vs 1-to-1 association](#6-generalization-vs-1-to-1-association)

---

## 1. Deep-copy (clone) a relationship graph

Clone an existing `Order` (with its `OrderItem`s) into a new draft order — **copying owned children**, but **sharing** referenced catalog objects (the `ProductVariant`s are not duplicated). This is the same shape as the *Clone Simulation* SQL in [`planning-db-design/README.md` §4.4](../../planning-db-design/README.md).

**Microflow `ACT_Order_Clone`**, parameter: `sourceOrder` (Order):

1. **Create Object** `Order` (Commit: ☐) — copy attributes:
   - `orderDate = [%CurrentDateTime%]`, `orderStatus = Pending`, `totalAmount = $sourceOrder/totalAmount`, `shippingAddress = $sourceOrder/shippingAddress`
   - `orderNumber = <generated>` (ch. 03 §8)
   - `Order.User_Order = $sourceOrder/ECommerce.User_Order` *(same customer)*
2. **Retrieve** source items: `[Order_OrderItem = $sourceOrder]` → `$sourceItems`.
3. **Create List** `$newItems`.
4. **Loop** over `$sourceItems`:
   - **Create Object** `OrderItem` (Commit: ☐):
     - copy `quantity`, `unitPrice`, `lineTotal`
     - `OrderItem.Order_OrderItem = $newOrder`
     - `OrderItem.OrderItem_ProductVariant = $item/ECommerce.OrderItem_ProductVariant` ← **shared** reference, not copied
   - **Change List** `$newItems` → Add.
5. **Commit** `$newOrder`, then **Commit list** `$newItems`.
6. **End** → return `$newOrder`.

```
sourceOrder ──┐                         ┌── newOrder  (new id, same customer)
  ├ item A ───┤ variant V1 (shared) ◄───┤── item A' ──► V1
  ├ item B ───┤ variant V2 (shared)     │── item B' ──► V2
  └ item C ───┘                         └── item C' ──► V3
   (copied, new ids)        catalog objects are NOT cloned — they're shared
```

> **Rule:** deep-copy *owned* children (the `*` side of a one-to-many with composition semantics — `Order_OrderItem`), **share** *referenced* master data (`OrderItem_ProductVariant`, `Order_User`). This keeps the catalog singular and avoids data duplication.

---

## 2. Denormalization for read performance

When a relationship is read **very** often and rarely changes, copy a value onto the child so you avoid the join. 📖 [Denormalize Data to Improve Performance](https://docs.mendix.com/howto10/data-models/denormalize-data-to-improve-performance/).

### 2.1 Cached category name on Product
Add `Product.categoryNameCache` (String). Set it whenever you assign/reassign `Category_Product` (in the create & reassign microflows). Listing products then reads `categoryNameCache` directly — no join.

**Trade-off:** you must keep the cache in sync. The cleanest way is an **event handler**: on `Category` **After Commit**, find all products in that category and update their cache. Accept the sync cost only when reads >> writes.

### 2.2 Materialized path for the category tree
Add `Category.path` (String) like `"/1/4/9"`. To fetch a whole subtree in **one** query instead of recursion ([ch. 04 §5](04-read-operations.md#5-walking-the-recursive-category-tree)):

```
// descendants of $root
[contains(Category.path, '/' + $root/id + '/')]
```
Maintain `path` on create/re-parent (append parent's path). This converts an O(depth) recursive retrieval into a single index-backed query.

---

## 3. Audit logging across relationships (event handlers)

The reference design has an `audit_logs` table ([`schema.prisma`](../../planning-db-design/schema.prisma)). In Mendix:

1. **Add entity** `AuditLog`:
   - `action` (String: `create`/`update`/`delete`/`clone`)
   - `entityType` (String), `entityId` (String), `changes` (String, JSON-ish before/after)
   - `createdAt` (DateTime), association `AuditLog.User` (→ `User` or `System.User`)
2. **Centralize** with event handlers: on each business entity, add an **After Commit** and **Before Delete** event handler calling one shared `LOG_Audit` microflow that creates an `AuditLog` row.

> 📖 [Event Handlers](https://docs.mendix.com/refguide10/event-handlers/). Or use the marketplace **AuditTrail** module for a ready-made, field-level implementation.

Event handlers fire for **every** commit, so you get relationship-aware audit (e.g. "Order X's customer changed from A to B") without editing every microflow — but be mindful of write amplification on high-frequency commits.

---

## 4. Optional / nullable references

A reference association is **optional** by default — the FK can be empty. Use this deliberately:

- `Product` may have **no** `Supplier` yet (nullable `Supplier_Product`).
- A `ProductVariant` may exist before being linked to any `OrderItem`.
- An `OrderItem.ProductVariant` — keep **required** (a line item without a product is meaningless).

When reading an optional reference, guard against empty:
```
if $product/ECommerce.Supplier_Product != empty
   then $product/ECommerce.Supplier_Product/supplierName
   else 'No supplier'
```
And in XPath, `[ECommerce.Supplier_Product]` matches products that *have* a supplier; `not(ECommerce.Supplier_Product)` matches those without.

---

## 5. Stock reservation (a transactional validation)

"Place order only if every line has enough stock, and reserve it atomically." The microflow in [ch. 03 §7](03-create-operations.md#7-pattern-e--create-a-full-object-graph-order--items--shipping) already does the happy path. Make it robust:

1. **Pre-validate the whole cart** in one pass (Exclusive Split): every `CartLine` must satisfy `variant.stockQuantity >= quantity`. If any fails → show which line is short → End (nothing persisted).
2. **Then** decrement in the loop and commit the graph.

Because it's one transaction, two concurrent orders can't both succeed on the last unit — the **Unique**/**required** checks and the single transaction serialize the stock decrement. For high contention, add **optimistic locking** (or a dedicated stock-reservation entity). 📖 [Optimistic Locking](https://docs.mendix.com/refguide10/optimistic-locking/).

---

## 6. Generalization vs 1-to-1 association

When two entities are an **is-a** relationship (a `Customer` *is a* `User`), use **generalization** (inheritance) rather than a 1-to-1 association. The child inherits the parent's attributes/associations and shares one identity.

When they are merely **1-to-1 but independent** (an `Order` and its `Shipping` that could exist separately), use a **1-to-1 association** (multiplicity One-to-one, owner Both).

> 📖 [Generalization vs 1-to-1 Associations](https://docs.mendix.com/refguide10/generalization-vs-1-to-1-associations/)

In this guide `User` is a plain persistent entity (we don't need Mendix `System.User` inheritance for the tutorial); in a real app with login you'd typically extend `System.User` or use **user types**.

**Next:** [08-pages-and-ui-for-relationships.md](08-pages-and-ui-for-relationships.md) — surface all of this in pages.
