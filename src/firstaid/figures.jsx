/* Drawing components for the first-aid simulations (figures, props, labels).
   Figures use a flat cartoon style: pastel fills with one bold ink outline
   around each body part, simple faces and blushed cheeks. */
import { createContext, useContext } from "react";
import { BLUSH, BODY, HEAD_SCALE, COLORS, GLOVE, INK, OUTLINE, SCENE, add, capsule, clamp01, dirOf, frontRig, mul, norm, profileRig, pt, rotate, shade, smoothClosed, solveLimb, sub, torsoOutline } from "./rig.js";

const r1 = n => Math.round(n * 10) / 10;
const ellipsePath = (cx, cy, rx, ry) => `M${r1(cx - rx)} ${r1(cy)} A${r1(rx)} ${r1(ry)} 0 1 0 ${r1(cx + rx)} ${r1(cy)} A${r1(rx)} ${r1(ry)} 0 1 0 ${r1(cx - rx)} ${r1(cy)}Z`;
const FAR = -0.12;
const TUBE = "#3A3F4B";

/** A stethoscope tube: an ink outline with the dark tube colour inside. */
function Tube({ d }) {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke={INK} strokeWidth={4.4} />
      <path d={d} stroke={TUBE} strokeWidth={2.2} />
    </g>
  );
}

function ChestPiece({ x, y, r = 3.8 }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="#C9D3DE" stroke={INK} strokeWidth={1.6} />
      <circle cx={x} cy={y} r={r * 0.45} fill="#8E9BAA" stroke="none" />
    </g>
  );
}

/**
 * Draws overlapping shapes as one outlined silhouette: every shape is
 * stroked in ink first, then every fill goes on top, so joints such as
 * elbows and knees show no seams.
 */
function Silhouette({ parts, w = OUTLINE }) {
  return (
    <g>
      {parts.map((p, i) => <path key={`o${i}`} d={p.d} fill={INK} stroke={INK} strokeWidth={w * 2} strokeLinejoin="round" />)}
      {parts.map((p, i) => <path key={`f${i}`} d={p.d} fill={p.fill} stroke="none" />)}
    </g>
  );
}

function handParts({ wrist, dir, fill, grip }) {
  if (grip === "fist") return [{ d: ellipsePath(...add(wrist, mul(dir, 6.5)), 7.2, 7.2), fill }];
  const tip = add(wrist, mul(dir, grip === "heel" ? 13 : BODY.hand));
  const thumb = add(wrist, mul(rotate(dir, -35), 9));
  return [
    { d: capsule(add(wrist, mul(dir, 2)), thumb, 2.8, 2.4), fill },
    { d: capsule(wrist, tip, 6.2, 4.8), fill },
  ];
}

/** Bare hands merge into the arm; gloved hands are drawn on top with their own cuff line. */
function Glove({ wrist, dir, grip, far }) {
  return <Silhouette parts={handParts({ wrist, dir, grip, fill: far ? shade(GLOVE, FAR) : GLOVE })} />;
}

function ProfileArm({ rig, spec, look, far }) {
  if (!spec) return null;
  const bend = (spec.bend ?? 1) * rig.facing;
  const { mid, end } = solveLimb(rig.shoulder, spec.to, BODY.upperArm, BODY.forearm, bend, spec.straight);
  const shirt = far ? shade(look.shirt, FAR) : look.shirt;
  const skin = far ? shade(look.skin, FAR) : look.skin;
  const long = look.sleeve === "long";
  const handDir = spec.hand != null ? dirOf(spec.hand) : norm(sub(end, mid));
  const hand = spec.gloves ? [] : handParts({ wrist: end, dir: handDir, grip: spec.grip, fill: skin });
  const arm = [
    ...hand,
    { d: capsule(rig.shoulder, mid, 10, 8.2), fill: long ? shirt : skin },
    { d: capsule(mid, end, 8.2, 6.4), fill: long ? shirt : skin },
  ];
  const sleeveEnd = add(rig.shoulder, mul(norm(sub(mid, rig.shoulder)), 26));
  return (
    <g>
      <Silhouette parts={arm} />
      {!long && <path d={capsule(rig.shoulder, sleeveEnd, 11.4, 10.6)} fill={shirt} stroke={INK} strokeWidth={OUTLINE} strokeLinejoin="round" />}
      {spec.gloves && <Glove wrist={end} dir={handDir} grip={spec.grip} far={far} />}
    </g>
  );
}

