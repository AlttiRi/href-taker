import {global} from "./gm-util.js";
import {loadSettings} from "./settings.js";
import {getRenders} from "./renders.js";


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
