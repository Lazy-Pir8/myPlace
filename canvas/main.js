// ============================================================
// CONFIG
// ============================================================

const BOARD_W = 1024;
const BOARD_H = 1024;

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 64;

const GRID_FADE_IN = 6;
const GRID_FADE_FULL = 12;

// ============================================================
// CHUNKS
// ============================================================

// The board is divided into small chunks.
//
// Only chunks containing painted cells are stored.
//
// Example:
//
// 1024 x 1024 board
// 32 x 32 chunks
// 1024 total possible chunks
//
// Each chunk contains:
// 32 x 32 = 1024 cells
//
// But chunks that are completely empty do not exist.

const CHUNK_SIZE = 32;
const CHUNK_AREA = CHUNK_SIZE * CHUNK_SIZE;

// Map:
// "chunkX,chunkY" -> Uint8Array(CHUNK_AREA)

const chunks = new Map();


// ============================================================
// SAVE
// ============================================================

const SAVE_KEY = "place.board.v2";
const SAVE_DELAY = 400;


// ============================================================
// PAINT COOLDOWN
// ============================================================

// Time between successful pixel placements.
//
// 1000 milliseconds = 1 second.
//
// Change this value later if you want.
//
// Examples:
//
// 500  = half a second
// 1000 = one second
// 5000 = five seconds

const PAINT_COOLDOWN = 100;

let nextPaintTime = 0;


// ============================================================
// UNDO
// ============================================================

const UNDO_LIMIT = 200;


// ============================================================
// COLORS
// ============================================================

const COLORS = [
    "#ffffff",

    "#be0039",
    "#ff4500",
    "#ffa800",
    "#ffd635",
    "#fff8b8",

    "#00a368",
    "#00cc78",
    "#7eed56",
    "#00756f",
    "#009eaa",
    "#00ccc0",

    "#2450a4",
    "#3690ea",
    "#51e9f4",
    "#493ac1",
    "#6a5cff",
    "#94b3ff",

    "#811e9f",
    "#b44ac0",
    "#e4abff",
    "#de107f",
    "#ff3881",
    "#ff99aa",

    "#6d482f",
    "#9c6926",
    "#ffb470",

    "#000000",
    "#515252",
    "#898d90",
    "#d4d7d9"
];



// ============================================================
// CANVAS SETUP
// ============================================================

const canvas =
    document.getElementById("viewport");

canvas.style.position = "fixed";
canvas.style.left = "0";
canvas.style.top = "0";
canvas.style.width = "100vw";
canvas.style.height = "100vh";
canvas.style.display = "block";
canvas.style.touchAction = "none";
canvas.style.cursor = "crosshair";
canvas.style.zIndex = "0";


const ctx =
    canvas.getContext("2d", {
        alpha: false
    });


const paletteEl =
    document.getElementById("palette");

const coordsEl =
    document.getElementById("coords");

const zoomEl =
    document.getElementById("zoom");

const toastEl =
    document.getElementById("toast");


// ============================================================
// UI LAYER
// ============================================================

if (paletteEl) {
    paletteEl.style.position = "relative";
    paletteEl.style.zIndex = "10";
}

if (coordsEl) {
    coordsEl.style.position = "relative";
    coordsEl.style.zIndex = "10";
}

if (zoomEl) {
    zoomEl.style.position = "relative";
    zoomEl.style.zIndex = "10";
}

if (toastEl) {
    toastEl.style.position = "relative";
    toastEl.style.zIndex = "20";
}


// ============================================================
// OFFSCREEN CANVAS
// ============================================================

// This is still a complete board-sized canvas.
//
// Important distinction:
//
// STORAGE:
// sparse chunks
//
// RENDERING:
// complete offscreen image
//
// This gives us low storage usage without making rendering
// unnecessarily complicated.

const off =
    document.createElement("canvas");

off.width = BOARD_W;
off.height = BOARD_H;


const offCtx =
    off.getContext("2d", {
        alpha: false
    });


const imgData =
    offCtx.createImageData(
        BOARD_W,
        BOARD_H
    );


// ============================================================
// RGB CACHE
// ============================================================

const RGB =
    COLORS.map(hex => [

        parseInt(
            hex.slice(1, 3),
            16
        ),

        parseInt(
            hex.slice(3, 5),
            16
        ),

        parseInt(
            hex.slice(5, 7),
            16
        )

    ]);


// ============================================================
// CAMERA
// ============================================================

const camera = {

    x: 0,
    y: 0,

    // Screen pixels per board cell.

    zoom: 4

};


// ============================================================
// STATE
// ============================================================

let currentColor = 1;

let cssW = 0;
let cssH = 0;
let dpr = 1;

let needsBlit = true;
let renderQueued = false;

let hover = null;

let showGrid = true;


// ============================================================
// INPUT STATE
// ============================================================

const pointers = new Map();

let mode = null;

let spaceHeld = false;

let lastPanX = 0;
let lastPanY = 0;