function ProfileLeg({ rig, spec, look, far }) {
  if (!spec) return null;
  // Knees bend toward the front by default.
  const bend = (spec.bend ?? -1) * rig.facing;
  const { mid, end } = solveLimb(rig.hipJoint, spec.to, BODY.thigh, BODY.shin, bend);
  const pants = far ? shade(look.pants, FAR) : look.pants;
  const shin = norm(sub(end, mid));
  const footDir = spec.foot != null ? dirOf(spec.foot) : rotate(shin, -90 * rig.facing);
  return (
    <g>
      <Silhouette parts={[{ d: capsule(rig.hipJoint, mid, 15, 11), fill: pants }, { d: capsule(mid, end, 11, 8), fill: pants }]} />
      <path d={capsule(add(end, mul(footDir, -4)), add(end, mul(footDir, BODY.foot)), 7.4, 5.6)} fill={far ? shade(look.shoe, FAR) : look.shoe} stroke={INK} strokeWidth={OUTLINE} strokeLinejoin="round" />
    </g>
  );
}

/** Side-view head drawn facing +x with the neck base at the origin. */
export function ProfileHead({ look, face = "open", mouth = 0 }) {
  const facePoints = [[6, -41], [11, -35.5], [12.6, -30.5], [11.7, -27.6], [13.2, -25], [17.2, -19], [14.3, -17], [13.9, -15.2], [14.6, -13.8], [13.2, -12.6], [14, -11.3], [13, -8.4], [9.5, -5.6], [3.5, -5], [-1, -9], [-3, -22]];
  const line = { stroke: INK, strokeLinecap: "round", strokeLinejoin: "round", fill: "none" };
  return (
    <g>
      {look.hairStyle === "bun" && <circle cx={-15.5} cy={-33} r={6.8} fill={look.hair} stroke={INK} strokeWidth={OUTLINE} />}
      <Silhouette parts={[
        { d: capsule([0, 2], [1.5, -12], 7, 6.6), fill: look.skin },
        { d: ellipsePath(-1, -27, 14.6, 15.6), fill: look.skin },
        { d: smoothClosed(facePoints), fill: look.skin },
      ]} />
      <path d="M10.5 -38.5 C6 -45.5 -7 -46.5 -13.5 -38.5 C-18.5 -31.5 -18 -21 -13 -14.5 L-9.4 -17.5 C-11.4 -23.5 -10.4 -30.5 -5.4 -33.8 C-1 -36.6 4.4 -36.2 7.6 -33.4 C9.4 -35 10.4 -36.6 10.5 -38.5 Z" fill={look.hair} stroke={INK} strokeWidth={OUTLINE} strokeLinejoin="round" />
      <ellipse cx={-1.6} cy={-24.6} rx={3} ry={4.2} fill={shade(look.skin, -0.08)} stroke={INK} strokeWidth={1.4} />
      <ellipse cx={8.4} cy={-19.4} rx={3.8} ry={2.3} fill={BLUSH} opacity={0.6} />
      <path d={face === "distress" ? "M7.6 -32.6 L12.6 -30.6" : "M7.8 -31.4 Q10.2 -32.6 12.6 -31.2"} {...line} strokeWidth={1.5} />
      {face === "closed"
        ? <path d="M8.2 -27.2 Q10.3 -25.4 12.4 -27.2" {...line} strokeWidth={1.5} />
        : <ellipse cx={10.6} cy={-26.9} rx={1.5} ry={1.9} fill={INK} />}
      {mouth > 0.05
        ? <ellipse cx={12.4} cy={-12.9} rx={1.9} ry={0.7 + mouth * 2.4} fill="#7A2E2A" stroke={INK} strokeWidth={1} />
        : <path d="M10.8 -12.4 Q12.6 -11.6 14 -12.8" {...line} strokeWidth={1.2} />}
    </g>
  );
}

