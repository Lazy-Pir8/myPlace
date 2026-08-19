So, I was trying to build a replica of r/Place, a popular subreddit. The basic idea is a pixalated canvas, where each pixel can be coloured by different colour. So multiple people can color pixel
and draw something, make something , work together or against each other. Groups compete against each other by making things. So This was r/place.

I Used HTML, CSS and Javascript for creating this. 

## Features
- 1024 × 1024 pixel canvas
- 30 color palette
- Pixel level painting
- Eraser
- Smooth zooming
- Infinite style panning around the canvas
- Mouse wheel zoom
- Touch pinch zoom
- Space + drag camera movement
- Middle and right mouse button panning
- Pixel grid when zoomed in
- Pixel coordinate display
- Zoom level display
- Undo system
- Local browser persistence
- Shareable camera position through the URL hash
- PNG export
- Board data export
- Mobile friendly interface
- 0.1 second cooldown between pixel placements

## Storage
The board is stored locally in the browser using localStorage.

The project also uses chunk based storage so that the board can be handled
in smaller sections rather than treating the entire canvas as one giant
object.

This makes the project easier to scale and provides a foundation for
future features such as larger canvases and procedural generation.


## Pivot
I'm taking a pivot and making something else out of it, using the canvas I have made.
So One way is to use this pixelated canvas to draw things, or test out mathematical algorithms.
The recent addition is Conway's Game of Life.
So the Red coloured pixels can be called Alive Cells, while the white ones are Dead Cells.

There are certain rules that the cells follow:
1. Underpopulation: Any live cell with fewer than two live neighbors dies.
2. Survival: Any live cell with two or three live neighbors lives on to the next generation.
3. Overpopulation: Any live cell with more than three live neighbors dies.
4. Reproduction: Any dead cell with exactly three live neighbors becomes a live cell. 

And So the Simulation Runs with these rules

# Project status: Paused
The original idea was to build a collaborative r/Place style canvas. I later experimented with using the canvas as a platform for mathematical and algorithmic simulations, including Conway's Game of Life. I decided to pause the project because I haven't found a direction I genuinely want to explore further. The canvas infrastructure remains available for future experiments.
