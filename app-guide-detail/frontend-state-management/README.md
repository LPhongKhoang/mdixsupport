# Frontend State Management trong Mendix v10 — Product Management Demo

## Tổng quan

Guide thực tiễn này hướng dẫn cách xây dựng giao diện **Product Management** trên Mendix Studio Pro v10.24.9, tập trung vào:

- **State Management phía Frontend** bằng Non-Persistent Entity (NPE)
- **Data Grid 2** với columns phức tạp, action buttons, conditional formatting
- **Filter Pattern** — Categories, Suppliers, Date Range — giữ filter state xuyên suốt CRUD
- **Popup Modal** — Quick Edit & Create New Product
- **Toggle Active/Inactive** — cập nhật DB + reload danh sách
- **Nanoflow & Microflow** — phân bổ đúng logic giữa client-side và server-side

## Kiến trúc State Management

```
┌─────────────────────────────────────────────────────────┐
│                    Mendix Runtime (Server)               │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │ Product (PE) │  │ Category(PE) │  │ ProductVariant │ │
│  │ Supplier(PE) │  │              │  │    (PE)        │ │
│  └──────┬───────┘  └──────┬───────┘  └───────┬────────┘ │
│         │                 │                   │          │
│  ───────┼─────────────────┼───────────────────┼──────── │
│         │   Microflows    │                   │          │
│         │  (DB Operations)│                   │          │
└─────────┼─────────────────┼───────────────────┼──────────┘
          │                 │                   │
          ▼                 ▼                   ▼
┌─────────────────────────────────────────────────────────┐
│                   Browser (Client)                       │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │        ProductFilterContext (NPE)                │   │
│  │  ┌─────────────┐  ┌──────────────────────────┐  │   │
│  │  │ Filter State│  │ Pagination & Sort State  │  │   │
│  │  │ - category  │  │ - page                   │  │   │
│  │  │ - supplier  │  │ - pageSize               │  │   │
│  │  │ - dateFrom  │  │ - sortColumn             │  │   │
│  │  │ - dateTo    │  │                          │  │   │
│  │  └─────────────┘  └──────────────────────────┘  │   │
│  └──────────────────────────────────────────────────┘   │
│           │                              │               │
│           ▼                              ▼               │
│  ┌────────────────┐          ┌──────────────────┐       │
│  │  Filter Bar    │          │  Data Grid 2     │       │
│  │  (Dropdowns,   │          │  (Product List)  │       │
│  │   DatePickers) │          │  + Action Btns   │       │
│  └────────────────┘          └──────────────────┘       │
│                                                         │
│  ┌────────────────┐          ┌──────────────────┐       │
│  │  Popup: Edit   │          │  Popup: Create   │       │
│  │  (NPE Proxy)   │          │  (New Product)   │       │
│  └────────────────┘          └──────────────────┘       │
└─────────────────────────────────────────────────────────┘
```

## Danh sách file hướng dẫn

| # | File | Nội dung |
|---|------|----------|
| 01 | [01-domain-model.md](01-domain-model.md) | Persistent Entities (Product, Category, Supplier, ProductVariant) + Non-Persistent Entity (ProductFilterContext, ProductEditProxy) |
| 02 | [02-enumerations-and-associations.md](02-enumerations-and-associations.md) | Enumerations (ProductStatus), Associations, Validation Rules |
| 03 | [03-microflows-and-nanoflows.md](03-microflows-and-nanoflows.md) | Microflows (DB ops) + Nanoflows (client state, UI logic) |
| 04 | [04-product-list-page.md](04-product-list-page.md) | Data Grid 2 — Product List, Filter Bar, Action Buttons, Conditional Formatting |
| 05 | [05-quick-edit-modal.md](05-quick-edit-modal.md) | Popup Page Quick Edit — Form, Validation, Save, Refresh |
| 06 | [06-create-product-modal.md](06-create-product-modal.md) | Popup Page Create New Product — Auto-generated Code, Filter Keep |
| 07 | [07-state-management-patterns.md](07-state-management-patterns.md) | NPE Context Pattern — Filter State, Refresh Strategy, Data Flow |
| 08 | [08-complete-page-structure.md](08-complete-page-structure.md) | Full Page Layout Reference — Widget Tree, Testing Checklist |

## Thứ tự thực hiện

1. **01** → Tạo module `ProductManagement`, tạo tất cả Persistent Entities trước
2. **02** → Tạo Enumerations, thiết lập Associations giữa các entities
3. **03** → Tạo Microflows (server-side) và Nanoflows (client-side)
4. **04** → Tạo Product List Page với Data Grid 2 và Filter Bar
5. **05** → Tạo Quick Edit Popup Modal
6. **06** → Tạo Create New Product Popup Modal
7. **07** → Hiểu sâu về NPE State Management patterns (reference)
8. **08** → Tổng hợp page structure + Testing Checklist

## Prerequisites

- **Mendix Studio Pro v10.24.9** đã cài đặt
- Kiến thức cơ bản về Mendix Domain Model, Pages, Microflows
- Database: PostgreSQL (hoặc H2 cho development)
- Module `ProductManagement` sẽ tạo mới hoàn toàn
