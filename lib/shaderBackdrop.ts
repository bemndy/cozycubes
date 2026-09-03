/**
 * GLSL and WebGL plumbing for the ambient background.
 *
 * Kept out of the component so the shader source and the context setup are
 * readable on their own, and so the component is just a lifecycle wrapper.
 *
 * Deliberately raw WebGL rather than three.js. The effect is one full-screen
 * quad with a noise shader — none of three.js's scene graph, camera, or loader
 * machinery is involved, and pulling it in would add roughly half a megabyte to
 * a page whose entire job is timing solves.
 */

/**
 * 2D simplex noise. This is the standard Ashima Arts / Stefan Gustavson
 * implementation (MIT), the same one nearly every noise shader on the web uses.
 */
const SIMPLEX = `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                     -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                 + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x  = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
`;

const VERTEX_SRC = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

/**
 * Three noise octaves at different scales and drift speeds, warped by a fourth
 * so the bands bend instead of sliding straight, then faded toward the base
 * colour at the edges so the field never meets the viewport with a hard seam.
 */
const FRAGMENT_SRC = `
precision mediump float;

uniform float u_time;
uniform vec2 u_res;
uniform vec3 u_bg;
uniform vec3 u_a;
uniform vec3 u_b;
uniform vec3 u_c;

varying vec2 v_uv;

${SIMPLEX}

void main() {
  // Correct for aspect so the cells stay round on an ultrawide.
  vec2 uv = v_uv;
  uv.x *= u_res.x / u_res.y;

  // Domain warp: offset the sample point by noise before sampling again.
  vec2 warp = vec2(
    snoise(uv * 0.7 + u_time * 0.02),
    snoise(uv * 0.7 - u_time * 0.015 + 31.4)
  );
  vec2 p = uv + warp * 0.35;

  float n1 = snoise(p * 0.9 + u_time * 0.035);
  float n2 = snoise(p * 1.9 - u_time * 0.045 + 11.7);
  float n3 = snoise(p * 0.5 + u_time * 0.022 - 5.3);

  // Three octaves, three palette colours. The third runs at the lowest
  // frequency so it reads as a slow wash under the other two rather than as a
  // third competing band.
  vec3 color = u_bg;
  color = mix(color, u_a, smoothstep(-0.6, 0.9, n1) * 0.55);
  color = mix(color, u_b, smoothstep(-0.4, 1.0, n2) * 0.40);
  color = mix(color, u_c, smoothstep(-0.2, 1.1, n3) * 0.30);

  // Radial falloff to the base colour, so the field reads as a glow sitting on
  // the surface rather than as a textured rectangle.
  float d = distance(v_uv, vec2(0.5, 0.45));
  color = mix(color, u_bg, smoothstep(0.25, 0.85, d));

  gl_FragColor = vec4(color, 1.0);
}
`;

/** "#rrggbb" -> [r, g, b] in 0..1. Falls back to black on anything unexpected. */
export function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [0, 0, 0];
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Shader compile failed", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export interface ShaderHandle {
  render: (
    timeSec: number,
    colors: { bg: string; a: string; b: string; c: string }
  ) => void;
  resize: (cssWidth: number, cssHeight: number) => void;
  dispose: () => void;
}

/**
 * Builds the program and returns a small handle. Returns null when WebGL is
 * unavailable — the caller renders nothing and the app is unaffected.
 */
export function createShaderBackdrop(canvas: HTMLCanvasElement): ShaderHandle | null {
  const gl =
    (canvas.getContext("webgl", { antialias: false, alpha: false }) as
      | WebGLRenderingContext
      | null) ?? null;
  if (!gl) return null;

  const vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SRC);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SRC);
  if (!vs || !fs) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Shader link failed", gl.getProgramInfoLog(program));
    return null;
  }
  gl.useProgram(program);

  // One triangle covering the viewport — cheaper than two, and the quad's
  // diagonal seam can't show up in the interpolation.
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

  const aPosition = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

  const uTime = gl.getUniformLocation(program, "u_time");
  const uRes = gl.getUniformLocation(program, "u_res");
  const uBg = gl.getUniformLocation(program, "u_bg");
  const uA = gl.getUniformLocation(program, "u_a");
  const uB = gl.getUniformLocation(program, "u_b");
  const uC = gl.getUniformLocation(program, "u_c");

  /**
   * Rendered at half resolution. The field is smooth noise with no fine detail,
   * so the upscale is invisible, and it quarters the fragment work.
   */
  const SCALE = 0.5;

  return {
    resize(cssWidth, cssHeight) {
      canvas.width = Math.max(1, Math.floor(cssWidth * SCALE));
      canvas.height = Math.max(1, Math.floor(cssHeight * SCALE));
      gl.viewport(0, 0, canvas.width, canvas.height);
    },
    render(timeSec, colors) {
      gl.useProgram(program);
      gl.uniform1f(uTime, timeSec);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform3fv(uBg, hexToRgb(colors.bg));
      gl.uniform3fv(uA, hexToRgb(colors.a));
      gl.uniform3fv(uB, hexToRgb(colors.b));
      gl.uniform3fv(uC, hexToRgb(colors.c));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose() {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    },
  };
}
