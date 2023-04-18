import {cssFromStyle} from "./util.js";

export function getMinimized() {
    const minimizedHtml = `
<div id="popup-minimized">
    <div>
        <span>HrefTaker</span>        
        <button id="open-popup" title="Open popup">O</button>
        <button id="close-popup" title="Close popup">X</button>
    </div>
</div>`;

    const minimizedCss = cssFromStyle`
<style>
#popup-minimized {
    position: fixed;
    width: fit-content;
    background-color: white;
    padding: 3px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
    border: 1px solid gray;
    border-radius: 2px;
}
#popup-minimized span {
    padding: 0 4px;
}
</style>`;

    return {minimizedHtml, minimizedCss};
}


