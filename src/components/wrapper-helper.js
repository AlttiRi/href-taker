import {addCSS} from "../gm-util.js";
import {getWrapper} from "./wrapper.js";
import {cssFromStyle} from "./util.js";


/**
 * @param {Object} opt
 * @param {ScriptSettings} opt.settings
 * @param {function(Partial<ScriptSettings>)} opt.updateSettings
 * @param {Wrapper} opt.wrapper
 */
export function initWrapper({settings, updateSettings, wrapper}) {
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
