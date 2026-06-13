# Database Design — Hệ thống Lập kế hoạch Sản phẩm & Phân bổ Nguồn lực

> **Phiên bản:** 1.0
> **Ngày:** 2026-06-13
> **Tác giả:** Planning Team

---

## 1. Tổng quan bài toán

Hệ thống phục vụ **lập kế hoạch sản xuất sản phẩm** (Production Planning) và **phân bổ nguồn lực** (Resource Allocation) cho nhiều dòng sản phẩm (Product Line).

### 1.1. Các thực thể chính

| Domain | Mô tả |
|--------|--------|
| **Product Hierarchy** | Cây phân cấp sản phẩm: Product Line → Product Area → Product Family → Product → Task → SubTask |
| **Master Factor Item** | Cây phân cấp công đoạn: Block → Function → Activity → Detail (nhiều level) |
| **Department** | Cây phân cấp tổ chức: Site → Team → Group → Part |
| **Simulation** | Kế hoạch lập bởi Planner cho một Product Line — có revision, clone |
| **Resource Allocation** | Phân bổ nhân lực từ Department vào các công đoạn |

### 1.2. Workflow

```
Planner tạo Simulation cho Product Line
  → Chia công đoạn (Factor Item) cho từng node sản phẩm
  → Gán nhân lực (headcount) từ Department vào mỗi công đoạn
  → Lưu → tạo Revision mới
  → Planner khác có thể Clone simulation để chỉnh sửa
```

### 1.3. Chức năng hệ thống

- **CRUD** cho tất cả master data và simulation data
- **Gantt Chart** — trực quan hóa timeline theo simulation
- **Multi-dimension Analysis** — thống kê chéo theo Product × Department × Time × Factor
- **Revision Management** — lịch sử chỉnh sửa simulation
- **Clone Simulation** — sao chép kế hoạch từ planner khác

---

## 2. Kiến trúc dữ liệu

### 2.1. Sơ đồ tổng quan (ERD)

```
┌─────────────┐       ┌──────────────────┐       ┌───────────────────┐
│    users     │       │  product_lines   │       │ master_factor_    │
│─────────────│       │──────────────────│       │     items         │
│ id (PK)     │◄──┐   │ id (PK)          │       │───────────────────│
│ name        │   │   │ name             │       │ id (PK)           │
│ email       │   │   │ code             │       │ name              │
│ role        │   │   │ description      │       │ factor_type       │
│ status      │   │   │ status           │       │ level             │
└─────────────┘   │   └──────────────────┘       │ parent_id (FK→self)│
                  │          │                    │ sort_order        │
                  │          │ 1:N                └───────────────────┘
                  │          ▼
                  │   ┌──────────────────┐
                  │   │  product_nodes   │
                  │   │──────────────────│       ┌───────────────────┐
                  │   │ id (PK)          │       │   departments     │
                  │   │ product_line_id  │       │───────────────────│
                  │   │ name             │       │ id (PK)           │
                  │   │ node_type        │       │ name              │
                  │   │ level            │       │ dept_type         │
                  │   │ parent_id (FK→self)│      │ level            │
                  │   │ sort_order       │       │ parent_id (FK→self)│
                  │   └──────────────────┘       │ headcount         │
                  │                               │ sort_order        │
                  │                               └───────────────────┘
                  │                                        │
                  │          ┌──────────────────┐          │
                  │          │  simulations     │          │
                  │          │──────────────────│          │
                  └──────────│ created_by (FK)  │          │
                   (planner) │ product_line_id  │          │
                             │ name             │          │
                             │ cloned_from_id   │          │
                             │ status           │          │
                             │ current_revision │          │
                             └───────┬──────────┘          │
                                     │ 1:N                 │
                                     ▼                     │
                             ┌──────────────────┐          │
                             │ simulation_      │          │
                             │  revisions       │          │
                             │──────────────────│          │
                             │ id (PK)          │          │
                             │ simulation_id    │          │
                             │ revision_number  │          │
                             │ created_by (FK)  │          │
                             │ change_desc      │          │
                             └───────┬──────────┘          │
                                     │ 1:N                │
                                     ▼                     │
                             ┌──────────────────┐          │
                             │ simulation_      │          │
                             │  plan_items      │          │
                             │──────────────────│          │
                             │ id (PK)          │          │
                             │ revision_id (FK) │          │
                             │ product_node_id  │          │
                             │ factor_item_id   │          │
                             │ start_date       │          │
                             │ end_date         │          │
                             │ progress         │          │
                             │ notes            │          │
                             │ sort_order       │          │
                             └───────┬──────────┘          │
                                     │ 1:N                │
                                     ▼                     │
                             ┌──────────────────┐          │
                             │ resource_        │          │
                             │  allocations     │          │
                             │──────────────────│          │
                             │ id (PK)          │          │
                             │ plan_item_id(FK) │          │
                             │ department_id(FK)│◄─────────┘
                             │ allocated_count  │
                             │ notes            │
                             └──────────────────┘
```

