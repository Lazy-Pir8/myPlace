import {
    writeCell,
    BOARD_W,
    BOARD_H,
    requestRender,
    COLORS
} from "../canvas/main.js";


// ============================================================
// MYSTERIOUS ORBITAL ORGANISM
// ============================================================

const PARTICLES = 10000;

const ATTRACTORS = 7;

const TIME_SPEED = 0.012;

const TRAIL = 3;

const BACKGROUND = 28;


// ============================================================
// PARTICLES
// ============================================================

const px = new Float32Array(PARTICLES);
const py = new Float32Array(PARTICLES);

const vx = new Float32Array(PARTICLES);
const vy = new Float32Array(PARTICLES);


// ============================================================
// INITIAL PARTICLES
// ============================================================

for (let i = 0; i < PARTICLES; i++) {

    const angle =
        Math.random() * Math.PI * 2;

    const radius =
        Math.sqrt(Math.random()) *
        Math.min(BOARD_W, BOARD_H) *
        0.48;

    px[i] =
        BOARD_W / 2 +
        Math.cos(angle) * radius;

    py[i] =
        BOARD_H / 2 +
        Math.sin(angle) * radius;

    vx[i] =
        (Math.random() - 0.5) * 0.5;

    vy[i] =
        (Math.random() - 0.5) * 0.5;

}


// ============================================================
// CLEAR
// ============================================================

for (let x = 0; x < BOARD_W; x++) {

    for (let y = 0; y < BOARD_H; y++) {

        writeCell(
            x,
            y,
            BACKGROUND
        );

    }

}


// ============================================================
// DRAW
// ============================================================

function paint(x, y, colour) {

    x = Math.floor(x);
    y = Math.floor(y);

    if (
        x >= 0 &&
        x < BOARD_W &&
        y >= 0 &&
        y < BOARD_H
    ) {

        writeCell(
            x,
            y,
            colour
        );

    }

}


// ============================================================
// MOVING ATTRACTORS
// ============================================================

function getAttractor(i, time) {

    const a =
        time * (
            0.15 +
            i * 0.037
        );

    const cx =
        BOARD_W / 2;

    const cy =
        BOARD_H / 2;

    const radius =
        Math.min(BOARD_W, BOARD_H) *
        (
            0.12 +
            i * 0.045
        );


    let x =
        cx +
        Math.cos(
            a * (1.0 + i * 0.17)
        ) *
        radius;

    let y =
        cy +
        Math.sin(
            a * (1.3 + i * 0.11)
        ) *
        radius;


    // Slowly distort their positions

    x +=
        Math.sin(
            time * 0.7 +
            i * 2
        ) *
        100;

    y +=
        Math.cos(
            time * 0.53 +
            i * 3
        ) *
        100;


    return {
        x,
        y
    };

}


// ============================================================
// FIELD
// ============================================================

function calculateField(x, y, time) {

    let forceX = 0;
    let forceY = 0;


    for (let a = 0; a < ATTRACTORS; a++) {

        const attractor =
            getAttractor(
                a,
                time
            );


        const dx =
            attractor.x - x;

        const dy =
            attractor.y - y;


        const distanceSquared =
            dx * dx +
            dy * dy +
            100;


        const distance =
            Math.sqrt(
                distanceSquared
            );


        // Gravitational pull

        const gravity =
            9000 /
            distanceSquared;


        forceX +=
            dx / distance *
            gravity;

        forceY +=
            dy / distance *
            gravity;


        // Rotational force

        const swirl =
            3500 /
            distanceSquared;


        forceX +=
            -dy / distance *
            swirl;

        forceY +=
            dx / distance *
            swirl;

    }


    // ========================================================
    // GLOBAL MATHEMATICAL DISTORTION
    // ========================================================

    const nx =
        x * 0.008;

    const ny =
        y * 0.008;


    forceX +=
        Math.sin(
            ny * 3 +
            time
        ) *
        0.45;

    forceY +=
        Math.cos(
            nx * 3 -
            time * 1.2
        ) *
        0.45;


    // Interference waves

    forceX +=
        Math.sin(
            nx * 8 +
            Math.sin(ny * 4) +
            time
        ) *
        0.25;

    forceY +=
        Math.cos(
            ny * 7 +
            Math.sin(nx * 5) -
            time
        ) *
        0.25;


    return {
        x: forceX,
        y: forceY
    };

}


// ============================================================
// TIME
// ============================================================

let time = 0;


// ============================================================
// SIMULATION
// ============================================================

function simulate() {

    time += TIME_SPEED;


    for (
        let i = 0;
        i < PARTICLES;
        i++
    ) {

        let x =
            px[i];

        let y =
            py[i];


        // ----------------------------------------------------
        // FIELD
        // ----------------------------------------------------

        const force =
            calculateField(
                x,
                y,
                time
            );


        // ----------------------------------------------------
        // ACCELERATION
        // ----------------------------------------------------

        vx[i] +=
            force.x * 0.045;

        vy[i] +=
            force.y * 0.045;


        // ----------------------------------------------------
        // DAMPING
        // ----------------------------------------------------

        vx[i] *= 0.965;

        vy[i] *= 0.965;


        // ----------------------------------------------------
        // LIMIT VELOCITY
        // ----------------------------------------------------

        const speed =
            Math.sqrt(
                vx[i] * vx[i] +
                vy[i] * vy[i]
            );


        if (speed > 8) {

            vx[i] =
                vx[i] / speed * 8;

            vy[i] =
                vy[i] / speed * 8;

        }


        // ----------------------------------------------------
        // MOVE
        // ----------------------------------------------------

        x += vx[i];

        y += vy[i];


        // ----------------------------------------------------
        // WRAP
        // ----------------------------------------------------

        if (x < 0) {
            x += BOARD_W;
        }

        if (x >= BOARD_W) {
            x -= BOARD_W;
        }

        if (y < 0) {
            y += BOARD_H;
        }

        if (y >= BOARD_H) {
            y -= BOARD_H;
        }


        // ----------------------------------------------------
        // COLOUR
        // ----------------------------------------------------

        const colour =
            1 +
            (
                Math.floor(
                    (
                        speed * 8 +
                        time * 2 +
                        i * 0.003
                    )
                )
                %
                (COLORS.length - 1)
            );


        // ----------------------------------------------------
        // PARTICLE
        // ----------------------------------------------------

        paint(
            x,
            y,
            colour
        );


        // ----------------------------------------------------
        // TRAIL
        // ----------------------------------------------------

        if (i % 2 === 0) {

            paint(
                x - vx[i] * TRAIL,
                y - vy[i] * TRAIL,
                colour
            );

        }


        if (i % 9 === 0) {

            paint(
                x - vx[i] * 7,
                y - vy[i] * 7,
                colour
            );

        }


        // ----------------------------------------------------
        // SAVE
        // ----------------------------------------------------

        px[i] = x;
        py[i] = y;

    }


    requestRender();

    requestAnimationFrame(
        simulate
    );

}


// ============================================================
// START
// ============================================================

simulate();

console.log(
    "THE ORGANISM HAS AWAKENED"
);