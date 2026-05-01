const navItems = ["Home", "Projects", "Templates", "Design Studio", "Brand Kit", "Launch", "Learn"];
const recentProjects = [
  ["Luxury Booking Site", "Just now", "#42c878"],
  ["SaaS Dashboard", "2h ago", "#f0a529"],
  ["AI Landing Page", "1d ago", "#5d89ff"],
  ["Portfolio Website", "2d ago", "#6f8199"],
  ["E-commerce Store", "3d ago", "#f0992b"],
];
const buildTasks = [
  ["Create homepage", "Complete"],
  ["Design room listing page", "Complete"],
  ["Add booking flow", "In Progress"],
  ["Build backend", "Pending"],
  ["Connect database", "Pending"],
  ["Payment integration", "Pending"],
  ["Testing & optimization", "Pending"],
];
const activity = [
  ["Homepage design updated", "10:24 AM"],
  ["Room listing page created", "10:18 AM"],
  ["Booking flow designed", "10:12 AM"],
  ["Project created", "10:00 AM"],
];

function LuxoraPreview({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "luxora compact" : "luxora"}>
      <div className="luxora-nav"><b>LUXORA</b><span>Home</span><span>Rooms</span><span>Experiences</span><span>About Us</span><span>Contact</span><button>Book Now</button></div>
      <div className="luxora-copy"><h2>Your Escape<br />Awaits</h2><p>Experience unparalleled luxury and unforgettable moments.</p><div><button>Book Your Stay</button><button>Explore Rooms</button></div></div>
      {!compact ? <div className="booking"><span><small>Check In</small>May 24, 2024</span><span><small>Check Out</small>May 27, 2024</span><span><small>Guests</small>2 Adults, 1 Child</span><span><small>Room</small>1 Suite</span><button>Check Availability</button></div> : null}
    </div>
  );
}

export const dynamic = "force-dynamic";

