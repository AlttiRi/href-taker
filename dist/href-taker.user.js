// ==UserScript==
// @name        HrefTaker
// @version     0.15.0-2024.9.8-4027
// @namespace   gh.alttiri
// @description URL grabber popup
// @license     GPL-3.0
// @homepageURL https://github.com/AlttiRi/href-taker
// @supportURL  https://github.com/AlttiRi/href-taker/issues
// @match       *://*/*
// @grant       GM_registerMenuCommand
// @grant       GM_addElement
// @noframes
// ==/UserScript==


const global = typeof unsafeWindow === "object" ? unsafeWindow.globalThis : globalThis;

/**
 * @param {string} cssText
 * @param {HTMLElement} target
 * @return {HTMLStyleElement}
 */
function addCSS(cssText, target = document.head) {
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

/** @type {Storage} */
const localStorage = global.localStorage || getLocalStoragePropertyDescriptor().get.call(global);

/**
 * @param {object} object - an object
 * @param {string} [namespace = "hreftaker"] - a global value with props
 */
function setGlobalValue(object, namespace = "hreftaker") {
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

const debug = location.pathname === "/href-taker/demo.html" && ["localhost", "alttiri.github.io"].some(h => location.hostname === h);

/**
 * @typedef {object | null} ScriptSettings
 * @property {string}  input_only
 * @property {boolean} input_only_disabled
 * @property {string}  input_ignore
 * @property {boolean} input_ignore_disabled
 * @property {boolean} include_media
 * @property {boolean} include_text_url
 * @property {boolean} only_text_url
 * @property {boolean} console_log
 * @property {boolean} console_vars
 * @property {boolean} unique
 * @property {boolean} sort
 * @property {boolean} hostname_sort
 * @property {boolean} reverse
 * @property {boolean} ignore_first_party
 * @property {string}  input_selector
 * @property {boolean} input_selector_disabled
 * @property {boolean} https
 * @property {boolean} auto_open
 * @property {boolean} auto_list
 * @property {boolean} minimized
 * @property {boolean} brackets_trim
 * @property {boolean} opened
 * @property {boolean} reverse_input_only
 * @property {boolean} case_sensitive
 * @property {boolean} hide_prefix
 * @property {boolean} show_tags
 * @property {boolean} auto_tags
 * @property {boolean} tags_collapsed
 * @property {boolean} filters_collapsed
 * @property {boolean} controls_collapsed
 * @property {boolean} no_search_on_blur
 * @property {boolean} unsearchable
 * @property {string}  insert_place
 * @property {boolean} keep_in_storage
 * @property {boolean} append_on_hover
 * @property {boolean} sort_tags_by_name
 * @property {boolean} clear_store_on_close
 */

/** @return {{settings: ScriptSettings, updateSettings: (ss: Partial<ScriptSettings>) => string[]}} */
function loadSettings() {
    /** @type {ScriptSettings} */
    const defaultSettings = {
        input_only: "",
        input_only_disabled: false,
        input_ignore: "",
        input_ignore_disabled: false,
        include_media: false,
        include_text_url: true,
        only_text_url: false,
        console_log: debug,
        console_vars: debug,
        unique: true,
        sort: false,
        hostname_sort: false,
        reverse: false,
        ignore_first_party: false,
        input_selector: "body",
        input_selector_disabled: false,
        https: true,
        auto_open: false,
        auto_list: true,
        minimized: false,
        brackets_trim: true,
        opened: debug,
        reverse_input_only: false,
        case_sensitive: false,
        hide_prefix: true,
        show_tags: true,
        auto_tags: false,
        tags_collapsed: true,
        filters_collapsed: false,
        controls_collapsed: false,
        no_search_on_blur: false,
        unsearchable: false,
        insert_place: "html",
        keep_in_storage: false,
        append_on_hover: false,
        sort_tags_by_name: false,
        clear_store_on_close: true,
    };
    const LocalStoreName = "ujs-href-taker";

    /** @type {Partial<ScriptSettings>} */
    let savedSettings;
    try {
        savedSettings = JSON.parse(localStorage.getItem(LocalStoreName)) || {};
    } catch (e) {
        console.error("[ujs][href-taker]", e);
        localStorage.removeItem(LocalStoreName);
        savedSettings = {};
    }
    const settings = Object.assign(defaultSettings, savedSettings);

    const str = input => JSON.stringify(input);
    function updateSettings(newSettings, callback) {
        /** @type {string[]} */
        const changedKeys = [];
        for (const [key, newValue] of Object.entries(newSettings)) {
            if (settings[key] === undefined && newValue !== undefined) {
                changedKeys.push(key);
            } else
            if (typeof newValue === "object" && str(settings[key]) !== str(newValue)) {
                changedKeys.push(key);
            } else
            if (settings[key] !== newValue) {
                changedKeys.push(key);
            }
        }
        if (changedKeys.length) {
            Object.assign(settings, newSettings);
            localStorage.setItem(LocalStoreName, JSON.stringify(settings));
            callback?.(settings, changedKeys);
        }
        return changedKeys;
    }

    return {
        settings,
        updateSettings
    };
}

/**
 * Java's `hashCode` like.
 * @example
 * hashString("Lorem Ipsum") === -488052133
 * hashString("Qwerty") === -1862984904
 * hashString("A") === 65
 * hashString("👾👽💀") === -2019372252
 * @param {string} str
 * @return {number}
 */
function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = Math.imul(Math.imul(31, hash) + str.charCodeAt(i), 1);
    }
    return hash;
}

/** A classic `debounce` wrap function. */
function debounce(runnable, ms = 50, scope) {
    let timerId;
    return function debounced() {
        if (timerId !== undefined) {
            clearTimeout(timerId);
        }
        const delayed = () => {
            runnable.apply(this, arguments);
            timerId = undefined;
        };
        timerId = setTimeout(delayed, ms);
    };
}

// @ts-ignore
const __setImmediate = typeof globalThis.setImmediate === "function" ? globalThis.setImmediate : null;
const setImmediate = __setImmediate || /*#__PURE__*/ (function () {
    const { port1, port2 } = new MessageChannel();
    const queue = [];
    port1.onmessage = function () {
        const callback = queue.shift();
        callback();
    };
    return function setImmediateLike(callback) {
        port2.postMessage(null);
        queue.push(callback);
    };
})();
/**
 * Sleeps `ms` milliseconds.
 * If param is `undefined` it sleeps until the next macro-task.
 * Note: With `0` real ms will be `4`+ ms.
 * @param {number?} ms
 * */
function sleep(ms) {
    if (ms === undefined) {
        return new Promise(resolve => setImmediate(resolve));
    }
    return new Promise(resolve => setTimeout(resolve, ms));
}

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
function cssFromStyle(textParts, ...values) {
    values.push("");
    const fullText = textParts.reduce((pre, cur, index) => {
        return pre + cur + values[index];
    }, "");
    return fullText.replace(/^\s*<style>\n?/, "").replace(/\s*<\/style>\s*$/, "");
}

async function clicked(elem) {
    elem.classList.add("clicked");
    elem.blur();
    await sleep(125);
    elem.classList.remove("clicked");
}

function getWrapper() {
    const wrapperHtml = `<div id="shadow-content-wrapper"></div>`;

    const wrapperCss = cssFromStyle`
<style>
#shadow-content-wrapper {
    display: flex;
    margin-top: 40px;
    justify-content: center;
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    pointer-events: none;
    z-index: 99999;
    font-size: 16px;
    font-family: serif;
}
#shadow-content-wrapper > * {
    pointer-events: all;
}
button, .button {
    min-width: 24px;
    background-color: white;
    border: 1px solid gray;
    padding: 2px;
    border-radius: 3px;
    outline: none !important;
}
button:focus:not(.button-no-outline), .button:focus:not(.button-no-outline) {
    border: 1px solid black;
}

button:hover, .button:hover {
    background-color: rgba(0, 0, 0, 0.03);
}
button:active:focus, .button:active:focus {
    background-color: rgba(0, 0, 0, 0.1);
}
button.clicked, .button.clicked {
    background-color: rgba(0, 0, 0, 0.1);
}

button.active, .button.active {
    background-color: rgba(0, 0, 0, 0.05);
}

</style>`;

    return {wrapperHtml, wrapperCss};
}

/**
 * @param {object} opt
 * @param {ScriptSettings} opt.settings
 * @param {(ss: Partial<ScriptSettings>) => string[]} opt.updateSettings
 * @param {Wrapper} opt.wrapper
 */
function initWrapper({settings, updateSettings, wrapper}) {
    const {wrapperHtml, wrapperCss} = getWrapper();

    addCSS(cssFromStyle`
    <style>
        #href-taker-outer-shadow-wrapper {
            opacity: 1;
            transition: opacity 0.2s;
        }
        #href-taker-outer-shadow-wrapper.minimized.no-hover {
            opacity: 0;
            transition: opacity 0.3s 0.2s;
        }
    </style>`);
    document.documentElement.addEventListener("pointerleave", () =>
        wrapper.element?.classList.add("no-hover"));
    document.documentElement.addEventListener("pointerenter", () =>
        wrapper.element?.classList.remove("no-hover"));


    let shadowContainer = null;
    const querySelector    = selector => shadowContainer.querySelector(selector);
    const querySelectorAll = selector => [...shadowContainer.querySelectorAll(selector)];

    const insertSelector = settings.insert_place;
    function renderShadowContainer() {
        const insertPlace   = document.querySelector(insertSelector);
        const shadowWrapper = document.createElement("div");
        shadowWrapper.setAttribute("id", "href-taker-outer-shadow-wrapper");
        shadowWrapper.attachShadow({mode: "open"});
        shadowWrapper.shadowRoot.innerHTML = wrapperHtml;
        wrapper.element = shadowWrapper;
        if (insertSelector === "html") {
            insertPlace.append(shadowWrapper);
        } else { // "body", ...
            insertPlace.prepend(shadowWrapper);
        }

        shadowContainer = shadowWrapper.shadowRoot.querySelector("#shadow-content-wrapper");
        addCSS(wrapperCss, shadowContainer);
        updateSettings({opened: true});
    }
    function closeShadowContainer() {
        document.querySelector(`${insertSelector} > #href-taker-outer-shadow-wrapper`)?.remove();
        shadowContainer = null;
        updateSettings({opened: false});
    }
    function initShadowContainer() {
        if (!shadowContainer) {
            renderShadowContainer();
        }
        return shadowContainer;
    }

    function isShadowContainerInited() {
        return Boolean(shadowContainer);
    }

    Object.assign(wrapper, {
        querySelector, querySelectorAll,
        initShadowContainer,
        closeShadowContainer,
        isShadowContainerInited,
    });
}

