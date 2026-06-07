// ============================================================
// File: javasource/productcatalogmodule/actions/ES_ExecuteOlapQuery.java
// Đặt trong: [MendixProject]/javasource/productcatalogmodule/actions/
//
// Dependencies (thêm vào userlib/):
//   - elasticsearch-java-8.x.x.jar
//   - jackson-databind-2.x.x.jar
//   - jackson-core-2.x.x.jar
//   - jackson-annotations-2.x.x.jar
//   - httpclient5-5.x.x.jar
//   - httpcore5-5.x.x.jar
//
// Alternative: Nếu không muốn thêm JAR, dùng Java HttpClient (built-in Java 11+)
//              → xem phần "No-Dependency Option" bên dưới
// ============================================================
package productcatalogmodule.actions;

import com.mendix.systemwideinterfaces.core.IContext;
import com.mendix.systemwideinterfaces.core.IMendixObject;
import com.mendix.webui.CustomJavaAction;
import com.mendix.core.Core;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Base64;

/**
 * Java Action: ES_ExecuteOlapQuery
 *
 * Parameters (set trong Mendix Studio Pro):
 *   - QueryBody      : String  – JSON query body
 *   - IndexName      : String  – ES index name (e.g. "sales_fact")
 *   - EsHost         : String  – "localhost:9200"
 *   - EsUsername     : String  – optional, "" nếu không có auth
 *   - EsPassword     : String  – optional
 *
 * Returns: String (JSON response từ ES)
 */
public class ES_ExecuteOlapQuery extends CustomJavaAction<String> {

    private final String queryBody;
    private final String indexName;
    private final String esHost;
    private final String esUsername;
    private final String esPassword;

    public ES_ExecuteOlapQuery(
            IContext context,
            String queryBody,
            String indexName,
            String esHost,
            String esUsername,
            String esPassword) {
        super(context);
        this.queryBody   = queryBody;
        this.indexName   = indexName;
        this.esHost      = esHost;
        this.esUsername  = esUsername;
        this.esPassword  = esPassword;
    }

    @Override
    public String executeAction() throws Exception {
        // Build URL: POST /<index>/_search
        String url = String.format("http://%s/%s/_search", esHost, indexName);

        // Build HTTP request
        HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();

        HttpRequest.Builder requestBuilder = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(30))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(queryBody));

        // Add Basic Auth if credentials provided
        if (esUsername != null && !esUsername.isEmpty()) {
            String credentials = esUsername + ":" + esPassword;
            String encoded = Base64.getEncoder().encodeToString(credentials.getBytes());
            requestBuilder.header("Authorization", "Basic " + encoded);
        }

        HttpRequest request = requestBuilder.build();

        // Execute
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() >= 400) {
            Core.getLogger("ES_ExecuteOlapQuery").error(
                "ES query failed [HTTP " + response.statusCode() + "]: " + response.body()
            );
            throw new RuntimeException("Elasticsearch error " + response.statusCode() + ": " + response.body());
        }

        Core.getLogger("ES_ExecuteOlapQuery").debug(
            "ES query success [" + indexName + "] status=" + response.statusCode()
        );

        return response.body();
    }
}
