// ============================================================
// File: javasource/productcatalogmodule/actions/ES_GetAggName.java
// Simple mapper: QueryType String → ES aggregation key name
// ============================================================
package productcatalogmodule.actions;

import com.mendix.systemwideinterfaces.core.IContext;
import com.mendix.webui.CustomJavaAction;

/**
 * Java Action: ES_GetAggName
 *
 * Parameters:
 *   - QueryType : String
 *
 * Returns: String – top-level aggregation name in ES response
 */
public class ES_GetAggName extends CustomJavaAction<String> {

    private final String queryType;

    public ES_GetAggName(IContext context, String queryType) {
        super(context);
        this.queryType = queryType;
    }

    @Override
    public String executeAction() throws Exception {
        switch (queryType) {
            case "REVENUE_BY_CATEGORY": return "by_category";
            case "TOP_PRODUCTS":        return "top_products";
            case "REGION_HEATMAP":      return "by_region";
            case "MONTHLY_TREND":       return "monthly_trend";
            case "DRILL_DOWN":          return "products_in_category";
            case "SEGMENT_DIST":        return "by_segment";
            default:                    return "buckets";
        }
    }
}


// ============================================================
// File: javasource/productcatalogmodule/actions/ES_ParseMonthlyTrend.java
// Parses monthly_trend aggregation into OlapChartDataPoint objects
// ============================================================

// package productcatalogmodule.actions;
//
// import com.mendix.systemwideinterfaces.core.IContext;
// import com.mendix.systemwideinterfaces.core.IMendixObject;
// import com.mendix.webui.CustomJavaAction;
// import com.mendix.core.Core;
// import com.fasterxml.jackson.databind.JsonNode;
// import com.fasterxml.jackson.databind.ObjectMapper;
// import java.util.ArrayList;
// import java.util.List;
//
// public class ES_ParseMonthlyTrend extends CustomJavaAction<List<IMendixObject>> {
//
//     private static final ObjectMapper MAPPER = new ObjectMapper();
//     private static final String ENTITY = "ProductCatalogModule.OlapChartDataPoint";
//
//     private final String esResponseJson;
//
//     public ES_ParseMonthlyTrend(IContext context, String esResponseJson) {
//         super(context);
//         this.esResponseJson = esResponseJson;
//     }
//
//     @Override
//     public List<IMendixObject> executeAction() throws Exception {
//         List<IMendixObject> results = new ArrayList<>();
//         IContext ctx = getContext();
//
//         JsonNode root    = MAPPER.readTree(esResponseJson);
//         JsonNode buckets = root.path("aggregations").path("monthly_trend").path("buckets");
//
//         for (JsonNode bucket : buckets) {
//             IMendixObject obj = Core.instantiate(ctx, ENTITY);
//             obj.setValue(ctx, "PeriodLabel", bucket.path("key_as_string").asText(""));
//             obj.setValue(ctx, "Revenue",     bucket.path("revenue").path("value").asDouble(0));
//             obj.setValue(ctx, "Profit",      bucket.path("profit").path("value").asDouble(0));
//             obj.setValue(ctx, "MovingAvg",   bucket.path("moving_avg_revenue").path("value").asDouble(0));
//             obj.setValue(ctx, "OrderCount",  bucket.path("order_count").path("value").asLong(0));
//             results.add(obj);
//         }
//         return results;
//     }
// }