/** @typedef {"top" | "left"} MoveStyleProps */
/** @typedef {Record<MoveStyleProps, string>} MoveState  */

/** @typedef {"width" | "height"} ResizeStyleProps */
/** @typedef {Record<ResizeStyleProps, string>} ResizeState */

/** @typedef {MoveStyleProps | ResizeStyleProps} AnyStyleProps */
/** @typedef {MoveState | ResizeState} AnyState */

/**
 * @note
 * `addEventListener("pointerdown")` with `{passive: true}` is fine with ShadowDOM,
 * in other case use `event.preventDefault()` to prevent bugs when there is a selected text on the page.
 * Note, that using of `preventDefault` will prevent useful `focus` event, if you use `tabindex="-1"` on the element.
 */

/**
 * @param {HTMLElement} element
 * @param {AnyState} state
 */
function assignStyleState(element, state) {
    for (const [k, v] of Object.entries(state)) {
        element.style[k]  = v;
    }
}

/**
 * @param {HTMLElement} element
 * @param {object?} opts
 * @param {HTMLElement} [opts.handle]
 * @param {(state: MoveState) => void} [opts.onStop]
 * @param {(state: MoveState) => void} [opts.onMove]
 * @param {MoveState} [opts.state]
 */
function makeMovable(element, {handle, onStop: _onStop, onMove, state} = {}) {
    const _onMove = state => {
        onMove?.(state);
        assignStyleState(element, state);
    };
    if (state) {
        _onMove(state);
        _onStop?.(state);
    }

    const _handle = handle || element;
    _handle.style.userSelect  = "none";
    _handle.style.touchAction = "none";
    element.style.position    = "absolute";

    _handle.addEventListener("pointerdown", event => {
        const offsetY = event.clientY - parseInt(getComputedStyle(element).top);
        const offsetX = event.clientX - parseInt(getComputedStyle(element).left);
        /** @type {MoveState} */
        let state;
        function onMove(event) {
            !_handle.hasPointerCapture(event.pointerId) && _handle.setPointerCapture(event.pointerId);
            state = {
                top:  (event.clientY - offsetY) + "px",
                left: (event.clientX - offsetX) + "px",
            };
            _onMove(state);
        }
        function onEnd() {
            removeEventListener("pointermove", onMove);
            state && _onStop?.(state);
        }
        addEventListener("pointermove", onMove, {passive: true});
        addEventListener("pointerup", onEnd, {once: true});
    }, {passive: true});
}

/**
 * @param {HTMLElement} element
 * @param {object?} opts
 * @param {number} [opts.minW]
 * @param {number} [opts.minH]
 * @param {number} [opts.size]
 * @param {(state: ResizeState) => void} [opts.onStop]
 * @param {(state: ResizeState) => void} [opts.onMove]
 * @param {ResizeState} [opts.state]
 */
function makeResizable(element, {
    minW = 32, minH = 32, size = 16, onStop: _onStop, onMove, state
} = {}) {
    const _onMove = state => {
        onMove?.(state);
        assignStyleState(element, state);
    };
    if (state) {
        _onMove(state);
        _onStop?.(state);
    }

    const lrCorner = document.createElement("div");
    lrCorner.style.cssText =
        `width: ${size}px; height: ${size}px; border-radius: ${(size / 2)}px;` +
        `bottom: ${-(size / 2)}px; right: ${-(size / 2)}px; ` +
        `position: absolute; background-color: transparent; cursor: se-resize; touch-action: none;`;
    element.append(lrCorner);

    lrCorner.addEventListener("pointerdown", event => {
        lrCorner.setPointerCapture(event.pointerId);
        const offsetX = event.clientX - element.offsetLeft - parseInt(getComputedStyle(element).width);
        const offsetY = event.clientY - element.offsetTop  - parseInt(getComputedStyle(element).height);
        /** @type {ResizeState} */
        let state;
        function onMove(event) {
            let x = event.clientX - element.offsetLeft - offsetX;
            let y = event.clientY - element.offsetTop  - offsetY;
            if (x < minW) { x = minW; }
            if (y < minH) { y = minH; }
            state = {
                width:  x + "px",
                height: y + "px",
            };
            _onMove(state);
        }
        function onEnd() {
            lrCorner.removeEventListener("pointermove", onMove);
            state && _onStop?.(state);
        }
        lrCorner.addEventListener("pointermove", onMove, {passive: true});
        lrCorner.addEventListener("lostpointercapture", onEnd, {once: true});
    }, {passive: true});
}


/**
 * @template T
 * @extends {AnyState}
 * @typedef {{
 * onMove?: (state: T) => void,
 * onStop?: (state: T) => void,
 * state?: T
 }} StoreStateReturn
 */

/**
 * @template T
 * @extends {AnyState}
 * @param {object}              opt - `StoreStateOpt`
 * @param {string}              opt.id
 * @param {(state: T) => void} [opt.onMove]
 * @param {(state: T) => void} [opt.onStop]
 * @param {boolean}            [opt.reset]
 * @param {boolean}            [opt.restore]
 * @return {StoreStateReturn<T>}
 */
function storeStateInLS({id: lsName, onMove, onStop, reset, restore}) {
    if (reset && lsName) {
        localStorage.removeItem(lsName);
    }
    if (!restore || !lsName) {
        return {onMove, onStop};
    }
    const stateJson = localStorage.getItem(lsName);
    let state;
    if (stateJson) {
        state = JSON.parse(stateJson);
    }

    function saveStateLS(state) {
        localStorage.setItem(lsName, JSON.stringify(state));
    }

    let _onStop;
    if (onStop) {
        _onStop = function(state) {
            onStop(state);
            saveStateLS(state);
        };
    } else {
        _onStop = saveStateLS;
    }

    return {
        onMove,
        onStop: _onStop,
        state
    };
}

/**
 * @param {string[]} items
 * @param {number} size
 * */
function getCodeArrays(items, size = 100) {
    const jsonArray = a => `${a.length ? "[\"" + a.join(`", "`) + "\"]" : "[]"}`;
    if (items.length <= size) {
        return `// \n/* ${items.length.toString().padStart(3)} */ ${jsonArray(items)},`;
    }
    const len = num => num.toString().length;
    const count = Math.trunc(items.length / size);
    const comment = items.length.toString().padStart(1 + len(items.length)) + " ".repeat(3 + len(count));
    const parts = [`/* ${comment} */ // `];
    for (let i = 0; i <= count; i++) {
        const part = items.slice(size * i, size + size * i);
        const page = `(${i + 1})`.padStart(2 + len(count));
        const pageCount = part.length.toString().padStart(1 + len(items.length));
        parts.push(`/* ${pageCount} ${page} */ ${jsonArray(part)},`);
    }
    return parts.join("\n");
}

// --------------------------

function getHsl(seed, L = 40, dL = 20) {
    const H = Math.trunc(360 * getRandomValue(seed));
    const _L = Math.trunc((L + getRandomValue(seed + 1) * dL)) + "%";
    return `hsl(${H}, 100%, ${_L})`;
}

function getRandomValue(seed = Date.now()) {
    let x = seed + 0x6D2B79F5;
    x = Math.imul(x ^ x >>> 15, x | 1);
    x ^= x + Math.imul(x ^ x >>> 7, x | 61);
    return ((x ^ x >>> 14) >>> 0) / 4294967296;
}

// --------------------------

/**
 * @param {HTMLElement} container
 * @param {ScriptSettings} settings
 */
