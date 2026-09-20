CREATE TABLE oc_affiliate_offers (
 id uuid PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES oc_admin_users(id),
 store_id text NOT NULL CHECK(store_id='mercadolivre'),
 title text NOT NULL CHECK(length(title) BETWEEN 3 AND 160),
 variant text NOT NULL CHECK(length(variant) BETWEEN 3 AND 200),
 condition text NOT NULL CHECK(condition IN ('new','used','refurbished')),
 product_url text NOT NULL, affiliate_url text NOT NULL DEFAULT '', image_url text,
 price integer NOT NULL CHECK(price>0 AND price<=100000000),
 regular_price integer CHECK(regular_price>price),
 shipping integer CHECK(shipping>=0),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published')),
 verified_at timestamptz NOT NULL, expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(expires_at>verified_at), CHECK(status<>'published' OR length(affiliate_url)>0)
);
CREATE INDEX ON oc_affiliate_offers(user_id,updated_at DESC);
CREATE INDEX ON oc_affiliate_offers(expires_at) WHERE status='published';
CREATE TABLE oc_affiliate_revisions (
 id uuid PRIMARY KEY, offer_id uuid NOT NULL REFERENCES oc_affiliate_offers(id),
 snapshot jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON oc_affiliate_revisions(offer_id,created_at DESC);
CREATE FUNCTION oc_affiliate_revision_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN RAISE EXCEPTION 'Offer revisions are append-only'; END $$;
CREATE TRIGGER immutable_affiliate_revision BEFORE UPDATE OR DELETE ON oc_affiliate_revisions FOR EACH ROW EXECUTE FUNCTION oc_affiliate_revision_immutable();
DO $$ DECLARE tab text; role_name text; BEGIN
 FOREACH tab IN ARRAY ARRAY['oc_affiliate_offers','oc_affiliate_revisions'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',tab);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC',tab);
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=role_name) THEN EXECUTE format('REVOKE ALL ON public.%I FROM %I',tab,role_name); END IF;
  END LOOP;
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='oc_runtime') THEN
   EXECUTE format('GRANT SELECT,INSERT ON public.%I TO oc_runtime',tab);
   EXECUTE format('CREATE POLICY server_access ON public.%I TO oc_runtime USING(true) WITH CHECK(true)',tab);
  END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='oc_runtime') THEN GRANT UPDATE ON oc_affiliate_offers TO oc_runtime; END IF;
END $$;
INSERT INTO oc_migrations(version) VALUES(3);
