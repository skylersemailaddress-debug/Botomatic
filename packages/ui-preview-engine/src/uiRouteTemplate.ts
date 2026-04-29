export const UI_ROUTE_TEMPLATE_CAVEAT = "Template creation is deterministic planning output and does not prove runtime correctness.";

export function createNextRouteTemplate(kind: "page.tsx" | "layout.tsx", routeSegment = "Route"): string {
  if (kind === "page.tsx") {
    return `export default function ${routeSegment}Page() {\n  return <main>${routeSegment}</main>;\n}\n`;
  }
  return `export default function ${routeSegment}Layout({ children }: { children: React.ReactNode }) {\n  return <section>{children}</section>;\n}\n`;
}
