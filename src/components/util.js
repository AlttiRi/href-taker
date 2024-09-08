import {hashString, sleep} from "@alttiri/util-js";

/**
 * Removes `<style>` and `</style>` tags are required for IDE syntax highlighting.
 * @example
 * const cssText = cssFromStyle`
 * <style>
 * #some-id {
 *     display: flex;
 *     justify-content: center;
 * }
 * </style>`;
 * @param textParts
 * @param values
 * @return {*}
 */
export function cssFromStyle(textParts, ...values) {
    values.push("");
    const fullText = textParts.reduce((pre, cur, index) => {
        return pre + cur + values[index];
    }, "");
    return fullText.replace(/^\s*<style>\n?/, "").replace(/\s*<\/style>\s*$/, "");
}

export async function clicked(elem) {
    elem.classList.add("clicked");
    elem.blur();
    await sleep(125);
    elem.classList.remove("clicked");
}

/**
 * Return the hash of url list.
 * Only unique URLs are counted, order-independently.
 * @param {string[]} urls
 * @return {string} hexes
 * */
export function hashUrls(urls) {
    const joinedUrls = [...new Set(urls)].sort().join(" ");
    return Math.abs(hashString(joinedUrls)).toString(16).slice(-8).padStart(8, "0").toUpperCase();
}


/** @param {string[]} urls */
export function getListHostname(urls) {
    if (!urls.length) {
        return "";
    }
    const firstHostname = getMainHostname(urls[0]);
    if (urls.length === 1) {
        return firstHostname;
    }
    for (const url of urls) {
        if (firstHostname !== getMainHostname(url)) {
            return "";
        }
    }
    return firstHostname;
}
/** @param {string} url */
export function getMainHostname(url) {
    const hostname = new URL(url).hostname;
    return hostname.split(".").slice(-2).join(".");
}

/**
 * Return string starts with "-" if any mode exists
 * @param {ScriptSettings} settings
 */
export function getListMods(settings) {
    let mods = "-";
    if (settings.sort) {
        mods += "S";
    } else if (settings.hostname_sort) {
        mods += "HS";
    }
    if (settings.reverse) {
        mods += "R";
    }
    if (mods.length === 1) {
        mods = "";
    }
    return mods;
}
