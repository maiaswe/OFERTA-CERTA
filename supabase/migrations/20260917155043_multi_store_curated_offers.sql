ALTER TABLE public.oc_affiliate_offers DROP CONSTRAINT oc_affiliate_offers_store_id_check;
ALTER TABLE public.oc_affiliate_offers ADD CONSTRAINT oc_affiliate_offers_store_id_check
  CHECK (store_id IN ('mercadolivre','amazon','magalu'));
ALTER TABLE public.oc_affiliate_offers ALTER COLUMN price DROP NOT NULL;
ALTER TABLE public.oc_affiliate_offers ADD CONSTRAINT oc_offer_store_price_policy CHECK (
  (store_id='amazon' AND price IS NULL AND regular_price IS NULL AND shipping IS NULL AND image_url IS NULL)
  OR (store_id<>'amazon' AND price IS NOT NULL AND price>0)
);
INSERT INTO public.oc_migrations(version) VALUES(5);
