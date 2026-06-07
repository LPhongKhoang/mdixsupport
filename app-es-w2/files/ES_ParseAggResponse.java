// ============================================================
// File: javasource/productcatalogmodule/actions/ES_ParseAggResponse.java
// Parses ES aggregation JSON response into Mendix OlapResult objects
// Uses only built-in Java (no external JSON lib needed) via org.json bundled
// OR use Jackson if available in userlib
// ============================================================
package productcatalogmodule.actions;

import com.mendix.systemwideinterfaces.core.IContext;
import com.mendix.systemwideinterfaces.core.IMendixObject;
import com.mendix.webui.CustomJavaAction;
import com.mendix.core.Core;

import java.util.ArrayList;
import java.util.List;

// Use Jackson ObjectMapper (include jackson-databind in userlib)
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Java Action: ES_ParseAggResponse
 *
 * Parses the JSON response from ES and creates Mendix OlapBucket objects.
 * Each bucket = one row in the result (e.g., one category, one product).
 *
 * Parameters:
 *   - EsResponseJson : String  – Raw JSON string from ES_ExecuteOlapQuery
 *   - AggName        : String  – Top-level aggregation key (e.g. "by_category", "top_products")
 *   - Context        : IContext
 *
 * Returns: List<IMendixObject> – List of OlapBucket Mendix objects
 *
 * Domain Model Entity required (create in Mendix):
 *   OlapBucket {
 *     Label       : String   (bucket key, e.g. "Electronics")
 *     DocCount    : Long
 *     Revenue     : Decimal
 *     Profit      : Decimal
 *     AvgMargin   : Decimal
 *     Quantity    : Long
 *     AvgOrder    : Decimal
 *     OrderCount  : Long
 *     ExtraJson   : String   (raw sub-agg JSON for drill-down)
 *   }
 */
public class ES_ParseAggResponse extends CustomJavaAction<List<IMendixObject>> {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final String ENTITY_OLAP_BUCKET = "ProductCatalogModule.OlapBucket";

    private final String esResponseJson;
    private final String aggName;

    public ES_ParseAggResponse(IContext context, String esResponseJson, String aggName) {
        super(context);
        this.esResponseJson = esResponseJson;
        this.aggName        = aggName;
    }

    @Override
    public List<IMendixObject> executeAction() throws Exception {
        List<IMendixObject> results = new ArrayList<>();
        IContext ctx = getContext();

        JsonNode root    = MAPPER.readTree(esResponseJson);
        JsonNode aggs    = root.path("aggregations");
        JsonNode topAgg  = aggs.path(aggName);
        JsonNode buckets = topAgg.path("buckets");

        if (!buckets.isArray()) {
            Core.getLogger("ES_ParseAggResponse").warn(
                "No buckets found under aggregation key: " + aggName
            );
            return results;
        }

        for (JsonNode bucket : buckets) {
            IMendixObject obj = Core.instantiate(ctx, ENTITY_OLAP_BUCKET);

            // Always present
            obj.setValue(ctx, "Label",      bucket.path("key").asText(""));
            obj.setValue(ctx, "DocCount",   bucket.path("doc_count").asLong(0));

            // Revenue / Profit (field name varies by query, try common patterns)
            obj.setValue(ctx, "Revenue",    getDoubleValue(bucket, "total_revenue", "revenue", "monthly_revenue"));
            obj.setValue(ctx, "Profit",     getDoubleValue(bucket, "total_profit",  "profit",  "monthly_profit"));
            obj.setValue(ctx, "AvgMargin",  getDoubleValue(bucket, "avg_margin"));
            obj.setValue(ctx, "Quantity",   getLongValue(bucket,   "total_qty", "qty_sold"));
            obj.setValue(ctx, "AvgOrder",   getDoubleValue(bucket, "avg_order", "avg_order_val"));
            obj.setValue(ctx, "OrderCount", getLongValue(bucket,   "order_count"));

            // Store sub-agg JSON for drill-down (by_month, by_segment, etc.)
            JsonNode subAgg = bucket.path("by_month");
            if (subAgg.isMissingNode()) subAgg = bucket.path("by_quarter");
            if (subAgg.isMissingNode()) subAgg = bucket.path("by_segment");
            if (!subAgg.isMissingNode()) {
                obj.setValue(ctx, "ExtraJson", subAgg.toString());
            }

            results.add(obj);
        }

        Core.getLogger("ES_ParseAggResponse").debug(
            "Parsed " + results.size() + " buckets from aggregation: " + aggName
        );

        return results;
    }

    // ─────────────── Helpers ───────────────

    /** Try multiple field names, return first found value */
    private double getDoubleValue(JsonNode bucket, String... fieldNames) {
        for (String name : fieldNames) {
            JsonNode node = bucket.path(name).path("value");
            if (!node.isMissingNode() && !node.isNull()) {
                return node.asDouble(0.0);
            }
        }
        return 0.0;
    }

    private long getLongValue(JsonNode bucket, String... fieldNames) {
        for (String name : fieldNames) {
            JsonNode node = bucket.path(name);
            // value_count returns {value: N}
            if (node.has("value")) return node.path("value").asLong(0);
            // direct long
            if (!node.isMissingNode() && node.isNumber()) return node.asLong(0);
        }
        return 0L;
    }
}
