// ==UserScript==
// @name        HrefTaker
// @version     0.0.0-2023.02.20
// @namespace   gh.alttiri
// @description URL grabber popup
// @license     GPL-3.0
// @homepageURL https://github.com/AlttiRi/href-taker
// @supportURL  https://github.com/AlttiRi/href-taker/issues
// @match       *://*/*
// @grant       GM_registerMenuCommand
// ==/UserScript==

let global = typeof unsafeWindow === "object" ? unsafeWindow.globalThis : globalThis;
let debug = true;

let {settings, showSettings, closeSettings} = getSettings("href-taker");
if (typeof GM_registerMenuCommand === "function") {
    GM_registerMenuCommand("Show popup", showSettings);
}
if (debug) {
    showSettings();
    // showSettings();
}


function getSettings(name) {
    /**
     * @typedef {Object|null} Settings
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
     * @property {boolean} auto
     */

    const LocalStoreName = "ujs-" + name;
    /** @type Settings */
    let settings = loadSettings();
    function loadSettings() {
        const defaultSettings = {
            input_only: "",
            input_only_disabled: false,
            input_ignore: "",
            input_ignore_disabled: false,
            include_text_url: true,
            only_text_url: false,
            console_log: false,
            console_vars: true,
            unique: true,
            sort: true,
            reverse: false,
            ignore_first_party: true,
            input_selector: "body",
            input_selector_disabled: false,
            https: true,
            auto: true,
        };

        let savedSettings;
        try {
            savedSettings = JSON.parse(localStorage.getItem(LocalStoreName)) || {};
        } catch (e) {
            console.error("[ujs]", e);
            localStorage.removeItem(LocalStoreName);
            savedSettings = {};
        }
        savedSettings = Object.assign(defaultSettings, savedSettings);
        return savedSettings;
    }
    let opened = false;
    function closeSettings() {
        document.querySelector("body > .ujs-modal-main-wrapper")?.remove();
        opened = false;
    }
    function showSettings() {
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
            auto,
        } = settings;

        function setSettingsDataAttributes() {
            const settingsElem = document.querySelector(".ujs-modal-settings");
            if (!settingsElem) {
                return;
            }
            for (const [key, value] of Object.entries(settings)) {
                if (typeof value !== "boolean") {
                    continue;
                }
                const attr = `data-${key.replaceAll("_", "-")}`;
                if (value) {
                    settingsElem.setAttribute(attr, "");
                } else {
                    settingsElem.removeAttribute(attr);
                }
            }
        }

        let resetPopup = false;
        if (opened) {
            resetPopup = true;
            closeSettings();
        }
        opened = true;

        const checked  = isChecked  => isChecked  ? "checked"  : "";
        const disabled = isDisabled => isDisabled ? "disabled" : "";
        const wrapperHtml = `
<div class="ujs-modal-main-wrapper"> 
<style>
.ujs-modal-main-wrapper {
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
}
.ujs-modal-main-wrapper > * {
    pointer-events: all;
}
</style>
</div>
        `;
        document.body.insertAdjacentHTML("afterbegin", wrapperHtml);

        if (localStorage.getItem("href-taker-popup-minimized") === "true" && !resetPopup) {
            renderMinimize();
            return;
        }

        const popupHtml = `
<div class="ujs-modal-settings">
<style>
.ujs-hidden {
    display: none!important;
}
.ujs-red {
    color: red;
    border-color: red;
}
.ujs-orange {
    color: darkorange;
    border-color: darkorange;
}

/*:root {*/
/*  --width: 720px;*/
/*}*/

.ujs-modal-main-wrapper .ujs-modal-settings {
    /*width: var(--width);*/
    width: 720px;
    background-color: white;
    min-height: 320px;
    border: 1px solid darkgray;
    padding: 6px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
    pointer-events: initial;
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
#result-list-fieldset {
    width: calc(720px - 24px);
    padding: 4px 4px 8px 12px;
    flex-grow: 1;
    overflow-y: hidden;
}

.ujs-modal-main-wrapper .text-inputs-wrapper label {
    display: flex;
}
.ujs-modal-main-wrapper input[type="text"] {
    width: 100%;
    margin-left: 8px;
}
.ujs-modal-main-wrapper label > span {
    min-width: 54px;
}
.ujs-modal-main-wrapper label,
.ujs-modal-main-wrapper button {
    user-select: none;
}

.ujs-modal-main-wrapper button {
    margin: 4px;
}
.ujs-modal-main-wrapper .control-row {
   display: flex;
   flex-direction: row;
   justify-content: space-between;
}
.ujs-modal-main-wrapper .control-row .control-row-inner {
   display: flex;
   align-items: center;
}
.ujs-modal-main-wrapper .control-row-inner > * {
    margin-right: 8px;
}

.ujs-modal-main-wrapper [data-only-text-url] #include-text-url-wrapper {
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

/*.minimized {*/
/*    position: absolute;*/
/*    top: 0;*/
/*    right: 0;*/
/*}*/

</style>

    <div class="header">
        <button id="minimize-button">_</button>
        <button id="close-button">X</button>
    </div>
    <fieldset class="text-inputs-wrapper">
        <legend id="legend-filters">Filters</legend>
        <label>
            <span class="input-prompt" id="input-only-prompt">Only</span>
            <input id="input-only" type="text" name="input_only" value="${input_only}" ${disabled(input_only_disabled)} spellcheck="false">
        </label>
        <hr>
        <label>
            <span class="input-prompt" id="input-ignore-prompt">Ignore</span>
            <input id="input-ignore" type="text" name="input_ignore" value="${input_ignore}" ${disabled(input_ignore_disabled)} spellcheck="false">
        </label>
    </fieldset>
    <fieldset>
        <legend>Controls</legend>  
        <div class="control-row">
            <div class="control-row-inner">
                <button title="From anchors" name="list_button">List links</button>
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
                <button name="to_text_button">URLs to text</button>
            </div>
        </div>
        <div class="control-row">
            <div class="control-row-inner">
                <button title="Copy URLs separated by space" name="copy_button">Copy</button>
                <button title="Close it" name="close_button">Close</button>
            </div>
            <button title="Show Extra Settings" name="extra_settings_button">Extra Settings</button>
        </div>
        <div class="ujs-hidden" id="extra_settings">
            <hr>
            <div class="control-row">
                <div class="control-row-inner" style="flex-wrap: wrap;">
                    <label title="Log the result list to console">
                        <input type="checkbox" name="console_log" ${checked(console_log)}>
                        Console log
                    </label>
                    <label title="Expose variables to console">
                        <input type="checkbox" name="console_vars" ${checked(console_vars)}>
                        Console vars
                    </label>
                </div>
                <div class="control-row-inner" style="flex-wrap: wrap;">                        
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
                    <label title="Don't list 1st-party URLs">
                        <input type="checkbox" name="ignore_first_party" ${checked(ignore_first_party)}>
                        No 1st-party
                    </label>                        
                    <label title="Replace http:// with https://">
                        <input type="checkbox" name="https" ${checked(https)}>
                        https
                    </label>
                    <label title="Auto list URLs on the pop is shown">
                        <input type="checkbox" name="auto" ${checked(auto)}>
                        Auto
                    </label>
                </div>
            </div>
            <div class="text-inputs-wrapper">
                <hr>
                <label title="Target selector. By default, it is &quot;body&quot; selector.">
                    <span id="input-selector-prompt">Selector</span>
                    <input id="input-selector" type="text" name="input_selector" value="${input_selector}" ${disabled(input_selector_disabled)} spellcheck="false">
                </label>
            </div>
        </div>

    </fieldset>
    <fieldset id="result-list-fieldset">
        <legend id="result-list-legend">Result list</legend>            
        <div id="result-list">
            <div style="margin: 5px; color: gray;">Click here to list URLs...</div>
        </div>
    </fieldset>      
</div>
        `;
        document.querySelector(".ujs-modal-main-wrapper").insertAdjacentHTML("beforeend", popupHtml);
        setSettingsDataAttributes();


        const container      = document.querySelector(".ujs-modal-settings");
        const header         = document.querySelector(".header");
        const resultListElem = document.querySelector("#result-list-fieldset");
        makeDraggable(container, {
            handle: header,
            reset: resetPopup,
            restore: true,
            id: "href-taker-popup"
        });
        makeResizable(container, {
            minW: 420, minH: 320,
            onMove(state) {
                assignStyleState(container, state);
                resultListElem.style.width = (parseInt(state.width) - 24) + "px";
            },
            reset: resetPopup,
            restore: true,
            id: "href-taker-popup"
        });


        ["input-only", "input-ignore", "input-selector"].forEach(name => {
            const input      = document.querySelector(`#${name}`);
            const promptElem = document.querySelector(`#${name}-prompt`);
            promptElem.addEventListener("contextmenu", event => {
                event.preventDefault();
                input.toggleAttribute("disabled");
                saveSetting();
            });

            input.addEventListener("keyup", event => {
                if (event.key === "Enter" && event.shiftKey) {
                    event.preventDefault();
                    console.log(event);
                }
            });
        });


        const extraSettingsButton = document.querySelector(`.ujs-modal-main-wrapper button[name="extra_settings_button"]`);
        const extraSettings       = document.querySelector(`.ujs-modal-main-wrapper #extra_settings`);
        extraSettingsButton.addEventListener("click", event => {
            extraSettings.classList.toggle("ujs-hidden");
        });

        const closeButton = document.querySelector(`.ujs-modal-main-wrapper button[name="close_button"]`);
        closeButton.addEventListener("click", closeSettings);
        const closeButton2 = document.querySelector("#close-button");
        closeButton2.addEventListener("click", closeSettings);
        const minimizeButton = document.querySelector("#minimize-button");
        minimizeButton.addEventListener("click", event => {
            localStorage.setItem("href-taker-popup-minimized", "true");
            renderMinimize();
        });
        minimizeButton.addEventListener("contextmenu", event => {
            event.preventDefault();
            localStorage.setItem("href-taker-popup-minimized", "true");
            renderMinimize(true);
        });
        function renderMinimize(resetPosition = false) {
            const html = `
                <div class="minimized">
                    <style>
                    .minimized {
                        position: fixed;
                        width: fit-content;
                        background-color: white;
                        padding: 3px;
                        box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
                        border: 1px solid gray;
                        border-radius: 2px;
                    }
                    </style>
                    <div>
                        HrefTaker
                        <button id="show-popup" title="Open popup">O</button>
                        <button id="close-popup" title="Close popup">X</button>
                    </div>
                </div>
            `;
            const wrapper = document.querySelector(".ujs-modal-main-wrapper");
            document.querySelector(".ujs-modal-settings")?.remove();
            wrapper.insertAdjacentHTML("beforeend", html);

            const minimized = document.querySelector(".minimized");
            makeDraggable(minimized, {
                reset: resetPosition,
                restore: true,
                id: "href-taker-minimized"
            });

            const showButton  = document.querySelector(".minimized  #show-popup");
            const closeButton = document.querySelector(".minimized #close-popup");
            showButton.addEventListener("click", event => {
                localStorage.setItem("href-taker-popup-minimized", "false");
                closeSettings();
                showSettings();
            });
            closeButton.addEventListener("click", event => {
                localStorage.setItem("href-taker-popup-minimized", "false");
                closeSettings();
            });
        }


        function getFilterUrl({ignore1stParty}) {
            return url => {
                return url
                    && (ignore1stParty ? !url.startsWith(location.origin) : true)
                    && !url.startsWith("blob:") && !url.startsWith("javascript:");
            };
        }

        function getSelector() {
            return settings.input_selector_disabled ? "body" : settings.input_selector;
        }

        const urlsToTextButton = document.querySelector(`.ujs-modal-main-wrapper button[name="to_text_button"]`);
        let urlTexted = false;
        urlsToTextButton.addEventListener("click", () => {
            const selector = getSelector();
            if (!urlTexted) {
                urlsToText(selector, getFilterUrl({ignore1stParty: true}));
            } else {
                undoUrlsToText(selector);
            }
            urlTexted = !urlTexted;
            onStateChanged?.();
        });

        const checkboxList  = [...document.querySelectorAll("body > .ujs-modal-main-wrapper input[type=checkbox]")];
        const inputList     = [...document.querySelectorAll("body > .ujs-modal-main-wrapper input[type=text]")];

        checkboxList.forEach(checkbox => {
            checkbox.addEventListener("change", saveSetting);
        });
        const saveSettingDebounced = debounce(saveSetting, 150);
        inputList.forEach(checkbox => {
            checkbox.addEventListener("input", saveSettingDebounced);
        });
        let onStateChanged = null;
        function saveSetting() {
            const checkboxDataList  = checkboxList.map(checkbox => [checkbox.name, checkbox.checked]);
            const inputDataList     =    inputList.map(checkbox => [checkbox.name, checkbox.value]);
            const inputDisabledList =    inputList.map(checkbox => [checkbox.name + "_disabled", checkbox.disabled]);
            const _settings = Object.fromEntries([checkboxDataList, inputDataList, inputDisabledList].flat());
            localStorage.setItem(LocalStoreName, JSON.stringify(_settings));
            settings.console_log && console.log("[ujs][settings]", _settings);
            settings = _settings;
            onStateChanged?.();
            setSettingsDataAttributes();
        }

        const selectorInput = document.querySelector(`input[name="input_selector"]`);
        selectorInput.addEventListener("input", debounce(() => {
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
                selectorInput.classList.add("ujs-red");
                return;
            }
            if (isReasonableSelector) {
                selectorInput.classList.remove("ujs-red");
                selectorInput.classList.remove("ujs-orange");
            } else {
                selectorInput.classList.add("ujs-orange");
            }

        }, 450));

        const ujsRootSelector = ".ujs-modal-main-wrapper";
        const listBtn    = document.querySelector(`${ujsRootSelector} button[name="list_button"]`);
        const list       = document.querySelector(`${ujsRootSelector} #result-list`);
        const listLegend = document.querySelector(`${ujsRootSelector} #result-list-legend`);
        const listHelper = {
            insideList(elem) {
                return elem.closest(ujsRootSelector);
            },
            includesList(elem) {
                return elem.querySelector(ujsRootSelector);
            },
            clearList() {
                list.innerHTML = "";
                listLegend.textContent = `Result list`;
            },
            insertUrls(urls) {
                let resultHtml = "";
                for (const url of urls) {
                    const html = `<div class="url-item"><a href="${url}" target="_blank" rel="noreferrer noopener">${url}</a></div>`;
                    resultHtml += html;
                }
                this.clearList();
                list.insertAdjacentHTML("beforeend", resultHtml);

                const joinedUrls = [...new Set(urls)].sort().join(" ");
                const hexes = Math.abs(hashString(joinedUrls)).toString(16).slice(-8).padStart(8, "0");
                listLegend.innerHTML = `Result list (${urls.length}) <span class="urls-hash">#${hexes.toUpperCase()}</span>`;
            }
        };
        let urls = [];
        function listUrl() {
            const selector = getSelector();
            urls = parseUrls(selector, {
                includeTextUrls: settings.include_text_url,
                onlyTextUrls:    settings.only_text_url,
                listHelper,
            });

            const onlyTexts = settings.input_only.trim().split(/\s+/g).filter(o => o);
            const ignoreTexts = settings.input_ignore.trim().split(/\s+/g).filter(o => o);

            urls = urls.filter(getFilterUrl({ignore1stParty: settings.ignore_first_party}));
            if (!settings.input_only_disabled && onlyTexts.length) {
                urls = urls.filter(url => onlyTexts.some(text => url.includes(text)));
            }
            if (!settings.input_ignore_disabled) {
                urls = urls.filter(url => !ignoreTexts.some(text => url.includes(text)));
            }
            if (settings.https) {
                urls = urls.map(url => url.startsWith("http://") ? url.replace("http://", "https://"): url);
            }
            if (settings.unique) {
                urls = [...new Set(urls)];
            }
            if (settings.sort) {
                urls = urls.sort((a, b) => {
                    const aUrl = new URL(a);
                    const bUrl = new URL(b);
                    const aDomain = aUrl.hostname.split(".").slice(-2).join(".");
                    const bDomain = bUrl.hostname.split(".").slice(-2).join(".");
                    if (aDomain === bDomain) {
                        return aUrl.origin.localeCompare(bUrl.origin);
                    }
                    return aDomain.localeCompare(bDomain);
                });
            }
            if (settings.reverse) {
                urls.reverse();
            }
            if (settings.console_log) {
                console.log(`/* ${urls.length.toString().padStart(2)} */`, JSON.stringify(urls) + ",");
            }
            if (settings.console_vars) {
                global.urls = urls;
            }

            listHelper.insertUrls(urls);
        }
        function renderList() {
            listUrl();
            onStateChanged = listUrl;
            list.removeEventListener("click", renderList);
        }
        listBtn.addEventListener("click", renderList);
        list.addEventListener("click", renderList, {once: true});


        const copyButton = document.querySelector(`.ujs-modal-main-wrapper button[name="copy_button"]`);
        copyButton.addEventListener("click", event => {
            void navigator.clipboard.writeText(urls.join(" "));
        });
        copyButton.addEventListener("contextmenu", event => {
            event.preventDefault();
            void navigator.clipboard.writeText(urls.join("\n"));
        });

        if (auto) {
            renderList();
        }
    }
    return {
        settings,
        showSettings,
        closeSettings,
    };
}


