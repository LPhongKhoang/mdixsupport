# 05 - GROUP BY & HAVING

## Tổng quan

- **GROUP BY**: Nhóm các bản ghi có cùng giá trị thành các hàng tóm tắt
- **HAVING**: Lọc kết quả sau khi đã nhóm (giống WHERE nhưng cho aggregated data)

## GROUP BY Clause

### Cú pháp

```sql
GROUP BY expression [, ...n]
[HAVING <constraint>]
```

### Quy tắc

1. SELECT chỉ chứa: **aggregate functions** và/hoặc **columns trong GROUP BY**
2. Attribute trong SELECT nhưng không có trong GROUP BY → **lỗi**
3. Thường kết hợp với: `COUNT()`, `SUM()`, `AVG()`, `MIN()`, `MAX()`

### Ví dụ cơ bản

#### Nhóm theo 1 cột

```sql
-- Tổng tồn kho theo Brand
SELECT
    Brand,
    SUM(Stock) AS TotalStock
FROM Sales.Location
GROUP BY Brand
```

Kết quả:

| Brand | TotalStock |
|-------|-----------|
| Nike | 1500 |
| Adidas | 2300 |
| Puma | 800 |

#### Nhóm theo nhiều cột

```sql
-- Tồn kho theo Brand và City
SELECT
    Brand,
    City,
    SUM(Stock) AS TotalStock
FROM Sales.Location
GROUP BY Brand, City
```

#### Nhiều Aggregate Functions

```sql
SELECT
    Brand,
    SUM(Stock) AS TotalStock,
    MIN(Stock) AS MinStock,
    MAX(Stock) AS MaxStock,
    AVG(Stock) AS AvgStock,
    COUNT(*) AS LocationCount
FROM Sales.Location
GROUP BY Brand
```

#### Kết hợp Functions trong GROUP BY

```sql
SELECT
    Brand,
    LENGTH(Brand) AS NameLength,
    SUM(Stock) AS TotalStock
FROM Sales.Location
GROUP BY Brand
```

#### GROUP BY với JOIN

```sql
-- Doanh thu theo khách hàng
SELECT
    C/LastName AS CustomerName,
    COUNT(*) AS OrderCount,
    SUM(O/TotalAmount) AS TotalSpent,
    AVG(O/TotalAmount) AS AvgOrder
FROM Sales.Customer AS C
JOIN C/Sales.Customer_Order/Sales."Order" AS O
GROUP BY C/LastName
```

#### GROUP BY với DATEPART

```sql
-- Doanh thu theo tháng
SELECT
    DATEPART(YEAR, O/OrderDate) AS OrderYear,
    DATEPART(MONTH, O/OrderDate) AS OrderMonth,
    SUM(O/TotalAmount) AS MonthlyRevenue,
    COUNT(*) AS OrderCount
FROM Sales."Order" AS O
GROUP BY DATEPART(YEAR, O/OrderDate), DATEPART(MONTH, O/OrderDate)
ORDER BY OrderYear, OrderMonth
```

### OQL V2: GROUP BY Association không còn được phép

```sql
-- ❌ KHÔNG HỢP LỆ trong OQL v2
SELECT COUNT(*) AS count
FROM Module.Person
GROUP BY Module.Person/Module.Person_City/Module.City/Name

-- ✅ HỢP LỆ - Dùng JOIN pattern
SELECT COUNT(*) AS count
FROM Module.Person AS P
JOIN Module.Person/Module.Person_City/Module.City AS C
GROUP BY C/Name
```

## HAVING Clause

### Tổng quan

`HAVING` lọc kết quả **sau khi GROUP BY**. Khác với `WHERE` lọc **trước khi nhóm**.

### Cú pháp

```sql
GROUP BY expression [, ...n]
HAVING <constraint>
```

### Ví dụ

#### Lọc nhóm theo điều kiện aggregate

```sql
-- Chỉ lấy brands có nhiều hơn 1 location
SELECT
    Brand,
    SUM(Stock) AS TotalStock,
    COUNT(*) AS LocationCount
FROM Sales.Location
GROUP BY Brand
HAVING COUNT(*) > 1
```

#### HAVING với nhiều điều kiện

