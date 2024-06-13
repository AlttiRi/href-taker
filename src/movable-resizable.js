import {localStorage} from "./gm-util.js";

/** @typedef {"top" | "left"} MoveStyleProps */
/** @typedef {Record<MoveStyleProps, string>} MoveState  */

/** @typedef {"width" | "height"} ResizeStyleProps */
/** @typedef {Record<ResizeStyleProps, string>} ResizeState */

/** @typedef {MoveStyleProps | ResizeStyleProps} AnyStyleProps */
/** @typedef {MoveState | ResizeState} AnyState */

/**
 * @note
 * `addEventListener("pointerdown")` with `{passive: true}` is fine with ShadowDOM,
 * in other case use `event.preventDefault()` to prevent bugs when there is a selected text on the page.
 * Note, that using of `preventDefault` will prevent useful `focus` event, if you use `tabindex="-1"` on the element.
 */

/**
 * @param {HTMLElement} element
 * @param {AnyState} state
 */
function assignStyleState(element, state) {
    for (const [k, v] of Object.entries(state)) {
        element.style[k]  = v;
    }
}

/**
 * @param {HTMLElement} element
 * @param {Object?} opts
 * @param {HTMLElement} [opts.handle]
 * @param {(state: MoveState) => void} [opts.onStop]
 * @param {(state: MoveState) => void} [opts.onMove]
 * @param {MoveState} [opts.state]
 */
export function makeMovable(element, {handle, onStop: _onStop, onMove, state} = {}) {
    const _onMove = state => {
        onMove?.(state);
        assignStyleState(element, state);
    };
    if (state) {
        _onMove(state);
        _onStop?.(state);
    }

    const _handle = handle || element;
    _handle.style.userSelect  = "none";
    _handle.style.touchAction = "none";
    element.style.position    = "absolute";

    _handle.addEventListener("pointerdown", event => {
        const offsetY = event.clientY - parseInt(getComputedStyle(element).top);
        const offsetX = event.clientX - parseInt(getComputedStyle(element).left);
        /** @type {MoveState} */
        let state;
        function onMove(event) {
            !_handle.hasPointerCapture(event.pointerId) && _handle.setPointerCapture(event.pointerId);
            state = {
                top:  (event.clientY - offsetY) + "px",
                left: (event.clientX - offsetX) + "px",
            };
            _onMove(state);
        }
        function onEnd() {
            removeEventListener("pointermove", onMove);
            state && _onStop?.(state);
        }
        addEventListener("pointermove", onMove, {passive: true});
        addEventListener("pointerup", onEnd, {once: true});
    }, {passive: true});
}

/**
 * @param {HTMLElement} element
 * @param {Object?} opts
 * @param {number} [opts.minW]
 * @param {number} [opts.minH]
 * @param {number} [opts.size]
 * @param {(state: ResizeState) => void} [opts.onStop]
 * @param {(state: ResizeState) => void} [opts.onMove]
 * @param {ResizeState} [opts.state]
 */
export function makeResizable(element, {
    minW = 32, minH = 32, size = 16, onStop: _onStop, onMove, state
} = {}) {
    const _onMove = state => {
        onMove?.(state);
        assignStyleState(element, state);
    };
    if (state) {
        _onMove(state);
        _onStop?.(state);
    }

    const lrCorner = document.createElement("div");
    lrCorner.style.cssText =
        `width: ${size}px; height: ${size}px; border-radius: ${(size / 2)}px;` +
        `bottom: ${-(size / 2)}px; right: ${-(size / 2)}px; ` +
        `position: absolute; background-color: transparent; cursor: se-resize; touch-action: none;`;
    element.append(lrCorner);

    lrCorner.addEventListener("pointerdown", event => {
        lrCorner.setPointerCapture(event.pointerId);
        const offsetX = event.clientX - element.offsetLeft - parseInt(getComputedStyle(element).width);
        const offsetY = event.clientY - element.offsetTop  - parseInt(getComputedStyle(element).height);
        /** @type {ResizeState} */
        let state;
        function onMove(event) {
            let x = event.clientX - element.offsetLeft - offsetX;
            let y = event.clientY - element.offsetTop  - offsetY;
            if (x < minW) { x = minW; }
            if (y < minH) { y = minH; }
            state = {
                width:  x + "px",
                height: y + "px",
            };
            _onMove(state);
        }
        function onEnd() {
            lrCorner.removeEventListener("pointermove", onMove);
            state && _onStop?.(state);
        }
        lrCorner.addEventListener("pointermove", onMove, {passive: true});
        lrCorner.addEventListener("lostpointercapture", onEnd, {once: true});
    }, {passive: true});
}


/**
 * @template T
 * @extends {AnyState}
 * @typedef {{
 * onMove?: (state: T) => void,
 * onStop?: (state: T) => void,
 * state?: T
 }} StoreStateReturn
 */

/**
 * @template T
 * @extends {AnyState}
 * @param {Object}              opt - `StoreStateOpt`
 * @param {string}              opt.id
 * @param {(state: T) => void} [opt.onMove]
 * @param {(state: T) => void} [opt.onStop]
 * @param {boolean}            [opt.reset]
 * @param {boolean}            [opt.restore]
 * @return {StoreStateReturn<T>}
 */
export function storeStateInLS({id: lsName, onMove, onStop, reset, restore}) {
    if (reset && lsName) {
        localStorage.removeItem(lsName);
    }
    if (!restore || !lsName) {
        return {onMove, onStop};
    }
    const stateJson = localStorage.getItem(lsName);
    let state;
    if (stateJson) {
        state = JSON.parse(stateJson);
    }

    function saveStateLS(state) {
        localStorage.setItem(lsName, JSON.stringify(state));
    }

    let _onStop;
    if (onStop) {
        _onStop = function(state) {
            onStop(state);
            saveStateLS(state);
        };
    } else {
        _onStop = saveStateLS;
    }

    return {
        onMove,
        onStop: _onStop,
        state
    };
}
