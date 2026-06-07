-- ============================================================================
-- Mock Data for Product Catalog Module (Mendix 10.24.9)
-- Database: PostgreSQL
-- Generated: 2026-06-07
-- ID range starts from: 2970324836987565
-- ============================================================================

-- ============================================================================
-- 1. Category (productcatalogmodule$category)
-- ============================================================================
INSERT INTO productcatalogmodule$category
    (id, name, description, iconurl, sortorder, isactive)
VALUES
    (2970324836987565, 'Electronics',       'Electronic devices and gadgets',                       '/icons/electronics.png',    1, true),
    (2970324836987566, 'Clothing',           'Apparel and fashion accessories',                      '/icons/clothing.png',       2, true),
    (2970324836987567, 'Food & Beverages',   'Food items, snacks, and drinks',                       '/icons/food.png',           3, true),
    (2970324836987568, 'Home & Garden',      'Home improvement and garden supplies',                 '/icons/home.png',           4, true),
    (2970324836987569, 'Sports & Outdoors',  'Sports equipment and outdoor gear',                    '/icons/sports.png',         5, true),
    (2970324836987570, 'Books & Media',      'Books, music, movies and digital media',               '/icons/books.png',          6, true),
    (2970324836987571, 'Toys & Games',       'Toys, board games and video games',                    '/icons/toys.png',           7, true),
    (2970324836987572, 'Health & Beauty',    'Personal care, cosmetics and health products',         '/icons/health.png',         8, true);

-- ============================================================================
-- 2. Product (productcatalogmodule$product)
-- ============================================================================
INSERT INTO productcatalogmodule$product
    (id, name, code, description, baseprice, createddateat, isactive, productcatalogmodule$product_category)
VALUES
    -- Electronics
    (2970324836987573, 'Wireless Bluetooth Headphones',  'ELEC-001', 'Premium noise-cancelling over-ear headphones with 30h battery life',            149.99000000,  '2026-01-15 08:30:00', true, 2970324836987565),
    (2970324836987574, 'Smart Watch Pro',                'ELEC-002', 'Advanced fitness tracking smartwatch with AMOLED display',                       299.99000000,  '2026-01-20 10:00:00', true, 2970324836987565),
    (2970324836987575, 'USB-C Charging Hub',             'ELEC-003', '7-in-1 USB-C hub with HDMI, USB 3.0 and SD card reader',                        49.99000000,   '2026-02-01 09:15:00', true, 2970324836987565),
    (2970324836987576, 'Portable Bluetooth Speaker',     'ELEC-004', 'Waterproof portable speaker with 360-degree sound',                             79.99000000,   '2026-02-10 14:00:00', true, 2970324836987565),

    -- Clothing
    (2970324836987577, 'Classic Cotton T-Shirt',        'CLTH-001', '100% organic cotton crew-neck t-shirt for everyday comfort',                     24.99000000,   '2026-01-18 11:00:00', true, 2970324836987566),
    (2970324836987578, 'Slim Fit Denim Jeans',           'CLTH-002', 'Modern slim-fit jeans made from premium stretch denim',                          59.99000000,   '2026-01-25 13:30:00', true, 2970324836987566),
    (2970324836987579, 'Running Sneakers',               'CLTH-003', 'Lightweight breathable running shoes with cushioned sole',                       89.99000000,   '2026-02-05 16:45:00', true, 2970324836987566),

    -- Food & Beverages
    (2970324836987580, 'Organic Green Tea',              'FOOD-001', 'Premium Japanese matcha green tea, 100 bags per box',                            12.99000000,   '2026-01-22 07:00:00', true, 2970324836987567),
    (2970324836987581, 'Dark Chocolate Bar',             'FOOD-002', '72% cacao Belgian dark chocolate bar, 100g',                                     4.99000000,    '2026-02-03 08:20:00', true, 2970324836987567),
    (2970324836987582, 'Cold Brew Coffee 12-Pack',       'FOOD-003', 'Ready-to-drink cold brew coffee, 12 cans x 250ml',                               24.99000000,   '2026-02-08 09:00:00', true, 2970324836987567),

    -- Home & Garden
    (2970324836987583, 'LED Desk Lamp',                  'HOME-001', 'Adjustable LED desk lamp with touch dimmer and USB charging port',               39.99000000,   '2026-01-28 10:30:00', true, 2970324836987568),
    (2970324836987584, 'Indoor Plant Pot Set',           'HOME-002', 'Set of 3 minimalist ceramic plant pots, various sizes',                          29.99000000,   '2026-02-12 12:00:00', true, 2970324836987568),

    -- Sports & Outdoors
    (2970324836987585, 'Yoga Mat',                       'SPRT-001', 'Non-slip eco-friendly yoga mat, 6mm thick with carrying strap',                  34.99000000,   '2026-01-30 15:00:00', true, 2970324836987569),
    (2970324836987586, 'Stainless Steel Water Bottle',   'SPRT-002', 'Double-wall vacuum insulated bottle, 750ml, keeps drinks cold 24h',              24.99000000,   '2026-02-14 11:15:00', true, 2970324836987569),

    -- Books & Media
    (2970324836987587, 'The Art of Programming',         'BOOK-001', 'Comprehensive guide to modern software engineering practices',                   39.99000000,   '2026-02-02 08:00:00', true, 2970324836987570),

    -- Toys & Games
    (2970324836987588, 'Strategy Board Game',            'TOYS-001', 'Award-winning family strategy board game for 2-5 players',                       34.99000000,   '2026-02-06 14:30:00', true, 2970324836987571),

    -- Health & Beauty
    (2970324836987589, 'Vitamin C Serum',                'HLTH-001', 'Anti-aging face serum with 20% Vitamin C and hyaluronic acid',                   29.99000000,   '2026-02-09 10:00:00', true, 2970324836987572),
    (2970324836987590, 'SPF 50 Sunscreen Lotion',        'HLTH-002', 'Broad-spectrum SPF 50 sunscreen, water-resistant, 200ml',                       19.99000000,   '2026-02-11 09:45:00', true, 2970324836987572);

