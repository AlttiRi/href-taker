const global = typeof unsafeWindow === "object" ? unsafeWindow.globalThis : globalThis;

export function addCSS(cssText, target = document.head) {
    if (typeof GM_addElement === "function") {
        return GM_addElement(target, "style", {textContent: cssText});
    }
    const styleElem = document.createElement("style");
    styleElem.textContent = cssText;
    target.append(styleElem);
    return styleElem;
}


function getLocalStoragePropertyDescriptor() {
    const iframe = document.createElement("iframe");
    document.head.append(iframe);
    const pd = Object.getOwnPropertyDescriptor(iframe.contentWindow, "localStorage");
    iframe.remove();
    return pd;
}
export const localStorage = global.localStorage || getLocalStoragePropertyDescriptor().get.call(global);

/**
 * @param {object} object - an object
 * @param {string} [namespace = "hreftaker"] - a global value with props
 */
export function setGlobalValue(object, namespace = "hreftaker") {
    let target = global[namespace];
    if (!target) {
        if (namespace !== "") {
            global[namespace] = {};
            target = global[namespace];
        } else {
            target = global;
        }
    }
    Object.assign(target, object);
}
