import {initWrapper} from "./components/wrapper-helper.js";
import {initPopup} from "./components/popup-helper.js";
import {initMinimized} from "./components/minimized-helper.js";


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
export function getRenders(settings, updateSettings) {
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
