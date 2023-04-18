import fs from "node:fs/promises";
import {createHash} from "node:crypto";
import {rollup} from "rollup";


const bundle = await rollup({
  input: "./src/main.js",
});
const bundles = await bundle.generate({});
const code = bundles.output[0].code;

const hash = createHash("sha1").update(code).digest("hex").slice(0, 6);
const version = await bumpSemVerIfHashChanged(hash);
console.log(version);

const banner = `// ==UserScript==
// @name        HrefTaker
// @version     ${version}
// @namespace   gh.alttiri
// @description URL grabber popup
// @license     GPL-3.0
// @homepageURL https://github.com/AlttiRi/href-taker
// @supportURL  https://github.com/AlttiRi/href-taker/issues
// @match       *://*/*
// @grant       GM_registerMenuCommand
// @grant       GM_addElement
// @noframes
// ==/UserScript==\n\n\n`;

await fs.stat("./dist").catch(() => fs.mkdir("./dist"));
await fs.writeFile("./dist/href-taker.user.js", banner + code, {});


async function bumpSemVerIfHashChanged(hash) {
  const packageJsonText = await fs.readFile("./package.json", {encoding: "utf8"});
  const packageJson = JSON.parse(packageJsonText);
  const {
    major = "", minor = "", patch = "", other = ""
  } = packageJson.version.match(/^(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)(?<other>.*)$/)?.groups || {};

  if (!packageJson.version.includes(hash)) {
    const date = new Date();
    const dateText = `${date.getUTCFullYear()}.${date.getUTCMonth() + 1}.${date.getUTCDate()}`;
    const newVersion = `${[major, minor, Number(patch) + 1].join(".")}-${dateText}${hash ? "-" + hash : ""}`;
    const newPackageJsonText = packageJsonText.replace(`"version": "${packageJson.version}"`, `"version": "${newVersion}"`);
    await fs.writeFile("./package.json", newPackageJsonText);
    return newVersion;
  }
  return packageJson.version;
}