let lastCellX = 0;
let lastCellY = 0;

let pinchDist = 0;


// ============================================================
// UNDO
// ============================================================

const undoStack = [];

let stroke = null;


// ============================================================
// SAVE STATE
// ============================================================

let saveTimer = null;
let hashTimer = null;

let quotaWarned = false;


// ============================================================
// HELPERS
// ============================================================

function clamp(
    value,
    min,
    max
) {

    return Math.max(
        min,
        Math.min(max, value)
    );

}


function inBounds(
    x,
    y
) {

    return (
        x >= 0 &&
        y >= 0 &&
        x < BOARD_W &&
        y < BOARD_H
    );

}


// ============================================================
// CHUNK HELPERS
// ============================================================

// JavaScript % gives negative results for negative numbers.
//
// Because our board itself is bounded at zero, this mostly
// matters when calculating chunk positions near the edges.
//
// These functions keep chunk math explicit and easy to debug.

function chunkXFromCell(x) {

    return Math.floor(
        x / CHUNK_SIZE
    );

}


function chunkYFromCell(y) {

    return Math.floor(
        y / CHUNK_SIZE
    );

}


function localXFromCell(x) {

    return (
        x -
        chunkXFromCell(x) *
        CHUNK_SIZE
    );

}


function localYFromCell(y) {

    return (
        y -
        chunkYFromCell(y) *
        CHUNK_SIZE
    );

}


function chunkKey(
    chunkX,
    chunkY
) {

    return `${chunkX},${chunkY}`;

}


// ============================================================
// CHUNK CREATION
// ============================================================

function createChunk() {

    return new Uint8Array(
        CHUNK_AREA
    );

}


// ============================================================
// GET CHUNK
// ============================================================

function getChunk(
    chunkX,
    chunkY
) {

    return chunks.get(
        chunkKey(
            chunkX,
            chunkY
        )
    );

}


// ============================================================
// GET OR CREATE CHUNK
// ============================================================

function getOrCreateChunk(
    chunkX,
    chunkY
) {

    const key =
        chunkKey(
            chunkX,
            chunkY
        );


    let chunk =
        chunks.get(key);


    if (!chunk) {

        chunk =
            createChunk();


        chunks.set(
            key,
            chunk
        );

    }


    return chunk;

}


// ============================================================
// GET PIXEL
// ============================================================

function getPixel(
    x,
    y
) {

    if (!inBounds(x, y)) {
        return 0;
    }


    const chunkX =
        chunkXFromCell(x);

    const chunkY =
        chunkYFromCell(y);


    const chunk =
        getChunk(
            chunkX,
            chunkY
        );


    if (!chunk) {
        return 0;
    }


    const localX =
        localXFromCell(x);

    const localY =
        localYFromCell(y);


    return chunk[
        localY * CHUNK_SIZE +
        localX
    ];

}


// ============================================================
// CHECK IF CHUNK IS EMPTY
// ============================================================

function isChunkEmpty(chunk) {

    for (
        let i = 0;
        i < chunk.length;
        i++
    ) {

        if (chunk[i] !== 0) {
            return false;
        }

    }

    return true;

}


// ============================================================
// WRITE BOARD PIXEL
// ============================================================

function writeCell(
    x,
    y,
    colorID
) {

    if (!inBounds(x, y)) {
        return false;
    }


    const chunkX =
        chunkXFromCell(x);

    const chunkY =
        chunkYFromCell(y);


    const localX =
        localXFromCell(x);

    const localY =
        localYFromCell(y);


    const localIndex =
        localY * CHUNK_SIZE +
        localX;


    const key =
        chunkKey(
            chunkX,
            chunkY
        );


    let chunk =
        chunks.get(key);


    // Painting a blank cell.

    if (colorID === 0) {

        // Nothing exists here.

        if (!chunk) {
            return false;
        }


        if (
            chunk[localIndex] === 0
        ) {

            return false;

        }


        chunk[localIndex] = 0;


        // If the whole chunk is now empty,
        // remove it completely.

        if (
            isChunkEmpty(chunk)
        ) {

            chunks.delete(key);

        }

    }

    // Painting a colour.

    else {

        if (!chunk) {

            chunk =
                createChunk();


            chunks.set(
                key,
                chunk
            );

        }


        if (
            chunk[localIndex] === colorID
        ) {

            return false;

        }


        chunk[localIndex] =
            colorID;

    }


    // Update offscreen image.

    const index =
        y * BOARD_W + x;


    const [r, g, b] =
        RGB[colorID];


    const p =
        index * 4;


    imgData.data[p] = r;
    imgData.data[p + 1] = g;
    imgData.data[p + 2] = b;
    imgData.data[p + 3] = 255;


    needsBlit = true;

    return true;

}


// ============================================================
// PAINT
// ============================================================

