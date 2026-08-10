"use client";

import { useMemo } from "react";
import { FACE_COLORS, scrambledCube, type FaceKey } from "@/lib/cubeNet";
import type { SupportedCubeSize } from "@/lib/scramble-gen";

/**
 * Where each face sits in the unfolded cross, in face-widths from the top left:
 *
 *        U
 *     L  F  R  B
 *        D
 */
const LAYOUT: Record<FaceKey, [number, number]> = {
  U: [1, 0],
  L: [0, 1],
  F: [1, 1],
  R: [2, 1],
  B: [3, 1],
  D: [1, 2],
};

/** Gap between stickers, as a fraction of one sticker. */
const GAP = 0.12;

interface CubeNetProps {
  cubeSize: SupportedCubeSize;
  scramble: string[];
}

/**
 * The scramble as an unfolded net.
 *
 * Drawn in sticker units — the viewBox is 4n x 3n and every sticker is 1 unit —
 * so the SVG scales to whatever box it's given. That is what lets a 2x2 and a
 * 7x7 occupy exactly the same height on the page: the stickers get smaller
 * rather than the diagram getting taller, and switching cube size can't shift
 * the timer below it.
 *
 * Colours are the standard WCA scheme and deliberately ignore the active theme.
 * They aren't decoration, they're what the physical cube looks like, and a
 * scramble diagram that recoloured itself would be unreadable against the cube
 * in your hands.
 */
export function CubeNet({ cubeSize, scramble }: CubeNetProps) {
  const state = useMemo(
    () => scrambledCube(cubeSize, scramble),
    [cubeSize, scramble]
  );

  const n = cubeSize;

  return (
    <svg
      viewBox={`0 0 ${4 * n} ${3 * n}`}
      className="h-full w-auto"
      role="img"
      aria-label={`Unfolded ${n}x${n} cube showing the current scramble`}
    >
      {(Object.keys(LAYOUT) as FaceKey[]).map((face) => {
        const [fx, fy] = LAYOUT[face];
        return (
          <g key={face}>
            {state[face].map((row, r) =>
              row.map((sticker, c) => (
                <rect
                  key={`${r}-${c}`}
                  x={fx * n + c + GAP / 2}
                  y={fy * n + r + GAP / 2}
                  width={1 - GAP}
                  height={1 - GAP}
                  rx={0.16}
                  fill={FACE_COLORS[sticker]}
                />
              ))
            )}
          </g>
        );
      })}
    </svg>
  );
}