```sql
-- Brands có tổng tồn kho > 500 VÀ nhiều hơn 2 locations
SELECT
    Brand,
    SUM(Stock) AS TotalStock,
    COUNT(*) AS LocationCount
FROM Sales.Location
GROUP BY Brand
HAVING SUM(Stock) > 500 AND COUNT(*) > 2
```

#### HAVING với subquery

```sql
-- Cities có tổng tồn kho ít hơn tổng số locations
SELECT
    COUNT(*) AS LocationCount,
    SUM(Stock) AS CityStock,
    City
FROM Sales.Location AS Location
GROUP BY City
HAVING SUM(Stock) <= (SELECT COUNT(*) FROM Sales.Location)
```

#### HAVING với aggregate không có trong SELECT

```sql
-- Lọc theo MIN stock dù không hiển thị MIN
SELECT
    Brand,
    SUM(Stock) AS TotalStock
FROM Sales.Location
GROUP BY Brand
HAVING MIN(Stock) > 10
```

## Sự khác biệt WHERE vs HAVING

| Tiêu chí | WHERE | HAVING |
|-----------|-------|--------|
| **Thời điểm lọc** | Trước GROUP BY | Sau GROUP BY |
| **Có thể dùng aggregate** | ❌ Không | ✅ Có |
| **Có thể dùng column không GROUP BY** | ✅ Có | ❌ Không (trong aggregate) |
| **Mục đích** | Lọc bản ghi gốc | Lọc nhóm kết quả |

```sql
-- WHERE + HAVING cùng lúc
SELECT
    Brand,
    City,
    SUM(Stock) AS TotalStock
FROM Sales.Location
WHERE City != 'Hà Nội'          -- Lọc trước: bỏ Ha Noi
GROUP BY Brand, City
HAVING SUM(Stock) > 100         -- Lọc sau: chỉ nhóm có tổng > 100
```

## Ví dụ thực tế

### Ví dụ 1: Top 10 khách hàng theo doanh thu

```sql
SELECT
    C/LastName AS CustomerName,
    C/Email,
    COUNT(*) AS OrderCount,
    SUM(O/TotalAmount) AS TotalSpent,
    AVG(O/TotalAmount) AS AvgOrderValue
FROM Sales.Customer AS C
JOIN C/Sales.Customer_Order/Sales."Order" AS O
WHERE O/IsPaid = true
GROUP BY C/LastName, C/Email
HAVING SUM(O/TotalAmount) > 1000
ORDER BY TotalSpent DESC
LIMIT 10
```

### Ví dụ 2: Báo cáo doanh thu hàng tháng

```sql
SELECT
    DATEPART(YEAR, OrderDate) AS Year,
    DATEPART(MONTH, OrderDate) AS Month,
    COUNT(*) AS TotalOrders,
    SUM(TotalAmount) AS Revenue,
    AVG(TotalAmount) AS AvgOrderValue,
    MIN(TotalAmount) AS MinOrder,
    MAX(TotalAmount) AS MaxOrder
FROM Sales."Order"
WHERE IsPaid = true
GROUP BY DATEPART(YEAR, OrderDate), DATEPART(MONTH, OrderDate)
ORDER BY Year DESC, Month DESC
```

### Ví dụ 3: Phân tích sản phẩm theo danh mục

```sql
SELECT
    Cat/CategoryName AS Category,
    COUNT(*) AS ProductCount,
    SUM(P/StockQuantity) AS TotalStock,
    AVG(P/UnitPrice) AS AvgPrice,
    SUM(P/StockQuantity * P/UnitPrice) AS InventoryValue
FROM Inventory.Category AS Cat
JOIN Cat/Inventory.Category_Product/Inventory.Product AS P
WHERE P/IsActive = true
GROUP BY Cat/CategoryName
HAVING COUNT(*) > 0
ORDER BY InventoryValue DESC
```

## Lưu ý

1. **Alias trong GROUP BY**: Hành vi phụ thuộc vào database vendor — nên dùng expression gốc
2. **Subquery trong GROUP BY**: Hành vi phụ thuộc vào database vendor
3. **SELECT chỉ chứa GROUP BY columns + aggregates**: Attribute trong SELECT mà không có trong GROUP BY sẽ gây lỗi

## Bước tiếp theo

- [06 - ORDER BY, LIMIT, OFFSET](06-order-by-limit.md) — Sắp xếp và phân trang