/**
 * Side-view figure. Pose fields: hip, torso (deg, −90 = upright), facing,
 * head (deg, positive tilts the head back), armN/armF/legN/legF
 * ({ to, bend, straight, hand, grip, gloves }), press/rise (chest), face, mouth.
 * `layer`: "all" | "body" (no near arm) | "nearArm".
 */
export function Profile({ pose, look, layer = "all" }) {
  const rig = profileRig(pose);
  const L = rig.L;
  if (layer === "nearArm") return <ProfileArm rig={rig} spec={pose.armN} look={look} />;
  const outline = torsoOutline(L, pose.press, pose.rise);
  const shirt = torsoOutline(L, pose.press, pose.rise, 0.3);
  const ink = { stroke: INK, strokeWidth: OUTLINE, strokeLinejoin: "round" };
  return (
    <g>
      <ProfileArm rig={rig} spec={pose.armF} look={look} far />
      <ProfileLeg rig={rig} spec={pose.legF} look={look} far />
      <g transform={`translate(${pt(pose.hip)}) rotate(${r1(rig.a + 90)}) scale(${rig.facing},1)`}>
        <path d={smoothClosed([...outline, [2, 4]])} fill={look.pants} {...ink} />
        <g transform={`translate(3 ${-L}) rotate(${r1(-(pose.head ?? 0))}) scale(${HEAD_SCALE})`}>
          <ProfileHead look={look} face={pose.face} mouth={pose.mouth} />
        </g>
        <path d={smoothClosed([[14.6, -0.24 * L], ...shirt, [-13.6, -0.24 * L]])} fill={look.shirt} {...ink} />
        {/* V-neck collar where the neck meets the shirt */}
        <path d={`M8 ${r1(-0.97 * L)} L2 ${r1(-0.88 * L)} L-3 ${r1(-0.97 * L)}`} fill="none" {...ink} strokeWidth={1.4} strokeLinecap="round" />
        {look.stethoscope && <>
          <Tube d={`M-5 ${r1(-0.99 * L)} C-9 ${r1(-0.82 * L)} -1 ${r1(-0.69 * L)} 9 ${r1(-0.66 * L)} M10 ${r1(-0.98 * L)} C13 ${r1(-0.86 * L)} 12 ${r1(-0.73 * L)} 9 ${r1(-0.66 * L)} L10 ${r1(-0.58 * L)}`} />
          <ChestPiece x={10.4} y={r1(-0.55 * L)} />
        </>}
      </g>
      <ProfileLeg rig={rig} spec={pose.legN} look={look} />
      {layer === "all" && <ProfileArm rig={rig} spec={pose.armN} look={look} />}
    </g>
  );
}

// ── Front-view figure (rescuer kneeling behind a casualty) ──────
function FrontArm({ shoulder, spec, look, bend }) {
  if (!spec) return null;
  const { mid, end } = solveLimb(shoulder, spec.to, BODY.upperArm, BODY.forearm, bend, spec.straight);
  const dir = spec.hand != null ? dirOf(spec.hand) : norm(sub(end, mid));
  const long = look.sleeve === "long";
  const tip = add(end, mul(dir, spec.grip === "heel" ? 11 : 14));
  const hand = { d: capsule(end, tip, 6.6, 5.8), fill: spec.gloves ? GLOVE : look.skin };
  const sleeveEnd = add(shoulder, mul(norm(sub(mid, shoulder)), 24));
  return (
    <g>
      <Silhouette parts={[
        ...(spec.gloves ? [] : [hand]),
        { d: capsule(shoulder, mid, 9.6, 8), fill: long ? look.shirt : look.skin },
        { d: capsule(mid, end, 8, 6.4), fill: long ? look.shirt : look.skin },
      ]} />
      {!long && <path d={capsule(shoulder, sleeveEnd, 11, 10.2)} fill={look.shirt} stroke={INK} strokeWidth={OUTLINE} strokeLinejoin="round" />}
      {spec.gloves && <Silhouette parts={[hand]} />}
    </g>
  );
}

