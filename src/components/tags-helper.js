import {getHsl, hashString, sleep} from "../util.js";
import {clicked} from "./util.js";

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

    let tags = [];
    let tagsReversed = false;
    let onUpdateCb = null;

    tagsPopupContainerEl.addEventListener("click", onClickSelectTagFromPopup);
    tagsListContainerEl.addEventListener("click", onClickRemoveTagFromSelect);

    tagsListContainerEl.addEventListener("contextmenu", onContextMenuToggleDisablingSelectedTag);
    tagsPopupContainerEl.addEventListener("contextmenu", onContextMenuAddPopupTagOrToggleDisabling);

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

    /** @param {MouseEvent} event */
    function onClickSelectTagFromPopup(event) {
        const popupTagEl = getTagFromEvent(event);
        if (!popupTagEl) { return; }

        const selected = popupTagEl.classList.contains("selected");
        if (selected) {
            const listTagEl = tagsListContainerEl.querySelector(`[data-tag="${popupTagEl.dataset.tag}"]`);
            listTagEl.remove();
            tags = tags.filter(tag => tag !== popupTagEl.dataset.tag);
        } else {
            tagsListContainerEl.append(popupTagEl.cloneNode(true));
            tags.push(popupTagEl.dataset.tag);
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
        tags = tags.filter(tag => tag !== listTagEl.dataset.tag);
        listTagEl.remove();
        updateAddTagBtn();
        onUpdateCb?.();
    }

    function disableAllSelectedTagElems() {
        for (const tag of tags) {
            const listTagEl = tagsListContainerEl.querySelector(`[data-tag="${tag}"]`);
            const popupTagEl = tagsPopupContainerEl.querySelector(`[data-tag="${tag}"]`);
            listTagEl.classList.add("disabled");
            popupTagEl.classList.add("disabled");
        }
        tags = [];
    }
    function enableAllSelectedTagElems() {
        const listTagEls = [...tagsListContainerEl.querySelectorAll(`[data-tag].disabled`)];
        for (const listTagEl of listTagEls) {
            const tag = listTagEl.dataset.tag;
            const popupTagEl = tagsPopupContainerEl.querySelector(`[data-tag="${tag}"].disabled`);
            listTagEl.classList.remove("disabled");
            popupTagEl.classList.remove("disabled");
            tags.push(tag);
        }
    }
    function enableTag(listTagEl) {
        const tag = listTagEl.dataset.tag;
        const popupTagEl = tagsPopupContainerEl.querySelector(`[data-tag="${tag}"].disabled`);
        listTagEl.classList.remove("disabled");
        popupTagEl.classList.remove("disabled");
        tags.push(tag);
    }
    function disableTag(listTagEl) {
        const tag = listTagEl.dataset.tag;
        const popupTagEl = tagsPopupContainerEl.querySelector(`[data-tag="${tag}"]`);
        listTagEl.classList.add("disabled");
        popupTagEl.classList.add("disabled");
        tags = tags.filter(t => t !== tag);
    }
    function disableSelectedTag(listTagEl, popupTagEl) {
        const disabled = listTagEl.classList.toggle("disabled");
        if (disabled) {
            tags = tags.filter(tag => tag !== listTagEl.dataset.tag);
            popupTagEl.classList.add("disabled");
        } else {
            tags.push(listTagEl.dataset.tag);
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
                if (tags.length > 1) {
                    disableAllSelectedTagElems();
                    enableTag(listTagEl);
                } else {
                    enableAllSelectedTagElems();
                }
            } else {
                const listTagEls = [...tagsListContainerEl.querySelectorAll(`[data-tag]`)];
                if (tags.length + 1 === listTagEls.length) {
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
                tags.push(tagEl.dataset.tag);
                tagEl.classList.add("selected");
            }
        } else {
            tags = [];
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

    function renderTags(urls, onUpdate) {
        tags = [];
        tagsReversed = false;
        tagListWrapperEl.classList.remove("reversed");
        addTagBtnEl.classList.remove("active");
        tagsListContainerEl.innerHTML = "";
        if (onUpdate) {
            onUpdateCb = onUpdate;
        }

        const hostCountMap = {};
        for (const url of urls) {
            const host = url.match(/\w+\.\w+(?=\/)/)?.[0];
            if (!host) {
                continue;
            }
            hostCountMap[host] = (hostCountMap[host] || 0) + 1;
        }
        const hostCountEntries = Object.entries(hostCountMap)
            .sort(([k1, v1], [k2, v2]) => {
                return v2 - v1;
            });

        let tagsHtml = "";
        for (const [k, v] of hostCountEntries) {
            const color = getHsl(hashString(k), 90, 5);
            tagsHtml += `<span class="tag" data-tag="${k}" title="${v}" data-color="${color}"></span>`;
        }
        tagsPopupContainerEl.innerHTML = tagsHtml;
        const tagsEls = [...tagsPopupContainerEl.querySelectorAll(`.tag[data-color]`)];
        tagsEls.forEach(tag => tag.style.backgroundColor = tag.dataset.color);

        updateAddTagBtn();
    }

    function filterTags(urls) {
        let urlsFilteredByTags = urls;
        if (tags.length) {
            let matchOnly;
            if (!settings.case_sensitive) {
                matchOnly = url => tags.some(tag => url.toLowerCase().includes(tag));
            } else {
                matchOnly = url => tags.some(tag => url.includes(tag));
            }
            if (!tagsReversed) {
                urlsFilteredByTags = urls.filter(url =>  matchOnly(url));
            } else {
                urlsFilteredByTags = urls.filter(url => !matchOnly(url));
            }
        }
        return urlsFilteredByTags;
    }

    return {
        renderTags,
        filterTags,
    }
}
