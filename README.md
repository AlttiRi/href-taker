# [HrefTaker](https://github.com/AlttiRi/href-taker)

The userscript that adds a popup to collect links from a web page. It's mainly aimed for static websites.

It grabs the URLs from anchors' `href`s (`a` HTML tag) as well as from non-hyperlink visible text.

![Screenshot](https://user-images.githubusercontent.com/16310547/232351246-7ba1837b-9e0f-4dfe-a329-1341be9769e2.png)


_Popup is draggable and resizable. Use the upper edge to move the popup. To resize the popup use the right bottom corner._

_Changing of controls/filters immediately effects on the result list._

_Popup can be not only closed, but minimized._

_It keeps the state in `LocalStorage`._

---

To install open this URL: [https://github.com/AlttiRi/href-taker/raw/master/dist/href-taker.user.js](https://github.com/AlttiRi/href-taker/raw/master/dist/href-taker.user.js)

_An installed userscript manager extension ([VM](https://violentmonkey.github.io/#installation)/[TM](https://www.tampermonkey.net/)) is required._

---

To open the popup use the userscript manager's menu command:

![image](https://user-images.githubusercontent.com/16310547/222466876-7f023af9-3a75-4775-8235-28b4d64bb6e1.png)

---

The userscript has by default:

```js
// @match       *://*/*
```

It's recommended to overwrite the rule in the userscript manager's settings to run the script only in the locations where you need it:

![image](https://user-images.githubusercontent.com/16310547/222470203-28c52dba-af44-4546-8c8b-5f8d54dc4eac.png)

---

To use the userscript in `file://` pages you need to enable "Allow access to file URLs" checkbox in the userscript manager extension's setting:

![image](https://user-images.githubusercontent.com/16310547/222470882-c438de1a-5a1e-45fb-b272-d0c5a6579735.png)

---

### Demo

Here is a [demo webpage](https://alttiri.github.io/href-taker/demo) to try this popup.

---

### Filters

To filter the result list use "Only" and "Ignore" inputs.

The result list will have any URL which includes any word from **Only** input and no one from **Ignore** input.

Use the right mouse button (RMB) click on the input prompt ("Only"/"Ignore" text) to disable the input rule.

Additionally, with the middle mouse button (MMB) click on the "Only" prompt text you can reverse the filter rule.

### Controls

Buttons

- **"List links"** button collects and lists the URLs. RMB click clears the list.
- **"Copy"** button copies the links separated by a space. With RMB click the links will be separated by a new line (`\n`) character.
- **"URLs to text"** button converts links' text to the original URL value. The second click reverts the changes.
- **"Extra Settings"** button toggles showing the additional options.

Checkboxes

- **"Include text"** checkbox — to additionally parse URLs from text (`innerText`), not only from `a` tag elements.
- **"Only text"** checkbox — to parse URLs only from the web page visible text content, not from `a` tags.

Extra checkboxes

- **"Auto open"** — to automatically show the popup/minimized popup on a web page is loaded event even the popup was closed last time.
- **"Auto list"** — to automatically collect and list URL on popup is opened.
- **"Only unique"** — to list only unique URLs without duplicates.
- **"Sort"** — to sort URLs by `hostname`.
- **"Reverse"** — to revers order the result URLs list.
- **"Case-sensitive"** — for case-sensitive matching.
- **"No 1st-party"** — to exclude 1st-party links, and list only 3rd-party ones.
- **"https"** — to replace `http://` with `https://`.
- **"Trim brackets"** — to enable extra logic for text URL parsing for links are included `(`,`)`,`[`,`]` characters.
- **"Console log"** — to log some data to the console while working.
- **"Console vars"** — to expose some variables into the console. For example, `urls` variable.

Also in the extra settings you can enable the **tags feature**. It allows to filter URLs more convenient by hostname tags.

![image](https://user-images.githubusercontent.com/16310547/232351342-87a4236a-a858-469b-bd86-a7aafe3c6238.png)


Selector

- It defines from which element(s) to parse URLs. By default, it's `body` selector.

---

### See also
 - [HrefLister](https://github.com/AlttiRi/href-lister)