function paintCell(
    x,
    y,
    colorID
) {

    if (!inBounds(x, y)) {
        return false;
    }


    // Rate limit only applies to actual
    // user painting.

    const now =
        performance.now();


    if (
        now < nextPaintTime
    ) {

        return false;

    }


    const previous =
        getPixel(x, y);


    const changed =
        writeCell(
            x,
            y,
            colorID
        );


    if (!changed) {
        return false;
    }


    // Start cooldown only after a
    // successful pixel change.

    nextPaintTime =
        now + PAINT_COOLDOWN;


    if (stroke) {

        stroke.push({

            x,
            y,
            previous

        });

    }


    scheduleSave();

    return true;

}


// ============================================================
// PAINT LINE
// ============================================================

function paintLine(
    x0,
    y0,
    x1,
    y1,
    colorID
) {

    const dx =
        Math.abs(x1 - x0);

    const dy =
        Math.abs(y1 - y0);


    const sx =
        x0 < x1 ? 1 : -1;

    const sy =
        y0 < y1 ? 1 : -1;


    let err =
        dx - dy;


    let x = x0;
    let y = y0;


    while (true) {

        // If cooldown blocks the first
        // pixel, stop immediately.

        if (
            !paintCell(
                x,
                y,
                colorID
            )
        ) {

            return;

        }


        if (
            x === x1 &&
            y === y1
        ) {

            break;

        }


        const e2 =
            2 * err;


        if (
            e2 > -dy
        ) {

            err -= dy;
            x += sx;

        }


        if (
            e2 < dx
        ) {

            err += dx;
            y += sy;

        }

    }

}


// ============================================================
// REBUILD OFFSCREEN IMAGE
// ============================================================

function rebuildImageData() {

    const data =
        imgData.data;


    // Start completely white.

    for (
        let i = 0;
        i < data.length;
        i += 4
    ) {

        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
        data[i + 3] = 255;

    }


    // Only iterate through existing chunks.

    for (
        const [
            key,
            chunk
        ]
        of chunks
    ) {

        const [
            chunkX,
            chunkY
        ] =
            key
                .split(",")
                .map(Number);


        for (
            let localY = 0;
            localY < CHUNK_SIZE;
            localY++
        ) {

            const worldY =
                chunkY *
                CHUNK_SIZE +
                localY;


            if (
                worldY >= BOARD_H
            ) {
                continue;
            }


            for (
                let localX = 0;
                localX < CHUNK_SIZE;
                localX++
            ) {

                const worldX =
                    chunkX *
                    CHUNK_SIZE +
                    localX;


                if (
                    worldX >= BOARD_W
                ) {
                    continue;
                }


                const colorID =
                    chunk[
                        localY *
                        CHUNK_SIZE +
                        localX
                    ];


                if (
                    colorID === 0
                ) {
                    continue;
                }


                const [
                    r,
                    g,
                    b
                ] =
                    RGB[colorID];


                const p =
                    (
                        worldY *
                        BOARD_W +
                        worldX
                    ) * 4;


                data[p] = r;
                data[p + 1] = g;
                data[p + 2] = b;
                data[p + 3] = 255;

            }

        }

    }


    needsBlit = true;

}


// ============================================================
// SAVE ENCODING
// ============================================================

// Each existing chunk is stored as:
//
// {
//     x: chunkX,
//     y: chunkY,
//     data: base64
// }
//
// Empty chunks never enter the save file.

function encodeBytes(bytes) {

    let result = "";

    const CHUNK =
        0x8000;


    for (
        let i = 0;
        i < bytes.length;
        i += CHUNK
    ) {

        result +=
            String.fromCharCode.apply(
                null,
                bytes.subarray(
                    i,
                    i + CHUNK
                )
            );

    }


    return btoa(result);

}


function decodeBytes(base64) {

    const binary =
        atob(base64);


    const result =
        new Uint8Array(
            binary.length
        );


    for (
        let i = 0;
        i < binary.length;
        i++
    ) {

        result[i] =
            binary.charCodeAt(i);

    }


    return result;

}


// ============================================================
// SAVE CHUNKS
// ============================================================

function serializeChunks() {

    const savedChunks = [];


    for (
        const [
            key,
            chunk
        ]
        of chunks
    ) {

        // Safety check.

        if (
            isChunkEmpty(chunk)
        ) {
            continue;
        }


        const [
            x,
            y
        ] =
            key
                .split(",")
                .map(Number);


        savedChunks.push({

            x,
            y,

            data:
                encodeBytes(chunk)

        });

    }


    return savedChunks;

}


// ============================================================
// SAVE NOW
// ============================================================

function saveNow() {

    try {

        const data = {

            version: 2,

            boardWidth:
                BOARD_W,

            boardHeight:
                BOARD_H,

            chunkSize:
                CHUNK_SIZE,

            chunks:
                serializeChunks()

        };


        localStorage.setItem(

            SAVE_KEY,

            JSON.stringify(data)

        );


        quotaWarned = false;

    }

    catch (error) {

        if (!quotaWarned) {

            quotaWarned = true;

            toast(
                "Storage is full. Changes are not being saved.",
                6000
            );

        }


        console.error(
            "Save failed:",
            error
        );

    }

}


