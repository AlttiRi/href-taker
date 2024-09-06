/** @return {string[]} */
export function parseUrls(targetSelector = "body", {
    includeTextUrls, onlyTextUrls, bracketsTrim, includeMedia,
}) {
    let elems;
    try {
        elems = [...document.querySelectorAll(targetSelector)];
    } catch {
        console.error("Invalid selector");
        return [];
    }

    includeTextUrls = includeTextUrls || onlyTextUrls;

    const urls = [];
    for (const el of elems) {

        let anchorUrls;
        if (onlyTextUrls) {
            anchorUrls = [];
        } else {
            if (el.tagName === "A") {
                anchorUrls = [el.href];
            } else {
                anchorUrls = [...el.querySelectorAll("a")].map(a => a.href);
            }
            urls.push(anchorUrls);
        }

        if (includeTextUrls) {
            const textUrls = parseUrlsFromText(el.innerText, bracketsTrim);
            urls.push(textUrls.filter(url => !anchorUrls.includes(url)));
        }

        if (includeMedia) {
            const imageUrls = [...el.querySelectorAll("img")].map(el => el.src);
            const videoUrls = [...el.querySelectorAll("video, video source")].map(el => el.src);
            urls.push(imageUrls, videoUrls);
        }
    }
    return urls.flat();
}

export function urlsToText(targetSelector = "body", urlFilter) {
    let count = 0;
    [...document.querySelectorAll(targetSelector)]
        .forEach(el => {
            const anchors = [...el.querySelectorAll("a")]
                .filter(a => urlFilter(a.href));

            for (const a of anchors) {
                if (a.dataset.urlToText !== undefined) {
                    continue;
                }

                a.dataset.urlToText = "";
                if (a.title) {
                    a.dataset.originalTitle = a.title;
                }

                a.title = a.textContent;
                a.textContent = a.href + " ";

                count++;
            }
        });
    return count;
}

export function undoUrlsToText(targetSelector = "body") {
    let count = 0;
    [...document.querySelectorAll(targetSelector)]
        .forEach(el => {
            const anchors = [...el.querySelectorAll(`a[data-url-to-text]`)];
            for (const a of anchors) {
                a.textContent = a.title;
                if (a.dataset.originalTitle) {
                    a.title = a.dataset.originalTitle;
                    a.removeAttribute("data-original-title");
                } else {
                    a.removeAttribute("title");
                }
                a.removeAttribute("data-url-to-text");
                count++;
            }
        });
    return count;
}

/**
 * @param {string} url
 * @return {string[]}
 */
function splitOnUnmatchedBrackets(url) {
    const chars = [...url];
    let rounds  = 0;
    let squares = 0;
    let i = 0;
    for (const char of chars) {
        i++;
        if (char === "(") {
            rounds++;
        } else if (char === ")") {
            rounds--;
        } else if (char === "[") {
            squares++;
        } else if (char === "]") {
            squares--;
        }
        if (rounds < 0 || squares < 0 ) {
            const before = chars.slice(0, i - 1).join("");
            const after  = chars.slice(i - 1).join("");
            return [before, after];
        }
    }
    return [url, null];
}

function parseUrlsFromText(text, bracketsTrim = true) {
    const regex = /[^\s<>"():\/]+\.(?<host1>[^\s<>"()\/:]+(:\d+)?)\/[^\s<>"]+/g;
    const urls = [...text.matchAll(regex)]
        .map(match => match[0])
        .map(text => {
            return "https://" + text; // consider all link are https
        });
    if (bracketsTrim) { // Trim unmatched closed brackets — ")", or "]" with the followed content
        return urls.flatMap(url => {
            const [_url, after] = splitOnUnmatchedBrackets(url);
            if (after && after.includes("://") && after.match(regex)) {
                return [_url, ...parseUrlsFromText(after)];
            }
            return _url;
        });
    }
    return urls;
}
