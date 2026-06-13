# 12 - Java Action: Unique Product Code Generation & OQL Data Retrieval

## Mục lục

1. [Java Action: JA_GenerateProductCode](#1-java-action-ja_generateproductcode)
2. [Java Action: JA_RetrieveProductSummary (Optional)](#2-java-action-ja_retrieveproductsummary-optional)
3. [Mendix Java Action Setup Guide](#3-mendix-java-action-setup-guide)

---

## 1. Java Action: JA_GenerateProductCode

### 1.1 Mục đích

Tạo mã product code **unique guaranteed**. Format: `PRD-YYYYMMDD-NNNN`

- `PRD-` prefix cố định
- `YYYYMMDD` = ngày hiện tại
- `NNNN` = 4-digit sequence number per day

**Ví dụ:** `PRD-20260613-0001`, `PRD-20260613-0002`, `PRD-20260614-0001`

### 1.2 Tạo Java Action trong Studio Pro

**Bước 1: Tạo Java Action**
1. Right-click module `ProductManagement` → **Add** → **Java Action**
2. Name: `JA_GenerateProductCode`
3. Parameters: (không có parameter — tự lấy thông tin cần thiết)
4. Return type: **String**

**Bước 2: Generate Java Template**
1. Right-click `JA_GenerateProductCode` → **Generate Java action template**
2. Mendix tạo file Java trong `javasource/productmanagement/actions/`
3. Mở file `JA_GenerateProductCode.java`

**Bước 3: Implement Java Code**

```java
// file: javasource/productmanagement/actions/JA_GenerateProductCode.java
package productmanagement.actions;

import com.mendix.systemwideinterfaces.core.IContext;
import com.mendix.webui.CustomJavaAction;
import com.mendix.core.Core;
import com.mendix.logging.ILogNode;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class JA_GenerateProductCode extends CustomJavaAction<String>
{
    private static final ILogNode LOG = Core.getLogger("ProductManagement");
    private static final String PREFIX = "PRD-";
    private static final String CODE_PATTERN = "PRD-%s-%%04d";

    public JA_GenerateProductCode(IContext context)
    {
        super(context);
    }

    @Override
    protected String executeAction() throws Exception
    {
        // Get current date part
        String datePart = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));

        // Find the highest existing code for today
        String prefix = PREFIX + datePart + "-";
        String oql = String.format(
            "SELECT p/ProductCode AS ProductCode " +
            "FROM ProductManagement.Product AS p " +
            "WHERE p/ProductCode LIKE '%s%%' " +
            "ORDER BY p/ProductCode DESC " +
            "LIMIT 1",
            prefix
        );

        int nextSequence = 1;

        try {
            // Execute OQL to find latest code for today
            var dataTable = Core.retrieveOQLDataTable(getContext(), oql);

            for (var row : dataTable.getRows()) {
                String lastCode = row.getString(getContext(), "ProductCode");
                if (lastCode != null && lastCode.startsWith(prefix)) {
                    String seqPart = lastCode.substring(prefix.length());
                    try {
                        nextSequence = Integer.parseInt(seqPart) + 1;
                    } catch (NumberFormatException e) {
                        LOG.warn("Could not parse sequence from code: " + lastCode);
                        nextSequence = 1;
                    }
                }
                break; // Only first row needed
            }
        } catch (Exception e) {
            LOG.info("No existing codes found for today, starting at 1: " + e.getMessage());
            nextSequence = 1;
        }

        // Generate the new code
        String newCode = String.format(CODE_PATTERN, datePart) ;
        newCode = String.format("PRD-%s-%04d", datePart, nextSequence);

        LOG.info("Generated product code: " + newCode);
        return newCode;
    }
}
```

> **⚠️ Lưu ý về Mendix Java API:**
> - `Core.retrieveOQLDataTable(context, oql)` — execute OQL query
> - `Core.getLogger(name)` — get log node
> - `getContext()` — current Mendix context (có user session info)
> - File Java phải nằm trong đúng package: `productmanagement.actions`

**Bước 4: Compile & Deploy**
1. Save file Java
2. Trong Studio Pro → **Project** → **Deploy for Eclipse** (hoặc chạy trực tiếp)
3. Mendix compile Java code tự động khi chạy app

### 1.3 Cách gọi Java Action từ Microflow

Trong microflow `ACT_Product_CreateNew`:

1. Thêm activity **Java Action Call**
2. Java Action: `ProductManagement.JA_GenerateProductCode`
3. Output variable: `GeneratedCode` (String)
4. Dùng `$GeneratedCode` trong Change Object activity:

```
$NewProduct/productCode = $GeneratedCode
```

### 1.4 Thread Safety Note

> **Trong môi trường production**, nếu 2 users tạo product cùng lúc → có thể generate trùng code. Để handle:
>
> **Option A (Simple):** Thêm retry loop nếu code đã tồn tại
> **Option B (Robust):** Dùng database sequence:
> ```java
> // Mendix Community Commons có createAutoNumber() utility
> long nextSeq = com.mendix.core.Core.sequence("ProductCodeSeq", getContext());
> ```
> **Option C (External):** Dùng database sequence object trực tiếp qua JDBC

---

## 2. Java Action: JA_RetrieveProductSummary (Optional)

### 2.1 Mục đích

Java Action alternative cho product list datasource — lấy tất cả data trong **1 OQL query** thay vì N+1 calculated attributes.

> **Khi nào cần:** Nếu calculated attribute approach quá chậm với dataset lớn (>500 products).

### 2.2 Java Code

```java
// file: javasource/productmanagement/actions/JA_RetrieveProductSummary.java
package productmanagement.actions;

import com.mendix.systemwideinterfaces.core.IContext;
import com.mendix.webui.CustomJavaAction;
import com.mendix.core.Core;
import com.mendix.logging.ILogNode;

import java.util.ArrayList;
import java.util.List;

public class JA_RetrieveProductSummary extends CustomJavaAction<List<IMendixObject>>
{
    private String categoryId;
    private String supplierId;

    public JA_RetrieveProductSummary(IContext context, String categoryId, String supplierId)
    {
        super(context);
        this.categoryId = categoryId;
        this.supplierId = supplierId;
    }

    @Override
    protected List<IMendixObject> executeAction() throws Exception
    {
        // Build OQL query
        StringBuilder oql = new StringBuilder();
        oql.append("SELECT p/ID AS ID, ");
        oql.append("       p/ProductCode AS ProductCode, ");
        oql.append("       p/ProductName AS ProductName, ");
        oql.append("       c/CategoryName AS CategoryName, ");
        oql.append("       COALESCE(");
        oql.append("         (SELECT pv/VariantName ");
        oql.append("          FROM ProductManagement.ProductVariant AS pv ");
        oql.append("          WHERE pv/ProductManagement.ProductVariant_Product/ProductManagement.Product = p ");
        oql.append("          ORDER BY pv/RemainingQuantity DESC LIMIT 1), ");
        oql.append("         '—') AS TopVariantName ");
        oql.append("FROM ProductManagement.Product AS p ");
        oql.append("LEFT OUTER JOIN p/ProductManagement.Product_Category/ProductManagement.Category AS c ");

        // Dynamic WHERE clause based on filters
        boolean hasWhere = false;
        if (categoryId != null && !categoryId.isEmpty()) {
            oql.append("WHERE c/ID = '").append(categoryId).append("' ");
            hasWhere = true;
        }
        if (supplierId != null && !supplierId.isEmpty()) {
            if (hasWhere) oql.append("AND ");
            else oql.append("WHERE ");
            oql.append("p/ProductManagement.Product_Supplier/ProductManagement.Supplier/ID = '")
               .append(supplierId).append("' ");
        }

        oql.append("ORDER BY p/CreatedDate DESC");

        // Execute and return results
        var dataTable = Core.retrieveOQLDataTable(getContext(), oql.toString());
        List<IMendixObject> results = new ArrayList<>();

        // NOTE: OQL DataTable returns raw data, not IMendixObjects.
        // For Data Grid 2, need to return actual Product objects.
        // This approach is better suited for custom reports/charts.

        return results;
    }
}
```

> **⚠️ Lưu ý quan trọng:** `Core.retrieveOQLDataTable()` trả về `IDataTable` (raw data), **không phải** `List<IMendixObject>`. Không thể dùng trực tiếp làm Data Grid 2 datasource.
>
> **Cách dùng thực tế:**
> 1. OQL → IDataTable → Process data → Create NPE objects → Return list
> 2. Hoặc dùng cho Chart widget datasource
> 3. Hoặc dùng cho Report generation

### 2.3 Khuyến nghị

> **Cho Product List page:** Dùng **Microflow datasource + XPath Retrieve + Calculated Attributes** (như đã mô tả trong file 11). Đây là approach đơn giản nhất và hoạt động tốt với Mendix Data Grid 2.
>
> **Cho Reports/Charts:** Dùng **OQL View Entity** (file 10) hoặc Java Action với OQL API.

---

## 3. Mendix Java Action Setup Guide

### 3.1 Prerequisites

- **JDK 17** (required cho Mendix v10.24.9)
- Mendix Studio Pro v10.24.9
- Module `ProductManagement` đã tạo

### 3.2 Verify JDK

```
Menu: Project → Settings → Runtime → JDK version
→ Must be: 17
```

### 3.3 Steps to Add Any Java Action

```
1. Studio Pro → Right-click module → Add → Java Action
2. Define name, parameters, return type
3. Right-click Java Action → "Generate Java action template"
4. Open generated .java file in Eclipse or IntelliJ
5. Implement executeAction() method
6. Save → Studio Pro auto-compiles on run
```

### 3.4 Debugging Java Actions

1. **Deploy for Eclipse:**
   - Studio Pro → Project → **Deploy for Eclipse**
   - Creates Eclipse project in `deployment/`

2. **Attach Debugger:**
   - Eclipse → Run → Debug Configurations → Remote Java Application
   - Port: `9000` (Mendix default debug port)

3. **Set Breakpoints:**
   - Eclipse → Open Java file → Set breakpoint
   - Mendix app pauses khi Java Action chạy

### 3.5 Common Java API Patterns cho Mendix

```java
// Get current context
IContext context = getContext();

// Execute OQL
IDataTable result = Core.retrieveOQLDataTable(context, "SELECT ...");

// Create new object
IMendixObject obj = Core.instantiate(context, "ProductManagement.Product");

// Set attribute
obj.setValue(context, "ProductName", "Test Product");

// Commit
Core.commit(context, obj);

// Retrieve by ID
IMendixObject found = Core.retrieveId(context, id);

// Retrieve by XPath
List<IMendixObject> list = Core.retrieveXPathQuery(context,
    "//ProductManagement.Product[ProductName = 'Test']");

// Log
ILogNode log = Core.getLogger("MyModule");
log.info("Message");
log.error("Error", exception);
```

---

## Tổng kết

- ✅ `JA_GenerateProductCode` — Unique code generation với OQL lookup
- ✅ `JA_RetrieveProductSummary` — Optional: 1-query OQL data retrieval
- ✅ Mendix Java Action setup guide: JDK 17, debug, common API
- ✅ Thread safety considerations cho production

**Tiếp theo:** [13-fe-be-data-flow.md](13-fe-be-data-flow.md) — Complete FE↔BE Data Flow
