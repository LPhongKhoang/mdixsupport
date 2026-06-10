# 02 - SELECT Clause

## Tổng quan

`SELECT` clause xác định **cột nào** sẽ được trả về từ truy vấn OQL. Đây là clause bắt buộc trong mọi truy vấn OQL.

## Cú pháp

```sql
SELECT
    [DISTINCT]
    select_expression [AS alias] [, select_expression [AS alias] ...]
```

## Các loại SELECT Expression

### 1. Chọn tất cả cột (SELECT *)

```sql
-- Trả về tất cả attributes của entity Customer
SELECT *
FROM Sales.Customer
```

> ⚠️ `SELECT *` trả về tất cả attributes. Nên liệt kê cụ thể cột cần thiết cho performance.

### 2. Chọn cột cụ thể

```sql
-- Chỉ lấy LastName và Email
SELECT LastName, Email
FROM Sales.Customer
```

### 3. Chọn cột với Module Prefix

```sql
-- Khi JOIN nhiều entity, cần chỉ định rõ entity
SELECT
    Sales.Customer/LastName,
    Sales."Order"/TotalAmount
FROM Sales.Customer
JOIN Sales.Customer/Sales.Customer_Order/Sales."Order"
```

### 4. Alias (Đổi tên cột kết quả)

```sql
SELECT
    LastName AS CustomerName,
    TotalAmount AS Amount
FROM Sales.Customer
```

> 📌 **OQL v2**: Alias là **bắt buộc** cho các expression không có tên tự nhiên (functions, subqueries, constants).

### 5. DISTINCT (Loại bỏ trùng lặp)

```sql
-- Lấy danh sách category không trùng lặp
SELECT DISTINCT Category
FROM Sales.Product
```

### 6. Function Expressions

```sql
SELECT
    UPPER(LastName) AS UpperName,        -- Hàm string
    LENGTH(FirstName) AS NameLength,      -- Độ dài string
    ROUND(Price, 2) AS RoundedPrice,      -- Làm tròn
    COALESCE(Discount, 0) AS SafeDiscount -- Xử lý NULL
FROM Sales.Product
```

### 7. Arithmetic Expressions

```sql
SELECT
    UnitPrice * Quantity AS LineTotal,
    UnitPrice * Quantity * 0.1 AS Tax,
    TotalAmount - Discount AS NetAmount
FROM Sales."Order"
```

### 8. CASE Expression

```sql
SELECT
    LastName,
    CASE TotalAmount
        WHEN 0 THEN 'Free'
        WHEN 100 THEN 'Standard'
        ELSE 'Custom'
    END AS OrderType
FROM Sales.Customer
JOIN Sales.Customer/Sales.Customer_Order/Sales."Order"
```

Hoặc dạng searched CASE:

```sql
SELECT
    LastName,
    CASE
        WHEN TotalAmount < 50 THEN 'Small'
        WHEN TotalAmount < 200 THEN 'Medium'
        WHEN TotalAmount >= 200 THEN 'Large'
        ELSE 'Unknown'
    END AS OrderSize
FROM Sales.Customer
JOIN Sales.Customer/Sales.Customer_Order/Sales."Order"
```

### 9. Aggregate Functions trong SELECT

```sql
SELECT
    COUNT(*) AS TotalOrders,
    SUM(TotalAmount) AS Revenue,
    AVG(TotalAmount) AS AverageOrder,
    MIN(TotalAmount) AS MinOrder,
    MAX(TotalAmount) AS MaxOrder
FROM Sales."Order"
```

### 10. Subquery trong SELECT

```sql
SELECT
    C/LastName,
    (
        SELECT COUNT(*)
        FROM Sales."Order" AS O
        WHERE O/Customer = C/LastName
    ) AS OrderCount
FROM Sales.Customer AS C
```

> ⚠️ **OQL v2**: Subquery trong SELECT **bắt buộc** phải có alias.

### 11. Constant Values

```sql
-- OQL v2 yêu cầu alias cho constants
SELECT
    LastName,
    'Active' AS Status,
    100 AS MaxLimit,
    NULL AS Notes
FROM Sales.Customer
```

> ⚠️ **OQL v2**: `NULL` và các constants phải có alias.

## Ví dụ thực tế

### Ví dụ 1: Báo cáo doanh thu theo khách hàng

```sql
SELECT
    C/LastName AS CustomerName,
    COUNT(*) AS OrderCount,
    SUM(O/TotalAmount) AS TotalSpent,
    AVG(O/TotalAmount) AS AvgOrderValue
FROM Sales.Customer AS C
JOIN C/Sales.Customer_Order/Sales."Order" AS O
GROUP BY C/LastName
ORDER BY TotalSpent DESC
```

### Ví dụ 2: Danh sách sản phẩm với giá đã giảm

```sql
SELECT
    ProductName,
    UnitPrice AS OriginalPrice,
    CASE
        WHEN Discount > 0 THEN UnitPrice - (UnitPrice * Discount : 100)
        ELSE UnitPrice
    END AS FinalPrice,
    COALESCE(Discount, 0) AS DiscountPercent
FROM Inventory.Product
```

### Ví dụ 3: Phân loại khách hàng theo doanh số

```sql
SELECT
    C/FirstName AS FirstName,
    C/LastName AS LastName,
    SUM(O/TotalAmount) AS TotalPurchase,
    CASE
        WHEN SUM(O/TotalAmount) >= 10000 THEN 'VIP'
        WHEN SUM(O/TotalAmount) >= 5000 THEN 'Gold'
        WHEN SUM(O/TotalAmount) >= 1000 THEN 'Silver'
        ELSE 'Standard'
    END AS CustomerTier
FROM Sales.Customer AS C
JOIN C/Sales.Customer_Order/Sales."Order" AS O
GROUP BY C/FirstName, C/LastName
```

## Những điểm cần lưu ý (OQL v2)

1. **Alias bắt buộc**: Mọi expression (function, subquery, constant) phải có alias
2. **Duplicate columns**: Khi JOIN entities có cùng attribute name, phải chỉ định rõ entity
3. **CASE types**: Tất cả result expressions trong CASE phải có cùng kiểu dữ liệu

```sql
-- ❌ KHÔNG HỢP LỆ trong OQL v2 (thiếu alias)
SELECT LastName, LENGTH(LastName) FROM Sales.Customer

-- ✅ HỢP LỆ
SELECT LastName, LENGTH(LastName) AS NameLength FROM Sales.Customer
```

## Bước tiếp theo

- [03 - FROM & JOIN Clause](03-from-join-clause.md) — Cách truy vấn từ entity và JOIN
