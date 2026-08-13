import {
    writeCell,
    BOARD_W,
    BOARD_H,
    requestRender,
    COLORS
} from "../canvas/main.js";


// ============================================================
// MANDELBROT
// ============================================================

const MAX_ITERATIONS = 250;


// Current centre of the mathematical view.

let centerReal = -0.5;
let centerImaginary = 0;


// Width of the complex plane currently visible.

let viewWidth = 3.0;


// How much each scroll zooms.

const ZOOM_FACTOR = 0.7;


// ============================================================
// RENDER MANDELBROT
// ============================================================

function renderMandelbrot() {

    const aspect =
        BOARD_H / BOARD_W;

    const viewHeight =
        viewWidth * aspect;


    const minReal =
        centerReal -
        viewWidth / 2;

    const minImaginary =
        centerImaginary -
        viewHeight / 2;


    for (
        let px = 0;
        px < BOARD_W;
        px++
    ) {

        for (
            let py = 0;
            py < BOARD_H;
            py++
        ) {

            // Pixel -> complex number

            const real =
                minReal +
                (
                    px / (BOARD_W - 1)
                ) *
                viewWidth;


            const imaginary =
                minImaginary +
                (
                    py / (BOARD_H - 1)
                ) *
                viewHeight;


            let zReal = 0;
            let zImaginary = 0;

            let iteration = 0;


            // z = z² + c

            while (
                zReal * zReal +
                zImaginary * zImaginary <= 4 &&
                iteration < MAX_ITERATIONS
            ) {

                const nextReal =
                    zReal * zReal -
                    zImaginary * zImaginary +
                    real;


                const nextImaginary =
                    2 *
                    zReal *
                    zImaginary +
                    imaginary;


                zReal =
                    nextReal;

                zImaginary =
                    nextImaginary;

                iteration++;

            }


            let color;


            if (
                iteration ===
                MAX_ITERATIONS
            ) {

                color = 0;

            } else {

                color =
                    1 +
                    (
                        iteration %
                        (COLORS.length - 1)
                    );

            }


            writeCell(
                px,
                py,
                color
            );

        }

    }


    requestRender();


    console.log(
        "Rendered. View width:",
        viewWidth
    );
}


// ============================================================
// SCREEN -> COMPLEX PLANE
// ============================================================
//
// This is the important bridge.
//
// The browser gives us a mouse position.
// We convert that position into a point
// on the Mandelbrot's complex plane.
// ============================================================

function screenToComplex(
    screenX,
    screenY
) {

    const aspect =
        BOARD_H / BOARD_W;

    const viewHeight =
        viewWidth * aspect;


    const real =
        centerReal +
        (
            screenX /
            BOARD_W -
            0.5
        ) *
        viewWidth;


    const imaginary =
        centerImaginary +
        (
            screenY /
            BOARD_H -
            0.5
        ) *
        viewHeight;


    return {
        real,
        imaginary
    };

}


// ============================================================
// ZOOM AT A POINT
// ============================================================

function zoomAt(
    screenX,
    screenY,
    factor
) {

    // First find what mathematical point
    // the mouse is currently pointing at.

    const before =
        screenToComplex(
            screenX,
            screenY
        );


    // Change the size of the mathematical view.

    viewWidth *= factor;


    // Find where that SAME screen pixel
    // would point after zooming.

    const after =
        screenToComplex(
            screenX,
            screenY
        );


    // Move the centre so that the mathematical
    // point under the mouse stays under the mouse.

    centerReal +=
        before.real -
        after.real;


    centerImaginary +=
        before.imaginary -
        after.imaginary;


    renderMandelbrot();

}


// ============================================================
// MOUSE WHEEL
// ============================================================

window.addEventListener(
    "wheel",
    event => {

        if (
            event.deltaY === 0
        ) {
            return;
        }


        const rect =
            document
                .getElementById("viewport")
                .getBoundingClientRect();


        const x =
            event.clientX -
            rect.left;


        const y =
            event.clientY -
            rect.top;


        if (
            event.deltaY < 0
        ) {

            // Scroll up = zoom in

            zoomAt(
                x,
                y,
                ZOOM_FACTOR
            );

        } else {

            // Scroll down = zoom out

            zoomAt(
                x,
                y,
                1 / ZOOM_FACTOR
            );

        }

    },
    {
        passive: true
    }
);


// ============================================================
// START
// ============================================================

renderMandelbrot();