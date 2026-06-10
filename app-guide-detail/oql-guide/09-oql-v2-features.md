# 09 - OQL Version 2 & View Entities

## Tổng quan

**OQL v2** được giới thiệu trong **Studio Pro 10.19**, bật bằng setting `OQL version 2 = Yes` trong App Settings. OQL v2 cần thiết để sử dụng **View Entities**.

OQL v2 có cùng cú pháp nhưng xử lý nghiêm ngặt hơn một số trường hợp edge-case.

## Bật OQL v2

1. Mở **App Settings** trong Studio Pro
2. Tab **Runtime**
3. Đặt **OQL version 2** = `Yes`
4. Kiểm tra lại các truy vấn OQL hiện có

## View Entities

### View Entity là gì?

View Entity là entity đặc biệt đại diện cho **kết quả của một OQL query** — tương tự database view. Dữ liệu không được lưu riêng mà được tính toán mỗi khi truy cập.

### Tạo View Entity

1. Mở **Domain Model** trong module
2. Chuột phải trên khoảng trống → **Add View Entity**
3. Đặt tên (vd: `SalesReport`)
4. Viết truy vấn OQL trong editor
5. View Entity xuất hiện trong Domain Model với icon đặc biệt

### Đặc điểm của View Entity

| Đặc điểm | Chi tiết |
|-----------|----------|
| **Read-only** | Không thể create/update/delete trực tiếp |
| **Không lưu dữ liệu** | Query chạy mỗi khi truy cập |
| **Có thể reference nhau** | View Entity có thể query View Entity khác |
| **Có association** | Nếu SELECT chứa `ID` của source entity |
| **Có access rules** | Nhưng không xét access rules của source entity |
| **Sử dụng như entity bình thường** | Dùng làm data source cho Data Grid, Chart... |

### Ví dụ View Entity: SalesSummary

```sql
SELECT
    DATEPART(YEAR, O/OrderDate) AS OrderYear,
    DATEPART(MONTH, O/OrderDate) AS OrderMonth,
    COUNT(*) AS OrderCount,
    SUM(O/TotalAmount) AS Revenue,
    AVG(O/TotalAmount) AS AvgOrderValue
FROM Sales."Order" AS O
WHERE O/IsPaid = true
GROUP BY DATEPART(YEAR, O/OrderDate), DATEPART(MONTH, O/OrderDate)
```

### Ví dụ View Entity: CustomerWithStats (kèm Association)

```sql
SELECT
    C/ID AS FromCustomerViewToCustomer,
    C/LastName AS CustomerName,
    C/Email,
    COUNT(*) AS TotalOrders,
    SUM(O/TotalAmount) AS TotalSpent,
    AVG(O/TotalAmount) AS AvgOrderValue,
    CASE
        WHEN SUM(O/TotalAmount) >= 10000 THEN 'VIP'
        WHEN SUM(O/TotalAmount) >= 5000 THEN 'Gold'
        ELSE 'Standard'
    END AS CustomerTier
FROM Sales.Customer AS C
JOIN C/Sales.Customer_Order/Sales."Order" AS O
WHERE O/IsPaid = true
GROUP BY C/ID, C/LastName, C/Email
```

> 💡 `C/ID AS FromCustomerViewToCustomer` tạo association từ View Entity đến entity `Sales.Customer`.

### OQL Editor cho View Entities

- Auto-complete entity/attribute names, clauses, operators, functions
- Hiển thị validation errors với line/column numbers
- Query có thể bắt đầu bằng `SELECT` hoặc `FROM`

### ORDER BY trong View Entities

```sql
-- ❌ KHÔNG HỢP LỆ - View Entity không có thứ tự tự nhiên
SELECT LastName, TotalAmount
FROM Sales.Customer
ORDER BY TotalAmount DESC

-- ✅ HỢP LỆ - ORDER BY với LIMIT để lấy top N
SELECT LastName, TotalAmount
FROM Sales.Customer
ORDER BY TotalAmount DESC
LIMIT 10
```

## OQL v2 Breaking Changes

### 1. GROUP BY Association không còn được phép

```sql
-- ❌ OQL v1 cho phép, OQL v2 KHÔNG
SELECT COUNT(*) AS count
FROM Module.Person
GROUP BY Module.Person/Module.Person_City/Module.City/Name

-- ✅ Dùng JOIN pattern thay thế
SELECT COUNT(*) AS count
FROM Module.Person AS P
JOIN Module.Person/Module.Person_City/Module.City AS C
GROUP BY C/Name
```

### 2. Stricter Data Type Validation

#### CASE expression

