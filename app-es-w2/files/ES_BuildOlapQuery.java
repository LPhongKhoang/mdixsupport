// ============================================================
// File: javasource/productcatalogmodule/actions/ES_BuildOlapQuery.java
// Builds dynamic Elasticsearch Query DSL JSON based on filter params
// ============================================================
package productcatalogmodule.actions;

import com.mendix.systemwideinterfaces.core.IContext;
import com.mendix.webui.CustomJavaAction;

import java.util.ArrayList;
import java.util.List;

/**
 * Java Action: ES_BuildOlapQuery
 *
 * Parameters:
 *   - QueryType      : String  – "REVENUE_BY_CATEGORY" | "TOP_PRODUCTS" |
 *                                "REGION_HEATMAP" | "MONTHLY_TREND" |
 *                                "DRILL_DOWN" | "SEGMENT_DIST"
 *   - FilterYear     : Integer – 0 = no filter
 *   - FilterCategory : String  – "" = no filter
 *   - FilterRegion   : String  – "" = no filter
 *   - FilterSegment  : String  – "" = no filter
 *   - DateFrom       : String  – "yyyy-MM-dd", "" = no filter
 *   - DateTo         : String  – "yyyy-MM-dd", "" = no filter
 *   - TopN           : Integer – for TOP_PRODUCTS (default 10)
 *
 * Returns: String (JSON query body ready to POST to ES)
 */
public class ES_BuildOlapQuery extends CustomJavaAction<String> {

    private final String  queryType;
    private final Long    filterYear;
    private final String  filterCategory;
    private final String  filterRegion;
    private final String  filterSegment;
    private final String  dateFrom;
    private final String  dateTo;
    private final Long    topN;

    public ES_BuildOlapQuery(
            IContext context,
            String queryType,
            Long   filterYear,
            String filterCategory,
            String filterRegion,
            String filterSegment,
            String dateFrom,
            String dateTo,
            Long   topN) {
        super(context);
        this.queryType      = queryType;
        this.filterYear     = filterYear;
        this.filterCategory = filterCategory;
        this.filterRegion   = filterRegion;
        this.filterSegment  = filterSegment;
        this.dateFrom       = dateFrom;
        this.dateTo         = dateTo;
        this.topN           = (topN == null || topN == 0) ? 10 : topN;
    }

    @Override
    public String executeAction() throws Exception {
        String filterClause = buildFilterClause();
        
        switch (queryType) {
            case "REVENUE_BY_CATEGORY":   return buildRevenueByCategoryQuery(filterClause);
            case "TOP_PRODUCTS":          return buildTopProductsQuery(filterClause);
            case "REGION_HEATMAP":        return buildRegionHeatmapQuery(filterClause);
            case "MONTHLY_TREND":         return buildMonthlyTrendQuery(filterClause);
            case "DRILL_DOWN":            return buildDrillDownQuery(filterClause);
            case "SEGMENT_DIST":          return buildSegmentDistQuery(filterClause);
            default:
                throw new IllegalArgumentException("Unknown queryType: " + queryType);
        }
    }

    // ─────────────── Filter Builder ───────────────

    private String buildFilterClause() {
        List<String> filters = new ArrayList<>();

        // Date range filter (priority over year filter)
        if (dateFrom != null && !dateFrom.isEmpty() && dateTo != null && !dateTo.isEmpty()) {
            filters.add(String.format(
                "{\"range\":{\"order_date\":{\"gte\":\"%s\",\"lte\":\"%s\"}}}",
                dateFrom, dateTo
            ));
        } else if (filterYear != null && filterYear > 0) {
            filters.add(String.format("{\"term\":{\"order_year\":%d}}", filterYear));
        }

        if (filterCategory != null && !filterCategory.isEmpty()) {
            filters.add(String.format("{\"term\":{\"category_name\":\"%s\"}}", escape(filterCategory)));
        }
        if (filterRegion != null && !filterRegion.isEmpty()) {
            filters.add(String.format("{\"term\":{\"region_name\":\"%s\"}}", escape(filterRegion)));
        }
        if (filterSegment != null && !filterSegment.isEmpty()) {
            filters.add(String.format("{\"term\":{\"customer_segment\":\"%s\"}}", escape(filterSegment)));
        }

        if (filters.isEmpty()) {
            return "\"query\":{\"match_all\":{}}";
        }
        return "\"query\":{\"bool\":{\"filter\":[" + String.join(",", filters) + "]}}";
    }

    // ─────────────── Query Builders ───────────────

    private String buildRevenueByCategoryQuery(String filterClause) {
        return "{"
            + "\"size\":0,"
            + filterClause + ","
            + "\"aggs\":{"
            +   "\"by_category\":{"
            +     "\"terms\":{\"field\":\"category_name\",\"size\":20,\"order\":{\"total_revenue\":\"desc\"}},"
            +     "\"aggs\":{"
            +       "\"total_revenue\":{\"sum\":{\"field\":\"net_amount\"}},"
            +       "\"total_profit\":{\"sum\":{\"field\":\"gross_profit\"}},"
            +       "\"avg_margin\":{\"avg\":{\"field\":\"gross_margin_pct\"}},"
            +       "\"order_count\":{\"value_count\":{\"field\":\"fact_sales_id\"}},"
            +       "\"by_month\":{"
            +         "\"date_histogram\":{\"field\":\"order_date\",\"calendar_interval\":\"month\",\"format\":\"MMM-yyyy\"},"
            +         "\"aggs\":{"
            +           "\"monthly_revenue\":{\"sum\":{\"field\":\"net_amount\"}},"
            +           "\"monthly_profit\":{\"sum\":{\"field\":\"gross_profit\"}}"
            +         "}"
            +       "}"
            +     "}"
            +   "}"
            + "}"
            + "}";
    }

