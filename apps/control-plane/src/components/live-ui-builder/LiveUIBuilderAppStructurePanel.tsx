"use client";

type AppStructurePage = { pageId?: string; id?: string; title?: string; route?: string; semanticRole?: string };
type ReusableComponent = { componentId?: string; name?: string; semanticRole?: string; usagePageIds?: string[] };
type AppStructure = { pages?: AppStructurePage[]; reusableComponents?: ReusableComponent[]; components?: ReusableComponent[] };

export function LiveUIBuilderAppStructurePanel({ appStructure, needsResolution, candidates = [], onSelectPage, onReuseComponent }: { appStructure?: AppStructure; needsResolution?: unknown; candidates?: Array<{ pageId: string; title: string; route: string }>; onSelectPage?: (pageId: string) => void; onReuseComponent?: (componentId: string) => void }) {
  const pages = needsResolution && candidates.length > 0 ? candidates : appStructure?.pages ?? [];
  const reusableComponents = appStructure?.reusableComponents ?? appStructure?.components ?? [];

  return (
    <section className="live-ui-builder-app-structure-panel" aria-label="App Structure">
      <h4>App Structure</h4>
      <p>Source sync remains explicit and guarded before any local file apply.</p>
      <p>needsResolution: {needsResolution ? "true" : "false"}</p>
      <div>
        {pages.map((page) => {
          const typedPage = page as AppStructurePage;
          const pageId = typedPage.pageId ?? typedPage.id ?? typedPage.route ?? "unknown-page";
          return <button key={pageId} type="button" onClick={() => onSelectPage?.(pageId)}>Select page: {page.title ?? pageId} · {page.route ?? "/"} · semanticRole</button>;
        })}
      </div>
      <div>
        {reusableComponents.map((component) => {
          const componentId = component.componentId ?? component.name ?? "component";
          return <button key={componentId} type="button" onClick={() => onReuseComponent?.(componentId)}>Reuse component: {component.name ?? componentId} · semanticRole · usagePageIds</button>;
        })}
      </div>
    </section>
  );
}