function FrontHead({ look, at, headDown = 0, turn = 0, talk = 0, neck = true }) {
  const [x, y] = at;
  const eyeY = y - 1 + headDown * 5;
  const fx = x + turn * 4;
  const line = { stroke: INK, strokeLinecap: "round", strokeLinejoin: "round", fill: "none" };
  return (
    <g transform={`translate(${r1(x)} ${r1(y + 15)}) scale(${HEAD_SCALE}) translate(${r1(-x)} ${r1(-(y + 15))})`}>
      {look.hairStyle === "bun" && headDown < 0.5 && <circle cx={x} cy={y - 17} r={6.4} fill={look.hair} stroke={INK} strokeWidth={OUTLINE} />}
      <Silhouette parts={[
        ...(neck ? [{ d: capsule([x, y + 8], [x, y + 21], 6, 6), fill: look.skin }] : []),
        { d: ellipsePath(x - 13.2, eyeY + 1, 3, 4.6), fill: look.skin },
        { d: ellipsePath(x + 13.2, eyeY + 1, 3, 4.6), fill: look.skin },
        { d: ellipsePath(x, y, 13.6, 15.8), fill: look.skin },
      ]} />
      <path d={`M${x - 14} ${y - 1 + headDown * 8} C${x - 16} ${y - 22} ${x + 16} ${y - 22} ${x + 14} ${y - 1 + headDown * 8} C${x + 10} ${y - 10 + headDown * 7} ${x + 2} ${y - 12 + headDown * 7} ${x - 3} ${y - 8 + headDown * 7} C${x - 7} ${y - 10 + headDown * 7} ${x - 11} ${y - 7 + headDown * 7} ${x - 14} ${y - 1 + headDown * 8}Z`} fill={look.hair} stroke={INK} strokeWidth={OUTLINE} strokeLinejoin="round" />
      {headDown < 0.85 && <>
        <ellipse cx={fx - 8.4} cy={eyeY + 6} rx={3.2} ry={2} fill={BLUSH} opacity={0.6} />
        <ellipse cx={fx + 8.4} cy={eyeY + 6} rx={3.2} ry={2} fill={BLUSH} opacity={0.6} />
        <ellipse cx={fx - 5} cy={eyeY} rx={1.4} ry={1.8} fill={INK} />
        <ellipse cx={fx + 5} cy={eyeY} rx={1.4} ry={1.8} fill={INK} />
        <path d={`M${fx} ${eyeY + 2.5} Q${fx - 1.4} ${eyeY + 6} ${fx + 0.8} ${eyeY + 6.4}`} {...line} strokeWidth={1} />
        {talk > 0.1
          ? <ellipse cx={fx} cy={eyeY + 10.5} rx={2.6} ry={1 + talk * 1.8} fill="#7A2E2A" stroke={INK} strokeWidth={1} />
          : <path d={`M${fx - 3} ${eyeY + 10.2} Q${fx} ${eyeY + 12.2} ${fx + 3} ${eyeY + 10.2}`} {...line} strokeWidth={1.2} />}
      </>}
    </g>
  );
}

