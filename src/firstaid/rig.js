/* ═══════════════════════════════════════════════════════════════
   First-aid simulation rig
   Jointed SVG figures posed with two-bone inverse kinematics, so a
   hand or foot is placed exactly on its target (a breastbone, a
   wound, a shoulder blade) and the arm or leg bends to reach it.
   ═══════════════════════════════════════════════════════════════ */

// ── Vector helpers ──────────────────────────────────────────────
export const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
export const mul = (a, s) => [a[0] * s, a[1] * s];
export const len = a => Math.hypot(a[0], a[1]);
export const norm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l]; };
export const lerp = (a, b, k) => a + (b - a) * k;
const rad = deg => deg * Math.PI / 180;
export const dirOf = deg => [Math.cos(rad(deg)), Math.sin(rad(deg))];
export const angleOf = v => Math.atan2(v[1], v[0]) * 180 / Math.PI;
export function rotate(v, deg) {
  const c = Math.cos(rad(deg)), s = Math.sin(rad(deg));
  return [v[0] * c - v[1] * s, v[0] * s + v[1] * c];
}
const r1 = n => Math.round(n * 10) / 10;
export const pt = p => `${r1(p[0])} ${r1(p[1])}`;

// ── Timeline helpers ────────────────────────────────────────────
export const clamp01 = k => Math.min(1, Math.max(0, k));
export const ease = k => (k < 0.5 ? 2 * k * k : 1 - ((-2 * k + 2) ** 2) / 2);
/** 0 → 1 between `start` and `start + duration`, eased. */
export const phase = (t, start, duration) => ease(clamp01((t - start) / duration));

export function mix(a, b, k) {
  if (typeof a === "number" && typeof b === "number") return lerp(a, b, k);
  if (Array.isArray(a) && Array.isArray(b)) return a.map((value, i) => mix(value, b[i], k));
  if (a && b && typeof a === "object" && typeof b === "object") {
    const out = { ...b };
    for (const key of Object.keys(a)) out[key] = key in b ? mix(a[key], b[key], k) : a[key];
    return out;
  }
  return k < 0.5 ? a : b;
}

/** Interpolates keyframes `[[time, value], …]` (numbers, arrays or pose objects). */
export function seq(t, frames) {
  if (t <= frames[0][0]) return frames[0][1];
  for (let i = 1; i < frames.length; i += 1) {
    const [t1, v1] = frames[i];
    if (t <= t1) {
      const [t0, v0] = frames[i - 1];
      return mix(v0, v1, ease((t - t0) / (t1 - t0 || 1)));
    }
  }
  return frames[frames.length - 1][1];
}

// ── Shape helpers ───────────────────────────────────────────────
/** Tapered limb with rounded ends from a (width wa) to b (width wb). */
export function capsule(a, b, wa, wb) {
  const u = norm(sub(b, a));
  const n = [-u[1], u[0]];
  return `M${pt(add(a, mul(n, wa)))} L${pt(add(b, mul(n, wb)))} A${r1(wb)} ${r1(wb)} 0 0 0 ${pt(sub(b, mul(n, wb)))} L${pt(sub(a, mul(n, wa)))} A${r1(wa)} ${r1(wa)} 0 0 0 ${pt(add(a, mul(n, wa)))}Z`;
}

/** Smooth closed Catmull-Rom path through points. */
export function smoothClosed(points) {
  const n = points.length;
  let d = `M${pt(points[0])}`;
  for (let i = 0; i < n; i += 1) {
    const p0 = points[(i - 1 + n) % n], p1 = points[i], p2 = points[(i + 1) % n], p3 = points[(i + 2) % n];
    const c1 = add(p1, mul(sub(p2, p0), 1 / 6));
    const c2 = sub(p2, mul(sub(p3, p1), 1 / 6));
    d += ` C${pt(c1)} ${pt(c2)} ${pt(p2)}`;
  }
  return `${d}Z`;
}

