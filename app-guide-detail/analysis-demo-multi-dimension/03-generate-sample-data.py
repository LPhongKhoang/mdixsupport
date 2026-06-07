#!/usr/bin/env python3
"""
Generate Mock Sales Data for OLAP Snowflake Schema
===================================================
Outputs ~20,000 flattened sales transactions in Elasticsearch bulk format
(JSON action line + document line pairs) spanning 2022-2024.

Each document is fully denormalized — all dimension attributes are embedded
so no joins are needed at query time.

Usage:
    python 03-generate-sample-data.py              # generate file only
    python 03-generate-sample-data.py --load       # generate + bulk load to ES

Output file: sales_olap_bulk.json

Requirements: Python 3.8+ standard library only (no pip dependencies)
"""

import json
import random
import sys
import argparse
from datetime import datetime, date, timedelta
from collections import defaultdict

# ---------------------------------------------------------------------------
# Reproducible seed — same seed => same output every run
# ---------------------------------------------------------------------------
random.seed(42)

# ============================================================================
# 1. PRODUCT DIMENSION  (from mock-data.sql — 18 products, 61 variants)
# ============================================================================
# Structure: { category_name: [ (product_name, [(sku, variant_label, price), ...]) ] }
#
# Prices are converted to Vietnamese Dong (VND) with realistic multipliers:
#   Electronics   : USD 50-330  -> VND 1,200,000 - 8,000,000
#   Clothing      : USD 25-95   -> VND 600,000 - 2,400,000
#   Food & Bev    : USD 5-27    -> VND 120,000 - 650,000
#   Home & Garden : USD 30-50   -> VND 750,000 - 1,300,000
#   Sports & Outdoors: USD 25-95 -> VND 600,000 - 2,400,000
#   Books & Media : USD 20-40   -> VND 500,000 - 1,000,000
#   Toys & Games  : USD 35-55   -> VND 900,000 - 1,400,000
#   Health & Beauty: USD 20-50  -> VND 500,000 - 1,300,000

