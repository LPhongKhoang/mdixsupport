/**
 * JA_BuildEsAggregationQuery.java
 *
 * Mendix Java Action for building Elasticsearch Query DSL JSON
 * from OlapFilter parameters.
 *
 * Cách sử dụng trong Mendix Studio Pro v10:
 * 1. Tạo Java Action: "JA_BuildEsAggregationQuery"
 *    - Parameter: filter (Object) → SalesOLAP.OlapFilter
 *    - Return type: String
 * 2. Click "Go to Java" trong Studio Pro để generate template
 * 3. Copy toàn bộ nội dung file này vào giữa BEGIN USER CODE / END USER CODE
 *
 * File này là bản standalone — cần điều chỉnh import cho phù hợp
 * với Mendix project thực tế (xem phần IMPORTS).
 */

// ============================================================
// IMPORTS - Copy these vào đầu file Java Action trong Mendix
// ============================================================
import com.mendix.systemwideinterfaces.core.IContext;
import com.mendix.systemwideinterfaces.core.IMendixObject;
import com.mendix.core.Core;
// import java.util.List;
// import java.util.ArrayList;
import org.json.JSONObject;
import org.json.JSONArray;

// ============================================================
// MAIN CLASS
// ============================================================

public class JA_BuildEsAggregationQuery {

    // --------------------------------------------------------
    // MAIN METHOD - Entry point từ Microflow
    // --------------------------------------------------------
    /**
     * Build ES Query DSL JSON từ OlapFilter object.
     *
     * @param context  Mendix context
     * @param filter   OlapFilter IMendixObject
     * @return         ES Query DSL JSON string
     */
    public static String buildQuery(IContext context, IMendixObject filter) throws Exception {

        // === Extract filter parameters ===
        String drillDimension = getStringValue(context, filter, "drillDimension", "product");
        int drillLevel = getIntValue(context, filter, "drillLevel", 0);

        // === Build base query with filters ===
        JSONObject query = buildFilterQuery(context, filter);

        // === Build aggregation based on dimension + level ===
        JSONObject aggregations = buildAggregation(drillDimension, drillLevel);

        // === Assemble final ES query ===
        JSONObject esQuery = new JSONObject();
        esQuery.put("size", 0);  // We only want aggregations, not documents
        esQuery.put("query", query);
        esQuery.put("aggs", aggregations);

        return esQuery.toString();
    }

    // --------------------------------------------------------
    // BUILD FILTER QUERY
    // --------------------------------------------------------
    /**
     * Build the "query" part of ES Query DSL from filter parameters.
     * Uses "bool" + "filter" clauses for exact matching (no scoring).
     */
    private static JSONObject buildFilterQuery(IContext context, IMendixObject filter) throws Exception {
        JSONObject boolQuery = new JSONObject();
        JSONArray filterArray = new JSONArray();

        // Time filters
        addTermFilterIfPresent(filterArray, "year", getIntValue(context, filter, "yearFilter", -1));
        addTermFilterIfPresent(filterArray, "quarter", getIntValue(context, filter, "quarterFilter", -1));
        addTermFilterIfPresent(filterArray, "month", getIntValue(context, filter, "monthFilter", -1));

        // Product filters
        addKeywordFilterIfPresent(filterArray, "category_name", getStringValue(context, filter, "categoryFilter", null));
        addKeywordFilterIfPresent(filterArray, "product_name", getStringValue(context, filter, "productFilter", null));
        addKeywordFilterIfPresent(filterArray, "variant_sku", getStringValue(context, filter, "variantSkuFilter", null));

        // Customer filters
        addKeywordFilterIfPresent(filterArray, "customer_segment", getStringValue(context, filter, "segmentFilter", null));
        addKeywordFilterIfPresent(filterArray, "customer_name", getStringValue(context, filter, "customerFilter", null));

        // Geography filters
        addKeywordFilterIfPresent(filterArray, "country_name", getStringValue(context, filter, "countryFilter", null));
        addKeywordFilterIfPresent(filterArray, "city_name", getStringValue(context, filter, "cityFilter", null));
        addKeywordFilterIfPresent(filterArray, "store_name", getStringValue(context, filter, "storeFilter", null));

        // Date range filter
        String dateFrom = getStringValue(context, filter, "dateFrom", null);
        String dateTo = getStringValue(context, filter, "dateTo", null);
        if (dateFrom != null || dateTo != null) {
            addDateRangeFilter(filterArray, dateFrom, dateTo);
        }

        // Assemble bool query
        if (filterArray.length() > 0) {
            boolQuery.put("bool", new JSONObject().put("filter", filterArray));
        } else {
            // No filters → match all
            boolQuery.put("match_all", new JSONObject());
        }

        return boolQuery;
    }

