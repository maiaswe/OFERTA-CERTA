-- Execute after migrations as the database administrator. Set the login password separately.
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='oc_runtime') THEN
  CREATE ROLE oc_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS CONNECTION LIMIT 5;
 END IF;
END $$;
GRANT USAGE ON SCHEMA public TO oc_runtime;
DO $$ DECLARE tab record; BEGIN
 EXECUTE format('GRANT CONNECT ON DATABASE %I TO oc_runtime',current_database());
 FOR tab IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'oc_%' LOOP
  EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON public.%I TO oc_runtime',tab.tablename);
  IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=tab.tablename AND policyname='server_access') THEN
   EXECUTE format('CREATE POLICY server_access ON public.%I TO oc_runtime USING(true) WITH CHECK(true)',tab.tablename);
  END IF;
 END LOOP;
END $$;
REVOKE INSERT,UPDATE,DELETE ON oc_migrations FROM oc_runtime;
REVOKE UPDATE,DELETE ON oc_price_history FROM oc_runtime;
REVOKE INSERT,UPDATE,DELETE ON oc_stores FROM oc_runtime;
