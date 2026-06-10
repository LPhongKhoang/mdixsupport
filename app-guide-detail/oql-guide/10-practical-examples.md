# 10 - Ví dụ thực tế

## Giới thiệu

Chương này tổng hợp các ví dụ OQL thực tế dựa trên một Domain Model bán hàng điển hình. Mỗi ví dụ đều có thể thực thi trực tiếp trong Mendix Studio Pro.

## Domain Model tham khảo

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Customer    │────<│ Customer_Order    >│────│  Order       │
│─────────────│     │ (Association)     │     │─────────────│
│ ID           │     └──────────────────┘     │ ID           │
│ FirstName   │                               │ OrderNumber  │
│ LastName    │                               │ OrderDate    │
│ Email       │     ┌──────────────────┐     │ TotalAmount  │
│ City        │────<│ Order_OrderLine   >│────│ IsPaid       │
│ Country     │     │ (Association)     │     │ Status       │
└─────────────┘     └──────────────────┘     └──────┬──────┘
                                                      │
                      ┌──────────────────┐             │
                      │OrderLine_Product  >│────────────┤
                      │ (Association)     │             │
                      └──────────────────┘             │
┌─────────────┐            │                           │
│  Product     │<───────────┘     ┌─────────────┐      │
│─────────────│                   │  OrderLine   │<─────┘
│ ID           │                   │─────────────│
│ ProductName  │<──────────────────│ ID           │
│ SKU          │                   │ Quantity     │
│ UnitPrice    │                   │ UnitPrice    │
│ StockQuantity│                   │ Discount     │
│ IsActive     │                   └─────────────┘
│ Category     │
└─────────────┘
```

## Ví dụ 1: Dashboard doanh thu tổng quan

```sql
-- Tạo View Entity: SalesDashboard
SELECT
    COUNT(*) AS TotalOrders,
    SUM(CASE WHEN IsPaid = true THEN TotalAmount ELSE 0 END) AS PaidRevenue,
    SUM(CASE WHEN IsPaid = false THEN TotalAmount ELSE 0 END) AS PendingRevenue,
    AVG(CASE WHEN IsPaid = true THEN TotalAmount ELSE NULL END) AS AvgPaidOrder,
    MIN(OrderDate) AS FirstOrderDate,
    MAX(OrderDate) AS LastOrderDate
FROM Sales."Order"
```

### Kết quả mẫu

| TotalOrders | PaidRevenue | PendingRevenue | AvgPaidOrder | FirstOrderDate | LastOrderDate |
|-------------|-------------|----------------|--------------|----------------|---------------|
| 1,245 | 2,345,678 | 456,789 | 2,150.50 | 2024-01-05 | 2025-06-10 |

---

## Ví dụ 2: Báo cáo doanh thu theo tháng

```sql
-- Tạo View Entity: MonthlyRevenue
SELECT
    DATEPART(YEAR, O/OrderDate) AS Year,
    DATEPART(MONTH, O/OrderDate) AS Month,
    COUNT(*) AS OrderCount,
    SUM(O/TotalAmount) AS Revenue,
    AVG(O/TotalAmount) AS AvgOrderValue,
    SUM(CASE WHEN O/IsPaid = true THEN 1 ELSE 0 END) AS PaidCount,
    SUM(CASE WHEN O/IsPaid = false THEN 1 ELSE 0 END) AS UnpaidCount
FROM Sales."Order" AS O
GROUP BY DATEPART(YEAR, O/OrderDate), DATEPART(MONTH, O/OrderDate)
ORDER BY Year DESC, Month DESC
LIMIT 12
```

### Kết quả mẫu

| Year | Month | OrderCount | Revenue | AvgOrderValue | PaidCount | UnpaidCount |
|------|-------|------------|---------|---------------|-----------|-------------|
| 2025 | 6 | 89 | 234,567 | 2,635.58 | 82 | 7 |
| 2025 | 5 | 112 | 298,450 | 2,664.73 | 105 | 7 |

---

## Ví dụ 3: Top 20 khách hàng theo doanh thu

```sql
-- Tạo View Entity: TopCustomers
SELECT
    C/ID AS FromTopCustomerToCustomer,
    C/LastName AS CustomerName,
    C/Email,
    C/City,
    COUNT(*) AS TotalOrders,
    SUM(O/TotalAmount) AS TotalSpent,
    AVG(O/TotalAmount) AS AvgOrderValue,
    MAX(O/OrderDate) AS LastOrderDate,
    DATEDIFF(DAY, MAX(O/OrderDate), '[%CurrentDateTime%]') AS DaysSinceLastOrder,
    CASE
        WHEN SUM(O/TotalAmount) >= 50000 THEN 'Platinum'
        WHEN SUM(O/TotalAmount) >= 20000 THEN 'Diamond'
        WHEN SUM(O/TotalAmount) >= 10000 THEN 'Gold'
        WHEN SUM(O/TotalAmount) >= 5000 THEN 'Silver'
        ELSE 'Bronze'
    END AS CustomerTier
