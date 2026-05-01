export const dynamic = "force-dynamic";

export default function GeneratedPreviewPage({ params }: { params: { projectId: string } }) {
  return (
    <main className="empty-preview">
      <section>
        <p className="eyebrow">Generated app preview</p>
        <h1>No generated app exists yet.</h1>
        <p>
          Project <strong>{params.projectId}</strong> has not produced a real runnable app artifact.
          The builder will show a live preview here only after generation creates a verified runtime target.
        </p>
      </section>
      <style>{`
        *{box-sizing:border-box}body{margin:0}.empty-preview{min-height:100vh;display:grid;place-items:center;background:#0b1020;color:white;font-family:Inter,system-ui,sans-serif;padding:32px}.empty-preview section{max-width:680px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);border-radius:24px;padding:34px;box-shadow:0 24px 80px rgba(0,0,0,.25)}.eyebrow{text-transform:uppercase;letter-spacing:.16em;font-size:12px;color:#a99cff;font-weight:900}h1{font-size:34px;line-height:1.1;margin:0 0 14px}p{color:rgba(255,255,255,.78);line-height:1.6}strong{color:white}
      `}</style>
    </main>
  );
}
