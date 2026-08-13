import {
    writeCell,
    getChunk,
    BOARD_W,
    BOARD_H,
    requestRender,
    getPixel,
    COLORS
} from "../canvas/main.js";


function paintEvenPixel(){
    for (let x = 0; x < BOARD_W; x++){
        for(let y = 0; y < BOARD_H; y++){
            if (x % 3 === 0 && y % 3 === 0) {
                writeCell(x, y, 1); // Example color, replace with desired color
            }
            else if (x % 3 === 1 && y % 3 === 1) {
                writeCell(x, y, 6); // Example color, replace with desired color
            }
            else {
                writeCell(x, y, 17); // Example color, replace with desired color
            }
        }
    }
}
function diagonal() {
    for (let x = 0; x < BOARD_W; x++) {
        for (let y = 0; y < BOARD_H; y++) {

            const value = (x + y) % 20;

            if (value < 10) {
                writeCell(x, y, 1);
            } else {
                writeCell(x, y, 6);
            }
        }
    }
}


// paintEvenPixel();
// diagonal();




const maxIterations = 150;


// ================================
// MANDELBROT VIEW
// ================================

const scale = 0.00001;


// ================================
// MANDELBROT
// ================================

function mandelbrot() {

    for (let px = 0; px < BOARD_W; px++) {

        for (let py = 0; py < BOARD_H; py++) {

            // Convert pixel coordinate
            // into a point on the complex plane

            const cReal =
                centerReal +
                (px - BOARD_W / 2) *
                (scale / BOARD_W);

            const cImaginary =
                centerImaginary +
                (py - BOARD_H / 2) *
                (scale / BOARD_H);


            let zReal = 0;
            let zImaginary = 0;

            let iteration = 0;


            while (
                zReal * zReal +
                zImaginary * zImaginary <= 4 &&
                iteration < maxIterations
            ) {

                const nextReal =
                    zReal * zReal -
                    zImaginary * zImaginary +
                    cReal;

                const nextImaginary =
                    2 * zReal * zImaginary +
                    cImaginary;


                zReal = nextReal;
                zImaginary = nextImaginary;

                iteration++;
            }


            let color;


            if (iteration === maxIterations) {

                color = 0;

            } else {

                color =
                    1 +
                    (iteration %
                    (COLORS.length - 1));

            }


            writeCell(
                px,
                py,
                color
            );

        }
    }


    requestRender();
}


mandelbrot();