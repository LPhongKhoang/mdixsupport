# 02 — Build the Domain Model (Step by Step in Studio Pro)

This chapter constructs the **entire `ECommerce` domain model** — 8 entities, 3 enumerations, 8 associations — with the exact properties from [ch. 01](01-domain-model-concepts.md). Do this once; every later chapter builds on it.

> 💡 **Tip:** Open **View → Connector / Toolbox / Properties** so the panels you need are visible. Keep the **Errors** pane open to catch consistency errors as you go.

---

## Step 1 — Create the module

1. In the **App Explorer**, right-click the app → **Add module**.
2. Name it **`ECommerce`**, template **Blank module**.
3. Expand `ECommerce` → double-click **Domain Model** to open the editor.

> All entities, enumerations and associations in this guide live in `ECommerce`. When you reference them from another module the full name is `ECommerce.Product`, etc.

---

## Step 2 — Create the 3 enumerations

In the **App Explorer** under `ECommerce`, right-click → **Add enumeration**.

### 2.1 `UserRole`
| Values |
|--------|
| `Customer` |
| `Admin` |

### 2.2 `OrderStatus`
| Values |
|--------|
| `Pending` |
| `Paid` |
| `Shipped` |
| `Delivered` |
| `Cancelled` |

### 2.3 `ShippingStatus`
| Values |
|--------|
| `Pending` |
| `InTransit` |
| `Delivered` |
| `Returned` |

---

## Step 3 — Create the 8 entities

Drag **Entity** from the **Toolbox** onto the canvas for each one, then right-click the entity → **Add attribute**. Lay them out roughly as in the README diagram so associations will be short.

> Mark `Required` where the table says ✅. For `Date and time` defaults use `[%CurrentDateTime%]`.

### 3.1 `User`
| Attribute | Type | Required | Default | Notes |
|-----------|------|----------|---------|-------|
| `userName` | String (200) | ✅ | — | display name |
| `email` | String (200) | ✅ | — | add **Unique** validation |
| `userRole` | Enumeration `UserRole` | ✅ | `Customer` | |
| `phone` | String (50) | | | |
| `address` | String (500) | | | |
| `isActive` | Boolean | ✅ | `true` | |
| `createdAt` | Date and time | ✅ | `[%CurrentDateTime%]` | |

### 3.2 `Category`
| Attribute | Type | Required | Default | Notes |
|-----------|------|----------|---------|-------|
| `categoryName` | String (200) | ✅ | — | |
| `description` | String (500) | | | |
| `isActive` | Boolean | ✅ | `true` | |
| `createdAt` | Date and time | ✅ | `[%CurrentDateTime%]` |

### 3.3 `Supplier`
| Attribute | Type | Required | Default | Notes |
|-----------|------|----------|---------|-------|
| `supplierCode` | String (50) | ✅ | — | **Unique** |
| `supplierName` | String (200) | ✅ | — | |
| `contactEmail` | String (200) | | | |
| `contactPhone` | String (50) | | | |
| `isActive` | Boolean | ✅ | `true` | |

### 3.4 `Product` *(central entity)*
| Attribute | Type | Required | Default | Notes |
|-----------|------|----------|---------|-------|
| `productCode` | String (50) | ✅ | — | **Unique** |
| `productName` | String (300) | ✅ | — | |
| `description` | String (2000) | | | |
| `basePrice` | Decimal (15,2) | ✅ | `0.00` | |
| `isActive` | Boolean | ✅ | `true` | |
| `createdAt` | Date and time | ✅ | `[%CurrentDateTime%]` | |
| `updatedDate` | Date and time | | | set on save |

### 3.5 `ProductVariant`
| Attribute | Type | Required | Default | Notes |
|-----------|------|----------|---------|-------|
| `sku` | String (100) | ✅ | — | **Unique** |
| `variantName` | String (300) | ✅ | — | |
| `price` | Decimal (15,2) | ✅ | `0.00` | |
| `stockQuantity` | Integer | ✅ | `0` | |
| `color` | String (50) | | | |
| `size` | String (50) | | | |
| `isActive` | Boolean | ✅ | `true` | |

### 3.6 `Order`
| Attribute | Type | Required | Default | Notes |
|-----------|------|----------|---------|-------|
| `orderNumber` | String (50) | ✅ | — | **Unique** |
| `orderDate` | Date and time | ✅ | `[%CurrentDateTime%]` | |
| `totalAmount` | Decimal (15,2) | ✅ | `0.00` | computed in microflow |
| `orderStatus` | Enumeration `OrderStatus` | ✅ | `Pending` | |
| `shippingAddress` | String (500) | | | |
| `createdAt` | Date and time | ✅ | `[%CurrentDateTime%]` | |