export default function ProjectVibePage() {
  return (
    <main className="botomatic-reference-page">
      <aside className="sidebar">
        <div className="brand"><span className="logo">⬢</span><div><b>Botomatic</b><small>NEXUS</small></div></div>
        <button className="new-project">+ New Project</button>
        <nav>{navItems.map((item) => <button key={item} className={item === "Home" ? "active" : ""}>{item}</button>)}</nav>
        <section className="side-card"><h3>Recent Projects</h3>{recentProjects.map(([name, time, color]) => <div className="recent" key={name}><i style={{ background: color }} /> <span>{name}</span><small>{time}</small></div>)}<a>View all projects →</a></section>
        <section className="upgrade"><h3>Go Pro Anytime</h3><p>Unlock advanced features, team collaboration, and priority support.</p><button>Upgrade to Pro</button></section>
        <section className="user"><span>AJ</span><div><b>Alex Johnson</b><small>alex@example.com</small></div><small>⌄</small></section>
      </aside>
      <section className="workspace">
        <header className="topbar"><div className="title"><span>✦</span><div><h1>Vibe Mode</h1><p>Chat. Design. Build. Launch. All in one flow.</p></div></div><div className="devices"><button className="active">Desktop</button><button>Tablet</button><button>Mobile</button></div><div className="actions"><button>↶</button><button>?</button><button>Share</button><button className="launch">Launch App</button></div></header>
        <div className="grid">
          <section className="center">
            <div className="user-msg">Build me a modern booking website for a luxury hotel with a beautiful landing page.<small>10:24 AM</small></div>
            <div className="agent-msg"><p>I&apos;ve got you! I&apos;ll create a luxury hotel booking website with a stunning landing page.</p><div><span>✓ Understanding your idea</span><span>✓ Designing the UI</span><span>✓ Planning the features</span><span>◔ Building it all together</span></div><small>10:24 AM</small></div>
            <section className="preview-card"><p>Here&apos;s your live design. You can edit anything by clicking on it or tell me what to change.</p><div className="preview-toolbar"><button>✦ Edit</button><span>Desktop · Tablet · Mobile</span><span>Version 3 ⌄</span></div><LuxoraPreview /></section>
            <div className="suggestions"><span>Try saying:</span>{["Make it more minimal", "Change the color to emerald", "Add a video background", "Improve mobile view", "Add testimonials"].map((x) => <button key={x}>{x}</button>)}</div>
            <section className="input"><div><input placeholder="Ask anything… (e.g., add a pricing section, make the hero bolder, add dark mode)" /><button>➜</button></div><div>{["Improve Design", "Add Page", "Add Feature", "Connect Payments", "Run Tests", "Launch App"].map((x) => <button key={x}>{x}</button>)}</div></section>
          </section>
          <aside className="rail">
            <section className="panel build"><header><div><h3>Build Map</h3><p>Auto-updates as we build your app</p></div><a>View Audit →</a></header><div className="steps"><span className="done">Design<small>Complete</small></span><span className="active">Features<small>In Progress</small></span><span>Data<small>Pending</small></span><span>Testing<small>Pending</small></span><span>Launch<small>Pending</small></span></div>{buildTasks.map(([task, status]) => <div className="task" key={task}><span>{task}</span><b>{status}</b></div>)}</section>
            <div className="two"><section className="panel"><header><h3>Live Preview</h3><b className="live">Live</b></header><LuxoraPreview compact /><div className="icons">▣ ☁ □ ⛶</div></section><section className="panel health"><header><h3>App Health</h3><span>•••</span></header><div className="ring">92%<small>Excellent</small></div>{["Performance", "Security", "SEO", "Best Practices"].map((x) => <div className="score" key={x}><span>{x}</span><b>Good</b></div>)}<a>View full report →</a></section></div>
            <section className="panel next"><h3>What&apos;s Next</h3><p>Recommended next actions to complete your app</p><div>{["Connect Domain", "Add Logo", "Payment Setup", "Email Notifications"].map((x) => <button key={x}>{x}<small>Setup →</small></button>)}</div></section>
            <div className="two bottom"><section className="panel"><h3>Recent Activity</h3>{activity.map(([a, t]) => <div className="score" key={a}><span>{a}</span><small>{t}</small></div>)}<a>View all activity →</a></section><section className="panel launch-card"><h3>One-Click Launch</h3><p>Everything looks good. Your app is ready to launch locally.</p><button>Launch My App</button><div>Preview&nbsp;&nbsp;&nbsp; Test&nbsp;&nbsp;&nbsp; Deploy</div></section></div>
          </aside>
        </div>
      </section>
      <style>{`
        *{box-sizing:border-box} body{margin:0;background:#fbfbff;color:#241a3d;font-family:Inter,system-ui,sans-serif;overflow:hidden}.botomatic-reference-page{height:100vh;display:grid;grid-template-columns:224px 1fr;gap:18px;padding:18px;background:#fbfbff}.sidebar{display:flex;flex-direction:column;gap:16px;min-height:0}.brand{display:flex;gap:12px;align-items:center}.brand b,.brand small{display:block}.brand small{color:#786a98;letter-spacing:.14em;font-weight:800;font-size:11px}.logo{width:38px;height:38px;border-radius:12px;background:linear-gradient(135deg,#7c4dff,#5b2be0);color:#fff;display:grid;place-items:center}.new-project,.launch{background:linear-gradient(135deg,#7c4dff,#5b2be0);color:#fff;box-shadow:0 14px 30px rgba(98,57,255,.22)}button{border:0;border-radius:9px;background:#fff;color:#4c4265;padding:10px 12px;font-weight:800;cursor:pointer}nav{display:grid;gap:6px}nav button{text-align:left;background:transparent}nav .active{color:#5b2be0;background:#eee8ff}.side-card,.upgrade,.user,.panel,.preview-card,.input{background:#fff;border:1px solid #ece8fb;border-radius:14px;box-shadow:0 16px 40px rgba(57,43,105,.07)}.side-card{padding:14px;display:grid;gap:10px}.side-card h3,.upgrade h3{font-size:12px;text-transform:uppercase;color:#9a91ad;letter-spacing:.08em;margin:0}.recent{display:grid;grid-template-columns:14px 1fr auto;gap:8px;font-size:12px;color:#4d4567}.recent i{width:14px;height:14px;border-radius:4px}.recent small,.upgrade p,.user small{color:#8b819d}.side-card a,.panel a{color:#6332e8;font-weight:900;font-size:12px}.upgrade{margin-top:auto;padding:16px}.upgrade button{width:100%;background:linear-gradient(135deg,#7c4dff,#5b2be0);color:white}.user{display:grid;grid-template-columns:34px 1fr auto;gap:10px;align-items:center;padding:10px}.user>span{width:34px;height:34px;border-radius:99px;background:#241a3d;color:white;display:grid;place-items:center}.workspace{min-width:0;overflow:auto}.topbar{display:grid;grid-template-columns:1fr auto auto;align-items:center;gap:18px;margin-bottom:18px}.title{display:flex;gap:10px}.title span{color:#6332e8}.title h1{font-size:22px;margin:0}.title p{font-size:12px;color:#746988;margin:4px 0}.devices{display:flex;gap:2px;padding:5px;border:1px solid #ece8fb;border-radius:16px;background:white}.devices button{font-size:12px}.devices .active{color:#6332e8;background:#f1ebff}.actions{display:flex;gap:10px}.grid{display:grid;grid-template-columns:minmax(560px,1.15fr) minmax(370px,.85fr);gap:18px}.center{display:grid;gap:16px}.user-msg{justify-self:end;max-width:520px;background:linear-gradient(135deg,#7c4dff,#5b2be0);color:white;border-radius:18px;padding:16px 18px;box-shadow:0 18px 42px rgba(98,57,255,.22)}.agent-msg{justify-self:start;max-width:630px;background:white;border:1px solid #ece8fb;border-radius:18px;padding:16px 18px;box-shadow:0 16px 42px rgba(57,43,105,.07)}.user-msg small,.agent-msg small{display:block;text-align:right;margin-top:8px;opacity:.65;font-size:10px}.agent-msg div{display:flex;gap:8px;flex-wrap:wrap}.agent-msg span{font-size:11px;border:1px solid #eee9fb;background:#faf9ff;border-radius:8px;padding:8px 10px;font-weight:800}.preview-card{padding:18px}.preview-card>p{margin:0 0 14px;color:#4d4567}.preview-toolbar{display:flex;justify-content:space-between;margin-bottom:10px;font-size:11px;color:#6c627d}.preview-toolbar>*{border:1px solid #ede8fb;border-radius:99px;padding:7px 10px;background:white}.luxora{position:relative;min-height:330px;border-radius:14px;overflow:hidden;color:white;background:linear-gradient(90deg,rgba(6,11,32,.92),rgba(6,11,32,.3)),radial-gradient(circle at 82% 25%,rgba(236,172,72,.92),transparent 13%),linear-gradient(135deg,#061228,#172b58 45%,#783a36 70%,#d29345)}.luxora:after{content:"";position:absolute;inset:48% -8% -12%;background:rgba(255,255,255,.08);transform:skewY(-8deg)}.luxora-nav{position:relative;z-index:2;display:flex;align-items:center;gap:22px;padding:18px 26px;font-size:11px}.luxora-nav button{margin-left:auto;background:#f1bd5d;color:#241a13}.luxora-copy{position:relative;z-index:2;padding:36px 36px 90px;max-width:470px}.luxora-copy h2{font-family:Georgia,serif;font-weight:500;font-size:38px;line-height:1.05;margin:0}.luxora-copy p{color:rgba(255,255,255,.82)}.luxora-copy button:first-child,.booking button{background:#d99a31;color:white}.luxora-copy button{margin-right:10px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.22);color:white}.booking{position:absolute;z-index:3;left:38px;right:38px;bottom:24px;display:grid;grid-template-columns:repeat(4,1fr) auto;background:white;color:#342a45;border-radius:10px;box-shadow:0 18px 38px rgba(6,11,32,.22);overflow:hidden}.booking span{padding:12px 16px;border-right:1px solid #eee9fb}.booking small{display:block;color:#8b819d;font-size:10px}.booking button{margin:10px}.compact{min-height:150px}.compact .luxora-nav{font-size:6px;gap:8px;padding:10px}.compact .luxora-copy{padding:18px}.compact .luxora-copy h2{font-size:21px}.compact .booking{display:none}.suggestions,.input>div:nth-child(2){display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.suggestions span{color:#6332e8;font-size:11px;font-weight:900}.suggestions button,.input button{font-size:11px;border:1px solid #ede8fb}.input{padding:13px}.input>div:first-child{display:flex}.input input{flex:1;border:0;outline:0}.input>div:first-child button{background:#6332e8;color:white}.rail{display:grid;gap:12px}.panel{padding:14px}.panel header{display:flex;justify-content:space-between;gap:12px}.panel h3{margin:0;font-size:13px}.panel p{font-size:11px;color:#80758e;margin:4px 0}.steps{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin:18px 0}.steps span{text-align:center;font-size:11px;font-weight:900}.steps span:before{content:"";display:block;width:28px;height:28px;margin:0 auto 7px;border-radius:99px;background:#f4f1fb;border:1px solid #ded7f3}.steps .done:before{background:#41b978}.steps .active:before{background:#5b2be0}.steps small{display:block;color:#9a91ad}.task,.score{display:flex;justify-content:space-between;font-size:12px;color:#554c68;padding:5px 0}.task:before{content:"✓";color:#3eb875}.task b,.live,.score b{color:#45a96b}.two{display:grid;grid-template-columns:1fr 1fr;gap:12px}.icons{margin-top:9px;color:#776c8a}.ring{width:96px;height:96px;margin:10px auto;border-radius:99px;border:7px solid #91d6aa;display:grid;place-items:center;font-size:26px;font-weight:900}.ring small{display:block;font-size:10px;color:#50aa6d}.next>div{display:grid;grid-template-columns:repeat(4,1fr);gap:9px}.next button{text-align:left;min-height:70px;border:1px solid #ede8fb}.next small{display:block;color:#6332e8;margin-top:8px}.launch-card{background:linear-gradient(135deg,#7c4dff,#5b2be0);color:white}.launch-card p{color:rgba(255,255,255,.82)}.launch-card button{width:100%;color:#5b2be0}.launch-card div{text-align:center;font-size:11px;opacity:.9}@media(max-width:1100px){.botomatic-reference-page{grid-template-columns:1fr;overflow:auto}.grid{grid-template-columns:1fr}.topbar{grid-template-columns:1fr}.two{grid-template-columns:1fr}}
      `}</style>
    </main>
  );
}
