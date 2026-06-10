# 04 - WHERE Clause

## Tổng quan

`WHERE` clause lọc các bản ghi dựa trên **điều kiện boolean**. Chỉ những bản ghi thỏa mãn điều kiện (đánh giá thành `TRUE`) mới được trả về.

## Cú pháp

```sql
WHERE <constraint>
```

`<constraint>` là biểu thức BOOLEAN. Các bản ghi trả về `TRUE` được giữ lại.

## Operators (Toán tử)

### 1. Comparison Operators (So sánh)

| Operator | Ý nghĩa | Ví dụ |
|----------|----------|-------|
| `=` | Bằng | `WHERE LastName = 'Nguyễn'` |
| `!=` | Không bằng | `WHERE Status != 'Cancelled'` |
| `<` | Nhỏ hơn | `WHERE TotalAmount < 100` |
| `<=` | Nhỏ hơn hoặc bằng | `WHERE TotalAmount <= 100` |
| `>` | Lớn hơn | `WHERE Age > 18` |
| `>=` | Lớn hơn hoặc bằng | `WHERE Quantity >= 10` |

### 2. Logical Operators (Logic)

```sql
-- AND: cả hai điều kiện phải đúng
SELECT FirstName, LastName
FROM Sales.Customer
WHERE LastName = 'Nguyễn' AND FirstName = 'Văn'

-- OR: một trong hai điều kiện đúng
SELECT FirstName, LastName
FROM Sales.Customer
WHERE LastName = 'Nguyễn' OR LastName = 'Trần'

-- NOT: phủ định
SELECT FirstName, LastName
FROM Sales.Customer
WHERE NOT LastName = 'Nguyễn'
```

> ⚠️ **Thứ tự ưu tiên**: `NOT` > `AND` > `OR`. Dùng ngoặc để thay đổi thứ tự.

```sql
-- ❌ AND được xử lý trước OR
WHERE LastName = 'Nguyễn' OR LastName = 'Trần' AND Age > 30
-- Tương đương: LastName = 'Nguyễn' OR (LastName = 'Trần' AND Age > 30)

-- ✅ Dùng ngoặc để nhóm đúng ý
WHERE (LastName = 'Nguyễn' OR LastName = 'Trần') AND Age > 30
```

### 3. IS NULL / IS NOT NULL

```sql
-- Khách hàng chưa có email
SELECT LastName, Email
FROM Sales.Customer
WHERE Email IS NULL

-- Khách hàng đã có email
SELECT LastName, Email
FROM Sales.Customer
WHERE Email IS NOT NULL
```

> ⚠️ Không dùng `= NULL` hay `!= NULL`. Phải dùng `IS NULL` / `IS NOT NULL`.

### 4. LIKE (Tìm kiếm pattern)

```sql
-- Tìm tên kết thúc bằng 'ment'
WHERE PropertyType LIKE '%ment'

-- Tìm tên có đúng 8 ký tự kết thúc bằng 'ment'
WHERE PropertyType LIKE '____ment'

-- Tìm tên bắt đầu bằng 'Nguyễn'
WHERE LastName LIKE 'Nguyễn%'

-- Tìm tên chứa 'Văn'
WHERE FirstName LIKE '%Văn%'
```

| Wildcard | Ý nghĩa |
|----------|----------|
| `%` | Không hoặc nhiều ký tự bất kỳ |
| `_` | Đúng một ký tự bất kỳ |

### 5. IN (Kiểm tra trong tập hợp)

```sql
-- Kiểm tra giá trị trong danh sách
WHERE Status IN ('Active', 'Pending', 'Processing')

-- Kiểm tra kết quả subquery
WHERE LastName IN (
    SELECT CustomerName FROM Sales."Order" WHERE IsPaid = true
)
```

### 6. EXISTS (Kiểm tra sự tồn tại)

```sql
-- Khách hàng có ít nhất 1 đơn hàng
SELECT C/LastName
FROM Sales.Customer AS C
WHERE EXISTS (
    SELECT * FROM Sales."Order" AS O
    WHERE O/CustomerName = C/LastName
)
```

### 7. NOT EXISTS

```sql
-- Khách hàng CHƯA có đơn hàng nào
SELECT C/LastName
FROM Sales.Customer AS C
WHERE NOT EXISTS (
    SELECT * FROM Sales."Order" AS O
    WHERE O/CustomerName = C/LastName
)
```

