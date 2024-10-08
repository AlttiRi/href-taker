import {addCSS} from "../gm-util.js";
import {makeMovable, storeStateInLS} from "../movable-resizable.js";
import {getMinimized} from "./minimized.js";


/**
 * @param {object} opt
 * @param {ScriptSettings} opt.settings
 * @param {(ss: Partial<ScriptSettings>) => string[]} opt.updateSettings
 * @param {Wrapper} opt.wrapper
 * @param {Popup} opt.popup
 * @param {Minim} opt.minim
 */
export function initMinimized({settings, updateSettings, wrapper, popup, minim}) {
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
