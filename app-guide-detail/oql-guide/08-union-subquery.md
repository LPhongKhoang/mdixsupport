# 08 - UNION & Subquery

## UNION Clause

### Tổng quan

`UNION` kết hợp kết quả của nhiều truy vấn SELECT thành một tập kết quả duy nhất.

### Cú pháp

```sql
select_query
    { UNION [ALL] select_query } [, ...n]
    [ ORDER BY clause ]
    [ LIMIT number ]
    [ OFFSET number ]
```

### Quy tắc

1. Tất cả queries phải có **cùng số lượng columns**
2. Columns phải ở **cùng thứ tự**
3. Kiểu dữ liệu phải **compatible**
4. Tên columns lấy từ **query đầu tiên**
5. Mặc định loại bỏ trùng lặp — dùng `ALL` để giữ lại

### Ví dụ cơ bản

#### UNION (loại bỏ trùng)

```sql
-- Danh sách tất cả người (không trùng)
SELECT FirstName AS Name FROM Sales.SalesPerson
UNION
SELECT FirstName AS Name FROM Sales.Customer
```

#### UNION ALL (giữ trùng)

```sql
-- Danh sách tất cả người (có thể trùng)
SELECT FirstName AS Name FROM Sales.SalesPerson
UNION ALL
SELECT FirstName AS Name FROM Sales.Customer
```

#### UNION với ORDER BY và LIMIT

```sql
SELECT FirstName, LastName FROM Sales.SalesPerson
UNION
SELECT FirstName, LastName FROM Sales.Customer
ORDER BY FirstName, LastName
LIMIT 50
```

#### Chain nhiều UNION

```sql
-- Tên từ nhiều nguồn
SELECT FirstName AS Name FROM Sales.SalesPerson
UNION
SELECT FirstName AS Name FROM Sales.Customer
UNION
SELECT LastName AS Name FROM Sales.SalesPerson
UNION
SELECT LastName AS Name FROM Sales.Customer
ORDER BY Name
```

### Type Compatibility trong UNION

| Kiểu 1 | Kiểu 2 | Kết quả |
|--------|--------|---------|
| INTEGER | LONG | LONG |
| INTEGER | DECIMAL | DECIMAL |
| LONG | DECIMAL | DECIMAL |
| STRING(n) | STRING(m) | STRING(MAX(n,m)) |
| Any type | NULL | Kiểu kia |

> ⚠️ **OQL v2**: Kiểu kết quả xác định bởi tất cả queries, theo precedence: DECIMAL > LONG > INTEGER. Oracle/SAP HANA không hỗ trợ UNION chứa unlimited STRING.

```sql
-- OQL v2: Kết quả là DECIMAL (higher precedence)
SELECT IntegerAttribute FROM Module.Entity
UNION
SELECT DecimalAttribute FROM Module.Entity
```

## Subqueries

### Tổng quan

Subquery là query lồng bên trong query khác. Có thể dùng trong:
- **SELECT** — trả về giá trị tính toán
- **FROM** — như một data source tạm
- **WHERE** — lọc dựa trên kết quả subquery
- **HAVING** — lọc nhóm dựa trên kết quả subquery

### 1. Subquery trong SELECT

Phải trả về **đúng 1 row và 1 column**.

```sql
-- Đếm số đơn hàng của mỗi khách hàng
SELECT
    C/LastName AS CustomerName,
    (
        SELECT COUNT(*)
        FROM Sales."Order" AS O
        WHERE O/CustomerName = C/LastName
    ) AS OrderCount
FROM Sales.Customer AS C
```

> ⚠️ **OQL v2**: Subquery trong SELECT phải có alias.

### 2. Subquery trong FROM

```sql
-- Dùng subquery làm data source
SELECT Cust/LastName
FROM (
    SELECT LastName, City
    FROM Sales.Customer
    WHERE City = 'Hà Nội'
) AS Cust
```

Subquery trong FROM có thể kết hợp với JOIN:

```sql
SELECT *
FROM (SELECT * FROM Sales.Customer) AS P
JOIN (SELECT * FROM Sales."Order") AS O
ON P/LastName = O/CustomerName
```

> ⚠️ **OQL v2**: Subquery có `ORDER BY` phải đi kèm `LIMIT` và/hoặc `OFFSET`.

### 3. Subquery trong WHERE

#### Subquery as value (trả về 1 giá trị)

