import {
  PixelCluster,
  PIXEL_PATTERN_BOTTOM_LEFT,
  PIXEL_PATTERN_TOP_RIGHT,
} from "./PixelCluster";

/**
 * Everything behind the UI: a static accent wash and the vignette that keeps
 * the chrome legible, plus two small pixel-dot corner accents.
 *
 * The design file's scattered hex byte pairs (3F, A2, 09, E7…) used to sit in
 * here as texture. They're gone — floating hex over a timer read as debug
 * output rather than as atmosphere.
 *
 * The animated mesh — seven radial blobs at ~110px blur, blended plus-lighter
 * and drifting on 26-42s loops — is deliberately not here either. It gets its
 * own design pass. A timer should not spend every frame compositing wallpaper.
 */
export function Backdrop() {
  return (
    <>
      <div className="bg-wash" />
      <div className="bg-vignette" />

      <PixelCluster
        pattern={PIXEL_PATTERN_BOTTOM_LEFT}
        className="fixed bottom-24 left-6 z-[2]"
      />
      <PixelCluster
        pattern={PIXEL_PATTERN_TOP_RIGHT}
        className="fixed right-6 top-24 z-[2]"
      />
    </>
  );
}