function getListHelper(container, settings) {
    const headerElem  = container.querySelector(`#result-list-header`);
    const contentElem = container.querySelector(`#result-list`);
    /**
     * @param {string} url
     * @return {string}
     */
    const mainHost = url => {
        try {
            return new URL(url).hostname.split(".").slice(-2).join(".");
        } catch (e) {
            console.error(url, e);
            return "";
        }
    };

    contentElem.addEventListener("click", onClickMarkUrlAsClicked);
    contentElem.addEventListener("contextmenu", onAltContextMenuUnmarkClickedUrl);
    contentElem.addEventListener("pointerup", onMMBPointerUpMarkUrlAsClicked);

    const clickedUrls = new Set();
    /** @param {MouseEvent} event */
    function onClickMarkUrlAsClicked(event) {
        if (!event.target.closest(".url-item-link")) {
            return;
        }
        markUrlAsClicked(event);
    }

    /** @param {PointerEvent} event */
    function onMMBPointerUpMarkUrlAsClicked(event) {
        const MIDDLE_BUTTON = 1;
        if (event.button !== MIDDLE_BUTTON) {
            return;
        }
        const activeElement = container.getRootNode().activeElement;
        if (activeElement !== event.target.closest(".url-item-link")) {
            return;
        }
        markUrlAsClicked(event);
    }

    /** @param {MouseEvent | PointerEvent} event */
    function markUrlAsClicked(event) {
        const urlItem = event.target.closest(".url-item");
        urlItem.classList.add("clicked");
        const url = urlItem.querySelector("a").href;
        clickedUrls.add(url);
        const dupLinks = [...contentElem.querySelectorAll(`.url-item:not(.clicked) a[href="${url}"]`)];
        for (const dupLink of dupLinks) {
            dupLink.closest(".url-item").classList.add("clicked");
        }
    }

    /** @param {MouseEvent} event */
    function onAltContextMenuUnmarkClickedUrl(event) {
        if (!event.altKey) {
            return;
        }
        if (!event.target.closest(".url-item-link")) {
            return;
        }
        event.preventDefault();
        const urlItem = event.target.closest(".url-item");
        const wasClicked = urlItem.classList.contains("clicked");
        if (!wasClicked) {
            return;
        }
        urlItem.classList.remove("clicked");
        const url = urlItem.querySelector("a").href;
        clickedUrls.delete(url);
        const dupLinks = [...contentElem.querySelectorAll(`.url-item.clicked a[href="${url}"]`)];
        for (const dupLink of dupLinks) {
            dupLink.closest(".url-item").classList.remove("clicked");
        }
    }

    function urlToHtml(url) {
        let {prefix = "", main} = url.match(/(?<prefix>^https?:\/\/(www\.)?)?(?<main>.+)/i).groups;
        let end = "";
        try {
            if (main.endsWith("/") && new URL(url).pathname === "/") {
                main = main.slice(0, -1);
                end = "/";
            }
        } catch (e) {
            console.error(url, e);
        }

        prefix && (prefix = `<span class="invisible" data-unselectable-text="${prefix}"><span class="selectable">${prefix}</span></span>`);
        end    && (end    = `<span class="invisible" data-unselectable-text="${end}"><span class="selectable">${end}</span></span>`);
        main = `<span class="visible" data-unselectable-text="${main}"><span class="selectable">${main}</span></span>`;
        return `${prefix}${main}${end}`;
    }

    return {
        clearList(addPrompt = false) {
            headerElem.textContent = "Result list";
            if (addPrompt) {
                contentElem.innerHTML = `<div id="result-list-prompt">Click here to list URLs...</div>`;
            } else {
                contentElem.innerHTML = "";
            }
        },
        insertUrls(urls) {
            this.clearList();

            const joinedUrls = [...new Set(urls)].sort().join(" ");
            const hexes = Math.abs(hashString(joinedUrls)).toString(16).slice(-8).padStart(8, "0");
            const title = `title="RMB click to temporary toggle Unsearchable option"`;

            let modSpans = "-";
            if (settings.sort) {
                modSpans += `<span class="modifier" title="Sorted">S</span>`;
            } else if (settings.hostname_sort) {
                modSpans += `<span class="modifier" title="Hostname Sorted">HS</span>`;
            }
            if (settings.reverse) {
                modSpans += `<span class="modifier" title="Reversed">R</span>`;
            }

            headerElem.innerHTML =
                  `<span class="header-content" ${title}>Result list (${urls.length})</span> `
                + `<span class="urls-hash">#<span class="hash" title="Hash">${hexes.toUpperCase()}</span></span>`
                + `<span class="list-modifiers">${modSpans.length > 1 ? modSpans : ""}</span>`;

            const anchorAttr = `class="url-item-link" target="_blank" rel="noreferrer noopener"`;
            let resultHtml = "";
            let prev = urls[0];
            for (const url of urls) {
                let linkHtml = urlToHtml(url);
                if (settings.hostname_sort || settings.sort) {
                    if (mainHost(prev) !== mainHost(url)) {
                        resultHtml += `<span class="url-pad"></span>`;
                    }
                    prev = url;
                }
                const clicked = clickedUrls.has(url) ? " clicked" : "";
                const html = `<div class="url-item${clicked}"><a href="${url}" ${anchorAttr}>${linkHtml}</a></div>`;
                resultHtml += html;
            }
            contentElem.insertAdjacentHTML("beforeend", resultHtml);
        },
        headerElem,
        contentElem,
    };
}

/**
 * @typedef {object} UrlInfo
 * @property {string} url
 * @property {number} number
 */

/**
 * @param {HTMLElement} container
 * @param {ScriptSettings} settings
 */
