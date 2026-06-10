# 03 - FROM & JOIN Clause

## Tổng quan

`FROM` clause xác định **entity nguồn** dữ liệu. `JOIN` clause cho phép kết nối dữ liệu từ nhiều entity thông qua **associations** hoặc **conditions**.

## FROM Clause

### Cú pháp cơ bản

```sql
FROM entity_name [AS alias]
```

### 1. Truy vấn từ một entity

```sql
SELECT LastName, Email
FROM Sales.Customer
```

### 2. Sử dụng Alias

```sql
SELECT C/LastName, C/Email
FROM Sales.Customer AS C
```

> 💡 Alias giúp rút gọn và làm rõ nguồn cột, đặc biệt hữu ích khi JOIN nhiều entity.

### 3. Cross Join (FROM nhiều entity)

```sql
-- Kết hợp tất cả bản ghi từ 2 entity (Cartesian product)
SELECT *
FROM Sales.Customer, Sales.Product
```

> ⚠️ Cross join tạo ra M×N bản ghi. Thường không mong muốn — nên dùng JOIN với ON condition.

### 4. FROM Subquery

```sql
SELECT *
FROM (
    SELECT C/LastName, O/TotalAmount
    FROM Sales.Customer AS C
    JOIN C/Sales.Customer_Order/Sales."Order" AS O
) AS CustomerOrders
```

> ⚠️ **OQL v2**: Subquery có `ORDER BY` thì phải đi kèm `LIMIT` và/hoặc `OFFSET`.

## JOIN Clause

### Các loại JOIN

| Loại JOIN | Mô tả |
|-----------|--------|
| `INNER JOIN` | Chỉ trả về bản ghi khớp ở cả hai entity (mặc định) |
| `LEFT OUTER JOIN` | Tất cả bản ghi bên trái + bản ghi khớp bên phải |
| `RIGHT OUTER JOIN` | Tất cả bản ghi bên phải + bản ghi khớp bên trái |
| `FULL OUTER JOIN` | Tất cả bản ghi từ cả hai entity |

### 1. JOIN qua Association (không cần ON)

Đây là cách JOIN phổ biến nhất trong OQL — sử dụng association đã định nghĩa trong Domain Model:

```sql
SELECT
    C/LastName AS CustomerName,
    O/TotalAmount AS Amount
FROM Sales.Customer AS C
JOIN C/Sales.Customer_Order/Sales."Order" AS O
```

> 💡 Association path format: `SourceAlias/Module.Association_Name/Module.TargetEntity`

### 2. INNER JOIN với ON condition

```sql
SELECT
    C/LastName,
    O/TotalAmount
FROM Sales.Customer AS C
INNER JOIN Sales."Order" AS O
    ON C/LastName = O/CustomerName
```

### 3. LEFT OUTER JOIN

```sql
-- Lấy tất cả khách hàng kể cả khi chưa có đơn hàng
SELECT
    C/LastName AS CustomerName,
    O/TotalAmount AS Amount
FROM Sales.Customer AS C
LEFT OUTER JOIN C/Sales.Customer_Order/Sales."Order" AS O
```

Kết quả:

| CustomerName | Amount |
|--------------|--------|
| Nguyễn Văn A | 150.00 |
| Trần Thị B | NULL |
| Lê Văn C | 200.50 |

> 💡 `NULL` xuất hiện cho khách hàng chưa có đơn hàng.

### 4. RIGHT OUTER JOIN

```sql
SELECT
    C/LastName,
    O/TotalAmount
FROM Sales.Customer AS C
RIGHT OUTER JOIN Sales."Order" AS O
    ON C/LastName = O/CustomerName
```

### 5. FULL OUTER JOIN

```sql
SELECT
    C/LastName,
    O/TotalAmount
FROM Sales.Customer AS C
FULL OUTER JOIN Sales."Order" AS O
    ON C/LastName = O/CustomerName
```

### 6. JOIN nhiều entity

