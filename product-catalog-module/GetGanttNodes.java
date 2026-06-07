package productcatalogmodule.actions;

import com.mendix.core.Core;
import com.mendix.core.action.custom.CustomJavaAction;
import com.mendix.systemwideinterfaces.core.IContext;
import com.mendix.systemwideinterfaces.core.IDataTable;
import com.mendix.systemwideinterfaces.core.IMendixObject;

import java.util.ArrayList;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Java Action: GetGanttNodes
 *
 * Executes an OQL query that flattens Category → Product → ProductVariant
 * into a single result set, then builds a hierarchical list of GanttNodeDTO
 * objects for rendering in a Gantt chart widget.
 *
 * Hierarchy:
 *   Category  (ParentId = 0, root group node)
 *     └─ Product  (ParentId = Category.id, sub-group node)
 *          └─ ProductVariant  (ParentId = Product.id, leaf with date bar)
 *
 * Setup in Mendix Studio Pro:
 *   1. Create a Java Action named "GetGanttNodes"
 *   2. Return type: List<IMendixObject>  (MendixObjectList)
 *   3. No input parameters needed
 *   4. Click "Go to Java" → paste this entire class content
 */
public class GetGanttNodes extends CustomJavaAction<List<IMendixObject>> {

    public GetGanttNodes(IContext context) {
        super(context);
    }