/** * @return {string[]} */
function parseUrls(targetSelector = "body", {
    includeTextUrls, onlyTextUrls, listHelper,
}) {
    let elems;
    try {
        elems = [...document.querySelectorAll(targetSelector)];
    } catch {
        console.error("Invalid selector");
        return [];
    }

    includeTextUrls = includeTextUrls || onlyTextUrls;

    const {
        insideList, includesList, clearList
    } = listHelper;

    const urls = [];
    for (const el of elems) {
        if (insideList(el)) {
            continue;
        }

        let anchorUrls;
        if (onlyTextUrls) {
            anchorUrls = [];
        } else {
            if (el.tagName === "A") {
                anchorUrls = [el.href];
            } else {
                anchorUrls = [...el.querySelectorAll("a")]
                    .filter(a => !insideList(a))
                    .map(a => a.href);
            }
        }

        urls.push(anchorUrls);
        if (includeTextUrls) {
            if (includesList(el)) {
                clearList();
            }
            const textUrls = [...el.innerText.matchAll(/\S+\.\S+\/[^\s)]+/g)]
                .map(match => match[0])
                .map(text => {
                    if (text.includes("://") && !text.startsWith("https")) { // prefer https
                        text = "https" + text.match(/:\/\/.+/)[0];
                    } else if (!text.startsWith("http")) {
                        text = ("https://" + text).replace(/:\/{3,}/, "://");
                    }
                    return text;
                });
            urls.push(textUrls.filter(url => !anchorUrls.includes(url)));
        }
    }
    return urls.flat();
}

