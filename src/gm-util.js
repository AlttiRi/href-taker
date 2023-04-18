export const global = typeof unsafeWindow === "object" ? unsafeWindow.globalThis : globalThis;
export function addCSS(cssText, target = document.head) {
    if (typeof GM_addElement === "function") {
        return GM_addElement(target, "style", {textContent: cssText});
    }
    const styleElem = document.createElement("style");
    styleElem.textContent = cssText;
    target.append(styleElem);
    return styleElem;
}