/** Kneeling thighs; draw before the casualty so they are hidden behind them. */
export function FrontLower({ pose, look, ground }) {
  return (
    <Silhouette parts={[
      { d: capsule([pose.x - 10, pose.hipY + 4], [pose.x - 13, ground - 8], 13, 10), fill: shade(look.pants, -0.06) },
      { d: capsule([pose.x + 10, pose.hipY + 4], [pose.x + 13, ground - 8], 13, 10), fill: shade(look.pants, -0.06) },
    ]} />
  );
}

/** Upper body seen from the front: lean (deg), headDown 0–1, turn −1–1, armL/armR. */
export function FrontUpper({ pose, look }) {
  const rig = frontRig(pose);
  const { x, hipY } = pose;
  const s = rig.shoulderY;
  const torso = `M${x - 17} ${hipY + 6} L${x - 20} ${s + 30} C${x - 25} ${s + 14} ${x - 27} ${s + 2} ${x - 17} ${s - 2} L${x + 17} ${s - 2} C${x + 27} ${s + 2} ${x + 25} ${s + 14} ${x + 20} ${s + 30} L${x + 17} ${hipY + 6}Z`;
  const neck = (pose.headDrop ?? 0) < 12;
  return (
    <g>
      {neck && <FrontHead look={look} at={rig.head} headDown={pose.headDown} turn={pose.turn} talk={pose.talk} />}
      <path d={torso} fill={look.shirt} stroke={INK} strokeWidth={OUTLINE} strokeLinejoin="round" />
      {neck && <path d={`M${x - 7} ${s - 1.5} L${x} ${s + 9} L${x + 7} ${s - 1.5}`} fill={look.skin} stroke={INK} strokeWidth={1.4} strokeLinejoin="round" />}
      {look.stethoscope && neck && <>
        <Tube d={`M${x - 8} ${s - 1} C${x - 13} ${s + 14} ${x - 7} ${s + 27} ${x + 2} ${s + 29} M${x + 8} ${s - 1} C${x + 12} ${s + 12} ${x + 9} ${s + 25} ${x + 2} ${s + 29} L${x + 2} ${s + 35}`} />
        <ChestPiece x={x + 2} y={s + 39} />
      </>}
      {(pose.headDrop ?? 0) >= 12 && <FrontHead look={look} at={rig.head} headDown={pose.headDown} turn={pose.turn} talk={pose.talk} neck={false} />}
      <FrontArm shoulder={rig.left} spec={pose.armL} look={look} bend={1} />
      <FrontArm shoulder={rig.right} spec={pose.armR} look={look} bend={-1} />
    </g>
  );
}

// ── Scene camera ────────────────────────────────────────────────
// Scenes are drawn in "world" coordinates on a 640×360 stage. A camera
// zooms the stage in on the people so they fill the frame, while labels,
// panels and counters stay in screen space at their normal size.
export const CameraContext = createContext(null);
const NO_CAMERA = { fwd: p => p, transform: null, inverse: null };
export const useCamera = () => useContext(CameraContext) ?? NO_CAMERA;

/** World point (x, y) is drawn at screen point (sx, sy), magnified z times. */
export function makeCamera({ x = 0, y = 0, z = 1, sx = 0, sy = 0, hideUi = false }) {
  return {
    hideUi,
    fwd: p => [sx + (p[0] - x) * z, sy + (p[1] - y) * z],
    transform: `translate(${r1(sx)} ${r1(sy)}) scale(${z}) translate(${r1(-x)} ${r1(-y)})`,
    inverse: `translate(${r1(x)} ${r1(y)}) scale(${1 / z}) translate(${r1(-sx)} ${r1(-sy)})`,
  };
}

/** Draws children in screen coordinates, unaffected by the camera. */
export function Screen({ children }) {
  const cam = useCamera();
  if (cam.hideUi) return null;
  return <g data-fa="ui" transform={cam.inverse ?? undefined}>{children}</g>;
}

