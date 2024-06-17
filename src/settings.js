import {localStorage} from "./gm-util.js";

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
 * @property {boolean} auto_tags
 * @property {boolean} tags_collapsed
 * @property {boolean} filters_collapsed
 * @property {boolean} controls_collapsed
 * @property {boolean} no_search_on_blur
 * @property {boolean} unsearchable
 * @property {string}  insert_place
 * @property {boolean} keep_in_storage
 * @property {boolean} append_on_hover
 * @property {boolean} sort_tags_by_name
 * @property {boolean} clear_store_on_close
 */

/** @return {{settings: ScriptSettings, updateSettings: function}} */
export function loadSettings() {
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
        sort: false,
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
        show_tags: true,
        auto_tags: false,
        tags_collapsed: true,
        filters_collapsed: false,
        controls_collapsed: false,
        no_search_on_blur: false,
        unsearchable: false,
        insert_place: "html",
        keep_in_storage: false,
        append_on_hover: false,
        sort_tags_by_name: false,
        clear_store_on_close: true,
    };
    const LocalStoreName = "ujs-href-taker";

    /** @type {Partial<ScriptSettings>} */
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
