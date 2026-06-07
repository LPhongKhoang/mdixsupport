#!/usr/bin/env python3
"""
generate_snowflake_data.py
==========================
Generates mock Snowflake Schema sales data and bulk-indexes into Elasticsearch.

Usage:
    pip install requests faker
    python generate_snowflake_data.py --es-host localhost:9200 --count 5000

The script:
  1. Seeds dimension tables (categories, products, variants, customers, regions)
  2. Generates fact_sales records (denormalized flat docs) based on the DDL schema
  3. Bulk-indexes all data into Elasticsearch
  4. Also saves JSON files locally for inspection
"""

import json
import random
import argparse
import uuid
import os
from datetime import datetime, timedelta, date
from typing import List, Dict, Any

try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False
    print("WARNING: 'requests' not installed. Data will be saved to files only.")
    print("Install with: pip install requests")

# ─────────────────────────────────────────────
# SEED DATA – DIMENSIONS
# ─────────────────────────────────────────────

CATEGORIES = [
    {"id": "CAT001", "name": "Electronics",    "icon": "laptop"},
    {"id": "CAT002", "name": "Clothing",       "icon": "shirt"},
    {"id": "CAT003", "name": "Home & Garden",  "icon": "home"},
    {"id": "CAT004", "name": "Sports",         "icon": "football"},
    {"id": "CAT005", "name": "Books",          "icon": "book"},
    {"id": "CAT006", "name": "Beauty",         "icon": "sparkles"},
]

PRODUCTS_BY_CATEGORY = {
    "CAT001": [
        {"code": "ELEC001", "name": "Wireless Headphones Pro",  "base_price": 1200000},
        {"code": "ELEC002", "name": "Smart Watch Series X",     "base_price": 3500000},
        {"code": "ELEC003", "name": "Bluetooth Speaker Mini",   "base_price": 650000},
        {"code": "ELEC004", "name": "USB-C Hub 7-Port",         "base_price": 450000},
        {"code": "ELEC005", "name": "Mechanical Keyboard RGB",  "base_price": 1800000},
    ],
    "CAT002": [
        {"code": "CLO001", "name": "Premium Cotton T-Shirt",    "base_price": 320000},
        {"code": "CLO002", "name": "Slim Fit Jeans",            "base_price": 750000},
        {"code": "CLO003", "name": "Winter Down Jacket",        "base_price": 1900000},
        {"code": "CLO004", "name": "Running Shoes Air",         "base_price": 1250000},
        {"code": "CLO005", "name": "Sports Hoodie Flex",        "base_price": 580000},
    ],
    "CAT003": [
        {"code": "HG001", "name": "Ceramic Plant Pot Set",      "base_price": 280000},
        {"code": "HG002", "name": "LED Desk Lamp Adjustable",   "base_price": 420000},
        {"code": "HG003", "name": "Bamboo Kitchen Organizer",   "base_price": 195000},
        {"code": "HG004", "name": "Stainless Steel Cookware Set","base_price": 1650000},
    ],
    "CAT004": [
        {"code": "SP001", "name": "Yoga Mat Premium 6mm",       "base_price": 380000},
        {"code": "SP002", "name": "Resistance Band Set",        "base_price": 220000},
        {"code": "SP003", "name": "Water Bottle Insulated 1L",  "base_price": 310000},
        {"code": "SP004", "name": "Jump Rope Speed Pro",        "base_price": 145000},
    ],
    "CAT005": [
        {"code": "BK001", "name": "Clean Code (Robert Martin)", "base_price": 210000},
        {"code": "BK002", "name": "Design Patterns GoF",        "base_price": 280000},
        {"code": "BK003", "name": "The Pragmatic Programmer",   "base_price": 235000},
    ],
    "CAT006": [
        {"code": "BE001", "name": "Vitamin C Serum 30ml",       "base_price": 450000},
        {"code": "BE002", "name": "Hyaluronic Acid Moisturizer","base_price": 380000},
        {"code": "BE003", "name": "SPF 50 Sunscreen Gel",       "base_price": 175000},
    ],
}