### 2.2. Sơ đồ phân cấp (Hierarchies)

#### Product Hierarchy
```
Product Line: "Samsung Electronics"
  └── Product Area (L1): "Samsung Galaxy Smartphones"          [node_type=area]
        ├── Product Family (L2): "Galaxy S Series"             [node_type=family]
        │     ├── Product (L3): "Galaxy S25 Series"            [node_type=product]
        │     │     ├── Task (L4): "R&D & Concept Design"      [node_type=task]
        │     │     ├── Task (L4): "Hardware Engineering"       [node_type=task]
        │     │     └── Task (L4): "Software Integration"       [node_type=task]
        │     └── Product (L3): "Galaxy S26 Series"
        ├── Product Family (L2): "Galaxy Z Series (Foldables)"
        └── ...
```

#### Master Factor Item (Công đoạn)
```
Block (L1): "Product Development"
  ├── Function (L2): "R&D"
  │     ├── Activity (L3): "Concept Design"
  │     │     └── Detail (L4): "Market Research"
  │     └── Activity (L3): "Prototyping"
  └── Function (L2): "Manufacturing"
        └── Activity (L3): "Mass Production"
```

#### Department (Tổ chức)
```
Site: "Samsung Suwon"
  ├── Team: "Mobile R&D Team"
  │     ├── Group: "Hardware Group"
  │     │     └── Part: "PCB Design Part"     [headcount: 15]
  │     └── Group: "Software Group"
  │           └── Part: "Firmware Part"        [headcount: 20]
  └── Team: "QA Team"
        └── ...
```

---

## 3. Chi tiết bảng dữ liệu

### 3.1. users — Người dùng hệ thống

| Column | Type | Constraints | Mô tả |
|--------|------|------------|--------|
| id | UUID | PK | Khóa chính |
| name | VARCHAR(255) | NOT NULL | Tên hiển thị |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Email đăng nhập |
| role | ENUM | NOT NULL | `admin`, `planner`, `viewer` |
| avatar_url | VARCHAR(500) | | URL ảnh đại diện |
| status | ENUM | NOT NULL DEFAULT 'active' | `active`, `inactive` |
| created_at | TIMESTAMP | NOT NULL DEFAULT NOW() | Ngày tạo |
| updated_at | TIMESTAMP | NOT NULL DEFAULT NOW() | Ngày cập nhật |

### 3.2. product_lines — Dòng sản phẩm

| Column | Type | Constraints | Mô tả |
|--------|------|------------|--------|
| id | UUID | PK | Khóa chính |
| name | VARCHAR(255) | NOT NULL | Tên dòng sản phẩm (VD: "Samsung Electronics") |
| code | VARCHAR(50) | UNIQUE, NOT NULL | Mã dòng sản phẩm (VD: "SAMSUNG") |
| description | TEXT | | Mô tả |
| status | ENUM | NOT NULL DEFAULT 'active' | `active`, `inactive`, `archived` |
| created_by | UUID | FK → users.id | Người tạo |
| created_at | TIMESTAMP | NOT NULL DEFAULT NOW() | |
| updated_at | TIMESTAMP | NOT NULL DEFAULT NOW() | |