/** Smooth open path through points. */
export function smoothOpen(points) {
  let d = `M${pt(points[0])}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[Math.max(0, i - 1)], p1 = points[i], p2 = points[i + 1], p3 = points[Math.min(points.length - 1, i + 2)];
    d += ` C${pt(add(p1, mul(sub(p2, p0), 1 / 6)))} ${pt(sub(p2, mul(sub(p3, p1), 1 / 6)))} ${pt(p2)}`;
  }
  return d;
}

export function shade(hex, amount) {
  const value = parseInt(hex.slice(1), 16);
  const target = amount < 0 ? 0 : 255;
  const k = Math.abs(amount);
  const channel = shift => Math.round(((value >> shift) & 255) + (target - ((value >> shift) & 255)) * k);
  return `rgb(${channel(16)},${channel(8)},${channel(0)})`;
}

/**
 * Two-bone IK. Returns the joint (`mid`) and end point. `bend` (+1/−1)
 * picks which side the elbow or knee goes. `straight` draws the limb as a
 * straight line to the target (used for foreshortened locked arms).
 */
export function solveLimb(root, target, l1, l2, bend = 1, straight = false) {
  const delta = sub(target, root);
  const d = Math.max(0.001, len(delta));
  if (straight) return { mid: add(root, mul(delta, l1 / (l1 + l2))), end: target };
  if (d >= l1 + l2 - 0.01) {
    const u = norm(delta);
    return { mid: add(root, mul(u, l1)), end: add(root, mul(u, l1 + l2)) };
  }
  const cos = Math.min(1, Math.max(-1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)));
  const a = angleOf(delta) + bend * Math.acos(cos) * 180 / Math.PI;
  return { mid: add(root, mul(dirOf(a), l1)), end: target };
}

// ── Figure dimensions and looks ─────────────────────────────────
export const BODY = { torso: 92, upperArm: 50, forearm: 45, hand: 16, thigh: 68, shin: 64, foot: 23 };
// Flat cartoon style: pastel fills, one bold ink outline, blushed cheeks.
export const INK = "#23262D";
export const OUTLINE = 2;
export const BLUSH = "#EE7F86";

export const LOOKS = {
  rescuer: { skin: "#8D5A3B", shirt: "#78AEE0", sleeve: "short", pants: "#5E92CC", shoe: "#2B2F38", hair: "#1E1915" },
  casualty: { skin: "#D9A47A", shirt: "#6F8F58", sleeve: "short", pants: "#4A4E57", shoe: "#6B4F3A", hair: "#2A1D14" },
  bystander: { skin: "#6E4428", shirt: "#E8925E", sleeve: "short", pants: "#4F6D8F", shoe: "#2B2F38", hair: "#120E0B" },
  paramedic: { skin: "#A86F48", shirt: "#3E8E5E", sleeve: "long", pants: "#2E5541", shoe: "#2B2F38", hair: "#1A1410" },
};
export const GLOVE = "#3F7FD8";

/** Scene backdrop, in the soft sky-blue of the illustration style. */
export const SCENE = { sky: "#A9D1F1", floor: "#8DBDE5", floorEdge: "#79ADDA", shadow: "#4F7FB0", inset: "#EEF6FD", border: "#B9D3EA", water: "#3B8FDB" };

/**
 * Gives props drawn without an explicit stroke (phones, AEDs, dressings, taps)
 * the same ink outline as the figures. Shapes with their own stroke, inside a
 * stroked group, unfilled, or semi-transparent (water, glows) are left alone.
 */
export const TOON_CSS = `
.fa-toon :is(path,rect,circle,ellipse,polygon):not([stroke]):not([fill="none"]):not([opacity]):not([fill-opacity]):not(g[stroke] *):not(g[opacity] *) {
  stroke: ${INK}; stroke-width: 1.5px; stroke-linejoin: round;
}`;

// ── Profile (side-view) figure ──────────────────────────────────
// Canonical torso frame: hip at origin, neck at (0, −L), front is +x.
const FRONT = [[0, 15], [0.14, 16], [0.32, 14], [0.5, 14.5], [0.68, 18.5], [0.8, 18], [0.92, 12], [1, 7]];
const BACK = [[1, -6], [0.93, -14.5], [0.78, -16], [0.58, -14], [0.4, -12], [0.22, -14], [0.07, -17], [-0.03, -13]];

export function torsoOutline(L, press = 0, rise = 0, minS = -1) {
  const chest = s => Math.max(0, 1 - Math.abs(s - 0.68) / 0.2);
  const front = FRONT.filter(([s]) => s >= minS).map(([s, x]) => [x + (rise - press) * chest(s), -s * L]);
  const back = BACK.filter(([s]) => s >= minS).map(([s, x]) => [x, -s * L]);
  return [...front, ...back];
}

export function profileRig(pose) {
  const L = BODY.torso;
  const a = pose.torso ?? -90;
  const facing = pose.facing ?? 1;
  const d = dirOf(a);
  const front = mul([-d[1], d[0]], facing);
  const local = ([x, y]) => add(add(pose.hip, mul(front, x)), mul(d, -y));
  const head = pose.head ?? 0;
  const headLocal = ([x, y]) => { const r = rotate([x, y], -head); return local([r[0] + 3, r[1] - L]); };
  return { L, a, d, facing, front, local, headLocal, shoulder: local([-2, -0.86 * L]), hipJoint: local([0, -4]) };
}


export function frontRig(pose) {
  const shoulderY = pose.shoulderY ?? pose.hipY - BODY.torso * Math.cos(rad(pose.lean ?? 0));
  return {
    shoulderY,
    left: [pose.x - 21, shoulderY + 5],
    right: [pose.x + 21, shoulderY + 5],
    // headDrop moves the head down in front of the chest when bending over.
    head: [pose.x + (pose.turn ?? 0) * 2.5, shoulderY - 21 + (pose.headDown ?? 0) * 8 + (pose.headDrop ?? 0)],
  };
}

export const COLORS = { ink: INK, text: "#2B3448", muted: "#44506A", red: "#C62828", green: "#2E7D32", amber: "#B26A00", blue: "#1F5FAF", blood: "#9E1B1B" };

