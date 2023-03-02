// ==UserScript==
// @name        HrefTaker
// @version     0.1.7-2023.03.02
// @namespace   gh.alttiri
// @description URL grabber popup
// @license     GPL-3.0
// @homepageURL https://github.com/AlttiRi/href-taker
// @supportURL  https://github.com/AlttiRi/href-taker/issues
// @match       *://*/*
// @grant       GM_registerMenuCommand
// @grant       GM_addElement
// ==/UserScript==


const global = typeof unsafeWindow === "object" ? unsafeWindow.globalThis : globalThis;
const debug = false;

const {showPopup} = initHrefTaker();
if (typeof GM_registerMenuCommand === "function") {
    GM_registerMenuCommand("Show popup", () => showPopup());
}

function addCSS(cssText, target = document.head) {
    if (typeof GM_addElement === "function") {
        return GM_addElement(target, "style", {textContent: cssText});
    }
    const styleElem = document.createElement("style");
    styleElem.textContent = cssText;
    target.append(styleElem);
    return styleElem;
}


function initHrefTaker() {
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
     * @property {boolean} auto_open
     * @property {boolean} auto_list
     * @property {boolean} minimized
     * @property {boolean} brackets_trim
     * @property {boolean} opened
     * @property {boolean} reverse_only
     */

    const {settings, updateSettings} = loadSettings();
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
            auto_open: false,
            auto_list: true,
            minimized: false,
            brackets_trim: true,
            opened: debug,
            reverse_only: false,
        };
        const LocalStoreName = "ujs-href-taker";

        /** @type Settings */
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

    // {showPopup, closePopup, showMinimized, closeMinimized, close}
    const methods = getRenders(settings, updateSettings);

    if (settings.auto_open || settings.opened) {
        if (settings.minimized === true) {
            methods.showMinimized();
        } else {
            methods.showPopup();
        }
    }

    if (settings.console_vars) {
        Object.assign(global, methods);
    }

    return methods;
}

function getStaticContent(settings) {
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
}
#shadow-content-wrapper > * {
    pointer-events: all;
}
</style>`;

    const minimizedHtml = `
<div id="popup-minimized">
    <div>
        HrefTaker
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
</style>`;

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
        reverse_only,
    } = settings;
    const checked  = isChecked  => isChecked  ? "checked"  : "";
    const disabled = isDisabled => isDisabled ? "disabled" : "";

    const popupHtml = `
<div id="popup">
    <div class="header" id="popup-header">
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
                <button title="From anchors" name="list_button" class="short">List links</button>
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
                <button name="to_text_button" class="long">URLs to text</button>
            </div>
        </div>
        <div class="control-row">
            <div class="control-row-inner">
                <button title="Copy URLs separated by space" name="copy_button" class="short">Copy</button>
                <button title="Close it" name="close_button" class="short">Close</button>
            </div>
            <button title="Show Extra Settings" name="extra_settings_button" class="long">Extra Settings</button>
        </div>
        <div class="hidden" id="extra_settings">
            <hr>
            <div class="control-row">
                <div class="control-row-inner">
                    <label title="Log the result list to console">
                        <input type="checkbox" name="console_log" ${checked(console_log)}>
                        Console log
                    </label>
                    <label title="Expose variables to console">
                        <input type="checkbox" name="console_vars" ${checked(console_vars)}>
                        Console vars
                    </label>
                </div>
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
                    <label title="Don't list 1st-party URLs">
                        <input type="checkbox" name="ignore_first_party" ${checked(ignore_first_party)}>
                        No 1st-party
                    </label>                        
                    <label title="Replace http:// with https://">
                        <input type="checkbox" name="https" ${checked(https)}>
                        https
                    </label>
                    <label title="Trim unmached closed brackets ], or ) with the followed content. Text URLs only.">
                        <input type="checkbox" name="brackets_trim" ${checked(brackets_trim)}>
                        Trim brackets
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
    <fieldset id="result-list-wrapper">
        <legend id="result-list-header">Result list</legend>            
        <div id="result-list">
            <div id="result-list-prompt">Click here to list URLs...</div>
        </div>
    </fieldset>      