// ============================================================
// SCHEDULE SAVE
// ============================================================

function scheduleSave() {

    clearTimeout(
        saveTimer
    );


    saveTimer =
        setTimeout(
            saveNow,
            SAVE_DELAY
        );

}


// ============================================================
// LOAD
// ============================================================

function load() {

    let raw;


    try {

        raw =
            localStorage.getItem(
                SAVE_KEY
            );

    }

    catch {

        return;

    }


    if (!raw) {
        return;
    }


    try {

        const saved =
            JSON.parse(raw);


        if (
            saved.boardWidth !==
                BOARD_W ||

            saved.boardHeight !==
                BOARD_H ||

            saved.chunkSize !==
                CHUNK_SIZE
        ) {

            toast(
                "Saved board has different settings.",
                5000
            );

            return;

        }


        chunks.clear();


        if (
            !Array.isArray(
                saved.chunks
            )
        ) {

            return;

        }


        for (
            const savedChunk
            of saved.chunks
        ) {

            const data =
                decodeBytes(
                    savedChunk.data
                );


            if (
                data.length !==
                CHUNK_AREA
            ) {

                continue;

            }


            chunks.set(

                chunkKey(
                    savedChunk.x,
                    savedChunk.y
                ),

                data

            );

        }

    }

    catch (error) {

        console.error(
            "Load failed:",
            error
        );


        toast(
            "Saved board could not be loaded.",
            5000
        );

    }

}

// ============================================================
// EXPORT PNG
// ============================================================

function exportPNG() {

    // Make sure the offscreen canvas
    // contains the newest pixels.

    if (needsBlit) {

        offCtx.putImageData(
            imgData,
            0,
            0
        );

        needsBlit = false;
    }


    off.toBlob(
        blob => {

            if (!blob) {

                toast(
                    "PNG export failed."
                );

                return;
            }


            const url =
                URL.createObjectURL(
                    blob
                );


            const link =
                document.createElement(
                    "a"
                );


            link.href =
                url;


            link.download =
                `pixel-board-${BOARD_W}x${BOARD_H}.png`;


            document.body.appendChild(
                link
            );


            link.click();


            link.remove();


            URL.revokeObjectURL(
                url
            );


            toast(
                "PNG exported."
            );

        },

        "image/png"
    );
}


// ============================================================
// EXPORT BOARD DATA
// ============================================================

// Exports the actual board/chunk data.
//
// This is different from PNG.
// PNG stores the visual image.
// JSON stores the board structure and
// can later be imported back into the editor.

function exportBoardData() {

    const data = {

        version: 2,

        boardWidth:
            BOARD_W,

        boardHeight:
            BOARD_H,

        chunkSize:
            CHUNK_SIZE,

        chunks:
            serializeChunks()

    };


    const blob =
        new Blob(

            [
                JSON.stringify(
                    data
                )
            ],

            {
                type:
                    "application/json"
            }

        );


    const url =
        URL.createObjectURL(
            blob
        );


    const link =
        document.createElement(
            "a"
        );


    link.href =
        url;


    link.download =
        `pixel-board-${BOARD_W}x${BOARD_H}.json`;


    document.body.appendChild(
        link
    );


    link.click();


    link.remove();


    URL.revokeObjectURL(
        url
    );


    toast(
        "Board data exported."
    );
}


// ============================================================
// EXPORT UI
// ============================================================

function buildExportUI() {

    const container =
        document.createElement(
            "div"
        );


    container.className =
        "export-panel";


    // --------------------------------------------------------
    // PNG BUTTON
    // --------------------------------------------------------

    const pngButton =
        document.createElement(
            "button"
        );


    pngButton.type =
        "button";


    pngButton.textContent =
        "PNG";


    pngButton.setAttribute(
        "aria-label",
        "Export board as PNG"
    );


    pngButton.addEventListener(
        "click",
        exportPNG
    );


    // --------------------------------------------------------
    // DATA BUTTON
    // --------------------------------------------------------

    const dataButton =
        document.createElement(
            "button"
        );


    dataButton.type =
        "button";


    dataButton.textContent =
        "DATA";


    dataButton.setAttribute(
        "aria-label",
        "Export board data"
    );


    dataButton.addEventListener(
        "click",
        exportBoardData
    );


    // --------------------------------------------------------
    // ADD BUTTONS
    // --------------------------------------------------------

    container.appendChild(
        pngButton
    );


    container.appendChild(
        dataButton
    );


    document.body.appendChild(
        container
    );
}

// ============================================================
// VIEW HASH
// ============================================================