function urlsToText(targetSelector = "body", filterUrl) {
    let count = 0;
    [...document.querySelectorAll(targetSelector)]
        .forEach(el => {
            const anchors = [...el.querySelectorAll("a")]
                .filter(a => filterUrl(a.href));

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

// --------------------------

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



// --------------------------
// todo: refactor

function assignStyleState(element, state) {
    for (const [k, v] of Object.entries(state)) {
        element.style[k]  = v;
    }
}

function lsProxy(element, {id: lsName, reset, restore, onStop, onMove} = {}) {
    if (reset && lsName) {
        localStorage.removeItem(lsName);
    }
    if (!restore || !lsName) {
        return {onMove, onStop};
    }

    const stateJson = localStorage.getItem(lsName);
    if (stateJson) {
        const state = JSON.parse(stateJson);
        assignStyleState(element, state);
        onMove?.(state);
        onStop?.(state);
    }

    function saveStateLS(state) {
        localStorage.setItem(lsName, JSON.stringify(state));
    }

    let _onStop;
    if (onStop) {
        _onStop = function(state) {
            saveStateLS(state);
        }
    } else {
        _onStop = saveStateLS;
    }

    return {
        onMove,
        onStop: _onStop
    };
}

function makeDraggable(element, {handle, onStop, onMove, reset, restore, id} = {}) {
    onMove = onMove || (state => assignStyleState(element, state));
    const {
        onStop: _onStop, onMove: _onMove
    } = lsProxy(element, {id: id + "-popup-position", reset, restore, onStop, onMove});

    handle = handle || element;
    handle.style["user-select"] = "none";
    element.style.position = "absolute";

    ["pointerdown", "touchstart"].forEach(event => {
        handle.addEventListener(event, event => {
            event = event.targetTouches?.[0] || event;
            const offsetY = event.clientY - parseInt(getComputedStyle(element).top);
            const offsetX = event.clientX - parseInt(getComputedStyle(element).left);

            let state;
            function onMove(event) {
                event = event.targetTouches?.[0] || event;
                state = {
                    top:  (event.clientY - offsetY) + "px",
                    left: (event.clientX - offsetX) + "px",
                };
                _onMove(state);
            }
            function reset() {
                removeEventListener("pointermove", onMove);
                removeEventListener("touchmove",   onMove);
                removeEventListener("pointerup", reset);
                removeEventListener("touchend",  reset);
                state && _onStop?.(state);
            }
            addEventListener("pointermove", onMove);
            addEventListener("touchmove",   onMove);
            addEventListener("pointerup", reset);
            addEventListener("touchend",  reset);
        });
    });
}

function makeResizable(element, props = {}) {
    let {
        minW, minH, size, onStop, onMove,
        id, reset, restore,
    } = Object.assign({minW: 240, minH: 240, size: 12, onMove: (state => assignStyleState(element, state))}, props);

    const lrCorner = document.createElement("div");
    lrCorner.style.cssText =
        `width: ${size}px; height: ${size}px; border-radius: ${(size / 2)}px;` +
        `bottom: ${-(size / 2)}px; right: ${-(size / 2)}px; ` +
        `position: absolute; background-color: transparent; cursor: se-resize;`;
    element.append(lrCorner);

    const {
        onStop: _onStop, onMove: _onMove
    } = lsProxy(element, {id: id + "-popup-size", reset, restore, onStop, onMove});

    ["pointerdown", "touchstart"].forEach(event => {
        lrCorner.addEventListener(event,event => {
            event.preventDefault();
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
            function reset() {
                removeEventListener("pointermove", onMove);
                removeEventListener("touchmove",   onMove);
                removeEventListener("pointerup", reset);
                removeEventListener("touchend",  reset);
                state && _onStop?.(state);
            }
            addEventListener("pointermove", onMove);
            addEventListener("touchmove",   onMove);
            addEventListener("pointerup", reset);
            addEventListener("touchend",  reset);
        });
    });
}

// --------------------------