COLORS  = ["Black", "White", "Navy", "Red", "Green", "Grey", "Beige", "Blue", "Pink", "Yellow"]
SIZES   = ["XS", "S", "M", "L", "XL", "XXL", "One Size"]
REGIONS = {
    "North":      ["Hanoi", "Hai Phong", "Nam Dinh", "Thai Nguyen", "Bac Ninh"],
    "Central":    ["Da Nang", "Hue", "Quang Nam", "Quang Ngai", "Binh Dinh"],
    "South":      ["Ho Chi Minh City", "Binh Duong", "Dong Nai", "Can Tho", "Long An"],
    "Highland":   ["Da Lat", "Buon Ma Thuot", "Gia Lai", "Kon Tum"],
    "Northeast":  ["Quang Ninh", "Lang Son", "Cao Bang", "Ha Giang"],
}
SEGMENTS = ["Retail", "Wholesale", "VIP", "Online", "Corporate"]
CUSTOMER_NAMES = [
    "Nguyen Van An", "Tran Thi Bich", "Le Hoang Nam", "Pham Minh Duc",
    "Hoang Thu Ha", "Vo Thanh Long", "Dang Quoc Viet", "Bui Thi Mai",
    "Do Van Hung", "Nguyen Thi Lan", "Tran Van Khanh", "Le Thi Thu",
    "Pham Van Cuong", "Hoang Minh Tuan", "Vu Thi Hoa", "Ngo Van Binh",
    "Dinh Thi Phuong", "Trinh Van Son", "Luu Thi Ngoc", "Cao Van Dat",
    "Ly Thi Kim Anh", "Phan Van Thanh", "Truong Thi Yen", "Ha Van Long",
    "Duong Minh Hieu", "To Thi Thuy", "Nguyen Bao Chau", "Tran Duc Manh",
    "Le Van Quyen", "Pham Thi Dieu", "Hoang Van Loc", "Vo Thi Quynh",
    "Dang Van Nghia", "Bui Minh Quan", "Do Thi Linh", "Nguyen Van Thanh",
    "Tran Thi Hue", "Le Minh Khoa", "Pham Thi Huong", "Hoang Van Phuc",
]

# ─────────────────────────────────────────────
# BUILDER FUNCTIONS
# ─────────────────────────────────────────────

def build_products() -> List[Dict]:
    """Build product + variant dimension docs."""
    products = []
    for cat_id, prods in PRODUCTS_BY_CATEGORY.items():
        cat = next(c for c in CATEGORIES if c["id"] == cat_id)
        for p in prods:
            prod_id = str(uuid.uuid4())[:8].upper()
            variants = []
            # Generate 2–4 variants per product
            num_variants = random.randint(2, 4)
            cat_colors = random.sample(COLORS, min(num_variants, len(COLORS)))
            for i, color in enumerate(cat_colors):
                size = random.choice(SIZES)
                price_multiplier = random.uniform(0.9, 1.25)
                variants.append({
                    "variant_id": f"VAR-{prod_id}-{i+1:02d}",
                    "sku": f"{p['code']}-{color[:3].upper()}-{size}",
                    "color": color,
                    "size": size,
                    "price": round(p["base_price"] * price_multiplier, 0),
                })
            products.append({
                "product_id":    prod_id,
                "product_code":  p["code"],
                "product_name":  p["name"],
                "base_price":    p["base_price"],
                "category_id":   cat_id,
                "category_name": cat["name"],
                "is_active":     True,
                "description":   f"High-quality {p['name']} from {cat['name']} category.",
                "variants":      variants,
            })
    return products


def build_customers(n: int = 80) -> List[Dict]:
    """Build customer dimension docs."""
    customers = []
    names_pool = CUSTOMER_NAMES * (n // len(CUSTOMER_NAMES) + 1)
    for i in range(n):
        region = random.choice(list(REGIONS.keys()))
        city   = random.choice(REGIONS[region])
        name   = names_pool[i]
        cid    = f"CUS{i+1:04d}"
        customers.append({
            "customer_id":       cid,
            "customer_name":     name,
            "customer_segment":  random.choice(SEGMENTS),
            "email":             f"{cid.lower()}@example.vn",
            "phone":             f"09{random.randint(10000000,99999999)}",
            "city":              city,
            "region_name":       region,
            "country":           "Vietnam",
            "registration_date": (date(2022, 1, 1) + timedelta(days=random.randint(0, 700))).isoformat(),
        })
    return customers


def build_date_range(start: date, end: date) -> List[Dict]:
    """Build date dimension docs."""
    dates = []
    current = start
    day_names = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]
    month_names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
    while current <= end:
        dow = current.weekday()
        dates.append({
            "date_id":      current.isoformat(),
            "full_date":    current.isoformat(),
            "year":         current.year,
            "quarter":      f"Q{(current.month - 1) // 3 + 1}",
            "month":        current.month,
            "month_name":   month_names[current.month - 1],
            "week":         current.isocalendar()[1],
            "day_of_month": current.day,
            "day_of_week":  day_names[dow],
            "is_weekend":   dow >= 5,
        })
        current += timedelta(days=1)
    return dates


