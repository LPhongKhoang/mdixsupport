# 10 — Many-to-Many Relationships (Complete Treatment)

Chapters 02–06 use `OrderItem` as the *one* many-to-many example (a junction with attributes). Real domains need M:N in several shapes, and Mendix gives you **two distinct strategies**. This chapter adds three new M:N relationships to the model and shows CRUD for both strategies.

> **Build this on top of [ch. 02](02-build-domain-model.md).** Add the new entities/associations below to your existing `ECommerce` domain model.

## Table of contents

1. [The two strategies & a decision matrix](#1-the-two-strategies--a-decision-matrix)
2. [Additions to the domain model](#2-additions-to-the-domain-model)
3. [Strategy A — Bare M:N: Product ↔ Tag](#3-strategy-a--bare-mn-product--tag)
4. [Strategy A — Bare M:N: User ↔ Product (favorites)](#4-strategy-a--bare-mn-user--product-favorites)
5. [Strategy B — M:N with attributes: Supplier ↔ Product via `ProductSupplier`](#5-strategy-b--mn-with-attributes-supplier--product-via-productsupplier)
6. [Querying M:N (XPath & OQL)](#6-querying-mn-xpath--oql)
7. [Delete behavior for M:N](#7-delete-behavior-for-mn)
8. [Pitfalls](#8-pitfalls)

---

## 1. The two strategies & a decision matrix

| | **Strategy A — Bare M:N** (reference set association) | **Strategy B — Junction entity** (full entity + two references) |
|---|--------------------------------------------------------|----------------------------------------------------------------|
| What it is | A many-to-many **association** drawn directly between two entities | A **real entity** (`OrderItem`, `ProductSupplier`) that owns a reference to each side |
| Carries data on the link? | ❌ No | ✅ Yes (quantity, price, lead time…) |
| Need a separate object to act on the link? | ❌ No | ✅ Yes — the junction row *is* the relationship |
| Querying | XPath over the association, both directions | XPath/OQL joining through the junction |
| Best for | Tagging, favorites, simple "linked" sets | Anything where the relationship itself has attributes or lifecycle |
| Our examples | `Product_Tags`, `User_FavoriteProducts` | `OrderItem`, `ProductSupplier` |

> **Golden rule (recap of [ch. 01 §9](01-domain-model-concepts.md#9-mapping-relational-patterns-to-mendix)):** if the relationship needs **even one attribute** (a timestamp, a flag, a price, a quantity), use **Strategy B**. A bare reference set cannot hold attributes.

---

## 2. Additions to the domain model

Add to `ECommerce`:

### 2.1 New entity `Tag` (for bare M:N)
| Attribute | Type | Required | Notes |
|-----------|------|----------|-------|
| `name` | String (50) | ✅ | e.g. "Eco-friendly", "Best seller" |
| `color` | String (7) | | `#RRGGBB` for UI |

### 2.2 New entity `ProductSupplier` (junction, M:N with attributes)
| Attribute | Type | Required | Default | Notes |
|-----------|------|----------|---------|-------|
| `leadTimeDays` | Integer | ✅ | `7` | supplier lead time for this product |
| `contractPrice` | Decimal (15,2) | ✅ | `0.00` | negotiated price |
| `minimumOrderQuantity` | Integer | ✅ | `1` | |
| `isPreferred` | Boolean | ✅ | `false` | at most one preferred supplier per product |

### 2.3 New associations
| # | Association | Multiplicity | Owner | On-delete | Strategy |
|---|-------------|--------------|-------|-----------|----------|
| 9 | `Product_Tags` (Product ↔ Tag) | **Many-to-many** | `Product` *(Product objects refer to Tag objects)* | Keep | A — bare |
| 10 | `User_FavoriteProducts` (User ↔ Product) | **Many-to-many** | `User` | Keep | A — bare |
| 11 | `ProductSupplier_Product` (ProductSupplier → Product) | one-to-many (ref) | `ProductSupplier` | Keep / **Block** (Product side) | B — junction |
| 12 | `ProductSupplier_Supplier` (ProductSupplier → Supplier) | one-to-many (ref) | `ProductSupplier` | Keep | B — junction |

> `ProductSupplier` is to **Supplier ↔ Product** what `OrderItem` is to **Order ↔ ProductVariant`. It *is* the many-to-many, and it carries `leadTimeDays`, `contractPrice`, etc. on the link. (Chapter 02's simple `Supplier_Product` 1:N stays as the baseline single-supplier model; use the junction when a product has multiple suppliers with different terms.)

> 📖 [Association Properties → Multiplicity](https://docs.mendix.com/refguide10/association-properties/) · [Association Tab Properties → Owner / Type](https://docs.mendix.com/refguide10/association-tab-properties/)

---

## 3. Strategy A — Bare M:N: Product ↔ Tag

A many-to-many **association** with no extra data. The owner (`Product`) holds the reference set.

### 3.1 Read (no microflow needed)
- On a **Product detail** page, a **Reference Set Selector** over `Product_Tags` shows all tags; type-ahead to add.
- A Data Grid of Products can show a column listing tags (reference set display).
- XPath: products tagged "Eco-friendly": retrieve `Product` where
  ```
  [ECommerce.Product_Tags/ECommerce.Tag/name = 'Eco-friendly']
  ```

### 3.2 Create / add tags (microflow)
**`ACT_Product_AddTags`**, params: `product` (Product), `tags` (List&lt;Tag&gt;):

1. **Change Object** `$product` (Commit: ☑, Refresh in client ☑)
   - Association `Product.Product_Tags` → operation **Add** → `$tags`
2. **End**.

> The three reference-set operations in **Change Object** are **Add**, **Remove**, and **Set** (replace the whole set). Add/Remove take a **list**; Set takes a list and replaces everything.

### 3.3 Remove a tag from one product
**`ACT_Product_RemoveTag`**, params: `product`, `tag`:
1. **Change Object** `$product` → `Product_Tags` → **Remove** → a single-item list containing `$tag` (use **Create List** + Add `$tag`).
2. Commit.

### 3.4 Untag everywhere / delete a tag
Deleting a `Tag` object: because `Product_Tags` on-delete = **Keep**, Mendix **unlinks** the tag from every product (the products survive). If you want to *forbid* deleting an in-use tag, set on-delete = **Delete only if there are no associated** with a message ("Tag is in use by N products").

> 📖 [Change Object](https://docs.mendix.com/refguide10/change-object/) · [Reference Set Selector](https://docs.mendix.com/refguide10/reference-set-selector/)

---

## 4. Strategy A — Bare M:N: User ↔ Product (favorites)

Same mechanics, **owner is the other entity** (`User`) — shows the direction is just a choice.

### 4.1 Favorite a product
**`ACT_User_AddFavorite`**, params: `user` (User), `product` (Product):
1. **Change Object** `$user` → `User_FavoriteProducts` → **Add** → list with `$product`.
2. Commit.

### 4.2 A user's favorites (read)
- Association source on a User detail page → reference set of Products.
- XPath: `ECommerce.Product[ECommerce.User_FavoriteProducts = '[%CurrentUser%]']` (the current user's wishlist).

### 4.3 "Who favorited this product?" (read the other direction)
Reads are bidirectional regardless of ownership ([ch. 01 §6](01-domain-model-concepts.md#6-ownership-who-stores-the-link)):
```
count(ECommerce.User[ECommerce.User_FavoriteProducts = $product])
```

---

## 5. Strategy B — M:N with attributes: Supplier ↔ Product via `ProductSupplier`

When the link itself has data (lead time, contract price, MOQ, preferred flag), model it as a **junction entity** — exactly like `OrderItem`.

### 5.1 Create a supply link
**`ACT_ProductSupplier_Create`**, params: `product`, `supplier`, `leadTimeDays`, `contractPrice`, `minimumOrderQuantity`:

1. **Create Object** `ProductSupplier` (Commit: ☐)
   - Attributes: `leadTimeDays`, `contractPrice`, `minimumOrderQuantity`, `isPreferred = false`
   - Associations:
     - `ProductSupplier.ProductSupplier_Product (Product)` = `$product`
     - `ProductSupplier.ProductSupplier_Supplier (Supplier)` = `$supplier`

   ```
   $product ◄── ProductSupplier ──► $supplier
              (leadTimeDays, contractPrice, MOQ, isPreferred)
   ```
2. **Validation** — **Exclusive Split** "only one preferred supplier per product":
   `$existingPreferred = count(ProductSupplier[ProductSupplier_Product = $product][isPreferred = true])`
   `if $isPreferred and $existingPreferred > 0 then` → show "Already has a preferred supplier" → End.
3. **Commit** `$newLink`.

### 5.2 Read — all suppliers & terms for a product (OQL)
```sql
SELECT  s.SupplierName        AS SupplierName,
        ps.ContractPrice      AS ContractPrice,
        ps.LeadTimeDays       AS LeadTimeDays,
        ps.MinimumOrderQuantity AS MOQ,
        ps.IsPreferred        AS IsPreferred
FROM    ECommerce.ProductSupplier ps
JOIN    ps/ProductSupplier_Supplier AS s
WHERE   ps/ProductSupplier_Product = $product
ORDER BY ps.IsPreferred DESC, ps.ContractPrice ASC
```

### 5.3 Read — cheapest supplier for a product (XPath, in a microflow)
```
// first ProductSupplier for this product, cheapest ContractPrice
ProductSupplier[ProductSupplier_Product = $product]
ORDER BY ContractPrice ASC
// retrieve Range = First
```

### 5.4 Update — renegotiate a contract price
**`ACT_ProductSupplier_UpdatePrice`**, params: `link` (ProductSupplier), `newPrice`:
1. **Change Object** `$link` → `contractPrice = $newPrice`. Commit.

### 5.5 Update — set preferred supplier (with the one-per-product rule)
**`ACT_ProductSupplier_SetPreferred`**, params: `link` (ProductSupplier):
1. Retrieve existing preferred for the same product: `ProductSupplier[ProductSupplier_Product = $link/ProductSupplier_Product][isPreferred = true]` → `$oldPreferred`.
2. **Loop** `$oldPreferred`: **Change Object** → `isPreferred = false` (Commit: ☐).
3. **Change Object** `$link` → `isPreferred = true`.
4. Commit `$link` + `$oldPreferred`.

### 5.6 Delete — drop a supply relationship
**`ACT_ProductSupplier_Delete`**, param: `link`:
1. **Delete Object(s)** `$link`.
   - Neither the `Product` nor the `Supplier` is touched (on-delete = **Keep**). If you want to block removing the *only* supplier for a product, pre-check with `count()` first.

> This is structurally identical to [ch. 03 §6](03-create-operations.md#6-pattern-d--create-a-junction-row-orderitem--order--productvariant) and [ch. 06 §3](06-delete-operations.md#3-pattern-a--leaf-delete-shipping). Once you've seen one junction, you've seen them all.

---

## 6. Querying M:N (XPath & OQL)

**Bare M:N** — traverse the association directly:
```
// products that share at least one tag with $product
ECommerce.Product[ECommerce.Product_Tags/ECommerce.Tag
                    = $product/ECommerce.Product_Tags]
[id != $product/id]
```

**Junction M:N** — join through the junction (here: products supplied by a given supplier):
```sql
SELECT  p.ProductName   AS ProductName,
        ps.ContractPrice AS ContractPrice
FROM    ECommerce.ProductSupplier ps
JOIN    ps/ProductSupplier_Product AS p
WHERE   ps/ProductSupplier_Supplier = $supplier
```

Multi-hop through two junctions is fine too — e.g. orders (via `OrderItem` → `ProductVariant` → `Product` → `ProductSupplier`) for a given supplier. Prefer **OQL** for any reporting across junctions ([ch. 04 §4](04-read-operations.md#4-oql-v2-joins-multi-table-reads)).

---

## 7. Delete behavior for M:N

| What you delete | Bare M:N (reference set) | Junction M:N |
|-----------------|--------------------------|--------------|
| One side's link only | **Change Object → Remove** (other object kept) | Delete the junction row |
| An object on one side | Configured on-delete: **Keep** unlinks it everywhere; **Block** prevents deleting an in-use object | Same as any entity (junction rows reference it — usually **Keep** or **Block**) |
| The whole relationship | Remove the association, or delete all junction rows | Delete all `ProductSupplier` rows for a product |

For both strategies, **Keep** is the safe default; use **Delete only if no associated** (block) when an object must not vanish while referenced (e.g. a `Tag` used by 50 products).

---

## 8. Pitfalls

| Pitfall | Fix |
|---------|-----|
| "I need a timestamp on the favorite link" — but it's a bare reference set | Switch to a **junction entity** (`Favorite` with `addedAt`). Bare M:N can't hold attributes. |
| Adding a tag doesn't show up | You changed the set but didn't **Commit** (or Refresh in client). Commit the owner after Add/Remove. |
| Two preferred suppliers for one product | No guard. Add the count-check before setting `isPreferred` (§5.5). |
| Slow "products with tag X" list | Add an index / use XPath over the association (set-based), not retrieve-all-and-filter. |
| Owner chosen wrong → can't Add from the side you wanted | For a reference set you can **read** both ways, but **writes** happen on the **owner**. Set Add/Remove on the owner; or change navigability so the entity you edit owns the set. |
| Deleting a Product silently drops wishlist/favorite links | That's **Keep** behavior (correct for orphans). If unacceptable, block or soft-delete the product. |

---

✅ You now have **four** many-to-many relationships in the model — two bare (`Product_Tags`, `User_FavoriteProducts`) and two junction (`OrderItem`, `ProductSupplier`) — covering every M:N shape you'll meet.

**See also:** [ch. 04 §3.4](04-read-operations.md#34-orders-containing-a-specific-variant-traverse-two-associations) (XPath through a junction) · [ch. 04 §4.2](04-read-operations.md#42-order-line-detail-3-table-join-over-the-junction) (OQL through a junction) · [ch. 09 §7](09-best-practices-checklist.md#7-data-modeling-decisions-recap) (modeling decisions).