function getTagsHelper(container, settings) {
    const tagsListContainerEl  = container.querySelector(`.tags-list`);
    const tagsPopupContainerEl = container.querySelector(`.tags-popup`);
    const tagListWrapperEl   = container.querySelector(".tags-list-wrapper");
    const tagsPopupWrapperEl = container.querySelector(".tags-popup-wrapper");
    const addTagBtnEl        = container.querySelector(".tag-add");
    const addTagBtnContentEl = container.querySelector(".tag-add span");

    /** @type {Set<string>} */
    let selectedTags = new Set();
    /** @type {Record<string, UrlInfo[]>} */
    let tagInfoMap = {};
    let tagsReversed = false;
    let onUpdateCb = null;
    let urlsCount = 0;

    tagsPopupContainerEl.addEventListener("click", onClickSelectTagFromPopup);
    tagsListContainerEl.addEventListener("click", onClickRemoveTagFromSelect);

    tagsListContainerEl.addEventListener("contextmenu", onContextMenuToggleDisablingSelectedTag);
    tagsPopupContainerEl.addEventListener("contextmenu", onContextMenuAddPopupTagOrToggleDisabling);

    tagsListContainerEl.addEventListener("pointerdown", onMMBPointerDownEnableOnlyTargetTag);

    addTagBtnEl.addEventListener("click", openTagsPopup);
    addTagBtnEl.addEventListener("contextmenu", onContextMenuSelectAllTagsOrClear);
    addTagBtnEl.addEventListener("pointerdown", onMMBPointerDownReverseSelectedTags);

    /** @param {Event} event */
    function getTagFromEvent(event) {
        const tagEl = /** @type {HTMLElement} */ event.target;
        if (!tagEl.classList.contains("tag")) {
            return null;
        }
        return tagEl;
    }

    /** @param {PointerEvent} event */
    function onMMBPointerDownEnableOnlyTargetTag(event) {
        const MIDDLE_BUTTON = 1;
        if (event.button !== MIDDLE_BUTTON) { return; }
        const listTagEl = getTagFromEvent(event);
        if (!listTagEl) { return; }
        event.preventDefault();

        disableAllSelectedTagElems();
        enableTag(listTagEl);

        updateAddTagBtnTitle();
        onUpdateCb?.();
    }

    /** @param {MouseEvent} event */
    function onClickSelectTagFromPopup(event) {
        const popupTagEl = getTagFromEvent(event);
        if (!popupTagEl) { return; }

        const selected = popupTagEl.classList.contains("selected");
        if (selected) {
            const listTagEl = tagsListContainerEl.querySelector(`[data-tag="${popupTagEl.dataset.tag}"]`);
            listTagEl.remove();
            selectedTags.delete(popupTagEl.dataset.tag);
        } else {
            tagsListContainerEl.append(popupTagEl.cloneNode(true));
            selectedTags.add(popupTagEl.dataset.tag);
        }
        popupTagEl.classList.toggle("selected");
        updateAddTagBtnTitle();
        onUpdateCb?.();
    }

    /** @param {MouseEvent} event */
    function onClickRemoveTagFromSelect(event) {
        const listTagEl = getTagFromEvent(event);
        if (!listTagEl) { return; }

        const popupTag = tagsPopupContainerEl.querySelector(`[data-tag="${listTagEl.dataset.tag}"]`);
        popupTag.classList.remove("selected");
        popupTag.classList.remove("disabled");
        selectedTags.delete(listTagEl.dataset.tag);
        listTagEl.remove();
        updateAddTagBtn();
        onUpdateCb?.();
    }

    function disableAllSelectedTagElems() {
        for (const tag of selectedTags) {
            const listTagEl = tagsListContainerEl.querySelector(`[data-tag="${tag}"]`);
            const popupTagEl = tagsPopupContainerEl.querySelector(`[data-tag="${tag}"]`);
            listTagEl.classList.add("disabled");
            popupTagEl.classList.add("disabled");
        }
        selectedTags = new Set();
    }
    function enableAllSelectedTagElems() {
        const listTagEls = [...tagsListContainerEl.querySelectorAll(`[data-tag].disabled`)];
        for (const listTagEl of listTagEls) {
            const tag = listTagEl.dataset.tag;
            const popupTagEl = tagsPopupContainerEl.querySelector(`[data-tag="${tag}"].disabled`);
            listTagEl.classList.remove("disabled");
            popupTagEl.classList.remove("disabled");
            selectedTags.add(tag);
        }
    }
    function enableTag(listTagEl) {
        const tag = listTagEl.dataset.tag;
        const popupTagEl = tagsPopupContainerEl.querySelector(`[data-tag="${tag}"].disabled`);
        listTagEl.classList.remove("disabled");
        popupTagEl.classList.remove("disabled");
        selectedTags.add(tag);
    }
    function disableTag(listTagEl) {
        const tag = listTagEl.dataset.tag;
        const popupTagEl = tagsPopupContainerEl.querySelector(`[data-tag="${tag}"]`);
        listTagEl.classList.add("disabled");
        popupTagEl.classList.add("disabled");
        selectedTags.delete(tag);
    }
    function disableSelectedTag(listTagEl, popupTagEl) {
        const disabled = listTagEl.classList.toggle("disabled");
        if (disabled) {
            selectedTags.delete(listTagEl.dataset.tag);
            popupTagEl.classList.add("disabled");
        } else {
            selectedTags.add(listTagEl.dataset.tag);
            popupTagEl.classList.remove("disabled");
        }
    }

    /** @param {MouseEvent} event */
    function onContextMenuToggleDisablingSelectedTag(event) {
        const listTagEl = getTagFromEvent(event);
        if (!listTagEl) { return; }

        event.preventDefault();
        if (event.shiftKey) {
            const enabled = !listTagEl.classList.contains("disabled");
            if (enabled) {
                if (selectedTags.size > 1) {
                    disableAllSelectedTagElems();
                    enableTag(listTagEl);
                } else {
                    enableAllSelectedTagElems();
                }
            } else {
                const listTagEls = [...tagsListContainerEl.querySelectorAll(`[data-tag]`)];
                if (selectedTags.size + 1 === listTagEls.length) {
                    disableAllSelectedTagElems();
                } else {
                    enableAllSelectedTagElems();
                    disableTag(listTagEl);
                }
            }
        } else {
            const popupTagEl = tagsPopupContainerEl.querySelector(`[data-tag="${listTagEl.dataset.tag}"]`);
            disableSelectedTag(listTagEl, popupTagEl);
        }
        updateAddTagBtnTitle();
        onUpdateCb?.();
    }

    /** @param {MouseEvent} event */
    function onContextMenuAddPopupTagOrToggleDisabling(event) {
        const popupTagEl = getTagFromEvent(event);
        if (!popupTagEl) { return; }

        event.preventDefault();
        const inList = popupTagEl.classList.contains("selected");
        if (!inList) {
            popupTagEl.classList.add("disabled");
            tagsListContainerEl.append(popupTagEl.cloneNode(true));
            popupTagEl.classList.add("selected");
        } else {
            const listTagEl = tagsListContainerEl.querySelector(`[data-tag="${popupTagEl.dataset.tag}"]`);
            disableSelectedTag(listTagEl, popupTagEl);
        }
        updateAddTagBtnTitle();
        onUpdateCb?.();
    }


    function closeTagsPopup() {
        addTagBtnEl.classList.remove("rotate");
        tagsPopupWrapperEl.classList.add("hidden");
        container.removeEventListener("click", closeTagsPopupOnClick);
        updateAddTagBtn();
    }
    function closeTagsPopupOnClick(event) {
        const isTagPopup = event.target.closest(".tags-popup-wrapper");
        const isTag = event.target.classList.contains("tag") && !event.target.classList.contains("tag-add");
        if (!isTagPopup && !isTag) {
            closeTagsPopup();
        }
    }
    async function openTagsPopup() {
        if (tagsPopupWrapperEl.classList.contains("hidden")) {
            addTagBtnEl.classList.add("rotate");
            tagsPopupWrapperEl.classList.remove("hidden");
            updateAddTagBtn();
            await sleep();
            container.addEventListener("click", closeTagsPopupOnClick);
        }
    }

    function updateAddTagBtn() {
        const isClosed = tagsPopupWrapperEl.classList.contains("hidden");
        const isAllTagsSelected = tagsPopupWrapperEl.querySelector(".tag:not(.selected)") === null;
        if (isClosed && isAllTagsSelected) {
            addTagBtnContentEl.textContent = "–";
        } else {
            addTagBtnContentEl.textContent = "+";
        }
        updateAddTagBtnTitle();
    }
    function updateAddTagBtnTitle() {
        const popupTags = [...tagsPopupWrapperEl.querySelectorAll(".tag")];
        const total = popupTags.length;
        const selected = popupTags.filter(t => t.classList.contains("selected")).length;
        const disabled = popupTags.filter(t => t.classList.contains("disabled")).length;
        const enabled = selected - disabled;
        const selectedText = enabled !== selected ? ` (${selected})` : "";
        const tagsInfoText = `${enabled}${selectedText} of ${total} tags`;
        addTagBtnEl.title = tagsInfoText + ` of ${urlsCount} total urls`;
    }

    /** @param {MouseEvent} event */
    function onContextMenuSelectAllTagsOrClear(event) {
        event.preventDefault();
        void clicked(addTagBtnEl);
        const tagEls = [...tagsPopupWrapperEl.querySelectorAll(".tag:not(.selected)")];
        if (tagEls.length) {
            for (const tagEl of tagEls) {
                tagsListContainerEl.append(tagEl.cloneNode(true));
                selectedTags.add(tagEl.dataset.tag);
                tagEl.classList.add("selected");
            }
        } else {
            selectedTags = new Set();
            const tagEls = [...tagsPopupWrapperEl.querySelectorAll(".tag.selected")];
            for (const tagEl of tagEls) {
                tagEl.classList.remove("selected");
                tagEl.classList.remove("disabled");
            }
            tagsListContainerEl.innerHTML = "";
        }
        updateAddTagBtn();
        onUpdateCb?.();
    }

    function selectAllTags() {
        const tagEls = [...tagsPopupWrapperEl.querySelectorAll(".tag:not(.selected)")];
        for (const tagEl of tagEls) {
            tagsListContainerEl.append(tagEl.cloneNode(true));
            selectedTags.add(tagEl.dataset.tag);
            tagEl.classList.add("selected");
        }
    }

    /** @param {PointerEvent} event */
    function onMMBPointerDownReverseSelectedTags(event) {
        const MIDDLE_BUTTON = 1;
        if (event.button !== MIDDLE_BUTTON) {
            return;
        }
        event.preventDefault();

        addTagBtnEl.classList.toggle("active");
        tagListWrapperEl.classList.toggle("reversed");
        tagsReversed = !tagsReversed;
        onUpdateCb?.();
    }

    function clearTags() {
        urlsCount = 0;
        selectedTags = new Set();
        tagInfoMap = {};
        tagsReversed = false;
        tagListWrapperEl.classList.remove("reversed");
        addTagBtnEl.classList.remove("active");
        addTagBtnEl.title = "";
        addTagBtnContentEl.textContent = "+";
        tagsListContainerEl.innerHTML = "";
        tagsPopupContainerEl.innerHTML = "";
    }

    /**
     * @param {string[]} urls
     * @param {Function?} onUpdate
     * @param {boolean?} [keepOld = false]
     */
    function renderTags(urls, onUpdate, keepOld = false) {
        let savedSelectedTags = selectedTags;
        if (!keepOld) {
            savedSelectedTags = null;
        }
        clearTags();
        if (!urls.length) {
            return;
        }
        if (onUpdate) {
            onUpdateCb = onUpdate;
        }
        urlsCount = urls.length;

        const other = "other";
        let i = 0;
        for (const url of urls) {
            let host = url.match(/\w+\.[a-z]+(?=\/)/i)?.[0];
            if (!host) {
                host = other;
            }
            if (!settings.case_sensitive) {
                host = host.toLowerCase();
            }
            const tagUrls = tagInfoMap[host] || (tagInfoMap[host] = []);
            tagUrls.push({url, number: i++});
        }

        /**
         * @param {[string, UrlInfo[]]} o1
         * @param {[string, UrlInfo[]]} o2
         * @return {-1 | 0 | 1}
         */
        function numTagComparator([k1, v1], [k2, v2]) {
            return v2.length - v1.length;
        }
        /**
         * @param {[string, UrlInfo[]]} o1
         * @param {[string, UrlInfo[]]} o2
         * @return {-1 | 0 | 1}
         */
        function nameTagComparator([k1, v1], [k2, v2]) {
            return k1.localeCompare(k2);
        }
        const comparator = settings.sort_tags_by_name ? nameTagComparator : numTagComparator;
        const hostToUrlInfosEntries = Object.entries(tagInfoMap)
            .filter(([k, v]) => k !== other)
            .sort(comparator);

        let tagsHtml = "";
        for (const [k, v] of hostToUrlInfosEntries) {
            const color = getHsl(hashString(k), 90, 5);
            tagsHtml += `<span class="tag" data-tag="${k}" title="${v.length}" data-color="${color}"></span>`;
        }
        if (tagInfoMap[other]) {
            tagsHtml += `<span class="tag" data-tag="${other}" title="${tagInfoMap[other].length}" data-color="#eee"></span>`;
        }

        tagsPopupContainerEl.innerHTML = tagsHtml;
        const tagsEls = [...tagsPopupContainerEl.querySelectorAll(`.tag[data-color]`)];
        tagsEls.forEach(tag => tag.style.backgroundColor = tag.dataset.color);

        if (settings.auto_tags) {
            selectAllTags();

            // select only saved tags
            if (savedSelectedTags && savedSelectedTags.size) {
                for (const tag of selectedTags) {
                    if (!savedSelectedTags.has(tag)) {
                        const listTagEl = tagsListContainerEl.querySelector(`[data-tag="${tag}"]`);
                        const popupTagEl = tagsPopupContainerEl.querySelector(`[data-tag="${tag}"]`);
                        listTagEl.classList.add("disabled");
                        popupTagEl.classList.add("disabled");
                    }
                }
                selectedTags = savedSelectedTags;
            }

        }

        updateAddTagBtn();
    }

    /**
     * @param {UrlInfo} urlInfo1
     * @param {UrlInfo} urlInfo2
     * @return {-1 | 0 | 1}
     */
    function numComparator(urlInfo1, urlInfo2) {
        return urlInfo1.number - urlInfo2.number;
    }
    function getFilteredUrls() {
        if (!selectedTags.size) {
            return Object.values(tagInfoMap).flatMap(urlInfos => {
                return urlInfos;
            }).sort(numComparator).map(urlInfo => urlInfo.url);
        }
        return Object.entries(tagInfoMap).filter(([tag, urlInfos]) => {
            if (tagsReversed) {
                return !selectedTags.has(tag);
            } else {
                return  selectedTags.has(tag);
            }
        }).flatMap(([tag, urlInfos]) => {
            return urlInfos;
        }).sort(numComparator).map(urlInfo => urlInfo.url);
    }

    function getTags() {
        return selectedTags;
    }

    return {
        renderTags,
        getFilteredUrls,
        clearTags,
        getTags,
    }
}

