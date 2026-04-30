import assert from "assert";
import { normalizeUIPlatformBuilderKind, normalizeUIPlatformFramework, normalizeUIPlatformProjectSlug, normalizeUIPlatformTarget } from "../uiPlatformTargetNormalizer";
assert.equal(normalizeUIPlatformTarget("iphone"),"ios"); assert.equal(normalizeUIPlatformTarget("play-store"),"android"); assert.equal(normalizeUIPlatformTarget("mobile"),"mobile-web"); assert.equal(normalizeUIPlatformTarget("browser"),"desktop-web"); assert.equal(normalizeUIPlatformTarget("roblox-experience"),"roblox"); assert.equal(normalizeUIPlatformTarget("steam-game"),"steam"); assert.equal(normalizeUIPlatformTarget("html5-game"),"web-game"); assert.equal(normalizeUIPlatformTarget("wat"),"unknown");
assert.equal(normalizeUIPlatformBuilderKind("rn"),"react-native"); assert.equal(normalizeUIPlatformFramework("nextjs"),"next");
assert.equal(normalizeUIPlatformProjectSlug("  My !! Project  "),"my-project");
console.log("uiPlatformTargetNormalizer.test.ts passed");