function readHash() {

    const match =
        /x=(-?[\d.]+)&y=(-?[\d.]+)&z=([\d.]+)/
            .exec(
                location.hash
            );


    if (!match) {
        return false;
    }


    const centerX =
        parseFloat(
            match[1]
        );


    const centerY =
        parseFloat(
            match[2]
        );


    const zoom =
        parseFloat(
            match[3]
        );


    if (
        !isFinite(centerX) ||
        !isFinite(centerY) ||
        !isFinite(zoom)
    ) {

        return false;

    }


    camera.zoom =
        clamp(
            zoom,
            MIN_ZOOM,
            MAX_ZOOM
        );


    camera.x =
        centerX -
        cssW / 2 /
        camera.zoom;


    camera.y =
        centerY -
        cssH / 2 /
        camera.zoom;


    clampCamera();


    return true;

}


function writeHash() {

    const centerX =
        (
            camera.x +
            cssW / 2 /
            camera.zoom
        ).toFixed(1);


    const centerY =
        (
            camera.y +
            cssH / 2 /
            camera.zoom
        ).toFixed(1);


    const zoom =
        camera.zoom.toFixed(2);


    history.replaceState(

        null,

        "",

        `#x=${centerX}&y=${centerY}&z=${zoom}`

    );

}


function scheduleHash() {

    clearTimeout(
        hashTimer
    );


    hashTimer =
        setTimeout(
            writeHash,
            300
        );

}


// ============================================================
// CAMERA LIMITS
// ============================================================

function clampCamera() {

    const visibleW =
        cssW / camera.zoom;

    const visibleH =
        cssH / camera.zoom;


    if (
        visibleW < BOARD_W
    ) {

        camera.x =
            clamp(
                camera.x,
                0,
                BOARD_W -
                visibleW
            );

    }

    else {

        camera.x =
            BOARD_W / 2 -
            visibleW / 2;

    }


    if (
        visibleH < BOARD_H
    ) {

        camera.y =
            clamp(
                camera.y,
                0,
                BOARD_H -
                visibleH
            );

    }

    else {

        camera.y =
            BOARD_H / 2 -
            visibleH / 2;

    }

}


// ============================================================
// FIT BOARD
// ============================================================

function fitBoard() {

    const zoom =
        Math.min(
            cssW / BOARD_W,
            cssH / BOARD_H
        ) * 0.9;


    camera.zoom =
        clamp(
            zoom,
            MIN_ZOOM,
            MAX_ZOOM
        );


    camera.x =
        BOARD_W / 2 -
        cssW / 2 /
        camera.zoom;


    camera.y =
        BOARD_H / 2 -
        cssH / 2 /
        camera.zoom;


    clampCamera();

}


// ============================================================
// ZOOM
// ============================================================

function zoomAt(
    screenX,
    screenY,
    factor
) {

    const worldX =
        screenX /
        camera.zoom +
        camera.x;


    const worldY =
        screenY /
        camera.zoom +
        camera.y;


    const oldZoom =
        camera.zoom;


    camera.zoom =
        clamp(
            camera.zoom * factor,
            MIN_ZOOM,
            MAX_ZOOM
        );


    if (
        camera.zoom === oldZoom
    ) {

        return;

    }


    camera.x =
        worldX -
        screenX /
        camera.zoom;


    camera.y =
        worldY -
        screenY /
        camera.zoom;


    clampCamera();

}


// ============================================================
// COORDINATE CONVERSION
// ============================================================

function toCanvas(event) {

    const rect =
        canvas.getBoundingClientRect();


    return {

        x:
            (
                event.clientX -
                rect.left
            ) *
            (
                cssW /
                rect.width
            ),

        y:
            (
                event.clientY -
                rect.top
            ) *
            (
                cssH /
                rect.height
            )

    };

}


function toCell(
    px,
    py
) {

    return {

        x:
            Math.floor(
                px /
                camera.zoom +
                camera.x
            ),

        y:
            Math.floor(
                py /
                camera.zoom +
                camera.y
            )

    };

}


// ============================================================
// RENDER
// ============================================================

function requestRender() {

    if (renderQueued) {
        return;
    }


    renderQueued =
        true;


    requestAnimationFrame(
        () => {

            renderQueued =
                false;

            render();

        }
    );

}


function render() {

    ctx.setTransform(
        dpr,
        0,
        0,
        dpr,
        0,
        0
    );


    ctx.fillStyle =
        "#12130f";


    ctx.fillRect(
        0,
        0,
        cssW,
        cssH
    );


    if (needsBlit) {

        offCtx.putImageData(
            imgData,
            0,
            0
        );


        needsBlit = false;

    }


    const z =
        camera.zoom;


    const offsetX =
        -camera.x * z;


    const offsetY =
        -camera.y * z;


    ctx.imageSmoothingEnabled =
        z < 1;


    ctx.save();


    ctx.translate(
        offsetX,
        offsetY
    );


    ctx.scale(
        z,
        z
    );


    ctx.drawImage(
        off,
        0,
        0
    );


    ctx.restore();


    if (showGrid) {
        drawGrid();
    }


    drawBoardEdge();

    drawHover();

}


