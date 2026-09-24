import "server-only";
import { handleIntegration } from "@/server/integrations-api";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const GET = (request: Request) => handleIntegration(request);
export const POST = (request: Request) => handleIntegration(request);
