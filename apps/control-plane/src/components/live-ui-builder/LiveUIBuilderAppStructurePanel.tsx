import type { UIAppStructure } from "../../../../../packages/ui-preview-engine/src/uiAppStructureModel";
import { normalizeUIRoutePath } from "../../../../../packages/ui-preview-engine/src/uiAppStructureModel";

export function LiveUIBuilderAppStructurePanel({ appStructure, selectedPageId, onSelectPage, onDuplicatePage, onRenamePage, onAddToNav, onExtractReusable, onReuseComponent, needsResolution, candidates }: { appStructure: UIAppStructure; selectedPageId?: string; onSelectPage: (pageId: string) => void; onDuplicatePage: (pageId: string) => void; onRenamePage: (pageId: string, title: string) => void; onAddToNav: (pageId: string) => void; onExtractReusable: (nodeId: string) => void; onReuseComponent: (componentId: string, pageId: string) => void; needsResolution?: string; candidates?: Array<{pageId:string; title:string; route:string}>; }) {
  return <section className="vibe-rail-card" aria-label="App structure panel"><h3>App Structure</h3><p>App-structure edits update the editable UI model only. Source sync remains explicit and guarded.</p>
    <ul>{appStructure.pages.map((p) => <li key={p.id} data-selected={selectedPageId===p.id}><strong>{p.title}</strong> <small>{normalizeUIRoutePath(p.route) ?? p.route}</small>
      <button type="button" onClick={() => onSelectPage(p.id)}>Select page</button><button type="button" onClick={() => onDuplicatePage(p.id)}>Duplicate page</button><button type="button" onClick={() => onRenamePage(p.id, `${p.title} Updated`)}>Rename page</button><button type="button" onClick={() => onAddToNav(p.id)}>Add to nav</button></li>)}</ul>
    <h4>Reusable Components</h4><ul>{appStructure.reusableComponents.map((c) => <li key={c.id}>{c.title} <small>{c.semanticRole}/{c.semanticLabel} · source {c.sourcePageId} · usage {c.usagePageIds.length}</small><button type="button" onClick={() => onExtractReusable(c.nodeId)}>Extract reusable</button>{appStructure.pages[0] ? <button type="button" onClick={() => onReuseComponent(c.id, appStructure.pages[0].id)}>Reuse component</button> : null}</li>)}</ul>
    {needsResolution ? <p>Needs resolution: {needsResolution}</p> : null}{candidates?.length ? <ul>{candidates.map((c)=><li key={c.pageId}>{c.title} ({c.route})</li>)}</ul> : null}
    <h4>Shared Sections</h4><ul>{appStructure.sharedSections.map((s) => <li key={s.id}>{s.kind}: {s.title}</li>)}</ul>
    <h4>Navigation</h4><ul>{appStructure.navigation.map((n) => <li key={n.pageId}>{n.title} ({n.path})</li>)}</ul>
  </section>;
}
