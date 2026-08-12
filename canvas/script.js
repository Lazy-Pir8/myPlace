var canvas = document.getElementById("viewport");
var ctx = canvas.getContext("2d");

var width = canvas.width;
var height = canvas.height;

const pixelSize = 10;

let camera = {
    x: 0,
    y: 0,
    zoom: 1
};

let isDragging = false;
let moved = false;

let lastMouseX = 0;
let lastMouseY = 0;

const CHUNK_SIZE = 32;
const chunks = {};

const colors = {
    0: { r: 255, g: 255, b: 255, a: 255 }, // white
    1: { r: 255, g: 0, b: 0, a: 255 },     // red
    2: { r: 0, g: 255, b: 0, a: 255 },     // green
    3: { r: 0, g: 0, b: 255, a: 255 },     // blue
    4: { r: 255, g: 255, b: 0, a: 255 },   // yellow
    5: { r: 0, g: 255, b: 255, a: 255 },   // cyan
    6: { r: 255, g: 0, b: 255, a: 255 },   // magenta
    7: { r: 0, g: 0, b: 0, a: 255 },       // black
    8: { r: 128, g: 128, b: 128, a: 255 },
    9: { r: 128, g: 0, b: 0, a: 255 },
    10: { r: 0, g: 128, b: 0, a: 255 },
    11: { r: 0, g: 0, b: 128, a: 255 },
    12: { r: 128, g: 128, b: 0, a: 255 },
    13: { r: 0, g: 128, b: 128, a: 255 },
    14: { r: 128, g: 0, b: 128, a: 255 },
    15: { r: 192, g: 192, b: 192, a: 255 },
    16: { r: 255, g: 165, b: 0, a: 255 },
    17: { r: 255, g: 192, b: 203, a: 255 },
    18: { r: 165, g: 42, b: 42, a: 255 },
    19: { r: 0, g: 100, b: 0, a: 255 },
    20: { r: 0, g: 0, b: 139, a: 255 },

};

const palette = document.getElementById("palette");

let currentColor = 1;

function createChunk() {

    let chunk = [];

    for (let y = 0; y < CHUNK_SIZE; y++) {

        chunk[y] = [];

        for (let x = 0; x < CHUNK_SIZE; x++) {

            chunk[y][x] = 0;
        }
    }

    return chunk;
}

function getChunk(chunkX, chunkY) {

    const key = `${chunkX},${chunkY}`;

    return chunks[key];
}

function getOrCreateChunk(chunkX, chunkY) {

    const key = `${chunkX},${chunkY}`;

    if (!chunks[key]) {

        chunks[key] = createChunk();
    }

    return chunks[key];
}


function getPixel(gridX, gridY) {

    const chunkX =
        Math.floor(gridX / CHUNK_SIZE);

    const chunkY =
        Math.floor(gridY / CHUNK_SIZE);

    const localX =
        gridX - chunkX * CHUNK_SIZE;

    const localY =
        gridY - chunkY * CHUNK_SIZE;

    const chunk =
        getChunk(chunkX, chunkY);

    if (!chunk) {

        return 0;
    }

    return chunk[localY][localX];
}

function setPixel(gridX, gridY, colorID) {

    const chunkX =
        Math.floor(gridX / CHUNK_SIZE);

    const chunkY =
        Math.floor(gridY / CHUNK_SIZE);


    const localX =
        gridX - chunkX * CHUNK_SIZE;

    const localY =
        gridY - chunkY * CHUNK_SIZE;


    const chunk =
        getOrCreateChunk(chunkX, chunkY);


    chunk[localY][localX] = colorID;


    saveChunks();
}

function saveChunks() {

    localStorage.setItem(
        "myChunks",
        JSON.stringify(chunks)
    );
}


function loadChunks() {

    const saved =
        localStorage.getItem("myChunks");


    if (!saved) {
        return;
    }


    const loaded =
        JSON.parse(saved);


    Object.assign(
        chunks,
        loaded
    );
}



Object.entries(colors).forEach(
    ([id, color]) => {

        const box =
            document.createElement("div");


        box.style.width = "30px";
        box.style.height = "30px";


        box.style.backgroundColor =
            `rgb(
                ${color.r},
                ${color.g},
                ${color.b}
            )`;


        box.addEventListener(
            "click",
            () => {

                currentColor =
                    Number(id);
            }
        );


        palette.appendChild(box);
    }
);


// ==========================
// DRAW PIXEL
// ==========================

