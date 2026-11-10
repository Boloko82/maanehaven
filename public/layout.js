// The garden seen from above, shared by the server (rules) and the browser (drawing).
// World units: 960 x 540. The strip above bounds.top is sky (moon and wishes).
export const LAYOUT = Object.freeze({
  width: 960,
  height: 540,
  bounds: { left: 30, top: 130, right: 930, bottom: 515 },
  walkSpeed: 180, // world units per second, used by the server and by the browser's own prediction
  // Beds open in id order: 0-5 from the start, 6-11 bought in the shop.
  beds: [
    { id: 0, x: 360, y: 260 }, { id: 1, x: 480, y: 260 }, { id: 2, x: 600, y: 260 },
    { id: 3, x: 360, y: 380 }, { id: 4, x: 480, y: 380 }, { id: 5, x: 600, y: 380 },
    { id: 6, x: 240, y: 260 }, { id: 7, x: 720, y: 260 },
    { id: 8, x: 240, y: 380 }, { id: 9, x: 720, y: 380 },
    { id: 10, x: 420, y: 480 }, { id: 11, x: 540, y: 480 },
  ],
  well: { x: 80, y: 480 },
  seedBoxes: [
    { type: 'maaneklokke', x: 80, y: 170 },
    { type: 'natviol', x: 80, y: 230 },
    { type: 'soelvrose', x: 80, y: 290 },
    { type: 'stjernetidsel', x: 80, y: 350 },
    { type: 'tvillingelilje', x: 80, y: 410 },
  ],
  lanterns: [
    { id: 0, x: 420, y: 320 }, { id: 1, x: 540, y: 320 },
    { id: 2, x: 300, y: 320 }, { id: 3, x: 660, y: 320 },
  ],
  altar: { x: 860, y: 190 },
  spawn: [{ x: 450, y: 200 }, { x: 510, y: 200 }, { x: 450, y: 440 }, { x: 510, y: 440 }],
});
