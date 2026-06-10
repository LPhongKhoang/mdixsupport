# Mendix OQL (Object Query Language) - Hướng dẫn chi tiết

## Giới thiệu

Bộ hướng dẫn này cung cấp tài liệu chi tiết về **Mendix Object Query Language (OQL)** — ngôn ngữ truy vấn quan hệ được lấy cảm hứng từ SQL, tích hợp sẵn trong Mendix Studio Pro.

### OQL là gì?

OQL (Object Query Language) là ngôn ngữ truy vấn của Mendix, cho phép bạn truy vấn dữ liệu từ **persistable entities** và **view entities** sử dụng tên entity/association từ Domain Model thay vì tên bảng database thực tế.

### Ưu điểm chính của OQL

| Đặc điểm | Mô tả |
|-----------|--------|
| **Sử dụng Domain Model names** | Truy vấn bằng entity/association names, không cần biết tên bảng DB |
| **Association-based JOIN** | Tự động JOIN qua associations đã định nghĩa trong Domain Model |
| **SQL-like syntax** | Cú pháp quen thuộc: SELECT, FROM, WHERE, GROUP BY, ORDER BY... |
| **View Entities** | Từ OQL v2, hỗ trợ View Entities (computed tables) |
| **Performance** | Có thể tối ưu performance tốt hơn XPath trong một số trường hợp |

### So sánh OQL vs XPath

| Tiêu chí | OQL | XPath |
|-----------|-----|-------|
| **Cú pháp** | SQL-like (SELECT...FROM...WHERE) | Path-based (//Entity[constraint]) |
| **Complex Queries** | Tốt cho JOIN, GROUP BY, subquery | Tốt cho simple filtering |
| **Security** | Tự xử lý (không tự áp dụng access rules) | Tự động áp dụng access rules |
| **Aggregate Functions** | AVG, COUNT, SUM, MIN, MAX trực tiếp | Cần sử dụng aggregate functions riêng |
| **Khi nào dùng** | Báo cáo phức tạp, analytics, data aggregation | CRUD operations, simple data retrieval |

## Cấu trúc hướng dẫn

| File | Nội dung |
|------|----------|
| [01-oql-overview.md](01-oql-overview.md) | Tổng quan OQL: cú pháp, reserved words, cách tạo OQL trong Studio Pro |
| [02-select-clause.md](02-select-clause.md) | SELECT clause: columns, aliases, expressions, DISTINCT, subqueries |
| [03-from-join-clause.md](03-from-join-clause.md) | FROM & JOIN: entities, associations, JOIN types, subquery sources |
| [04-where-clause.md](04-where-clause.md) | WHERE clause: conditions, operators, EXISTS, subqueries |
| [05-group-by-having.md](05-group-by-having.md) | GROUP BY & HAVING: aggregation, grouping expressions |
| [06-order-by-limit.md](06-order-by-limit.md) | ORDER BY, LIMIT, OFFSET: sorting và paging |
| [07-functions-expressions.md](07-functions-expressions.md) | Built-in functions: CAST, COALESCE, DATEPART, DATEDIFF, CASE, etc. |
| [08-union-subquery.md](08-union-subquery.md) | UNION, subqueries, và kỹ thuật nâng cao |
| [09-oql-v2-features.md](09-oql-v2-features.md) | OQL Version 2: View Entities, breaking changes, migration guide |
| [10-practical-examples.md](10-practical-examples.md) | Ví dụ thực tế: báo cáo sales, inventory, analytics |

## Yêu cầu trước

- Mendix Studio Pro **10.19+** (cho OQL v2 và View Entities)
- Kiến thức cơ bản về SQL
- Hiểu Domain Model, Entities, Associations trong Mendix

## Nguồn tham khảo chính thức

- [Mendix OQL Documentation](https://docs.mendix.com/refguide10/oql/)
- [OQL V2 Features](https://docs.mendix.com/refguide10/oql-v2/)
- [OQL Clauses](https://docs.mendix.com/refguide10/oql-clauses/)
- [OQL Expressions](https://docs.mendix.com/refguide10/oql-expressions/)