function drawPixel(gridX, gridY, colorID) {

    const color =
        colors[colorID];


    const size =
        pixelSize * camera.zoom;


    const worldX =
        gridX * pixelSize;


    const worldY =
        gridY * pixelSize;


    const screenX =
        (worldX - camera.x)
        * camera.zoom;


    const screenY =
        (worldY - camera.y)
        * camera.zoom;


    ctx.fillStyle =
        `rgba(
            ${color.r},
            ${color.g},
            ${color.b},
            ${color.a / 255}
        )`;


    ctx.fillRect(
        screenX,
        screenY,
        size,
        size
    );
}

function renderBoard() {

    ctx.clearRect(
        0,
        0,
        width,
        height
    );


    const startGridX =
        Math.floor(
            camera.x / pixelSize
        ) - 1;


    const startGridY =
        Math.floor(
            camera.y / pixelSize
        ) - 1;


    const visibleWorldWidth =
        width / camera.zoom;


    const visibleWorldHeight =
        height / camera.zoom;


    const endGridX =
        Math.ceil(
            (camera.x + visibleWorldWidth)
            / pixelSize
        ) + 1;


    const endGridY =
        Math.ceil(
            (camera.y + visibleWorldHeight)
            / pixelSize
        ) + 1;


    for (
        let y = startGridY;
        y <= endGridY;
        y++
    ) {

        for (
            let x = startGridX;
            x <= endGridX;
            x++
        ) {

            const colorID =
                getPixel(x, y);


            drawPixel(
                x,
                y,
                colorID
            );
        }
    }
}


function drawGrid() {

    ctx.strokeStyle = "grey";
    ctx.lineWidth = 1;


    const size =
        pixelSize * camera.zoom;


    const startX =
        ((-camera.x * camera.zoom) % size + size)
        % size;


    const startY =
        ((-camera.y * camera.zoom) % size + size)
        % size;


    for (
        let x = startX;
        x <= width;
        x += size
    ) {

        ctx.beginPath();

        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);

        ctx.stroke();
    }


    for (
        let y = startY;
        y <= height;
        y += size
    ) {

        ctx.beginPath();

        ctx.moveTo(0, y);
        ctx.lineTo(width, y);

        ctx.stroke();
    }
}



function render() {

    renderBoard();

    // drawGrid();
}



canvas.addEventListener(
    "mousedown",
    function (event) {

        isDragging = true;

        moved = false;

        lastMouseX =
            event.clientX;

        lastMouseY =
            event.clientY;
    }
);


canvas.addEventListener(
    "mousemove",
    function (event) {

        if (!isDragging) {
            return;
        }


        const dx =
            event.clientX -
            lastMouseX;


        const dy =
            event.clientY -
            lastMouseY;


        if (
            Math.abs(dx) > 2 ||
            Math.abs(dy) > 2
        ) {

            moved = true;
        }


        camera.x -=
            dx / camera.zoom;


        camera.y -=
            dy / camera.zoom;


        lastMouseX =
            event.clientX;


        lastMouseY =
            event.clientY;


        render();
    }
);


canvas.addEventListener(
    "mouseup",
    function () {

        isDragging = false;
    }
);


canvas.addEventListener(
    "mouseleave",
    function () {

        isDragging = false;
    }
);


canvas.addEventListener(
    "wheel",
    function (event) {

        event.preventDefault();


        const rect =
            canvas.getBoundingClientRect();


        const mouseX =
            event.clientX - rect.left;


        const mouseY =
            event.clientY - rect.top;


        // World position under mouse
        // before zoom

        const worldX =
            mouseX / camera.zoom +
            camera.x;


        const worldY =
            mouseY / camera.zoom +
            camera.y;


        const zoomAmount =
            event.deltaY < 0
                ? 1.1
                : 0.9;


        camera.zoom *= zoomAmount;


        // Sensible zoom limits

        camera.zoom =
            Math.max(
                0.5,
                Math.min(
                    5,
                    camera.zoom
                )
            );


        // Keep the pixel
        // under the mouse
        // under the mouse

        camera.x =
            worldX -
            mouseX / camera.zoom;


        camera.y =
            worldY -
            mouseY / camera.zoom;


        render();
    }
);


canvas.addEventListener(
    "click",
    function (event) {

        // If the mouse was used
        // for dragging, don't paint.

        if (moved) {

            moved = false;

            return;
        }


        const rect =
            canvas.getBoundingClientRect();


        const screenX =
            event.clientX -
            rect.left;


        const screenY =
            event.clientY -
            rect.top;


        const worldX =
            screenX / camera.zoom +
            camera.x;


        const worldY =
            screenY / camera.zoom +
            camera.y;


        const gridX =
            Math.floor(
                worldX / pixelSize
            );


        const gridY =
            Math.floor(
                worldY / pixelSize
            );


        setPixel(
            gridX,
            gridY,
            currentColor
        );


        render();
    }
);


loadChunks();

render();