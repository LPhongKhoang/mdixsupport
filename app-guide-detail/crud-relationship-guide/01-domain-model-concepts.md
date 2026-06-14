# 01 — Domain Model Concepts (Relational → Mendix)

> **Read this first.** The rest of the guide assumes you understand associations, **ownership**, **multiplicity**, and **on-delete behavior**. These three properties decide *everything* about how CRUD behaves on related data.

## Table of contents

1. [Entities: persistent vs non-persistent](#1-entities-persistent-vs-non-persistent)
2. [Attributes & validation](#2-attributes--validation)
3. [Enumerations](#3-enumerations)
4. [Associations: the core concept](#4-associations-the-core-concept)
5. [Multiplicity](#5-multiplicity)
6. [Ownership (who stores the link)](#6-ownership-who-stores-the-link)
7. [On-delete behavior](#7-on-delete-behavior)
8. [Association storage: direct vs table (Mendix 10.21+)](#8-association-storage-direct-vs-table-mendix-1021)
9. [Mapping relational patterns to Mendix](#9-mapping-relational-patterns-to-mendix)
10. [Access rules (security)](#10-access-rules-security)
11. [Cheat sheet](#11-cheat-sheet)

---

## 1. Entities: persistent vs non-persistent

An **entity** is a blueprint for objects (rows). It lives inside a **module** (e.g. `ECommerce`) and has **attributes** (columns) and **associations** (relationships).

| Property | Persistent entity | Non-persistent entity (NPE) |
|----------|-------------------|-----------------------------|
| Stored in DB? | ✅ Yes | ❌ No — lives in client session memory only |
| Visual cue in domain model | Blue border | Orange border |
| Use for | Real business data | UI state, edit buffers, filter context, transient views |
| Survives logout/restart? | ✅ | ❌ |

In this guide **all 8 business entities are persistent** (Product, Category, Supplier, ProductVariant, Order, OrderItem, Shipping, User). NPEs appear later for UI state and edit proxies (ch. 08).

> 📖 [Persistability](https://docs.mendix.com/refguide10/persistability/) · [Objects and Caching](https://docs.mendix.com/refguide10/objects-and-caching/)

---

## 2. Attributes & validation

Each attribute has a **type**. The ones we use:

| Type | Use for | Notes |
|------|---------|-------|
| `String` (length N) | names, codes, emails | set a reasonable length |
| `Decimal (precision, scale)` | money, quantities | e.g. `Decimal(15,2)` for price |
| `Integer` / `Long` | counts, stock | `Integer` for stock |
| `Boolean` | flags (`isActive`) | default `true`/`false` |
| `Date and time` | timestamps | default `[%CurrentDateTime%]` |
| `Enumeration` | fixed value sets | e.g. `OrderStatus` |

**Required** = NOT NULL. **Default value** is applied on create. **Validation rules** (required, range, regex, unique) are declared on the attribute and enforced by the runtime on commit and in the UI.

> 📖 [Attributes](https://docs.mendix.com/refguide10/attributes/) · [Validation Rules](https://docs.mendix.com/refguide10/validation-rules/) · [Setting Up Data Validation](https://docs.mendix.com/refguide10/setting-up-data-validation/)

---

## 3. Enumerations

An **enumeration** is a fixed list of named values. It maps to a SQL `ENUM`. We use three:

- `UserRole` → `Customer`, `Admin`
- `OrderStatus` → `Pending`, `Paid`, `Shipped`, `Delivered`, `Cancelled`
- `ShippingStatus` → `Pending`, `InTransit`, `Delivered`, `Returned`

Enumerations are created at module level and referenced by attribute type. In expressions you write `OrderStatus.Paid`.

> 📖 [Enumerations](https://docs.mendix.com/refguide10/enumerations/) · [Enumerations in Expressions](https://docs.mendix.com/refguide10/enumerations-in-expressions/)

---

## 4. Associations: the core concept

This is where relational people get tripped up, so read carefully.

In a relational DB you express a relationship with a **foreign key column**. In Mendix you draw an **association** — a first-class object between two entities. Crucially:

> **An association is not "owned by a column" the way an FK is. It is a link between two entities, and you configure three things on it: multiplicity, ownership, and on-delete behavior.** — paraphrased from [Association Properties](https://docs.mendix.com/refguide10/association-properties/)

You can **read** an association from *either* end regardless of ownership. Ownership and multiplicity mostly affect **writes** and **storage**, not reads.

```
   Category  ────────────association────────────  Product
   (entity)      name: Category_Product          (entity)
                  multiplicity: one-to-many
                  owner: Product (the * side)
                  on-delete: keep
```

> 📖 [Associations](https://docs.mendix.com/refguide10/associations/) · [Association Properties](https://docs.mendix.com/refguide10/association-properties/)

---

## 5. Multiplicity

Per the official docs, multiplicity has three forms:

| Multiplicity | Meaning | Equivalent to |
|--------------|---------|---------------|
| **One-to-one** | one X ↔ one Y | `Reference`, owner `Both` |
| **One-to-many** *(default)* | one X ↔ many Y | `Reference`, owner `Default` |
| **Many-to-many** | many X ↔ many Y | `Reference set`, ownership via Navigability |

Practical reading for our domain:

- `Category` (1) → `Product` (*): **one-to-many**. A category has many products; each product has one category.
- `Order` (1) → `OrderItem` (*): **one-to-many**. An order has many line items.
- `Order` (* ) ← → `ProductVariant` (*): a variant can appear on many orders, an order references many variants. In Mendix this is modeled as **many-to-many resolved through a junction entity `OrderItem`** (which also carries `quantity`/`unitPrice`). You almost never use a bare many-to-many association in a business domain — you use an **associative entity**. See [§9](#9-mapping-relational-patterns-to-mendix).

---

## 6. Ownership (who stores the link)

One side of an association is the **owner**. The owner is the entity whose table stores the reference.

> "Despite its name, navigability is usually only important when adding or changing associations. Making one object owner of an association does **not** prevent you reading the association from the non-owner end." — [Association Properties](https://docs.mendix.com/refguide10/association-properties/)

**Rule of thumb (matches relational FK intuition):**

> **In a one-to-many parent → child association, the *child* (the "many" side) owns the association** — it stores the FK pointing to the parent.

| Association | Owner (FK side) | Why |
|------------|-----------------|-----|
| `Category_Product` | `Product` | Each Product has one Category → Product stores `category_id` |
| `Supplier_Product` | `Product` | Each Product has one Supplier |
| `Product_ProductVariant` | `ProductVariant` | Each Variant belongs to one Product |
| `Order_OrderItem` | `OrderItem` | Each OrderItem belongs to one Order |
| `User_Order` | `Order` | Each Order belongs to one User (customer) |
| `Order_Shipping` | `Shipping` | Each Shipping belongs to one Order |
| `OrderItem_ProductVariant` | `OrderItem` | Each OrderItem picks one ProductVariant |
| `Category_Category` (self) | child (sub-category) | Each sub-category has one parent |

You can still navigate the other way (e.g. "all Products of a Category") — reads are bidirectional. Ownership only matters when you *set* or *delete*.

> 📖 [Association Tab Properties (Owner)](https://docs.mendix.com/refguide10/association-tab-properties/)

---

## 7. On-delete behavior

This is the single most important relationship property for the **Delete** chapter. Per the docs, when an object is deleted there are **exactly three** behaviors you can configure per association:

| Option | What happens | When to use |
|--------|--------------|-------------|
| **Keep associated object(s)** *(default)* | Deleting the object just removes the link; the other object stays | Default; use when children should be orphaned, not destroyed |
| **Delete associated object(s) as well** | Deleting the object **cascades** and deletes the associated objects too | True composition: delete Order → delete its OrderItems; delete Product → delete its ProductVariants |
| **Delete the object only if there are no associated object(s)** | Deletion is **blocked** if the association is in use; you supply a custom error message | Referential integrity: can't delete a User who still has Orders; can't delete a Category that still has Products |

> ⚠️ **Important:** on-delete behavior is triggered by the runtime when a deletion is committed. The **microflow `Delete object(s)` activity** respects it (and will raise the block error if configured). See [ch. 06](06-delete-operations.md).

**How we'll configure each association** (the design decisions we justify in ch. 02):

| Association | On-delete (parent side) | Rationale |
|------------|-------------------------|-----------|
| `Category_Category` | Keep | Tree deletion handled explicitly in a microflow (ch. 06) |
| `Category_Product` | Keep | Don't silently destroy products when removing a category |
| `Supplier_Product` | Keep | Products survive a supplier leaving |
| `Product_ProductVariant` | **Delete as well** | A variant has no meaning without its product |
| `User_Order` | **Block** | Never lose order history by deleting a customer |
| `Order_OrderItem` | **Delete as well** | Line items are part of the order |
| `OrderItem_ProductVariant` | Keep | Deleting a line item must not delete the catalog variant |
| `Order_Shipping` | Keep | Shipments are records; keep them |

> 📖 See the official delete-behavior section of [Association Properties](https://docs.mendix.com/refguide10/association-properties/).

---

## 8. Association storage: direct vs table (Mendix 10.21+)

From Mendix 10.21 you can choose how an association is physically stored:

| Storage | Description |
|---------|-------------|
| **Association tables** *(default)* | A separate join table holds the link (lets you flip multiplicity later) |
| **Direct associations** | The link is stored as a column on the owner's table (faster, less joins) — *not available for many-to-many* |

For this guide the default (**association tables**) is fine and is the safest choice while learning. If you later optimize, you can switch stable one-to-many associations to **direct** storage for performance. See [Association Storage](https://docs.mendix.com/refguide10/association-storage/).

---

## 9. Mapping relational patterns to Mendix

This is the translation table relational designers need.

| Relational concept | Mendix equivalent | In our domain |
|--------------------|-------------------|---------------|
| Table | Persistent entity | `Product`, `Order` |
| Column | Attribute | `productName`, `unitPrice` |
| `ENUM` | Enumeration | `OrderStatus` |
| **Foreign key** (`product.category_id`) | **Association**, owner = child | `Category_Product` |
| **1:N** (`category 1—* product`) | One-to-many association | `Category_Product` |
| **Self-reference** (`category.parent_id → category.id`) | Self-association | `Category_Category` |
| **M:N with attributes** (`order *—* variant` via `order_item`) | **Associative entity** `OrderItem` carrying the extra columns + two references | `OrderItem` → `Order`, `OrderItem` → `ProductVariant` |
| Bare **M:N** (no attributes) | Many-to-many association *(rare in practice)* | — |
| `JOIN` | Association traversal in XPath / OQL `JOIN` | ch. 04 |
| `ON DELETE CASCADE` | On-delete = **Delete as well** | `Product_ProductVariant`, `Order_OrderItem` |
| `ON DELETE RESTRICT` | On-delete = **Delete only if no associated** (block) | `User_Order` |
| `ON DELETE SET NULL` | On-delete = **Keep** (link cleared, child kept) | `Category_Product` (orphan product) |

> **Key mental model:** Mendix *has no "many-to-many with attributes" as a single construct*. When a relationship needs data on the link (e.g. quantity, price), you create a **full entity** (`OrderItem`) and put two one-to-many associations on it. That entity *is* the relationship.

> 📘 **Many-to-many is covered in depth in [ch. 10](10-many-to-many-relationships.md)** — both the bare reference-set strategy and the junction-with-attributes strategy, with a decision matrix.

---

## 10. Access rules (security)

Each persistent entity has **access rules** that gate which **user roles** can read/write which attributes and associations. This replaces hand-written authorization in queries.

- You define XPath-constrained access per role (e.g. a `Customer` can only read `Order` where `Order_User = [%CurrentUser%]`).
- Always tick the associations a role needs to traverse — access rules cover associations too.
- In production, security must be **Production** level; every entity needs explicit rules.

> 📖 [Access Rules](https://docs.mendix.com/refguide10/access-rules/) · [Define Access Rules Using XPath](https://docs.mendix.com/refguide10/define-access-rules-using-xpath/) · [Best Practices for App Security](https://docs.mendix.com/howto10/security/best-practices-for-app-security/)

---

## 11. Cheat sheet

```
ENTITY   = table            (persistent = blue border)
ATTRIBUTE= column           (with type, required, default, validation)
ENUM     = ENUM column
ASSOCIATION = relationship, configured by:
   ├─ multiplicity   : one-to-one | one-to-many | many-to-many
   ├─ ownership      : which side stores the FK (default = the "many"/child side)
   └─ on-delete      : keep | delete-as-well | delete-only-if-none
M:N WITH ATTRIBUTES = a full associative entity (OrderItem), NOT a bare M:N association
READS ARE BIDIRECTIONAL regardless of ownership (only writes/storage care)
```

**Next:** [02-build-domain-model.md](02-build-domain-model.md) — build the entire `ECommerce` domain model step by step.