FROM Sales.Customer AS C
JOIN C/Sales.Customer_Order/Sales."Order" AS O
WHERE O/IsPaid = true
GROUP BY C/ID, C/LastName, C/Email, C/City
ORDER BY TotalSpent DESC
LIMIT 20
```

---

## Ví dụ 4: Phân tích sản phẩm bán chạy

```sql
-- Tạo View Entity: ProductSalesAnalysis
SELECT
    P/ID AS FromProductAnalysisToProduct,
    P/ProductName,
    P/UnitPrice AS CurrentPrice,
    P/StockQuantity AS CurrentStock,
    COALESCE(SUM(OL/Quantity), 0) AS TotalSold,
    COALESCE(SUM(OL/Quantity * OL/UnitPrice), 0) AS TotalRevenue,
    COALESCE(AVG(OL/Discount), 0) AS AvgDiscount,
    CASE
        WHEN COALESCE(SUM(OL/Quantity), 0) >= 1000 THEN 'Best Seller'
        WHEN COALESCE(SUM(OL/Quantity), 0) >= 500 THEN 'Hot'
        WHEN COALESCE(SUM(OL/Quantity), 0) >= 100 THEN 'Normal'
        ELSE 'Slow'
    END AS SalesPerformance,
    CASE
        WHEN P/StockQuantity <= 10 THEN 'Low Stock'
        WHEN P/StockQuantity <= 50 THEN 'Medium Stock'
        ELSE 'Well Stocked'
    END AS StockStatus
FROM Inventory.Product AS P
LEFT OUTER JOIN P/Sales.OrderLine_Product/Sales.OrderLine AS OL
WHERE P/IsActive = true
GROUP BY P/ID, P/ProductName, P/UnitPrice, P/StockQuantity
ORDER BY TotalSold DESC
```

---

## Ví dụ 5: Báo cáo aging đơn hàng chưa thanh toán

```sql
-- Dataset: UnpaidOrderAging
SELECT
    O/OrderNumber,
    C/LastName AS CustomerName,
    C/Email,
    O/OrderDate,
    O/TotalAmount,
    DATEDIFF(DAY, O/OrderDate, '[%CurrentDateTime%]') AS DaysOutstanding,
    CASE
        WHEN DATEDIFF(DAY, O/OrderDate, '[%CurrentDateTime%]') <= 30 THEN 'Current'
        WHEN DATEDIFF(DAY, O/OrderDate, '[%CurrentDateTime%]') <= 60 THEN '31-60 days'
        WHEN DATEDIFF(DAY, O/OrderDate, '[%CurrentDateTime%]') <= 90 THEN '61-90 days'
        ELSE 'Over 90 days'
    END AS AgingBucket
FROM Sales."Order" AS O
JOIN O/Sales.Order_Customer/Sales.Customer AS C
WHERE O/IsPaid = false
ORDER BY DaysOutstanding DESC
```

---

## Ví dụ 6: Phân tích theo khu vực địa lý

```sql
-- View Entity: RegionalSalesAnalysis
SELECT
    C/Country,
    C/City,
    COUNT(DISTINCT C/ID) AS CustomerCount,
    COUNT(*) AS OrderCount,
    SUM(O/TotalAmount) AS TotalRevenue,
    AVG(O/TotalAmount) AS AvgOrderValue,
    SUM(O/TotalAmount) : COUNT(DISTINCT C/ID) AS RevenuePerCustomer
FROM Sales.Customer AS C
JOIN C/Sales.Customer_Order/Sales."Order" AS O
WHERE O/IsPaid = true
GROUP BY C/Country, C/City
HAVING COUNT(*) > 0
ORDER BY TotalRevenue DESC
```

---

## Ví dụ 7: Pivot Table — Doanh thu theo Quý và Năm

```sql
-- View Entity: QuarterlyPivot
SELECT
    DATEPART(YEAR, OrderDate) AS Year,
    SUM(CASE WHEN DATEPART(QUARTER, OrderDate) = 1 THEN TotalAmount ELSE 0 END) AS Q1,
    SUM(CASE WHEN DATEPART(QUARTER, OrderDate) = 2 THEN TotalAmount ELSE 0 END) AS Q2,
    SUM(CASE WHEN DATEPART(QUARTER, OrderDate) = 3 THEN TotalAmount ELSE 0 END) AS Q3,
    SUM(CASE WHEN DATEPART(QUARTER, OrderDate) = 4 THEN TotalAmount ELSE 0 END) AS Q4,
    SUM(TotalAmount) AS YearTotal
FROM Sales."Order"
WHERE IsPaid = true
GROUP BY DATEPART(YEAR, OrderDate)
ORDER BY Year DESC
```

### Kết quả mẫu

| Year | Q1 | Q2 | Q3 | Q4 | YearTotal |
|------|-----|-----|-----|-----|-----------|
| 2025 | 580K | 620K | — | — | 1,200K |
| 2024 | 490K | 530K | 560K | 610K | 2,190K |

---

## Ví dụ 8: Tìm kiếm sản phẩm đa tiêu chí (Dataset + Parameters)

```sql
-- Dataset: ProductSearch
SELECT
    P/ProductName,
    P/SKU,
    P/UnitPrice,
    P/StockQuantity,
    CASE
        WHEN P/StockQuantity = 0 THEN 'Out of Stock'
        WHEN P/StockQuantity <= 10 THEN 'Low Stock'
        ELSE 'In Stock'
    END AS StockStatus