    // --------------------------------------------------------
    // BUILD AGGREGATION
    // --------------------------------------------------------
    /**
     * Build aggregation based on drill dimension and level.
     *
     * Dimension "product":
     *   Level 0 → terms on "category_name"
     *   Level 1 → terms on "product_name.keyword"
     *   Level 2 → terms on "variant_sku"
     *
     * Dimension "time":
     *   Level 0 → terms on "year"
     *   Level 1 → terms on "quarter"
     *   Level 2 → terms on "month"
     *   Level 3 → date_histogram on "sale_date" (calendar_interval: day)
     *
     * Dimension "customer":
     *   Level 0 → terms on "customer_segment"
     *   Level 1 → terms on "customer_name.keyword"
     *
     * Dimension "geography":
     *   Level 0 → terms on "country_name"
     *   Level 1 → terms on "city_name"
     *   Level 2 → terms on "store_name.keyword"
     */
    private static JSONObject buildAggregation(String dimension, int level) {
        JSONObject aggs = new JSONObject();
        JSONObject byDimension = new JSONObject();
        JSONObject termsAgg = new JSONObject();
        JSONObject subAggs = new JSONObject();

        // Metrics sub-aggregations (always include)
        subAggs.put("total_revenue", new JSONObject()
            .put("sum", new JSONObject().put("field", "total_amount")));
        subAggs.put("total_qty", new JSONObject()
            .put("sum", new JSONObject().put("field", "quantity")));
        subAggs.put("avg_order", new JSONObject()
            .put("avg", new JSONObject().put("field", "total_amount")));

        String aggField;
        int aggSize = 100;

        switch (dimension.toLowerCase()) {
            case "product":
                aggField = getProductAggField(level);
                break;
            case "time":
                aggField = getTimeAggField(level);
                break;
            case "customer":
                aggField = getCustomerAggField(level);
                break;
            case "geography":
                aggField = getGeographyAggField(level);
                break;
            default:
                aggField = "category_name";
        }

        // Build terms aggregation
        if ("sale_date".equals(aggField)) {
            // Date histogram for time level 3
            termsAgg.put("date_histogram", new JSONObject()
                .put("field", "sale_date")
                .put("calendar_interval", "day")
                .put("format", "yyyy-MM-dd")
                .put("min_doc_count", 0));
        } else {
            termsAgg.put("terms", new JSONObject()
                .put("field", aggField)
                .put("size", aggSize)
                .put("order", new JSONObject()
                    .put("total_revenue", "desc")));
        }

        termsAgg.put("aggs", subAggs);
        byDimension.put("by_dimension", termsAgg);
        aggs = byDimension;

        return aggs;
    }

    // --------------------------------------------------------
    // AGGREGATION FIELD RESOLVERS
    // --------------------------------------------------------

    private static String getProductAggField(int level) {
        switch (level) {
            case 0:  return "category_name";
            case 1:  return "product_name.keyword";
            case 2:  return "variant_sku";
            default: return "category_name";
        }
    }

    private static String getTimeAggField(int level) {
        switch (level) {
            case 0:  return "year";
            case 1:  return "quarter";
            case 2:  return "month";
            case 3:  return "sale_date";  // uses date_histogram
            default: return "year";
        }
    }

