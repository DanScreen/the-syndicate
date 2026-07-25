#!/usr/bin/env node
// Tags the commit behind the latest finished EAS build so `git log` can answer
// "what's live as build N" without cross-referencing expo.dev.
//
// Usage: node scripts/tag-release.js <ios|android> [profile]
//   node scripts/tag-release.js ios            # profile defaults to production
//   node scripts/tag-release.js android preview
//
// Creates (but does not push) an annotated tag: mobile-<platform>-v<version>-b<buildNumber>
// Review the tag, then `git push origin <tag>` yourself.

const { execFileSync } = require("node:child_process");

const platform = process.argv[2];
const profile = process.argv[3] ?? "production";

if (platform !== "ios" && platform !== "android") {
  console.error("Usage: node scripts/tag-release.js <ios|android> [profile]");
  process.exit(1);
}

function run(cmd, args) {
  return execFileSync(cmd, args, { encoding: "utf8" }).trim();
}

const listJson = run("npx", [
  "eas-cli",
  "build:list",
  "--platform",
  platform,
  "--profile",
  profile,
  "--status",
  "finished",
  "--limit",
  "1",
  "--non-interactive",
  "--json",
]);

const builds = JSON.parse(listJson);
const build = builds[0];
if (!build) {
  console.error(`No finished ${profile} build found for ${platform}.`);
  process.exit(1);
}

const version = build.appVersion;
const buildNumber = build.appBuildVersion;
const commit = build.gitCommitHash;

if (!version || !buildNumber || !commit) {
  console.error("Build is missing appVersion/appBuildVersion/gitCommitHash — inspect `eas build:list --json` output.");
  process.exit(1);
}

const tag = `mobile-${platform}-v${version}-b${buildNumber}`;

console.log(`Build ${build.id}: version ${version}, build ${buildNumber}, commit ${commit}`);
console.log(`Creating tag ${tag} -> ${commit}`);

run("git", [
  "tag",
  "-a",
  tag,
  commit,
  "-m",
  `${platform} ${profile} build ${buildNumber} (v${version}) — https://expo.dev/accounts/the-syndicate/projects/tiki-acca/builds/${build.id}`,
]);

console.log(`Tagged. Push it with: git push origin ${tag}`);
