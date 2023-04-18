// ==UserScript==
// @name        HrefTaker
// @version     0.9.3-2023.4.18-2f7a85
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
function addCSS(cssText, target = document.head) {
    if (typeof GM_addElement === "function") {
        return GM_addElement(target, "style", {textContent: cssText});
    }
    const styleElem = document.createElement("style");
    styleElem.textContent = cssText;
    target.append(styleElem);
    return styleElem;
}

const debug = location.pathname === "/href-taker/demo.html" && ["localhost", "alttiri.github.io"].some(h => location.hostname === h);

/**
 * @typedef {Object|null} ScriptSettings
 * @property {string}  input_only
 * @property {boolean} input_only_disabled
 * @property {string}  input_ignore
 * @property {boolean} input_ignore_disabled
 * @property {boolean} include_text_url
 * @property {boolean} only_text_url
 * @property {boolean} console_log
 * @property {boolean} console_vars
 * @property {boolean} unique
 * @property {boolean} sort
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
 * @property {boolean} tags_collapsed
 * @property {boolean} filters_collapsed
 * @property {boolean} controls_collapsed
 * @property {boolean} unselectable
 */

/** @return {{settings: ScriptSettings, updateSettings: function}} */
function loadSettings() {
    /** @type {ScriptSettings} */
    const defaultSettings = {
        input_only: "",
        input_only_disabled: false,
        input_ignore: "",
        input_ignore_disabled: false,
        include_text_url: true,
        only_text_url: false,
        console_log: debug,
        console_vars: debug,
        unique: true,
        sort: true,
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
        show_tags: false,
        tags_collapsed: false,
        filters_collapsed: false,
        controls_collapsed: false,
        unselectable: true,
    };
    const LocalStoreName = "ujs-href-taker";

    /** @type ScriptSettings */
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

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function debounce(runnable, ms = 100) {
    let timerId;
    return function() {
        if (timerId) {
            clearTimeout(timerId);
        }
        timerId = setTimeout(() => {
            runnable.apply(this, arguments);
            timerId = null;
        }, ms);
    }
}

/**
 * `hashCode` like
 * @example
 * hashString("Qwerty") === -1862984904
 * hashString("A") === 65
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

/** @param {ScriptSettings} settings */
function getPopup(settings) {
    const {
        input_only,
        input_only_disabled,
        input_ignore,
        input_ignore_disabled,
        include_text_url,
        only_text_url,
        console_log,
        console_vars,
        unique,
        sort,
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
        // tags_collapsed,
        // filters_collapsed,
        // controls_collapsed,
        unselectable,
    } = settings;
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
                <button title="From anchors" name="list_button" class="short btn-left">List links</button>
                <span id="include-text-url-wrapper">
                    <label title="Include URLs parsed from text">
                        <input type="checkbox" name="include_text_url" ${checked(include_text_url)}>
                        Include text
                    </label>
                </span>
                <label title="Only URLs parsed from text">
                    <input type="checkbox" name="only_text_url" ${checked(only_text_url)}>
                    Only text
                </label>
            </div>
            <div>
                <button name="to_text_button" class="long btn-right">URLs to text</button>
            </div>
        </div>
        <div class="control-row">
            <div class="control-row-inner">
                <button title="Copy URLs separated by space" name="copy_button" class="short btn-left">Copy</button>
            </div>
            <button title="Show Extra Settings" name="extra_settings_button" class="long btn-right">Extra Settings</button>
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
                    <label title="Sort URLs by hostname">
                        <input type="checkbox" name="sort" ${checked(sort)}>
                        Sort
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
                    <label title="Log the result list to console">
                        <input type="checkbox" name="console_log" ${checked(console_log)}>
                        Console log
                    </label>
                    <label title="Expose variables to console">
                        <input type="checkbox" name="console_vars" ${checked(console_vars)}>
                        Console vars
                    </label>
                    <label title="Unselectable and unsearchable (with Ctrl + F) text in the result URLs list">
                        <input type="checkbox" name="unselectable" ${checked(unselectable)}>
                        Ephemeral
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
#popup:focus {
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
}
#popup:has(*:focus) {
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
#popup[data-unselectable]:not(:focus) [data-unselectable-text]:after {
    content: attr(data-unselectable-text);
}
#popup[data-unselectable]:not(:focus) .selectable {
    display: none;
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