/** @return {string[]} */
function parseUrls(targetSelector = "body", {
    includeTextUrls, onlyTextUrls, bracketsTrim, includeMedia,
}) {
    let elems;
    try {
        elems = [...document.querySelectorAll(targetSelector)];
    } catch {
        console.error("Invalid selector");
        return [];
    }

    includeTextUrls = includeTextUrls || onlyTextUrls;

    const urls = [];
    for (const el of elems) {

        let anchorUrls;
        if (onlyTextUrls) {
            anchorUrls = [];
        } else {
            if (el.tagName === "A") {
                anchorUrls = [el.href];
            } else {
                anchorUrls = [...el.querySelectorAll("a")].map(a => a.href);
            }
            urls.push(anchorUrls);
        }

        if (includeTextUrls) {
            const textUrls = parseUrlsFromText(el.innerText, bracketsTrim);
            urls.push(textUrls.filter(url => !anchorUrls.includes(url)));
        }

        if (includeMedia) {
            const imageUrls = [...el.querySelectorAll("img")].map(el => el.src);
            const videoUrls = [...el.querySelectorAll("video, video source")].map(el => el.src);
            urls.push(imageUrls, videoUrls);
        }
    }
    return urls.flat();
}

function urlsToText(targetSelector = "body", urlFilter) {
    let count = 0;
    [...document.querySelectorAll(targetSelector)]
        .forEach(el => {
            const anchors = [...el.querySelectorAll("a")]
                .filter(a => urlFilter(a.href));

            for (const a of anchors) {
                if (a.dataset.urlToText !== undefined) {
                    continue;
                }

                a.dataset.urlToText = "";
                if (a.title) {
                    a.dataset.originalTitle = a.title;
                }

                a.title = a.textContent;
                a.textContent = a.href + " ";

                count++;
            }
        });
    return count;
}

function undoUrlsToText(targetSelector = "body") {
    let count = 0;
    [...document.querySelectorAll(targetSelector)]
        .forEach(el => {
            const anchors = [...el.querySelectorAll(`a[data-url-to-text]`)];
            for (const a of anchors) {
                a.textContent = a.title;
                if (a.dataset.originalTitle) {
                    a.title = a.dataset.originalTitle;
                    a.removeAttribute("data-original-title");
                } else {
                    a.removeAttribute("title");
                }
                a.removeAttribute("data-url-to-text");
                count++;
            }
        });
    return count;
}

/**
 * @param {string} url
 * @return {string[]}
 */
function splitOnUnmatchedBrackets(url) {
    const chars = [...url];
    let rounds  = 0;
    let squares = 0;
    let i = 0;
    for (const char of chars) {
        i++;
        if (char === "(") {
            rounds++;
        } else if (char === ")") {
            rounds--;
        } else if (char === "[") {
            squares++;
        } else if (char === "]") {
            squares--;
        }
        if (rounds < 0 || squares < 0 ) {
            const before = chars.slice(0, i - 1).join("");
            const after  = chars.slice(i - 1).join("");
            return [before, after];
        }
    }
    return [url, null];
}

function parseUrlsFromText(text, bracketsTrim = true) {
    const regex = /[^\s<>"():\/]+\.(?<host1>[^\s<>"()\/:]+(:\d+)?)\/[^\s<>"]+/g;
    const urls = [...text.matchAll(regex)]
        .map(match => match[0])
        .map(text => {
            return "https://" + text; // consider all link are https
        });
    if (bracketsTrim) { // Trim unmatched closed brackets — ")", or "]" with the followed content
        return urls.flatMap(url => {
            const [_url, after] = splitOnUnmatchedBrackets(url);
            if (after && after.includes("://") && after.match(regex)) {
                return [_url, ...parseUrlsFromText(after)];
            }
            return _url;
        });
    }
    return urls;
}

function getTags() {
        const tagsHtml = `
<div class="tags-list-wrapper">        
    <span class="tag tag-add button button-no-outline" tabindex="0"><span class="plus">+</span></span>  
    <div class="tags-list"></div>     
</div>   
<div class="tags-popup-wrapper hidden">  
    <div class="tags-popup"></div>
</div>`;

        const tagsCss = cssFromStyle`
<style>
.tags-list-wrapper.reversed .tags-list .tag:not(.disabled) {
    text-decoration: line-through;
}
#tags-main {
    display: none;
}
[data-show-tags] #tags-main {
    display: initial;
}
.tags-list {
    display: contents;
}
.tags-popup-wrapper {
    position: relative;
}
.tags-popup {
    position: absolute;
    box-sizing: border-box;
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
    padding: 3px;
    top: 5px;
    background-color: white;
    width: 100%;
    border: 1px solid gray;
    border-radius: 3px;
    box-shadow: 0 0 4px gray;
    z-index: 3;
    min-height: 32px;
}
.tags-list-wrapper {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
    padding-top: 1px;
}
.tag {
    border: 1px solid gray;
    border-radius: 3px;
    padding: 2px 4px;
    user-select: none;
    cursor: pointer;
}
.tag:after {
    content: attr(data-tag);
}
.tag.selected, .tag.disabled {
    color: gray;
    border-color: gray;
    opacity: 0.6;
}
.tag.selected.disabled {
     opacity: 0.4;
}
.plus {
    pointer-events: none;
    min-width: 36px;    
    display: inline-flex;
    justify-content: center;
    transition: transform .15s;
}
.rotate .plus {
    transform: rotate(45deg);
}
</style>`;

        return {tagsHtml, tagsCss};
}

/** @type {Partial<ScriptSettings>} */
const resetSettings = {
    append_on_hover:   false,
    sort_tags_by_name: false,
};

