import {getMinimized} from "./components/minimized.js";
import {getWrapper} from "./components/wrapper.js";
import {getPopup} from "./components/popup.js";
import {getTagsHelper} from "./components/tags-helper.js";
import {getListHelper} from "./components/list-helper.js";
import {parseUrls, undoUrlsToText, urlsToText} from "./text-urls-parsing.js";
import {makeMovable, makeResizable, storeStateInLS} from "./movable-resizable.js";
import {debounce} from "./util.js";
import {addCSS, global} from "./gm-util.js";
import {clicked} from "./components/util.js";


/**
 * @param {ScriptSettings} settings
 * @param {function(ScriptSettings)} updateSettings
 */
export function getRenders(settings, updateSettings) {
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

        let urls = [];
        if (settings.console_vars) {
            global.urls = urls;
        }

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
        closePopup()
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
