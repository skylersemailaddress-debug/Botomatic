import fs from "fs";
import os from "os";
import path from "path";

export function createLocalApplyFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ui-local-apply-"));
  fs.mkdirSync(path.join(root, "app"), { recursive: true });
  fs.mkdirSync(path.join(root, "components"), { recursive: true });
  fs.writeFileSync(path.join(root, "app/page.tsx"), "export default function Page(){return <main>Home</main>;}");
  fs.writeFileSync(path.join(root, "app/layout.tsx"), "export default function Layout({children}:{children:React.ReactNode}){return <html><body>{children}</body></html>;}");
  fs.writeFileSync(path.join(root, "components/Hero.tsx"), "export function Hero(){return <section>Hero</section>;}");
  return { root };
}
