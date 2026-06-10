# 07 - Functions & Expressions

## Tổng quan

OQL cung cấp nhiều built-in functions và expressions để xử lý dữ liệu trực tiếp trong truy vấn.

## Aggregate Functions

### Cú pháp

```sql
COUNT(*)
| { COUNT | AVG | MAX | MIN | SUM } ( [ DISTINCT ] attribute_path )
| STRING_AGG ( attribute_path, separator )
```

### Bảng tổng hợp

| Function | Mô tả | Kiểu trả về | Bỏ qua NULL |
|----------|--------|-------------|-------------|
| `COUNT(*)` | Đếm tất cả rows | Integer | N/A |
| `COUNT(col)` | Đếm giá trị không NULL | Integer | ✅ |
| `AVG(col)` | Trung bình cộng | Decimal | ✅ |
| `SUM(col)` | Tổng | Numeric | ✅ |
| `MIN(col)` | Giá trị nhỏ nhất | Same as input | ✅ |
| `MAX(col)` | Giá trị lớn nhất | Same as input | ✅ |
| `STRING_AGG(col, sep)` | Nối chuỗi | String | ✅ | Java Actions only |

### Ví dụ

```sql
-- Các loại thống kê
SELECT
    COUNT(*) AS TotalOrders,
    COUNT(Discount) AS DiscountedOrders,    -- Chỉ đếm không NULL
    SUM(TotalAmount) AS Revenue,
    AVG(TotalAmount) AS AvgOrder,
    MIN(OrderDate) AS FirstOrder,
    MAX(OrderDate) AS LastOrder
FROM Sales."Order"
```

### DISTINCT trong Aggregate

```sql
-- Đếm số lượng giá trị khác nhau
SELECT COUNT(DISTINCT LastName) AS UniqueLastNames
FROM Sales.Customer

-- Tổng các giá trị khác nhau
SELECT SUM(DISTINCT UnitPrice) AS UniquePriceSum
FROM Inventory.Product
```

### STRING_AGG

```sql
-- Nối tên tất cả sản phẩm, phân cách bằng dấu phẩy (chỉ dùng trong Java Actions)
SELECT STRING_AGG(ProductName, ', ') AS ProductList
FROM Inventory.Product
```

> ⚠️ `STRING_AGG` chỉ hỗ trợ trong **Java Actions**, không hỗ trợ trong View Entities hay Datasets.

## CAST — Chuyển đổi kiểu

### Cú pháp

```sql
CAST(expression AS data_type)
```

### Các kiểu dữ liệu hỗ trợ

| OQL Type | Mendix Type |
|----------|-------------|
| `BOOLEAN` | Boolean |
| `DATETIME` | Date and time |
| `DECIMAL` | Decimal |
| `INTEGER` | Integer |
| `LONG` | Long |
| `STRING` | String |

### Ví dụ

```sql
-- Chuyển ngày thành string
SELECT CAST(OrderDate AS STRING) AS DateStr
FROM Sales."Order"

-- Chuyển số nguyên thành decimal để tính chính xác
SELECT CAST(Quantity AS DECIMAL) * UnitPrice AS ExactTotal
FROM Sales.OrderLine

-- Chuyển string thành integer
SELECT CAST(PostalCode AS INTEGER) AS ZipCode
FROM Sales.Customer
```

## COALESCE — Xử lý NULL

### Cú pháp

```sql
COALESCE(expression [, ...n])
```

Trả về giá trị không NULL đầu tiên trong danh sách.

### Ví dụ

```sql
-- Dùng Discount nếu có, nếu NULL thì dùng 0
SELECT
    ProductName,
    UnitPrice,
    COALESCE(Discount, 0) AS SafeDiscount,
    UnitPrice - COALESCE(Discount, 0) AS FinalPrice
FROM Inventory.Product

-- Nhiều levels
SELECT COALESCE(WorkPhone, MobilePhone, Email, 'N/A') AS ContactInfo
FROM HR.Employee
```

> ⚠️ **OQL v2**: Tất cả arguments phải có cùng kiểu dữ liệu (hoặc NULL). Integer, Long, Decimal được coi là matching.

## CASE Expression

### Simple CASE

```sql
CASE input_expression
    WHEN when_expression THEN result_expression
    [ ...n ]
    [ ELSE else_result_expression ]
END
```

