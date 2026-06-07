# 06 - Cấu hình REST Call và Import Mapping trong Mendix Studio Pro v10

> **Module:** SalesOLAP
> **Integration:** Elasticsearch (POST `_search` API)
> **Mục tiêu:** Gửi ES Query DSL, parse response JSON thành Mendix NPE objects

---

## Tổng quan kiến trúc

```
Microflow (Mendix)
   │
   ├─ 1. Xây dựng ES Query DSL (JSON string)
   ├─ 2. Call REST → POST http://localhost:9200/sales_olap/_search
   ├─ 3. Response JSON → Import Mapping → NPE Objects
   └─ 4. Trả về List<EsAggBucket> cho Data Grid / Chart
```

**Domain Model (Non-Persistent Entities):**

```
EsResponseWrapper (NPE)
├── took: Integer
├── totalHits: Integer
├── *── EsAggregationWrapper (NPE)
│   ├── aggName: String
│   └── *── EsAggBucket (NPE)
│       ├── key: String
│       ├── keyAsString: String
│       ├── docCount: Integer
│       ├── amountSum: Decimal
│       └── quantitySum: Integer
```

---

## 1. JSON Structure (JSON Schema)

### 1.1 Tạo file JSON Schema

Trong Mendix Studio Pro, cần tạo một **JSON Structure** document để mô tả cấu trúc response từ Elasticsearch. JSON Structure này sẽ được sử dụng làm nguồn (source) cho Import Mapping.

**Cách tạo JSON Structure:**

1. Trong **Project Explorer**, right-click vào module **SalesOLAP**
2. Chọn **Add other** → **JSON Structure**
3. Đặt tên: `EsSearchResponse`
4. Mở file `EsSearchResponse` vừa tạo

### 1.2 Định nghĩa JSON Schema