```sql
-- ❌ OQL v2: Tất cả results phải cùng kiểu
CASE Status
    WHEN 'Active' THEN 1        -- Integer
    WHEN 'Inactive' THEN '0'    -- String - KHÁC KIỂU!
END

-- ✅ Tất cả cùng kiểu
CASE Status
    WHEN 'Active' THEN '1'
    WHEN 'Inactive' THEN '0'
    ELSE 'Unknown'
END
```

> Numeric types Integer, Long, Decimal được coi là matching.

#### COALESCE

```sql
-- ❌ OQL v2: Arguments phải cùng kiểu
COALESCE(Discount, 'N/A')  -- Decimal vs String

-- ✅ Cùng kiểu
COALESCE(Discount, 0)      -- Decimal vs Integer (matching)
```

#### LENGTH

```sql
-- ❌ OQL v2: Argument phải là String
LENGTH(OrderDate)

-- ✅ String only
LENGTH(LastName)
```

#### DATEPART / DATEDIFF

```sql
-- ✅ HỢP LỆ: Date/time
DATEPART(YEAR, OrderDate)

-- ✅ HỢP LỆ: String (sẽ convert)
DATEPART(YEAR, '2025-06-11')

-- ✅ HỢP LỆ: Numeric (Java timestamp)
DATEPART(YEAR, 1718064000)
```

### 3. Columns phải có Name hoặc Alias

```sql
-- ❌ OQL v2: Expression không tên
SELECT Name, LENGTH(Name), NULL FROM Module.City

-- ✅ Mọi expression phải có alias
SELECT Name, LENGTH(Name) AS NameLength, NULL AS NullColumn
FROM Module.City
```

### 4. Duplicate Columns phải chỉ định Entity

```sql
-- ❌ OQL v2: Không rõ Name thuộc entity nào
SELECT Name
FROM Module.Person
JOIN Module.Person/Module.Person_City/Module.City

-- ✅ Chỉ định rõ
SELECT Module.Person/Name
FROM Module.Person
JOIN Module.Person/Module.Person_City/Module.City
```

### 5. Subquery ORDER BY cần LIMIT/OFFSET

```sql
-- ❌ OQL v2: Subquery ORDER BY không có LIMIT
SELECT * FROM (SELECT Name FROM Module.Person ORDER BY Name)

-- ✅ Có LIMIT
SELECT * FROM (SELECT Name FROM Module.Person ORDER BY Name LIMIT 20)
```

### 6. Arithmetic Result Types

```sql
-- OQL v1: Kiểu result = kiểu first attribute (database-dependent)
-- OQL v2: Luôn là kiểu chính xác nhất: DECIMAL > LONG > INTEGER

SELECT IntegerCol + DecimalCol AS Result
-- OQL v1: result type phụ thuộc database
-- OQL v2: result type = DECIMAL
```

### 7. ROUND trả về Decimal

```sql
-- OQL v1: ROUND trả về Float
-- OQL v2: ROUND trả về Decimal (Float đã deprecated)
```

### 8. Alias trong WHERE không được phép

```sql
-- ❌ OQL v2: Dùng alias trong WHERE
SELECT TotalAmount AS Amount FROM Sales."Order" WHERE Amount > 100

-- ✅ Dùng expression gốc
SELECT TotalAmount AS Amount FROM Sales."Order" WHERE TotalAmount > 100
```

### 9. JOIN phải có ON hoặc Association

```sql
-- ❌ OQL v2: JOIN không có ON
SELECT * FROM Module.Person JOIN Module.City

-- ✅ Dùng ON
SELECT * FROM Module.Person P JOIN Module.City C ON P/CityID = C/ID

-- ✅ Dùng Cross Join
SELECT * FROM Module.Person, Module.City
```

### 10. UNION Type Handling

```sql
-- OQL v1: Type determined by first query only → INTEGER
SELECT IntegerAttribute FROM Module.Entity
UNION
SELECT DecimalAttribute FROM Module.Entity

-- OQL v2: Type determined by all queries, merged by precedence → DECIMAL
SELECT IntegerAttribute FROM Module.Entity
UNION
SELECT DecimalAttribute FROM Module.Entity
```

## Migration Checklist

Khi nâng cấp lên OQL v2, kiểm tra:

- [ ] GROUP BY qua association → chuyển sang JOIN pattern
- [ ] CASE/COALESCE với mixed types → đồng nhất kiểu
- [ ] SELECT expressions không alias → thêm alias
- [ ] Duplicate column names → chỉ định entity rõ ràng
- [ ] Subquery ORDER BY không LIMIT → thêm LIMIT/OFFSET
- [ ] WHERE dùng alias → đổi thành expression gốc
- [ ] JOIN không ON → thêm ON hoặc dùng cross join

## Bước tiếp theo

- [10 - Ví dụ thực tế](10-practical-examples.md) — Bài tập và use cases hoàn chỉnh