FROM Inventory.Product AS P
WHERE P/IsActive = true
  AND ($searchKeyword IS NULL OR P/ProductName LIKE '%$searchKeyword$%')
  AND ($minPrice IS NULL OR P/UnitPrice >= $minPrice)
  AND ($maxPrice IS NULL OR P/UnitPrice <= $maxPrice)
ORDER BY P/ProductName
LIMIT $pageSize OFFSET $offset
```

---

## Ví dụ 9: Báo cáo hiệu suất nhân viên bán hàng

```sql
-- View Entity: SalesPerformance
SELECT
    S/ID AS FromSalesPerfToSalesPerson,
    S/FirstName AS FirstName,
    S/LastName AS LastName,
    COUNT(*) AS OrdersClosed,
    SUM(O/TotalAmount) AS Revenue,
    AVG(O/TotalAmount) AS AvgDealSize,
    MAX(O/TotalAmount) AS LargestDeal,
    COUNT(CASE WHEN O/TotalAmount >= 5000 THEN 1 ELSE NULL END) AS LargeDeals,
    ROUND(CAST(COUNT(CASE WHEN O/TotalAmount >= 5000 THEN 1 ELSE NULL END) AS DECIMAL)
        : CAST(COUNT(*) AS DECIMAL) * 100, 1) AS LargeDealPercent
FROM Sales.SalesPerson AS S
JOIN S/Sales.SalesPerson_Order/Sales."Order" AS O
WHERE O/IsPaid = true
  AND O/OrderDate >= '[%BeginOfCurrentYear%]'
GROUP BY S/ID, S/FirstName, S/LastName
ORDER BY Revenue DESC
```

---

## Ví dụ 10: UNION — Báo cáo activity feed

```sql
-- Dataset: ActivityFeed
SELECT
    'Order' AS ActivityType,
    C/LastName AS CustomerName,
    O/OrderNumber AS Reference,
    O/TotalAmount AS Amount,
    O/OrderDate AS ActivityDate
FROM Sales."Order" AS O
JOIN O/Sales.Order_Customer/Sales.Customer AS C
WHERE O/OrderDate >= '[%BeginOfCurrentWeek%]'

UNION ALL

SELECT
    'Return' AS ActivityType,
    C/LastName AS CustomerName,
    R/ReturnNumber AS Reference,
    R/RefundAmount AS Amount,
    R/ReturnDate AS ActivityDate
FROM Sales."Return" AS R
JOIN R/Sales.Return_Customer/Sales.Customer AS C
WHERE R/ReturnDate >= '[%BeginOfCurrentWeek%]'

ORDER BY ActivityDate DESC
LIMIT 50
```

---

## Pattern: Cách dùng OQL trong Mendix

### Pattern 1: View Entity → Data Grid trực tiếp

```
1. Tạo View Entity trong Domain Model
2. Kéo View Entity lên Page → auto-generate Data Grid
3. Data Grid hiển thị kết quả OQL trực tiếp
4. User có thể filter, sort, search trên Data Grid
```

### Pattern 2: View Entity → Chart

```
1. Tạo View Entity với aggregate data (MonthlyRevenue, ProductSales)
2. Thêm Chart widget lên Page
3. Data source → View Entity
4. Cấu hình X-axis, Y-axis, Series từ View Entity attributes
```

### Pattern 3: Dataset → Report

```
1. Tạo Dataset trong module Resources
2. Định nghĩa parameters ($startDate, $endDate, $status...)
3. Thêm Report widgets trên Page
4. Kết nối Dataset với Report Grid
5. User nhập parameters → Report hiển thị
```

### Pattern 4: Java Action → OQL

```java
// Trong Java Action
String oqlQuery = "SELECT LastName, SUM(TotalAmount) AS TotalSpent " +
    "FROM Sales.Customer AS C " +
    "JOIN C/Sales.Customer_Order/Sales.\"Order\" AS O " +
    "WHERE O/IsPaid = true " +
    "GROUP BY C/LastName " +
    "ORDER BY TotalSpent DESC";

IDataTable result = Core.retrieveOQLDataTable(getContext(), oqlQuery);
for (DataRow row : result.getRows()) {
    String name = row.getString(getContext(), "LastName");
    BigDecimal total = row.getDecimal(getContext(), "TotalSpent");
    // Xử lý kết quả...
}
```

## Lưu ý chung

1. **Luôn test OQL** trong Studio Pro trước khi deploy
2. **Kiểm tra performance** với dataset lớn — dùng LIMIT khi có thể
3. **Xử lý NULL** — Dùng COALESCE() để tránh kết quả bất ngờ
4. **Security** — OQL không tự áp access rules, cần xử lý thủ công
5. **View Entity** — Ưu tiên dùng View Entity cho data hiển thị, Dataset cho report có parameters
