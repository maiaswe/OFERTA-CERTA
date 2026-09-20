import { notFound, redirect } from "next/navigation";
import {
  parseOfferSearch,
  offerSearchUrl,
  type OfferSearchParams,
} from "@/domain/offer-search";
import { OfertaApp } from "@/components/oferta-app";
const routes = [
  "",
  "busca",
  "cupons",
  "historico",
  "favoritos",
  "admin",
  "produto/gpu",
  "produto/ssd",
  "produto/fone",
  "produto/phone",
];
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ route?: string[] }>;
  searchParams: Promise<OfferSearchParams>;
}) {
  const { route } = await params;
  const path = route?.join("/") ?? "";
  if (path === "" || path === "busca")
    redirect(offerSearchUrl(parseOfferSearch(await searchParams)));
  if (path === "demonstracao" || path.startsWith("demonstracao/")) {
    const demoPath = path.slice("demonstracao".length).replace(/^\//, "");
    if (!routes.includes(demoPath)) notFound();
    return <OfertaApp route={demoPath} />;
  }
  if (!routes.includes(path)) notFound();
  redirect(`/demonstracao/${path}`);
}
