# Alternative: Call REST API + Import Mapping (No Java Required)
# Dùng khi không muốn viết Java hoặc không có JAR

## Overview

Thay vì Java Action, dùng Mendix built-in:
- **Call REST (GET/POST)** activity trong Microflow
- **Import Mapping** để map JSON response → Mendix objects

Ưu điểm: Không cần JAR, dễ debug, Mendix Studio Pro tự xử lý HTTP
Nhược điểm: Import Mapping chỉ map fixed structure, khó handle dynamic agg keys

---

## Bước 1: Tạo JSON Structure từ ES Response

Vào **App > Add Other > JSON Structure**

Name: `JST_EsAggResponse_ByCategory`

Paste sample JSON (từ file `02-query-dsl-patterns.md` – phần Response shape):

```json
{
  "took": 5,
  "hits": { "total": { "value": 3000 } },
  "aggregations": {
    "by_category": {
      "buckets": [
        {
          "key": "Electronics",
          "doc_count": 450,
          "total_revenue": { "value": 125000000.0 },
          "total_profit":  { "value": 42000000.0 },
          "avg_margin":    { "value": 33.6 },
          "order_count":   { "value": 450 }
        }
      ]
    }
  }
}
```

Click **Refresh** → Mendix parse thành tree

---

## Bước 2: Tạo Import Mapping

**App > Add Other > Import Mapping**

Name: `IM_EsAggResponse_ByCategory`

- JSON Structure: `JST_EsAggResponse_ByCategory`
- Select elements: chọn tất cả nodes
- Map to entity: `OlapBucket`

Mapping rules:
| JSON Path                                          | Entity Attribute |
|----------------------------------------------------|-----------------|
| `aggregations/by_category/buckets[]/key`           | Label           |
| `aggregations/by_category/buckets[]/doc_count`     | DocCount        |
| `aggregations/by_category/buckets[]/total_revenue/value` | Revenue   |
| `aggregations/by_category/buckets[]/total_profit/value`  | Profit    |
| `aggregations/by_category/buckets[]/avg_margin/value`    | AvgMargin |
| `aggregations/by_category/buckets[]/order_count/value`   | OrderCount|

---

## Bước 3: Microflow – ACT_OLAP_CallRest_RevByCategory

```
INPUT:  OlapFilterParams $FilterParams
OUTPUT: List of OlapBucket

STEP 1: Build query JSON (String variable activity)
────────────────────────────────────────────────────
Variable name: $QueryJson
Value (use string template):

'{"size":0,' +
'"query":{"bool":{"filter":[' +
  if $FilterParams/FilterYear > 0 
    then '{"term":{"order_year":' + $FilterParams/FilterYear + '}},'
    else '' +
  if $FilterParams/FilterCategory != ''
    then '{"term":{"category_name":"' + $FilterParams/FilterCategory + '"}},'
    else '' +
  '{"match_all":{}}' +
']}},' +
'"aggs":{"by_category":{"terms":{"field":"category_name","size":20,"order":{"total_revenue":"desc"}},' +
'"aggs":{"total_revenue":{"sum":{"field":"net_amount"}},"total_profit":{"sum":{"field":"gross_profit"}},' +
'"avg_margin":{"avg":{"field":"gross_margin_pct"}},"order_count":{"value_count":{"field":"fact_sales_id"}}}}}}'


STEP 2: Call REST (POST)
────────────────────────────────────────────────────
Location: 'http://' + getConstant('ES_Host') + '/sales_fact/_search'
Method:   POST
Request:
  - HTTP Headers: Content-Type = application/json
  - Custom request template: $QueryJson

Response:
  - Import Mapping: IM_EsAggResponse_ByCategory
  - Variable: $BucketList (List of OlapBucket)


STEP 3: Loop over $BucketList
────────────────────────────────────────────────────
For each $Bucket:
  - Change $Bucket: Associate with $FilterParams
  - Commit $Bucket
```

---

## Bước 4: Tạo JSON Structure cho Monthly Trend

```json
{
  "aggregations": {
    "monthly_trend": {
      "buckets": [
        {
          "key_as_string": "2024-01",
          "doc_count": 120,
          "revenue":    { "value": 45000000.0 },
          "profit":     { "value": 15750000.0 },
          "moving_avg_revenue": { "value": 43000000.0 }
        }
      ]
    }
  }
}
```

→ Tạo Import Mapping `IM_EsAggResponse_MonthlyTrend`
→ Map to entity `OlapChartDataPoint`:
  - `key_as_string` → PeriodLabel
  - `revenue/value` → Revenue
  - `profit/value`  → Profit
  - `moving_avg_revenue/value` → MovingAvg

---

## Bước 5: Lưu ý khi dùng Call REST

### Authentication (Elasticsearch Basic Auth):
Trong Call REST activity → tab Headers → Add header:
- Name: `Authorization`
- Value: `'Basic ' + base64encode(getConstant('ES_Username') + ':' + getConstant('ES_Password'))`

Nếu Mendix chưa có `base64encode` built-in, dùng Java Action nhỏ:
```java
// ES_Base64Encode.java
public String executeAction() {
    return Base64.getEncoder().encodeToString(input.getBytes());
}
```

### Error Handling trong Call REST:
- Tab **Error handling** → Custom without rollback
- Add error variable: `$latestError`
- Log: `Core.getLogger("OLAP").error("ES error: " + $latestError/Message)`

---

## So sánh: Java Action vs Call REST

| Aspect              | Java Action                    | Call REST                     |
|--------------------|-------------------------------|-------------------------------|
| Flexibility         | ✅ Rất cao (full Java)         | ⚠️ Giới hạn bởi Import Mapping|
| Dynamic queries     | ✅ Programmatic build          | ⚠️ String template             |
| Debugging           | ⚠️ Cần Eclipse/log            | ✅ Mendix built-in debug       |
| Response parsing    | ✅ Full programmatic           | ⚠️ Fixed structure             |
| Setup effort        | ⚠️ Cần JAR + Java skill       | ✅ Mendix-native               |
| Nested aggs         | ✅ Fully supported             | ⚠️ Phức tạp với Import Mapping |
| **Recommended for** | Complex OLAP (nhiều query types)| Simple 1-2 fixed query types  |

**Kết luận:** Dùng **Java Action** cho production OLAP system.
Dùng **Call REST** cho prototype nhanh hoặc fixed queries đơn giản.