```sql
SELECT
    LastName,
    CASE CustomerTier
        WHEN 'VIP' THEN 'Premium Support'
        WHEN 'Gold' THEN 'Priority Support'
        WHEN 'Silver' THEN 'Standard Support'
        ELSE 'Basic Support'
    END AS SupportLevel
FROM Sales.Customer
```

### Searched CASE (nâng cao)

```sql
CASE
    WHEN boolean_expression THEN result_expression
    [ ...n ]
    [ ELSE else_result_expression ]
END
```

```sql
SELECT
    LastName,
    TotalAmount,
    CASE
        WHEN TotalAmount >= 10000 THEN 'Enterprise'
        WHEN TotalAmount >= 5000 THEN 'Corporate'
        WHEN TotalAmount >= 1000 THEN 'Business'
        WHEN TotalAmount > 0 THEN 'Individual'
        ELSE 'Unknown'
    END AS CustomerSegment
FROM Sales."Order"
```

> ⚠️ **OQL v2**: Tất cả result expressions phải có cùng kiểu. Integer, Long, Decimal được coi là matching. Không thể tất cả đều NULL.

## DATEPART — Trích xuất phần ngày

### Cú pháp

```sql
DATEPART(datepart, date_expression [, timezone])
```

### Các phần ngày hỗ trợ

| Datepart | Mô tả |
|----------|--------|
| `YEAR` | Năm |
| `QUARTER` | Quý (1-4) |
| `MONTH` | Tháng (1-12) |
| `DAY` | Ngày trong tháng |
| `DAYOFYEAR` | Ngày trong năm (1-366) |
| `WEEK` | Tuần trong năm |
| `WEEKDAY` | Ngày trong tuần |
| `HOUR` | Giờ |
| `MINUTE` | Phút |
| `SECOND` | Giây |
| `MILLISECOND` | Millisecond |

### Ví dụ

```sql
SELECT
    OrderDate,
    DATEPART(YEAR, OrderDate) AS OrderYear,
    DATEPART(MONTH, OrderDate) AS OrderMonth,
    DATEPART(QUARTER, OrderDate) AS OrderQuarter,
    DATEPART(WEEKDAY, OrderDate) AS DayOfWeek
FROM Sales."Order"
```

### DATEPART với GROUP BY

```sql
-- Doanh thu theo năm và quý
SELECT
    DATEPART(YEAR, OrderDate) AS Year,
    DATEPART(QUARTER, OrderDate) AS Quarter,
    SUM(TotalAmount) AS Revenue
FROM Sales."Order"
GROUP BY DATEPART(YEAR, OrderDate), DATEPART(QUARTER, OrderDate)
ORDER BY Year, Quarter
```

## DATEDIFF — Hiệu ngày

### Cú pháp

```sql
DATEDIFF(unit, start_date, end_date [, timezone])
```

### Ví dụ

```sql
-- Số ngày giữa OrderDate và ngày hiện tại
SELECT
    OrderNumber,
    OrderDate,
    DATEDIFF(DAY, OrderDate, '[%CurrentDateTime%]') AS DaysSinceOrder
FROM Sales."Order"

-- Tuổi khách hàng
SELECT
    LastName,
    BirthDate,
    DATEDIFF(YEAR, BirthDate, '[%CurrentDateTime%]') AS Age
FROM Sales.Customer
```

> ⚠️ **OQL v2**: Arguments phải là Date/time, String (sẽ convert), hoặc Numeric (Java timestamp).

## String Functions

### LENGTH

```sql
-- Độ dài chuỗi
SELECT LastName, LENGTH(LastName) AS NameLength
FROM Sales.Customer
```

> ⚠️ **OQL v2**: Argument phải là kiểu String. Enumeration cũng được xử lý như String.

### UPPER / LOWER

```sql
-- Chuyển chữ hoa / chữ thường
SELECT
    UPPER(LastName) AS UpperName,
    LOWER(Email) AS LowerEmail
FROM Sales.Customer
```

### REPLACE

```sql
-- Thay thế chuỗi
SELECT
    PhoneNumber,
    REPLACE(PhoneNumber, '-', '') AS CleanPhone
FROM Sales.Customer
```

## ROUND — Làm tròn

```sql
-- Làm tròn đến 2 chữ số thập phân
SELECT
    ProductName,
    UnitPrice,
    ROUND(UnitPrice, 2) AS RoundedPrice
FROM Inventory.Product
```

> ⚠️ **OQL v2**: `ROUND` giờ trả về `Decimal` (trước v2 trả về `Float` — kiểu đã deprecated).

