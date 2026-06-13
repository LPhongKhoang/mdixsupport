# Seed Data — Dữ liệu mẫu cho Development

> Dựa trên `data/es/gantt-item-samsung01.json`

---

## 1. Users

| id | name | email | role |
|----|------|-------|------|
| auto | Nguyễn Văn A | planner.a@samsung.com | planner |
| auto | Lê Thị B | planner.b@samsung.com | planner |
| auto | Admin System | admin@samsung.com | admin |
| auto | Viewer User | viewer@samsung.com | viewer |

---

## 2. Product Line

```json
{
  "name": "Samsung Electronics",
  "code": "SAMSUNG",
  "description": "Tổng công ty Samsung Electronics — bao gồm mobile, home appliances, display, wearables"
}
```

---

## 3. Product Nodes (từ gantt-item-samsung01.json)

Dữ liệu JSON có 30 items sẽ được map thành `product_nodes`:

```
Samsung Electronics (Product Line)
│
├── [L1-area] Samsung Galaxy Smartphones          (itemId: "1")
│   ├── [L2-family] Galaxy S Series               (itemId: "1.1")
│   │   ├── [L3-product] Galaxy S25 Series         (itemId: "1.1.1")
│   │   │   ├── [L4-task] R&D & Concept Design     (itemId: "1.1.1.a")
│   │   │   ├── [L4-task] Hardware Engineering      (itemId: "1.1.1.b")
│   │   │   └── [L4-task] Software Integration & QA (itemId: "1.1.1.c")
│   │   ├── [L3-product] Galaxy S26 Series         (itemId: "1.1.2")
│   │   │   ├── [L4-task] R&D & Concept Design     (itemId: "1.1.2.a")
│   │   │   ├── [L4-task] Hardware Engineering      (itemId: "1.1.2.b")
│   │   │   └── [L4-task] Software Integration & QA (itemId: "1.1.2.c")
│   │   └── [L3-product] Galaxy S27 Series         (itemId: "1.1.3")
│   ├── [L2-family] Galaxy Z Series (Foldables)   (itemId: "1.2")
│   │   ├── [L3-product] Galaxy Z Fold 7 / Flip 7 (itemId: "1.2.1")
│   │   │   ├── [L4-task] Hinge Mechanism R&D      (itemId: "1.2.1.a")
│   │   │   └── [L4-task] Display & Assembly       (itemId: "1.2.1.b")
│   │   └── [L3-product] Galaxy Z Fold 8 / Flip 8 (itemId: "1.2.2")
│   │
├── [L1-area] Samsung Home Appliances             (itemId: "2")
│   ├── [L2-family] Bespoke Refrigerator Line     (itemId: "2.1")
│   │   ├── [L3-product] Bespoke AI Refrigerator 2025 (itemId: "2.1.1")
│   │   │   ├── [L4-task] AI Module Development    (itemId: "2.1.1.a")
│   │   │   └── [L4-task] Industrial Design & Cert (itemId: "2.1.1.b")
│   │   └── [L3-product] Bespoke AI Refrigerator 2026 (itemId: "2.1.2")
│   └── [L2-family] Bespoke Washing Machine Line  (itemId: "2.2")
│       └── [L3-product] Bespoke AI Wash Combo 2026 (itemId: "2.2.1")
│           ├── [L4-task] Sensor & AI Algorithm    (itemId: "2.2.1.a")
│           └── [L4-task] Mechanical Engineering   (itemId: "2.2.1.b")
│
├── [L1-area] Samsung Display & TV                (itemId: "3")
│   ├── [L2-family] Neo QLED 8K Series            (itemId: "3.1")
│   │   ├── [L3-product] QN900D/QN800D 8K (2024)  (itemId: "3.1.1")
│   │   │   ├── [L4-task] Panel Production         (itemId: "3.1.1.a")
│   │   │   └── [L4-task] AI Processor & Firmware  (itemId: "3.1.1.b")
│   │   └── [L3-product] QN900F/QN800F 8K (2026)  (itemId: "3.1.2")
│   └── [L2-family] Samsung OLED TV Series         (itemId: "3.2")
│       └── [L3-product] S95D OLED (2025 Refresh)  (itemId: "3.2.1")
│           └── [L4-task] QD-OLED Panel R&D        (itemId: "3.2.1.a")
│
└── [L1-area] Samsung Wearables & Audio           (itemId: "4")
    ├── [L2-family] Galaxy Watch Series            (itemId: "4.1")
    │   ├── [L3-product] Galaxy Watch 7 / Ultra    (itemId: "4.1.1")
    │   │   └── [L4-task] Sensor Integration       (itemId: "4.1.1.a")
    │   └── [L3-product] Galaxy Watch 8 Series     (itemId: "4.1.2")
    └── [L2-family] Galaxy Buds Series             (itemId: "4.2")
        └── [L3-product] Galaxy Buds 3 Pro         (itemId: "4.2.1")
            └── [L4-task] Acoustic Engineering     (itemId: "4.2.1.a")
```

