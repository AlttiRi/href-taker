import {cssFromStyle} from "./util.js";
import {getTags} from "./tags.js";


/** @param {ScriptSettings} settings */
export function getPopup(settings) {
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
        // reverse_input_only,
        case_sensitive,
        hide_prefix,
        show_tags,
        auto_tags,
        // tags_collapsed,
        // filters_collapsed,
        // controls_collapsed,
        no_search_on_blur,
        unsearchable
    } = settings;
    const checked  = isChecked  => isChecked  ? "checked"  : "";
    const disabled = isDisabled => isDisabled ? "disabled" : "";

    const {tagsHtml, tagsCss} = getTags();

    const popupHtml = `
<div id="popup" tabindex="-1">
    <div class="header" id="popup-header">
        <button id="minimize-button">_</button>
        <button id="close-button">X</button>
    </div>

    <div id="tags-main">
        <div class="fieldset-line" data-header_name="tags">
            <hr class="pre">
            <span class="legend-like wrap">Tags</span>
            <hr class="after">
        </div>
        <div class="content" data-content_name="tags">
            ${tagsHtml}
        </div>
    </div>

    <div class="fieldset-line" data-header_name="filters">
        <hr class="pre">
        <span class="legend-like wrap">Filters</span>
        <hr class="after">
    </div>
    <div class="text-inputs-wrapper content" data-content_name="filters">
        <div class="input-line">
            <label>
                <span class="input-prompt" id="input-only-prompt">Only</span>
                <input id="input-only" type="text" name="input_only" value="${input_only}" ${disabled(input_only_disabled)} spellcheck="false">
            </label>
        </div>
        <div class="input-line">
            <label>
                <span class="input-prompt" id="input-ignore-prompt">Ignore</span>
                <input id="input-ignore" type="text" name="input_ignore" value="${input_ignore}" ${disabled(input_ignore_disabled)} spellcheck="false">
            </label>
        </div>
    </div>

    <div class="fieldset-line" data-header_name="controls">
        <hr class="pre">
        <span class="legend-like wrap">Controls</span>
        <hr class="after">
    </div>
    <div class="content" data-content_name="controls">
        <div class="control-row">
            <div class="control-row-inner">
                <button title="From anchors" name="list_button" class="short btn-left">List links</button>
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
                <button name="to_text_button" class="long btn-right">URLs to text</button>
            </div>
        </div>
        <div class="control-row">
            <div class="control-row-inner">
                <button title="Copy URLs separated by space" name="copy_button" class="short btn-left">Copy</button>
            </div>
            <button title="Show Extra Settings" name="extra_settings_button" class="long btn-right">Extra Settings</button>
        </div>
        <div class="hidden" id="extra_settings">
            <hr>
            <div class="control-row">
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
                    <label title="Replace http:// with https://">
                        <input type="checkbox" name="https" ${checked(https)}>
                        https
                    </label>
                    <label title="Hide https://www. prefix in the list">
                        <input type="checkbox" name="hide_prefix" ${checked(hide_prefix)}>
                        Hide prefix
                    </label>
                    <label title="Trim unmached closed brackets ], or ) with the followed content. Text URLs only.">
                        <input type="checkbox" name="brackets_trim" ${checked(brackets_trim)}>
                        Trim brackets
                    </label>
                    <label title="Don't list 1st-party URLs">
                        <input type="checkbox" name="ignore_first_party" ${checked(ignore_first_party)}>
                        No 1st-party
                    </label>
                    <label title="Case-sensitive matching.\n&quot;SITE.COM/QWE&quot; != &quot;site.com/qwe&quot;">
                        <input type="checkbox" name="case_sensitive" ${checked(case_sensitive)}>
                        Case-sensitive
                    </label>
                    <label title="Show Tags">
                        <input type="checkbox" name="show_tags" ${checked(show_tags)}>
                        Tags
                    </label>
                    <label title="Show all tags automatically" data-name="auto_tags">
                        <input type="checkbox" name="auto_tags" ${checked(auto_tags)}>
                        Auto tags
                    </label>
                    <label title="Log the result list to console">
                        <input type="checkbox" name="console_log" ${checked(console_log)}>
                        Console log
                    </label>
                    <label title="Expose variables to console">
                        <input type="checkbox" name="console_vars" ${checked(console_vars)}>
                        Console vars
                    </label>
                    <label title="Makes the text in the result URLs list unselectable and unsearchable (with Ctrl + F), \
when the popup is not focused. 
With large URLs count it can cause some lags on the popup focus/blur events due to the list redrawing." data-name="no_search_on_blur">
                        <input type="checkbox" name="no_search_on_blur" ${checked(no_search_on_blur)}>
                        Ephemeral
                    </label>
                    <label title="Does the same as Ephemeral option, but constantly. 
You always can toggle the Unsearchable mode by RMB click on the list title (if Ephemeral option is not enabked), 
this option only defines the default state.">
                        <input type="checkbox" name="unsearchable" ${checked(unsearchable)}>
                        Unsearchable
                    </label>
                </div>
            </div>
            <div class="text-inputs-wrapper">
                <hr>
                <label title="Target selector. By default, it is &quot;body&quot; selector.">
                    <span id="input-selector-prompt">Selector</span>
                    <input id="input-selector" type="text" name="input_selector" value="${input_selector}" ${disabled(input_selector_disabled)} spellcheck="false">
                </label>
                <hr>
            </div>
        </div>
    </div>

    <div class="fieldset-line">
        <hr class="pre">
        <span class="legend-like" id="result-list-header">Result list</span>
        <hr class="after">
    </div>
    <div id="result-list-wrapper" class="content">
        <div id="result-list">
            <div id="result-list-prompt">Click here to list URLs...</div>
        </div>
    </div>
</div>`;

    const popupCss = tagsCss + cssFromStyle`
<style>
#popup[tabindex="-1"] {
    outline: none;
}
#popup.focus {
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
}

[data-text]:after {
    content: attr(data-text);
}

#extra_settings label {
    min-width: 120px;
}

.btn-left {
    margin-left: 0;
}
.btn-right {
    margin-right: 0;
}

[data-tags-collapsed] [data-content_name="tags"] {
    display: none;
}
[data-filters-collapsed] [data-content_name="filters"] {
    display: none;
}
[data-controls-collapsed] [data-content_name="controls"] {
    display: none;
}

.content {
    padding: 1px 6px;
}
.input-line {
    padding-bottom: 3px;
    padding-top: 3px;
}

.fieldset-line {
    padding-top: 2px;
    display: flex;
    align-items: center;
    white-space: nowrap;
}
.fieldset-line .pre {
    width: 20px;
    height: 1px;
    border: 0;
    background-image: linear-gradient(to right, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, .25) 70%);
}
.fieldset-line .after {
    height: 1px;
    flex-grow: 2;
    border: 0;
    background-image: linear-gradient(to right, rgba(0, 0, 0, .25) 0%, rgba(0, 0, 0, 0.05) 70%);
}
.legend-like {
    padding: 0 1px;
    user-select: none;
    position: relative;
}
.legend-like.wrap:hover {
    text-shadow: 0 0 1px rgba(0, 0, 0, .25);
    cursor: pointer;
}

hr.main {
  width: 100%;
  height: 1px;
  border: 0;
  background-image: linear-gradient(to right, rgba(0, 0, 0, 0) 10%, rgba(0, 0, 0, .25), rgba(0, 0, 0, 0) 90%);
}

.url-pad {
    padding-top: 2px;
    display: block;
}

[data-hide-prefix] .invisible {
    width: 0;
    height: 0;
    font-size: 0;
    line-height: 0;
    display: inline-block;
}
#popup[data-no-search-on-blur]:not(.focus) [data-unselectable-text]:after {
    content: attr(data-unselectable-text);
}
#popup[data-no-search-on-blur]:not(.focus) .selectable {
    display: none;
}

#popup[data-unsearchable] #result-list-header {
    color: #666;
}
#popup[data-unsearchable] .selectable {
    display: none;
}
#popup[data-unsearchable] [data-unselectable-text]:after {
    content: attr(data-unselectable-text);
}
#popup[data-unsearchable] [data-name="no_search_on_blur"] {
    opacity: 0.55;
}

#popup:not([data-show-tags]) [data-name="auto_tags"] {
    opacity: 0.55;
}

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
.url-item.clicked {
    background-color: #eeeeee99;
}

#popup {
    width: 720px;
    background-color: white;
    height: 580px;
    border: 1px solid darkgray;
    padding: 6px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.4);
    transition: box-shadow 0.4s;
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
    padding-top: 4px;
    padding-right: 2px;
    /*padding: 4px 4px 8px 12px;*/
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
    margin: 3px;
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

[data-reverse-input-only] #input-only-prompt,
[data-reverse-input-only] #input-only {
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


#extra_settings .control-row-inner {
    flex-wrap: wrap;
}
#result-list-prompt {
    margin: 5px;
    color: gray;
}

fieldset, hr {
    border: 1px solid aliceblue;
    margin: 4px 0;
}

</style>`;

    return {popupHtml, popupCss};
}
