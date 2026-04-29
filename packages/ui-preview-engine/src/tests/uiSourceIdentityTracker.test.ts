import assert from "assert";
import { trackUISourceIdentities } from "../uiSourceIdentityTracker";

const project = {
  "app/a.tsx": `export default function Home(){ return <main><h1>Hello</h1></main>; }\nexport const Card = () => <section data-x="1">X</section>;`,
  "app/b.tsx": `export const Named = function Named(){ return <div><span>ok</span></div>; }`
};
const first = trackUISourceIdentities(project);
const second = trackUISourceIdentities(project);
assert(first.identities.length > 0);
assert.deepStrictEqual(first.identities.map((i) => i.identityId), second.identities.map((i) => i.identityId));
assert(first.identities.some((i) => i.exportName === "default"));
assert(first.identities.some((i) => i.exportName === "named"));
const malformed = trackUISourceIdentities({ "broken.tsx": "export default () => <div>" });
assert(malformed.issues.length > 0);
console.log("uiSourceIdentityTracker.test.ts passed");
