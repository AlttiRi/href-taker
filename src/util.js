/**
 * @param {string[]} items
 * @param {number} size
 * */
export function getCodeArrays(items, size = 100) {
    const jsonArray = a => `${a.length ? "[\"" + a.join(`", "`) + "\"]" : "[]"}`;
    if (items.length <= size) {
        return `// \n/* ${items.length.toString().padStart(3)} */ ${jsonArray(items)},`;
    }
    const len = num => num.toString().length;
    const count = Math.trunc(items.length / size);
    const comment = items.length.toString().padStart(1 + len(items.length)) + " ".repeat(3 + len(count));
    const parts = [`/* ${comment} */ // `];
    for (let i = 0; i <= count; i++) {
        const part = items.slice(size * i, size + size * i);
        const page = `(${i + 1})`.padStart(2 + len(count));
        const pageCount = part.length.toString().padStart(1 + len(items.length));
        parts.push(`/* ${pageCount} ${page} */ ${jsonArray(part)},`);
    }
    return parts.join("\n");
}

// --------------------------

export function getHsl(seed, L = 40, dL = 20) {
    const H = Math.trunc(360 * getRandomValue(seed));
    const _L = Math.trunc((L + getRandomValue(seed + 1) * dL)) + "%";
    return `hsl(${H}, 100%, ${_L})`;
}

export function getRandomValue(seed = Date.now()) {
    let x = seed + 0x6D2B79F5;
    x = Math.imul(x ^ x >>> 15, x | 1);
    x ^= x + Math.imul(x ^ x >>> 7, x | 61);
    return ((x ^ x >>> 14) >>> 0) / 4294967296;
}

export function getRandom(seed = Date.now()) { // mulberry32 algo
    return function() {
        let x = seed += 0x6D2B79F5;
        x = Math.imul(x ^ x >>> 15, x | 1);
        x ^= x + Math.imul(x ^ x >>> 7, x | 61);
        return ((x ^ x >>> 14) >>> 0) / 4294967296; // 4 * 1024 ** 3;
    }
}

// --------------------------