    @Override
    public List<IMendixObject> executeAction() throws Exception {
        IContext context = getContext();

        // ── 1. Build & execute OQL (flat join: Variant × Product × Category) ──
        String oql = buildOqlQuery();
        IDataTable dataTable = Core.retrieveOQLDataTable(context, oql);

        List<IMendixObject> result = new ArrayList<>();
        Set<Long> seenCategories = new HashSet<>();
        Set<Long> seenProducts   = new HashSet<>();

        // ── 2. Iterate rows → build hierarchy ──
        //
        // Column indices (matching SELECT order):
        //  0  Category_Id            (Long)
        //  1  Category_Name          (String)
        //  2  Category_SortOrder     (Integer)
        //  3  Product_Id             (Long)
        //  4  Product_Name           (String)
        //  5  Product_Code           (String)
        //  6  Product_CreatedDateAt  (DateTime)
        //  7  Variant_Id             (Long)
        //  8  Variant_SKU            (String)
        //  9  Variant_Color          (String)
        // 10  Variant_Size           (String)
        // 11  Variant_Price          (Decimal)   — not used in DTO
        // 12  Variant_StockQty       (Integer)   — not used in DTO
        // 13  Variant_SoldQty        (Integer)   — not used in DTO
        // 14  Variant_Note           (String)
        // 15  Variant_StartDate      (DateTime)
        // 16  Variant_EndDate        (DateTime)

        for (int i = 0; i < dataTable.getRowCount(); i++) {
            Long   categoryId       = getLong(dataTable, i, 0);
            String categoryName     = getString(dataTable, i, 1);
            Long   productId        = getLong(dataTable, i, 3);
            String productName      = getString(dataTable, i, 4);
            String productCode      = getString(dataTable, i, 5);
            Date   productCreated   = getDate(dataTable, i, 6);
            Long   variantId        = getLong(dataTable, i, 7);
            String variantSku       = getString(dataTable, i, 8);
            String variantColor     = getString(dataTable, i, 9);
            String variantSize      = getString(dataTable, i, 10);
            String variantNote      = getString(dataTable, i, 14);
            Date   variantStart     = getDate(dataTable, i, 15);
            Date   variantEnd       = getDate(dataTable, i, 16);

            // ── Category node (root level, created once per unique category) ──
            if (categoryId != null && !seenCategories.contains(categoryId)) {
                seenCategories.add(categoryId);
                result.add(createGanttNode(context,
                    categoryId, 0L, categoryName, "Category",
                    null, null, null, null));
            }

            // ── Product node (created once per unique product) ──
            if (productId != null && !seenProducts.contains(productId)) {
                seenProducts.add(productId);
                result.add(createGanttNode(context,
                    productId, categoryId, productName, "Product",
                    productCreated, null, null, productCode));
            }

            // ── Variant node (every row becomes a leaf) ──
            String displayName = buildVariantName(variantSku, variantColor, variantSize);
            result.add(createGanttNode(context,
                variantId, productId, displayName, "Variant",
                variantStart, variantEnd, variantNote, variantSku));
        }

        return result;
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  OQL — flat join query
    // ══════════════════════════════════════════════════════════════════════════

    private String buildOqlQuery() {
        return
            "SELECT " +
            "  C.id            AS Category_Id, " +
            "  C.Name          AS Category_Name, " +
            "  C.SortOrder     AS Category_SortOrder, " +
            "  P.id            AS Product_Id, " +
            "  P.Name          AS Product_Name, " +
            "  P.Code          AS Product_Code, " +
            "  P.CreatedDateAt AS Product_CreatedDateAt, " +
            "  PV.id           AS Variant_Id, " +
            "  PV.SKU          AS Variant_SKU, " +
            "  PV.Color        AS Variant_Color, " +
            "  PV.Size         AS Variant_Size, " +
            "  PV.Price        AS Variant_Price, " +
            "  PV.StockQty     AS Variant_StockQty, " +
            "  PV.SoldQty      AS Variant_SoldQty, " +
            "  PV.Note         AS Variant_Note, " +
            "  PV.StartDate    AS Variant_StartDate, " +
            "  PV.EndDate      AS Variant_EndDate " +
            "FROM ProductCatalogModule.ProductVariant AS PV " +
            "  JOIN PV/ProductCatalogModule.ProductVariant_Product/ProductCatalogModule.Product AS P " +
            "  JOIN P/ProductCatalogModule.Product_Category/ProductCatalogModule.Category AS C " +
            "WHERE PV.IsActive = true " +
            "  AND P.IsActive = true " +
            "  AND C.IsActive = true " +
            "ORDER BY C.SortOrder, P.Name, PV.SKU";
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  Helper: create a GanttNodeDTO IMendixObject
    // ══════════════════════════════════════════════════════════════════════════

    private IMendixObject createGanttNode(IContext ctx,
            Long nodeId, Long parentId, String name, String nodeType,
            Date startDate, Date endDate, String note, String sku) throws Exception {

        IMendixObject node = Core.instantiate(ctx, "ProductCatalogModule.GanttNodeDTO");
        node.setValue(ctx, "NodeID",   nodeId);
        node.setValue(ctx, "ParentId", parentId);
        node.setValue(ctx, "Name",     name     != null ? name     : "");
        node.setValue(ctx, "NodeType", nodeType != null ? nodeType : "");
        node.setValue(ctx, "StartDate", startDate);
        node.setValue(ctx, "EndDate",   endDate);
        node.setValue(ctx, "Note",      note);
        node.setValue(ctx, "SKU",       sku);
        return node;
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  Helper: build variant display name  → "Color - Size" or SKU fallback
    // ══════════════════════════════════════════════════════════════════════════

    private String buildVariantName(String sku, String color, String size) {
        if (color != null && !color.isEmpty()) {
            if (size != null && !size.isEmpty()) {
                return color + " - " + size;
            }
            return color;
        }
        return sku != null ? sku : "";
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  Helper: safe IDataTable value extraction
    //  NOTE: If your Mendix version uses a different IDataTable API,
    //        adjust getValue() call accordingly (e.g., getCell, getObject).
    // ══════════════════════════════════════════════════════════════════════════

    private Long getLong(IDataTable table, int row, int col) {
        Object val = table.getValue(row, col);
        if (val == null) return null;
        if (val instanceof Long)   return (Long) val;
        if (val instanceof Number) return ((Number) val).longValue();
        return null;
    }

    private String getString(IDataTable table, int row, int col) {
        Object val = table.getValue(row, col);
        return val != null ? val.toString() : null;
    }

    private Date getDate(IDataTable table, int row, int col) {
        Object val = table.getValue(row, col);
        if (val instanceof Date) return (Date) val;
        return null;
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  Required by Mendix Java Action framework
    // ══════════════════════════════════════════════════════════════════════════

    @Override
    public String getReturnType() {
        return "List<MendixObject>";
    }
}
