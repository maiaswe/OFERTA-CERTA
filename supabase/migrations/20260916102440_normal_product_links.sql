-- Normal product links are sufficient; affiliate conversion can be added later.
ALTER TABLE public.oc_affiliate_offers DROP CONSTRAINT oc_affiliate_offers_check2;
ALTER TABLE public.oc_affiliate_offers ADD CONSTRAINT oc_offer_product_url_required CHECK(length(product_url)>0);
INSERT INTO public.oc_migrations(version) VALUES(4);