```sql
-- Sản phẩm có giá bằng giá cao nhất trong cùng city
SELECT *
FROM Sales.Location AS Location
WHERE Location/Stock = (
    SELECT MAX(Stock) FROM Sales.Location AS MaxLoc
    WHERE Location/City = MaxLoc/City
)
```

#### Subquery với IN

```sql
-- Khách hàng có đơn hàng
SELECT C/LastName
FROM Sales.Customer AS C
WHERE C/LastName IN (
    SELECT O/CustomerName FROM Sales."Order" AS O
)
```

#### Subquery với EXISTS

```sql
-- Khách hàng có ít nhất 1 đơn đã thanh toán
SELECT C/LastName
FROM Sales.Customer AS C
WHERE EXISTS (
    SELECT * FROM Sales."Order" AS O
    WHERE O/CustomerName = C/LastName
      AND O/IsPaid = true
)
```

#### NOT EXISTS

```sql
-- Sản phẩm chưa từng được bán
SELECT P/ProductName
FROM Inventory.Product AS P
WHERE NOT EXISTS (
    SELECT * FROM Sales.OrderLine AS OL
    WHERE OL/Sales.OrderLine_Product/Inventory.Product/ID = P/ID
)
```

### 4. Subquery trong HAVING

```sql
-- Thành phố có tổng stock ít hơn tổng số locations
SELECT
    City,
    COUNT(*) AS LocationCount,
    SUM(Stock) AS CityStock
FROM Sales.Location AS Location
GROUP BY City
HAVING SUM(Stock) <= (SELECT COUNT(*) FROM Sales.Location)
```

## Ví dụ thực tế

### Ví dụ 1: Báo cáo so sánh year-over-year

```sql
-- So sánh doanh thu năm nay vs năm trước
SELECT
    DATEPART(YEAR, OrderDate) AS Year,
    DATEPART(MONTH, OrderDate) AS Month,
    SUM(TotalAmount) AS Revenue,
    (
        SELECT SUM(TotalAmount)
        FROM Sales."Order" AS PrevYear
        WHERE DATEPART(YEAR, PrevYear/OrderDate) = DATEPART(YEAR, Sales."Order"/OrderDate) - 1
          AND DATEPART(MONTH, PrevYear/OrderDate) = DATEPART(MONTH, Sales."Order"/OrderDate)
    ) AS PrevYearRevenue
FROM Sales."Order"
WHERE IsPaid = true
GROUP BY DATEPART(YEAR, OrderDate), DATEPART(MONTH, OrderDate)
ORDER BY Year DESC, Month
```

### Ví dụ 2: Khách hàng chi tiêu trên trung bình

```sql
-- Khách hàng có tổng chi tiêu > trung bình tất cả khách hàng
SELECT
    C/LastName AS CustomerName,
    SUM(O/TotalAmount) AS TotalSpent
FROM Sales.Customer AS C
JOIN C/Sales.Customer_Order/Sales."Order" AS O
WHERE O/IsPaid = true
GROUP BY C/LastName
HAVING SUM(O/TotalAmount) > (
    SELECT AVG(TotalPerCustomer)
    FROM (
        SELECT SUM(TotalAmount) AS TotalPerCustomer
        FROM Sales."Order"
        WHERE IsPaid = true
        GROUP BY CustomerName
    ) AS AvgCalc
)
ORDER BY TotalSpent DESC
```

### Ví dụ 3: Gộp danh sách nhân viên và khách hàng

```sql
-- Danh sách tất cả người trong hệ thống
SELECT
    FirstName,
    LastName,
    'Employee' AS PersonType,
    Department AS Department
FROM HR.Employee
WHERE IsActive = true
UNION ALL
SELECT
    FirstName,
    LastName,
    'Customer' AS PersonType,
    NULL AS Department
FROM Sales.Customer
ORDER BY LastName, FirstName
```

## Lưu ý

1. **UNION default**: Loại bỏ duplicate — nếu muốn giữ, dùng `UNION ALL`
2. **Column names**: Lấy từ query đầu tiên — alias ở query sau không ảnh hưởng
3. **Subquery trong SELECT**: Phải trả về đúng 1 row, 1 column
4. **Subquery với EXISTS**: Có thể trả về nhiều rows/columns
5. **Performance**: Subquery correlated (tham chiếu outer query) có thể chậm — cân nhắc dùng JOIN

## Bước tiếp theo

- [09 - OQL V2 Features](09-oql-v2-features.md) — View Entities và breaking changes