### 3.7 `OrderItem` *(associative / junction entity)*
| Attribute | Type | Required | Default | Notes |
|-----------|------|----------|---------|-------|
| `quantity` | Integer | ✅ | `1` | > 0 |
| `unitPrice` | Decimal (15,2) | ✅ | `0.00` | snapshot of price at order time |
| `lineTotal` | Decimal (15,2) | ✅ | `0.00` | = quantity × unitPrice |

### 3.8 `Shipping`
| Attribute | Type | Required | Default | Notes |
|-----------|------|----------|---------|-------|
| `trackingNumber` | String (100) | | | **Unique** when present |
| `carrier` | String (100) | | | |
| `shippingDate` | Date and time | | | |
| `estimatedDelivery` | Date and time | | | |
| `shippingCost` | Decimal (15,2) | ✅ | `0.00` | |
| `shippingStatus` | Enumeration `ShippingStatus` | ✅ | `Pending` | |

---

## Step 4 — Create the 8 associations

Drag from the **Toolbox → Association**, or hover an entity until its edge handle appears and drag to the other entity. Then open the association's **Properties** pane and set **Multiplicity**, confirm the **Owner**, and set **On Delete Behavior**.

> After drawing, open the association properties and set the values exactly as below. The owner is shown by the filled circle / arrowhead; you can also verify in the association's **Type / Owner** fields.

### 4.1 `Category_Product` — Category (1) → Product (*)
| Property | Value |
|----------|-------|
| Multiplicity | **One-to-many** (default) |
| Owner | `Product` *(the child / many side)* |
| On-delete (deleting **Category**) | **Keep** associated Products |
| On-delete (deleting **Product**) | (n/a — Product is the child) |

```
Category 1 ─────────── * Product
         owner = Product (stores FK)
```

### 4.2 `Supplier_Product` — Supplier (1) → Product (*)
| Property | Value |
|----------|-------|
| Multiplicity | **One-to-many** |
| Owner | `Product` |
| On-delete (deleting Supplier) | **Keep** Products |

### 4.3 `Product_ProductVariant` — Product (1) → ProductVariant (*)
| Property | Value |
|----------|-------|
| Multiplicity | **One-to-many** |
| Owner | `ProductVariant` |
| On-delete (deleting **Product**) | **Delete as well** ← cascade |

> A variant has no meaning without its product, so we cascade.

### 4.4 `Category_Category` — Category (parent 1) → Category (child *)  *self-reference*
1. Drag an association from `Category` to **itself**.
2. Properties:
   - Multiplicity: **One-to-many**
   - Owner: the **child** end (the sub-category stores the link to its parent)
3. Rename the ends mentally: **parent** (the `1`) and **children** (the `*`).
4. On-delete (deleting a Category): **Keep** — we handle tree deletion explicitly in [ch. 06](06-delete-operations.md) (a category may have children and products; auto-cascade is dangerous).

```
Category (parent) 1 ─────────── * Category (child / sub-category)
        owner = child
```

