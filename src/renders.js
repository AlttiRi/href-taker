import {initWrapper} from "./components/wrapper-helper.js";
import {initPopup} from "./components/popup-helper.js";
import {initMinimized} from "./components/minimized-helper.js";


/**
 * @typedef {Object} Wrapper
 * @property {function(selector: string): HTMLElement} querySelector
 * @property {function(selector: string): HTMLElement[]} querySelectorAll
 * @property {function} initShadowContainer
 * @property {function} closeShadowContainer
 * @property {function} isShadowContainerInited
 *//**
 * @typedef {Object} Popup
 * @property {function} renderPopup
 * @property {function} closePopup
 *//**
 * @typedef {Object} Minim
 * @property {function} closeMinimized
 * @property {function} renderMinimized
 */

/**
 * @param {ScriptSettings} settings
 * @param {function(ScriptSettings)} updateSettings
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