    private String buildTopProductsQuery(String filterClause) {
        return "{"
            + "\"size\":0,"
            + filterClause + ","
            + "\"aggs\":{"
            +   "\"top_products\":{"
            +     "\"terms\":{\"field\":\"product_name\",\"size\":" + topN + ",\"order\":{\"total_profit\":\"desc\"}},"
            +     "\"aggs\":{"
            +       "\"total_profit\":{\"sum\":{\"field\":\"gross_profit\"}},"
            +       "\"total_revenue\":{\"sum\":{\"field\":\"net_amount\"}},"
            +       "\"total_qty\":{\"sum\":{\"field\":\"quantity\"}},"
            +       "\"avg_margin\":{\"avg\":{\"field\":\"gross_margin_pct\"}},"
            +       "\"category\":{\"terms\":{\"field\":\"category_name\",\"size\":1}}"
            +     "}"
            +   "}"
            + "}"
            + "}";
    }

    private String buildRegionHeatmapQuery(String filterClause) {
        return "{"
            + "\"size\":0,"
            + filterClause + ","
            + "\"aggs\":{"
            +   "\"by_region\":{"
            +     "\"terms\":{\"field\":\"region_name\",\"size\":10},"
            +     "\"aggs\":{"
            +       "\"by_quarter\":{"
            +         "\"terms\":{\"field\":\"order_quarter\",\"size\":8,\"order\":{\"_key\":\"asc\"}},"
            +         "\"aggs\":{"
            +           "\"revenue\":{\"sum\":{\"field\":\"net_amount\"}},"
            +           "\"order_count\":{\"value_count\":{\"field\":\"fact_sales_id\"}},"
            +           "\"avg_order_val\":{\"avg\":{\"field\":\"net_amount\"}}"
            +         "}"
            +       "}"
            +     "}"
            +   "}"
            + "}"
            + "}";
    }

    private String buildMonthlyTrendQuery(String filterClause) {
        return "{"
            + "\"size\":0,"
            + filterClause + ","
            + "\"aggs\":{"
            +   "\"monthly_trend\":{"
            +     "\"date_histogram\":{\"field\":\"order_date\",\"calendar_interval\":\"month\",\"format\":\"yyyy-MM\"},"
            +     "\"aggs\":{"
            +       "\"revenue\":{\"sum\":{\"field\":\"net_amount\"}},"
            +       "\"profit\":{\"sum\":{\"field\":\"gross_profit\"}},"
            +       "\"order_count\":{\"value_count\":{\"field\":\"fact_sales_id\"}},"
            +       "\"moving_avg_revenue\":{\"moving_avg\":{\"buckets_path\":\"revenue\",\"window\":3,\"model\":\"simple\"}}"
            +     "}"
            +   "}"
            + "}"
            + "}";
    }

    private String buildDrillDownQuery(String filterClause) {
        return "{"
            + "\"size\":0,"
            + filterClause + ","
            + "\"aggs\":{"
            +   "\"products_in_category\":{"
            +     "\"terms\":{\"field\":\"product_name\",\"size\":20,\"order\":{\"revenue\":\"desc\"}},"
            +     "\"aggs\":{"
            +       "\"revenue\":{\"sum\":{\"field\":\"net_amount\"}},"
            +       "\"profit\":{\"sum\":{\"field\":\"gross_profit\"}},"
            +       "\"qty_sold\":{\"sum\":{\"field\":\"quantity\"}},"
            +       "\"avg_margin\":{\"avg\":{\"field\":\"gross_margin_pct\"}},"
            +       "\"by_segment\":{"
            +         "\"terms\":{\"field\":\"customer_segment\",\"size\":5},"
            +         "\"aggs\":{\"segment_revenue\":{\"sum\":{\"field\":\"net_amount\"}}}"
            +       "}"
            +     "}"
            +   "},"
            +   "\"total_revenue\":{\"sum\":{\"field\":\"net_amount\"}},"
            +   "\"total_profit\":{\"sum\":{\"field\":\"gross_profit\"}}"
            + "}"
            + "}";
    }

    private String buildSegmentDistQuery(String filterClause) {
        return "{"
            + "\"size\":0,"
            + filterClause + ","
            + "\"aggs\":{"
            +   "\"by_segment\":{"
            +     "\"terms\":{\"field\":\"customer_segment\",\"size\":10},"
            +     "\"aggs\":{"
            +       "\"revenue\":{\"sum\":{\"field\":\"net_amount\"}},"
            +       "\"profit\":{\"sum\":{\"field\":\"gross_profit\"}},"
            +       "\"order_count\":{\"value_count\":{\"field\":\"fact_sales_id\"}},"
            +       "\"avg_order\":{\"avg\":{\"field\":\"net_amount\"}},"
            +       "\"percentiles\":{\"percentiles\":{\"field\":\"net_amount\",\"percents\":[25,50,75,90,95]}}"
            +     "}"
            +   "}"
            + "}"
            + "}";
    }

    // ─────────────── Utility ───────────────

    /** Escape special characters for JSON string values */
    private String escape(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