// ============================================================
// BOARD EDGE
// ============================================================

function drawBoardEdge() {

    const z =
        camera.zoom;


    const ox =
        -camera.x * z;


    const oy =
        -camera.y * z;


    ctx.save();


    ctx.lineWidth =
        1;


    ctx.strokeStyle =
        "#3f4136";


    ctx.strokeRect(

        Math.round(ox) - 0.5,

        Math.round(oy) - 0.5,

        Math.round(
            BOARD_W * z
        ) + 1,

        Math.round(
            BOARD_H * z
        ) + 1

    );


    ctx.restore();

}


// ============================================================
// GRID
// ============================================================

function drawGrid() {

    const z =
        camera.zoom;


    const alpha =
        clamp(

            (
                z -
                GRID_FADE_IN
            ) /
            (
                GRID_FADE_FULL -
                GRID_FADE_IN
            ),

            0,
            1

        ) * 0.28;


    if (
        alpha <= 0.001
    ) {

        return;

    }


    const x0 =
        Math.max(
            0,
            Math.floor(camera.x)
        );


    const y0 =
        Math.max(
            0,
            Math.floor(camera.y)
        );


    const x1 =
        Math.min(
            BOARD_W,
            Math.ceil(
                camera.x +
                cssW / z
            )
        );


    const y1 =
        Math.min(
            BOARD_H,
            Math.ceil(
                camera.y +
                cssH / z
            )
        );


    ctx.save();


    ctx.globalAlpha =
        alpha;


    ctx.strokeStyle =
        "#12130f";


    ctx.lineWidth =
        1;


    ctx.beginPath();


    for (
        let x = x0;
        x <= x1;
        x++
    ) {

        const screenX =
            Math.round(
                (
                    x -
                    camera.x
                ) * z
            ) + 0.5;


        ctx.moveTo(
            screenX,
            (
                y0 -
                camera.y
            ) * z
        );


        ctx.lineTo(
            screenX,
            (
                y1 -
                camera.y
            ) * z
        );

    }


    for (
        let y = y0;
        y <= y1;
        y++
    ) {

        const screenY =
            Math.round(
                (
                    y -
                    camera.y
                ) * z
            ) + 0.5;


        ctx.moveTo(
            (
                x0 -
                camera.x
            ) * z,
            screenY
        );


        ctx.lineTo(
            (
                x1 -
                camera.x
            ) * z,
            screenY
        );

    }


    ctx.stroke();

    ctx.restore();

}


// ============================================================
// HOVER
// ============================================================

function drawHover() {

    if (!hover) {
        return;
    }


    if (
        mode === "pan" ||
        mode === "pinch"
    ) {

        return;

    }


    if (
        !inBounds(
            hover.x,
            hover.y
        )
    ) {

        return;

    }


    const z =
        camera.zoom;


    const screenX =
        Math.round(
            (
                hover.x -
                camera.x
            ) * z
        );


    const screenY =
        Math.round(
            (
                hover.y -
                camera.y
            ) * z
        );


    const size =
        Math.max(
            2,
            Math.round(z)
        );


    ctx.save();


    ctx.globalAlpha =
        0.55;


    ctx.fillStyle =
        COLORS[currentColor];


    ctx.fillRect(
        screenX,
        screenY,
        size,
        size
    );


    ctx.globalAlpha =
        1;


    ctx.lineWidth =
        z >= 8 ? 2 : 1;


    ctx.strokeStyle =
        "#12130f";


    ctx.strokeRect(
        screenX - 0.5,
        screenY - 0.5,
        size + 1,
        size + 1
    );


    ctx.strokeStyle =
        "#f5f3e7";


    ctx.strokeRect(
        screenX + 0.5,
        screenY + 0.5,
        size - 1,
        size - 1
    );


    ctx.restore();

}


// ============================================================
// RESIZE
// ============================================================

function resize() {

    dpr =
        window.devicePixelRatio ||
        1;


    cssW =
        window.innerWidth;


    cssH =
        window.innerHeight;


    canvas.width =
        Math.round(
            cssW * dpr
        );


    canvas.height =
        Math.round(
            cssH * dpr
        );


    clampCamera();

    requestRender();

}


// ============================================================
// HUD
// ============================================================

function updateHud() {

    if (coordsEl) {

        coordsEl.textContent =

            hover &&
            inBounds(
                hover.x,
                hover.y
            )

                ? `${hover.x}, ${hover.y}`

                : "—";

    }


    if (zoomEl) {

        zoomEl.textContent =
            `${camera.zoom.toFixed(1)}×`;

    }

}


// ============================================================
// TOAST
// ============================================================

let toastTimer = null;


function toast(
    message,
    duration = 2200
) {

    if (!toastEl) {
        return;
    }


    toastEl.textContent =
        message;


    toastEl.classList.add(
        "is-visible"
    );


    clearTimeout(
        toastTimer
    );


    toastTimer =
        setTimeout(

            () => {

                toastEl.classList.remove(
                    "is-visible"
                );

            },

            duration

        );

}