> 📖 [Querying Over Self-References](https://docs.mendix.com/refguide10/querying-over-self-references/) — required reading before ch. 04.

### 4.5 `User_Order` — User (1) → Order (*)
| Property | Value |
|----------|-------|
| Multiplicity | **One-to-many** |
| Owner | `Order` |
| On-delete (deleting **User**) | **Delete only if there are no associated Orders** ← block |
| Error message | `Cannot delete a User who still has Orders. Remove or reassign the orders first.` |

### 4.6 `Order_OrderItem` — Order (1) → OrderItem (*)
| Property | Value |
|----------|-------|
| Multiplicity | **One-to-many** |
| Owner | `OrderItem` |
| On-delete (deleting **Order**) | **Delete as well** ← cascade |

### 4.7 `OrderItem_ProductVariant` — OrderItem (*) → ProductVariant (1)
| Property | Value |
|----------|-------|
| Multiplicity | **Many-to-one** (i.e. one-to-many read from the variant side) |
| Owner | `OrderItem` |
| On-delete (deleting OrderItem) | **Keep** the ProductVariant *(never delete catalog from a line item)* |
| On-delete (deleting **ProductVariant**) | **Delete only if there are no associated OrderItems** ← block losing order history |

> This is one half of the M:N relationship `Order ↔ ProductVariant`. The junction is `OrderItem` itself. There is **no separate many-to-many association** — and that's the whole point.

### 4.8 `Order_Shipping` — Order (1) → Shipping (*)
| Property | Value |
|----------|-------|
| Multiplicity | **One-to-many** *(one order can ship in multiple parcels)* |
| Owner | `Shipping` |
| On-delete (deleting Order) | **Keep** Shipments *(they're records of what happened)* |

> Want strict **one shipment per order**? Set multiplicity **One-to-one** here instead. We keep 1:N to show the partial-shipment case.

---

## Step 5 — Association summary table

| # | Association | Multiplicity | Owner | On-delete (notable side) |
|---|-------------|--------------|-------|--------------------------|
| 1 | `Category_Category` | one-to-many (self) | child | Keep |
| 2 | `Category_Product` | one-to-many | Product | Keep |
| 3 | `Supplier_Product` | one-to-many | Product | Keep |
| 4 | `Product_ProductVariant` | one-to-many | ProductVariant | **Delete as well** |
| 5 | `User_Order` | one-to-many | Order | **Block** |
| 6 | `Order_OrderItem` | one-to-many | OrderItem | **Delete as well** |
| 7 | `OrderItem_ProductVariant` | many-to-one | OrderItem | Keep / **Block** (variant side) |
| 8 | `Order_Shipping` | one-to-many | Shipping | Keep |

---

## Step 6 — Basic access rules (so you can build/test)

While building, set module security to allow full access for the **Administrator** role so CRUD works in the dev sandbox.

1. **App Security** → set level to **Prototype/Demo** (or **Production** for real apps).
2. For each entity: right-click → **Access rules** → ensure **Administrator** has **Read/Write** on the entity, **all attributes**, and **all associations**.

> 🔒 In production, tighten this. For example, a `Customer` user role should only see `Order` rows where `Order_User = [%CurrentUser%]` (XPath-constrained read rule). See [ch. 09](09-best-practices-checklist.md).

---

## Step 7 — Verify with a consistency check

1. **F9** (or **Project → Build for deployment**) — fix any consistency errors.
2. Expected result: **0 errors**. Common issues:
   - Association owner set on the wrong side → flip it in properties.
   - Enumeration referenced before being created → create the enum first (Step 2).

---

## Result — your domain model

```
┌────────────┐                     ┌──────────────┐
│   User     │ 1──────────────────*│    Order     │ 1──────────────*┌──────────────┐
│────────────│      User_Order      │──────────────│   Order_OrderItem│   OrderItem  │
│ userRole   │   (block on delete)  │ orderStatus  │   (cascade del)  │──────────────│
└────────────│                      │ totalAmount  │                  │ quantity     │
              │                      └──────┬───────┘                  │ unitPrice    │
              │                             │ 1                        │ lineTotal    │
              │                       ┌─────┴──────┐                   └───┬──────┬───┘
              │                       │  Shipping  │ 1:N Order_Shipping    │      │ *
              │                       │────────────│ (keep)                 │      │
              │                       │ tracking#  │                        │      │ many-to-one
              │                       └────────────┘                        │      │ OrderItem_ProductVariant
              │                                                             ▼      ▼
              │                                        ┌──────────────────┐ 1──*┌──────────────┐
              │                                        │  ProductVariant  │     │   Product    │ 1──* Category_Product
              │                                        │──────────────────│◄────│──────────────│◄──────┐
              │                                        │ sku              │ 1:* │ productCode  │       │ 1
              │                                        │ price / stock    │     │ basePrice    │       │
              │                                        └──────────────────┘     └──────┬───────┘       │
              │                                                  ▲ Product_ProductVariant      │       │
              │                                                  │ (cascade delete)             │       │
              │                                            ┌─────┴───────┐                ┌─────▼─────┐ │
              │                                            │  Supplier   │ 1:*           │  Category │─┘ self-ref
              │                                            │──────────────│ Supplier_     │────────────│ Category_Category
              │                                            │ supplierCode │  Product      │categoryName│ (parent→child)
              └────────────────────────────────────────────┴─────────────┘  keep        └────────────┘
```

✅ You now have a complete relationship-rich domain model.

**Next:** [03-create-operations.md](03-create-operations.md) — insert data across every relationship type.
