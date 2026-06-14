# 04 — READ Operations (Retrieve & Traverse Relationships)

Creating the graph was the hard part of **C**; reading it well is the hard part of **R**. This chapter covers the **Retrieve** activity, **XPath** over associations, **OQL v2** joins, and walking a recursive **category tree**.

## Table of contents

1. [The Retrieve activity & its three sources](#1-the-retrieve-activity--its-three-sources)
2. [Reading a single reference](#2-reading-a-single-reference)
3. [XPath over associations](#3-xpath-over-associations)
4. [OQL v2 joins (multi-table reads)](#4-oql-v2-joins-multi-table-reads)
5. [Walking the recursive category tree](#5-walking-the-recursive-category-tree)
6. [Aggregation across relationships](#6-aggregation-across-relationships)
7. [Page data sources for related data](#7-page-data-sources-for-related-data)
8. [Performance: indexes & retrieve scope](#8-performance-indexes--retrieve-scope)

---

## 1. The Retrieve activity & its three sources

The **Retrieve Object(s)** activity has three **Source** modes:

| Source | Returns | Use when |
|--------|---------|----------|
| **From database** | List (or single) matching an XPath constraint | Querying stored data |
| **From association** | The object(s) at the other end of an association, given one object | "Get this category's products", "this order's customer" |
| **By association** (microflow retrieval expression) | Single object via a path | In expressions/decisions |

> 📖 [Retrieve](https://docs.mendix.com/refguide10/retrieve/) · [Data Sources Retrieval](https://docs.mendix.com/refguide10/data-sources-retrieval/)

**From association** is the everyday tool: you already hold a `Category` object and you want its `Product`s. No XPath needed — pick the association and the direction.

---

## 2. Reading a single reference

> "What's the category of this product? Who placed this order?"

Two ways:

**A. In an expression** (no activity needed) — traverse the path:
```
$someProduct/ECommerce.Category_Product/categoryName
$someOrder/ECommerce.User_Order/userName
$someOrderItem/ECommerce.OrderItem_ProductVariant/sku
```

**B. With a Retrieve activity (From association):**
- Object: `$someProduct`
- Association: `Category_Product` → returns the **Category** (single, because it's a reference from the product side).

> Reads are **bidirectional** regardless of ownership ([ch. 01 §6](01-domain-model-concepts.md#6-ownership-who-stores-the-link)). From a `Category` you can retrieve its `Product` list even though `Product` owns the association.

---

## 3. XPath over associations

XPath is how you constrain a database retrieve by relationship. The pattern is `[Entity.Association_Name]` or `[Entity.Association_Name = $object]`.

### 3.1 All products in a category
**Retrieve** `ECommerce.Product` (From database), XPath:
```
[ECommerce.Category_Product = $category]
```

### 3.2 All orders for the current user (customer)
**Retrieve** `ECommerce.Order`, XPath:
```
[ECommerce.User_Order = '[%CurrentUser%]']
```

### 3.3 All OrderItems on a given order
**Retrieve** `ECommerce.OrderItem`, XPath:
```
[ECommerce.Order_OrderItem = $order]
```

### 3.4 Orders containing a specific variant (traverse two associations)
"Which orders include SKU X?" — go `Order ← OrderItem → ProductVariant`:
```
// ECommerce.Order that has at least one OrderItem pointing to $variant
[ECommerce.Order_OrderItem/ECommerce.OrderItem_ProductVariant = $variant]
```
Nested association traversal in XPath reads left-to-right across the graph.

### 3.5 Active sub-categories of a parent
**Retrieve** `ECommerce.Category`, XPath:
```
[ECommerce.Category_Category = $parentCategory]
[isActive = true]
```
Multiple constraints are AND-ed. (Self-ref querying details: [Querying Over Self-References](https://docs.mendix.com/refguide10/querying-over-self-references/).)

> 📖 [XPath Constraints](https://docs.mendix.com/refguide10/xpath-constraints/) · [XPath Operators](https://docs.mendix.com/refguide10/xpath-operators/) · [Filter Data Using XPath](https://docs.mendix.com/refguide10/filter-data-using-xpath/)

---

## 4. OQL v2 joins (multi-table reads)

For cross-table projections and aggregations, use **OQL** (Mendix's SQL-like query language). In **OQL v2** you join over association paths with `alias/AssociationName`. Results map to an entity (often a **non-persistent result entity** or a **View Entity**).

> OQL runs server-side, is set-based, and is far more efficient than retrieve-and-loop for reporting. See [OQL v2](https://docs.mendix.com/refguide10/oql-v2/) and the repo's [oql-guide/](../oql-guide/).

### 4.1 Orders + customer name
```sql
SELECT  o.OrderNumber  AS OrderNumber,
        o.OrderDate    AS OrderDate,
        o.TotalAmount  AS TotalAmount,
        c.UserName     AS CustomerName
FROM    ECommerce.Order o
JOIN    o/Order_User AS c
WHERE   o/OrderStatus = ECommerce.OrderStatus.Paid
ORDER BY o/OrderDate DESC
```

### 4.2 Order line detail (3-table join over the junction)
```sql
SELECT  o.OrderNumber            AS OrderNumber,
        oi.Quantity              AS Quantity,
        oi.UnitPrice             AS UnitPrice,
        oi.LineTotal             AS LineTotal,
        pv.Sku                   AS Sku,
        p.ProductName            AS ProductName
FROM    ECommerce.Order o
JOIN    o/Order_OrderItem                  AS oi
JOIN    oi/OrderItem_ProductVariant        AS pv
JOIN    pv/Product_ProductVariant          AS p
WHERE   o/OrderStatus = ECommerce.OrderStatus.Paid
```
This single query replaces: retrieve order → loop items → for each, read variant → read product. **Prefer OQL for read-heavy reporting.**

### 4.3 Revenue by category (aggregation + multi-hop join)
```sql
SELECT  cat.CategoryName        AS CategoryName,
        SUM(oi.LineTotal)       AS Revenue,
        SUM(oi.Quantity)        AS UnitsSold
FROM    ECommerce.OrderItem oi
JOIN    oi/OrderItem_ProductVariant AS pv
JOIN    pv/Product_ProductVariant   AS p
JOIN    p/Category_Product          AS cat
JOIN    oi/Order_OrderItem          AS o
WHERE   o/OrderStatus = ECommerce.OrderStatus.Paid
   OR   o/OrderStatus = ECommerce.OrderStatus.Delivered
GROUP BY cat.CategoryName
ORDER BY Revenue DESC
```

> Map OQL results onto a non-persistent entity (or a Mendix 10 **View Entity** defined directly with an OQL `SELECT`) and bind it to a Data Grid. 📖 [OQL Select Clause](https://docs.mendix.com/refguide10/oql-select-clause/) · [Use View Entities](https://docs.mendix.com/refguide10/use-view-entities/).

---

## 5. Walking the recursive category tree

A self-reference gives you **one level** of traversal in a single XPath. For the **whole subtree**, you need a strategy.

### 5.1 One level (children of a category)
```
[ECommerce.Category_Category = $parent]   // direct children only
```

### 5.2 Whole subtree — recursive microflow
Create **`DS_Category_Subtree`** (parameter: `root` Category; returns List&lt;Category&gt;):

1. **Create List** `$result` (List&lt;Category&gt;).
2. **Retrieve** children: XPath `[ECommerce.Category_Category = $root]` → `$children`.
3. **Change List** `$result` → **Add** all of `$children`.
4. **Loop** over `$children` (iterator `$child`):
   - **Microflow call** `DS_Category_Subtree($child)` → `$grandchildren`.
   - **Change List** `$result` → **Add** all of `$grandchildren`.
5. **End** → return `$result`.

> 📖 [Extracting and Using Sub-Microflows](https://docs.mendix.com/refguide10/extracting-and-using-sub-microflows/) — recursion is just a microflow calling itself.

### 5.3 Performance alternative — denormalize the tree
For deep/frequently-queried trees, store a **materialized path** or **level** attribute (e.g. `path = "/1/4/9"`) so a subtree is a single `contains(path, ...)` query. See [ch. 07](07-advanced-relationship-patterns.md) and the official [Denormalize Data to Improve Performance](https://docs.mendix.com/howto10/data-models/denormalize-data-to-improve-performance/).

---

## 6. Aggregation across relationships

Two ways to aggregate:

**A. XPath aggregate functions** (quick counts/sums):
```
// count of a user's orders
count(ECommerce.Order[ECommerce.User_Order = '[%CurrentUser%]'])

// sum of a product's variant stock
sum(ECommerce.ProductVariant[ECommerce.Product_ProductVariant = $product]/stockQuantity)
```

**B. Aggregate List activity** (over an already-retrieved list):
- Retrieve an Order's `OrderItem`s → **Aggregate List** → `Sum` of `lineTotal` → order total.

> 📖 [XPath Aggregate Functions](https://docs.mendix.com/refguide10/xpath-aggregate-functions/) · [Aggregate List](https://docs.mendix.com/refguide10/aggregate-list/)

---

## 7. Page data sources for related data

| Widget / source | Bind relationship example |
|-----------------|---------------------------|
| **Data View**, Data source = **Association** | Detail page of an `Order`; nested Data View shows the `User` via `Order_User`. |
| **Data Grid**, Database source + XPath | Products where `[Category_Product = $category]`. |
| **Data Grid**, **Association source** | On a Category detail page, a grid of its Products with no XPath — just association source. |
| **List View**, **Listen to widget** source | Click a Category → List View of Products updates (master-detail). |
| **Microflow source** | Use `DS_Category_Subtree` (recursive) or an OQL-backed list for complex reads. |

> 📖 [Data Sources](https://docs.mendix.com/refguide10/data-sources/) · [Association Source](https://docs.mendix.com/refguide10/association-source/) · [Listen to Widget Source](https://docs.mendix.com/refguide10/listen-to-widget-source/)

---

## 8. Performance: indexes & retrieve scope

- **Add indexes** on attributes you filter/sort often — e.g. `Product.productCode`, `Order.orderNumber`, `Order.orderStatus`. Also index association-traversed foreign attributes where supported. 📖 [Indexes](https://docs.mendix.com/refguide10/indexes/)
- **Retrieve only what you need.** Avoid retrieving huge lists into memory then filtering — push the filter into XPath so the DB does the work.
- **Prefer OQL** for cross-entity reporting over retrieve-and-loop.
- **Mind access rules**: a retrieve silently returns only rows the user role can read. ([ch. 09](09-best-practices-checklist.md))

**Next:** [05-update-operations.md](05-update-operations.md) — change attributes and **reassign associations**.