def generate_fact_sales(products: List[Dict], customers: List[Dict], n: int) -> List[Dict]:
    """Generate denormalized sales_fact records."""
    facts = []
    start_date = date(2023, 1, 1)
    end_date   = date(2024, 12, 31)
    date_range = (end_date - start_date).days

    for i in range(n):
        prod     = random.choice(products)
        variant  = random.choice(prod["variants"])
        customer = random.choice(customers)
        order_dt = start_date + timedelta(days=random.randint(0, date_range))

        qty          = random.randint(1, 20)
        unit_price   = variant["price"]
        discount_pct = random.choices([0, 0.05, 0.10, 0.15, 0.20], weights=[40, 25, 20, 10, 5])[0]
        net_amount   = round(qty * unit_price * (1 - discount_pct), 2)
        cost_ratio   = random.uniform(0.50, 0.70)   # COGS 50–70% of unit_price
        cost_amount  = round(qty * unit_price * cost_ratio, 2)
        gross_profit = round(net_amount - cost_amount, 2)
        gm_pct       = round(gross_profit / net_amount * 100, 2) if net_amount > 0 else 0

        quarter      = f"Q{(order_dt.month - 1) // 3 + 1}"
        month_names  = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
        day_names    = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]

        facts.append({
            "fact_sales_id":     f"SALE-{i+1:06d}",
            "order_date":        order_dt.isoformat(),
            "order_year":        order_dt.year,
            "order_quarter":     quarter,
            "order_month":       month_names[order_dt.month - 1],
            "order_week":        order_dt.isocalendar()[1],
            "day_of_week":       day_names[order_dt.weekday()],

            "quantity":          qty,
            "unit_price":        unit_price,
            "discount_pct":      discount_pct,
            "net_amount":        net_amount,
            "cost_amount":       cost_amount,
            "gross_profit":      gross_profit,
            "gross_margin_pct":  gm_pct,

            "product_id":        prod["product_id"],
            "product_name":      prod["product_name"],
            "product_code":      prod["product_code"],
            "product_base_price": prod["base_price"],

            "variant_id":        variant["variant_id"],
            "sku":               variant["sku"],
            "color":             variant["color"],
            "size":              variant["size"],

            "category_id":       prod["category_id"],
            "category_name":     prod["category_name"],

            "customer_id":       customer["customer_id"],
            "customer_name":     customer["customer_name"],
            "customer_segment":  customer["customer_segment"],

            "city":              customer["city"],
            "region_name":       customer["region_name"],
            "country":           customer["country"],
        })
    return facts


# ─────────────────────────────────────────────
# ELASTICSEARCH BULK INDEX
# ─────────────────────────────────────────────

def to_bulk_body(index_name: str, docs: List[Dict], id_field: str) -> str:
    """Convert docs list to Elasticsearch bulk NDJSON format."""
    lines = []
    for doc in docs:
        action = {"index": {"_index": index_name, "_id": doc.get(id_field, str(uuid.uuid4()))}}
        lines.append(json.dumps(action))
        lines.append(json.dumps(doc))
    return "\n".join(lines) + "\n"


def bulk_index(es_host: str, index_name: str, docs: List[Dict], id_field: str, batch_size: int = 500):
    """Bulk index docs into Elasticsearch in batches."""
    if not HAS_REQUESTS:
        return
    total = len(docs)
    indexed = 0
    for start in range(0, total, batch_size):
        batch = docs[start:start + batch_size]
        body  = to_bulk_body(index_name, batch, id_field)
        resp  = requests.post(
            f"http://{es_host}/_bulk",
            headers={"Content-Type": "application/x-ndjson"},
            data=body,
            timeout=30,
        )
        if resp.status_code not in (200, 201):
            print(f"  ERROR [{index_name}] batch {start}: {resp.text[:200]}")
        else:
            result = resp.json()
            if result.get("errors"):
                error_items = [i for i in result["items"] if "error" in list(i.values())[0]]
                print(f"  WARN [{index_name}] {len(error_items)} docs had errors")
        indexed += len(batch)
        print(f"  [{index_name}] Indexed {indexed}/{total}")


