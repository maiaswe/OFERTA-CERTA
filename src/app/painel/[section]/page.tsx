import { notFound } from "next/navigation";
import { LiveWorkspace } from "@/components/live-workspace";
import "../workspace.css";
export default async function Page({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (
    ![
      "busca",
      "integracoes",
      "favoritos",
      "historico",
      "cupons",
      "afiliados",
    ].includes(section)
  )
    notFound();
  return <LiveWorkspace key={section} view={section} />;
}