// ── Scene furniture and annotation ──────────────────────────────
export function Floor({ y }) {
  // Extends well past the stage so it still fills the frame when zoomed.
  return (
    <g data-fa="floor">
      <rect x={-1000} y={y} width={2640} height={1000} fill={SCENE.floor} stroke="none" />
      <line x1={-1000} y1={y} x2={1640} y2={y} stroke={SCENE.floorEdge} strokeWidth={2} />
    </g>
  );
}

export function GroundShadow({ x, y, rx, ry = 5 }) {
  return <ellipse data-fa="floor" cx={x} cy={y} rx={rx} ry={ry} fill={SCENE.shadow} opacity={0.28} stroke="none" />;
}

/** Leader-line label: a dot on the target joined to a text box. */
export function Callout({ at: target, to, text, color = COLORS.blue, anchor = "start", size = 10.5 }) {
  const at = useCamera().fwd(target);
  const lines = Array.isArray(text) ? text : [text];
  const width = Math.max(...lines.map(line => line.length)) * size * 0.54 + 12;
  const height = lines.length * (size + 3) + 7;
  const x = anchor === "end" ? to[0] - width : anchor === "middle" ? to[0] - width / 2 : to[0];
  const y = to[1] - height / 2;
  const join = to;
  return (
    <Screen>
      <line x1={at[0]} y1={at[1]} x2={join[0]} y2={join[1]} stroke={color} strokeWidth={1.1} />
      <circle cx={at[0]} cy={at[1]} r={3} fill="#fff" stroke={color} strokeWidth={1.6} />
      <rect x={x} y={y} width={width} height={height} rx={4} fill="#fff" stroke={color} strokeWidth={1} />
      {lines.map((line, i) => (
        <text key={i} x={x + 6} y={y + 5 + (i + 1) * (size + 3) - 3} fontSize={size} fill={COLORS.text} fontFamily="'IBM Plex Sans',sans-serif" fontWeight={i === 0 ? 600 : 400}>{line}</text>
      ))}
    </Screen>
  );
}

export function Arrow({ from, to, color = COLORS.red, width = 2.2, head = 7 }) {
  const u = norm(sub(to, from));
  const n = [-u[1], u[0]];
  const base = sub(to, mul(u, head));
  return (
    <g>
      <line x1={from[0]} y1={from[1]} x2={base[0]} y2={base[1]} stroke={color} strokeWidth={width} strokeLinecap="round" />
      <path d={`M${pt(to)} L${pt(add(base, mul(n, head * 0.55)))} L${pt(sub(base, mul(n, head * 0.55)))}Z`} fill={color} stroke="none" />
    </g>
  );
}

export function Bubble({ at, text, tail = "left", color = COLORS.ink, size = 11 }) {
  const lines = Array.isArray(text) ? text : [text];
  const width = Math.max(...lines.map(line => line.length)) * size * 0.55 + 16;
  const height = lines.length * (size + 3) + 10;
  const tailOffset = tail === "left" ? 12 : width - 12;
  const lean = tail === "left" ? -8 : 8;
  const tip = useCamera().fwd([at[0] + tailOffset + lean, at[1] + height + 9]);
  const x = Math.min(634 - width, Math.max(6, tip[0] - tailOffset - lean));
  const y = Math.max(6, tip[1] - height - 9);
  const tx = x + tailOffset;
  return (
    <Screen>
      <rect x={x} y={y} width={width} height={height} rx={8} fill="#fff" stroke={color} strokeWidth={1.2} />
      <path d={`M${tx - 5} ${y + height - 0.6} L${tx + (tail === "left" ? -8 : 8)} ${y + height + 9} L${tx + 5} ${y + height - 0.6}`} fill="#fff" stroke={color} strokeWidth={1.2} strokeLinejoin="round" />
      <rect x={tx - 5.5} y={y + height - 2} width={11} height={2.6} fill="#fff" stroke="none" />
      {lines.map((line, i) => (
        <text key={i} x={x + 8} y={y + 4 + (i + 1) * (size + 3)} fontSize={size} fontWeight={600} fill={color} fontFamily="'IBM Plex Sans',sans-serif">{line}</text>
      ))}
    </Screen>
  );
}

