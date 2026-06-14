# CRUD & Relationships in Mendix Studio Pro v10 — E-Commerce Application Guide

> **Mendix Studio Pro:** v10.24.x (LTS) · **Domain:** E-Commerce (Product, Category, Supplier, ProductVariant, Order, OrderItem, Shipping, User) · **Source DB design:** [`planning-db-design/`](../../planning-db-design/)

## Why this guide exists

Most "CRUD" tutorials stop at a single isolated entity. Real applications are **graphs of related entities**, and the hard parts are all about the relationships:

- How do I **insert** an Order together with its line items and shipping in one operation?
- How do I **read** a category tree, or every OrderItem for a customer's orders?
- How do I **update** an association — move a Product to a new Category, reassign an Order's customer?
- How do I **delete** an Order without orphaning line items — and block deleting a User who still has Orders?

This guide answers all of that, end-to-end, in **Mendix Studio Pro v10**, following the official best practices
([Development Best Practices](https://docs.mendix.com/refguide10/dev-best-practices/),
[Domain Model](https://docs.mendix.com/refguide10/domain-model/),
[Association Properties](https://docs.mendix.com/refguide10/association-properties/),
[Object Activities](https://docs.mendix.com/refguide10/object-activities/),
[Microflows](https://docs.mendix.com/refguide10/microflows/)).

## The domain model at a glance

```
   ┌────────────┐         ┌──────────────┐         ┌──────────────────┐
   │   User     │ 1─────* │    Order     │ 1─────* │    OrderItem     │  ← associative / junction entity
   │────────────│         │──────────────│         │──────────────────│    (carries quantity, unitPrice)
   │ userRole   │         │ orderStatus  │         │ quantity         │
   │ email      │         │ totalAmount  │         │ unitPrice        │
   └────────────┘         └──────┬───────┘         └────────┬─────────┘
                                 │ 1                        * │
                                 │                            │ *
                           ┌─────┴──────┐               ┌─────▼──────────┐
                           │  Shipping  │               │ ProductVariant │
                           │────────────│               │────────────────│
                           │ tracking#  │               │ sku            │
                           │ carrier    │               │ price / stock  │
                           └────────────┘               └───────┬────────┘
                                                                │ *
                                                         ┌──────▼───────┐     ┌──────────────┐
                                                         │   Product    │ 1─* │   Category   │ ← self-reference (tree)
                                                         │──────────────│◄───►│──────────────│   parent → children
                                                         │ productCode  │     └──────────────┘
                                                         │ basePrice    │
                                                         └──────┬───────┘
                                                                │ *
                                                         ┌──────▼───────┐
                                                         │   Supplier   │
                                                         │──────────────│
                                                         │ supplierCode │
                                                         └──────────────┘
```

### The 8 relationships this guide teaches

| # | Association | Multiplicity | Owner (FK side) | On-Delete Behavior | Relationship pattern |
|---|-------------|--------------|-----------------|--------------------|----------------------|
| 1 | `Category_Category` (parent→child) | One-to-many **(self)** | child (sub-category) | Keep *(microflow handles tree)* | **Self-referencing tree** |
| 2 | `Category_Product` | One-to-many | `Product` | Keep | 1:N — product belongs to a category |
| 3 | `Supplier_Product` | One-to-many | `Product` | Keep | 1:N — product supplied by |
| 4 | `Product_ProductVariant` | One-to-many | `ProductVariant` | **Delete as well** (cascade) | 1:N — variants die with product |
| 5 | `User_Order` | One-to-many | `Order` | **Delete only if no associated** (block) | 1:N — referential integrity |
| 6 | `Order_OrderItem` | One-to-many | `OrderItem` | **Delete as well** (cascade) | 1:N — line items die with order |
| 7 | `OrderItem_ProductVariant` | Many-to-one | `OrderItem` | Keep | **M:N via junction** (OrderItem) with attributes |
| 8 | `Order_Shipping` | One-to-many | `Shipping` | Keep | 1:N — shipments per order |

> If you can model and CRUD these eight relationships, you can model essentially any business domain in Mendix.

## Chapter list

| # | File | What you learn |
|---|------|----------------|
| 01 | [01-domain-model-concepts.md](01-domain-model-concepts.md) | Relational → Mendix mapping; entities, associations, **ownership**, **multiplicity**, **on-delete behavior**, enumerations, access rules. *Read this first.* |
| 02 | [02-build-domain-model.md](02-build-domain-model.md) | Step-by-step: create module `ECommerce`, all 8 entities, 3 enumerations, all 8 associations with exact owner/multiplicity/delete config. |
| 03 | [03-create-operations.md](03-create-operations.md) | **Insert**: simple object, with a reference, with a self-ref parent, with a junction line, and a **full Order + OrderItems + Shipping graph** in one transaction. |
| 04 | [04-read-operations.md](04-read-operations.md) | **Read**: retrieve-by-association, XPath over associations, **OQL v2 joins**, recursive category tree, aggregation. |
| 05 | [05-update-operations.md](05-update-operations.md) | **Update**: change attributes, **reassign an association** (move category, change supplier, reassign order's customer), bulk update, validation. |
| 06 | [06-delete-operations.md](06-delete-operations.md) | **Delete**: configure on-delete behavior, cascade vs keep vs block, recursive tree deletion, referential integrity error handling. |
| 07 | [07-advanced-relationship-patterns.md](07-advanced-relationship-patterns.md) | Deep-copy a graph, **denormalization** for performance, audit logging across relationships, stock reservation (optionality + validation). |
| 08 | [08-pages-and-ui-for-relationships.md](08-pages-and-ui-for-relationships.md) | Reference Selector, Reference Set Selector, nested Data Views, Association-source grids, popup forms for related entities. |
| 09 | [09-best-practices-checklist.md](09-best-practices-checklist.md) | Naming, security/access rules, performance, transaction & commit discipline, full testing checklist. |

## Suggested learning path

```
01 concepts ──► 02 build model ──► 03 CREATE ──► 04 READ
                                                      │
   09 best practices ◄── 08 UI ◄── 07 advanced ◄── 06 DELETE ◄── 05 UPDATE
```

Each chapter assumes the previous one's model exists. Steps that repeat (e.g. "create an entity") are written out in full the first time and referenced afterwards.

## Prerequisites

- **Mendix Studio Pro v10.24.x** installed (this guide targets v10 LTS).
- Basic familiarity with the Studio Pro UI (App Explorer, Domain Model editor, Microflow editor, Page editor).
- A local database (built-in H2 is fine for the tutorial; production should use PostgreSQL — see [`planning-db-design/schema.prisma`](../../planning-db-design/schema.prisma) for the reference relational schema).

## Conventions used

| Element | Convention | Example |
|---------|-----------|---------|
| Module | PascalCase | `ECommerce` |
| Entity | PascalCase | `Product`, `OrderItem` |
| Attribute | camelCase | `productName`, `unitPrice` |
| Association | `{Parent}_{Child}` | `Category_Product`, `Order_OrderItem` |
| Enumeration | PascalCase, values PascalCase | `OrderStatus` → `Pending`, `Paid` |
| Microflow | `ACT_{Entity}_{Action}` / `DS_{Entity}_{Purpose}` | `ACT_Order_CreateWithItems`, `DS_Order_ByCustomer` |

## References

- [Development Best Practices](https://docs.mendix.com/refguide10/dev-best-practices/)
- [Domain Model](https://docs.mendix.com/refguide10/domain-model/)
- [Association Properties](https://docs.mendix.com/refguide10/association-properties/)
- [Association Tab Properties (Owner)](https://docs.mendix.com/refguide10/association-tab-properties/)
- [Querying Over Self-References](https://docs.mendix.com/refguide10/querying-over-self-references/)
- [Generalization vs 1-to-1 Associations](https://docs.mendix.com/refguide10/generalization-vs-1-to-1-associations/)
- [Object Activities](https://docs.mendix.com/refguide10/object-activities/) — Create / Change / Commit / Delete / Retrieve / Rollback
- [Microflows](https://docs.mendix.com/refguide10/microflows/)
- [OQL v2](https://docs.mendix.com/refguide10/oql-v2/)
- [Denormalize Data to Improve Performance](https://docs.mendix.com/howto10/data-models/denormalize-data-to-improve-performance/)
- Related in this repo: [`frontend-state-management/01-domain-model.md`](../frontend-state-management/01-domain-model.md) (Product/Category/Supplier/Variant model)
