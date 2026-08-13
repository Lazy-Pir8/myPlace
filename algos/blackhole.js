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

const PARTICLES = 14000;

const TIME_SPEED = 0.018;

const BACKGROUND = 28;


// Black hole size

const HORIZON =
    Math.min(BOARD_W, BOARD_H) * 0.075;


// ============================================================
// PARTICLES
// ============================================================

const px = new Float32Array(PARTICLES);
const py = new Float32Array(PARTICLES);

const vx = new Float32Array(PARTICLES);
const vy = new Float32Array(PARTICLES);


// ============================================================
// INITIALISE
// ============================================================

for (let i = 0; i < PARTICLES; i++) {

    spawnParticle(i);

}


// ============================================================
// SPAWN
// ============================================================

function spawnParticle(i) {

    const angle =
        Math.random() *
        Math.PI *
        2;


    const radius =
        HORIZON * 2 +
        Math.random() *
        Math.min(
            BOARD_W,
            BOARD_H
        ) *
        0.47;


    px[i] =
        BOARD_W / 2 +
        Math.cos(angle) *
        radius;


    py[i] =
        BOARD_H / 2 +
        Math.sin(angle) *
        radius;


    // Give the particle an initial
    // orbital velocity.

    const orbitalSpeed =
        Math.sqrt(
            5000 / radius
        );


    vx[i] =
        -Math.sin(angle) *
        orbitalSpeed;


    vy[i] =
        Math.cos(angle) *
        orbitalSpeed;

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
// PAINT
// ============================================================

function paint(x, y, colour) {

    x = Math.floor(x);
    y = Math.floor(y);


    if (
        x < 0 ||
        x >= BOARD_W ||
        y < 0 ||
        y >= BOARD_H
    ) {
        return;
    }


    writeCell(
        x,
        y,
        colour
    );

}


// ============================================================
// BLACK HOLE FIELD
// ============================================================

function gravity(x, y, time) {

    const cx =
        BOARD_W / 2;

    const cy =
        BOARD_H / 2;


    const dx =
        cx - x;

    const dy =
        cy - y;


    const distance =
        Math.sqrt(
            dx * dx +
            dy * dy
        );


    // ========================================================
    // GRAVITY
    // ========================================================

    const gravityStrength =
        9000 /
        (
            distance *
            distance +
            100
        );


    let forceX =
        dx /
        distance *
        gravityStrength;


    let forceY =
        dy /
        distance *
        gravityStrength;


    // ========================================================
    // FRAME DRAGGING
    // ========================================================
    //
    // Space itself rotates around the black hole.
    //
    // ========================================================

    const frameDrag =
        3000 /
        (
            distance *
            distance +
            500
        );


    forceX +=
        -dy /
        distance *
        frameDrag;


    forceY +=
        dx /
        distance *
        frameDrag;


    // ========================================================
    // WAVES IN THE ACCRETION DISK
    // ========================================================

    const angle =
        Math.atan2(
            y - cy,
            x - cx
        );


    const wave =
        Math.sin(
            angle * 8 +
            distance * 0.025 -
            time * 4
        );


    forceX +=
        -dy /
        distance *
        wave *
        0.8;


    forceY +=
        dx /
        distance *
        wave *
        0.8;


    return {
        x: forceX,
        y: forceY,
        distance
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

        const field =
            gravity(
                x,
                y,
                time
            );


        const distance =
            field.distance;


        // ----------------------------------------------------
        // SWALLOW PARTICLE
        // ----------------------------------------------------

        if (
            distance <
            HORIZON
        ) {

            spawnParticle(i);

            continue;

        }


        // ----------------------------------------------------
        // ACCELERATION
        // ----------------------------------------------------

        vx[i] +=
            field.x *
            0.055;


        vy[i] +=
            field.y *
            0.055;


        // ----------------------------------------------------
        // DAMPING
        // ----------------------------------------------------

        vx[i] *= 0.992;

        vy[i] *= 0.992;


        // ----------------------------------------------------
        // MOVE
        // ----------------------------------------------------

        x += vx[i];

        y += vy[i];


        // ----------------------------------------------------
        // ESCAPE
        // ----------------------------------------------------

        if (
            x < -100 ||
            x > BOARD_W + 100 ||
            y < -100 ||
            y > BOARD_H + 100
        ) {

            spawnParticle(i);

            continue;

        }


        // ----------------------------------------------------
        // SPEED
        // ----------------------------------------------------

        const speed =
            Math.sqrt(
                vx[i] * vx[i] +
                vy[i] * vy[i]
            );


        // ----------------------------------------------------
        // ACCRETION DISK COLOUR
        // ----------------------------------------------------

        const normalizedDistance =
            Math.min(
                distance /
                (
                    Math.min(
                        BOARD_W,
                        BOARD_H
                    ) * 0.5
                ),
                1
            );


        const colour =
            1 +
            (
                Math.floor(
                    speed * 12 +
                    normalizedDistance * 30 +
                    time * 3
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
        // TRAILS
        // ----------------------------------------------------

        if (
            i % 2 === 0
        ) {

            paint(
                x - vx[i] * 3,
                y - vy[i] * 3,
                colour
            );

        }


        if (
            i % 8 === 0
        ) {

            paint(
                x - vx[i] * 8,
                y - vy[i] * 8,
                colour
            );

        }


        // ----------------------------------------------------
        // SAVE
        // ----------------------------------------------------

        px[i] = x;

        py[i] = y;

    }


    // ========================================================
    // EVENT HORIZON
    // ========================================================

    const cx =
        BOARD_W / 2;

    const cy =
        BOARD_H / 2;


    // Draw a very dark circular region.

    const horizonRadius =
        HORIZON;


    for (
        let a = 0;
        a < Math.PI * 2;
        a += 0.01
    ) {

        const x =
            cx +
            Math.cos(a) *
            horizonRadius;


        const y =
            cy +
            Math.sin(a) *
            horizonRadius;


        paint(
            x,
            y,
            BACKGROUND
        );

    }


    // ========================================================
    // CENTRAL BLACK CORE
    // ========================================================

    for (
        let a = 0;
        a < Math.PI * 2;
        a += 0.01
    ) {

        for (
            let r = 0;
            r < HORIZON;
            r += 2
        ) {

            paint(
                cx +
                Math.cos(a) * r,

                cy +
                Math.sin(a) * r,

                BACKGROUND
            );

        }

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
    "BLACK HOLE SIMULATION ACTIVE"
);