**Thống kê:**
- 4 Product Areas (level 1)
- 8 Product Families (level 2)
- 11 Products (level 3)
- 12+ Tasks (level 4)
- **Tổng: ~35 nodes**

---

## 4. Master Factor Items (Công đoạn mẫu)

```
Block (L1): "Product Development"
├── Function (L2): "Research & Development"
│   ├── Activity (L3): "Concept Design"
│   │   └── Detail (L4): "Market Research & Analysis"
│   ├── Activity (L3): "Prototyping"
│   │   └── Detail (L4): "Hardware Prototyping"
│   └── Activity (L3): "Feasibility Study"
├── Function (L2): "Engineering"
│   ├── Activity (L3): "Hardware Engineering"
│   │   └── Detail (L4): "PCB Design"
│   ├── Activity (L3): "Software Development"
│   │   └── Detail (L4): "Firmware Development"
│   └── Activity (L3): "Integration & Testing"
├── Function (L2): "Manufacturing"
│   ├── Activity (L3): "Pilot Production"
│   └── Activity (L3): "Mass Production"
└── Function (L2): "Quality Assurance"
    ├── Activity (L3): "Quality Control"
    └── Activity (L3): "Certification"

Block (L1): "Industrial Design"
├── Function (L2): "Design"
│   ├── Activity (L3): "Product Design"
│   └── Activity (L3): "Packaging Design"
└── Function (L2): "Material Sourcing"
```

---

## 5. Departments (Tổ chức)

```
Site: "Samsung Suwon Campus"                    [headcount: 500]
├── Team: "Mobile R&D Team"                     [headcount: 120]
│   ├── Group: "Hardware Engineering Group"     [headcount: 45]
│   │   ├── Part: "PCB Design Part"             [headcount: 15]
│   │   ├── Part: "Display Integration Part"    [headcount: 12]
│   │   └── Part: "Thermal Management Part"     [headcount: 8]
│   ├── Group: "Software Engineering Group"     [headcount: 50]
│   │   ├── Part: "Firmware Part"               [headcount: 20]
│   │   ├── Part: "AI/ML Part"                  [headcount: 15]
│   │   └── Part: "QA Part"                     [headcount: 15]
│   └── Group: "Product Planning Group"         [headcount: 25]
│       ├── Part: "Concept Design Part"         [headcount: 10]
│       └── Part: "UX Research Part"            [headcount: 15]
├── Team: "Home Appliance R&D Team"             [headcount: 80]
│   ├── Group: "AI Integration Group"           [headcount: 30]
│   └── Group: "Mechanical Engineering Group"   [headcount: 50]
├── Team: "Display R&D Team"                    [headcount: 70]
│   ├── Group: "Panel Engineering Group"        [headcount: 40]
│   └── Group: "Software Group"                 [headcount: 30]
└── Team: "Wearable & Audio R&D Team"           [headcount: 60]
    ├── Group: "Sensor & Health Group"          [headcount: 25]
    └── Group: "Acoustic Engineering Group"     [headcount: 35]

Site: "Samsung Giheung Campus"                  [headcount: 300]
├── Team: "Manufacturing Engineering Team"      [headcount: 150]
│   ├── Group: "SMT Line Group"                 [headcount: 60]
│   └── Group: "Assembly Group"                 [headcount: 90]
└── Team: "Quality Assurance Team"              [headcount: 150]
    ├── Group: "Incoming QA Group"              [headcount: 50]
    └── Group: "Outgoing QA Group"              [headcount: 100]
```

---

## 6. Simulation mẫu

### Simulation 1: "Samsung 2024-2028 Master Plan"

```json
{
  "product_line_id": "<Samsung Electronics>",
  "name": "Samsung 2024-2028 Master Plan",
  "description": "Kế hoạch tổng thể cho tất cả dòng sản phẩm Samsung 2024-2028",
  "status": "active",
  "created_by": "<Planner A>"
}
```

**Revision 1:** Initial plan — tất cả plan items từ gantt-item-samsung01.json

### Simulation 2: "Samsung Q3 2025 Adjustment" (clone từ #1)

```json
{
  "product_line_id": "<Samsung Electronics>",
  "name": "Samsung Q3 2025 Adjustment",
  "description": "Điều chỉnh kế hoạch sau review Q3/2025",
  "status": "draft",
  "cloned_from_id": "<Simulation 1>",
  "created_by": "<Planner B>"
}
```

---

## 7. Resource Allocation mẫu (cho 1 task)

Ví dụ: Task "R&D & Concept Design" của Galaxy S25 Series

| Department | Allocated | Role |
|-----------|-----------|------|
| PCB Design Part | 5 | Hardware Engineer |
| Concept Design Part | 8 | Product Designer |
| UX Research Part | 4 | UX Researcher |
| AI/ML Part | 3 | AI Researcher |

**Tổng: 20 headcount** cho task này (Jan 2024 - Apr 2024)
