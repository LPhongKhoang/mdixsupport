CREATE TABLE public."productcatalogmodule$category" (
	id int8 NOT NULL,
	"name" varchar(200) NULL,
	description varchar(500) NULL,
	iconurl varchar(500) NULL,
	sortorder int4 NULL,
	isactive bool NULL,
	CONSTRAINT "productcatalogmodule$category_pkey" PRIMARY KEY (id)
);


CREATE TABLE public."productcatalogmodule$product" (
	id int8 NOT NULL,
	"name" varchar(200) NULL,
	code varchar(50) NULL,
	description varchar(1000) NULL,
	baseprice numeric(28, 8) NULL,
	createddateat timestamp NULL,
	isactive bool NULL,
	"productcatalogmodule$product_category" int8 NULL,
	CONSTRAINT "productcatalogmodule$product_pkey" PRIMARY KEY (id)
);
CREATE INDEX "idx_productcatalogmodule$product" ON public."productcatalogmodule$product" USING btree ("productcatalogmodule$product_category", id);


-- public."productcatalogmodule$product" foreign keys

ALTER TABLE public."productcatalogmodule$product" ADD CONSTRAINT "frn_productcatalogmod$product_productcatalogmod$product_categor" FOREIGN KEY ("productcatalogmodule$product_category") REFERENCES public."productcatalogmodule$category"(id) ON DELETE SET NULL;




CREATE TABLE public."productcatalogmodule$productvariant" (
	id int8 NOT NULL,
	sku varchar(100) NULL,
	color varchar(20) NULL,
	"size" varchar(50) NULL,
	price numeric(28, 8) NULL,
	stockqty int4 NULL,
	soldqty int4 NULL,
	note varchar(500) NULL,
	isactive bool NULL,
	"productcatalogmodule$productvariant_product" int8 NULL,
	enddate timestamp NULL,
	startdate timestamp NULL,
	CONSTRAINT "productcatalogmodule$productvariant_pkey" PRIMARY KEY (id)
);
CREATE INDEX "idx_productcatalogmodule$productvariant" ON public."productcatalogmodule$productvariant" USING btree ("productcatalogmodule$productvariant_product", id);


-- public."productcatalogmodule$productvariant" foreign keys

ALTER TABLE public."productcatalogmodule$productvariant" ADD CONSTRAINT "frn_productcatalog$productvar_productcatalog$productvari_produc" FOREIGN KEY ("productcatalogmodule$productvariant_product") REFERENCES public."productcatalogmodule$product"(id) ON DELETE SET NULL;