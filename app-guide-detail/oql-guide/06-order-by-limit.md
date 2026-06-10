# 06 - ORDER BY, LIMIT & OFFSET

## ORDER BY Clause

### Cú pháp

```sql
ORDER BY { order_by_expression [ ASC | DESC ] } [, ...n]
```

### Quy tắc

- `ASC` (tăng dần) là mặc định — có thể bỏ qua
- `DESC` (giảm dần) — phải chỉ định rõ
- Nhiều tiêu chí sắp xếp: ưu tiên từ trái sang phải
- Có thể sắp xếp theo cột không có trong SELECT (trừ khi dùng DISTINCT hoặc GROUP BY)
- **Không dùng function của attribute** trong ORDER BY

### Ví dụ cơ bản

```sql
-- Sắp xếp tăng dần (mặc định)
SELECT LastName, FirstName FROM Sales.Customer
ORDER BY LastName

-- Sắp xếp giảm dần
SELECT LastName, TotalAmount FROM Sales.Customer
ORDER BY TotalAmount DESC

-- Nhiều tiêu chí
SELECT LastName, FirstName, Age FROM Sales.Customer
ORDER BY LastName ASC, FirstName ASC
```

### ORDER BY qua Association

```sql
SELECT LastName FROM Sales.Customer
ORDER BY Sales.Customer/Sales.Customer_Request/Sales.Request/Number
```

### ORDER BY trong View Entities (OQL v2)

> ⚠️ **OQL v2**: ORDER BY trong View Entities **chỉ được phép** khi đi kèm LIMIT và/hoặc OFFSET. View entities không có thứ tự tự nhiên.

```sql
-- ✅ HỢP LỆ - ORDER BY + LIMIT trong View Entity
SELECT LastName, TotalAmount
FROM Sales.Customer
ORDER BY TotalAmount DESC
LIMIT 10

-- ❌ KHÔNG HỢP LỆ trong View Entity - ORDER BY không có LIMIT
SELECT LastName, TotalAmount
FROM Sales.Customer
ORDER BY TotalAmount DESC
```

### ORDER BY trong Subquery (OQL v2)

> ⚠️ **OQL v2**: Subquery chứa ORDER BY phải đi kèm LIMIT và/hoặc OFFSET.

```sql
-- ✅ HỢP LỆ
SELECT *
FROM (
    SELECT Name FROM Module.Person
    ORDER BY Name
    LIMIT 20
)

-- ❌ KHÔNG HỢP LỆ trong OQL v2
SELECT *
FROM (
    SELECT Name FROM Module.Person
    ORDER BY Name
)
```

## LIMIT Clause

### Cú pháp

```sql
LIMIT number
```

### Mô tả

Giới hạn số lượng bản ghi trả về. Nên kết hợp với ORDER BY.

### Ví dụ

```sql
-- Top 5 đơn hàng giá trị cao nhất
SELECT LastName, TotalAmount
FROM Sales.Customer
JOIN Sales.Customer/Sales.Customer_Order/Sales."Order"
ORDER BY TotalAmount DESC
LIMIT 5
```

### LIMIT với Parameters

```sql
-- $pageSize là parameter truyền vào
SELECT LastName, TotalAmount
FROM Sales.Customer
ORDER BY LastName
LIMIT $pageSize
```

## OFFSET Clause

### Cú pháp

```sql
OFFSET number
```

### Mô tả

Bỏ qua N bản ghi đầu tiên. Thường dùng với LIMIT để phân trang.

### Ví dụ

```sql
-- Bỏ qua 10 bản ghi đầu, lấy 10 tiếp theo (trang 2)
SELECT LastName, TotalAmount
FROM Sales.Customer
ORDER BY LastName
LIMIT 10 OFFSET 10

-- Bỏ qua 20 bản ghi đầu (trang 3)
LIMIT 10 OFFSET 20
```

## Phân trang (Paging) Pattern

### Công thức phân trang

```
OFFSET = (pageNumber - 1) × pageSize
LIMIT = pageSize
```

| Trang | OFFSET | LIMIT |
|-------|--------|-------|
| 1 | 0 | 10 |
| 2 | 10 | 10 |
| 3 | 20 | 10 |
| N | (N-1)×10 | 10 |

### Ví dụ: Phân trang đơn hàng

```sql
-- Trang 1 (bản ghi 1-10)
SELECT OrderNumber, CustomerName, TotalAmount, OrderDate
FROM Sales."Order"
ORDER BY OrderDate DESC
LIMIT 10 OFFSET 0

-- Trang 2 (bản ghi 11-20)
SELECT OrderNumber, CustomerName, TotalAmount, OrderDate
FROM Sales."Order"
ORDER BY OrderDate DESC
LIMIT 10 OFFSET 10

-- Trang N với parameters
SELECT OrderNumber, CustomerName, TotalAmount, OrderDate
FROM Sales."Order"
ORDER BY OrderDate DESC
LIMIT $pageSize OFFSET $offset
```

## Ví dụ thực tế

### Ví dụ 1: Top 10 khách hàng VIP

```sql
SELECT
    C/LastName AS CustomerName,
    COUNT(*) AS OrderCount,
    SUM(O/TotalAmount) AS TotalSpent
FROM Sales.Customer AS C
JOIN C/Sales.Customer_Order/Sales."Order" AS O
WHERE O/IsPaid = true
GROUP BY C/LastName
ORDER BY TotalSpent DESC
LIMIT 10
```

### Ví dụ 2: Sản phẩm bán chạy nhất

```sql
SELECT
    P/ProductName AS Product,
    SUM(OD/Quantity) AS TotalSold,
    SUM(OD/Quantity * OD/UnitPrice) AS Revenue
FROM Inventory.Product AS P
JOIN P/Sales.OrderLine_Product/Sales.OrderLine AS OD
GROUP BY P/ProductName
ORDER BY TotalSold DESC
LIMIT 20
```

### Ví dụ 3: Đơn hàng gần đây nhất (10 đơn)

```sql
SELECT
    O/OrderNumber,
    C/LastName AS Customer,
    O/TotalAmount,
    O/OrderDate,
    CASE
        WHEN O/IsPaid = true THEN 'Paid'
        ELSE 'Unpaid'
    END AS Status
FROM Sales."Order" AS O
JOIN O/Sales.Order_Customer/Sales.Customer AS C
ORDER BY O/OrderDate DESC
LIMIT 10
```

## Lưu ý quan trọng

1. **Luôn dùng ORDER BY với LIMIT/OFFSET**: Nếu không có ORDER BY, thứ tự bản ghi không được đảm bảo
2. **Performance**: OFFSET lớn có thể chậm — cân nhắc dùng cursor-based paging cho dataset lớn
3. **Parameters**: LIMIT và OFFSET hỗ trợ parameters (`$pageSize`, `$offset`)
4. **View Entities**: ORDER BY chỉ hợp lệ khi có LIMIT/OFFSET

## Bước tiếp theo

- [07 - Functions & Expressions](07-functions-expressions.md) — Hàm built-in và biểu thức
