# 01 - OQL Tổng quan

## OQL là gì?

**OQL (Object Query Language)** là ngôn ngữ truy vấn quan hệ của Mendix, được lấy cảm hứng từ SQL. Điểm khác biệt lớn nhất là OQL sử dụng **tên Entity và Association** từ Domain Model thay vì tên bảng database thực tế.

### Ưu điểm chính

1. **Không cần biết tên bảng DB** — Truy vấn bằng entity name (vd: `Sales.Order`)
2. **JOIN tự động qua Association** — Sử dụng association path thay vì tự viết JOIN condition
3. **Cú pháp quen thuộc** — Giống SQL: SELECT, FROM, WHERE, GROUP BY, ORDER BY...
4. **Security linh hoạt** — Có thể tự định nghĩa security expressions (không tự động áp access rules như XPath)

### Hạn chế

- Chỉ hoạt động với **Persistable Entities** và **View Entities** (OQL v2)
- **Không hoạt động** với Non-persistable hoặc External entities
- **Không tự động áp dụng access rules** — Cần tự xử lý security

## So sánh OQL vs XPath

| Tiêu chí | OQL | XPath |
|-----------|-----|-------|
| **Cú pháp** | `SELECT Name FROM Module.Entity WHERE ...` | `//Module.Entity[constraint]` |
| **JOIN** | `JOIN Module.Entity/Association/Target` | Không trực tiếp |
| **Aggregation** | `SUM()`, `AVG()`, `COUNT()` trực tiếp | Cần XPath aggregate functions |
| **Security** | Tự xử lý | Tự động áp access rules |
| **View Entities** | Có (OQL v2) | Không |
| **Phù hợp cho** | Báo cáo, analytics, phức tạp | CRUD, đơn giản |

## Reserved Words (Từ khóa dành riêng)

Các từ sau **không được dùng** làm entity/attribute name trong OQL nếu không đặt trong ngoặc kép:

```
ALL, AND, AS, ASC, AVG
BOOLEAN, BY
CASE, CAST, COUNT
DATEDIFF, DATEPART, DATETIME, DAY, DAYOFYEAR, DECIMAL, DESC, DISTINCT
ELSE, END, EXISTS
FALSE, FLOAT, FROM, FULL
GROUP
HAVING, HOUR
IN, INNER, INTEGER, IS
JOIN
LEFT, LIKE, LIMIT, LONG
MAX, MILLISECOND, MIN, MINUTE, MONTH
NOT, NULL
OFFSET, ON, OR, ORDER, OUTER
QUARTER
RIGHT
SECOND, SELECT, STRING, SUM
THEN, TRUE
UNION
WEEK, WEEKDAY, WHEN, WHERE
YEAR
```

> ⚠️ Nếu entity/attribute name trùng reserved word, phải đặt trong ngoặc kép: `"Order"`, `"Group"`

## Ví dụ cơ bản

### 1. Truy vấn đơn giản

```sql
-- Lấy tất cả khách hàng
SELECT LastName FROM Sales.Customer
```

### 2. Truy vấn có điều kiện

```sql
-- Khách hàng có tên "Jansen"
SELECT FirstName FROM Sales.Customer WHERE LastName = 'Jansen'
```

### 3. Truy vấn có Aggregation

```sql
-- Tổng tiền các đơn đã thanh toán
SELECT SUM(TotalAmount) AS TotalRevenue
FROM Sales."Order"
WHERE IsPaid = true
```

> 💡 `"Order"` đặt trong ngoặc kép vì `ORDER` là reserved word

## Cách tạo OQL trong Mendix Studio Pro

### Cách 1: Tạo Dataset (cho Report widgets)

1. Mở module trong Domain Model
2. Chuột phải → **Add other** → **Dataset**
3. Đặt tên cho Dataset
4. Viết truy vấn OQL trong editor
5. Kết nối với Report widgets trên Page

### Cách 2: Tạo View Entity (OQL v2 — Studio Pro 10.19+)

1. Mở Domain Model
2. Chuột phải trên空白区域 → **Add View Entity**
3. Đặt tên entity (vd: `SalesReport`)
4. Viết truy vấn OQL
5. View Entity sẽ xuất hiện như entity bình thường, có thể dùng làm data source cho Data Grid, Chart...

### Cách 3: Sử dụng OQL Module từ Marketplace

1. Cài đặt **OQL Module** từ Mendix Marketplace
2. Sử dụng Java Action `Core.retrieveOQLDataTable()` trong Microflow
3. Xử lý kết quả trả về

## Cú pháp tổng quát

```sql
SELECT [DISTINCT]
    column1 [AS alias1],
    column2 [AS alias2],
    aggregate_function(column3) [AS alias3]
FROM
    entity_name [AS alias]
    [JOIN joined_entity [AS join_alias]
        [ON condition]]
[WHERE
    condition]
[GROUP BY
    column1, column2]
[HAVING
    condition]
[ORDER BY
    column1 [ASC|DESC], column2 [ASC|DESC]]
[LIMIT number]
[OFFSET number]
```

## Lưu ý quan trọng

1. **Module prefix**: Entity phải có module prefix: `Module.EntityName`
2. **Association path**: Dùng `/` để navigate: `Module.Person/Module.Person_Order/Module."Order"`
3. **Case sensitivity**: Tên entity/attribute phân biệt hoa/thường theo Domain Model
4. **String literals**: Dùng nháy đơn: `'Jansen'`
5. **Numeric literals**: Viết trực tiếp: `100`, `3.14`
6. **Boolean**: Dùng `true` hoặc `false`
7. **NULL**: Dùng `NULL` (chữ hoa)
8. **Alias trong OQL v2**: Các expression không có tên tự động phải có alias (vd: `LENGTH(Name) AS NameLength`)

## Bước tiếp theo

- [02 - SELECT Clause](02-select-clause.md) — Chi tiết cú pháp SELECT
- [03 - FROM & JOIN](03-from-join-clause.md) — Truy vấn từ nhiều entity
