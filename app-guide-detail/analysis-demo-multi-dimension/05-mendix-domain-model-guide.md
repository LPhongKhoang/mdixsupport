# 05 - Mendix Domain Model Guide: SalesOLAP Module

> Huong dan tao Domain Model trong Mendix Studio Pro v10 cho module SalesOLAP - OLAP Sales Analysis.
> Tat ca entities la **Non-Persistent Entities (NPE)** vi du lieu duoc lay tu Elasticsearch qua REST API.

---

## Muc luc

1. [Tao Module SalesOLAP](#1-tao-module-salesolap)
2. [Tao Entity OlapFilter](#2-tao-entity-olapfilter)
3. [Tao Entity SalesAggregateResult](#3-tao-entity-salesaggregateresult)
4. [Tao Entity EsResponseWrapper](#4-tao-entity-esresponsewrapper)
5. [Tao Entity EsAggBucket](#5-tao-entity-esaggbucket)
6. [Tao Entity EsAggregationWrapper](#6-tao-entity-esaggregationwrapper)
7. [Tao Entity OlapConfig](#7-tao-entity-olapconfig)
8. [Tao Associations giua cac Entities](#8-tao-associations-giua-cac-entities)
9. [To chuc Domain Model](#9-to-chuc-domain-model)
10. [Naming Conventions](#10-naming-conventions)

---

## 1. Tao Module SalesOLAP

### Buoc 1.1: Them module moi

1. Mo **Mendix Studio Pro v10**
2. Trong **Project Explorer** (panel ben trai), right-click vao ten project hoac folder `Modules`
3. Chon **Add module** tu context menu
4. Trong hop thoai **Add Module**, nhap ten: `SalesOLAP`
5. Click **OK**

> **Ket qua**: Module `SalesOLAP` se xuat hien trong Project Explorer voi cau truc mac dinh bao gom `domain model`, `pages`, `microflows`, v.v.

### Buoc 1.2: Mo Domain Model Editor

1. Trong Project Explorer, expand module `SalesOLAP`
2. Double-click vao **Domain Model** de mo Domain Model Editor
3. Domain Model Editor hien thi mot working area trong (background trang) de dat cac entities

> **Screenshot**: Ban se thay mot working area trong voi thanh cong cu **Domain Model** o tren cung, bao gom cac nut: **Entity**, **Association**, **Annotation**, v.v.

---

## 2. Tao Entity OlapFilter

### Muc dich
Entity `OlapFilter` chua tat ca cac filter parameters truyen tu UI, bao gom drill-down dimension, level, va cac filter tuy chon.

### Buoc 2.1: Tao Entity

1. Trong **Domain Model Editor**, click vao nut **Entity** tren toolbar (hoac right-click vao working area chon **Add Entity**)
2. Click vao working area de dat entity moi
3. Trong panel **Properties** (ben duoi hoac ben phai), tim checkbox **Persistent**
4. **Bo tick** checkbox **Persistent** de chuyen entity thanh Non-Persistent Entity (NPE)
   > NPE duoc bieu dien bang mau sac khac voi persistent entity - thuong la mau xanh nhat hoac co dau hieu dac biet
5. Double-click vao entity de mo **Entity Properties** dialog
6. Doi ten entity thanh: `OlapFilter`
7. Click **OK**

### Buoc 2.2: Them Attributes

Click double vao entity `OlapFilter` de mo dialog, sau do click **New** de them tung attribute:

| # | Attribute Name | Type | Default Value | Ghi chu |
|---|---------------|------|--------------|---------|
| 1 | `drillDimension` | String | (rong) | Gia tri: "product", "time", "customer", "geography" |
| 2 | `drillLevel` | Integer | 0 | 0=summary, 1/2/3=drill deeper |
| 3 | `selectedKey` | String | (rong) | Key ma user click de drill-down |
| 4 | `yearFilter` | Integer | (rong) | Tuy chon |
| 5 | `quarterFilter` | Integer | (rong) | Tuy chon |
| 6 | `monthFilter` | Integer | (rong) | Tuy chon |
| 7 | `categoryFilter` | String | (rong) | Tuy chon |
| 8 | `productFilter` | String | (rong) | Tuy chon |
| 9 | `variantSkuFilter` | String | (rong) | Tuy chon - Product drill-down Level 2 (category_name -> product_name -> variant_sku) |
| 10 | `customerFilter` | String | (rong) | Tuy chon |
| 11 | `segmentFilter` | String | (rong) | Tuy chon |
| 12 | `countryFilter` | String | (rong) | Tuy chon |
| 13 | `regionFilter` | String | (rong) | Tuy chon - Geography drill-down Level 1 (country_name -> country_region -> city_name) |
| 14 | `cityFilter` | String | (rong) | Tuy chon |
| 15 | `storeFilter` | String | (rong) | Tuy chon |
| 16 | `dateFrom` | DateTime | (rong) | Tuy chon |
| 17 | `dateTo` | DateTime | (rong) | Tuy chon |

**Chi tiet tung attribute:**

**Attribute 1: drillDimension**
1. Click **New** trong tab **Attributes**
2. Name: `drillDimension`
3. Type: chon **String**
4. Default value: (de trong)
5. Click **OK**

**Attribute 2: drillLevel**
1. Click **New**
2. Name: `drillLevel`
3. Type: chon **Integer**
4. Default value: `0`
5. Click **OK**

**Attribute 3: selectedKey**
1. Click **New**
2. Name: `selectedKey`
3. Type: chon **String**
4. Default value: (de trong)
5. Click **OK**

**Attribute 4-6: yearFilter, quarterFilter, monthFilter**
1. Click **New**
2. Name: `yearFilter` (lan luot lam tuong tu cho `quarterFilter`, `monthFilter`)
3. Type: chon **Integer**
4. Default value: (de trong)
5. Click **OK**

**Attribute 7-8: categoryFilter, productFilter**
1. Click **New**
2. Name: `categoryFilter` (lam tuong tu cho `productFilter`)
3. Type: chon **String**
4. Default value: (de trong)
5. Click **OK**

**Attribute 9: variantSkuFilter**
1. Click **New**
2. Name: `variantSkuFilter`
3. Type: chon **String**
4. Default value: (de trong)
5. Click **OK**

> **Ghi chu**: `variantSkuFilter` duoc su dung cho Product drill-down Level 2. Duong dan drill-down cua Product la: `category_name` -> `product_name` -> `variant_sku`. Khi user drill-down tu product_name, `variantSkuFilter` se luu gia tri variant_sku de filter.

**Attribute 10-11: customerFilter, segmentFilter**
1. Click **New**
2. Name: `customerFilter` (lam tuong tu cho `segmentFilter`)
3. Type: chon **String**
4. Default value: (de trong)
5. Click **OK**

**Attribute 12-15: countryFilter, regionFilter, cityFilter, storeFilter**
1. Click **New**
2. Name: `countryFilter` (lan luot lam tuong tu cho `regionFilter`, `cityFilter`, `storeFilter`)
3. Type: chon **String**
4. Default value: (de trong)
5. Click **OK**

> **Luu y**: `regionFilter` dung cho Geography drill-down Level 1→2, tuong ung voi ES field `country_region`. Thu tu drill-down la: country_name (Level 0) → country_region (Level 1) → city_name (Level 2).

**Attribute 16: dateFrom**
1. Click **New**
2. Name: `dateFrom`
3. Type: chon **DateTime**
4. Default value: (de trong)
5. Click **OK**

**Attribute 17: dateTo**
1. Click **New**
2. Name: `dateTo`
3. Type: chon **DateTime**
4. Default value: (de trong)
5. Click **OK**

Sau khi them xong tat ca attributes, click **OK** de dong dialog.

> **Screenshot**: Entity `OlapFilter` se hien thi tren working area voi danh sach tat ca 17 attributes. Entity co bieu tuong NPE (khong co dau hieu database) de chi day la Non-Persistent Entity.

---

## 3. Tao Entity SalesAggregateResult

### Muc dich
Entity `SalesAggregateResult` dai dien cho mot dong du lieu aggregate duoc hien thi tren UI (bao gom doanh thu, so luong, so giao dich, v.v.).

### Buoc 3.1: Tao Entity

1. Click nut **Entity** tren toolbar cua Domain Model Editor
2. Click vao working area (dat cach entity `OlapFilter` mot khoang)
3. Trong panel **Properties**, **bo tick** checkbox **Persistent**
4. Double-click vao entity de mo dialog
5. Doi ten thanh: `SalesAggregateResult`
6. Click **OK**

### Buoc 3.2: Them Attributes

Click double vao entity, sau do them tung attribute:

| # | Attribute Name | Type | Default Value | Ghi chu |
|---|---------------|------|--------------|---------|
| 1 | `dimensionValue` | String | (rong) | VD: "Electronics", "2024-Q1" |
| 2 | `dimensionLabel` | String | (rong) | Display label |
| 3 | `totalRevenue` | Decimal | 0 | Sum cua total_amount |
| 4 | `totalQuantity` | Integer | 0 | Sum cua quantity |
| 5 | `transactionCount` | Integer | 0 | doc_count tu ES |
| 6 | `avgOrderValue` | Decimal | 0 | Average total_amount |
| 7 | `drillDownLevel` | Integer | 0 | Current drill level |
| 8 | `parentKey` | String | (rong) | Cho drill-down navigation |
| 9 | `hasChildren` | Boolean | false | Co the drill them khong? |

**Chi tiet tung attribute:**

**Attribute 1: dimensionValue**
1. Click **New**
2. Name: `dimensionValue`
3. Type: chon **String**
4. Default value: (de trong)
5. Click **OK**

**Attribute 2: dimensionLabel**
1. Click **New**
2. Name: `dimensionLabel`
3. Type: chon **String**
4. Default value: (de trong)
5. Click **OK**

**Attribute 3: totalRevenue**
1. Click **New**
2. Name: `totalRevenue`
3. Type: chon **Decimal**
4. Default value: `0`
5. Click **OK**

**Attribute 4: totalQuantity**
1. Click **New**
2. Name: `totalQuantity`
3. Type: chon **Integer**
4. Default value: `0`
5. Click **OK**

**Attribute 5: transactionCount**
1. Click **New**
2. Name: `transactionCount`
3. Type: chon **Integer**
4. Default value: `0`
5. Click **OK**

**Attribute 6: avgOrderValue**
1. Click **New**
2. Name: `avgOrderValue`
3. Type: chon **Decimal**
4. Default value: `0`
5. Click **OK**

**Attribute 7: drillDownLevel**
1. Click **New**
2. Name: `drillDownLevel`
3. Type: chon **Integer**
4. Default value: `0`
5. Click **OK**

**Attribute 8: parentKey**
1. Click **New**
2. Name: `parentKey`
3. Type: chon **String**
4. Default value: (de trong)
5. Click **OK**

**Attribute 9: hasChildren**
1. Click **New**
2. Name: `hasChildren`
3. Type: chon **Boolean**
4. Default value: `false`
5. Click **OK**

Sau khi them xong, click **OK** de dong dialog.

> **Screenshot**: Entity `SalesAggregateResult` hien thi voi 9 attributes, bao gom cac truong Decimal (totalRevenue, avgOrderValue) va Boolean (hasChildren).

---

## 4. Tao Entity EsResponseWrapper

### Muc dich
Entity `EsResponseWrapper` map cau truc top-level cua Elasticsearch response JSON.

### Buoc 4.1: Tao Entity

1. Click nut **Entity** tren toolbar
2. Click vao working area (dat o phan rieng cho ES response mapping)
3. Trong panel **Properties**, **bo tick** checkbox **Persistent**
4. Double-click vao entity
5. Doi ten thanh: `EsResponseWrapper`
6. Click **OK**

### Buoc 4.2: Them Attributes

| # | Attribute Name | Type | Default Value | Ghi chu |
|---|---------------|------|--------------|---------|
| 1 | `took` | Integer | 0 | Thoi gian xu ly ES (ms) |
| 2 | `totalHits` | Integer | 0 | Tong so hits |

**Attribute 1: took**
1. Click **New**
2. Name: `took`
3. Type: chon **Integer**
4. Default value: `0`
5. Click **OK**

**Attribute 2: totalHits**
1. Click **New**
2. Name: `totalHits`
3. Type: chon **Integer**
4. Default value: `0`
5. Click **OK**

Sau khi them xong, click **OK** de dong dialog.

> **Luu y**: Entity `EsResponseWrapper` se co association 1-to-many voi `EsAggBucket` (tao o buoc 8).

---

## 5. Tao Entity EsAggBucket

### Muc dich
Entity `EsAggBucket` map mot aggregation bucket trong Elasticsearch response (moi bucket dai dien cho mot gia tri dimension).

### Buoc 5.1: Tao Entity

1. Click nut **Entity** tren toolbar
2. Click vao working area (dat gan `EsResponseWrapper`)
3. Trong panel **Properties**, **bo tick** checkbox **Persistent**
4. Double-click vao entity
5. Doi ten thanh: `EsAggBucket`
6. Click **OK**

### Buoc 5.2: Them Attributes

| # | Attribute Name | Type | Default Value | Ghi chu |
|---|---------------|------|--------------|---------|
| 1 | `key` | String | (rong) | Bucket key (dimension value) |
| 2 | `keyAsString` | String | (rong) | Cho date buckets |
| 3 | `docCount` | Integer | 0 | So document trong bucket |
| 4 | `amountSum` | Decimal | 0 | Tu sub-aggregation |
| 5 | `quantitySum` | Decimal | 0 | Tu sub-aggregation (ES sum tra ve Number, co the la decimal nhu 200.0) |
| 6 | `avgOrderValue` | Decimal | 0 | Tu sub-aggregation `avg_order` |

**Attribute 1: key**
1. Click **New**
2. Name: `key`
3. Type: chon **String**
4. Default value: (de trong)
5. Click **OK**

**Attribute 2: keyAsString**
1. Click **New**
2. Name: `keyAsString`
3. Type: chon **String**
4. Default value: (de trong)
5. Click **OK**

**Attribute 3: docCount**
1. Click **New**
2. Name: `docCount`
3. Type: chon **Integer**
4. Default value: `0`
5. Click **OK**

**Attribute 4: amountSum**
1. Click **New**
2. Name: `amountSum`
3. Type: chon **Decimal**
4. Default value: `0`
5. Click **OK**

**Attribute 5: quantitySum**
1. Click **New**
2. Name: `quantitySum`
3. Type: chon **Integer**
4. Default value: `0`
5. Click **OK**

**Attribute 6: avgOrderValue**
1. Click **New**
2. Name: `avgOrderValue`
3. Type: chon **Decimal**
4. Default value: `0`
5. Click **OK**

Sau khi them xong, click **OK** de dong dialog.

> **Luu y**: Entity `EsAggBucket` se co 2 associations: (1) voi `EsResponseWrapper` va (2) voi `EsAggregationWrapper`.

### Buoc 5.3: JSON-to-Entity Mapping Reference (EsAggBucket)

Bang duoi day chi ra duong dan JSON chinh xac tu ES response toi tung attribute cua `EsAggBucket`. Tham chieu nay rat quan trong khi tao **Import Mapping** trong Mendix.

| ES Response JSON Path | EsAggBucket Attribute | Type | Ghi chu |
|-----------------------|-----------------------|------|---------|
| `aggregations.by_dimension.buckets[].key` | `key` | String | Bucket key (dimension value) |
| `aggregations.by_dimension.buckets[].doc_count` | `docCount` | Integer | So document trong bucket |
| `aggregations.by_dimension.buckets[].total_revenue.value` | `amountSum` | Decimal | Tu sub-aggregation `total_revenue` |
| `aggregations.by_dimension.buckets[].total_qty.value` | `quantitySum` | Decimal | Tu sub-aggregation `total_qty` |
| `aggregations.by_dimension.buckets[].avg_order.value` | `avgOrderValue` | Decimal | Tu sub-aggregation `avg_order` (NEW) |

> **Vi du JSON bucket**:
> ```json
> {
>   "key": "Electronics",
>   "doc_count": 1250,
>   "total_revenue": { "value": 187500.50 },
>   "total_qty": { "value": 3420 },
>   "avg_order": { "value": 150.00 }
> }
> ```
>
> Khi tao Import Mapping trong Mendix, cac duong dan tren se duoc map tuong ung vao cac attribute cua entity `EsAggBucket`.

---

## 6. Tao Entity EsAggregationWrapper

### Muc dich
Entity `EsAggregationWrapper` map doi tuong `aggregations` trong ES response JSON, noi cac aggregation buckets.

### Buoc 6.1: Tao Entity

1. Click nut **Entity** tren toolbar
2. Click vao working area (dat gan cac ES entities khac)
3. Trong panel **Properties**, **bo tick** checkbox **Persistent**
4. Double-click vao entity
5. Doi ten thanh: `EsAggregationWrapper`
6. Click **OK**

### Buoc 6.2: Them Attributes

| # | Attribute Name | Type | Default Value | Ghi chu |
|---|---------------|------|--------------|---------|
| 1 | `aggName` | String | (rong) | Ten aggregation |

**Attribute 1: aggName**
1. Click **New**
2. Name: `aggName`
3. Type: chon **String**
4. Default value: (de trong)
5. Click **OK**

Sau khi them xong, click **OK** de dong dialog.

> **Luu u**: Entity `EsAggregationWrapper` se co association 1-to-many voi `EsAggBucket`.

---

## 7. Tao Entity OlapConfig

### Muc dich
Entity `OlapConfig` chua cau hinh ket noi Elasticsearch (base URL, index name, timeout).

### Buoc 7.1: Tao Entity

1. Click nut **Entity** tren toolbar
2. Click vao working area (dat o khu vuc rieng cho config)
3. Trong panel **Properties**, **bo tick** checkbox **Persistent**
4. Double-click vao entity
5. Doi ten thanh: `OlapConfig`
6. Click **OK**

### Buoc 7.2: Them Attributes

| # | Attribute Name | Type | Default Value | Ghi chu |
|---|---------------|------|--------------|---------|
| 1 | `esBaseUrl` | String | `http://localhost:9200` | ES server URL |
| 2 | `esIndexName` | String | `sales_olap` | ES index name |
| 3 | `esTimeout` | Integer | `30000` | Timeout ms |

**Attribute 1: esBaseUrl**
1. Click **New**
2. Name: `esBaseUrl`
3. Type: chon **String**
4. Default value: `http://localhost:9200`
5. Click **OK**

**Attribute 2: esIndexName**
1. Click **New**
2. Name: `esIndexName`
3. Type: chon **String**
4. Default value: `sales_olap`
5. Click **OK**

**Attribute 3: esTimeout**
1. Click **New**
2. Name: `esTimeout`
3. Type: chon **Integer**
4. Default value: `30000`
5. Click **OK**

Sau khi them xong, click **OK** de dong dialog.

> **Screenshot**: Entity `OlapConfig` hien thi voi 3 attributes co san default values.

### Ghi chu: dimensionField Resolution (Khong luu tru trong OlapConfig)

> **Quan trong**: Ten truong dimension Elasticsearch (VD: `category_name`, `product_name`, `year`, `quarter`, `country_name`, v.v.) **KHONG** duoc luu nhu mot attribute rieng trong entity `OlapConfig`. Thay vao do, ten truong dimension duoc **giai quyet tai runtime** boi Java Action hoac microflow expression dua tren:
>
> - `OlapFilter.drillDimension` - Xac dinh nhom dimension (product, time, customer, geography)
> - `OlapFilter.drillLevel` - Xac dinh cap do drill (0=summary, 1/2/3=chi tiet hon)
>
> **Vi du logic resolution**:
> - `drillDimension = "product"` + `drillLevel = 1` -> ES field: `category_name` (terms aggregation)
> - `drillDimension = "product"` + `drillLevel = 2` -> ES field: `product_name` (terms aggregation)
> - `drillDimension = "product"` + `drillLevel = 3` -> ES field: `variant_sku` (terms aggregation)
> - `drillDimension = "time"` + `drillLevel = 1` -> ES field: `year` (terms aggregation)
> - `drillDimension = "time"` + `drillLevel = 2` -> ES field: `quarter` (terms aggregation)
> - `drillDimension = "customer"` + `drillLevel = 1` -> ES field: `segment` (terms aggregation)
> - `drillDimension = "geography"` + `drillLevel = 1` -> ES field: `country_name` (terms aggregation)
>
> Logic nay duoc trien khai trong microflow **ACT_BuildEsQuery** (xem huong dan microflow tai document 07-mendix-microflow-guide.md).

---

## 8. Tao Associations giua cac Entities

Association dinh nghia moi quan he giua cac entities trong domain model.

### Buoc 8.1: EsResponseWrapper -> EsAggBucket (1-to-many)

1. Click nut **Association** tren toolbar cua Domain Model Editor
2. Click va keo tu entity **EsResponseWrapper** den entity **EsAggBucket**
3. Trong panel **Properties** cua association vua tao:
   - **Type**: chon **Reference Set** (1-to-many)
   - **Parent**: `SalesOLAP.EsResponseWrapper` (side co dau `*`)
   - **Child**: `SalesOLAP.EsAggBucket` (side co dau `1`)
   - Hoac double-click association de mo dialog, chon **Multiplicity**: `1  ----  *`
4. Dat ten association (neu can): `EsResponseWrapper_EsAggBucket`
5. **Owner**: Dat **EsAggBucket** lam owner cua association nay. Trong Mendix, click vao association, trong panel Properties chon **Owner** = `EsAggBucket` (child side). Day la vi `EsAggBucket` la entity duoc tao moi khi parse ES response va can quan ly lifecycle cua association.

> **Ve sau**: Dau `*` nam o phia `EsAggBucket`, dau `1` nam o phia `EsResponseWrapper`. Owner = `EsAggBucket` (child owns the association).

### Buoc 8.2: EsAggregationWrapper -> EsAggBucket (1-to-many)

1. Click nut **Association** tren toolbar
2. Click va keo tu entity **EsAggregationWrapper** den entity **EsAggBucket**
3. Trong panel **Properties**:
   - **Type**: chon **Reference Set** (1-to-many)
   - **Multiplicity**: `1  ----  *` (EsAggregationWrapper la phia `1`, EsAggBucket la phia `*`)
4. Dat ten association: `EsAggregationWrapper_EsAggBucket`
5. **Owner**: Dat **EsAggBucket** lam owner cua association nay. Trong panel Properties chon **Owner** = `EsAggBucket` (child side). Tuong tu nhu buoc 8.1, bucket la entity quan ly lifecycle khi parse aggregation data.

### Buoc 8.3: EsResponseWrapper -> EsAggregationWrapper (1-to-1)

1. Click nut **Association** tren toolbar
2. Click va keo tu entity **EsResponseWrapper** den entity **EsAggregationWrapper**
3. Trong panel **Properties**:
   - **Type**: chon **Reference** (1-to-1)
   - **Parent**: `SalesOLAP.EsResponseWrapper` (phia `1`)
   - **Child**: `SalesOLAP.EsAggregationWrapper` (phia `1`)
4. Dat ten association: `EsResponseWrapper_EsAggregationWrapper`
5. **Owner**: Dat **EsAggregationWrapper** lam owner cua association nay. Trong panel Properties chon **Owner** = `EsAggregationWrapper` (child side). Wrapper quan ly lifecycle cua association nay vi no duoc tao va lien ket khi parse `aggregations` object.

> **Luu y**: Association nay la bat buoc de Import Mapping co the map `aggregations` object tu ES response vao `EsAggregationWrapper` entity. Khong co association nay, Import Mapping se khong the ket noi duoc wrapper voi aggregation. Owner = `EsAggregationWrapper`.

### Bang tong hop Associations

| Association | Parent (1) | Child (*) | Type | Owner | Ghi chu |
|------------|-----------|----------|------|-------|---------|
| `EsResponseWrapper_EsAggBucket` | EsResponseWrapper | EsAggBucket | Reference Set (1-*) | **EsAggBucket** (child owns) | ES response chua nhieu buckets |
| `EsAggregationWrapper_EsAggBucket` | EsAggregationWrapper | EsAggBucket | Reference Set (1-*) | **EsAggBucket** (child owns) | Moi aggregation co nhieu buckets |
| `EsResponseWrapper_EsAggregationWrapper` | EsResponseWrapper | EsAggregationWrapper | Reference (1-1) | **EsAggregationWrapper** (child owns) | Link response toi aggregation wrapper (bat buoc cho Import Mapping) |
| `OlapFilter_Results` | OlapFilter | SalesAggregateResult | Reference Set (1-*) | **SalesAggregateResult** (child owns) | **Bat buoc cho UI**: Data Grid 2 dung association nay lam data source (Listen-to-widget). Microflow `OLAP_GetSalesData` se populate association nay khi goi ES API. |

> **Screenshot**: Working area se hien thi 6 entities voi 3 association lines noi chung. Cac association co dau `1` va `*` o hai dau. Owner luon nam o phia child (EsAggBucket hoac EsAggregationWrapper).

---

## 9. To chuc Domain Model

### Buoc 9.1: Boc cuc entities trong working area

De domain model de doc va bao tri, hay to chuc entities theo nhom:

**Nhom 1: Filter & Config (ben trai)**
- `OlapFilter` - Filter parameters
- `OlapConfig` - ES connection config

**Nhom 2: UI Result (giua)**
- `SalesAggregateResult` - Du lieu hien thi tren UI

**Nhom 3: ES Response Mapping (ben phai)**
- `EsResponseWrapper` - Top-level ES response
- `EsAggregationWrapper` - Aggregation wrapper
- `EsAggBucket` - Individual bucket

### Buoc 9.2: Su dung Annotation

1. Click nut **Annotation** tren toolbar
2. Click vao working area de dat annotation
3. Double-click de nhap text, vi du:
   - `"=== Filter & Config ==="` phia tren nhom 1
   - `"=== UI Display ==="` phia tren nhom 2
   - `"=== ES Response Mapping ==="` phia tren nhom 3

### Buoc 9.3: Sap xep lai entities

1. Click va keo cac entities de tao bo cuc co cau truc
2. Dam bao cac association lines khong giao nhau qua nhieu
3. Vi tri khuyen nghi:

```
  [Filter & Config]          [UI Display]           [ES Response Mapping]

    +-------------+        +--------------------+     +-------------------+
    | OlapFilter  |        | SalesAggregate     |     | EsResponseWrapper |
    |             |------->|    Result           |     |         |
    +-------------+        +--------------------+     |         *
                                                      |   +----------+
    +-------------+                                   +-->|EsAggBucket|
    | OlapConfig  |                                   |   +----------+
    +-------------+                                   |        ^
                                                      |        |
                                                      |   +-------------------+
                                                      +---|EsAggregationWrapper|
                                                          +-------------------+
```

### Buoc 9.4: Luu Domain Model

1. Nhan **Ctrl+S** (hoac **Cmd+S** tren Mac) de luu
2. Hoac chon **File > Save All** tu menu

---

## 10. Naming Conventions

### Quy tac dat ten trong module SalesOLAP

| Loai | Convention | Vi du |
|-----|-----------|-------|
| Entity | PascalCase | `OlapFilter`, `SalesAggregateResult` |
| Attribute | camelCase | `drillDimension`, `totalRevenue` |
| Association | Parent_Child | `EsResponseWrapper_EsAggBucket` |
| NPE Entity | PascalCase, khong co prefix/suffix dac biet | `OlapConfig` |
| Module | PascalCase | `SalesOLAP` |

### Quy tac quan trong

1. **Tat ca entities phai la NPE**: Dam bao checkbox **Persistent** KHONG duoc tick cho bat ky entity nao trong module `SalesOLAP`. Du lieu duoc lay tu Elasticsearch qua REST API, khong luu vao Mendix database.

2. **Association type cho NPE**: Vi tat ca deu la NPE, associations se su dung **Reference** (1-to-1) hoac **Reference Set** (1-to-many) - KHONG su dung **Composition** vi khong co persistence.

3. **Default values**: Dat default values phu hop cho tung attribute:
   - Integer counters: `0`
   - Decimal amounts: `0`
   - Boolean flags: `false`
   - String filters: (rong)
   - DateTime: (rong)

4. **Attribute type chinh xac**:
   - Su dung **Decimal** cho cac truong tien te (totalRevenue, avgOrderValue, amountSum)
   - Su dung **Integer** cho cac truong so luong/counter (totalQuantity, transactionCount, docCount)
   - Su dung **String** cho cac truong filter va dimension
   - Su dung **DateTime** cho cac truong ngay thang

---

## Tong ket

Sau khi hoan thanh tat ca cac buoc, Domain Model cua module `SalesOLAP` se bao gom:

| Entity | So Attributes | Loai | Nhom |
|--------|--------------|------|------|
| OlapFilter | 16 | NPE | Filter & Config |
| SalesAggregateResult | 9 | NPE | UI Display |
| EsResponseWrapper | 2 | NPE | ES Response |
| EsAggBucket | 6 | NPE | ES Response |
| EsAggregationWrapper | 1 | NPE | ES Response |
| OlapConfig | 3 | NPE | Filter & Config |

**Tong cong**: 6 entities, 37 attributes, 3 associations

> **Buoc tiep theo**: Sau khi tao xong Domain Model, tiep tuc tao **REST Call Microflows** de goi Elasticsearch API va **Import Mapping** de map JSON response vao cac ES entities.