/*:root {*/
/*  --width: 720px;*/
/*}*/
#popup {
    /*width: var(--width);*/
    width: 720px;
    background-color: white;
    height: 580px;
    border: 1px solid darkgray;
    padding: 6px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.4);
    transition: box-shadow 0.1s;
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
    width: calc(720px - 24px);
    padding-top: 4px;
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

[data-only-text-url] #include-text-url-wrapper {
    color: gray;
}

[data-reverse-input-only] #input-only-prompt,
[data-reverse-input-only] #input-only {
    text-decoration: line-through;
}

input[disabled] {
    color: gray;
}

.urls-hash {
    color: gray;
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
 * @param container
 * @param {ScriptSettings} settings
 */
function getTagsHelper(container, settings) {
    const tagsListContainerEl  = container.querySelector(`.tags-list`);
    const tagsPopupContainerEl = container.querySelector(`.tags-popup`);

    let tags = [];
    let tagsReversed = false;
    let onUpdateCb = null;

    /** @param {Event} event */
    function getTagFromEvent(event) {
        const tagEl = /** @type {HTMLElement} */ event.target;
        if (!tagEl.classList.contains("tag")) {
            return null;
        }
        return tagEl;
    }

    tagsPopupContainerEl.addEventListener("click", onClickSelectTagFromPopup);
    /** @param {MouseEvent} event */
    function onClickSelectTagFromPopup(event) {
        const popupTagEl = getTagFromEvent(event);
        if (!popupTagEl) { return; }

        const selected = popupTagEl.classList.contains("selected");
        if (selected) {
            const listTagEl = tagsListContainerEl.querySelector(`[data-tag="${popupTagEl.dataset.tag}"]`);
            listTagEl.remove();
            tags = tags.filter(tag => tag !== popupTagEl.dataset.tag);
        } else {
            tagsListContainerEl.append(popupTagEl.cloneNode(true));
            tags.push(popupTagEl.dataset.tag);
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
        tags = tags.filter(tag => tag !== listTagEl.dataset.tag);
        listTagEl.remove();
        updateAddTagBtn();
        onUpdateCb?.();
    }
    tagsListContainerEl.addEventListener("click", onClickRemoveTagFromSelect);

    function disableAllSelectedTagElems() {
        for (const tag of tags) {
            const listTagEl = tagsListContainerEl.querySelector(`[data-tag="${tag}"]`);
            const popupTagEl = tagsPopupContainerEl.querySelector(`[data-tag="${tag}"]`);
            listTagEl.classList.add("disabled");
            popupTagEl.classList.add("disabled");
        }
        tags = [];
    }
    function enableAllSelectedTagElems() {
        const listTagEls = [...tagsListContainerEl.querySelectorAll(`[data-tag].disabled`)];
        for (const listTagEl of listTagEls) {
            const tag = listTagEl.dataset.tag;
            const popupTagEl = tagsPopupContainerEl.querySelector(`[data-tag="${tag}"].disabled`);
            listTagEl.classList.remove("disabled");
            popupTagEl.classList.remove("disabled");
            tags.push(tag);
        }
    }
    function enableTag(listTagEl) {
        const tag = listTagEl.dataset.tag;
        const popupTagEl = tagsPopupContainerEl.querySelector(`[data-tag="${tag}"].disabled`);
        listTagEl.classList.remove("disabled");
        popupTagEl.classList.remove("disabled");
        tags.push(tag);
    }
    function disableTag(listTagEl) {
        const tag = listTagEl.dataset.tag;
        const popupTagEl = tagsPopupContainerEl.querySelector(`[data-tag="${tag}"]`);
        listTagEl.classList.add("disabled");
        popupTagEl.classList.add("disabled");
        tags = tags.filter(t => t !== tag);
    }
    function disableSelectedTag(listTagEl, popupTagEl) {
        const disabled = listTagEl.classList.toggle("disabled");
        if (disabled) {
            tags = tags.filter(tag => tag !== listTagEl.dataset.tag);
            popupTagEl.classList.add("disabled");
        } else {
            tags.push(listTagEl.dataset.tag);
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
                if (tags.length > 1) {
                    disableAllSelectedTagElems();
                    enableTag(listTagEl);
                } else {
                    enableAllSelectedTagElems();
                }
            } else {
                const listTagEls = [...tagsListContainerEl.querySelectorAll(`[data-tag]`)];
                if (tags.length + 1 === listTagEls.length) {
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
    tagsListContainerEl.addEventListener("contextmenu", onContextMenuToggleDisablingSelectedTag);

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
    tagsPopupContainerEl.addEventListener("contextmenu", onContextMenuAddPopupTagOrToggleDisabling);

    const tagListWrapperEl   = container.querySelector(".tags-list-wrapper");
    const tagsPopupWrapperEl = container.querySelector(".tags-popup-wrapper");
    const addTagBtnEl        = container.querySelector(".tag-add");
    const addTagBtnContentEl = container.querySelector(".tag-add span");

    addTagBtnEl.addEventListener("click", openTagsPopup);
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
        const disabledText = disabled ? ` (${selected - disabled})` : "";
        addTagBtnEl.title = `${selected}${disabledText} of ${total}`;
    }

    /** @param {MouseEvent} event */
    function onContextMenuSelectAllTagsOrClear(event) {
        event.preventDefault();
        void clicked(addTagBtnEl);
        const tagEls = [...tagsPopupWrapperEl.querySelectorAll(".tag:not(.selected)")];
        if (tagEls.length) {
            for (const tagEl of tagEls) {
                tagsListContainerEl.append(tagEl.cloneNode(true));
                tags.push(tagEl.dataset.tag);
                tagEl.classList.add("selected");
            }
        } else {
            tags = [];
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
    addTagBtnEl.addEventListener("contextmenu", onContextMenuSelectAllTagsOrClear);


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
    addTagBtnEl.addEventListener("pointerdown", onMMBPointerDownReverseSelectedTags);

    function renderTags(urls, onUpdate) {
        tags = [];
        tagsReversed = false;
        tagListWrapperEl.classList.remove("reversed");
        addTagBtnEl.classList.remove("active");
        tagsListContainerEl.innerHTML = "";
        if (onUpdate) {
            onUpdateCb = onUpdate;
        }

        const hostCountMap = {};
        for (const url of urls) {
            const host = url.match(/\w+\.\w+(?=\/)/)?.[0];
            if (!host) {
                continue;
            }
            hostCountMap[host] = (hostCountMap[host] || 0) + 1;
        }
        const hostCountEntries = Object.entries(hostCountMap)
            .sort(([k1, v1], [k2, v2]) => {
                return v2 - v1;
            });

        let tagsHtml = "";
        for (const [k, v] of hostCountEntries) {
            const color = getHsl(hashString(k), 90, 5);
            tagsHtml += `<span class="tag" data-tag="${k}" title="${v}" data-color="${color}"></span>`;
        }
        tagsPopupContainerEl.innerHTML = tagsHtml;
        const tagsEls = [...tagsPopupContainerEl.querySelectorAll(`.tag[data-color]`)];
        tagsEls.forEach(tag => tag.style.backgroundColor = tag.dataset.color);

        updateAddTagBtn();
    }

    function filterTags(urls) {
        let urlsFilteredByTags = urls;
        if (tags.length) {
            let matchOnly;
            if (!settings.case_sensitive) {
                matchOnly = url => tags.some(tag => url.toLowerCase().includes(tag));
            } else {
                matchOnly = url => tags.some(tag => url.includes(tag));
            }
            if (!tagsReversed) {
                urlsFilteredByTags = urls.filter(url =>  matchOnly(url));
            } else {
                urlsFilteredByTags = urls.filter(url => !matchOnly(url));
            }
        }
        return urlsFilteredByTags;
    }

    return {
        renderTags,
        filterTags,
    }
}

/**
 * @param {HTMLElement} container
 * @param {ScriptSettings} settings
 */
function getListHelper(container, settings) {
    const headerElem  = container.querySelector(`#result-list-header`);
    const contentElem = container.querySelector(`#result-list`);
    const mainHost = url => new URL(url).hostname.split(".").slice(-2).join(".");

    const clickedUrls = new Set();
    /** @param {MouseEvent} event */
    function onClickMarkUrlAsClicked(event) {
        if (!event.target.classList.contains("visible")) {
            return;
        }
        const urlItem = event.target.closest(".url-item");
        urlItem.classList.add("clicked");
        const url = urlItem.querySelector("a").href;
        clickedUrls.add(url);
        const dupLinks = [...contentElem.querySelectorAll(`.url-item:not(.clicked) a[href="${url}"]`)];
        for (const dupLink of dupLinks) {
            dupLink.closest(".url-item").classList.add("clicked");
        }
    }
    contentElem.addEventListener("click", onClickMarkUrlAsClicked);

    /** @param {MouseEvent} event */
    function onAltContextMenuUnmarkClickedUrl(event) {
        if (!event.altKey) {
            return;
        }
        if (!event.target.classList.contains("visible")) {
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
    contentElem.addEventListener("contextmenu", onAltContextMenuUnmarkClickedUrl);

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
            headerElem.innerHTML = `Result list (${urls.length}) <span class="urls-hash">#${hexes.toUpperCase()}</span>`;

            let resultHtml = "";
            let prev = urls[0];
            for (const url of urls) {
                let linkHtml = urlToHtml(url);
                if (settings.sort) {
                    try {
                        if (mainHost(prev) !== mainHost(url)) {
                            resultHtml += `<span class="url-pad"></span>`;
                        }
                        prev = url;
                    } catch (e) {
                        console.error(url, e);
                    }
                }
                const clicked = clickedUrls.has(url) ? " clicked" : "";
                const html = `<div class="url-item${clicked}"><a href="${url}" target="_blank" rel="noreferrer noopener">${linkHtml}</a></div>`;
                resultHtml += html;
            }
            contentElem.insertAdjacentHTML("beforeend", resultHtml);
        },
        headerElem,
        contentElem,
    };
}

/** @return {string[]} */
function parseUrls(targetSelector = "body", {
    includeTextUrls, onlyTextUrls, bracketsTrim,
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
        }

        urls.push(anchorUrls);
        if (includeTextUrls) {
            const textUrls = parseUrlsFromText(el.innerText, bracketsTrim);
            urls.push(textUrls.filter(url => !anchorUrls.includes(url)));
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

/**
 * @param {HTMLElement} element
 * @param {{[string]: string}} state
 */
function assignStyleState(element, state) {
    for (const [k, v] of Object.entries(state)) {
        element.style[k]  = v;
    }
}

/**
 * @param {HTMLElement} element
 * @param {Object?} opts
 * @param {HTMLElement?} opts.handle
 * @param {function?} opts.onStop
 * @param {function?} opts.onMove
 * @param {{top: string, left: string}?} opts.state
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

    handle = handle || element;
    handle.style["user-select"] = "none";
    handle.style["touch-action"] = "none";
    element.style.position = "absolute";

    handle.addEventListener("pointerdown", event => {
        event = event.targetTouches?.[0] || event;
        const offsetY = event.clientY - parseInt(getComputedStyle(element).top);
        const offsetX = event.clientX - parseInt(getComputedStyle(element).left);

        let state;
        function onMove(event) {
            !handle.hasPointerCapture(event.pointerId) && handle.setPointerCapture(event.pointerId);
            event = event.targetTouches?.[0] || event;
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
 * @param {Object?} opts
 * @param {number?} opts.minW
 * @param {number?} opts.minH
 * @param {number?} opts.size
 * @param {function?} opts.onStop
 * @param {function?} opts.onMove
 * @param {{width: string, height: string}?} opts.state
 */
function makeResizable(element, {
    minW = 240, minH = 240, size = 16, onStop: _onStop, onMove, state
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

    lrCorner.addEventListener("pointerdown",event => {
        event = event.targetTouches?.[0] || event;
        lrCorner.setPointerCapture(event.pointerId);
        const offsetX = event.clientX - element.offsetLeft - parseInt(getComputedStyle(element).width);
        const offsetY = event.clientY - element.offsetTop  - parseInt(getComputedStyle(element).height);

        let state;
        function onMove(event) {
            event = event.targetTouches?.[0] || event;
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
 * @param {Object} opts
 * @param {string} opts.id
 * @param {function?} opts.onMove
 * @param {function?} opts.onStop
 * @param {boolean?} opts.reset
 * @param {boolean?} opts.restore
 * @return {{state?: Object, onMove: function, onStop: function}}
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
 * @param {ScriptSettings} settings
 * @param {function(ScriptSettings)} updateSettings
 */
function getRenders(settings, updateSettings) {
    const {wrapperHtml, wrapperCss}     = getWrapper();
    const {minimizedHtml, minimizedCss} = getMinimized();
    const {popupHtml, popupCss}         = getPopup(settings);


    let shadowContainer = null;
    const querySelector    = selector => shadowContainer.querySelector(selector);
    const querySelectorAll = selector => shadowContainer.querySelectorAll(selector);

    const insertSelector = "html"; // "body", "html"
    function renderShadowContainer() {
        const insertPlace   = document.querySelector(insertSelector);
        const shadowWrapper = document.createElement("div");
        shadowWrapper.setAttribute("id", "href-taker-outer-shadow-wrapper");
        shadowWrapper.attachShadow({mode: "open"});
        shadowWrapper.shadowRoot.innerHTML = wrapperHtml;
        {
            insertPlace.append(shadowWrapper);
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
            return false;
        }
        return true;
    }

    function renderPopup(resetPosition = false) {
        initShadowContainer();
        updateSettings({minimized: false});

        const wasOpened = querySelector("#popup");
        closePopup();
        closeMinimized();
        resetPosition = wasOpened || resetPosition;

        shadowContainer.insertAdjacentHTML("afterbegin", popupHtml);
        const popupElem = querySelector("#popup");
        addCSS(popupCss, popupElem);
        setSettingsDataAttributes();

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

        const headerElem     = querySelector("#popup-header");
        const resultListElem = querySelector("#result-list-wrapper");
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
                onMove(state) {
                    resultListElem.style.width = (parseInt(state.width) - 8) + "px";
                },
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
        closeButton.addEventListener("click", closeShadowContainer);

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

        const checkboxList  = [...querySelectorAll("input[type=checkbox]")];
        const inputList     = [...querySelectorAll("input[type=text]")];
        checkboxList.forEach(checkbox => {
            checkbox.addEventListener("change", saveSetting);
        });
        const saveSettingDebounced = debounce(saveSetting, 150);
        inputList.forEach(checkbox => {
            checkbox.addEventListener("input", saveSettingDebounced);
        });
        function saveSetting() {
            const checkboxDataList  = checkboxList.map(checkbox => [checkbox.name, checkbox.checked]);
            const inputDataList     =    inputList.map(checkbox => [checkbox.name, checkbox.value]);
            const inputDisabledList =    inputList.map(checkbox => [checkbox.name + "_disabled", checkbox.disabled]);
            const _settings = Object.fromEntries([checkboxDataList, inputDataList, inputDisabledList].flat());
            const changedKeys = updateSettings(_settings);
            updateHtml(changedKeys);
        }
        let isListRendered = false;
        function updateHtml(changedSettingsKeys) {
            setSettingsDataAttributes();
            if (changedSettingsKeys?.[0] === "unselectable" && changedSettingsKeys.length === 1) {
                refreshUrlList();
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

        let urls = [];
        if (settings.console_vars) {
            global.urls = urls;
        }

        // ------

        const listBtn = querySelector(`button[name="list_button"]`);
        const listHelper = getListHelper(shadowContainer, settings);

        const tagsHelper = getTagsHelper(shadowContainer, settings);

        function refreshUrlList() {
            if (isListRendered) {
                listHelper.insertUrls(tagsHelper.filterTags(urls));
            }
        }
        function renderUrlList() {
            reparseUrlList();
            listHelper.contentElem.removeEventListener("click", renderUrlList);
            const urlsForTags = settings.case_sensitive ? urls : urls.map(url => url.toLowerCase());
            tagsHelper.renderTags(urlsForTags, onTagsChanges);
            listHelper.insertUrls(urls);
            isListRendered = true;
        }
        function onTagsChanges() {
            listHelper.insertUrls(tagsHelper.filterTags(urls));
        }

        listBtn.addEventListener("click", renderUrlList);
        listHelper.contentElem.addEventListener("click", renderUrlList, {once: true});
        listBtn.addEventListener("contextmenu", event => {
            event.preventDefault();
            listHelper.clearList(true);
            listHelper.contentElem.addEventListener("click", renderUrlList, {once: true});
            void clicked(listBtn);
        });

        // ------

        const copyButton = querySelector(`button[name="copy_button"]`);
        copyButton.addEventListener("click", event => {
            void navigator.clipboard.writeText(tagsHelper.filterTags(urls).join(" "));
        });
        copyButton.addEventListener("contextmenu", event => {
            event.preventDefault();
            void navigator.clipboard.writeText(tagsHelper.filterTags(urls).join("\n"));
            void clicked(copyButton);
        });
        copyButton.addEventListener("pointerdown", /** @param {PointerEvent} event */ event => {
            const MIDDLE_BUTTON = 1;
            if (event.button === MIDDLE_BUTTON) {
                event.preventDefault();
                void navigator.clipboard.writeText(getCodeArrays(tagsHelper.filterTags(urls)));
                void clicked(copyButton);
            }
        });

        function getCodeArrays(items, size = 100) {
            const jsonArray = a => `${a.length ? "[\"" + a.join(`", "`) + "\"]" : "[]"}`;
            if (items.length <= size) {
                return `/* ${items.length.toString().padStart(3)} */ ${jsonArray(items)},`;
            }
            const len = s => s.toString().length;
            const count = Math.trunc(items.length / size);
            const comment = items.length.toString().padStart(1 + len(items.length)) + " ".repeat(3 + len(count));
            const parts = [`/* ${comment} */`];
            for (let i = 0; i <= count; i++) {
                const part = items.slice(size * i, size + size * i);
                const page = `(${i + 1})`.padStart(2 + len(count));
                const pageCount = part.length.toString().padStart(1 + len(items.length));
                parts.push(`/* ${pageCount} ${page} */ ${jsonArray(part)},`);
            }
            return parts.join("\n");
        }

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
        const urlComparator = (a, b) => {
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
        function reparseUrlList() {
            const selector = getSelector();
            urls = parseUrls(selector, {
                includeTextUrls: settings.include_text_url,
                onlyTextUrls:    settings.only_text_url,
                bracketsTrim:    settings.brackets_trim,
            });

            let onlyTexts = settings.input_only.trim().split(/\s+/g).filter(o => o);
            let ignoreTexts = settings.input_ignore.trim().split(/\s+/g).filter(o => o);
            if (!settings.case_sensitive) {
                onlyTexts = onlyTexts.map(text => text.toLowerCase());
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

            urls = urls.filter(urlFilter);
            if (settings.https) {
                urls = urls.map(url => url.startsWith("http://") ? url.replace("http://", "https://"): url);
            }
            if (!settings.input_only_disabled && onlyTexts.length) {
                if (!settings.reverse_input_only) {
                    urls = urls.filter(url =>  matchOnly(url));
                } else {
                    urls = urls.filter(url => !matchOnly(url));
                }
            }
            if (!settings.input_ignore_disabled) {
                urls = urls.filter(url => !matchIgnore(url));
            }
            if (settings.unique) {
                urls = [...new Set(urls)];
            }
            if (settings.sort) {
                urls.sort(urlComparator);
            }
            if (settings.reverse) {
                urls.reverse();
            }
            if (settings.console_log) {
                console.log(getCodeArrays(urls));
            }
            if (settings.console_vars) {
                global.urls = urls;
            }
        }

        // ------

        const headers = [...querySelectorAll(`[data-header_name]`)];
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
            Object.assign(global, {renderUrlList});
            Object.assign(global, {filterTags: tagsHelper.filterTags});
        }

        // ------

        return {renderUrlList};
    }
    function closePopup() {
        shadowContainer?.querySelector("#popup")?.remove();
    }

    function closeMinimized() {
        shadowContainer?.querySelector("#popup-minimized")?.remove();
    }
    function renderMinimized(resetPosition = false) {
        initShadowContainer();

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
    }

    return {
        showPopup: renderPopup,
        closePopup,

        showMinimized: renderMinimized,
        closeMinimized,

        close: closeShadowContainer,
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
        Object.assign(global, methods);
    }

    return methods;
}