    private static String getCustomerAggField(int level) {
        switch (level) {
            case 0:  return "customer_segment";
            case 1:  return "customer_name.keyword";
            default: return "customer_segment";
        }
    }

    private static String getGeographyAggField(int level) {
        switch (level) {
            case 0:  return "country_name";
            case 1:  return "city_name";
            case 2:  return "store_name.keyword";
            default: return "country_name";
        }
    }

    // --------------------------------------------------------
    // HELPER: Filter builders
    // --------------------------------------------------------

    /**
     * Add term filter for integer field (year, quarter, month)
     */
    private static void addTermFilterIfPresent(JSONArray filterArray, String field, int value) {
        if (value > 0) {
            filterArray.put(new JSONObject()
                .put("term", new JSONObject().put(field, value)));
        }
    }

    /**
     * Add term filter for keyword field
     */
    private static void addKeywordFilterIfPresent(JSONArray filterArray, String field, String value) {
        if (value != null && !value.isEmpty()) {
            filterArray.put(new JSONObject()
                .put("term", new JSONObject().put(field, value)));
        }
    }

    /**
     * Add date range filter
     */
    private static void addDateRangeFilter(JSONArray filterArray, String dateFrom, String dateTo) {
        JSONObject rangeFilter = new JSONObject();
        JSONObject rangeConditions = new JSONObject();

        if (dateFrom != null && !dateFrom.isEmpty()) {
            rangeConditions.put("gte", dateFrom);
        }
        if (dateTo != null && !dateTo.isEmpty()) {
            rangeConditions.put("lte", dateTo);
        }

        rangeFilter.put("range", new JSONObject().put("sale_date", rangeConditions));
        filterArray.put(rangeFilter);
    }

    // --------------------------------------------------------
    // HELPER: Extract values from IMendixObject
    // --------------------------------------------------------

    private static String getStringValue(IContext context, IMendixObject obj, String memberName, String defaultValue) {
        try {
            Object value = obj.getValue(context, memberName);
            return value != null ? value.toString() : defaultValue;
        } catch (Exception e) {
            return defaultValue;
        }
    }

    private static int getIntValue(IContext context, IMendixObject obj, String memberName, int defaultValue) {
        try {
            Object value = obj.getValue(context, memberName);
            if (value instanceof Number) {
                return ((Number) value).intValue();
            }
            return defaultValue;
        } catch (Exception e) {
            return defaultValue;
        }
    }

    // --------------------------------------------------------
    // QUICK TEST (standalone, not used in Mendix)
    // --------------------------------------------------------
    public static void main(String[] args) throws Exception {
        // Simulate output for each dimension/level combination
        String[] dimensions = {"product", "time", "customer", "geography"};

        for (String dim : dimensions) {
            for (int level = 0; level <= 3; level++) {
                System.out.println("\n=== " + dim + " level " + level + " ===");

                JSONObject boolQuery = new JSONObject();
                boolQuery.put("match_all", new JSONObject());

                JSONObject aggs = buildAggregation(dim, level);

                JSONObject esQuery = new JSONObject();
                esQuery.put("size", 0);
                esQuery.put("query", boolQuery);
                esQuery.put("aggs", aggs);

                System.out.println(esQuery.toString(2));
            }
        }
    }
}


// ============================================================
// MENDIX JAVA ACTION TEMPLATE - Paste giữa BEGIN/END USER CODE
// ============================================================
/*
// BEGIN USER CODE
try {
    String queryJson = JA_BuildEsAggregationQuery.buildQuery(context, filter);

    // Log the generated query for debugging
    Core.getLogger("SalesOLAP").info("ES Query: " + queryJson);

    return queryJson;
} catch (Exception e) {
    Core.getLogger("SalesOLAP").error("Failed to build ES query: " + e.getMessage());
    throw new Exception("Failed to build ES aggregation query: " + e.getMessage());
}
// END USER CODE
*/
