export function App() {
  const pricing = ["Starter", "Growth", "Scale"];
  return <main><section><h1>AtlasCRM</h1><p>Commercial CRM launch workspace for pipeline visibility.</p></section><section>{pricing.map((tier) => <article key={tier}>{tier}</article>)}</section><section aria-label="Testimonials">Revenue teams trust AtlasCRM.</section><section aria-label="FAQ">FAQ and contact form UI included.</section><section aria-label="Launch readiness checklist">Security, validation, deployment, support.</section></main>;
}