PRODUCTS = {
    "Electronics": [
        ("Wireless Bluetooth Headphones", [
            ("ELEC-001-BLK", "Black",            3600000),
            ("ELEC-001-WHT", "White",            3600000),
            ("ELEC-001-SLV", "Silver",           3800000),
        ]),
        ("Smart Watch Pro", [
            ("ELEC-002-BLK-S", "Black Small",    7200000),
            ("ELEC-002-BLK-L", "Black Large",    7200000),
            ("ELEC-002-GLD-S", "Gold Small",     7900000),
            ("ELEC-002-GLD-L", "Gold Large",     7900000),
        ]),
        ("USB-C Charging Hub", [
            ("ELEC-003-GRY", "Gray",             1200000),
            ("ELEC-003-SLV", "Silver",           1200000),
        ]),
        ("Portable Bluetooth Speaker", [
            ("ELEC-004-BLK", "Black",            1900000),
            ("ELEC-004-BLU", "Blue",             1900000),
            ("ELEC-004-RED", "Red Limited",      2000000),
        ]),
    ],
    "Clothing": [
        ("Classic Cotton T-Shirt", [
            ("CLTH-001-WHT-S", "White S",        600000),
            ("CLTH-001-WHT-M", "White M",        600000),
            ("CLTH-001-WHT-L", "White L",        600000),
            ("CLTH-001-BLK-S", "Black S",        600000),
            ("CLTH-001-BLK-M", "Black M",        600000),
            ("CLTH-001-BLK-L", "Black L",        600000),
            ("CLTH-001-NVY-M", "Navy M",         600000),
            ("CLTH-001-NVY-L", "Navy L",         600000),
        ]),
        ("Slim Fit Denim Jeans", [
            ("CLTH-002-BLU-30", "Blue 30",       1450000),
            ("CLTH-002-BLU-32", "Blue 32",       1450000),
            ("CLTH-002-BLU-34", "Blue 34",       1450000),
            ("CLTH-002-BLK-30", "Black 30",      1550000),
            ("CLTH-002-BLK-32", "Black 32",      1550000),
            ("CLTH-002-BLK-34", "Black 34",      1550000),
        ]),
        ("Running Sneakers", [
            ("CLTH-003-WHT-40", "White 40",      2200000),
            ("CLTH-003-WHT-42", "White 42",      2200000),
            ("CLTH-003-WHT-44", "White 44",      2200000),
            ("CLTH-003-BLK-40", "Black 40",      2200000),
            ("CLTH-003-BLK-42", "Black 42",      2200000),
            ("CLTH-003-RED-42", "Red 42",        2300000),
        ]),
    ],
    "Food & Beverages": [
        ("Organic Green Tea", [
            ("FOOD-001-100", "100 bags",          310000),
            ("FOOD-001-050", "50 bags",           190000),
        ]),
        ("Dark Chocolate Bar", [
            ("FOOD-002-72",    "72% 100g",        120000),
            ("FOOD-002-85",    "85% 100g",        130000),
            ("FOOD-002-72-3PK", "72% 3-pack",     310000),
        ]),
        ("Cold Brew Coffee", [
            ("FOOD-003-ORIG", "Original 12-pack", 600000),
            ("FOOD-003-VNLA", "Vanilla 12-pack",  650000),
        ]),
    ],
    "Home & Garden": [
        ("LED Desk Lamp", [
            ("HOME-001-WHT", "White",             960000),
            ("HOME-001-BLK", "Black",             960000),
        ]),
        ("Indoor Plant Pot Set", [
            ("HOME-002-WHT", "White",             720000),
            ("HOME-002-TER", "Terracotta",        720000),
            ("HOME-002-GRN", "Green",             790000),
        ]),
    ],
    "Sports & Outdoors": [
        ("Yoga Mat", [
            ("SPRT-001-PPR", "Purple",            840000),
            ("SPRT-001-BLU", "Blue",              840000),
            ("SPRT-001-GRN", "Green",             840000),
            ("SPRT-001-PNK", "Pink Premium",      910000),
        ]),
        ("Stainless Steel Water Bottle", [
            ("SPRT-002-SLV",     "Silver 750ml",  600000),
            ("SPRT-002-BLK",     "Black 750ml",   600000),
            ("SPRT-002-BLU",     "Blue 750ml",    600000),
            ("SPRT-002-SLV-1L",  "Silver 1000ml", 720000),
        ]),
    ],
    "Books & Media": [
        ("The Art of Programming", [
            ("BOOK-001-HC",    "Hardcover",       960000),
            ("BOOK-001-PB",    "Paperback",       720000),
            ("BOOK-001-EBOOK", "E-book",          480000),
        ]),
        ("Sony PlayStation 5", [
            ("GAMES-PS5-STD",  "Standard",        9900000),
            ("GAMES-PS5-DIG",  "Digital Edition", 8200000),
        ]),
    ],
    "Toys & Games": [
        ("Strategy Board Game", [
            ("TOYS-001-STD", "Standard",          840000),
            ("TOYS-001-DLX", "Deluxe",            1320000),
        ]),
        ("Nintendo Switch OLED", [
            ("TOYS-002-WHT", "White",             6900000),
            ("TOYS-002-NON", "Neon Blue/Red",     6900000),
        ]),
    ],
    "Health & Beauty": [
        ("Vitamin C Serum", [
            ("HLTH-001-30ML", "30ml",             720000),
            ("HLTH-001-60ML", "60ml",             1200000),
        ]),
        ("SPF 50 Sunscreen Lotion", [
            ("HLTH-002-200", "200ml",             480000),
            ("HLTH-002-400", "400ml Family",      840000),
        ]),
    ],
}

# Flatten into a pick-friendly list: (category, product, sku, variant_label, price)
FLAT_VARIANTS = []
for category, products in PRODUCTS.items():
    for product_name, variants in products:
        for sku, variant_label, price in variants:
            FLAT_VARIANTS.append({
                "category":       category,
                "product_name":   product_name,
                "sku":            sku,
                "variant_label":  variant_label,
                "unit_price":     price,
            })

print(f"Product dimension: {len(PRODUCTS)} categories, "
      f"{sum(len(v) for v in PRODUCTS.values())} products, "
      f"{len(FLAT_VARIANTS)} variants")

# ============================================================================
# 2. CUSTOMER DIMENSION  (60 customers across 4 segments)
# ============================================================================
# Vietnamese names and regional business names for realism.

