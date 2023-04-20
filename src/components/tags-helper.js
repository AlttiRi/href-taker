import {getHsl, hashString, sleep} from "../util.js";
import {clicked} from "./util.js";

/**
 * @typedef {Object} UrlInfo
 * @property {string} url
 * @property {number} number
 */

/**
 * @param container
 * @param {ScriptSettings} settings
 */
export function getTagsHelper(container, settings) {
    const tagsListContainerEl  = container.querySelector(`.tags-list`);
    const tagsPopupContainerEl = container.querySelector(`.tags-popup`);
    const tagListWrapperEl   = container.querySelector(".tags-list-wrapper");
    const tagsPopupWrapperEl = container.querySelector(".tags-popup-wrapper");
    const addTagBtnEl        = container.querySelector(".tag-add");
    const addTagBtnContentEl = container.querySelector(".tag-add span");

    /** @type {Set<string>} */
    let selectedTags = new Set();
    /** @type {Object<string, UrlInfo[]>} */
    let tagInfoMap = {};
    let tagsReversed = false;
    let onUpdateCb = null;
    tagsPopupContainerEl.addEventListener("click", onClickSelectTagFromPopup);
    tagsListContainerEl.addEventListener("click", onClickRemoveTagFromSelect);

    tagsListContainerEl.addEventListener("contextmenu", onContextMenuToggleDisablingSelectedTag);
    tagsPopupContainerEl.addEventListener("contextmenu", onContextMenuAddPopupTagOrToggleDisabling);

    tagsListContainerEl.addEventListener("pointerdown", onMMBPointerDownEnableOnlyTargetTag);

    addTagBtnEl.addEventListener("click", openTagsPopup);
    addTagBtnEl.addEventListener("contextmenu", onContextMenuSelectAllTagsOrClear);
    addTagBtnEl.addEventListener("pointerdown", onMMBPointerDownReverseSelectedTags);

    /** @param {Event} event */
    function getTagFromEvent(event) {
        const tagEl = /** @type {HTMLElement} */ event.target;
        if (!tagEl.classList.contains("tag")) {
            return null;
        }
        return tagEl;
    }

    /** @param {PointerEvent} event */
    function onMMBPointerDownEnableOnlyTargetTag(event) {
        const MIDDLE_BUTTON = 1;
        if (event.button !== MIDDLE_BUTTON) { return; }
        const listTagEl = getTagFromEvent(event);
        if (!listTagEl) { return; }
        event.preventDefault();

        disableAllSelectedTagElems();
        enableTag(listTagEl);

        updateAddTagBtnTitle();
        onUpdateCb?.();
    }

    /** @param {MouseEvent} event */
    function onClickSelectTagFromPopup(event) {
        const popupTagEl = getTagFromEvent(event);
        if (!popupTagEl) { return; }

        const selected = popupTagEl.classList.contains("selected");
        if (selected) {
            const listTagEl = tagsListContainerEl.querySelector(`[data-tag="${popupTagEl.dataset.tag}"]`);
            listTagEl.remove();
            selectedTags.delete(popupTagEl.dataset.tag);
        } else {
            tagsListContainerEl.append(popupTagEl.cloneNode(true));
            selectedTags.add(popupTagEl.dataset.tag);
        }
        popupTagEl.classList.toggle("selected");
        updateAddTagBtnTitle();
        onUpdateCb?.();
    }

    /** @param {MouseEvent} event */
    function onClickRemoveTagFromSelect(event) {
        const listTagEl = getTagFromEvent(event);
        if (!listTagEl) { return; }

        const popupTag = tagsPopupContainerEl.querySelector(`[data-tag="${listTagEl.dataset.tag}"]`);
        popupTag.classList.remove("selected");
        popupTag.classList.remove("disabled");
        selectedTags.delete(listTagEl.dataset.tag);
        listTagEl.remove();
        updateAddTagBtn();
        onUpdateCb?.();
    }

    function disableAllSelectedTagElems() {
        for (const tag of selectedTags) {
            const listTagEl = tagsListContainerEl.querySelector(`[data-tag="${tag}"]`);
            const popupTagEl = tagsPopupContainerEl.querySelector(`[data-tag="${tag}"]`);
            listTagEl.classList.add("disabled");
            popupTagEl.classList.add("disabled");
        }
        selectedTags = new Set();
    }
    function enableAllSelectedTagElems() {
        const listTagEls = [...tagsListContainerEl.querySelectorAll(`[data-tag].disabled`)];
        for (const listTagEl of listTagEls) {
            const tag = listTagEl.dataset.tag;
            const popupTagEl = tagsPopupContainerEl.querySelector(`[data-tag="${tag}"].disabled`);
            listTagEl.classList.remove("disabled");
            popupTagEl.classList.remove("disabled");
            selectedTags.add(tag);
        }
    }
    function enableTag(listTagEl) {
        const tag = listTagEl.dataset.tag;
        const popupTagEl = tagsPopupContainerEl.querySelector(`[data-tag="${tag}"].disabled`);
        listTagEl.classList.remove("disabled");
        popupTagEl.classList.remove("disabled");
        selectedTags.add(tag);
    }
    function disableTag(listTagEl) {
        const tag = listTagEl.dataset.tag;
        const popupTagEl = tagsPopupContainerEl.querySelector(`[data-tag="${tag}"]`);
        listTagEl.classList.add("disabled");
        popupTagEl.classList.add("disabled");
        selectedTags.delete(tag);
    }
    function disableSelectedTag(listTagEl, popupTagEl) {
        const disabled = listTagEl.classList.toggle("disabled");
        if (disabled) {
            selectedTags.delete(listTagEl.dataset.tag);
            popupTagEl.classList.add("disabled");
        } else {
            selectedTags.add(listTagEl.dataset.tag);
            popupTagEl.classList.remove("disabled");
        }
    }

    /** @param {MouseEvent} event */
    function onContextMenuToggleDisablingSelectedTag(event) {
        const listTagEl = getTagFromEvent(event);
        if (!listTagEl) { return; }

        event.preventDefault();
        if (event.shiftKey) {
            const enabled = !listTagEl.classList.contains("disabled");
            if (enabled) {
                if (selectedTags.size > 1) {
                    disableAllSelectedTagElems();
                    enableTag(listTagEl);
                } else {
                    enableAllSelectedTagElems();
                }
            } else {
                const listTagEls = [...tagsListContainerEl.querySelectorAll(`[data-tag]`)];
                if (selectedTags.size + 1 === listTagEls.length) {
                    disableAllSelectedTagElems();
                } else {
                    enableAllSelectedTagElems();
                    disableTag(listTagEl);
                }
            }
        } else {
            const popupTagEl = tagsPopupContainerEl.querySelector(`[data-tag="${listTagEl.dataset.tag}"]`);
            disableSelectedTag(listTagEl, popupTagEl);
        }
        updateAddTagBtnTitle();
        onUpdateCb?.();
    }

    /** @param {MouseEvent} event */
    function onContextMenuAddPopupTagOrToggleDisabling(event) {
        const popupTagEl = getTagFromEvent(event);
        if (!popupTagEl) { return; }

        event.preventDefault();
        const inList = popupTagEl.classList.contains("selected");
        if (!inList) {
            popupTagEl.classList.add("disabled");
            tagsListContainerEl.append(popupTagEl.cloneNode(true));
            popupTagEl.classList.add("selected");
        } else {
            const listTagEl = tagsListContainerEl.querySelector(`[data-tag="${popupTagEl.dataset.tag}"]`);
            disableSelectedTag(listTagEl, popupTagEl);
        }
        updateAddTagBtnTitle();
        onUpdateCb?.();
    }


    function closeTagsPopup() {
        addTagBtnEl.classList.remove("rotate");
        tagsPopupWrapperEl.classList.add("hidden");
        container.removeEventListener("click", closeTagsPopupOnClick);
        updateAddTagBtn();
    }
    function closeTagsPopupOnClick(event) {
        const isTagPopup = event.target.closest(".tags-popup-wrapper");
        const isTag = event.target.classList.contains("tag") && !event.target.classList.contains("tag-add");
        if (!isTagPopup && !isTag) {
            closeTagsPopup();
        }
    }
    async function openTagsPopup() {
        if (tagsPopupWrapperEl.classList.contains("hidden")) {
            addTagBtnEl.classList.add("rotate");
            tagsPopupWrapperEl.classList.remove("hidden");
            updateAddTagBtn();
            await sleep();
            container.addEventListener("click", closeTagsPopupOnClick);
        }
    }

    function updateAddTagBtn() {
        const isClosed = tagsPopupWrapperEl.classList.contains("hidden");
        const isAllTagsSelected = tagsPopupWrapperEl.querySelector(".tag:not(.selected)") === null;
        if (isClosed && isAllTagsSelected) {
            addTagBtnContentEl.textContent = "–";
        } else {
            addTagBtnContentEl.textContent = "+";
        }
        updateAddTagBtnTitle();
    }
    function updateAddTagBtnTitle() {
        const popupTags = [...tagsPopupWrapperEl.querySelectorAll(".tag")];
        const total = popupTags.length;
        const selected = popupTags.filter(t => t.classList.contains("selected")).length;
        const disabled = popupTags.filter(t => t.classList.contains("disabled")).length;
        const disabledText = disabled ? ` (${selected - disabled})` : "";
        addTagBtnEl.title = `${selected}${disabledText} of ${total}`;
    }

    /** @param {MouseEvent} event */
    function onContextMenuSelectAllTagsOrClear(event) {
        event.preventDefault();
        void clicked(addTagBtnEl);
        const tagEls = [...tagsPopupWrapperEl.querySelectorAll(".tag:not(.selected)")];
        if (tagEls.length) {
            for (const tagEl of tagEls) {
                tagsListContainerEl.append(tagEl.cloneNode(true));
                selectedTags.add(tagEl.dataset.tag);
                tagEl.classList.add("selected");
            }
        } else {
            selectedTags = new Set();
            const tagEls = [...tagsPopupWrapperEl.querySelectorAll(".tag.selected")];
            for (const tagEl of tagEls) {
                tagEl.classList.remove("selected");
                tagEl.classList.remove("disabled");
            }
            tagsListContainerEl.innerHTML = "";
        }
        updateAddTagBtn();
        onUpdateCb?.();
    }


    /** @param {PointerEvent} event */
    function onMMBPointerDownReverseSelectedTags(event) {
        const MIDDLE_BUTTON = 1;
        if (event.button !== MIDDLE_BUTTON) {
            return;
        }
        event.preventDefault();

        addTagBtnEl.classList.toggle("active");
        tagListWrapperEl.classList.toggle("reversed");
        tagsReversed = !tagsReversed;
        onUpdateCb?.();
    }

    function clearTags() {
        selectedTags = new Set();
        tagInfoMap = {};
        tagsReversed = false;
        tagListWrapperEl.classList.remove("reversed");
        addTagBtnEl.classList.remove("active");
        tagsListContainerEl.innerHTML = "";
        tagsPopupContainerEl.innerHTML = "";
    }

    function renderTags(urls, onUpdate) {
        clearTags();
        if (onUpdate) {
            onUpdateCb = onUpdate;
        }

        const other = "other";
        let i = 0;
        for (const url of urls) {
            let host = url.match(/\w+\.[a-z]+(?=\/)/i)?.[0];
            if (!host) {
                host = other;
            }
            if (!settings.case_sensitive) {
                host = host.toLowerCase();
            }
            const tagUrls = tagInfoMap[host] || (tagInfoMap[host] = []);
            tagUrls.push({url, number: i++});
        }
        const hostToUrlInfosEntries = Object.entries(tagInfoMap)
            .filter(([k, v]) => k !== other)
            .sort(([k1, v1], [k2, v2]) => {
                return v2.length - v1.length;
            });

        let tagsHtml = "";
        for (const [k, v] of hostToUrlInfosEntries) {
            const color = getHsl(hashString(k), 90, 5);
            tagsHtml += `<span class="tag" data-tag="${k}" title="${v.length}" data-color="${color}"></span>`;
        }
        if (tagInfoMap[other]) {
            tagsHtml += `<span class="tag" data-tag="${other}" title="${tagInfoMap[other].length}" data-color="#eee"></span>`;
        }

        tagsPopupContainerEl.innerHTML = tagsHtml;
        const tagsEls = [...tagsPopupContainerEl.querySelectorAll(`.tag[data-color]`)];
        tagsEls.forEach(tag => tag.style.backgroundColor = tag.dataset.color);

        updateAddTagBtn();
    }

    function getFilteredUrls() {
        if (!selectedTags.size) {
            return Object.values(tagInfoMap).flatMap(urlInfos => {
                return urlInfos;
            }).sort((urlInfo1, urlInfo2) => {
                return urlInfo1.number - urlInfo2.number;
            }).map(urlInfo => urlInfo.url);
        }
        return Object.entries(tagInfoMap).filter(([tag, urlInfos]) => {
            if (tagsReversed) {
                return !selectedTags.has(tag);
            } else {
                return  selectedTags.has(tag);
            }
        }).flatMap(([tag, urlInfos]) => {
            return urlInfos;
        }).sort((urlInfo1, urlInfo2) => {
            return urlInfo1.number - urlInfo2.number;
        }).map(urlInfo => urlInfo.url);
    }

    return {
        renderTags,
        getFilteredUrls,
        clearTags,
    }
}
