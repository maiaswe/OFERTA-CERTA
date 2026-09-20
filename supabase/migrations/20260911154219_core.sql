CREATE TABLE IF NOT EXISTS oc_migrations (version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE oc_admin_users (
 id uuid PRIMARY KEY, singleton boolean NOT NULL UNIQUE DEFAULT true CHECK(singleton),
 username text NOT NULL UNIQUE, password_hash text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), status text NOT NULL DEFAULT 'active'
);
CREATE TABLE oc_sessions (token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES oc_admin_users(id), expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX ON oc_sessions(expires_at);
CREATE TABLE oc_products (
 id uuid PRIMARY KEY, name text NOT NULL, brand text NOT NULL, model text NOT NULL,
 category text NOT NULL DEFAULT 'Outros', gtin text, mpn text, condition text NOT NULL CHECK(condition IN ('new','used','refurbished')),
 origin text NOT NULL CHECK(origin IN ('national','imported','unknown')), warranty text NOT NULL DEFAULT 'unknown', attributes jsonb NOT NULL DEFAULT '{}',
 source text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), status text NOT NULL DEFAULT 'active'
);
CREATE INDEX ON oc_products(gtin); CREATE INDEX ON oc_products(mpn); CREATE INDEX ON oc_products(status);
CREATE TABLE oc_product_aliases (id uuid PRIMARY KEY, product_id uuid NOT NULL REFERENCES oc_products(id), alias text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(product_id,alias));
CREATE TABLE oc_stores (id text PRIMARY KEY, name text NOT NULL, domains jsonb NOT NULL, integration text NOT NULL DEFAULT 'disabled', status text NOT NULL DEFAULT 'inactive', authorization_reference text, history_allowed boolean NOT NULL DEFAULT false, validated_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
INSERT INTO oc_stores(id,name,domains) VALUES
 ('mercadolivre','Mercado Livre','["mercadolivre.com.br"]'),('amazon','Amazon Brasil','["amazon.com.br"]'),('kabum','KaBuM','["kabum.com.br"]'),('pichau','Pichau','["pichau.com.br"]'),('terabyte','Terabyte Shop','["terabyteshop.com.br"]'),('magalu','Magazine Luiza','["magazineluiza.com.br","magalu.com"]'),('casasbahia','Casas Bahia','["casasbahia.com.br"]'),('fastshop','Fast Shop','["fastshop.com.br"]'),('carrefour','Carrefour','["carrefour.com.br"]');
CREATE TABLE oc_sellers (id uuid PRIMARY KEY, store_id text NOT NULL REFERENCES oc_stores(id), external_id text, name text NOT NULL, reputation jsonb, source text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE oc_offers (
 id uuid PRIMARY KEY, product_id uuid NOT NULL REFERENCES oc_products(id), store_id text NOT NULL REFERENCES oc_stores(id), seller text NOT NULL,
 url text NOT NULL, match_status text NOT NULL CHECK(match_status IN ('exact','partial')), match_reason text NOT NULL,
 payment text NOT NULL, shipping_context text NOT NULL, source text NOT NULL CHECK(source IN ('manual','mercadolivre')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), status text NOT NULL DEFAULT 'active',
 UNIQUE(product_id,store_id,url,seller,payment,shipping_context)
);
CREATE INDEX ON oc_offers(product_id); CREATE INDEX ON oc_offers(store_id); CREATE INDEX ON oc_offers(url);
CREATE TABLE oc_price_history (
 id uuid PRIMARY KEY, offer_id uuid NOT NULL REFERENCES oc_offers(id), product_id uuid NOT NULL REFERENCES oc_products(id), store_id text NOT NULL REFERENCES oc_stores(id),
 product_price integer NOT NULL CHECK(product_price>0), shipping_price integer CHECK(shipping_price>=0), fees integer NOT NULL DEFAULT 0 CHECK(fees>=0),
 discount_price integer NOT NULL DEFAULT 0 CHECK(discount_price>=0 AND discount_price<=product_price),
 final_price integer GENERATED ALWAYS AS (CASE WHEN shipping_price IS NULL THEN NULL ELSE product_price+shipping_price+fees-discount_price END) STORED,
 available boolean NOT NULL DEFAULT true, source text NOT NULL CHECK(source IN ('manual','mercadolivre')), source_url text NOT NULL, source_observed_at timestamptz NOT NULL,
 collected_at timestamptz NOT NULL DEFAULT now(), data_quality_status text NOT NULL, idempotency_key uuid NOT NULL UNIQUE,
 identity_snapshot jsonb NOT NULL, context_snapshot jsonb NOT NULL, coupon_code text,
 CHECK(source_observed_at<=collected_at+interval '5 minutes')
);
CREATE INDEX ON oc_price_history(product_id,collected_at DESC); CREATE INDEX ON oc_price_history(offer_id,collected_at DESC); CREATE INDEX ON oc_price_history(final_price);
CREATE FUNCTION oc_immutable_history() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$ BEGIN RAISE EXCEPTION 'Price history is append-only'; END $$;
CREATE TRIGGER oc_immutable_history BEFORE UPDATE OR DELETE ON oc_price_history FOR EACH ROW EXECUTE FUNCTION oc_immutable_history();
CREATE TABLE oc_coupons (id uuid PRIMARY KEY, store_id text NOT NULL REFERENCES oc_stores(id), code text NOT NULL, discount_type text NOT NULL, amount integer NOT NULL, minimum_purchase integer NOT NULL DEFAULT 0, eligible_product_ids jsonb NOT NULL DEFAULT '[]', starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL, source_url text NOT NULL, last_verified_at timestamptz NOT NULL, rules text NOT NULL, status text NOT NULL DEFAULT 'unverified', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK(ends_at>starts_at));
CREATE TABLE oc_search_queries (id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES oc_admin_users(id), query text NOT NULL, result_count integer NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE oc_favorites (user_id uuid NOT NULL REFERENCES oc_admin_users(id), product_id uuid NOT NULL REFERENCES oc_products(id), created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,product_id));
CREATE TABLE oc_alerts (id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES oc_admin_users(id), product_id uuid NOT NULL REFERENCES oc_products(id), target_price integer NOT NULL CHECK(target_price>0), basis text NOT NULL DEFAULT 'product' CHECK(basis='product'), below_target boolean NOT NULL DEFAULT false, status text NOT NULL DEFAULT 'active', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,product_id));
CREATE TABLE oc_notifications (id uuid PRIMARY KEY, alert_id uuid NOT NULL REFERENCES oc_alerts(id), history_id uuid NOT NULL REFERENCES oc_price_history(id), message text NOT NULL, read_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(alert_id,history_id));
CREATE TABLE oc_connector_status (store_id text PRIMARY KEY REFERENCES oc_stores(id), failures integer NOT NULL DEFAULT 0, retry_after timestamptz, last_synced_at timestamptz, last_error text, updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE oc_fetch_logs (id uuid PRIMARY KEY, store_id text REFERENCES oc_stores(id), http_status integer, outcome text NOT NULL, duration_ms integer NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE oc_cache (cache_key text PRIMARY KEY, payload jsonb NOT NULL, expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX ON oc_cache(expires_at);
CREATE TABLE oc_rate_limits (bucket text PRIMARY KEY, hits integer NOT NULL, resets_at timestamptz NOT NULL);
DO $$ DECLARE t record; BEGIN FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'oc_%' LOOP EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t.tablename); EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC',t.tablename); END LOOP; END $$;
INSERT INTO oc_migrations(version) VALUES(1);
DO $$ DECLARE tab record; role_name text; BEGIN
 FOR tab IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'oc_%' LOOP
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=role_name) THEN EXECUTE format('REVOKE ALL ON public.%I FROM %I',tab.tablename,role_name); END IF;
  END LOOP;
 END LOOP;
END $$;
