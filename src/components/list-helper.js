import {hashString} from "../util.js";

/**
 * @param container
 * @param {ScriptSettings} settings
 */
export function getListHelper(container, settings) {
    const headerElem  = container.querySelector(`#result-list-header`);
    const contentElem = container.querySelector(`#result-list`);
    const mainHost = url => new URL(url).hostname.split(".").slice(-2).join(".");

    const clickedUrls = new Set();
    contentElem.addEventListener("click", event => {
        if (!event.target.classList.contains("visible")) {
            return;
        }
        const urlItem = event.target.closest(".url-item");
        urlItem.classList.add("clicked");
        const url = urlItem.querySelector("a").href;
        clickedUrls.add(url);
        const dupLinks = [...contentElem.querySelectorAll(`.url-item:not(.clicked) a[href="${url}"]`)];
        for (const dupLink of dupLinks) {
            dupLink.closest(".url-item").classList.add("clicked");
        }
    });

    contentElem.addEventListener("contextmenu", /** @param {MouseEvent} event */ event => {
        if (!event.altKey) {
            return;
        }
        if (!event.target.classList.contains("visible")) {
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
    });

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
            headerElem.innerHTML = `Result list (${urls.length}) <span class="urls-hash">#${hexes.toUpperCase()}</span>`;

            let resultHtml = "";
            let prev = urls[0];
            for (const url of urls) {
                let linkHtml = urlToHtml(url);
                if (settings.sort) {
                    try {
                        if (mainHost(prev) !== mainHost(url)) {
                            resultHtml += `<span class="url-pad"></span>`;
                        }
                        prev = url;
                    } catch (e) {
                        console.error(url, e);
                    }
                }
                const clicked = clickedUrls.has(url) ? " clicked" : "";
                const html = `<div class="url-item${clicked}"><a href="${url}" target="_blank" rel="noreferrer noopener">${linkHtml}</a></div>`;
                resultHtml += html;
            }
            contentElem.insertAdjacentHTML("beforeend", resultHtml);
        },
        headerElem,
        contentElem,
    };
}
