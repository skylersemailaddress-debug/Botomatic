import { loadGeneratedApp } from "@/server/generatedAppStore";

export const dynamic = "force-dynamic";

export default function GeneratedPreviewPage({ params }: { params: { projectId: string } }) {
  const app = loadGeneratedApp(params.projectId);

  if (!app) {
    return (
      <main className="emptyPreview">
        <section>
          <p>Generated app preview</p>
          <h1>No generated app yet</h1>
          <span>Submit a prompt in Vibe Mode to create a real app artifact.</span>
        </section>
        <style>{`
          body{margin:0}.emptyPreview{height:100vh;display:grid;place-items:center;background:#0b1020;color:#fff;font-family:Inter,system-ui,sans-serif;padding:24px}.emptyPreview section{max-width:520px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);border-radius:20px;padding:28px}.emptyPreview p{text-transform:uppercase;letter-spacing:.16em;font-size:11px;color:#a99cff;font-weight:900}.emptyPreview h1{margin:0 0 10px;font-size:30px}.emptyPreview span{color:rgba(255,255,255,.72);line-height:1.5}
        `}</style>
      </main>
    );
  }

  return (
    <main className="generatedApp">
      <nav>
        <strong>{app.appName}</strong>
        <div><span>Home</span><span>Features</span><span>About</span><span>Contact</span></div>
        <button>{app.primaryCta}</button>
      </nav>
      <section className="hero">
        <p>Generated from your prompt</p>
        <h1>{app.heroTitle}</h1>
        <span>{app.heroSubtitle}</span>
        <div><button>{app.primaryCta}</button><button>{app.secondaryCta}</button></div>
      </section>
      <style>{`
        body{margin:0}.generatedApp{height:100vh;overflow:hidden;background:linear-gradient(135deg,#071023,#172b58 55%,#8a4a32);color:white;font-family:Inter,system-ui,sans-serif}.generatedApp nav{display:flex;align-items:center;justify-content:space-between;padding:22px 34px}.generatedApp nav strong{letter-spacing:.1em}.generatedApp nav span{margin:0 10px;font-size:13px;opacity:.82}.generatedApp button{border:0;border-radius:10px;padding:12px 16px;font-weight:900;background:#d99a31;color:white}.generatedApp .hero{max-width:660px;padding:70px 54px}.generatedApp .hero p{text-transform:uppercase;letter-spacing:.16em;font-size:12px;opacity:.68}.generatedApp .hero h1{font-family:Georgia,serif;font-size:68px;line-height:1.02;margin:0 0 18px}.generatedApp .hero span{display:block;font-size:19px;line-height:1.5;opacity:.82;margin-bottom:24px}.generatedApp .hero button+button{margin-left:12px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.26)}
      `}</style>
    </main>
  );
}