/** Rounded information panel with a title and optional lines. */
export function Panel({ x, y, w, title, lines = [], color = COLORS.blue, size = 10 }) {
  const h = 22 + lines.length * (size + 4);
  return (
    <Screen>
      <rect x={x} y={y} width={w} height={h} rx={6} fill="#fff" stroke={color} strokeWidth={1} />
      <rect x={x} y={y} width={4} height={h} rx={2} fill={color} />
      <text x={x + 11} y={y + 15} fontSize={size + 1} fontWeight={700} fill={color} fontFamily="'IBM Plex Sans',sans-serif">{title}</text>
      {lines.map((line, i) => (
        <text key={i} x={x + 11} y={y + 30 + i * (size + 4)} fontSize={size} fill={COLORS.text} fontFamily="'IBM Plex Sans',sans-serif">{line}</text>
      ))}
    </Screen>
  );
}

export function Phone({ x, y, number = "10177", talking = true, t = 0 }) {
  return (
    <g>
      <rect x={x} y={y} width={22} height={38} rx={4} fill="#20263A" />
      <rect x={x + 2.2} y={y + 4} width={17.6} height={26} rx={1.5} fill="#7CC4FF" />
      <text x={x + 11} y={y + 15} textAnchor="middle" fontSize={5.5} fontWeight={700} fill="#0B2545" fontFamily="monospace">{number}</text>
      <text x={x + 11} y={y + 24} textAnchor="middle" fontSize={4.2} fill="#0B2545" fontFamily="sans-serif">speaker</text>
      {talking && [0, 1, 2].map(i => {
        const k = ((t * 1.4 + i / 3) % 1);
        return <path key={i} d={`M${x + 25 + k * 10} ${y + 8} Q${x + 31 + k * 12} ${y + 19} ${x + 25 + k * 10} ${y + 30}`} fill="none" stroke={COLORS.blue} strokeWidth={1.3} opacity={1 - k} />;
      })}
    </g>
  );
}

export function TimerRing({ x, y, r = 18, progress, label, color = COLORS.blue }) {
  const k = clamp01(progress);
  const end = add([x, y], mul(dirOf(-90 + k * 359.9), r));
  return (
    <Screen>
      <circle cx={x} cy={y} r={r} fill="#fff" stroke="#D5DCE8" strokeWidth={4} />
      {k > 0 && <path d={`M${x} ${y - r} A${r} ${r} 0 ${k > 0.5 ? 1 : 0} 1 ${pt(end)}`} fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" />}
      <text x={x} y={y + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill={COLORS.ink} fontFamily="'IBM Plex Mono',monospace">{label}</text>
    </Screen>
  );
}

export function Tag({ x: wx, y: wy, text, color = COLORS.red, size = 10, world = false }) {
  const cam = useCamera();
  const [x, y] = world ? cam.fwd([wx, wy]) : [wx, wy];
  const w = text.length * size * 0.6 + 12;
  return (
    <Screen>
      <rect x={x} y={y} width={w} height={size + 8} rx={3} fill={color} />
      <text x={x + 6} y={y + size + 2.5} fontSize={size} fontWeight={700} fill="#fff" fontFamily="'IBM Plex Sans',sans-serif">{text}</text>
    </Screen>
  );
}

export function Cross({ x, y, size = 10, color = COLORS.red }) {
  return <path d={`M${x - size} ${y - size} L${x + size} ${y + size} M${x + size} ${y - size} L${x - size} ${y + size}`} stroke={color} strokeWidth={2.4} strokeLinecap="round" />;
}

export function Check({ x, y, size = 8, color = COLORS.green }) {
  return <path d={`M${x - size} ${y} L${x - size / 3} ${y + size * 0.7} L${x + size} ${y - size * 0.7}`} fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />;
}