## RANGEBEGIN / RANGEEND

```sql
-- Lấy giá trị bắt đầu/kết thúc của range parameter
SELECT * FROM Sales."Order"
WHERE OrderDate >= RANGEBEGIN($dateRange)
  AND OrderDate <= RANGEEND($dateRange)
```

> Chỉ dùng được trong Datasets với range parameters.

## Toán tử số học

```sql
SELECT
    Quantity,
    UnitPrice,
    Quantity * UnitPrice AS LineTotal,          -- Nhân
    Quantity * UnitPrice * 0.1 AS Tax,          -- Nhân với hằng số
    TotalAmount - Discount AS NetAmount,        -- Trừ
    TotalAmount + ShippingFee AS GrandTotal,    -- Cộng
    TotalAmount : 23000 AS AmountInVND,         -- Chia
    ID % 100 AS BatchNumber                     -- Modulo
FROM Sales."Order"
```

> ⚠️ **OQL v2**: Kết quả arithmetic luôn là kiểu chính xác nhất: Decimal > Long > Integer.

## Parameters

### Cú pháp

```sql
$parameterName
```

### Ví dụ

```sql
-- Parameters từ Dataset
SELECT * FROM Sales.Customer
WHERE LastName = $lastName
  AND City = $city
ORDER BY LastName
LIMIT $limit OFFSET $offset
```

### Lưu ý

- Chỉ hỗ trợ trong **Datasets** và **Java Actions** (không hỗ trợ View Entities)
- Parameter `undefined` trong `IN` / `LIKE` → return `true`
- Parameter `undefined` trong `LIMIT` → throw exception
- Parameter `undefined` trong contexts khác → throw exception

## System Variables

```sql
-- User hiện tại
WHERE Sales."Order"/System.owner/System.User/ID = '[%CurrentUser%]'

-- Thời gian hiện tại
WHERE OrderDate >= '[%CurrentDateTime%]'

-- Đầu năm nay
WHERE OrderDate >= '[%BeginOfCurrentYear%]'

-- Đầu tháng này
WHERE OrderDate >= '[%BeginOfCurrentMonth%]'

-- Đầu tuần này
WHERE OrderDate >= '[%BeginOfCurrentWeek%]'
```

> ⚠️ `[%CurrentObject%]` KHÔNG hỗ trợ trong OQL.

## Ví dụ thực tế

### Ví dụ 1: Báo cáo doanh thu với nhiều functions

```sql
SELECT
    DATEPART(YEAR, O/OrderDate) AS Year,
    DATEPART(MONTH, O/OrderDate) AS Month,
    COUNT(*) AS OrderCount,
    SUM(O/TotalAmount) AS Revenue,
    ROUND(AVG(O/TotalAmount), 2) AS AvgOrderValue,
    COALESCE(SUM(O/Discount), 0) AS TotalDiscount,
    ROUND(CAST(SUM(O/Discount) AS DECIMAL) : CASE WHEN SUM(O/TotalAmount) = 0 THEN NULL ELSE CAST(SUM(O/TotalAmount) AS DECIMAL) END * 100, 2) AS DiscountPercent
FROM Sales."Order" AS O
WHERE O/IsPaid = true
GROUP BY DATEPART(YEAR, O/OrderDate), DATEPART(MONTH, O/OrderDate)
ORDER BY Year DESC, Month DESC
```

### Ví dụ 2: Phân loại khách hàng

```sql
SELECT
    C/LastName AS Name,
    COUNT(*) AS Orders,
    SUM(O/TotalAmount) AS TotalSpent,
    CASE
        WHEN SUM(O/TotalAmount) >= 10000 THEN 'Diamond'
        WHEN SUM(O/TotalAmount) >= 5000 THEN 'Gold'
        WHEN SUM(O/TotalAmount) >= 1000 THEN 'Silver'
        ELSE 'Bronze'
    END AS Tier,
    DATEDIFF(DAY, MIN(O/OrderDate), MAX(O/OrderDate)) AS CustomerDays
FROM Sales.Customer AS C
JOIN C/Sales.Customer_Order/Sales."Order" AS O
GROUP BY C/LastName
HAVING COUNT(*) > 0
ORDER BY TotalSpent DESC
```

## Bước tiếp theo

- [08 - UNION & Subquery](08-union-subquery.md) — Kỹ thuật truy vấn nâng cao
