export const dynamic = "force-dynamic";

export default function GeneratedPreviewPage({ params }: { params: { projectId: string } }) {
  return (
    <main className="generated-preview">
      <nav className="luxora-nav">
        <strong>LUXORA</strong>
        <span>Home</span>
        <span>Rooms</span>
        <span>Experiences</span>
        <span>About Us</span>
        <span>Contact</span>
        <button>Book Now</button>
      </nav>
      <section className="hero">
        <p className="eyebrow">Generated preview · {params.projectId}</p>
        <h1>Your Escape<br />Awaits</h1>
        <p>Experience unparalleled luxury and unforgettable moments.</p>
        <div className="actions">
          <button>Book Your Stay</button>
          <button className="ghost">Explore Rooms</button>
        </div>
      </section>
      <section className="booking">
        <span><small>Check In</small>May 24, 2024</span>
        <span><small>Check Out</small>May 27, 2024</span>
        <span><small>Guests</small>2 Adults, 1 Child</span>
        <span><small>Room</small>1 Suite</span>
        <button>Check Availability</button>
      </section>
      <style>{`
        *{box-sizing:border-box}body{margin:0}.generated-preview{min-height:100vh;color:white;font-family:Inter,system-ui,sans-serif;overflow:hidden;background:linear-gradient(90deg,rgba(6,11,32,.96),rgba(6,11,32,.3)),radial-gradient(circle at 82% 24%,rgba(236,172,72,.95),transparent 13%),linear-gradient(135deg,#061228,#172b58 45%,#783a36 70%,#d29345);position:relative}.generated-preview:after{content:"";position:absolute;inset:50% -8% -14%;background:rgba(255,255,255,.08);transform:skewY(-8deg)}.luxora-nav{position:relative;z-index:2;display:flex;align-items:center;gap:28px;padding:26px 38px;font-size:13px}.luxora-nav strong{font-size:18px;letter-spacing:.08em;margin-right:22px}.luxora-nav button{margin-left:auto;background:#f1bd5d;color:#241a13;border:0;border-radius:10px;padding:12px 18px;font-weight:900}.hero{position:relative;z-index:2;padding:72px 58px 130px;max-width:660px}.eyebrow{text-transform:uppercase;letter-spacing:.16em;font-size:12px;color:rgba(255,255,255,.7)}h1{font-family:Georgia,serif;font-weight:500;font-size:72px;line-height:1.02;margin:0 0 18px}.hero p:not(.eyebrow){font-size:20px;line-height:1.5;color:rgba(255,255,255,.82)}button{cursor:pointer}.actions button{margin-right:14px;border:0;border-radius:10px;padding:14px 20px;background:#d99a31;color:white;font-weight:900}.actions .ghost{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.28)}.booking{position:absolute;z-index:3;left:58px;right:58px;bottom:38px;display:grid;grid-template-columns:repeat(4,1fr) auto;background:white;color:#342a45;border-radius:12px;box-shadow:0 18px 38px rgba(6,11,32,.22);overflow:hidden}.booking span{padding:16px 18px;border-right:1px solid #eee9fb;font-weight:800}.booking small{display:block;color:#8b819d;font-size:11px;margin-bottom:4px}.booking button{margin:12px;background:#d99a31;color:white;border:0;border-radius:9px;padding:12px 16px;font-weight:900}@media(max-width:700px){.luxora-nav span{display:none}.hero{padding:44px 28px 130px}h1{font-size:48px}.booking{left:20px;right:20px;grid-template-columns:1fr 1fr}.booking button{grid-column:1/-1}}
      `}</style>
    </main>
  );
}