/** @param {ScriptSettings} settings */
function getPopup(settings) {
    const {
        input_only,
        input_only_disabled,
        input_ignore,
        input_ignore_disabled,
        include_media,
        include_text_url,
        only_text_url,
        console_log,
        console_vars,
        unique,
        sort,
        hostname_sort,
        input_selector,
        input_selector_disabled,
        ignore_first_party,
        reverse,
        https,
        auto_open,
        auto_list,
        brackets_trim,
        // opened,
        // reverse_input_only,
        case_sensitive,
        hide_prefix,
        show_tags,
        auto_tags,
        // tags_collapsed,
        // filters_collapsed,
        // controls_collapsed,
        no_search_on_blur,
        unsearchable,
        keep_in_storage,
        append_on_hover,
        sort_tags_by_name,
        clear_store_on_close,
    } = Object.assign(settings, resetSettings);
    const checked  = isChecked  => isChecked  ? "checked"  : "";
    const disabled = isDisabled => isDisabled ? "disabled" : "";

    const {tagsHtml, tagsCss} = getTags();

    const popupHtml = `
<div id="popup" tabindex="-1">
    <div class="header" id="popup-header">
        <button id="minimize-button">_</button>
        <button id="close-button">X</button>
    </div>

    <div id="tags-main">
        <div class="fieldset-line" data-header_name="tags">
            <hr class="pre">
            <span class="legend-like wrap">Tags</span>
            <hr class="after">
        </div>
        <div class="content" data-content_name="tags">
            ${tagsHtml}
        </div>
    </div>

    <div class="fieldset-line" data-header_name="filters">
        <hr class="pre">
        <span class="legend-like wrap">Filters</span>
        <hr class="after">
    </div>
    <div class="text-inputs-wrapper content" data-content_name="filters">
        <div class="input-line">
            <label>
                <span class="input-prompt" id="input-only-prompt">Only</span>
                <input id="input-only" type="text" name="input_only" value="${input_only}" ${disabled(input_only_disabled)} spellcheck="false">
            </label>
        </div>
        <div class="input-line">
            <label>
                <span class="input-prompt" id="input-ignore-prompt">Ignore</span>
                <input id="input-ignore" type="text" name="input_ignore" value="${input_ignore}" ${disabled(input_ignore_disabled)} spellcheck="false">
            </label>
        </div>
    </div>

    <div class="fieldset-line" data-header_name="controls">
        <hr class="pre">
        <span class="legend-like wrap">Controls</span>
        <hr class="after">
    </div>
    <div class="content" data-content_name="controls">
        <div class="control-row">
            <div class="control-row-inner">
                <button title="LMB: list links \nRMB: append new links \nMMB: clear the list" 
                        name="list_button" 
                        class="short btn-left"
                        >List links</button>
                <label title="Include URLs parsed from text" id="include_text_url-label">
                    <input type="checkbox" name="include_text_url" ${checked(include_text_url)}>
                    Text
                </label>
                <label title="Only URLs parsed from text">
                    <input type="checkbox" name="only_text_url" ${checked(only_text_url)}>
                    Only text
                </label>
                <label title="Include media (img, video) tags">
                    <input type="checkbox" name="include_media" ${checked(include_media)}>
                    Media
                </label>
            </div>
            <div>
                <button name="to_text_button" class="long btn-right"
                >URLs to text</button>
            </div>
        </div>
        <div class="control-row">
            <div class="control-row-inner">
                <button title="Copy URLs. \nRMB: as a row \nRMB: as a column \nMMB: as JS array"
                        name="copy_button" class="short btn-left"
                >Copy</button>
                
                <span id="append-on-hover-wrapper">
                    <label title="Append URLs on the button hover">
                        <input type="checkbox" name="append_on_hover" ${checked(append_on_hover)}>
                        AoH
                    </label>
                </span>
                <span id="keep-in-storage-wrapper">
                    <label title="Keep URLs in localStorage">
                        <input type="checkbox" name="keep_in_storage" ${checked(keep_in_storage)}>
                        KiS
                    </label>
                </span>
            </div>
            <button title="Show Extra Settings" name="extra_settings_button" class="long btn-right"
            >Extra Settings</button>
        </div>
        <div class="hidden" id="extra_settings">
            <hr>
            <div class="control-row">
                <div class="control-row-inner">    
                    <label title="Auto open the popup (or minimized one)">
                        <input type="checkbox" name="auto_open" ${checked(auto_open)}>
                        Auto open
                    </label>
                    <label title="Auto list URLs on the pop is shown">
                        <input type="checkbox" name="auto_list" ${checked(auto_list)}>
                        Auto list
                    </label>
                    <label title="Only unique URLs">
                        <input type="checkbox" name="unique" ${checked(unique)}>
                        Only unique
                    </label>
                    <label title="Sort URLs">
                        <input type="checkbox" name="sort" ${checked(sort)}>
                        Sort
                    </label>
                    <label title="Sort URLs by hostname" id="hostname_sort-label">
                        <input type="checkbox" name="hostname_sort" ${checked(hostname_sort)}>
                        Host-Sort
                    </label>
                    <label title="Reverse list">
                        <input type="checkbox" name="reverse" ${checked(reverse)}>
                        Reverse
                    </label>
                    <label title="Replace http:// with https://">
                        <input type="checkbox" name="https" ${checked(https)}>
                        https
                    </label>
                    <label title="Hide https://www. prefix in the list">
                        <input type="checkbox" name="hide_prefix" ${checked(hide_prefix)}>
                        Hide prefix
                    </label>
                    <label title="Trim unmached closed brackets ], or ) with the followed content. Text URLs only.">
                        <input type="checkbox" name="brackets_trim" ${checked(brackets_trim)}>
                        Trim brackets
                    </label>
                    <label title="Don't list 1st-party URLs">
                        <input type="checkbox" name="ignore_first_party" ${checked(ignore_first_party)}>
                        No 1st-party
                    </label>
                    <label title="Case-sensitive matching.\n&quot;SITE.COM/QWE&quot; != &quot;site.com/qwe&quot;">
                        <input type="checkbox" name="case_sensitive" ${checked(case_sensitive)}>
                        Case-sensitive
                    </label>
                    <label title="Show Tags">
                        <input type="checkbox" name="show_tags" ${checked(show_tags)}>
                        Tags
                    </label>
                    <label title="Show all tags automatically" data-name="auto_tags">
                        <input type="checkbox" name="auto_tags" ${checked(auto_tags)}>
                        Auto tags
                    </label>
                    <label title="Sort tags by name (temporary)">
                        <input type="checkbox" name="sort_tags_by_name" ${checked(sort_tags_by_name)}>
                        Name-sort tags 
                    </label>
                    <label title="Log the result list to console">
                        <input type="checkbox" name="console_log" ${checked(console_log)}>
                        Console log
                    </label>
                    <label title="Clear store on popup close">
                        <input type="checkbox" name="clear_store_on_close" ${checked(clear_store_on_close)}>
                        Clear store
                    </label>
                    <label title="Expose variables to console">
                        <input type="checkbox" name="console_vars" ${checked(console_vars)}>
                        Console vars
                    </label>
                    <label title="Makes the text in the result URLs list unselectable and unsearchable (with Ctrl + F), \
when the popup is not focused. 
With large URLs count it can cause some lags on the popup focus/blur events due to the list redrawing." data-name="no_search_on_blur">
                        <input type="checkbox" name="no_search_on_blur" ${checked(no_search_on_blur)}>
                        Ephemeral
                    </label>
                    <label title="Does the same as Ephemeral option, but constantly. 
You always can toggle the Unsearchable mode by RMB click on the list title (if Ephemeral option is not enabked), 
this option only defines the default state.">
                        <input type="checkbox" name="unsearchable" ${checked(unsearchable)}>
                        Unsearchable
                    </label>
                </div>
            </div>
            <div class="text-inputs-wrapper">
                <hr>
                <label title="Target selector. By default, it is &quot;body&quot; selector.">
                    <span id="input-selector-prompt">Selector</span>
                    <input id="input-selector" type="text" name="input_selector" value="${input_selector}" ${disabled(input_selector_disabled)} spellcheck="false">
                </label>
                <hr>
            </div>
        </div>
    </div>

    <div class="fieldset-line">
        <hr class="pre">
        <span class="legend-like" id="result-list-header">Result list</span>
        <hr class="after">
    </div>
    <div id="result-list-wrapper" class="content">
        <div id="result-list">
            <div id="result-list-prompt">Click here to list URLs...</div>
        </div>
    </div>
</div>`;

    const popupCss = tagsCss + cssFromStyle`
<style>
#popup[tabindex="-1"] {
    outline: none;
}
#popup.focus {
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
}

[data-text]:after {
    content: attr(data-text);
}

#extra_settings label {
    min-width: 120px;
}

.btn-left {
    margin-left: 0;
}
.btn-right {
    margin-right: 0;
}

[data-tags-collapsed] [data-content_name="tags"] {
    display: none;
}
[data-filters-collapsed] [data-content_name="filters"] {
    display: none;
}
[data-controls-collapsed] [data-content_name="controls"] {
    display: none;
}

.content {
    padding: 1px 6px;
}
.input-line {
    padding-bottom: 3px;
    padding-top: 3px;
}

.fieldset-line {
    padding-top: 2px;
    display: flex;
    align-items: center;
    white-space: nowrap;
}
.fieldset-line .pre {
    width: 20px;
    height: 1px;
    border: 0;
    background-image: linear-gradient(to right, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, .25) 70%);
}
.fieldset-line .after {
    height: 1px;
    flex-grow: 2;
    border: 0;
    background-image: linear-gradient(to right, rgba(0, 0, 0, .25) 0%, rgba(0, 0, 0, 0.05) 70%);
}
.legend-like {
    padding: 0 1px;
    user-select: none;
    position: relative;
}
.legend-like.wrap:hover {
    text-shadow: 0 0 1px rgba(0, 0, 0, .25);
    cursor: pointer;
}

hr.main {
  width: 100%;
  height: 1px;
  border: 0;
  background-image: linear-gradient(to right, rgba(0, 0, 0, 0) 10%, rgba(0, 0, 0, .25), rgba(0, 0, 0, 0) 90%);
}

.url-pad {
    padding-top: 2px;
    display: block;
}

[data-hide-prefix] .invisible {
    width: 0;
    height: 0;
    font-size: 0;
    line-height: 0;
    display: inline-block;
}
#popup[data-no-search-on-blur]:not(.focus) [data-unselectable-text]:after {
    content: attr(data-unselectable-text);
}
#popup[data-no-search-on-blur]:not(.focus) .selectable {
    display: none;
}

#popup[data-unsearchable] #result-list-header {
    color: #666;
}
#popup[data-unsearchable] .selectable {
    display: none;
}
#popup[data-unsearchable] [data-unselectable-text]:after {
    content: attr(data-unselectable-text);
}
#popup[data-unsearchable] [data-name="no_search_on_blur"] {
    opacity: 0.55;
}

#popup:not([data-show-tags]) [data-name="auto_tags"] {
    opacity: 0.55;
}

.hidden {
    display: none!important;
}
.red {
    color: red;
    border-color: red;
}
.orange {
    color: darkorange;
    border-color: darkorange;
}

a {
    text-decoration: none;
}
.url-item.clicked {
    background-color: #eeeeee99;
}

#popup {
    width: 720px;
    background-color: white;
    height: 580px;
    border: 1px solid darkgray;
    padding: 6px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.4);
    transition: box-shadow 0.4s;
    display: flex;
    flex-direction: column;
}

.url-item {
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
}
#result-list {
    overflow-y: auto;
    height: 100%;
    width: inherit;
}
#result-list-wrapper {
    padding-top: 4px;
    padding-right: 2px;
    /*padding: 4px 4px 8px 12px;*/
    flex-grow: 1;
    overflow-y: hidden;
}

.text-inputs-wrapper label {
    display: flex;
}
input[type="text"] {
    width: 100%;
    margin-left: 8px;
}
label > span {
    min-width: 54px;
}
label, 
button {
    user-select: none;
}

button.short {
    min-width: 68px;
}
button.long {
    min-width: 100px;
}

button {
    margin: 3px;
}
.control-row {
   display: flex;
   flex-direction: row;
   justify-content: space-between;
}
.control-row .control-row-inner {
   display: flex;
   align-items: center;
}
.control-row-inner > * {
    margin-right: 8px;
}

[data-only-text-url] #include_text_url-label {
    color: gray;
}
[data-sort] #hostname_sort-label {
    color: gray;
}

[data-reverse-input-only] #input-only-prompt,
[data-reverse-input-only] #input-only {
    text-decoration: line-through;
}

input[disabled] {
    color: gray;
}

.urls-hash, .list-modifiers {
    color: gray;
}
.urls-hash .hash:hover, .modifier:hover {
    color: dimgray;
}

.header {
    position: absolute;
    top: 0;
    left: 0;
    opacity: 0;
    
    width: 100%;
    
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-end;
    
    background-image: linear-gradient(to left, rgba(255,255,255,1.0), rgba(255,255,255,0.9), rgba(255,255,255,0.2));
    
    transition: opacity 0.3s;
}
.header:hover {
    opacity: 1;
    transition: opacity 0.3s;
}


#extra_settings .control-row-inner {
    flex-wrap: wrap;
}
#result-list-prompt {
    margin: 5px;
    color: gray;
}

fieldset, hr {
    border: 1px solid aliceblue;
    margin: 4px 0;
}

</style>`;

    return {popupHtml, popupCss};
}

/**
 * @param {object} opt
 * @param {ScriptSettings} opt.settings
 * @param {(ss: Partial<ScriptSettings>) => string[]} opt.updateSettings
 * @param {Wrapper} opt.wrapper
 * @param {Popup} opt.popup
 * @param {Minim} opt.minim
 */
