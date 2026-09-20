CREATE TABLE oc_oauth_connections (
 id uuid PRIMARY KEY, provider text NOT NULL, user_id uuid NOT NULL REFERENCES oc_admin_users(id),
 provider_user_id text NOT NULL, access_token text, refresh_token text, token_type text NOT NULL DEFAULT 'bearer', scope text NOT NULL DEFAULT '',
 expires_at timestamptz NOT NULL, status text NOT NULL CHECK(status IN ('connected','invalid','disconnected')),
 last_error text, generation integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(provider,user_id), CHECK(status<>'connected' OR (access_token IS NOT NULL AND refresh_token IS NOT NULL))
);
CREATE TABLE oc_oauth_states (
 state_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES oc_admin_users(id), session_hash text NOT NULL REFERENCES oc_sessions(token_hash) ON DELETE CASCADE,
 code_verifier text, expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON oc_oauth_states(expires_at);
CREATE TABLE oc_oauth_events (id uuid PRIMARY KEY, provider text NOT NULL, event text NOT NULL, error_code text, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX ON oc_oauth_events(provider,created_at DESC);
ALTER TABLE oc_products ADD COLUMN external_id text;
CREATE UNIQUE INDEX oc_products_external_identity ON oc_products(source,external_id) WHERE external_id IS NOT NULL;
ALTER TABLE oc_offers ADD COLUMN source_offer_id text;
ALTER TABLE oc_coupons ADD COLUMN source text NOT NULL DEFAULT 'manual';
ALTER TABLE oc_coupons ADD COLUMN confidence text NOT NULL DEFAULT 'user_reported';
ALTER TABLE oc_coupons ADD CONSTRAINT oc_coupon_amount CHECK(discount_type IN ('fixed','percent') AND amount>0 AND minimum_purchase>=0 AND (discount_type<>'percent' OR amount<=10000));
ALTER TABLE oc_coupons ADD CONSTRAINT oc_coupon_state CHECK(status IN ('unverified','verified','inactive'));
DO $$ DECLARE tab text; role_name text; BEGIN
 FOREACH tab IN ARRAY ARRAY['oc_oauth_connections','oc_oauth_states','oc_oauth_events'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',tab);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC',tab);
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=role_name) THEN EXECUTE format('REVOKE ALL ON public.%I FROM %I',tab,role_name); END IF;
  END LOOP;
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='oc_runtime') THEN
   EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON public.%I TO oc_runtime',tab);
   EXECUTE format('CREATE POLICY server_access ON public.%I TO oc_runtime USING(true) WITH CHECK(true)',tab);
  END IF;
 END LOOP;
END $$;
INSERT INTO oc_migrations(version) VALUES(2);