CUSTOMERS = {
    "B2B": [
        {"customer_id": "CUST-B2B-001", "customer_name": "Vingroup JSC",              "segment": "B2B"},
        {"customer_id": "CUST-B2B-002", "customer_name": "FPT Corporation",           "segment": "B2B"},
        {"customer_id": "CUST-B2B-003", "customer_name": "Viettel Group",             "segment": "B2B"},
        {"customer_id": "CUST-B2B-004", "customer_name": "Vinamilk",                  "segment": "B2B"},
        {"customer_id": "CUST-B2B-005", "customer_name": "Mobile World Investment",   "segment": "B2B"},
        {"customer_id": "CUST-B2B-006", "customer_name": "Masan Group",               "segment": "B2B"},
        {"customer_id": "CUST-B2B-007", "customer_name": "Techcombank",               "segment": "B2B"},
        {"customer_id": "CUST-B2B-008", "customer_name": "Vietcombank",               "segment": "B2B"},
        {"customer_id": "CUST-B2B-009", "customer_name": "Hoa Phat Group",            "segment": "B2B"},
        {"customer_id": "CUST-B2B-010", "customer_name": "Binh Son Refining",         "segment": "B2B"},
        {"customer_id": "CUST-B2B-011", "customer_name": "Novaland Group",            "segment": "B2B"},
        {"customer_id": "CUST-B2B-012", "customer_name": "Sunshine Group",            "segment": "B2B"},
        {"customer_id": "CUST-B2B-013", "customer_name": "TH Group",                  "segment": "B2B"},
        {"customer_id": "CUST-B2B-014", "customer_name": "Tiki Corporation",          "segment": "B2B"},
        {"customer_id": "CUST-B2B-015", "customer_name": "Shopee Vietnam",            "segment": "B2B"},
    ],
    "B2C": [
        {"customer_id": "CUST-B2C-001", "customer_name": "Nguyen Van An",             "segment": "B2C"},
        {"customer_id": "CUST-B2C-002", "customer_name": "Tran Thi Bich",             "segment": "B2C"},
        {"customer_id": "CUST-B2C-003", "customer_name": "Le Hoang Nam",              "segment": "B2C"},
        {"customer_id": "CUST-B2C-004", "customer_name": "Pham Minh Tuan",            "segment": "B2C"},
        {"customer_id": "CUST-B2C-005", "customer_name": "Hoang Thu Ha",              "segment": "B2C"},
        {"customer_id": "CUST-B2C-006", "customer_name": "Vo Thanh Son",              "segment": "B2C"},
        {"customer_id": "CUST-B2C-007", "customer_name": "Dang Quoc Bao",             "segment": "B2C"},
        {"customer_id": "CUST-B2C-008", "customer_name": "Bui Thi Nguyet",            "segment": "B2C"},
        {"customer_id": "CUST-B2C-009", "customer_name": "Do Duc Minh",               "segment": "B2C"},
        {"customer_id": "CUST-B2C-010", "customer_name": "Ngo Hoang Yen",             "segment": "B2C"},
        {"customer_id": "CUST-B2C-011", "customer_name": "Huynh Van Thanh",           "segment": "B2C"},
        {"customer_id": "CUST-B2C-012", "customer_name": "Phan Thi Mai",              "segment": "B2C"},
        {"customer_id": "CUST-B2C-013", "customer_name": "Truong Quoc Huy",           "segment": "B2C"},
        {"customer_id": "CUST-B2C-014", "customer_name": "Ly Thanh Phong",            "segment": "B2C"},
        {"customer_id": "CUST-B2C-015", "customer_name": "Vu Thi Lan Anh",            "segment": "B2C"},
    ],
    "VIP": [
        {"customer_id": "CUST-VIP-001", "customer_name": "CP Group Thailand",         "segment": "VIP"},
        {"customer_id": "CUST-VIP-002", "customer_name": "Sea Group Singapore",       "segment": "VIP"},
        {"customer_id": "CUST-VIP-003", "customer_name": "Grab Holdings",             "segment": "VIP"},
        {"customer_id": "CUST-VIP-004", "customer_name": "AirAsia Group",             "segment": "VIP"},
        {"customer_id": "CUST-VIP-005", "customer_name": "Astra International",       "segment": "VIP"},
        {"customer_id": "CUST-VIP-006", "customer_name": "PTT Global Chemical",       "segment": "VIP"},
        {"customer_id": "CUST-VIP-007", "customer_name": "Siam Cement Group",         "segment": "VIP"},
        {"customer_id": "CUST-VIP-008", "customer_name": "Petronas Malaysia",         "segment": "VIP"},
        {"customer_id": "CUST-VIP-009", "customer_name": "Wilmar International",      "segment": "VIP"},
        {"customer_id": "CUST-VIP-010", "customer_name": "Singtel Group",             "segment": "VIP"},
        {"customer_id": "CUST-VIP-011", "customer_name": "IOI Group Malaysia",        "segment": "VIP"},
        {"customer_id": "CUST-VIP-012", "customer_name": "Charoen Pokphand",          "segment": "VIP"},
        {"customer_id": "CUST-VIP-013", "customer_name": "Genting Berhad",            "segment": "VIP"},
        {"customer_id": "CUST-VIP-014", "customer_name": "DBS Bank Singapore",        "segment": "VIP"},
        {"customer_id": "CUST-VIP-015", "customer_name": "Jardine Matheson",          "segment": "VIP"},
    ],
    "Retail": [
        {"customer_id": "CUST-RET-001", "customer_name": "Nguyen Thi Hoa",            "segment": "Retail"},
        {"customer_id": "CUST-RET-002", "customer_name": "Tran Van Duc",              "segment": "Retail"},
        {"customer_id": "CUST-RET-003", "customer_name": "Le Thi Hong",               "segment": "Retail"},
        {"customer_id": "CUST-RET-004", "customer_name": "Pham Van Kien",             "segment": "Retail"},
        {"customer_id": "CUST-RET-005", "customer_name": "Hoang Thi Lan",             "segment": "Retail"},
        {"customer_id": "CUST-RET-006", "customer_name": "Vo Van Hai",                "segment": "Retail"},
        {"customer_id": "CUST-RET-007", "customer_name": "Dang Thi Phuong",           "segment": "Retail"},
        {"customer_id": "CUST-RET-008", "customer_name": "Bui Van Nghia",             "segment": "Retail"},
        {"customer_id": "CUST-RET-009", "customer_name": "Do Thi Hanh",               "segment": "Retail"},
        {"customer_id": "CUST-RET-010", "customer_name": "Ngo Van Luc",               "segment": "Retail"},
        {"customer_id": "CUST-RET-011", "customer_name": "Huynh Thi Nga",             "segment": "Retail"},
        {"customer_id": "CUST-RET-012", "customer_name": "Phan Van Sinh",             "segment": "Retail"},
        {"customer_id": "CUST-RET-013", "customer_name": "Truong Thi Nguyet",         "segment": "Retail"},
        {"customer_id": "CUST-RET-014", "customer_name": "Ly Van Tien",               "segment": "Retail"},
        {"customer_id": "CUST-RET-015", "customer_name": "Vu Thi Thom",               "segment": "Retail"},
    ],
}

