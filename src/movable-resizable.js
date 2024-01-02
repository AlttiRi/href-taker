/**
 * @param {HTMLElement} element
 * @param {{[string]: string}} state
 */
function assignStyleState(element, state) {
    for (const [k, v] of Object.entries(state)) {
        element.style[k]  = v;
    }
}

/**
 * @param {HTMLElement} element
 * @param {Object?} opts
 * @param {HTMLElement?} opts.handle
 * @param {function?} opts.onStop
 * @param {function?} opts.onMove
 * @param {{top: string, left: string}?} opts.state
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

    handle = handle || element;
    handle.style["user-select"] = "none";
    handle.style["touch-action"] = "none";
    element.style.position = "absolute";

    handle.addEventListener("pointerdown", event => {
        const offsetY = event.clientY - parseInt(getComputedStyle(element).top);
        const offsetX = event.clientX - parseInt(getComputedStyle(element).left);

        let state;
        function onMove(event) {
            !handle.hasPointerCapture(event.pointerId) && handle.setPointerCapture(event.pointerId);
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
 * @param {number?} opts.minW
 * @param {number?} opts.minH
 * @param {number?} opts.size
 * @param {function?} opts.onStop
 * @param {function?} opts.onMove
 * @param {{width: string, height: string}?} opts.state
 */
export function makeResizable(element, {
    minW = 240, minH = 240, size = 16, onStop: _onStop, onMove, state
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

    lrCorner.addEventListener("pointerdown",event => {
        lrCorner.setPointerCapture(event.pointerId);
        const offsetX = event.clientX - element.offsetLeft - parseInt(getComputedStyle(element).width);
        const offsetY = event.clientY - element.offsetTop  - parseInt(getComputedStyle(element).height);

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
 * @param {Object} opts
 * @param {string} opts.id
 * @param {function?} opts.onMove
 * @param {function?} opts.onStop
 * @param {boolean?} opts.reset
 * @param {boolean?} opts.restore
 * @return {{state?: Object, onMove: function, onStop: function}}
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
