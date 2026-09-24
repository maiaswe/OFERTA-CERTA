import "server-only";
import { handleApi } from "@/server/api";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return handleApi(request);
}
export async function POST(request: Request) {
  return handleApi(request);
}