function initPopup({settings, updateSettings, wrapper, popup, minim}) {
    Object.assign(popup, {renderPopup, closePopup});

    function closePopup() {
        wrapper.isShadowContainerInited() && wrapper.querySelector("#popup")?.remove();
    }

    function renderPopup(resetPosition = false) {
        const {popupHtml, popupCss} = getPopup(settings);

        const {querySelector, querySelectorAll, initShadowContainer, closeShadowContainer} = wrapper;
        const {closeMinimized, renderMinimized} = minim;

        const shadowContainer = initShadowContainer();
        updateSettings({minimized: false});

        const wasOpened = querySelector("#popup");
        closePopup();
        closeMinimized();
        resetPosition = wasOpened || resetPosition;

        shadowContainer.insertAdjacentHTML("afterbegin", popupHtml);
        const popupElem = querySelector("#popup");
        addCSS(popupCss, popupElem);
        setSettingsDataAttributes();


        let blurTimerId;
        popupElem.addEventListener("focusout", () => {
            blurTimerId = setTimeout(() => popupElem.classList.remove("focus"), 250);
        });
        popupElem.addEventListener("focusin", () => {
            popupElem.classList.add("focus");
            setTimeout(() => clearTimeout(blurTimerId));
        });


        function setSettingsDataAttributes() {
            if (!popupElem) {
                return;
            }
            for (const [key, value] of Object.entries(settings)) {
                if (typeof value !== "boolean") {
                    continue;
                }
                const attr = `data-${key.replaceAll("_", "-")}`;
                if (value) {
                    popupElem.setAttribute(attr, "");
                } else {
                    popupElem.removeAttribute(attr);
                }
            }
        }

        const headerElem = querySelector("#popup-header");
        makeMovable(popupElem, {
            handle: headerElem,
            ...storeStateInLS({
                reset: resetPosition,
                restore: true,
                id: "ujs-href-taker-popup-position"
            })
        });
        makeResizable(popupElem, {
            minW: 420, minH: 320,
            ...storeStateInLS({
                reset: resetPosition,
                restore: true,
                id: "ujs-href-taker-popup-size",
            })
        });

        // ------

        const extraSettingsButton = querySelector(`button[name="extra_settings_button"]`);
        const extraSettings       = querySelector(`#extra_settings`);
        extraSettingsButton.addEventListener("click", event => {
            extraSettings.classList.toggle("hidden");
            extraSettingsButton.classList.toggle("active");
        });

        // ------

        const closeButton = querySelector("#close-button");
        closeButton.addEventListener("click", () => {
            if (settings.keep_in_storage && settings.clear_store_on_close) {
                clearUrlsStore();
            }
            closeShadowContainer();
        });

        // ------

        function minimizePopup(resetPosition = false) {
            updateSettings({minimized: true});
            closePopup();
            renderMinimized(resetPosition);
        }
        const minimizeButton = querySelector("#minimize-button");
        minimizeButton.addEventListener("click", event => {
            minimizePopup();
        });
        minimizeButton.addEventListener("contextmenu", event => {
            event.preventDefault();
            minimizePopup(true);
        });

        // ------

        const checkboxList  = querySelectorAll("input[type=checkbox]");
        const inputList     = querySelectorAll("input[type=text]");
        checkboxList.forEach(checkbox => {
            checkbox.addEventListener("change", saveSetting);
        });
        const saveSettingDebounced = debounce(saveSetting, 250);
        inputList.forEach(checkbox => {
            checkbox.addEventListener("input", saveSettingDebounced);
        });
        function saveSetting() {
            const checkboxDataList  = checkboxList.map(checkbox => [checkbox.name, checkbox.checked]);
            const inputDataList     =    inputList.map(checkbox => [checkbox.name, checkbox.value]);
            const inputDisabledList =    inputList.map(checkbox => [checkbox.name + "_disabled", checkbox.disabled]);
            const _settings = Object.fromEntries([checkboxDataList, inputDataList, inputDisabledList].flat());
            const changedKeys = updateSettings(/** @type {Partial<ScriptSettings>} */ _settings);
            updateHtml(changedKeys);
        }
        let isListRendered = false;
        function updateHtml(changedSettingsKeys) {
            setSettingsDataAttributes();
            const passiveKeys = ["no_search_on_blur", "unsearchable"];
            if (passiveKeys.includes(changedSettingsKeys?.[0]) && changedSettingsKeys.length === 1) {
                return;
            }
            if (isListRendered) {
                renderUrlList();
            }
        }

        ["input-only", "input-ignore", "input-selector"].forEach(name => {
            const input      = querySelector(`#${name}`);
            const promptElem = querySelector(`#${name}-prompt`);
            promptElem.addEventListener("contextmenu", event => {
                event.preventDefault();
                input.toggleAttribute("disabled");
                saveSetting();
            });
            promptElem.addEventListener("dblclick", event => {
                input.value = "";
                saveSetting();
            });

            // todo save suggestions
            input.addEventListener("keyup", event => {
                if (event.key === "Enter" && event.shiftKey) {
                    event.preventDefault();
                    console.log(event);
                }
            });
        });

        const inputOnlyPromptElem = querySelector(`#input-only-prompt`);
        inputOnlyPromptElem.addEventListener("pointerdown", /** @param {PointerEvent} event */ event => {
            const MIDDLE_BUTTON = 1;
            if (event.button === MIDDLE_BUTTON) {
                event.preventDefault();
                updateSettings({reverse_input_only: !settings.reverse_input_only});
                updateHtml();
            }
        });

        // ------

        const selectorInput = querySelector(`input[name="input_selector"]`);
        selectorInput.addEventListener("input", debounce(() => checkSelectorInputValue(), 450));
        checkSelectorInputValue(true);
        function checkSelectorInputValue(onlyCheckIsValid = false) {
            let isReasonableSelector = false;
            let isValidSelector = true;
            try {
                const el = document.querySelector(settings.input_selector);
                if (el) {
                    isReasonableSelector = true;
                }
            } catch {
                isValidSelector = false;
            }
            if (!isValidSelector) {
                selectorInput.classList.add("red");
                extraSettingsButton.classList.add("red");
                return;
            }
            if (isReasonableSelector) {
                selectorInput.classList.remove("red");
                selectorInput.classList.remove("orange");
            } else if (!onlyCheckIsValid) {
                selectorInput.classList.add("orange");
            }
            extraSettingsButton.classList.remove("red");
        }

        // ------
        /** @type {string[]} */
        let mainUrls;
        /** @param {string[]} newUrls
         *  @return string[]  */
        function setMainUrls(newUrls) {
            mainUrls = newUrls;
            if (settings.console_vars) {
                setGlobalValue({urls: mainUrls});
            }
        }
        function clearMainUrls() {
            setMainUrls([]);
        }
        clearMainUrls();

        /** @param {string[]} newUrls */
        function addUrlsToStore(newUrls) {
            const urls = Array.from(new Set(newUrls));
            localStorage.setItem("ujs-href-taker-urls", JSON.stringify(urls));
        }
        function clearUrlsStore() {
            addUrlsToStore([]);
        }
        /** @returns {string[]}  */
        function getUrlsFromStore() {
            const str = localStorage.getItem("ujs-href-taker-urls") || "[]";
            let storedUrls;
            try {
                storedUrls = JSON.parse(str);
            } catch (e) {
                storedUrls = [];
            }
            return storedUrls;
        }
        if (settings.keep_in_storage) {
            setMainUrls(getUrlsFromStore());
        }

        /** @type {HTMLInputElement} */
        const checkboxKiS = querySelector(`[type="checkbox"][name="keep_in_storage"]`);
        checkboxKiS.addEventListener("change", () => {
            if (checkboxKiS.checked) {
                addUrlsToStore(mainUrls);
            } else {
                clearUrlsStore();
                renderUrlList();
            }
        });

        // ------

        const listBtn = querySelector(`button[name="list_button"]`);
        const listHelper = getListHelper(shadowContainer, settings);
        const tagsHelper = getTagsHelper(shadowContainer, settings);

        listHelper.headerElem.addEventListener("contextmenu", onClickToggleUnsearchable);
        /** @param {MouseEvent} event */
        function onClickToggleUnsearchable(event) {
            if (!event.target.classList.contains("header-content")) { return; }
            event.preventDefault();
            popupElem.toggleAttribute("data-unsearchable");
        }

        function getTagFilteredUrls() {
            if (!settings.show_tags || !tagsHelper.getTags().size) {
                return mainUrls;
            }
            return tagsHelper.getFilteredUrls();
        }

        const renderUrlListEventHandler = () => {
            if (settings.keep_in_storage) {
                clearMainUrls();
                clearUrlsStore();
            }
            renderUrlList();
        };
        listHelper.contentElem.addEventListener("click", renderUrlListEventHandler, {once: true});
        function renderUrlList(keepOld = false) {
            reparseUrlList(keepOld);
            listHelper.contentElem.removeEventListener("click", renderUrlListEventHandler);
            tagsHelper.renderTags(settings.show_tags ? mainUrls : [], onTagsChanges, keepOld);
            listHelper.insertUrls(getTagFilteredUrls());
            isListRendered = true;
        }
        function onTagsChanges() {
            listHelper.insertUrls(getTagFilteredUrls());
        }

        /* onLeftClick */
        listBtn.addEventListener("click", renderUrlListEventHandler);
        /* onMiddleClick */
        listBtn.addEventListener("pointerdown", function onMiddleClick(event) {
            const MIDDLE_BUTTON = 1; // LEFT = 0; RIGHT = 2; BACK = 3; FORWARD = 4;
            if (event.button !== MIDDLE_BUTTON) {
                return;
            }
            event.preventDefault();
            listHelper.clearList(true);
            tagsHelper.clearTags();
            clearMainUrls();
            listHelper.contentElem.addEventListener("click", renderUrlListEventHandler, {once: true});
            void clicked(listBtn);
        });
        /* onRightClick */
        listBtn.addEventListener("contextmenu", function onRightClick(event) {
            event.preventDefault();
            renderUrlList(true);
            void clicked(listBtn);
        });
        /* onPointerEnter */
        listBtn.addEventListener("pointerenter", event => {
            if (settings.append_on_hover) { // todo append urls on scroll over the button
                renderUrlList(true);
                void clicked(listBtn);
            }
        });
        // ------

        const copyButton = querySelector(`button[name="copy_button"]`);
        copyButton.addEventListener("click", event => {
            void navigator.clipboard.writeText(getTagFilteredUrls().join(" ") + " ");
        });
        copyButton.addEventListener("contextmenu", event => {
            event.preventDefault();
            void navigator.clipboard.writeText(getTagFilteredUrls().join("\n") + "\n");
            void clicked(copyButton);
        });
        copyButton.addEventListener("pointerdown", /** @param {PointerEvent} event */ event => {
            const MIDDLE_BUTTON = 1;
            if (event.button === MIDDLE_BUTTON) {
                event.preventDefault();
                void navigator.clipboard.writeText(getCodeArrays(getTagFilteredUrls()) + "\n");
                void clicked(copyButton);
            }
        });

        // ------

        function urlFilter(url) {
            return url
                && (settings.ignore_first_party ? !url.startsWith(location.origin) : true)
                && !url.startsWith("blob:") && !url.startsWith("javascript:");
        }
        function getSelector() {
            return settings.input_selector_disabled ? "body" : settings.input_selector;
        }

        // ------

        const urlsToTextButton = querySelector(`button[name="to_text_button"]`);
        let urlTexted = false;
        urlsToTextButton.addEventListener("click", () => {
            const selector = getSelector();
            if (!urlTexted) {
                urlsToText(selector, urlFilter);
            } else {
                undoUrlsToText(selector);
            }
            urlTexted = !urlTexted;
            urlsToTextButton.classList.toggle("active");
            if (isListRendered) {
                renderUrlList();
            }
        });

        // ------
        const urlHostnameComparator = (a, b) => {
            try {
                const aUrl = new URL(a);
                const bUrl = new URL(b);
                const aDomain = aUrl.hostname.split(".").slice(-2).join(".");
                const bDomain = bUrl.hostname.split(".").slice(-2).join(".");
                if (aDomain === bDomain) {
                    return aUrl.origin.localeCompare(bUrl.origin);
                }
                return aDomain.localeCompare(bDomain);
            } catch (e) {
                return 1;
            }
        };
        const urlComparator = (a, b) => a.localeCompare(b);

        // Updates `mainUrls`.
        function reparseUrlList(keepOld = false) {
            const selector = getSelector();
            let newUrls = parseUrls(selector, {
                includeTextUrls: settings.include_text_url,
                onlyTextUrls:    settings.only_text_url,
                bracketsTrim:    settings.brackets_trim,
                includeMedia:    settings.include_media,
            });

            if (keepOld || settings.keep_in_storage) {
                newUrls = [...mainUrls, ...newUrls];
            }

            let onlyTexts   =   settings.input_only.trim().split(/\s+/g).filter(o => o);
            let ignoreTexts = settings.input_ignore.trim().split(/\s+/g).filter(o => o);
            if (!settings.case_sensitive) {
                onlyTexts     = onlyTexts.map(text => text.toLowerCase());
                ignoreTexts = ignoreTexts.map(text => text.toLowerCase());
            }

            let matchOnly;
            let matchIgnore;
            if (!settings.case_sensitive) {
                matchOnly   = url =>   onlyTexts.some(text => url.toLowerCase().includes(text));
                matchIgnore = url => ignoreTexts.some(text => url.toLowerCase().includes(text));
            } else {
                matchOnly   = url =>   onlyTexts.some(text => url.includes(text));
                matchIgnore = url => ignoreTexts.some(text => url.includes(text));
            }

            newUrls = newUrls.filter(urlFilter);
            if (settings.https) {
                newUrls = newUrls.map(url => url.startsWith("http://") ? url.replace("http://", "https://"): url);
            }
            if (!settings.input_only_disabled && onlyTexts.length) {
                if (!settings.reverse_input_only) {
                    newUrls = newUrls.filter(url =>  matchOnly(url));
                } else {
                    newUrls = newUrls.filter(url => !matchOnly(url));
                }
            }
            if (!settings.input_ignore_disabled) {
                newUrls = newUrls.filter(url => !matchIgnore(url));
            }
            if (settings.unique) {
                newUrls = [...new Set(newUrls)];
            }
            if (settings.sort) {
                newUrls.sort(urlComparator);
            } else if (settings.hostname_sort) {
                newUrls.sort(urlHostnameComparator);
            }
            if (settings.reverse) {
                newUrls.reverse();
            }
            if (settings.console_log) {
                console.log(getCodeArrays(newUrls));
            }
            if (settings.keep_in_storage) {
                addUrlsToStore(newUrls);
            }
            setMainUrls(newUrls);
        }

        // ------

        const headers = querySelectorAll(`[data-header_name]`);
        for (const header of headers) {
            header.addEventListener("click", event => {
                const name = header.dataset.header_name;
                updateSettings({[name + "_collapsed"]: !settings[name + "_collapsed"]});
                setSettingsDataAttributes();
            });
        }

        // ------

        if (settings.auto_list) {
            renderUrlList();
        }
        if (settings.console_vars) {
            setGlobalValue({
                renderUrlList,
                getFilteredUrls: getTagFilteredUrls,
            });
        }

        // ------

        return {renderUrlList};
    }
}

