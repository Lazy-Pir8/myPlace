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
Let's see what it will be
