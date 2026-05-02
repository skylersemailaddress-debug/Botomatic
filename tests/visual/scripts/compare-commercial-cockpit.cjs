const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");
const pixelmatch = require("pixelmatch");

const root = process.cwd();

const cases = [
  {
    name: "vibe-chromebook",
    reference: "tests/visual/reference/vibe-chromebook.png",
    current: "tests/visual/current/vibe-chromebook.png",
    diff: "tests/visual/diff/vibe-chromebook.diff.png",
  },
  {
    name: "pro-chromebook",
    reference: "tests/visual/reference/pro-chromebook.png",
    current: "tests/visual/current/pro-chromebook.png",
    diff: "tests/visual/diff/pro-chromebook.diff.png",
  },
];

const threshold = Number(process.env.VISUAL_DIFF_THRESHOLD || "0.025");

function readPng(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    throw new Error(`Missing PNG: ${rel}`);
  }
  return PNG.sync.read(fs.readFileSync(full));
}

let failures = 0;

for (const item of cases) {
  const reference = readPng(item.reference);
  const current = readPng(item.current);

  if (reference.width !== current.width || reference.height !== current.height) {
    throw new Error(
      `${item.name}: size mismatch reference=${reference.width}x${reference.height} current=${current.width}x${current.height}`
    );
  }

  const diff = new PNG({ width: reference.width, height: reference.height });
  const mismatched = pixelmatch(
    reference.data,
    current.data,
    diff.data,
    reference.width,
    reference.height,
    { threshold: 0.1 }
  );

  fs.mkdirSync(path.dirname(path.join(root, item.diff)), { recursive: true });
  fs.writeFileSync(path.join(root, item.diff), PNG.sync.write(diff));

  const total = reference.width * reference.height;
  const ratio = mismatched / total;

  console.log(
    `${item.name}: mismatched=${mismatched}/${total} ratio=${(ratio * 100).toFixed(3)}% threshold=${(threshold * 100).toFixed(3)}%`
  );

  if (ratio > threshold) failures += 1;
}

if (failures > 0) {
  console.error(`Visual diff failed: ${failures} case(s) exceeded threshold.`);
  process.exit(1);
}

console.log("Commercial cockpit pixel diff passed.");
