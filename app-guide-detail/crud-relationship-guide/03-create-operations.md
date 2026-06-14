# 03 — CREATE Operations (Insert Across Every Relationship Type)

Inserting data in Mendix means **creating objects and setting associations**. This chapter walks five patterns of increasing complexity, ending with creating a whole **Order + OrderItems + Shipping** graph in a single transaction.

## Table of contents

1. [The two activities you need](#1-the-two-activities-you-need)
2. [How Mendix commits & transactions](#2-how-mendix-commits--transactions)
3. [Pattern A — Simple create (Category)](#3-pattern-a--simple-create-category)
4. [Pattern B — Create with a reference (Product → Category + Supplier)](#4-pattern-b--create-with-a-reference-product--category--supplier)
5. [Pattern C — Create with a self-reference (sub-Category)](#5-pattern-c--create-with-a-self-reference-sub-category)
6. [Pattern D — Create a junction row (OrderItem → Order + ProductVariant)](#6-pattern-d--create-a-junction-row-orderitem--order--productvariant)
7. [Pattern E — Create a full object graph (Order + Items + Shipping)](#7-pattern-e--create-a-full-object-graph-order--items--shipping)
8. [Auto-generated values (codes & numbers)](#8-auto-generated-values-codes--numbers)
9. [Validation before commit](#9-validation-before-commit)
10. [Common pitfalls](#10-common-pitfalls)

---

## 1. The two activities you need

| Activity | What it does |
|----------|--------------|
| **Create Object** | Instantiates a new object **in memory**, optionally setting attributes & associations. Has a **Commit** checkbox — when ticked, the object is also persisted in the same activity; when unticked *(default)*, it stays in memory until you commit it. |
| **Commit Object(s)** | Persists one object or a **list** of objects to the database. Optionally **Refresh in client** so the UI picks up the new state. |

You set associations inside **Create Object** or **Change Object** via the **Associations** section: pick the association, assign an object variable (for a reference) or a list (for a reference set).

> 📖 [Create Object](https://docs.mendix.com/refguide10/create-object/) · [Commit Object(s)](https://docs.mendix.com/refguide10/commit-objects/) · [Object Activities](https://docs.mendix.com/refguide10/object-activities/)

---

## 2. How Mendix commits & transactions

**One microflow = one database transaction.** Every `Commit` inside a microflow is part of that transaction.

- If the microflow completes normally → all commits are flushed atomically.
- If an error is thrown and **not handled** → the runtime **rolls back** all uncommitted changes from that microflow. (Handled errors are a different story — see [ch. 09](09-best-practices-checklist.md).)
- Objects created with **Create Object (Commit = off)** are linked in memory. You can associate them, compute derived fields, then **Commit** everything at the end — one atomic unit of work.

This is exactly what makes the "create a whole order graph" pattern safe.

> 📖 [Microflows](https://docs.mendix.com/refguide10/microflows/) · [Error Handling in Microflows](https://docs.mendix.com/refguide10/error-handling-in-microflows/)

---

## 3. Pattern A — Simple create (Category)

Create a `Category` with no parent (a root category).

**Microflow `ACT_Category_Create`** (parameter: none; triggered from a "New Category" button that opens a page whose Data View creates a `Category` object — or create it here):

1. **Create Object** `Category`
   - Commit: ☑ (we want it persisted now)
   - Attributes: `categoryName = $categoryName`, `isActive = true`
   - Associations: *(none — root has no parent)*
2. **End event** → return the new `Category` (so a popup can show its details).

That's the simplest insert. Nothing related, nothing to wire up.

> In practice you usually let a popup **Data View**'s "Create object" data source build the in-memory object, the user fills the form, and a **Save button** commits it. We use explicit microflows here so the relationship logic is visible. See [ch. 08](08-pages-and-ui-for-relationships.md) for the form-based flow.

---

## 4. Pattern B — Create with a reference (Product → Category + Supplier)

Create a `Product` and link it to an existing `Category` and `Supplier`. This is the bread-and-butter **child-owned reference** pattern (`Category_Product`, `Supplier_Product` — owner is `Product`).

**Microflow `ACT_Product_Create`**, parameters: `category` (Category), `supplier` (Supplier), `productName`, `productCode`, `basePrice`:

1. **Create Object** `Product`
   - Commit: ☐ *(we'll commit at the end)*
   - Attributes:
     - `productName = $productName`
     - `productCode = $productCode`
     - `basePrice = $basePrice`
     - `isActive = true`
     - `createdAt = [%CurrentDateTime%]`
   - Associations:
     - `Product.Category_Product (Category)` = `$category` ← sets the FK
     - `Product.Supplier_Product (Supplier)` = `$supplier`

   ```
   ┌─────────────────────────┐
   │ Create Product          │
   │  ├ Category_Product  ───┼──► $category   (existing)
   │  ├ Supplier_Product  ───┼──► $supplier   (existing)
   │  └ productName, etc.    │
   └─────────────────────────┘
   ```
2. **Commit Object(s)** `$newProduct` — Refresh in client ☑.
3. **End** → return `$newProduct`.

**Why this works:** the owner of `Category_Product` is `Product`, so setting the association on the `Product` side writes the FK onto the new product row. We pass the parent objects in as parameters (typically the user picked them via **Reference Selector** widgets — see ch. 08).

---

## 5. Pattern C — Create with a self-reference (sub-Category)

Create a child `Category` linked to a parent `Category` via the self-association `Category_Category`.

**Microflow `ACT_Category_CreateSub`**, parameters: `parentCategory` (Category), `name`:

1. **Create Object** `Category`
   - Commit: ☐
   - Attributes: `categoryName = $name`, `isActive = true`, `createdAt = [%CurrentDateTime%]`
   - Associations:
     - From the **child** end of `Category_Category` → set to `$parentCategory`.

   ```
   parentCategory (1) ◄──── Category_Category ──── newCategory (child, owner)
   ```
2. **Commit** `$newCategory`.

> ⚠️ Set the association from the **child (owner)** side. You *can* set it from the parent side too (add to the parent's "children" set), but for a one-to-many self-reference the conventional and safest direction is child → parent. See [Querying Over Self-References](https://docs.mendix.com/refguide10/querying-over-self-references/).

---

## 6. Pattern D — Create a junction row (OrderItem → Order + ProductVariant)

`OrderItem` is the **associative entity** that resolves the many-to-many between `Order` and `ProductVariant`, carrying `quantity` and `unitPrice`. Creating one is just **Pattern B twice** on the same object.

**Microflow `ACT_OrderItem_Add`**, parameters: `order` (Order), `productVariant` (ProductVariant), `quantity` (Integer):

1. (Optional) **Validate** stock: if `$productVariant/stockQuantity < $quantity` → **Show Message** "Not enough stock" → **End** (return nothing).
2. **Create Object** `OrderItem`
   - Commit: ☐
   - Attributes:
     - `quantity = $quantity`
     - `unitPrice = $productVariant/price` *(snapshot the price at order time — prices change later, but this line is frozen)*
     - `lineTotal = $quantity * $productVariant/price`
   - Associations:
     - `OrderItem.Order_OrderItem (Order)` = `$order`
     - `OrderItem.OrderItem_ProductVariant (ProductVariant)` = `$productVariant`

   ```
   $order ──────► OrderItem ◄────── $productVariant
    (1)        (owner of both FKs)        (1)
   ```
3. *(Defer stock decrement + order total recalculation to the order-level microflow in Pattern E, or do it here if items are added one-by-one.)*
4. **Commit** `$newOrderItem`.

> **The mental model:** an associative entity is just an entity that happens to own two (or more) references. Nothing special — set both associations in one Create Object.

---

## 7. Pattern E — Create a full object graph (Order + Items + Shipping)

> 🌟 **The centerpiece of this guide.** Create an `Order`, its `OrderItem` lines, and a `Shipping` record — all atomically, in one microflow. If any step fails, the whole thing rolls back.

**Inputs** (a typical shopping-cart scenario): `customer` (User) + a **list** of `(ProductVariant, quantity)` pairs. We model the cart as a non-persistent `CartLine` entity (NPE) in ch. 08; here, assume the microflow receives `customer` (User) and `cartLines` (List of an NPE `CartLine` with associations to `ProductVariant` and an Integer `quantity`).

**Microflow `ACT_Order_CreateWithItems`** — parameters: `customer` (User), `cartLines` (List&lt;CartLine&gt;):

### Step 1 — Create the Order (in memory)
**Create Object** `Order`, Commit: ☐
- `orderNumber = [%CurrentDateTime%]` *(placeholder; we overwrite with a real code in Step 5)*
- `orderDate = [%CurrentDateTime%]`
- `orderStatus = ECommerce.OrderStatus.Pending`
- `totalAmount = 0.00` *(we recompute after the loop)*
- `shippingAddress = $customer/address`
- Association `Order.User_Order (User)` = `$customer`

### Step 2 — Create every OrderItem in a loop
Add a **Loop** over `$cartLines`, iterator `currentLine`.

Inside the loop (this mirrors Pattern D):
1. **Retrieve** the variant: `$variant = $currentLine/CartLine_ProductVariant` (it's an association on the NPE).
2. *(Validate stock)* — **Exclusive Split**: `if $variant/stockQuantity >= $currentLine/quantity then ... else` → log/throw.
3. **Create Object** `OrderItem`, Commit: ☐
   - `quantity = $currentLine/quantity`
   - `unitPrice = $variant/price`
   - `lineTotal = $currentLine/quantity * $variant/price`
   - `OrderItem.Order_OrderItem (Order)` = `$newOrder`
   - `OrderItem.OrderItem_ProductVariant (ProductVariant)` = `$variant`
4. **Change Object** `$variant`: `stockQuantity = $variant/stockQuantity - $currentLine/quantity` *(reserve stock — see ch. 07 for the safer "soft reserve" pattern).*
5. Collect each `OrderItem` into a list `$orderItems` (Create List before the loop, **Change List → Add** inside).

### Step 3 — Recompute the order total
**Aggregate List** over `$orderItems` → `Sum` of `lineTotal` → `$orderTotal`.
**Change Object** `$newOrder`: `totalAmount = $orderTotal`.

### Step 4 — Create the Shipping record (in memory)
**Create Object** `Shipping`, Commit: ☐
- `shippingStatus = ECommerce.ShippingStatus.Pending`
- `shippingCost = 5.00` *(or your rate)*
- Association `Shipping.Order_Shipping (Order)` = `$newOrder`

### Step 5 — Generate the order number
Set `$newOrder/orderNumber = 'ORD-' + toString([%CurrentDateTime%], 'yyyyMMddHHmmss')` (or call a code-generation sub-microflow — see §8).
**Change Object** `$newOrder`.

### Step 6 — Commit everything atomically
**Commit Object(s)** — add all objects to one list and commit the list, or commit sequentially within the same microflow (same transaction):

```
Commit Order  $newOrder
Commit list   $orderItems   (all OrderItems)
Commit        $shipping
(Commit list   $variants   if you changed stock — they're already in $orderItems via association; commit the changed variant objects explicitly)
```

Enable **Refresh in client** where the UI needs to reflect the new state.

### Step 7 — End
**Show Page** to the order-confirmation page (passing `$newOrder`), or **Show Message** "Order placed: " + `$newOrder/orderNumber`.

### Why this is safe
All of the above runs in **one microflow = one transaction**. If step 2's stock validation fails and you throw (or step 6 hits a DB error), **nothing is persisted** — no half-created order, no orphaned line items, no stock decremented without an order.

```
        ┌──────────── single transaction (ACT_Order_CreateWithItems) ────────────┐
        │                                                                        │
   User │   ┌─Order──┐   owns   ┌─OrderItem─┐ ──┐                              │
   ─────┼──►│ Pending│ 1──────* │ qty, price│   │ *   ┌─────────────┐          │
        │   │ total  │          │ lineTotal │   └───►│ProductVariant│ stock--  │
        │   └────┬───┘          └───────────┘       └─────────────┘          │
        │        │ 1                                                               │
        │        ▼                                                                 │
        │   ┌─Shipping──┐                                                          │
        │   │ Pending   │                                                          │
        │   └───────────┘                                                          │
        │                                                                        │
        └──────────────── all committed together, or rolled back ────────────────┘
```

---

## 8. Auto-generated values (codes & numbers)

`productCode`, `orderNumber`, `supplierCode`, `sku`, `trackingNumber` should be unique and ideally system-generated. Two common approaches:

- **Timestamp/template** (simple): `'ORD-' + toString([%CurrentDateTime%], 'yyyyMMddHHmmss')`. Fine for low volume.
- **Sequence sub-microflow / Java action** (robust): a `ACT_Order_GenerateNumber` that queries the max existing number (or uses a counter entity) and increments under a unique check. See the related repo's [12-java-action.md](../frontend-state-management/12-java-action.md) for a `JA_GenerateProductCode` reference implementation using the OQL API.

Set generated codes **before** the final commit (as in Step 5), and enforce the **Unique** validation rule on the attribute so the DB rejects collisions.

---

## 9. Validation before commit

Validate *before* you commit, so you never persist bad data:

- **Required attributes** — enforced by the runtime; a commit with missing required fields throws.
- **Domain rules** — check in the microflow with **Exclusive Split** / decisions before committing:
  - `quantity > 0`
  - `basePrice >= 0`
  - enough stock (Pattern E)
- **Uniqueness** — set the **Unique** validation rule on the attribute (e.g. `email`, `sku`, `productCode`, `orderNumber`). The runtime raises a specific error you can catch and show.

> 📖 [Validation Rules](https://docs.mendix.com/refguide10/validation-rules/) · [Setting Up Data Validation](https://docs.mendix.com/refguide10/setting-up-data-validation/)

---

## 10. Common pitfalls

| Pitfall | Fix |
|---------|-----|
| Created object "disappears" | You used **Create Object with Commit off** and never committed it. Add a **Commit Object(s)**. |
| Association shows empty after commit | You set it on the wrong end or forgot to pass the parent object. Set it on the **owner** side; pass parents as parameters. |
| Half-created order on stock failure | You committed each object as you went and an error occurred mid-loop. Build the graph in memory, validate, then commit once at the end (one transaction). |
| Prices change retroactively | You stored a reference but not the price. **Snapshot** `unitPrice` onto `OrderItem` at creation time. |
| Stock goes negative | No validation before decrement. Check `stockQuantity >= quantity` first (Exclusive Split). |
| Self-ref set on parent side | For one-to-many self-ref, set from the **child/owner** side; reading the parent's children still works. |

**Next:** [04-read-operations.md](04-read-operations.md) — retrieve and traverse every relationship (XPath, OQL joins, recursive trees).