# Flatten for random selection
ALL_CUSTOMERS = []
for segment, customers in CUSTOMERS.items():
    ALL_CUSTOMERS.extend(customers)

print(f"Customer dimension: {len(ALL_CUSTOMERS)} customers across "
      f"{len(CUSTOMERS)} segments")

# ============================================================================
# 3. GEOGRAPHY DIMENSION  (5 countries, ~15 cities, ~30 stores)
# ============================================================================

GEOGRAPHY = {
    "Vietnam": {
        "Ho Chi Minh": ["HCM Downtown Store",    "HCM District 7 Mall"],
        "Ha Noi":      ["Ha Noi Old Quarter Store", "Ha Noi Mall Store"],
        "Da Nang":     ["Da Nang Beach Store",    "Da Nang City Center"],
    },
    "Thailand": {
        "Bangkok":     ["Bangkok Sukhumvit Store", "Bangkok Siam Mall"],
        "Chiang Mai":  ["Chiang Mai Night Bazaar Store", "Chiang Mai Central Mall"],
        "Phuket":      ["Phuket Patong Store",    "Phuket Jungceylon Mall"],
    },
    "Singapore": {
        "Singapore City": ["SG Orchard Store",    "SG Marina Bay Store"],
        "Jurong":         ["SG Jurong East Store", "SG Westgate Mall"],
    },
    "Indonesia": {
        "Jakarta":     ["Jakarta Sudirman Store", "Jakarta Grand Indonesia"],
        "Bali":        ["Bali Kuta Store",        "Bali Seminyak Store"],
        "Surabaya":    ["Surabaya Tunjungan Store", "Surabaya Galaxy Mall"],
    },
    "Malaysia": {
        "Kuala Lumpur": ["KL Pavilion Store",     "KL Mid Valley Mall"],
        "Penang":        ["Penang Gurney Store",   "Penang Queensbay Mall"],
        "Johor Bahru":   ["JB City Square Store",  "JB Paradigm Mall"],
    },
}