// ============================================================
// PALETTE
// ============================================================

function buildPalette() {

    COLORS.forEach(
        (hex, id) => {

            const swatch =
                document.createElement(
                    "button"
                );


            swatch.type =
                "button";


            swatch.className =
                "swatch";


            swatch.style.setProperty(
                "--swatch",
                hex
            );


            swatch.dataset.id =
                String(id);


            swatch.setAttribute(
                "aria-label",

                id === 0
                    ? "Eraser"
                    : `Colour ${id}`

            );


            swatch.setAttribute(
                "aria-pressed",

                String(
                    id === currentColor
                )

            );


            if (id === 0) {

                swatch.classList.add(
                    "swatch--eraser"
                );

            }


            swatch.addEventListener(
                "click",
                () => selectColor(id)
            );


            paletteEl.appendChild(
                swatch
            );

        }
    );

}




function selectColor(id) {

    currentColor =
        id;


    for (
        const swatch
        of paletteEl.children
    ) {

        swatch.setAttribute(

            "aria-pressed",

            String(

                Number(
                    swatch.dataset.id
                ) === id

            )

        );

    }


    requestRender();

}


// ============================================================
// UNDO
// ============================================================

function beginStroke() {

    stroke = [];

}


function endStroke() {

    if (
        stroke &&
        stroke.length
    ) {

        undoStack.push(
            stroke
        );


        if (
            undoStack.length >
            UNDO_LIMIT
        ) {

            undoStack.shift();

        }

    }


    stroke = null;

}


function undo() {

    const last =
        undoStack.pop();


    if (!last) {

        toast(
            "Nothing to undo"
        );

        return;

    }


    // Undo is not subject to cooldown.

    for (
        let i =
            last.length - 1;

        i >= 0;

        i--
    ) {

        const item =
            last[i];


        writeCell(

            item.x,
            item.y,
            item.previous

        );

    }


    scheduleSave();

    requestRender();

}


// ============================================================
// POINTER INPUT
// ============================================================

canvas.addEventListener(
    "contextmenu",
    e => e.preventDefault()
);


canvas.addEventListener(
    "pointerdown",
    event => {

        canvas.setPointerCapture(
            event.pointerId
        );


        const p =
            toCanvas(event);


        pointers.set(
            event.pointerId,
            p
        );


        if (
            pointers.size === 2
        ) {

            if (
                mode === "paint"
            ) {

                endStroke();

            }


            mode =
                "pinch";


            pinchDist =
                pointerDistance();


            requestRender();

            return;

        }


        if (
            pointers.size > 2
        ) {

            return;

        }


        const wantsPan =

            event.button === 1 ||
            event.button === 2 ||
            spaceHeld;


        if (wantsPan) {

            mode =
                "pan";


            lastPanX =
                p.x;

            lastPanY =
                p.y;


            canvas.classList.add(
                "is-panning"
            );


            return;

        }


        mode =
            "paint";


        const cell =
            toCell(
                p.x,
                p.y
            );


        lastCellX =
            cell.x;

        lastCellY =
            cell.y;


        beginStroke();


        paintCell(
            cell.x,
            cell.y,
            currentColor
        );


        requestRender();

    }
);


// ============================================================
// POINTER MOVE
// ============================================================

canvas.addEventListener(
    "pointermove",
    event => {

        const p =
            toCanvas(event);


        if (
            pointers.has(
                event.pointerId
            )
        ) {

            pointers.set(
                event.pointerId,
                p
            );

        }


        hover =
            toCell(
                p.x,
                p.y
            );


        if (
            mode === "pinch" &&
            pointers.size >= 2
        ) {

            const midpoint =
                pointerMidpoint();


            const distance =
                pointerDistance();


            if (
                pinchDist > 0 &&
                distance > 0
            ) {

                zoomAt(

                    midpoint.x,
                    midpoint.y,

                    distance /
                    pinchDist

                );

            }


            pinchDist =
                distance;


            scheduleHash();

        }


        else if (
            mode === "pan"
        ) {

            camera.x -=
                (
                    p.x -
                    lastPanX
                ) /
                camera.zoom;


            camera.y -=
                (
                    p.y -
                    lastPanY
                ) /
                camera.zoom;


            clampCamera();


            lastPanX =
                p.x;


            lastPanY =
                p.y;


            scheduleHash();

        }


        else if (
            mode === "paint"
        ) {

            if (

                hover.x !==
                    lastCellX ||

                hover.y !==
                    lastCellY

            ) {

                paintLine(

                    lastCellX,
                    lastCellY,

                    hover.x,
                    hover.y,

                    currentColor

                );


                lastCellX =
                    hover.x;


                lastCellY =
                    hover.y;

            }

        }


        updateHud();

        requestRender();

    }
);


// ============================================================
// POINTER RELEASE
// ============================================================

