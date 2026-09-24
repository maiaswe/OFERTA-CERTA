import { notFound } from "next/navigation";
import { LiveWorkspace } from "@/components/live-workspace";
import "../../workspace.css";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)
  )
    notFound();
  return <LiveWorkspace key={id} productId={id} />;
}
