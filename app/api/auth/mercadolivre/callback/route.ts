import "server-only";
import { handleOAuth } from "@/server/integrations-api";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = (request: Request) => handleOAuth(request, "callback");