function releasePointer(event) {

    pointers.delete(
        event.pointerId
    );


    if (
        mode === "paint"
    ) {

        endStroke();

    }


    if (
        pointers.size === 0
    ) {

        mode = null;


        canvas.classList.remove(
            "is-panning"
        );

    }


    else if (

        mode === "pinch" &&
        pointers.size === 1

    ) {

        const only =
            pointers.values()
                .next()
                .value;


        mode =
            "pan";


        lastPanX =
            only.x;


        lastPanY =
            only.y;

    }


    requestRender();

}


canvas.addEventListener(
    "pointerup",
    releasePointer
);


canvas.addEventListener(
    "pointercancel",
    releasePointer
);


// ============================================================
// POINTER LEAVE
// ============================================================

canvas.addEventListener(
    "pointerleave",
    () => {

        if (
            mode === null
        ) {

            hover = null;

            updateHud();

            requestRender();

        }

    }
);


// ============================================================
// PINCH
// ============================================================

function pointerDistance() {

    const [
        a,
        b
    ] = [
        ...pointers.values()
    ];


    return Math.hypot(

        b.x - a.x,

        b.y - a.y

    );

}


function pointerMidpoint() {

    const [
        a,
        b
    ] = [
        ...pointers.values()
    ];


    return {

        x:
            (
                a.x +
                b.x
            ) / 2,

        y:
            (
                a.y +
                b.y
            ) / 2

    };

}


// ============================================================
// WHEEL ZOOM
// ============================================================

canvas.addEventListener(

    "wheel",

    event => {

        event.preventDefault();


        let delta =
            event.deltaY;


        if (
            event.deltaMode === 1
        ) {

            delta *= 16;

        }

        else if (
            event.deltaMode === 2
        ) {

            delta *= cssH;

        }


        const p =
            toCanvas(event);


        const factor =
            Math.exp(
                -delta * 0.0015
            );


        zoomAt(
            p.x,
            p.y,
            factor
        );


        hover =
            toCell(
                p.x,
                p.y
            );


        updateHud();

        scheduleHash();

        requestRender();

    },

    {
        passive: false
    }

);


// ============================================================
// KEYBOARD
// ============================================================

window.addEventListener(
    "keydown",
    event => {

        if (
            event.code === "Space"
        ) {

            event.preventDefault();


            if (!spaceHeld) {

                spaceHeld =
                    true;


                canvas.classList.add(
                    "is-pannable"
                );

            }


            return;

        }


        if (

            (
                event.ctrlKey ||
                event.metaKey
            ) &&

            event.key.toLowerCase()
                === "z"

        ) {

            event.preventDefault();

            undo();

            return;

        }


        // Ctrl + E = PNG export.

        if (

            (
                event.ctrlKey ||
                event.metaKey
            ) &&

            event.key.toLowerCase()
                === "e"

        ) {

            event.preventDefault();

            exportPNG();

            return;

        }


        if (
            event.ctrlKey ||
            event.metaKey ||
            event.altKey
        ) {

            return;

        }


        if (
            event.key >= "1" &&
            event.key <= "9"
        ) {

            selectColor(
                Number(event.key)
            );

        }


        else if (
            event.key === "0"
        ) {

            selectColor(0);

        }


        else if (
            event.key.toLowerCase()
                === "e"
        ) {

            selectColor(0);

        }


        else if (
            event.key.toLowerCase()
                === "g"
        ) {

            showGrid =
                !showGrid;


            toast(
                showGrid
                    ? "Grid on"
                    : "Grid off"
            );


            requestRender();

        }


        else if (
            event.key.toLowerCase()
                === "r"
        ) {

            fitBoard();

            updateHud();

            writeHash();

            requestRender();

            toast(
                "View reset"
            );

        }

    }
);


window.addEventListener(
    "keyup",
    event => {

        if (
            event.code === "Space"
        ) {

            spaceHeld =
                false;


            canvas.classList.remove(
                "is-pannable"
            );

        }

    }
);


// ============================================================
// RESIZE
// ============================================================

window.addEventListener(
    "resize",
    resize
);


// ============================================================
// SAVE WHEN LEAVING
// ============================================================

window.addEventListener(
    "visibilitychange",
    () => {

        if (
            document.visibilityState
                === "hidden"
        ) {

            clearTimeout(
                saveTimer
            );


            saveNow();

        }

    }
);


window.addEventListener(
    "pagehide",
    () => {

        clearTimeout(
            saveTimer
        );


        saveNow();

    }
);


// ============================================================
// BOOT
// ============================================================

buildPalette();

buildExportUI();

selectColor(
    currentColor
);

load();

rebuildImageData();

resize();


if (
    !readHash()
) {

    fitBoard();

    writeHash();

}


updateHud();

requestRender();

export {
    getPixel,
    requestRender,
    writeCell,
    getChunk,
    BOARD_W,
    BOARD_H,
    COLORS
};