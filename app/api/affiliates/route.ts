import "server-only";
import { handleAffiliates } from "@/server/affiliates-api";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = (request: Request) => handleAffiliates(request);
export const POST = (request: Request) => handleAffiliates(request);
