/* Per-step camera framing for the main simulation view, made by measuring
   how far the people and props reach during each step. null = no zoom
   (close-up steps are already framed). See makeCamera() in figures.jsx. */
export const CAMERAS = {
  cpr: [
    { x: 416.92, y: 300, z: 1.49, sx: 416.92, sy: 326 },
    { x: 405.47, y: 300, z: 1.5, sx: 401.32, sy: 326 },
    { x: 399.95, y: 300, z: 1.5, sx: 393.04, sy: 326 },
    { x: 436, y: 300, z: 1.14, sx: 396, sy: 326 },
    { x: 416.92, y: 300, z: 1.5, sx: 416.92, sy: 326 },
    { x: 403.01, y: 300, z: 1.5, sx: 397.64, sy: 326 },
    { x: 409, y: 300, z: 1.5, sx: 371.5, sy: 326 },
  ],
  choking: [
    { x: 381.13, y: 318, z: 1.13, sx: 381.13, sy: 326 },
    { x: 386.71, y: 318, z: 1.13, sx: 386.71, sy: 326 },
    { x: 340.33, y: 318, z: 1.15, sx: 340.33, sy: 326 },
    { x: 327.85, y: 318, z: 1.15, sx: 327.85, sy: 326 },
    { x: 340.33, y: 318, z: 1.15, sx: 340.33, sy: 326 },
    { x: 328.99, y: 318, z: 1.15, sx: 328.99, sy: 326 },
  ],
  bleeding: [
    { x: 352.34, y: 300, z: 1.5, sx: 352.34, sy: 326 },
    { x: 326.29, y: 300, z: 1.5, sx: 326.29, sy: 326 },
    { x: 326.29, y: 300, z: 1.5, sx: 326.29, sy: 326 },
    { x: 335.63, y: 300, z: 1.5, sx: 335.63, sy: 326 },
    { x: 326.29, y: 300, z: 1.5, sx: 326.29, sy: 326 },
    { x: 326.29, y: 300, z: 1.5, sx: 326.29, sy: 326 },
    { x: 413.13, y: 300, z: 1.15, sx: 368.01, sy: 326 },
  ],
  burns: [
    null,
    { x: 495.41, y: 318, z: 1.14, sx: 463.17, sy: 326 },
    null,
    null,
    null,
    { x: 399.42, y: 318, z: 1.14, sx: 377.75, sy: 326 },
    null,
  ],
};
