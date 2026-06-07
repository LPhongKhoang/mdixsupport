# AnyChart Widget Configuration Guide
# Tích hợp với Mendix OLAP Dashboard

## Cài đặt AnyChart Marketplace Module

1. Mendix Studio Pro → **App Store / Marketplace**
2. Tìm: "**Any Chart**" (by Mendix)
3. Click **Download** → **Import**
4. Sau import: `App > Modules > AnyChart` xuất hiện

---

## Chart 1: Revenue by Category (Column Chart)

**Widget**: AnyChart (in page OlapDashboard)

**Data microflow**: `DS_Chart_RevByCategory`
```
1. Retrieve list OlapBucket where association to $FilterParams
2. Return list
```

**AnyChart Configuration JSON:**
```javascript
// Paste vào field "Configuration" của AnyChart widget
{
  "title": { "text": "Revenue by Category (VND)" },
  "chart": { "type": "column" },
  "yScale": {
    "type": "linear",
    "labels": {
      "format": function() {
        return (this.value / 1000000).toFixed(0) + "M";
      }
    }
  },
  "xAxis": { "staggerMode": true },
  "tooltip": {
    "format": "Revenue: {%Value}{scale:(1)(M)}\nOrders: {%Orders}"
  }
}
```

**AnyChart Data Mapping** (trong widget settings):
- Series name: "Revenue"
- X: attribute `Label` (category name)
- Y: attribute `Revenue` (decimal)

**On Click event** (Drill-down):
- Event: Point Click
- Nanoflow: `NF_OLAP_OnCategoryClick`
- Template: `{%X}` → passes category name as parameter

---

## Chart 2: Monthly Revenue Trend (Line + Area)

**Data microflow**: `DS_Chart_MonthlyTrend`
```
Returns list of OlapChartDataPoint
```

**AnyChart Configuration JSON:**
```javascript
{
  "title": { "text": "Monthly Revenue Trend" },
  "chart": { "type": "line" },
  "series": [
    {
      "name": "Revenue",
      "data": "{{dataFromMendix}}",
      "type": "area",
      "fill": "#4fa7f0 0.3"
    },
    {
      "name": "3-Month Moving Avg",
      "data": "{{movingAvgData}}",
      "type": "line",
      "stroke": { "color": "#e53935", "dash": "5 5" }
    }
  ],
  "xAxis": {
    "type": "ordinal",
    "labels": { "rotation": -45 }
  },
  "legend": { "enabled": true }
}
```

**Data mapping (2 series)**:
- Series 1 "Revenue": X = PeriodLabel, Y = Revenue
- Series 2 "Moving Avg": X = PeriodLabel, Y = MovingAvg

---

## Chart 3: Top 10 Products (Horizontal Bar)

**AnyChart Configuration JSON:**
```javascript
{
  "title": { "text": "Top 10 Products by Gross Profit" },
  "chart": { "type": "bar" },
  "yAxis": {
    "labels": {
      "format": "{%Value}{scale:(1M)}"
    }
  },
  "tooltip": {
    "format": "{%Name}\nProfit: {%Value}{scale:(1M)} VND\nMargin: {%Margin}%"
  },
  "color": "#26a69a"
}
```

---

## Chart 4: Region × Quarter Heatmap (Mendix Table alternative)

AnyChart không có native heatmap → dùng **Mendix DataGrid** với conditional formatting:

**DataGrid columns:**
| Column   | Source      | Format          |
|---------|------------|-----------------|
| Region   | Label       | text            |
| Q1       | (microflow) | conditional bg  |
| Q2       | (microflow) | conditional bg  |
| Q3       | (microflow) | conditional bg  |
| Q4       | (microflow) | conditional bg  |

**Color coding** (via CSS / Dynamic class):
- Revenue < 10M  → `cell-cold`  (blue)
- Revenue 10–50M → `cell-warm`  (yellow)  
- Revenue > 50M  → `cell-hot`   (red/orange)

Add in `main.scss` of theme:
```scss
.cell-cold { background-color: #e3f2fd !important; }
.cell-warm { background-color: #fff9c4 !important; }
.cell-hot  { background-color: #ffccbc !important; }
```

---

## Chart 5: Customer Segment Distribution (Pie/Donut)

```javascript
{
  "title": { "text": "Revenue by Customer Segment" },
  "chart": {
    "type": "pie",
    "innerRadius": "40%"
  },
  "legend": {
    "position": "right",
    "enabled": true
  },
  "labels": {
    "format": "{%Name}: {%PercentValue}%"
  },
  "tooltip": {
    "format": "{%Name}\nRevenue: {%Value}{scale:(1M)} VND"
  }
}
```

---

## KPI Cards (Mendix Text widgets)

Dùng **Data View** với microflow source `DS_GetKPISummary`:

```
DS_GetKPISummary:
1. Create new OlapBucket $Summary
2. Retrieve all OlapBucket associated with $FilterParams
   (where QueryType = REVENUE_BY_CATEGORY)
3. Loop: sum Revenue → $TotalRevenue, sum Profit → $TotalProfit
4. $Summary/Revenue = $TotalRevenue
5. $Summary/Profit  = $TotalProfit
6. $Summary/AvgMargin = ($TotalProfit / $TotalRevenue) * 100
7. Return $Summary
```

Display format for Revenue: `formatDecimal($object/Revenue / 1000000, 2) + ' M VND'`

---

## Mendix Expression Helpers

Format large numbers:
```
formatDecimal($Revenue / 1000000, 1) + 'M'     → "125.3M"
formatDecimal($Revenue / 1000000000, 2) + 'B'  → "1.25B"
```

Conditional class for KPI cards:
```
if $Profit > 50000000 then 'kpi-positive' else 'kpi-negative'
```
