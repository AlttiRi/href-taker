import {hashString} from "../util.js";

/**
 * @param {HTMLElement} container
 * @param {ScriptSettings} settings
 */
export function getListHelper(container, settings) {
    const headerElem  = container.querySelector(`#result-list-header`);
    const contentElem = container.querySelector(`#result-list`);
    /**
     * @param {string} url
     * @return {string}
     */
    const mainHost = url => {
        try {
            return new URL(url).hostname.split(".").slice(-2).join(".");
        } catch (e) {
            console.error(url, e);
            return "";
        }
    };

    contentElem.addEventListener("click", onClickMarkUrlAsClicked);
    contentElem.addEventListener("contextmenu", onAltContextMenuUnmarkClickedUrl);
    contentElem.addEventListener("pointerup", onMMBPointerUpMarkUrlAsClicked);

    const clickedUrls = new Set();
    /** @param {MouseEvent} event */
    function onClickMarkUrlAsClicked(event) {
        if (!event.target.closest(".url-item-link")) {
            return;
        }
        markUrlAsClicked(event);
    }

    /** @param {PointerEvent} event */
    function onMMBPointerUpMarkUrlAsClicked(event) {
        const MIDDLE_BUTTON = 1;
        if (event.button !== MIDDLE_BUTTON) {
            return;
        }
        const activeElement = container.getRootNode().activeElement;
        if (activeElement !== event.target.closest(".url-item-link")) {
            return;
        }
        markUrlAsClicked(event);
    }

    /** @param {MouseEvent | PointerEvent} event */
    function markUrlAsClicked(event) {
        const urlItem = event.target.closest(".url-item");
        urlItem.classList.add("clicked");
        const url = urlItem.querySelector("a").href;
        clickedUrls.add(url);
        const dupLinks = [...contentElem.querySelectorAll(`.url-item:not(.clicked) a[href="${url}"]`)];
        for (const dupLink of dupLinks) {
            dupLink.closest(".url-item").classList.add("clicked");
        }
    }

    /** @param {MouseEvent} event */
    function onAltContextMenuUnmarkClickedUrl(event) {
        if (!event.altKey) {
            return;
        }
        if (!event.target.closest(".url-item-link")) {
            return;
        }
        event.preventDefault();
        const urlItem = event.target.closest(".url-item");
        const wasClicked = urlItem.classList.contains("clicked");
        if (!wasClicked) {
            return;
        }
        urlItem.classList.remove("clicked");
        const url = urlItem.querySelector("a").href;
        clickedUrls.delete(url);
        const dupLinks = [...contentElem.querySelectorAll(`.url-item.clicked a[href="${url}"]`)];
        for (const dupLink of dupLinks) {
            dupLink.closest(".url-item").classList.remove("clicked");
        }
    }

    function urlToHtml(url) {
        let {prefix = "", main} = url.match(/(?<prefix>^https?:\/\/(www\.)?)?(?<main>.+)/i).groups;
        let end = "";
        try {
            if (main.endsWith("/") && new URL(url).pathname === "/") {
                main = main.slice(0, -1);
                end = "/";
            }
        } catch (e) {
            console.error(url, e);
        }

        prefix && (prefix = `<span class="invisible" data-unselectable-text="${prefix}"><span class="selectable">${prefix}</span></span>`);
        end    && (end    = `<span class="invisible" data-unselectable-text="${end}"><span class="selectable">${end}</span></span>`);
        main = `<span class="visible" data-unselectable-text="${main}"><span class="selectable">${main}</span></span>`;
        return `${prefix}${main}${end}`;
    }

    return {
        clearList(addPrompt = false) {
            headerElem.textContent = "Result list";
            if (addPrompt) {
                contentElem.innerHTML = `<div id="result-list-prompt">Click here to list URLs...</div>`;
            } else {
                contentElem.innerHTML = "";
            }
        },
        insertUrls(urls) {
            this.clearList();

            const joinedUrls = [...new Set(urls)].sort().join(" ");
            const hexes = Math.abs(hashString(joinedUrls)).toString(16).slice(-8).padStart(8, "0");
            const title = `title="RMB click to temporary toggle Unsearchable option"`;

            let modSpans = "-";
            if (settings.sort) {
                modSpans += `<span class="modifier" title="Sorted">S</span>`;
            } else if (settings.hostname_sort) {
                modSpans += `<span class="modifier" title="Hostname Sorted">HS</span>`;
            }
            if (settings.reverse) {
                modSpans += `<span class="modifier" title="Reversed">R</span>`;
            }

            headerElem.innerHTML =
                  `<span class="header-content" ${title}>Result list (${urls.length})</span> `
                + `<span class="urls-hash">#<span class="hash" title="Hash">${hexes.toUpperCase()}</span></span>`
                + `<span class="list-modifiers">${modSpans.length > 1 ? modSpans : ""}</span>`;

            const anchorAttr = `class="url-item-link" target="_blank" rel="noreferrer noopener"`;
            let resultHtml = "";
            let prev = urls[0];
            for (const url of urls) {
                let linkHtml = urlToHtml(url);
                if (settings.hostname_sort || settings.sort) {
                    if (mainHost(prev) !== mainHost(url)) {
                        resultHtml += `<span class="url-pad"></span>`;
                    }
                    prev = url;
                }
                const clicked = clickedUrls.has(url) ? " clicked" : "";
                const html = `<div class="url-item${clicked}"><a href="${url}" ${anchorAttr}>${linkHtml}</a></div>`;
                resultHtml += html;
            }
            contentElem.insertAdjacentHTML("beforeend", resultHtml);
        },
        headerElem,
        contentElem,
    };
}