# Flatten: list of (country, city, store)
FLAT_GEO = []
for country, cities in GEOGRAPHY.items():
    for city, stores in cities.items():
        for store in stores:
            FLAT_GEO.append({
                "country": country,
                "city":    city,
                "store":   store,
            })

# Count totals
geo_cities = set()
for country, cities in GEOGRAPHY.items():
    for city in cities:
        geo_cities.add((country, city))

print(f"Geography dimension: {len(GEOGRAPHY)} countries, "
      f"{len(geo_cities)} cities, {len(FLAT_GEO)} stores")

# ============================================================================
# 4. HELPER FUNCTIONS
# ============================================================================

MONTH_NAMES = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
]

DAY_NAMES = [
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
]


def compute_time_fields(sale_date):
    """Derive denormalized time dimension fields from a date object."""
    return {
        "date":         sale_date.isoformat(),              # "2023-07-15"
        "year":         sale_date.year,                     # 2023
        "quarter":      (sale_date.month - 1) // 3 + 1,    # 3
        "month":        sale_date.month,                    # 7
        "month_name":   MONTH_NAMES[sale_date.month],       # "July"
        "day":          sale_date.day,                      # 15
        "day_of_week":  DAY_NAMES[sale_date.weekday()],     # "Saturday"
        "is_weekend":   sale_date.weekday() >= 5,           # True
    }


def generate_random_date(start_year, end_year):
    """
    Generate a random date within [start_year-01-01, end_year-12-31].
    Applies seasonal weighting: Q4 gets ~40% more transactions, Q1 gets ~30% fewer.
    """
    start = date(start_year, 1, 1)
    end = date(end_year, 12, 31)
    total_days = (end - start).days

    # Use rejection sampling for seasonal bias
    # Q4 (Oct-Dec): weight 1.4, Q1 (Jan-Mar): weight 0.7, others: 1.0
    while True:
        random_day = random.randint(0, total_days)
        candidate = start + timedelta(days=random_day)
        quarter = (candidate.month - 1) // 3 + 1
        if quarter == 4:
            weight = 1.4   # Holiday season boost
        elif quarter == 1:
            weight = 0.7   # Post-holiday slump
        else:
            weight = 1.0
        if random.random() < weight:
            return candidate


def pick_quantity(segment):
    """
    Pick a realistic quantity based on customer segment.
    B2B: higher volumes (10-50), Retail: smaller (1-5), B2C/VIP: moderate.
    """
    if segment == "B2B":
        return random.randint(10, 50)
    elif segment == "Retail":
        return random.randint(1, 5)
    elif segment == "VIP":
        return random.randint(5, 30)
    else:  # B2C
        return random.randint(1, 10)


