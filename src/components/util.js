import {sleep} from "@alttiri/util-js";

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