</div>`;
    const popupCss = cssFromStyle`
<style>
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
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
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
    padding: 4px 4px 8px 12px;
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
    margin: 4px;
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

[data-reverse-only] #input-only-prompt,
[data-reverse-only] #input-only {
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

/*.minimized {*/
/*    position: absolute;*/
/*    top: 0;*/
/*    right: 0;*/
/*}*/

#extra_settings .control-row-inner {
    flex-wrap: wrap;
}
#result-list-prompt {
    margin: 5px;
    color: gray;
}

fieldset, hr {
    border-color: aliceblue;
}

.clicked {
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
}
</style>`;

    function getListHelper(container) {
        const headerElem  = container.querySelector(`#result-list-header`);
        const contentElem = container.querySelector(`#result-list`);
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
                for (const url of urls) {
                    const html = `<div class="url-item"><a href="${url}" target="_blank" rel="noreferrer noopener">${url}</a></div>`;
                    resultHtml += html;
                }
                contentElem.insertAdjacentHTML("beforeend", resultHtml);
            },
            headerElem,
            contentElem,
        };
    }

    return {
        wrapperHtml, wrapperCss,
        minimizedHtml, minimizedCss,
        popupHtml, popupCss,
        getListHelper,
    };
}

function getRenders(settings, updateSettings) {
    const {
        wrapperHtml, wrapperCss,
        minimizedHtml, minimizedCss,
        popupHtml, popupCss,
        getListHelper,
    } = getStaticContent(settings);

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
        if (insertSelector === "html") {
            insertPlace.append(shadowWrapper);
        } else {
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
            return false;
        }
        return true;
    }

    function renderPopup(resetPosition = false) {
        initShadowContainer();
        updateSettings({minimized: false});

        const wasOpened = querySelector("#popup");
        closePopup()
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
        makeDraggable(popupElem, {
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
                    resultListElem.style.width = (parseInt(state.width) - 24) + "px";
                },
            })
        });

        // ------

        const extraSettingsButton = querySelector(`button[name="extra_settings_button"]`);
        const extraSettings       = querySelector(`#extra_settings`);
        extraSettingsButton.addEventListener("click", event => {
            extraSettings.classList.toggle("hidden");
        });

        // ------

        const closeButton    = querySelector(`button[name="close_button"]`);
        closeButton.addEventListener("click", closeShadowContainer);
        const closeButton2   = querySelector("#close-button");
        closeButton2.addEventListener("click", closeShadowContainer);

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

        let onStateChanged = null;

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
            updateSettings(_settings);
            updateHtml();
        }
        function updateHtml() {
            setSettingsDataAttributes();
            onStateChanged?.();
        }

        ["input-only", "input-ignore", "input-selector"].forEach(name => {
            const input      = querySelector(`#${name}`);
            const promptElem = querySelector(`#${name}-prompt`);
            promptElem.addEventListener("contextmenu", event => {
                event.preventDefault();
                input.toggleAttribute("disabled");
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
        inputOnlyPromptElem.addEventListener("pointerdown", event => {
            const MIDDLE_BUTTON = 1;
            if (event.button === MIDDLE_BUTTON) {
                event.preventDefault();
                updateSettings({reverse_only: !settings.reverse_only});
                updateHtml();
            }
        });

        // ------

        const selectorInput = querySelector(`input[name="input_selector"]`);
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
                selectorInput.classList.add("red");
                return;
            }
            if (isReasonableSelector) {
                selectorInput.classList.remove("red");
                selectorInput.classList.remove("orange");
            } else {
                selectorInput.classList.add("orange");
            }

        }, 450));

        // ------
        let urls = [];
        if (settings.console_vars) {
            global.urls = urls;
        }
        // ------

        const copyButton = querySelector(`button[name="copy_button"]`);
        copyButton.addEventListener("click", event => {
            void navigator.clipboard.writeText(urls.join(" "));
        });
        copyButton.addEventListener("contextmenu", event => {
            event.preventDefault();
            void navigator.clipboard.writeText(urls.join("\n"));
            void clicked(copyButton);
        });
        copyButton.addEventListener("pointerdown", event => {
            const MIDDLE_BUTTON = 1;
            if (event.button === MIDDLE_BUTTON) {
                event.preventDefault();
                void navigator.clipboard.writeText(getUrlArray());
                void clicked(copyButton);
            }
        });

        function getUrlArray() {
            return `/* ${urls.length.toString().padStart(2)} */ ${JSON.stringify(urls)},`;
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
            onStateChanged?.();
        });

        // ------

        function recomputeUrlList() {
            const selector = getSelector();
            urls = parseUrls(selector, {
                includeTextUrls: settings.include_text_url,
                onlyTextUrls:    settings.only_text_url,
                bracketsTrim:    settings.brackets_trim,
            });

            const onlyTexts = settings.input_only.trim().split(/\s+/g).filter(o => o);
            const ignoreTexts = settings.input_ignore.trim().split(/\s+/g).filter(o => o);

            urls = urls.filter(urlFilter);
            if (settings.https) {
                urls = urls.map(url => url.startsWith("http://") ? url.replace("http://", "https://"): url);
            }
            if (!settings.input_only_disabled && onlyTexts.length) {
                if (!settings.reverse_only) {
                    urls = urls.filter(url =>  onlyTexts.some(text => url.includes(text)));
                } else {
                    urls = urls.filter(url => !onlyTexts.some(text => url.includes(text)));
                }
            }
            if (!settings.input_ignore_disabled) {
                urls = urls.filter(url => !ignoreTexts.some(text => url.includes(text)));
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
                console.log(getUrlArray());
            }
            if (settings.console_vars) {
                global.urls = urls;
            }
        }

        const listBtn = querySelector(`button[name="list_button"]`);
        const listHelper = getListHelper(shadowContainer);

        function renderUrlList() {
            recomputeUrlList();
            onStateChanged = renderUrlList;
            listHelper.contentElem.removeEventListener("click", renderUrlList);
            listHelper.insertUrls(urls);
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

        if (settings.auto_list) {
            renderUrlList();
        }
        if (settings.console_vars) {
            Object.assign(global, {renderUrlList});
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
        closePopup()
        closeMinimized();
        resetPosition = wasOpened || resetPosition;

        shadowContainer.insertAdjacentHTML("afterbegin", minimizedHtml);
        const minimizedElem = querySelector("#popup-minimized");
        addCSS(minimizedCss, minimizedElem);

        makeDraggable(minimizedElem, {
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
    const regex = /[^\s<>"()]+\.[^\s<>"()]+\/[^\s<>"]+/g;
    const urls = [...text.matchAll(regex)]
        .map(match => match[0])
        .map(text => {
            if (text.includes("://") && !text.startsWith("https")) { // prefer https
                text = "https" + text.match(/:\/\/.+/)[0];
            } else if (!text.startsWith("http")) {
                text = ("https://" + text).replace(/:\/{3,}/, "://");
            }
            return text;
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

/** * @return {string[]} */
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

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function clicked(elem) {
    elem.classList.add("clicked");
    await sleep(120);
    elem.classList.remove("clicked");
}

// --------------------------





// --------------------------

function assignStyleState(element, state) {
    for (const [k, v] of Object.entries(state)) {
        element.style[k]  = v;
    }
}

function makeDraggable(element, {handle, onStop: _onStop, onMove, state} = {}) {
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
    const {
        minW, minH, size, onStop: _onStop, onMove, state
    } = Object.assign({minW: 240, minH: 240, size: 12}, props);
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
        `position: absolute; background-color: transparent; cursor: se-resize;`;
    element.append(lrCorner);

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
function storeStateInLS({onMove, onStop, id: lsName, reset, restore}) {
    if (reset && lsName) {
        localStorage.removeItem(lsName);
    }
    if (!restore || !lsName) {
        return {onMove, onStop};
    }
    const stateJson = localStorage.getItem(lsName);
    let state = null;
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
        }
    } else {
        _onStop = saveStateLS;
    }

    return {
        onMove,
        onStop: _onStop,
        state
    };
}

// --------------------------
