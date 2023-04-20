import {addCSS} from "../gm-util.js";
import {makeMovable, storeStateInLS} from "../movable-resizable.js";
import {getMinimized} from "./minimized.js";


/**
 * @param {Object} opt
 * @param {ScriptSettings} opt.settings
 * @param {function(ScriptSettings)} opt.updateSettings
 * @param {Wrapper} opt.wrapper
 * @param {Popup} opt.popup
 * @param {Minim} opt.minim
 */
export function initMinimized({settings, updateSettings, wrapper, popup, minim}) {
    Object.assign(minim, {closeMinimized, renderMinimized});

    function closeMinimized() {
        wrapper.isShadowContainerInited() && wrapper.querySelector("#popup-minimized")?.remove();
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
    }
}