Trong tab **JSON Schema** của JSON Structure editor, paste nội dung sau:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "took": {
      "type": "integer"
    },
    "hits": {
      "type": "object",
      "properties": {
        "total": {
          "type": "object",
          "properties": {
            "value": {
              "type": "integer"
            },
            "relation": {
              "type": "string"
            }
          }
        }
      }
    },
    "aggregations": {
      "type": "object",
      "properties": {
        "by_dimension": {
          "type": "object",
          "properties": {
            "buckets": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "key": {
                    "type": "string"
                  },
                  "doc_count": {
                    "type": "integer"
                  },
                  "total_revenue": {
                    "type": "object",
                    "properties": {
                      "value": {
                        "type": "number"
                      }
                    }
                  },
                  "total_qty": {
                    "type": "object",
                    "properties": {
                      "value": {
                        "type": "integer"
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

> **Lưu ý:** Schema trên mô tả chính xác cấu trúc response của ES aggregation query. Tên aggregation `by_dimension` phải khớp với tên bạn sử dụng trong ES query DSL.

### 1.3 Xác minh JSON Structure

Sau khi paste schema:

1. Nhấn **Parse** hoặc Mendix sẽ tự động parse
2. Kiểm tra tree view hiển thị đúng cấu trúc phân cấp:
   - `took` (Integer)
   - `hits` → `total` → `value` (Integer)
   - `aggregations` → `by_dimension` → `buckets` (Array)
     - `key` (String)
     - `doc_count` (Integer)
     - `total_revenue` → `value` (Number)
     - `total_qty` → `value` (Integer)
3. Nhấn **Save** (Ctrl+S)

---

## 2. Import Mapping Setup

### 2.1 Tạo Import Mapping Document

1. Trong **Project Explorer**, right-click vào module **SalesOLAP**
2. Chọn **Add other** → **Import Mapping**
3. Đặt tên: `IM_EsSearchResponse`
4. Mở file `IM_EsSearchResponse` vừa tạo

### 2.2 Chọn JSON Structure Source

1. Trong Import Mapping editor, tại dropdown **Source**, chọn **JSON structure**
2. Click **Select** và chọn `EsSearchResponse` (JSON Structure vừa tạo ở bước 1)
3. Mendix sẽ hiển thị tree JSON structure ở panel bên trái

### 2.3 Map JSON Fields sang NPE Attributes

Thực hiện mapping từng trường JSON sang entity/attribute tương ứng:

#### Bước 1: Map Root Object → EsResponseWrapper

1. Click vào element gốc (root object) trong JSON tree
2. Tại panel **Element mapping**, chọn:
   - **Entity:** `SalesOLAP.EsResponseWrapper`
   - Mapping type: **Object**

#### Bước 2: Map `took` → EsResponseWrapper.took

1. Click vào element `took` trong JSON tree
2. Tại panel **Element mapping**, chọn:
   - **Attribute:** `took` (Integer)
3. Đánh dấu checkbox **Map automatically** nếu muốn Mendix tự map theo tên giống nhau

#### Bước 3: Map `hits.total.value` → EsResponseWrapper.totalHits

1. Click vào element `hits` → chọn **Map to element** nhưng không cần map sang entity riêng, chỉ cần chọn **Value** cho child
2. Click vào `hits` → `total` → `value`
3. Tại panel **Element mapping**, chọn:
   - **Attribute:** `totalHits` (Integer)
   - **Association:** (để trống - map trực tiếp vào EsResponseWrapper)

> **Quan trọng:** Vì `hits` và `hits.total` không phải là entity riêng mà chỉ là nested object trong JSON, ta cần map `value` trực tiếp vào attribute của `EsResponseWrapper`. Nếu Mendix yêu cầu chọn entity cho `hits`, chọn "Do not map" cho `hits` và `total`, rồi map `value` vào `EsResponseWrapper.totalHits`.

#### Bước 4: Map `aggregations.by_dimension` → EsAggregationWrapper

1. Click vào element `aggregations` → chọn **Do not map** (không map thành entity)
2. Click vào element `by_dimension`
3. Tại panel **Element mapping**, chọn:
   - **Entity:** `SalesOLAP.EsAggregationWrapper`
   - **Association:** `SalesOLAP.EsResponseWrapper_EsAggregationWrapper`
4. Nếu muốn gán tên aggregation, có thể set attribute `aggName` thành giá trị static `"by_dimension"`

#### Bước 5: Map `aggregations.by_dimension.buckets[]` → List of EsAggBucket

1. Click vào element `buckets` (kiểu Array)
2. Tại panel **Element mapping**, chọn:
   - **Entity:** `SalesOLAP.EsAggBucket`
   - **Association:** `SalesOLAP.EsAggregationWrapper_EsAggBucket`
   - Mapping type: **Object list** (vì đây là array)

#### Bước 6: Map các trường trong mỗi bucket

Map từng trường trong bucket item:

| JSON Path | Entity | Attribute | Kiểu dữ liệu |
|---|---|---|---|
| `buckets[].key` | EsAggBucket | `key` | String |
| `buckets[].doc_count` | EsAggBucket | `docCount` | Integer |
| `buckets[].total_revenue.value` | EsAggBucket | `amountSum` | Decimal |
| `buckets[].total_qty.value` | EsAggBucket | `quantitySum` | Integer |

Chi tiết từng mapping:

**`buckets[].key` → EsAggBucket.key:**
1. Click vào `key` (con của bucket item)
2. Chọn attribute: `key`

**`buckets[].doc_count` → EsAggBucket.docCount:**
1. Click vào `doc_count`
2. Chọn attribute: `docCount`

**`buckets[].total_revenue.value` → EsAggBucket.amountSum:**
1. Click vào `total_revenue` → chọn **Do not map** cho object wrapper
2. Click vào `total_revenue` → `value`
3. Chọn attribute: `amountSum`

**`buckets[].total_qty.value` → EsAggBucket.quantitySum:**
1. Click vào `total_qty` → chọn **Do not map** cho object wrapper
2. Click vào `total_qty` → `value`
3. Chọn attribute: `quantitySum`

### 2.4 Xác minh Import Mapping

Sau khi hoàn thành mapping, kiểm tra:

1. Mọi element JSON đều có trạng thái mapped (icon xanh) hoặc "Do not map" (đã xử lý)
2. Không có element nào báo lỗi màu đỏ
3. Nhấn **Save** (Ctrl+S)

**Mô tả mapping tổng quát:**

```
JSON Structure                    Mendix NPE
─────────────                    ──────────
{                                → EsResponseWrapper
  "took": 5,                       .took = 5
  "hits": {
    "total": {
      "value": 20000              → .totalHits = 20000
    }
  },
  "aggregations": {
    "by_dimension": {             → EsAggregationWrapper
      "buckets": [                → List<EsAggBucket>
        {
          "key": "Electronics",      .key = "Electronics"
          "doc_count": 5000,          .docCount = 5000
          "total_revenue": {
            "value": 150000000000     .amountSum = 150000000000
          },
          "total_qty": {
            "value": 50000            .quantitySum = 50000
          }
        }
      ]
    }
  }
}
```

---

## 3. REST Call Configuration (Call REST Activity)

### 3.1 Tạo Microflow

1. Right-click module **SalesOLAP** → **Add microflow**
2. Đặt tên: `ACT_CallEsSearch`
3. Thêm parameter đầu vào: `esQueryBody` (kiểu String) - chứa ES Query DSL JSON

### 3.2 Thêm Call REST Activity

1. Kéo activity **Call REST** từ toolbar vào microflow
2. Double-click vào activity để cấu hình

### 3.3 Cấu hình Location

**Tab: Location**

1. Chọn **URL** (không chọn microflow)
2. Nhập URL: `http://localhost:9200/sales_olap/_search`
3. Hoặc dùng string concatenation nếu URL có thể thay đổi:
   ```
   'http://localhost:9200/sales_olap/_search'
   ```

> **Mẹo:** Trong môi trường production, nên lưu base URL vào Constant hoặc.edit constant `EsBaseUrl` = `http://localhost:9200` rồi concatenate.

### 3.4 Cấu hình Method

**Tab: Method**

1. Chọn **POST**
2. Body type: **Custom request body**
3. Chọn **Use parameter**
4. Chọn parameter: `esQueryBody` (String variable chứa ES Query DSL JSON)

Ví dụ nội dung `esQueryBody`:

```json
{
  "size": 0,
  "aggs": {
    "by_dimension": {
      "terms": {
        "field": "category.keyword",
        "size": 50
      },
      "aggs": {
        "total_revenue": {
          "sum": {
            "field": "amount"
          }
        },
        "total_qty": {
          "sum": {
            "field": "quantity"
          }
        }
      }
    }
  }
}
```

### 3.5 Cấu hình HTTP Headers

**Tab: HTTP Headers**

1. Click **Add** để thêm header mới
2. Nhập:
   - **Key:** `Content-Type`
   - **Value:** `application/json`

Các header cần thiết:

| Header | Value | Mô tả |
|---|---|---|
| `Content-Type` | `application/json` | Chỉ định body là JSON |
| `Authorization` | *(nếu có)* | Basic auth hoặc API key nếu ES có bảo mật |

### 3.6 Cấu hình Response

**Tab: Response**

1. Chọn **Apply import mapping**
2. Click **Select** và chọn Import Mapping: `IM_EsSearchResponse`
3. Chọn **Result type:**
   - Nếu Import Mapping trả về `EsResponseWrapper`: chọn **Object**
   - Đánh dấu checkbox **Store in variable**
4. Tên biến kết quả: `esResponse` (kiểu `EsResponseWrapper`)

### 3.7 Hoàn thiện Microflow

Cấu trúc microflow hoàn chỉnh:

```
[Start] → (esQueryBody: String)
    │
    ▼
[Call REST]
  - URL: http://localhost:9200/sales_olap/_search
  - Method: POST
  - Body: esQueryBody
  - Response → IM_EsSearchResponse → esResponse (EsResponseWrapper)
    │
    ▼
[Retrieve] esResponse/SalesOLAP.EsResponseWrapper_EsAggregationWrapper
  → aggWrapper (EsAggregationWrapper)
    │
    ▼
[Retrieve] aggWrapper/SalesOLAP.EsAggregationWrapper_EsAggBucket
  → bucketList (List<EsAggBucket>)
    │
    ▼
[End] → bucketList (List<EsAggBucket>)
```

### 3.8 Error Handling

1. Click chuột phải vào **Call REST** activity
2. Chọn **Set error handling**
3. Cấu hình:
   - **Error handling type:** Custom without rollback
   - Tạo biến `errorHandler` (String) để log lỗi
   - Có thể log error message hoặc trả về empty list khi có lỗi kết nối

---

## 4. Export Mapping (Tùy chọn)

### 4.1 Khi nào cần Export Mapping?

Export Mapping hữu ích khi bạn muốn xây dựng ES request body từ Mendix objects thay vì hardcode JSON string. Tuy nhiên, trong đa số trường hợp, việc dùng **String template** hoặc **Java Action** để build JSON linh hoạt hơn.

### 4.2 Tạo Export Mapping (nếu cần)

1. Right-click module **SalesOLAP** → **Add other** → **Export Mapping**
2. Đặt tên: `EM_EsSearchRequest`
3. Source: JSON Structure (tạo mới JSON Structure cho ES request body)
4. Map Mendix entity attributes sang JSON fields

### 4.3 Cách dùng Export Mapping trong Microflow

```
[Create EsQuery object] → [Set attributes] → [Export Mapping] → JSON String → [Call REST]
```

### 4.4 Khuyến nghị

Đối với Elasticsearch Query DSL, khuyến nghị **không dùng Export Mapping** vì:

- ES query DSL phức tạp, có nested aggregation, filter, bool query...
- Export Mapping phù hợp cho flat/simple JSON structures
- Thay vào đó, dùng **String template** hoặc **Java Action** để build query

**Ví dụ dùng String Template trong Mendix:**

```
'{"size":0,"aggs":{"by_dimension":{"terms":{"field":"' + $dimensionField + '.keyword","size":' + toString($topN) + '},"aggs":{"total_revenue":{"sum":{"field":"amount"}},"total_qty":{"sum":{"field":"quantity"}}}}}}'
```

---

## 5. Xử lý Dynamic Aggregation Name

### Vấn đề

Elasticsearch response có tên aggregation động. Ví dụ:

```json
// Query theo category
{ "aggs": { "by_category": { ... } } }
→ Response: { "aggregations": { "by_category": { ... } } }

// Query theo product
{ "aggs": { "by_product": { ... } } }
→ Response: { "aggregations": { "by_product": { ... } } }
```

Import Mapping trong Mendix yêu cầu tên field cố định trong JSON Schema → không thể map trực tiếp tên aggregation động.

### Option A: Sử dụng tên aggregation cố định (Khuyến nghị)

**Nguyên tắc:** Luôn đặt tên aggregation là `by_dimension` trong mọi query, bất kể dimension thực tế là gì.

**Ưu điểm:**
- Import Mapping đơn giản, cố định, dễ bảo trì
- Không cần code Java bổ sung
- Hoạt động ổn định với mọi loại dimension

**Cách thực hiện:**

Trong mọi ES Query DSL, luôn dùng tên `by_dimension` cho terms aggregation:

```json
// Query theo category
{
  "size": 0,
  "aggs": {
    "by_dimension": {
      "terms": { "field": "category.keyword" }
    }
  }
}

// Query theo region
{
  "size": 0,
  "aggs": {
    "by_dimension": {
      "terms": { "field": "region.keyword" }
    }
  }
}

// Query theo product
{
  "size": 0,
  "aggs": {
    "by_dimension": {
      "terms": { "field": "product.keyword" }
    }
  }
}
```

Response luôn có cùng cấu trúc:

```json
{
  "aggregations": {
    "by_dimension": {
      "buckets": [...]
    }
  }
}
```

→ Import Mapping `IM_EsSearchResponse` hoạt động chính xác trong mọi trường hợp.

**Nếu cần biết dimension hiện tại là gì:** Truyền thêm parameter vào microflow (ví dụ `dimensionName: String`) và set vào attribute `EsAggregationWrapper.aggName`.

### Option B: Dùng Java Action extract buckets động

**Khi nào cần:** Khi bắt buộc dùng tên aggregation khác nhau và không thể đổi.

**Nguyên tắc:** Dùng Java Action để parse JSON response, tìm key đầu tiên trong `aggregations` object và extract buckets.

**Java Action: `JA_ExtractAggBuckets`**

```
Input:
  - jsonString: String (ES response JSON)
  - aggName: String (tên aggregation cần extract, truyền "by_dimension")

Output:
  - List<EsAggBucket>
```

**Nhược điểm:**
- Phải viết và maintain Java code
- Bypass Import Mapping → mất lợi ích của visual mapping
- Khó debug hơn

### Khuyến nghị cuối cùng

| Tiêu chí | Option A (Fixed name) | Option B (Java Action) |
|---|---|---|
| Độ phức tạp | Thấp | Cao |
| Bảo trì | Dễ | Khó |
| Visual Mapping | Có | Không |
| Linh hoạt | Đủ cho đa số use case | Tối đa |
| **Khuyến nghị** | **Nên dùng** | Chỉ khi cần thiết |

**Kết luận:** Dùng **Option A** - luôn đặt tên aggregation là `by_dimension` trong ES query. Đây là cách đơn giản, ổn định và phù hợp với kiến trúc Import Mapping của Mendix.

---

## Tổng kết

Quy trình hoàn chỉnh để tích hợp Elasticsearch với Mendix:

1. **JSON Structure** (`EsSearchResponse`): Mô tả cấu trúc ES response JSON
2. **Import Mapping** (`IM_EsSearchResponse`): Map JSON → NPE entities
3. **Call REST Activity**: Gửi POST request kèm Query DSL, nhận response và apply Import Mapping
4. **Export Mapping**: Tùy chọn, thường không cần cho ES query phức tạp
5. **Dynamic Aggregation**: Dùng tên aggregation cố định `by_dimension` để đơn giản hóa

**Kiểm tra nhanh sau khi hoàn thành:**

- [ ] JSON Structure parse thành công, không có lỗi
- [ ] Import Mapping map đầy đủ tất cả các trường cần thiết
- [ ] Call REST trả về status 200 khi test
- [ ] EsResponseWrapper object được tạo với `took` và `totalHits` đúng
- [ ] List<EsAggBucket> có đủ số lượng buckets như mong đợi
- [ ] Các giá trị `amountSum`, `quantitySum`, `docCount` khớp với dữ liệu trong ES