function getMinimized() {
    const minimizedHtml = `
<div id="popup-minimized">
    <div>
        <span>HrefTaker</span>        
        <button id="open-popup" title="Open popup">O</button>
        <button id="close-popup" title="Close popup">X</button>
    </div>
</div>`;

    const minimizedCss = cssFromStyle`
<style>
#popup-minimized {
    position: fixed;
    width: fit-content;
    background-color: white;
    padding: 3px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
    border: 1px solid gray;
    border-radius: 2px;
}
#popup-minimized span {
    padding: 0 4px;
}
</style>`;

    return {minimizedHtml, minimizedCss};
}

/**
 * @param {object} opt
 * @param {ScriptSettings} opt.settings
 * @param {(ss: Partial<ScriptSettings>) => string[]} opt.updateSettings
 * @param {Wrapper} opt.wrapper
 * @param {Popup} opt.popup
 * @param {Minim} opt.minim
 */
function initMinimized({settings, updateSettings, wrapper, popup, minim}) {
    Object.assign(minim, {closeMinimized, renderMinimized});

    function closeMinimized() {
        wrapper.isShadowContainerInited() && wrapper.querySelector("#popup-minimized")?.remove();
        wrapper.element.classList.remove("minimized");
    }

    const {minimizedHtml, minimizedCss} = getMinimized();
    function renderMinimized(resetPosition = false) {
        const {querySelector, initShadowContainer, closeShadowContainer} = wrapper;
        const {closePopup, renderPopup} = popup;

        const shadowContainer = initShadowContainer();

        const wasOpened = querySelector("#popup-minimized");
        closePopup();
        closeMinimized();
        resetPosition = wasOpened || resetPosition;

        shadowContainer.insertAdjacentHTML("afterbegin", minimizedHtml);
        const minimizedElem = querySelector("#popup-minimized");
        addCSS(minimizedCss, minimizedElem);

        makeMovable(minimizedElem, {
            ...storeStateInLS({
                reset: resetPosition,
                restore: true,
                id: "ujs-href-taker-popup-minimized-position"
            })
        });

        const openButton  = minimizedElem.querySelector( "#open-popup");
        const closeButton = minimizedElem.querySelector("#close-popup");
        openButton.addEventListener("click", event => {
            renderPopup();
        });
        closeButton.addEventListener("click", event => {
            updateSettings({minimized: false});
            closeShadowContainer();
        });

        wrapper.element.classList.add("minimized");
    }
}

/**
 * @typedef {object} Wrapper
 * @property {(selector: string) => HTMLElement} querySelector
 * @property {(selector: string) => HTMLElement[]} querySelectorAll
 * @property {Function} initShadowContainer
 * @property {Function} closeShadowContainer
 * @property {Function} isShadowContainerInited
 * @property {HTMLDivElement} element
 *//**
 * @typedef {object} Popup
 * @property {Function} renderPopup
 * @property {Function} closePopup
 *//**
 * @typedef {object} Minim
 * @property {Function} closeMinimized
 * @property {Function} renderMinimized
 */

/**
 * @param {ScriptSettings} settings
 * @param {(ss: Partial<ScriptSettings>) => string[]} updateSettings
 */
function getRenders(settings, updateSettings) {
    /** @type {Wrapper} */
    const wrapper = {};
    /** @type {Popup} */
    const popup = {};
    /** @type {Minim} */
    const minim = {};

    initWrapper({settings, updateSettings, wrapper});
    initPopup({settings, updateSettings, wrapper, popup, minim});
    initMinimized({settings, updateSettings, wrapper, popup, minim});

    return {
        showPopup: popup.renderPopup,
        closePopup: popup.closePopup,
        showMinimized: minim.renderMinimized,
        closeMinimized: minim.closeMinimized,
        close: wrapper.closeShadowContainer,
    };
}

const {showPopup} = initHrefTaker();
if (typeof GM_registerMenuCommand === "function") {
    GM_registerMenuCommand("Show popup", () => showPopup());
}

function initHrefTaker() {
    const {settings, updateSettings} = loadSettings();

    // {showPopup, closePopup, showMinimized, closeMinimized, close}
    const render = getRenders(settings, updateSettings);

    if (settings.auto_open || settings.opened) {
        if (settings.minimized === true) {
            render.showMinimized();
        } else {
            render.showPopup();
        }
    }
    const methods = {...render, settings, updateSettings};
    if (settings.console_vars) {
        setGlobalValue(methods);
    }

    return methods;
}