def compute_discount(quantity, unit_price, segment):
    """
    Compute discount amount in VND.
    - Base: 0-15% of (quantity x unit_price)
    - VIP gets 1.5x the discount rate
    - B2B gets 1.2x the discount rate
    """
    base_rate = random.uniform(0.0, 0.15)
    if segment == "VIP":
        base_rate = min(base_rate * 1.5, 0.20)   # VIP gets up to 20%
    elif segment == "B2B":
        base_rate = min(base_rate * 1.2, 0.18)   # B2B gets up to 18%
    discount = int(quantity * unit_price * base_rate)
    # Round to nearest 1,000 VND for clean numbers
    return (discount // 1000) * 1000


def build_order_number_map(transactions):
    """
    Group transactions by year, then assign sequential order numbers per year.
    Returns a dict: transaction_index -> order_number string.
    """
    by_year = defaultdict(list)
    for idx, tx in enumerate(transactions):
        by_year[tx["year"]].append(idx)

    order_map = {}
    for year in sorted(by_year.keys()):
        indices = by_year[year]
        # Shuffle within year for realism (orders interleave)
        shuffled = list(indices)
        random.shuffle(shuffled)
        for seq, idx in enumerate(shuffled, start=1):
            order_map[idx] = f"ORD-{year}-{seq:05d}"
    return order_map


# ============================================================================
# 5. MAIN GENERATION LOGIC
# ============================================================================

def generate_transactions(num_transactions=20000):
    """
    Generate the full set of flattened sales transactions.

    Each transaction contains:
      - Sale ID
      - Time dimension (denormalized)
      - Product dimension (category, product, variant, SKU)
      - Customer dimension (name, segment)
      - Geography dimension (country, city, store)
      - Fact measures (quantity, unit_price, discount, total)
      - Order number
    """
    print(f"\nGenerating {num_transactions:,} transactions "
          f"spanning 2022-2024...")

    transactions_raw = []

    for i in range(num_transactions):
        # --- Pick dimensions (weighted random) ---
        variant = random.choice(FLAT_VARIANTS)
        customer = random.choice(ALL_CUSTOMERS)
        geo = random.choice(FLAT_GEO)
        sale_date = generate_random_date(2022, 2024)

        # --- Compute measures ---
        quantity = pick_quantity(customer["segment"])
        unit_price = variant["unit_price"]
        discount_amount = compute_discount(quantity, unit_price, customer["segment"])
        gross_amount = quantity * unit_price
        total_amount = gross_amount - discount_amount

        # --- Time fields ---
        time_fields = compute_time_fields(sale_date)

        # --- Assemble flat document ---
        doc = {
            # Sale identifiers
            "sale_id": f"S{i+1:05d}",

            # Time dimension (denormalized)
            **time_fields,

            # Product dimension (denormalized)
            "category":       variant["category"],
            "product_name":   variant["product_name"],
            "variant_label":  variant["variant_label"],
            "sku":            variant["sku"],

            # Customer dimension (denormalized)
            "customer_id":    customer["customer_id"],
            "customer_name":  customer["customer_name"],
            "segment":        customer["segment"],

            # Geography dimension (denormalized)
            "country":        geo["country"],
            "city":           geo["city"],
            "store":          geo["store"],

            # Fact measures
            "quantity":        quantity,
            "unit_price":      unit_price,
            "gross_amount":    gross_amount,
            "discount_amount": discount_amount,
            "total_amount":    total_amount,
        }

        transactions_raw.append(doc)

        # Progress indicator every 5,000 records
        if (i + 1) % 5000 == 0:
            print(f"  ... {i+1:,} / {num_transactions:,} generated")

    # --- Assign order numbers (sequential per year) ---
    print("  Assigning order numbers per year...")
    order_map = build_order_number_map(transactions_raw)
    for idx, tx in enumerate(transactions_raw):
        tx["order_number"] = order_map[idx]

    return transactions_raw


def write_bulk_file(transactions, output_path="sales_olap_bulk.json"):
    """
    Write transactions in Elasticsearch bulk format.
    Each record is two lines:
      1. Action line: {"index": {"_index": "sales_olap", "_id": "S00001"}}
      2. Document line: {"sale_id": "S00001", ...}
    """
    print(f"\nWriting ES bulk file: {output_path}")
    with open(output_path, "w", encoding="utf-8") as f:
        for tx in transactions:
            # Action line
            action = {"index": {"_index": "sales_olap", "_id": tx["sale_id"]}}
            f.write(json.dumps(action, ensure_ascii=False) + "\n")
            # Document line
            f.write(json.dumps(tx, ensure_ascii=False) + "\n")

    # Report file size
    import os
    size_mb = os.path.getsize(output_path) / (1024 * 1024)
    print(f"  Written {len(transactions):,} records ({len(transactions)*2:,} lines)")
    print(f"  File size: {size_mb:.1f} MB")


def load_to_elasticsearch(bulk_file, es_host="http://localhost:9200"):
    """
    Bulk load the generated file into Elasticsearch using urllib.
    Uses the _bulk API endpoint.
    """
    from urllib.request import Request, urlopen
    from urllib.error import URLError, HTTPError

    bulk_url = f"{es_host}/_bulk"
    print(f"\nLoading data into Elasticsearch at {bulk_url}...")

    # Read the bulk file
    with open(bulk_file, "r", encoding="utf-8") as f:
        bulk_data = f.read()

    # Create the index first (with basic mapping) if it doesn't exist
    index_url = f"{es_host}/sales_olap"
    try:
        req = Request(index_url, method="HEAD")
        response = urlopen(req, timeout=5)
        print(f"  Index 'sales_olap' already exists.")
    except HTTPError as e:
        if e.code == 404:
            # Index does not exist — create with mapping
            mapping = {
                "mappings": {
                    "properties": {
                        "sale_id":         {"type": "keyword"},
                        "order_number":    {"type": "keyword"},
                        "date":            {"type": "date", "format": "yyyy-MM-dd"},
                        "year":            {"type": "integer"},
                        "quarter":         {"type": "integer"},
                        "month":           {"type": "integer"},
                        "month_name":      {"type": "keyword"},
                        "day":             {"type": "integer"},
                        "day_of_week":     {"type": "keyword"},
                        "is_weekend":      {"type": "boolean"},
                        "category":        {"type": "keyword"},
                        "product_name":    {"type": "keyword"},
                        "variant_label":   {"type": "keyword"},
                        "sku":             {"type": "keyword"},
                        "customer_id":     {"type": "keyword"},
                        "customer_name":   {"type": "keyword"},
                        "segment":         {"type": "keyword"},
                        "country":         {"type": "keyword"},
                        "city":            {"type": "keyword"},
                        "store":           {"type": "keyword"},
                        "quantity":        {"type": "integer"},
                        "unit_price":      {"type": "long"},
                        "gross_amount":    {"type": "long"},
                        "discount_amount": {"type": "long"},
                        "total_amount":    {"type": "long"},
                    }
                }
            }
            create_req = Request(
                index_url,
                data=json.dumps(mapping).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="PUT"
            )
            urlopen(create_req, timeout=10)
            print(f"  Created index 'sales_olap' with explicit mapping.")
        else:
            raise
    except URLError:
        print(f"  ERROR: Cannot connect to Elasticsearch at {es_host}")
        print(f"  Make sure ES is running and accessible.")
        sys.exit(1)

    # Bulk load
    req = Request(
        bulk_url,
        data=bulk_data.encode("utf-8"),
        headers={"Content-Type": "application/x-ndjson"},
        method="POST"
    )
    try:
        response = urlopen(req, timeout=120)
        result = json.loads(response.read().decode("utf-8"))
        if result.get("errors"):
            # Count failures
            failures = [item for item in result["items"]
                        if item["index"]["status"] >= 400]
            print(f"  WARNING: {len(failures)} indexing failures!")
            for fail in failures[:5]:
                print(f"    {fail['index']['_id']}: {fail['index']['error']}")
        else:
            print(f"  Successfully loaded all {len(transactions):,} records.")
    except HTTPError as e:
        print(f"  ERROR: ES returned {e.code}: {e.read().decode('utf-8')[:500]}")
        sys.exit(1)


def print_stats(transactions):
    """Print summary statistics about the generated dataset."""
    print("\n" + "=" * 70)
    print("GENERATION SUMMARY")
    print("=" * 70)

    # --- Basic stats ---
    print(f"\n  Total records:     {len(transactions):,}")
    dates = [tx["date"] for tx in transactions]
    print(f"  Date range:        {min(dates)} to {max(dates)}")

    # --- Revenue ---
    total_revenue = sum(tx["total_amount"] for tx in transactions)
    total_gross = sum(tx["gross_amount"] for tx in transactions)
    total_discount = sum(tx["discount_amount"] for tx in transactions)
    avg_order = total_revenue / len(transactions)
    print(f"\n  Revenue Stats (VND):")
    print(f"    Total Revenue:   {total_revenue:>20,} VND")
    print(f"    Total Gross:     {total_gross:>20,} VND")
    print(f"    Total Discount:  {total_discount:>20,} VND")
    print(f"    Avg Order Value: {avg_order:>20,.0f} VND")

    # --- By year ---
    print(f"\n  By Year:")
    by_year = defaultdict(lambda: {"count": 0, "revenue": 0})
    for tx in transactions:
        y = tx["year"]
        by_year[y]["count"] += 1
        by_year[y]["revenue"] += tx["total_amount"]
    for year in sorted(by_year):
        d = by_year[year]
        print(f"    {year}: {d['count']:>6,} transactions  "
              f"|  {d['revenue']:>15,} VND")

    # --- By segment ---
    print(f"\n  By Segment:")
    by_segment = defaultdict(lambda: {"count": 0, "revenue": 0})
    for tx in transactions:
        s = tx["segment"]
        by_segment[s]["count"] += 1
        by_segment[s]["revenue"] += tx["total_amount"]
    for seg in ["B2B", "B2C", "VIP", "Retail"]:
        d = by_segment[seg]
        print(f"    {seg:<8}: {d['count']:>6,} transactions  "
              f"|  {d['revenue']:>15,} VND")

    # --- By category ---
    print(f"\n  By Category:")
    by_cat = defaultdict(lambda: {"count": 0, "revenue": 0})
    for tx in transactions:
        c = tx["category"]
        by_cat[c]["count"] += 1
        by_cat[c]["revenue"] += tx["total_amount"]
    for cat in sorted(by_cat, key=lambda x: by_cat[x]["revenue"], reverse=True):
        d = by_cat[cat]
        print(f"    {cat:<22}: {d['count']:>5,} tx  "
              f"|  {d['revenue']:>15,} VND")

    # --- By country ---
    print(f"\n  By Country:")
    by_country = defaultdict(lambda: {"count": 0, "revenue": 0})
    for tx in transactions:
        c = tx["country"]
        by_country[c]["count"] += 1
        by_country[c]["revenue"] += tx["total_amount"]
    for country in sorted(by_country, key=lambda x: by_country[x]["revenue"],
                          reverse=True):
        d = by_country[country]
        print(f"    {country:<14}: {d['count']:>5,} tx  "
              f"|  {d['revenue']:>15,} VND")

    # --- By quarter (seasonal check) ---
    print(f"\n  By Quarter (seasonal distribution):")
    by_q = defaultdict(int)
    for tx in transactions:
        by_q[tx["quarter"]] += 1
    for q in [1, 2, 3, 4]:
        pct = by_q[q] / len(transactions) * 100
        bar = "#" * int(pct / 2)
        print(f"    Q{q}: {by_q[q]:>6,} ({pct:5.1f}%) {bar}")

    print("\n" + "=" * 70)


# ============================================================================
# 6. ENTRY POINT
# ============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Generate mock OLAP sales data in ES bulk format"
    )
    parser.add_argument(
        "--load",
        action="store_true",
        help="Auto-load generated data into Elasticsearch via HTTP"
    )
    parser.add_argument(
        "--host",
        default="http://localhost:9200",
        help="Elasticsearch host URL (default: http://localhost:9200)"
    )
    parser.add_argument(
        "--count",
        type=int,
        default=20000,
        help="Number of transactions to generate (default: 20000)"
    )
    parser.add_argument(
        "--output",
        default="sales_olap_bulk.json",
        help="Output file path (default: sales_olap_bulk.json)"
    )
    args = parser.parse_args()

    # Generate
    transactions = generate_transactions(num_transactions=args.count)

    # Write bulk file
    write_bulk_file(transactions, output_path=args.output)

    # Print stats
    print_stats(transactions)

    # Optionally load into ES
    if args.load:
        load_to_elasticsearch(args.output, es_host=args.host)
    else:
        print(f"\nTip: Use --load flag to auto-load into Elasticsearch")
        print(f"     Example: python {sys.argv[0]} --load --host http://localhost:9200")

    print("\nDone!")


if __name__ == "__main__":
    main()
