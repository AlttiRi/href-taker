import {getHsl, hashString, sleep} from "../util.js";
import {clicked} from "./util.js";

/**
 * @param container
 * @param {ScriptSettings} settings
 */
export function getTagsHelper(container, settings) {
    const tagsContainer       = container.querySelector(`.tags-wrapper`);
    const tagsPopupContainer  = container.querySelector(`.tags-prompt`);

    let onUpdateCb = null;

    let tags = [];
    tagsPopupContainer.addEventListener("click", event => {
        const tagEl = /** @type {HTMLElement} */ event.target;
        if (!tagEl.classList.contains("tag")) {
            return;
        }
        const disabled = tagEl.classList.contains("disabled");
        if (disabled) {
            const listTag = tagsContainer.querySelector(`[data-url="${tagEl.dataset.url}"]`);
            listTag.remove();
            tags = tags.filter(url => url !== tagEl.dataset.url);
        } else {
            tagsContainer.append(tagEl.cloneNode(true));
            tags.push(tagEl.dataset.url);
        }
        tagEl.classList.toggle("disabled");
        updateAddTagBtnTitle();
        onUpdateCb?.();
    });
    tagsContainer.addEventListener("click", event => {
        const tagEl = /** @type {HTMLElement} */ event.target;
        if (!tagEl.classList.contains("tag")) {
            return;
        }
        const popupTag = tagsPopupContainer.querySelector(`[data-url="${tagEl.dataset.url}"]`);
        popupTag.classList.remove("disabled");
        popupTag.classList.remove("inactive");
        tags = tags.filter(url => url !== tagEl.dataset.url);
        tagEl.remove();
        updateAddTagBtn();
        onUpdateCb?.();
    });

    function disableAllSelectedTagElems() {
        for (const tag of tags) {
            const tagEl = tagsContainer.querySelector(`[data-url="${tag}"]`);
            const popupTagEl = tagsPopupContainer.querySelector(`[data-url="${tag}"]`);
            tagEl.classList.add("disabled");
            popupTagEl.classList.add("inactive");
        }
        tags = [];
    }
    function enableAllSelectedTagElems() {
        const tagElems = [...tagsContainer.querySelectorAll(`[data-url].disabled`)];
        for (const tagEl of tagElems) {
            const tag = tagEl.dataset.url;
            const popupTagEl = tagsPopupContainer.querySelector(`[data-url="${tag}"].inactive`);
            tagEl.classList.remove("disabled");
            popupTagEl.classList.remove("inactive");
            tags.push(tag);
        }
    }
    function enableTag(tagEl) {
        const tag = tagEl.dataset.url;
        const popupTagEl = tagsPopupContainer.querySelector(`[data-url="${tag}"].inactive`);
        tagEl.classList.remove("disabled");
        popupTagEl.classList.remove("inactive");
        tags.push(tag);
    }
    function disableTag(tagEl) {
        const tag = tagEl.dataset.url;
        const popupTagEl = tagsPopupContainer.querySelector(`[data-url="${tag}"]`);
        tagEl.classList.add("disabled");
        popupTagEl.classList.add("inactive");
        tags = tags.filter(t => t !== tag);
    }
    tagsContainer.addEventListener("contextmenu", /** @param {MouseEvent} event */ event => {
        const currentTagEl = /** @type {HTMLElement} */ event.target;
        if (!currentTagEl.classList.contains("tag")) {
            return;
        }
        event.preventDefault();
        if (event.shiftKey) {
            const enabled = !currentTagEl.classList.contains("disabled");
            if (enabled) {
                if (tags.length > 1) {
                    disableAllSelectedTagElems();
                    enableTag(currentTagEl);
                } else {
                    enableAllSelectedTagElems();
                }
            } else {
                const tagElems = [...tagsContainer.querySelectorAll(`[data-url]`)];
                if (tags.length + 1 === tagElems.length) {
                    disableAllSelectedTagElems();
                } else {
                    enableAllSelectedTagElems();
                    disableTag(currentTagEl);
                }
            }
        } else {
            const popupTag = tagsPopupContainer.querySelector(`[data-url="${currentTagEl.dataset.url}"]`);
            const disabled = currentTagEl.classList.toggle("disabled");
            if (disabled) {
                tags = tags.filter(tag => tag !== currentTagEl.dataset.url);
                popupTag.classList.add("inactive");
            } else {
                tags.push(currentTagEl.dataset.url);
                popupTag.classList.remove("inactive");
            }
        }
        updateAddTagBtnTitle();
        onUpdateCb?.();
    });
    tagsPopupContainer.addEventListener("contextmenu", event => {
        const tagEl = /** @type {HTMLElement} */ event.target;
        if (!tagEl.classList.contains("tag")) {
            return;
        }
        event.preventDefault();
        const inList = tagEl.classList.contains("disabled");
        if (!inList) {
            tagEl.classList.add("disabled");
            tagsContainer.append(tagEl.cloneNode(true));
            tagEl.classList.add("inactive");
        } else {
            const listTag = tagsContainer.querySelector(`[data-url="${tagEl.dataset.url}"]`);
            const disabled = listTag.classList.toggle("disabled");
            if (disabled) {
                tags = tags.filter(url => url !== listTag.dataset.url);
                tagEl.classList.add("inactive");
            } else {
                tags.push(listTag.dataset.url);
                tagEl.classList.remove("inactive");
            }
        }
        updateAddTagBtnTitle();
        onUpdateCb?.();
    });

    const tagsElem         = container.querySelector(".tags");
    const addTagBtn        = container.querySelector(".tag-add");
    const addTagBtnContent = container.querySelector(".tag-add span");
    const tagsPopupWrapper = container.querySelector(".tags-prompt-wrapper");
    addTagBtn.addEventListener("click", openTagsPopup);
    function closeTagsPopup() {
        addTagBtn.classList.remove("rotate");
        tagsPopupWrapper.classList.add("hidden");
        container.removeEventListener("click", closeTagsPopupOnClick);
        updateAddTagBtn();
    }
    function closeTagsPopupOnClick(event) {
        const isTagPopup = event.target.closest(".tags-prompt-wrapper");
        const isTag = event.target.classList.contains("tag") && !event.target.classList.contains("tag-add");
        if (!isTagPopup && !isTag) {
            closeTagsPopup();
        }
    }
    async function openTagsPopup() {
        if (tagsPopupWrapper.classList.contains("hidden")) {
            addTagBtn.classList.add("rotate");
            tagsPopupWrapper.classList.remove("hidden");
            updateAddTagBtn();
            await sleep();
            container.addEventListener("click", closeTagsPopupOnClick);
        }
    }

    function updateAddTagBtn() {
        const isClosed = tagsPopupWrapper.classList.contains("hidden");
        const isAllTagsSelected = tagsPopupWrapper.querySelector(".tag:not(.disabled)") === null;
        if (isClosed && isAllTagsSelected) {
            addTagBtnContent.textContent = "–";
        } else {
            addTagBtnContent.textContent = "+";
        }
        updateAddTagBtnTitle();
    }
    function updateAddTagBtnTitle() {
        const popupTags = [...tagsPopupWrapper.querySelectorAll(".tag")];
        const total = popupTags.length;
        const selected = popupTags.filter(t => t.classList.contains("disabled")).length;
        const inactive = popupTags.filter(t => t.classList.contains("inactive")).length;
        const inactiveText = inactive ? ` (${selected - inactive})` : "";
        addTagBtn.title = `${selected}${inactiveText} of ${total}`;
    }

    addTagBtn.addEventListener("contextmenu", event => {
        event.preventDefault();
        void clicked(addTagBtn);
        const tagEls = [...tagsPopupWrapper.querySelectorAll(".tag:not(.disabled)")];
        if (tagEls.length) {
            for (const tagEl of tagEls) {
                tagsContainer.append(tagEl.cloneNode(true));
                tags.push(tagEl.dataset.url);
                tagEl.classList.add("disabled");
            }
        } else {
            tags = [];
            const tagEls = [...tagsPopupWrapper.querySelectorAll(".tag.disabled")];
            for (const tagEl of tagEls) {
                tagEl.classList.remove("disabled");
                tagEl.classList.remove("inactive");
            }
            tagsContainer.innerHTML = "";
        }
        updateAddTagBtn();
        onUpdateCb?.();
    });

    let tagsReversed = false;
    addTagBtn.addEventListener("pointerdown", /** @param {PointerEvent} event */ event => {
        const MIDDLE_BUTTON = 1;
        if (event.button !== MIDDLE_BUTTON) {
            return;
        }
        event.preventDefault();

        tagsReversed = tagsElem.classList.toggle("reversed");
        onUpdateCb?.();
    });

    function renderTags(urls, onUpdate) {
        tags = [];
        tagsReversed = false;
        tagsContainer.innerHTML = "";
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
        const urlEntries = Object.entries(hostCountMap)
            .sort(([k1, v1], [k2, v2]) => {
                return v2 - v1;
            });

        let tagsHtml = "";
        for (const [k, v] of urlEntries) {
            const color = getHsl(hashString(k), 90, 5);
            tagsHtml += `<span class="tag" title="${v}" data-url="${k}" data-color="${color}"></span>`;
        }
        tagsPopupContainer.innerHTML = tagsHtml;
        const tagsEls = [...tagsPopupContainer.querySelectorAll(`.tag[data-color]`)];
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
