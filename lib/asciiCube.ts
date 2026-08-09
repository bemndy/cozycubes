/**
 * ASCII rotating-cube renderer.
 *
 * Direct port of `stepCube()` from the design handoff's mockup
 * (docs/design_handoff_visual_refresh/CozyCubes.dc.html:892-970). The math is
 * unchanged — grid size, tick rate, boost cadence and decay, rotation
 * increments, projection constants, and the shading ramp all match the source.
 * The only departure is that the static geometry (vertices, edges, grid lines)
 * is hoisted to module scope instead of being rebuilt every frame; it does not
 * depend on rotation, so the emitted frames are identical.
 *
 * Kept out of the component so it stays a pure, testable function: the caller
 * owns the mutable counters and calls stepCube() once per tick.
 */

export const CUBE_COLS = 46;
export const CUBE_ROWS = 22;
export const CUBE_TICK_MS = 80;

type Point3 = readonly [number, number, number];

/** Mutable animation counters, owned by the caller across ticks. */
export interface CubeState {
  tick: number;
  /** Yaw, accumulates. */
  ay: number;
  /** Pitch, oscillates. */
  ax: number;
  /** Decaying speed pulse — the periodic "solve flourish". */
  boost: number;
}

export function createCubeState(): CubeState {
  return { tick: 0, ay: 0, ax: 0.5, boost: 0 };
}

const VERTS: Point3[] = [
  [-1, -1, -1],
  [1, -1, -1],
  [1, 1, -1],
  [-1, 1, -1],
  [-1, -1, 1],
  [1, -1, 1],
  [1, 1, 1],
  [-1, 1, 1],
];

const EDGES: readonly (readonly [number, number])[] = [
  [0, 1], [1, 2], [2, 3], [3, 0],
  [4, 5], [5, 6], [6, 7], [7, 4],
  [0, 4], [1, 5], [2, 6], [3, 7],
];

/**
 * The internal 3x3x3 division lines — this is what makes it read as a Rubik's
 * cube rather than a plain wireframe box. Two cuts per axis at +/- 1/3, drawn
 * on each of the six faces.
 */
const GRID_LINES: readonly (readonly [Point3, Point3])[] = (() => {
  const g = 1 / 3;
  const lines: [Point3, Point3][] = [];

  for (const z of [1, -1]) {
    for (const x of [-g, g]) lines.push([[x, -1, z], [x, 1, z]]);
    for (const y of [-g, g]) lines.push([[-1, y, z], [1, y, z]]);
  }
  for (const y of [1, -1]) {
    for (const x of [-g, g]) lines.push([[x, y, -1], [x, y, 1]]);
    for (const z of [-g, g]) lines.push([[-1, y, z], [1, y, z]]);
  }
  for (const x of [1, -1]) {
    for (const y of [-g, g]) lines.push([[x, y, -1], [x, y, 1]]);
    for (const z of [-g, g]) lines.push([[x, -1, z], [x, 1, z]]);
  }
  return lines;
})();

const DIST = 4;
const FOV = 3.2;
const SCALE = 15;
const RAMP = ".:-=+*#%";
const LINE_STEPS = 16;

/**
 * Advances the animation one tick and returns the rendered frame as a newline-
 * joined string, ready to drop into a <pre>.
 *
 * Mutates `state`.
 */
export function stepCube(state: CubeState): string {
  const grid: string[][] = [];
  for (let r = 0; r < CUBE_ROWS; r++) grid.push(new Array<string>(CUBE_COLS).fill(" "));

  state.tick += 1;
  if (state.tick % 65 === 0) state.boost = 1.8;
  state.boost *= 0.82;
  state.ay += 0.045 + state.boost * 0.05;
  state.ax = 0.5 + Math.sin(state.tick * 0.02) * 0.3;

  const cosY = Math.cos(state.ay);
  const sinY = Math.sin(state.ay);
  const cosX = Math.cos(state.ax);
  const sinX = Math.sin(state.ax);

  const rotate = (p: Point3): Point3 => {
    const x1 = p[0] * cosY + p[2] * sinY;
    const z1 = -p[0] * sinY + p[2] * cosY;
    const y1 = p[1] * cosX - z1 * sinX;
    const z2 = p[1] * sinX + z1 * cosX;
    return [x1, y1, z2];
  };

  const project = (p: Point3): Point3 => {
    const z = p[2] + DIST;
    const persp = FOV / z;
    // The 0.5 on y compensates for character cells being roughly twice as tall
    // as they are wide, so the cube reads square in a <pre>.
    return [p[0] * persp * SCALE, p[1] * persp * SCALE * 0.5, p[2]];
  };

  const plot = (x: number, y: number, ch: string) => {
    const cx = Math.round(CUBE_COLS / 2 + x);
    const cy = Math.round(CUBE_ROWS / 2 - y);
    if (cx >= 0 && cx < CUBE_COLS && cy >= 0 && cy < CUBE_ROWS) grid[cy][cx] = ch;
  };

  const line = (a: Point3, b: Point3, ch: string) => {
    for (let i = 0; i <= LINE_STEPS; i++) {
      const t = i / LINE_STEPS;
      plot(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, ch);
    }
  };

  /** Nearer geometry gets a denser glyph off the ramp. */
  const shadeChar = (depth: number): string => {
    const tNear = Math.max(0, Math.min(1, (1 - depth) / 2));
    return RAMP[Math.floor(tNear * (RAMP.length - 1))];
  };

  for (const [p1, p2] of GRID_LINES) {
    const r1 = rotate(p1);
    const r2 = rotate(p2);
    line(project(r1), project(r2), shadeChar((r1[2] + r2[2]) / 2));
  }
  for (const [i, j] of EDGES) {
    line(project(rotate(VERTS[i])), project(rotate(VERTS[j])), "#");
  }
  for (const v of VERTS) {
    const s = project(rotate(v));
    plot(s[0], s[1], "@");
  }

  return grid.map((row) => row.join("")).join("\n");
}
