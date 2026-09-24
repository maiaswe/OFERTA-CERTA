"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
type ModelContext = {
  registerTool: (
    tool: {
      name: string;
      description: string;
      inputSchema: object;
      execute: (input: unknown) => unknown;
    },
    options: { signal: AbortSignal },
  ) => void | Promise<void>;
};
export function Platform() {
  const router = useRouter();
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* Offline support is optional; online navigation remains available. */
      });
    }
  }, []);
  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext })
      .modelContext;
    if (!context) return;
    const lifecycle = new AbortController();
    void Promise.resolve(
      context.registerTool(
        {
          name: "search_demo_products",
          description:
            "Pesquisar somente o catálogo fictício do Oferta Certa. Não consulta lojas reais.",
          inputSchema: {
            type: "object",
            properties: { query: { type: "string", maxLength: 120 } },
            required: ["query"],
            additionalProperties: false,
          },
          execute: (input: unknown) => {
            if (
              !input ||
              typeof input !== "object" ||
              !("query" in input) ||
              typeof input.query !== "string" ||
              input.query.length > 120
            )
              throw new Error("Consulta inválida");
            router.push(
              `/demonstracao/busca?q=${encodeURIComponent(input.query)}`,
            );
            return { status: "navigating", demo: true };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => {});
    return () => lifecycle.abort();
  }, [router]);
  return null;
}
