# HrefTaker

The userscript that adds a popup to collect URLs from a web page.

![image](https://user-images.githubusercontent.com/16310547/220745223-a674587f-8863-4e94-8aa7-bdbd375ac6e8.png)


_Popup is draggable and resizable. Use the upper edge to move the popup. To resize the popup use the right bottom corner._

_Changing of controls/filters immediately effects on the result list._

_It keeps the state in `LocalStorage`._

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