-- ============================================================================
-- 3. Product Variant (productcatalogmodule$productvariant)
-- ============================================================================
INSERT INTO productcatalogmodule$productvariant
    (id, sku, color, size, price, stockqty, soldqty, note, isactive,
     productcatalogmodule$productvariant_product, enddate, startdate)
VALUES
    -- Wireless Bluetooth Headphones variants
    (2970324836987591, 'ELEC-001-BLK',  'Black',     NULL,    149.99000000, 120, 45,  'Best seller',                    true, 2970324836987573, NULL,                 '2026-01-15 00:00:00'),
    (2970324836987592, 'ELEC-001-WHT',  'White',     NULL,    149.99000000, 85,  30,  NULL,                              true, 2970324836987573, NULL,                 '2026-01-15 00:00:00'),
    (2970324836987593, 'ELEC-001-SLV',  'Silver',    NULL,    159.99000000, 60,  15,  'Limited edition color',          true, 2970324836987573, NULL,                 '2026-01-15 00:00:00'),

    -- Smart Watch Pro variants
    (2970324836987594, 'ELEC-002-BLK-S', 'Black',    'S',     299.99000000, 50,  20,  NULL,                              true, 2970324836987574, NULL,                 '2026-01-20 00:00:00'),
    (2970324836987595, 'ELEC-002-BLK-L', 'Black',    'L',     299.99000000, 40,  25,  NULL,                              true, 2970324836987574, NULL,                 '2026-01-20 00:00:00'),
    (2970324836987596, 'ELEC-002-GLD-S', 'Gold',     'S',     329.99000000, 30,  10,  'Premium gold finish',            true, 2970324836987574, NULL,                 '2026-01-20 00:00:00'),
    (2970324836987597, 'ELEC-002-GLD-L', 'Gold',     'L',     329.99000000, 25,  8,   'Premium gold finish',            true, 2970324836987574, NULL,                 '2026-01-20 00:00:00'),

    -- USB-C Charging Hub variants
    (2970324836987598, 'ELEC-003-GRY',  'Gray',      NULL,    49.99000000,  200, 70,  NULL,                              true, 2970324836987575, NULL,                 '2026-02-01 00:00:00'),
    (2970324836987599, 'ELEC-003-SLV',  'Silver',    NULL,    49.99000000,  150, 55,  NULL,                              true, 2970324836987575, NULL,                 '2026-02-01 00:00:00'),

    -- Portable Bluetooth Speaker variants
    (2970324836987600, 'ELEC-004-BLK',  'Black',     NULL,    79.99000000,  90,  35,  NULL,                              true, 2970324836987576, NULL,                 '2026-02-10 00:00:00'),
    (2970324836987601, 'ELEC-004-BLU',  'Blue',      NULL,    79.99000000,  75,  28,  NULL,                              true, 2970324836987576, NULL,                 '2026-02-10 00:00:00'),
    (2970324836987602, 'ELEC-004-RED',  'Red',       NULL,    84.99000000,  50,  12,  'Limited red edition',            true, 2970324836987576, NULL,                 '2026-02-10 00:00:00'),

    -- Classic Cotton T-Shirt variants
    (2970324836987603, 'CLTH-001-WHT-S', 'White',    'S',     24.99000000,  300, 120, NULL,                              true, 2970324836987577, NULL,                 '2026-01-18 00:00:00'),
    (2970324836987604, 'CLTH-001-WHT-M', 'White',    'M',     24.99000000,  350, 150, NULL,                              true, 2970324836987577, NULL,                 '2026-01-18 00:00:00'),
    (2970324836987605, 'CLTH-001-WHT-L', 'White',    'L',     24.99000000,  280, 100, NULL,                              true, 2970324836987577, NULL,                 '2026-01-18 00:00:00'),
    (2970324836987606, 'CLTH-001-BLK-S', 'Black',    'S',     24.99000000,  250, 90,  NULL,                              true, 2970324836987577, NULL,                 '2026-01-18 00:00:00'),
    (2970324836987607, 'CLTH-001-BLK-M', 'Black',    'M',     24.99000000,  260, 110, NULL,                              true, 2970324836987577, NULL,                 '2026-01-18 00:00:00'),
    (2970324836987608, 'CLTH-001-BLK-L', 'Black',    'L',     24.99000000,  220, 85,  NULL,                              true, 2970324836987577, NULL,                 '2026-01-18 00:00:00'),
    (2970324836987609, 'CLTH-001-NVY-M', 'Navy',     'M',     24.99000000,  180, 60,  NULL,                              true, 2970324836987577, NULL,                 '2026-01-18 00:00:00'),
    (2970324836987610, 'CLTH-001-NVY-L', 'Navy',     'L',     24.99000000,  170, 55,  NULL,                              true, 2970324836987577, NULL,                 '2026-01-18 00:00:00'),

    -- Slim Fit Denim Jeans variants
    (2970324836987611, 'CLTH-002-BLU-30', 'Blue',    '30',    59.99000000,  100, 40,  NULL,                              true, 2970324836987578, NULL,                 '2026-01-25 00:00:00'),
    (2970324836987612, 'CLTH-002-BLU-32', 'Blue',    '32',    59.99000000,  120, 55,  NULL,                              true, 2970324836987578, NULL,                 '2026-01-25 00:00:00'),
    (2970324836987613, 'CLTH-002-BLU-34', 'Blue',    '34',    59.99000000,  90,  35,  NULL,                              true, 2970324836987578, NULL,                 '2026-01-25 00:00:00'),
    (2970324836987614, 'CLTH-002-BLK-30', 'Black',   '30',    64.99000000,  80,  25,  'Black wash denim',               true, 2970324836987578, NULL,                 '2026-01-25 00:00:00'),
    (2970324836987615, 'CLTH-002-BLK-32', 'Black',   '32',    64.99000000,  85,  30,  'Black wash denim',               true, 2970324836987578, NULL,                 '2026-01-25 00:00:00'),
    (2970324836987616, 'CLTH-002-BLK-34', 'Black',   '34',    64.99000000,  70,  20,  'Black wash denim',               true, 2970324836987578, NULL,                 '2026-01-25 00:00:00'),

    -- Running Sneakers variants
    (2970324836987617, 'CLTH-003-WHT-40', 'White',   '40',    89.99000000,  60,  25,  NULL,                              true, 2970324836987579, NULL,                 '2026-02-05 00:00:00'),
    (2970324836987618, 'CLTH-003-WHT-42', 'White',   '42',    89.99000000,  70,  35,  NULL,                              true, 2970324836987579, NULL,                 '2026-02-05 00:00:00'),
    (2970324836987619, 'CLTH-003-WHT-44', 'White',   '44',    89.99000000,  45,  18,  NULL,                              true, 2970324836987579, NULL,                 '2026-02-05 00:00:00'),
    (2970324836987620, 'CLTH-003-BLK-40', 'Black',   '40',    89.99000000,  55,  22,  NULL,                              true, 2970324836987579, NULL,                 '2026-02-05 00:00:00'),
    (2970324836987621, 'CLTH-003-BLK-42', 'Black',   '42',    89.99000000,  65,  30,  NULL,                              true, 2970324836987579, NULL,                 '2026-02-05 00:00:00'),
    (2970324836987622, 'CLTH-003-RED-42', 'Red',     '42',    94.99000000,  30,  8,   'Limited edition red',            true, 2970324836987579, NULL,                 '2026-02-05 00:00:00'),

    -- Organic Green Tea variants
    (2970324836987623, 'FOOD-001-100',   NULL,         '100 bags', 12.99000000, 500, 200, NULL,                          true, 2970324836987580, NULL,                 '2026-01-22 00:00:00'),
    (2970324836987624, 'FOOD-001-050',   NULL,         '50 bags',  7.99000000,  400, 150, 'Travel size',                  true, 2970324836987580, NULL,                 '2026-01-22 00:00:00'),

    -- Dark Chocolate Bar variants
    (2970324836987625, 'FOOD-002-72',    NULL,         '100g',     4.99000000,  600, 250, NULL,                          true, 2970324836987581, NULL,                 '2026-02-03 00:00:00'),
    (2970324836987626, 'FOOD-002-85',    NULL,         '100g',     5.49000000,  350, 100, 'Extra dark 85% cacao',         true, 2970324836987581, NULL,                 '2026-02-03 00:00:00'),
    (2970324836987627, 'FOOD-002-72-3PK', NULL,        '3x100g',   12.99000000, 200, 80,  'Value 3-pack',                true, 2970324836987581, NULL,                 '2026-02-03 00:00:00'),

    -- Cold Brew Coffee variants
    (2970324836987628, 'FOOD-003-ORIG',  NULL,         '12-pack',  24.99000000, 180, 70,  'Original roast',               true, 2970324836987582, NULL,                 '2026-02-08 00:00:00'),
    (2970324836987629, 'FOOD-003-VNLA',  NULL,         '12-pack',  26.99000000, 150, 55,  'Vanilla flavor',               true, 2970324836987582, NULL,                 '2026-02-08 00:00:00'),

    -- LED Desk Lamp variants
    (2970324836987630, 'HOME-001-WHT',   'White',      NULL,      39.99000000, 110, 40,  NULL,                           true, 2970324836987583, NULL,                 '2026-01-28 00:00:00'),
    (2970324836987631, 'HOME-001-BLK',   'Black',      NULL,      39.99000000, 95,  35,  NULL,                           true, 2970324836987583, NULL,                 '2026-01-28 00:00:00'),

    -- Indoor Plant Pot Set variants
    (2970324836987632, 'HOME-002-WHT',   'White',      NULL,      29.99000000, 80,  30,  NULL,                           true, 2970324836987584, NULL,                 '2026-02-12 00:00:00'),
    (2970324836987633, 'HOME-002-TER',   'Terracotta', NULL,      29.99000000, 70,  25,  NULL,                           true, 2970324836987584, NULL,                 '2026-02-12 00:00:00'),
    (2970324836987634, 'HOME-002-GRN',   'Green',      NULL,      32.99000000, 50,  15,  'Botanical green edition',      true, 2970324836987584, NULL,                 '2026-02-12 00:00:00'),

    -- Yoga Mat variants
    (2970324836987635, 'SPRT-001-PPR',   'Purple',     NULL,      34.99000000, 100, 45,  NULL,                           true, 2970324836987585, NULL,                 '2026-01-30 00:00:00'),
    (2970324836987636, 'SPRT-001-BLU',   'Blue',       NULL,      34.99000000, 110, 50,  NULL,                           true, 2970324836987585, NULL,                 '2026-01-30 00:00:00'),
    (2970324836987637, 'SPRT-001-GRN',   'Green',      NULL,      34.99000000, 90,  35,  NULL,                           true, 2970324836987585, NULL,                 '2026-01-30 00:00:00'),
    (2970324836987638, 'SPRT-001-PNK',   'Pink',       NULL,      37.99000000, 60,  20,  'Premium pink with alignment marks', true, 2970324836987585, NULL, '2026-01-30 00:00:00'),

    -- Stainless Steel Water Bottle variants
    (2970324836987639, 'SPRT-002-SLV',   'Silver',     '750ml',   24.99000000, 200, 80,  NULL,                           true, 2970324836987586, NULL,                 '2026-02-14 00:00:00'),
    (2970324836987640, 'SPRT-002-BLK',   'Black',      '750ml',   24.99000000, 180, 75,  NULL,                           true, 2970324836987586, NULL,                 '2026-02-14 00:00:00'),
    (2970324836987641, 'SPRT-002-BLU',   'Blue',       '750ml',   24.99000000, 160, 60,  NULL,                           true, 2970324836987586, NULL,                 '2026-02-14 00:00:00'),
    (2970324836987642, 'SPRT-002-SLV-1L', 'Silver',    '1000ml',  29.99000000, 120, 40,  'Large 1L size',                true, 2970324836987586, NULL,                 '2026-02-14 00:00:00'),

    -- The Art of Programming variants
    (2970324836987643, 'BOOK-001-HC',    NULL,         'Hardcover', 39.99000000, 80, 30,  NULL,                           true, 2970324836987587, NULL,                 '2026-02-02 00:00:00'),
    (2970324836987644, 'BOOK-001-PB',    NULL,         'Paperback',  29.99000000, 120, 55,  NULL,                           true, 2970324836987587, NULL,                 '2026-02-02 00:00:00'),
    (2970324836987645, 'BOOK-001-EBOOK', NULL,         'E-book',     19.99000000, 999, 150, 'Digital edition',               true, 2970324836987587, NULL,                 '2026-02-02 00:00:00'),

    -- Strategy Board Game variants
    (2970324836987646, 'TOYS-001-STD',   NULL,         'Standard',  34.99000000, 90, 40,  NULL,                           true, 2970324836987588, NULL,                 '2026-02-06 00:00:00'),
    (2970324836987647, 'TOYS-001-DLX',   NULL,         'Deluxe',    54.99000000, 40,  15,  'Deluxe edition with expansions', true, 2970324836987588, NULL,                 '2026-02-06 00:00:00'),

    -- Vitamin C Serum variants
    (2970324836987648, 'HLTH-001-30ML',  NULL,         '30ml',     29.99000000, 150, 60,  NULL,                           true, 2970324836987589, NULL,                 '2026-02-09 00:00:00'),
    (2970324836987649, 'HLTH-001-60ML',  NULL,         '60ml',     49.99000000, 100, 35,  'Value size',                    true, 2970324836987589, NULL,                 '2026-02-09 00:00:00'),

    -- SPF 50 Sunscreen Lotion variants
    (2970324836987650, 'HLTH-002-200',   NULL,         '200ml',    19.99000000, 250, 90,  NULL,                           true, 2970324836987590, NULL,                 '2026-02-11 00:00:00'),
    (2970324836987651, 'HLTH-002-400',   NULL,         '400ml',    34.99000000, 150, 50,  'Family size',                   true, 2970324836987590, NULL,                 '2026-02-11 00:00:00');

-- ============================================================================
-- Summary:
--   Categories :  8 rows (IDs 2970324836987565 - 2970324836987572)
--   Products   : 18 rows (IDs 2970324836987573 - 2970324836987590)
--   Variants   : 61 rows (IDs 2970324836987591 - 2970324836987651)
-- ============================================================================
