import fs from "fs";
import path from "path";

const root = process.cwd();
const dist = path.join(root, "dist");
const src = path.join(root, "src", "index.html");
fs.mkdirSync(dist, { recursive: true });
fs.copyFileSync(src, path.join(dist, "index.html"));
console.log("build_complete");