### 3.3. product_nodes — Node phân cấp sản phẩm

Sử dụng **Adjacency List** pattern — mỗi node trỏ đến parent qua `parent_id`.

| Column | Type | Constraints | Mô tả |
|--------|------|------------|--------|
| id | UUID | PK | Khóa chính |
| product_line_id | UUID | FK → product_lines.id, NOT NULL | Thuộc dòng sản phẩm nào |
| name | VARCHAR(255) | NOT NULL | Tên node |
| node_type | ENUM | NOT NULL | `area`, `family`, `product`, `task`, `subtask` |
| level | INTEGER | NOT NULL | Cấp độ (1=area, 2=family, 3=product, 4=task, 5=subtask) |
| parent_id | UUID | FK → product_nodes.id (self-ref) | Node cha (NULL nếu là root) |
| sort_order | INTEGER | NOT NULL DEFAULT 0 | Thứ tự sắp xếp |
| metadata | JSONB | | Dữ liệu mở rộng (specs, notes...) |
| status | ENUM | NOT NULL DEFAULT 'active' | `active`, `inactive` |
| created_at | TIMESTAMP | NOT NULL DEFAULT NOW() | |
| updated_at | TIMESTAMP | NOT NULL DEFAULT NOW() | |

**Index:**
- `idx_product_nodes_line` ON (product_line_id)
- `idx_product_nodes_parent` ON (parent_id)
- `idx_product_nodes_type_level` ON (node_type, level)

### 3.4. master_factor_items — Công đoạn mẫu

Định nghĩa cây công đoạn chuẩn. Khi tạo simulation, planner sẽ dựa vào cấu trúc này.