```sql
-- Khách hàng → Đơn hàng → Chi tiết đơn → Sản phẩm
SELECT
    C/LastName AS Customer,
    O/OrderDate,
    P/ProductName AS Product,
    OD/Quantity
FROM Sales.Customer AS C
JOIN C/Sales.Customer_Order/Sales."Order" AS O
JOIN O/Sales.Order_OrderLine/Sales.OrderLine AS OD
JOIN OD/Sales.OrderLine_Product/Inventory.Product AS P
```

### 7. JOIN Entity với chính nó (Self-Join)

```sql
-- Tìm nhân viên và quản lý của họ
SELECT
    E/LastName AS Employee,
    M/LastName AS Manager
FROM HR.Employee AS E
LEFT OUTER JOIN E/HR.Employee_Manager/HR.Employee AS M
```

### 8. JOIN qua Generalization (Kế thừa)

```sql
-- Vehicle là generalization của Car
SELECT *
FROM Module.Car
JOIN Module.Vehicle
ON TRUE
```

> ⚠️ **OQL v2**: Đã fix bug tạo duplicate columns khi JOIN entity với generalization của chính nó.

## Ví dụ thực tế

### Ví dụ 1: Báo cáo bán hàng đầy đủ

```sql
SELECT
    C/LastName AS CustomerName,
    C/Email AS Email,
    O/OrderDate AS OrderDate,
    O/TotalAmount AS TotalAmount,
    O/IsPaid AS Paid,
    CASE
        WHEN O/IsPaid = true THEN 'Completed'
        ELSE 'Pending'
    END AS PaymentStatus
FROM Sales.Customer AS C
LEFT OUTER JOIN C/Sales.Customer_Order/Sales."Order" AS O
ORDER BY O/OrderDate DESC
```

### Ví dụ 2: Đếm đơn hàng mỗi khách hàng (kể cả khách chưa có đơn)

```sql
SELECT
    C/LastName AS CustomerName,
    COUNT(O/TotalAmount) AS OrderCount
FROM Sales.Customer AS C
LEFT OUTER JOIN C/Sales.Customer_Order/Sales."Order" AS O
GROUP BY C/LastName
```

### Ví dụ 3: Phân tích sản phẩm theo danh mục

```sql
SELECT
    Cat/CategoryName AS Category,
    P/ProductName AS Product,
    P/UnitPrice AS Price,
    CASE
        WHEN P/UnitPrice > 1000 THEN 'Premium'
        WHEN P/UnitPrice > 100 THEN 'Mid-range'
        ELSE 'Budget'
    END AS PriceRange
FROM Inventory.Category AS Cat
JOIN Cat/Inventory.Category_Product/Inventory.Product AS P
ORDER BY Cat/CategoryName, P/UnitPrice DESC
```

## Những điểm cần lưu ý (OQL v2)

1. **JOIN phải có ON hoặc dùng Association**: Không được viết `JOIN` mà không có `ON` hoặc association path
2. **Duplicate columns cho phép trong subquery JOIN**: `SELECT *` từ subqueries có columns trùng tên giờ đã hoạt động
3. **Self-generalization JOIN đã được fix**: Không còn tạo duplicate columns

```sql
-- ❌ KHÔNG HỢP LỆ trong OQL v2 (JOIN không có ON)
SELECT * FROM Sales.Customer JOIN Sales."Order"

-- ✅ HỢP LỆ - Dùng association
SELECT * FROM Sales.Customer AS C
JOIN C/Sales.Customer_Order/Sales."Order" AS O

-- ✅ HỢP LỆ - Dùng ON condition
SELECT * FROM Sales.Customer AS C
JOIN Sales."Order" AS O ON C/ID = O/CustomerID

-- ✅ HỢP LỆ - Dùng cross join nếu thực sự cần
SELECT * FROM Sales.Customer, Sales."Order"
```

## Bước tiếp theo

- [04 - WHERE Clause](04-where-clause.md) — Lọc dữ liệu với điều kiện
