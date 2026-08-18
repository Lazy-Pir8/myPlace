// import the functions needed to render the board and write cells to the canvas
import {
    writeCell,
    BOARD_W,
    BOARD_H,
    requestRender,
    COLORS,
    getPixel,
    
} from "../canvas/main.js";

// defining the constants and the only two states of the cells
const DEAD = 0;
const ALIVE = 1;

// The colour on the r/place board which should be treated as an alive cell.
// Change this to whatever colour you want Game of Life to recognise.
const ALIVE_COLOR = 1;

let number_ALIVE = 0;

// Using these array to store the current state of the board and the next state of the board, so that we can calculate the next generation without affecting the current generation.
// Why Uint8Array? Because it is a typed array that can store 8-bit unsigned integers, which is perfect for our use case since we only have two states (0 and 1). It also has a fixed size, which is good for performance and memory usage.
let lifeCurrent = new Uint8Array(BOARD_W * BOARD_H);
let lifeNext = new Uint8Array(BOARD_W * BOARD_H);

// Storing the state of each cell into array
// How to convert the whole canvas as per the arrays now?
// need to loop through every cell and store, that seems the only way
for (let y = 0; y < BOARD_H; y++) {
    for (let x = 0; x < BOARD_W; x++) {

        const index = y * BOARD_W + x;

        if (getPixel(x, y) === ALIVE_COLOR) {
            lifeCurrent[index] = ALIVE;
        } else {
            lifeCurrent[index] = DEAD;
        }

    }
}

// need to loop through the board and any cell has 8 neighbors, so need to define the rules, to make it alive/dead 
// based on number of neighbors.




//writing a function to simulate game of life, so loop thoruhg all the (2k,2l) cells, and then loop through their 
// 8 neighbors, check the rules and color pixels accordingly. 

// I want to make generations, so I should not directly write to the canvas, instead go over all the cells, check whether
// they should be alive or dead, based on the current state, once I do this for the whole canvas, I can write to canvas a single time
// this will create generations and also save memory cause I am not writing for every cell.
// so i need to store the new state somewhere else. I have a offcampus in my main file, maybe I can make changes to it, cause the render
// of main canvas happens through it.
// I guess I can instead of canvas just create new arrays. So Two Arrays, one for current state, one for next state.
// once I move on to next generation, the next one becomes current and then I calculate next array again.
// and I guess changing just evenxeveny pixel won't give me a good enough representation of this game, lets loop across all pixels.
function simulate(){

    // Clear the next generation before using it again.
    lifeNext.fill(DEAD);

    for(let i = 0; i < BOARD_W; i++){

        for(let j = 0; j < BOARD_H; j++){

            // Boundary cells are currently skipped because they do not have
            // a complete set of 8 neighbours.
            if(i-1 < 0 || j-1 < 0 || i+1 >= BOARD_W || j+1 >= BOARD_H){

                continue;

            }

            for(let x = i-1; x <= i+1; x++){

                for(let y = j-1; y <= j+1; y++){

                    if(x === i && y === j){

                        continue;

                    }

                    // Convert the neighbour's x,y coordinate into
                    // its position inside the one-dimensional array.
                    const neighbourIndex =
                        y * BOARD_W + x;

                    if(lifeCurrent[neighbourIndex] === ALIVE){

                        number_ALIVE++;

                    }

                }

            }

            // Index of the current cell.
            const index =
                j * BOARD_W + i;


            if (lifeCurrent[index] === ALIVE){

                if(number_ALIVE < 2 || number_ALIVE > 3){

                    lifeNext[index] = DEAD;

                }else{

                    lifeNext[index] = ALIVE;

                }

            }else{

                if(number_ALIVE === 3 ){

                    lifeNext[index] = ALIVE;

                }else{

                    lifeNext[index] = DEAD;

                }

            }

            number_ALIVE = 0;

            // Now How to render it on canvas, convert actual cells to actual pixels, can I do something else instead of
            // writeCell in the loop of 2048x2048, what if I directyl convert the whole canvas, like offcampus thing does in
            // main.js how does it even work.


        }
    }


    
    
    // The next generation becomes the current generation.
    // The old current array is reused as the next array.
    const temp = lifeCurrent;
    
    lifeCurrent = lifeNext;
    
    lifeNext = temp;
    
    // Render the newly calculated generation.
    renderLife();
}


// ============================================================
// RENDER LIFE
// ============================================================
//
// Converts the Life state into actual pixel colours.
//
// lifeCurrent contains:
//
// 0 = DEAD
// 1 = ALIVE
//
// imgData contains:
//
// R G B A
// R G B A
// R G B A
// ...

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


function renderLife(){

    for(let y = 0; y < BOARD_H; y++){

        for(let x = 0; x < BOARD_W; x++){

            const index =
                y * BOARD_W + x;


            if(lifeCurrent[index] === ALIVE){

                writeCell(
                    x,
                    y,
                    ALIVE_COLOR
                );

            }else{

                writeCell(
                    x,
                    y,
                    DEAD
                );

            }

        }

    }

    requestRender();

}


const dock = document.querySelector(".dock");

function togglePalette() {
    dock.classList.toggle("hidden");
}

window.addEventListener("keydown", event => {

    if (event.key.toLowerCase() === "p") {
        togglePalette();
    }

});


// need a way so it changes dynamically and not only on reload
let lastTime = 0;

const SPEED = 100; // milliseconds between generations

function loop(time){

    if(time - lastTime >= SPEED){

        simulate();

        lastTime = time;

    }

    requestAnimationFrame(loop);

}

requestAnimationFrame(loop);