| Column | Type | Constraints | Mô tả |
|--------|------|------------|--------|
| id | UUID | PK | Khóa chính |
| name | VARCHAR(255) | NOT NULL | Tên công đoạn |
| factor_type | ENUM | NOT NULL | `block`, `function`, `activity`, `detail` |
| level | INTEGER | NOT NULL | Cấp độ (có thể nhiều level mỗi type) |
| parent_id | UUID | FK → master_factor_items.id (self-ref) | Công đoạn cha |
| sort_order | INTEGER | NOT NULL DEFAULT 0 | Thứ tự |
| description | TEXT | | Mô tả |
| color_code | VARCHAR(7) | | Màu hiển thị trên Gantt (#RRGGBB) |
| status | ENUM | NOT NULL DEFAULT 'active' | `active`, `inactive` |
| created_at | TIMESTAMP | NOT NULL DEFAULT NOW() | |
| updated_at | TIMESTAMP | NOT NULL DEFAULT NOW() | |

### 3.5. departments — Phòng ban / Tổ chức

| Column | Type | Constraints | Mô tả |
|--------|------|------------|--------|
| id | UUID | PK | Khóa chính |
| name | VARCHAR(255) | NOT NULL | Tên đơn vị |
| dept_type | ENUM | NOT NULL | `site`, `team`, `group`, `part` |
| level | INTEGER | NOT NULL | Cấp độ (1=site, 2=team, 3=group, 4=part) |
| parent_id | UUID | FK → departments.id (self-ref) | Đơn vị cha |
| headcount | INTEGER | NOT NULL DEFAULT 0 | Số lượng nhân lực có sẵn |
| sort_order | INTEGER | NOT NULL DEFAULT 0 | Thứ tự |
| description | TEXT | | Mô tả |
| status | ENUM | NOT NULL DEFAULT 'active' | `active`, `inactive` |
| created_at | TIMESTAMP | NOT NULL DEFAULT NOW() | |
| updated_at | TIMESTAMP | NOT NULL DEFAULT NOW() | |

**Index:**
- `idx_departments_parent` ON (parent_id)
- `idx_departments_type` ON (dept_type)

### 3.6. simulations — Kế hoạch lập bởi Planner

| Column | Type | Constraints | Mô tả |
|--------|------|------------|--------|
| id | UUID | PK | Khóa chính |
| product_line_id | UUID | FK → product_lines.id, NOT NULL | Dòng sản phẩm |
| name | VARCHAR(255) | NOT NULL | Tên kế hoạch |
| description | TEXT | | Mô tả kế hoạch |
| status | ENUM | NOT NULL DEFAULT 'draft' | `draft`, `active`, `completed`, `archived` |
| current_revision | INTEGER | NOT NULL DEFAULT 0 | Số revision hiện tại |
| cloned_from_id | UUID | FK → simulations.id (self-ref) | Simulation gốc (nếu là clone) |
| created_by | UUID | FK → users.id, NOT NULL | Planner tạo |
| created_at | TIMESTAMP | NOT NULL DEFAULT NOW() | |
| updated_at | TIMESTAMP | NOT NULL DEFAULT NOW() | |

**Index:**
- `idx_simulations_product_line` ON (product_line_id)
- `idx_simulations_created_by` ON (created_by)
- `idx_simulations_status` ON (status)

### 3.7. simulation_revisions — Lịch sử chỉnh sửa Simulation

Mỗi lần planner sửa simulation, một revision mới được tạo. Revision chứa toàn bộ dữ liệu plan items.

| Column | Type | Constraints | Mô tả |
|--------|------|------------|--------|
| id | UUID | PK | Khóa chính |
| simulation_id | UUID | FK → simulations.id, NOT NULL | Simulation thuộc về |
| revision_number | INTEGER | NOT NULL | Số thứ tự revision (1, 2, 3...) |
| name | VARCHAR(255) | | Tên version (VD: "v2 - Adjusted Q3") |
| change_description | TEXT | | Mô tả thay đổi |
| created_by | UUID | FK → users.id, NOT NULL | Người chỉnh sửa |
| created_at | TIMESTAMP | NOT NULL DEFAULT NOW() | |
| updated_at | TIMESTAMP | NOT NULL DEFAULT NOW() | |

**Unique:** `(simulation_id, revision_number)`

### 3.8. simulation_plan_items — Công đoạn được gán trong Simulation

Đây là bảng trung tâm — mỗi record là một công đoạn được gán cho một node sản phẩm trong một revision cụ thể.

| Column | Type | Constraints | Mô tả |
|--------|------|------------|--------|
| id | UUID | PK | Khóa chính |
| revision_id | UUID | FK → simulation_revisions.id, NOT NULL | Revision thuộc về |
| product_node_id | UUID | FK → product_nodes.id, NOT NULL | Node sản phẩm |
| factor_item_id | UUID | FK → master_factor_items.id | Công đoạn mẫu (nullable nếu custom) |
| factor_name | VARCHAR(255) | NOT NULL | Tên công đoạn (snapshot từ master hoặc custom) |
| factor_type | ENUM | NOT NULL | `block`, `function`, `activity`, `detail` |
| level | INTEGER | NOT NULL | Cấp độ |
| parent_id | UUID | FK → simulation_plan_items.id (self-ref) | Plan item cha |
| start_date | DATE | NOT NULL | Ngày bắt đầu |
| end_date | DATE | NOT NULL | Ngày kết thúc |
| progress | DECIMAL(5,4) | NOT NULL DEFAULT 0 | Tiến độ (0.0 → 1.0) |
| milestone | BOOLEAN | NOT NULL DEFAULT FALSE | Có phải milestone không |
| notes | TEXT | | Ghi chú |
| sort_order | INTEGER | NOT NULL DEFAULT 0 | Thứ tự |
| status | ENUM | NOT NULL DEFAULT 'planned' | `planned`, `in_progress`, `completed`, `cancelled` |
| created_at | TIMESTAMP | NOT NULL DEFAULT NOW() | |
| updated_at | TIMESTAMP | NOT NULL DEFAULT NOW() | |

**Index:**
- `idx_plan_items_revision` ON (revision_id)
- `idx_plan_items_product_node` ON (product_node_id)
- `idx_plan_items_factor` ON (factor_item_id)
- `idx_plan_items_parent` ON (parent_id)
- `idx_plan_items_dates` ON (start_date, end_date)

### 3.9. resource_allocations — Phân bổ nguồn lực

Mỗi plan item có thể được gán nhân lực từ nhiều department.

| Column | Type | Constraints | Mô tả |
|--------|------|------------|--------|
| id | UUID | PK | Khóa chính |
| plan_item_id | UUID | FK → simulation_plan_items.id, NOT NULL | Công đoạn được gán |
| department_id | UUID | FK → departments.id, NOT NULL | Department cung cấp nhân lực |
| allocated_count | DECIMAL(8,2) | NOT NULL DEFAULT 0 | Số lượng nhân lực phân bổ (hỗ trợ 0.5 FTE) |
| role | VARCHAR(100) | | Vai trò phân bổ (VD: "Developer", "Tester") |
| notes | TEXT | | Ghi chú |
| created_at | TIMESTAMP | NOT NULL DEFAULT NOW() | |
| updated_at | TIMESTAMP | NOT NULL DEFAULT NOW() | |

**Unique:** `(plan_item_id, department_id)` — mỗi department chỉ phân bổ 1 lần cho mỗi plan item

**Index:**
- `idx_allocations_plan_item` ON (plan_item_id)
- `idx_allocations_department` ON (department_id)

### 3.10. audit_logs — Nhật ký thao tác (optional)

| Column | Type | Constraints | Mô tả |
|--------|------|------------|--------|
| id | UUID | PK | Khóa chính |
| user_id | UUID | FK → users.id | Người thao tác |
| action | VARCHAR(50) | NOT NULL | `create`, `update`, `delete`, `clone` |
| entity_type | VARCHAR(50) | NOT NULL | Tên bảng |
| entity_id | UUID | NOT NULL | ID của record |
| changes | JSONB | | Chi tiết thay đổi (before/after) |
| created_at | TIMESTAMP | NOT NULL DEFAULT NOW() | |

---

## 4. Thiết kế các truy vấn chính

### 4.1. Lấy cây sản phẩm cho Gantt Chart

```sql
-- Lấy tất cả plan items của một simulation revision, kèm product node info
SELECT
  spi.id,
  spi.factor_name AS name,
  spi.factor_type,
  spi.level,
  spi.parent_id,
  spi.start_date,
  spi.end_date,
  spi.progress,
  spi.notes,
  spi.status,
  pn.name AS product_node_name,
  pn.node_type AS product_node_type
FROM simulation_plan_items spi
JOIN product_nodes pn ON spi.product_node_id = pn.id
WHERE spi.revision_id = :revision_id
ORDER BY pn.sort_order, spi.sort_order;
```

### 4.2. Resource Allocation Summary (Multi-dimension)

```sql
-- Tổng hợp nhân lực theo Department × Product Area × Factor Type
SELECT
  d.name AS department_name,
  d.dept_type,
  pn_area.name AS product_area,
  spi.factor_type,
  SUM(ra.allocated_count) AS total_headcount,
  COUNT(DISTINCT spi.id) AS total_tasks
FROM resource_allocations ra
JOIN simulation_plan_items spi ON ra.plan_item_id = spi.id
JOIN product_nodes pn ON spi.product_node_id = pn.id
JOIN product_nodes pn_area ON get_root_ancestor(pn.id) = pn_area.id
JOIN departments d ON ra.department_id = d.id
WHERE spi.revision_id = :revision_id
GROUP BY d.name, d.dept_type, pn_area.name, spi.factor_type;
```

### 4.3. Cross-tab Analysis (Pivot)

```sql
-- Product Area × Quarter pivot cho Gantt timeline
SELECT
  pn.name AS product_name,
  EXTRACT(QUARTER FROM spi.start_date) AS quarter,
  EXTRACT(YEAR FROM spi.start_date) AS year,
  SUM(ra.allocated_count) AS total_headcount,
  AVG(spi.progress) AS avg_progress
FROM simulation_plan_items spi
JOIN product_nodes pn ON spi.product_node_id = pn.id
LEFT JOIN resource_allocations ra ON ra.plan_item_id = spi.id
WHERE spi.revision_id = :revision_id
  AND pn.node_type = 'family'
GROUP BY pn.name, year, quarter
ORDER BY pn.name, year, quarter;
```

### 4.4. Clone Simulation

```sql
-- Step 1: Tạo simulation mới
INSERT INTO simulations (product_line_id, name, cloned_from_id, created_by)
SELECT product_line_id, name || ' (Copy)', :source_sim_id, :current_user_id
FROM simulations WHERE id = :source_sim_id
RETURNING id;

-- Step 2: Tạo revision mới (copy từ revision mới nhất)
INSERT INTO simulation_revisions (simulation_id, revision_number, name, created_by)
VALUES (:new_sim_id, 1, 'v1 - Cloned', :current_user_id)
RETURNING id;

-- Step 3: Copy tất cả plan_items (với revision mới)
INSERT INTO simulation_plan_items (
  revision_id, product_node_id, factor_item_id, factor_name,
  factor_type, level, parent_id, start_date, end_date,
  progress, milestone, notes, sort_order, status
)
SELECT
  :new_revision_id, product_node_id, factor_item_id, factor_name,
  factor_type, level, parent_id, start_date, end_date,
  progress, milestone, notes, sort_order, status
FROM simulation_plan_items
WHERE revision_id = :source_revision_id;

-- Step 4: Copy resource allocations
INSERT INTO resource_allocations (plan_item_id, department_id, allocated_count, role, notes)
SELECT
  new_spi.id, ra.department_id, ra.allocated_count, ra.role, ra.notes
FROM resource_allocations ra
JOIN simulation_plan_items old_spi ON ra.plan_item_id = old_spi.id
JOIN simulation_plan_items new_spi ON (
  new_spi.revision_id = :new_revision_id
  AND new_spi.product_node_id = old_spi.product_node_id
  AND new_spi.factor_name = old_spi.factor_name
  AND new_spi.sort_order = old_spi.sort_order
)
WHERE old_spi.revision_id = :source_revision_id;
```

---

## 5. Thiết kế cho Multi-dimension Analysis

Hệ thống hỗ trợ phân tích đa chiều theo 4 trục chính:

```
                    ┌─────────────────────────────────────────┐
                    │        MULTI-DIMENSION ANALYSIS          │
                    └─────────────────────────────────────────┘
                                       │
           ┌───────────────────────────┼───────────────────────────┐
           │                           │                           │
    ┌──────▼──────┐           ┌────────▼────────┐        ┌────────▼────────┐
    │  PRODUCT    │           │   ORGANIZATION   │        │     TIME        │
    │  DIMENSION  │           │   DIMENSION      │        │   DIMENSION     │
    ├─────────────┤           ├──────────────────┤        ├─────────────────┤
    │ Line        │           │ Site             │        │ Year            │
    │ Area        │           │ Team             │        │ Quarter         │
    │ Family      │           │ Group            │        │ Month           │
    │ Product     │           │ Part             │        │ Week            │
    │ Task        │           │                  │        │                 │
    └─────────────┘           └──────────────────┘        └─────────────────┘
           │                           │                           │
           └───────────────────────────┼───────────────────────────┘
                                       │
                              ┌────────▼────────┐
                              │ FACTOR DIMENSION │
                              ├─────────────────┤
                              │ Block           │
                              │ Function        │
                              │ Activity        │
                              │ Detail          │
                              └─────────────────┘
```

### 5.1. Measures (Chỉ số đo lường)

| Measure | Công thức | Mô tả |
|---------|-----------|--------|
| Total Headcount | `SUM(allocated_count)` | Tổng nhân lực phân bổ |
| Total Tasks | `COUNT(plan_items)` | Tổng số công đoạn |
| Average Progress | `AVG(progress)` | Tiến độ trung bình |
| Duration Days | `end_date - start_date` | Số ngày thực hiện |
| Headcount Utilization | `allocated / available` | Tỷ lệ sử dụng nhân lực |
| Task Completion Rate | `completed / total` | Tỷ lệ hoàn thành |

### 5.2. Slice & Dice Patterns

**Slice by Product Hierarchy:**
- Tổng headcount theo Product Area → Product Family → Product
- Drill-down từ Area xuống Task level

**Slice by Department:**
- Tổng headcount được assign theo Site → Team → Group → Part
- So sánh utilization giữa các department

**Slice by Time:**
- Headcount theo Quarter, Month
- Timeline Gantt view

**Slice by Factor:**
- Headcount theo Block → Function → Activity → Detail
- Phân bổ nguồn lực theo loại công việc

**Cross-tab:**
- Product Area × Quarter (headcount matrix)
- Department × Factor Type (resource allocation matrix)
- Product Family × Department (who works on what)

---

## 6. API Design (RESTful)

### 6.1. Master Data APIs

```
# Product Lines
GET    /api/product-lines                    # List product lines
POST   /api/product-lines                    # Create product line
GET    /api/product-lines/:id                # Get product line detail
PUT    /api/product-lines/:id                # Update product line
DELETE /api/product-lines/:id                # Delete product line

# Product Nodes (hierarchical)
GET    /api/product-lines/:id/nodes          # Get full tree
GET    /api/product-lines/:id/nodes/:nodeId  # Get node with children
POST   /api/product-lines/:id/nodes          # Create node
PUT    /api/product-nodes/:nodeId            # Update node
DELETE /api/product-nodes/:nodeId            # Delete node

# Master Factor Items
GET    /api/factor-items                     # Get full tree
POST   /api/factor-items                     # Create factor item
PUT    /api/factor-items/:id                 # Update
DELETE /api/factor-items/:id                 # Delete

# Departments
GET    /api/departments                      # Get full tree
POST   /api/departments                      # Create department
PUT    /api/departments/:id                  # Update
DELETE /api/departments/:id                  # Delete
```

### 6.2. Simulation APIs

```
# Simulations
GET    /api/product-lines/:id/simulations           # List simulations
POST   /api/product-lines/:id/simulations           # Create simulation
GET    /api/simulations/:id                          # Get simulation detail
PUT    /api/simulations/:id                          # Update simulation info
DELETE /api/simulations/:id                          # Delete simulation
POST   /api/simulations/:id/clone                    # Clone simulation

# Revisions
GET    /api/simulations/:id/revisions                # List revisions
GET    /api/simulations/:id/revisions/:revId         # Get revision detail
POST   /api/simulations/:id/revisions                # Create new revision

# Plan Items (within revision)
GET    /api/revisions/:revId/plan-items              # Get all plan items (Gantt data)
POST   /api/revisions/:revId/plan-items              # Create plan item
PUT    /api/plan-items/:id                            # Update plan item
DELETE /api/plan-items/:id                            # Delete plan item
PATCH  /api/revisions/:revId/plan-items/bulk          # Bulk update (drag & drop)

# Resource Allocations
GET    /api/plan-items/:id/allocations               # Get allocations for item
POST   /api/plan-items/:id/allocations               # Set allocation
PUT    /api/allocations/:id                           # Update allocation
DELETE /api/allocations/:id                           # Remove allocation
```

### 6.3. Analytics APIs

```
# Multi-dimension Analysis
POST   /api/analytics/pivot                           # Cross-tab pivot query
POST   /api/analytics/headcount-summary               # Headcount aggregation
POST   /api/analytics/progress-report                 # Progress by dimension
GET    /api/simulations/:id/gantt-data                # Gantt chart data
GET    /api/simulations/:id/resource-heatmap          # Resource utilization heatmap
```

---

## 7. Mapping với dữ liệu mẫu (gantt-item-samsung01.json)

Dữ liệu mẫu trong `data/es/gantt-item-samsung01.json` sẽ được map vào schema như sau:

### 7.1. Mapping Table

| JSON Field | DB Table | DB Column | Mô tả |
|-----------|----------|-----------|--------|
| `itemId: "1"` | product_nodes | id (hoặc generated UUID) | Root product area |
| `name` | product_nodes | name | Tên node |
| `nodeType: "product area"` | product_nodes | node_type = `area` | Enum mapping |
| `level: 1` | product_nodes | level = 1 | Cấp độ |
| `parentId: null` | product_nodes | parent_id = NULL | Root node |
| `startDate` | simulation_plan_items | start_date | Ngày bắt đầu |
| `endDate` | simulation_plan_items | end_date | Ngày kết thúc |
| `progress` | simulation_plan_items | progress | Tiến độ |
| `notes` | simulation_plan_items | notes | Ghi chú |

### 7.2. Cấu trúc wrap thêm

Dữ liệu mẫu hiện tại chỉ là **1 Product Area** trong 1 Product Line. Khi đưa vào DB, cần:

1. Tạo `product_lines` record: "Samsung Electronics"
2. Tạo `product_nodes` cho từng item trong JSON (theo parentId hierarchy)
3. Tạo `simulations` record: "Samsung 2024-2028 Plan"
4. Tạo `simulation_revisions` revision #1
5. Tạo `simulation_plan_items` cho mỗi node, gán ngày tháng và progress từ JSON
6. Tạo `resource_allocations` (chưa có data mẫu → để trống)

---

## 8. Quy ước thiết kế

### 8.1. Naming Convention

| Loại | Quy ước | Ví dụ |
|------|---------|--------|
| Bảng | snake_case, số nhiều | `product_lines`, `simulations` |
| Column | snake_case | `product_line_id`, `start_date` |
| Primary Key | `id` (UUID) | |
| Foreign Key | `{table_singular}_id` | `product_line_id`, `created_by` |
| Enum | lowercase, snake_case | `product_area`, `in_progress` |
| Timestamp | `created_at`, `updated_at` | |

### 8.2. Quản lý State

```
Simulation Status Flow:
  draft → active → completed → archived
                  ↘ cancelled

Plan Item Status Flow:
  planned → in_progress → completed
                        ↘ cancelled

Revision:
  Luôn append-only — KHÔNG xóa revision cũ
```

---

## 9. Công nghệ đề xuất

| Layer | Công nghệ | Lý do |
|-------|-----------|--------|
| DB | PostgreSQL 15+ | Hỗ trợ JSONB, CTE recursive query cho tree, UUID |
| ORM | Prisma | Type-safe, migration tự động, hỗ trợ PostgreSQL |
| API | REST + GraphQL (optional) | REST cho CRUD, GraphQL cho multi-dimension query |
| Cache | Redis | Cache tree queries, aggregation results |
| Search | Elasticsearch | Full-text search, analytics aggregation |

---

## 10. Thư mục tài liệu

```
planning-db-design/
├── README.md              ← Tài liệu này (tổng quan + chi tiết)
├── schema.prisma          ← Prisma schema file
└── seed-data.md           ← Dữ liệu mẫu cho development
```
