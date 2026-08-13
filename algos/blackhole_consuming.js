import {
    writeCell,
    BOARD_W,
    BOARD_H,
    requestRender,
    COLORS
} from "../canvas/main.js";


// ============================================================
// BLACK HOLE
// ============================================================

const PARTICLES = 18000;

const BLACK_HOLE_X = BOARD_W * 0.5;
const BLACK_HOLE_Y = BOARD_H * 0.5;

const EVENT_HORIZON = BOARD_W * 0.075;

const GRAVITY = 1.8;

const PARTICLE_SPEED = 2.5;

const TRAIL = 5;


// ============================================================
// PARTICLES
// ============================================================

const px = new Float32Array(PARTICLES);
const py = new Float32Array(PARTICLES);

const vx = new Float32Array(PARTICLES);
const vy = new Float32Array(PARTICLES);

const alive = new Uint8Array(PARTICLES);


// ============================================================
// RANDOM RAY
// ============================================================

function spawn(i) {

    const side =
        Math.floor(Math.random() * 4);

    if (side === 0) {

        px[i] = Math.random() * BOARD_W;
        py[i] = 0;

        vx[i] = 0;
        vy[i] = PARTICLE_SPEED;

    }

    else if (side === 1) {

        px[i] = BOARD_W - 1;
        py[i] = Math.random() * BOARD_H;

        vx[i] = -PARTICLE_SPEED;
        vy[i] = 0;

    }

    else if (side === 2) {

        px[i] = Math.random() * BOARD_W;
        py[i] = BOARD_H - 1;

        vx[i] = 0;
        vy[i] = -PARTICLE_SPEED;

    }

    else {

        px[i] = 0;
        py[i] = Math.random() * BOARD_H;

        vx[i] = PARTICLE_SPEED;
        vy[i] = 0;

    }

    // Give every ray a tiny random deviation

    vx[i] +=
        (Math.random() - 0.5) * 0.7;

    vy[i] +=
        (Math.random() - 0.5) * 0.7;

    alive[i] = 1;
}


// ============================================================
// INITIALISE
// ============================================================

for (let i = 0; i < PARTICLES; i++) {

    spawn(i);

}


// ============================================================
// PAINT
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
// CLEAR
// ============================================================

for (let x = 0; x < BOARD_W; x++) {

    for (let y = 0; y < BOARD_H; y++) {

        writeCell(
            x,
            y,
            0
        );

    }

}


// ============================================================
// SIMULATION
// ============================================================

function simulate() {

    for (
        let i = 0;
        i < PARTICLES;
        i++
    ) {

        if (!alive[i]) {

            spawn(i);

        }


        let x = px[i];
        let y = py[i];

        let dx =
            BLACK_HOLE_X - x;

        let dy =
            BLACK_HOLE_Y - y;


        const distanceSquared =
            dx * dx +
            dy * dy;

        const distance =
            Math.sqrt(
                distanceSquared
            );


        // ====================================================
        // EVENT HORIZON
        // ====================================================

        if (
            distance <
            EVENT_HORIZON
        ) {

            alive[i] = 0;

            continue;

        }


        // ====================================================
        // GRAVITY
        // ====================================================

        // Direction toward the black hole

        const nx =
            dx / distance;

        const ny =
            dy / distance;


        // Gravity becomes dramatically stronger
        // near the black hole.

        const gravity =
            GRAVITY *
            (
                1 /
                Math.max(
                    distance * 0.01,
                    1
                )
            );


        vx[i] +=
            nx *
            gravity;

        vy[i] +=
            ny *
            gravity;


        // ====================================================
        // LIMIT SPEED
        // ====================================================

        const speed =
            Math.sqrt(
                vx[i] * vx[i] +
                vy[i] * vy[i]
            );


        const maxSpeed = 12;


        if (
            speed >
            maxSpeed
        ) {

            vx[i] =
                vx[i] /
                speed *
                maxSpeed;

            vy[i] =
                vy[i] /
                speed *
                maxSpeed;

        }


        // ====================================================
        // MOVE
        // ====================================================

        x += vx[i];
        y += vy[i];


        // ====================================================
        // COLOUR
        // ====================================================

        const colour =
            1 +
            (
                i +
                Math.floor(
                    distance * 0.1
                )
            ) %
            (
                COLORS.length - 1
            );


        // ====================================================
        // RAY
        // ====================================================

        paint(
            x,
            y,
            colour
        );


        // ====================================================
        // TRAIL
        // ====================================================

        for (
            let t = 1;
            t <= TRAIL;
            t++
        ) {

            paint(
                x - vx[i] * t,
                y - vy[i] * t,
                colour
            );

        }


        // ====================================================
        // SAVE
        // ====================================================

        px[i] = x;
        py[i] = y;


        // ====================================================
        // LEFT SCREEN
        // ====================================================

        if (
            x < -50 ||
            x > BOARD_W + 50 ||
            y < -50 ||
            y > BOARD_H + 50
        ) {

            alive[i] = 0;

        }

    }


    // ========================================================
    // BLACK HOLE
    // ========================================================

    const holeRadius =
        EVENT_HORIZON;


    for (
        let x = BLACK_HOLE_X - holeRadius;
        x <= BLACK_HOLE_X + holeRadius;
        x++
    ) {

        for (
            let y = BLACK_HOLE_Y - holeRadius;
            y <= BLACK_HOLE_Y + holeRadius;
            y++
        ) {

            const dx =
                x - BLACK_HOLE_X;

            const dy =
                y - BLACK_HOLE_Y;

            if (
                dx * dx +
                dy * dy <=
                holeRadius *
                holeRadius
            ) {

                paint(
                    x,
                    y,
                    28
                );

            }

        }

    }


    // ========================================================
    // ACCRETION RING
    // ========================================================

    const ringRadius =
        EVENT_HORIZON * 1.8;


    for (
        let a = 0;
        a < Math.PI * 2;
        a += 0.002
    ) {

        const wobble =
            Math.sin(
                a * 7
            ) * 5;

        const r =
            ringRadius +
            wobble;


        const x =
            BLACK_HOLE_X +
            Math.cos(a) *
            r;

        const y =
            BLACK_HOLE_Y +
            Math.sin(a) *
            r *
            0.42;


        const colour =
            1 +
            Math.floor(
                a * 10
            ) %
            (
                COLORS.length - 1
            );


        paint(
            x,
            y,
            colour
        );

    }


    requestRender();

    requestAnimationFrame(
        simulate
    );

}


simulate();

console.log(
    "BLACK HOLE SIMULATION ACTIVE"
);