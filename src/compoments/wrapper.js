import {cssFromStyle} from "./util.js";


export function getWrapper() {
    const wrapperHtml = `<div id="shadow-content-wrapper"></div>`;

    const wrapperCss = cssFromStyle`
<style>
#shadow-content-wrapper {
    display: flex;
    margin-top: 40px;
    justify-content: center;
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    pointer-events: none;
    z-index: 99999;
    font-size: 16px;
    font-family: serif;
}
#shadow-content-wrapper > * {
    pointer-events: all;
}
button, .button {
    min-width: 24px;
    background-color: white;
    border: 1px solid gray;
    padding: 2px;
    border-radius: 3px;
    outline: none !important;
}
button:focus:not(.button-no-outline), .button:focus:not(.button-no-outline) {
    border: 1px solid black;
}

button:hover, .button:hover {
    background-color: rgba(0, 0, 0, 0.03);
}
button:active:focus, .button:active:focus {
    background-color: rgba(0, 0, 0, 0.1);
}
button.clicked, .button.clicked {
    background-color: rgba(0, 0, 0, 0.1);
}
</style>`;

    return {wrapperHtml, wrapperCss};
}