def save_bulk_file(output_dir: str, index_name: str, docs: List[Dict], id_field: str):
    """Save bulk NDJSON to file."""
    os.makedirs(output_dir, exist_ok=True)
    filepath = os.path.join(output_dir, f"bulk_{index_name}.ndjson")
    body = to_bulk_body(index_name, docs, id_field)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(body)
    print(f"  Saved {len(docs)} docs → {filepath}")


# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Generate Snowflake Schema data for Elasticsearch")
    parser.add_argument("--es-host",    default="localhost:9200", help="ES host:port")
    parser.add_argument("--count",      type=int, default=3000,   help="Number of sales_fact records")
    parser.add_argument("--customers",  type=int, default=80,     help="Number of customers")
    parser.add_argument("--output-dir", default="./bulk-data",    help="Output directory for NDJSON files")
    parser.add_argument("--no-index",   action="store_true",      help="Only save files, don't index to ES")
    args = parser.parse_args()

    print("=" * 60)
    print("SNOWFLAKE SCHEMA DATA GENERATOR")
    print(f"  ES Host    : {args.es_host}")
    print(f"  Fact rows  : {args.count}")
    print(f"  Customers  : {args.customers}")
    print("=" * 60)

    # 1. Build dimensions
    print("\n[1/4] Building product dimension...")
    products = build_products()
    print(f"  → {len(products)} products, {sum(len(p['variants']) for p in products)} variants")

    print("[2/4] Building customer dimension...")
    customers = build_customers(args.customers)
    print(f"  → {len(customers)} customers")

    print("[3/4] Building date dimension...")
    dates = build_date_range(date(2023, 1, 1), date(2024, 12, 31))
    print(f"  → {len(dates)} date records")

    print("[4/4] Generating sales facts...")
    facts = generate_fact_sales(products, customers, args.count)
    print(f"  → {len(facts)} fact records")

    # 2. Save files
    print("\n[Saving bulk NDJSON files]")
    save_bulk_file(args.output_dir, "dim_product",  products,  "product_id")
    save_bulk_file(args.output_dir, "dim_customer", customers, "customer_id")
    save_bulk_file(args.output_dir, "dim_date",     dates,     "date_id")
    save_bulk_file(args.output_dir, "sales_fact",   facts,     "fact_sales_id")

    # Save summary JSON for inspection
    summary = {
        "generated_at": datetime.now().isoformat(),
        "counts": {
            "products": len(products),
            "customers": len(customers),
            "dates": len(dates),
            "facts": len(facts),
        },
        "sample_fact": facts[0],
        "sample_product": products[0],
    }
    with open(os.path.join(args.output_dir, "summary.json"), "w") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)
    print(f"  Saved summary → {args.output_dir}/summary.json")

    # 3. Index to ES
    if not args.no_index:
        if not HAS_REQUESTS:
            print("\nSkipping ES indexing (requests not installed).")
            print("Manual index: curl -X POST 'http://<ES_HOST>/_bulk' -H 'Content-Type: application/x-ndjson' --data-binary @bulk-data/bulk_sales_fact.ndjson")
        else:
            print(f"\n[Indexing to Elasticsearch @ {args.es_host}]")
            bulk_index(args.es_host, "dim_product",  products,  "product_id")
            bulk_index(args.es_host, "dim_customer", customers, "customer_id")
            bulk_index(args.es_host, "dim_date",     dates,     "date_id")
            bulk_index(args.es_host, "sales_fact",   facts,     "fact_sales_id")
            print("\n✅ Done! All data indexed.")
    else:
        print("\n✅ Done! Files saved (skipped ES indexing). Use curl to index manually:")
        print(f"   curl -X POST 'http://{args.es_host}/_bulk' \\")
        print(f"        -H 'Content-Type: application/x-ndjson' \\")
        print(f"        --data-binary @{args.output_dir}/bulk_sales_fact.ndjson")

    # 4. Print useful stats
    total_revenue = sum(f["net_amount"] for f in facts)
    total_profit  = sum(f["gross_profit"] for f in facts)
    print(f"\n📊 Data Summary:")
    print(f"   Total Revenue   : {total_revenue:,.0f} VND")
    print(f"   Total Profit    : {total_profit:,.0f} VND")
    print(f"   Avg Margin      : {total_profit/total_revenue*100:.1f}%")
    print(f"   Date Range      : 2023-01-01 → 2024-12-31")


if __name__ == "__main__":
    main()