## Truy vấn qua Association trong WHERE

```sql
-- Tìm khách hàng có Request với Number = 1
SELECT FirstName, LastName
FROM Sales.Customer
WHERE Sales.Customer/Sales.Request_Customer/Sales.Request/Number = 1
```

> 💡 OQL cho phép traverse association path trong WHERE clause, tương tự như trong FROM/JOIN.

## Xử lý NULL trong biểu thức

Khi một biểu thức trong WHERE đánh giá thành `NULL`, nó được xử lý như `FALSE`:

```sql
-- Nếu TotalAmount là NULL, bản ghi KHÔNG được trả về
WHERE TotalAmount > 100     -- NULL > 100 → FALSE

-- Nếu một vế là NULL, kết quả thường là NULL (→ FALSE)
WHERE TotalAmount + Discount > 200  -- NULL + 100 → NULL → FALSE
```

## Sử dụng Parameters trong WHERE

```sql
-- $status là parameter truyền vào từ Dataset hoặc Java Action
SELECT LastName, Email
FROM Sales.Customer
WHERE Status = $status

-- Nhiều parameters
SELECT *
FROM Sales."Order"
WHERE TotalAmount > $minAmount
  AND OrderDate >= $startDate
  AND OrderDate <= $endDate
```

> ⚠️ Parameters chỉ hỗ trợ trong **Datasets** và **Java Actions**, KHÔNG hỗ trợ trong View Entities.

## Sử dụng System Variables

```sql
-- Lấy đơn hàng của user hiện tại
SELECT * FROM Sales."Order"
WHERE Sales."Order"/System.owner/System.User/ID = '[%CurrentUser%]'

-- Lấy đơn hàng trong năm nay
SELECT * FROM Sales."Order"
WHERE OrderDate >= '[%BeginOfCurrentYear%]'
```

## Ví dụ thực tế

### Ví dụ 1: Tìm kiếm khách hàng nâng cao

```sql
SELECT
    FirstName,
    LastName,
    Email,
    City
FROM Sales.Customer
WHERE (LastName LIKE '%$searchKeyword$%' OR FirstName LIKE '%$searchKeyword$%')
  AND City IN ($cityList)
  AND Email IS NOT NULL
ORDER BY LastName, FirstName
```

### Ví dụ 2: Đơn hàng quá hạn chưa thanh toán

```sql
SELECT
    O/OrderNumber,
    O/OrderDate,
    O/TotalAmount,
    C/LastName AS CustomerName,
    DATEDIFF(DAY, O/OrderDate, '[%CurrentDateTime%]') AS DaysOverdue
FROM Sales."Order" AS O
JOIN O/Sales.Order_Customer/Sales.Customer AS C
WHERE O/IsPaid = false
  AND O/OrderDate < '[%BeginOfCurrentMonth%]'
ORDER BY DaysOverdue DESC
```

### Ví dụ 3: Sản phẩm cần nhập thêm (tồn kho thấp)

```sql
SELECT
    P/ProductName,
    P/UnitPrice,
    I/QuantityInStock,
    I/ReorderLevel
FROM Inventory.Product AS P
JOIN P/Inventory.Product_InventoryItem/Inventory.InventoryItem AS I
WHERE I/QuantityInStock <= I/ReorderLevel
  AND P/IsActive = true
ORDER BY I/QuantityInStock ASC
```

## Lưu ý quan trọng

1. **String literals**: Dùng nháy đơn `'...'`, không phải nháy kép
2. **Boolean**: `true` / `false` (chữ thường)
3. **NULL handling**: Luôn dùng `IS NULL` / `IS NOT NULL`, không dùng `= NULL`
4. **Precedence**: `NOT` > `AND` > `OR` — Dùng ngoặc để rõ ràng
5. **OQL v2**: Không được dùng alias trong WHERE

```sql
-- ❌ KHÔNG HỢP LỆ trong OQL v2 (dùng alias trong WHERE)
SELECT TotalAmount AS Amount FROM Sales."Order" WHERE Amount > 100

-- ✅ HỢP LỆ
SELECT TotalAmount AS Amount FROM Sales."Order" WHERE TotalAmount > 100
```

## Bước tiếp theo

- [05 - GROUP BY & HAVING](05-group-by-having.md) — Nhóm và tổng hợp dữ liệu
