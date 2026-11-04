/* Drawing components for the first-aid simulations (figures, props, labels). */
import { BODY, COLORS, GLOVE, INK, add, capsule, clamp01, dirOf, frontRig, mul, norm, profileRig, pt, rotate, shade, smoothClosed, smoothOpen, solveLimb, sub, torsoOutline } from "./rig.js";

const r1 = n => Math.round(n * 10) / 10;

function Hand({ wrist, dir, look, grip, far, gloves }) {
  const skin = gloves ? GLOVE : look.skin;
  const fill = far ? shade(skin, -0.18) : skin;
  if (grip === "fist") {
    const c = add(wrist, mul(dir, 6.5));
    return <circle cx={c[0]} cy={c[1]} r={7} fill={fill} stroke={shade(skin, -0.35)} strokeWidth={0.8} />;
  }
  const tip = add(wrist, mul(dir, grip === "heel" ? 13 : BODY.hand));
  const thumb = add(wrist, mul(rotate(dir, -35), 9));
  return (
    <g>
      <path d={capsule(add(wrist, mul(dir, 2)), thumb, 2.6, 2.2)} fill={fill} stroke={shade(skin, -0.35)} strokeWidth={0.6} />
      <path d={capsule(wrist, tip, 6, 4.6)} fill={fill} stroke={shade(skin, -0.35)} strokeWidth={0.8} />
    </g>
  );
}

function ProfileArm({ rig, spec, look, far }) {
  if (!spec) return null;
  const bend = (spec.bend ?? 1) * rig.facing;
  const { mid, end } = solveLimb(rig.shoulder, spec.to, BODY.upperArm, BODY.forearm, bend, spec.straight);
  const sleeve = far ? shade(look.shirt, -0.2) : look.shirt;
  const skin = far ? shade(look.skin, -0.18) : look.skin;
  const forearmColor = look.sleeve === "long" ? sleeve : skin;
  const handDir = spec.hand != null ? dirOf(spec.hand) : norm(sub(end, mid));
  return (
    <g>
      {look.sleeve === "short" && <path d={capsule(mid, end, 7.8, 6.2)} fill={skin} stroke={shade(look.skin, -0.3)} strokeWidth={0.7} />}
      {look.sleeve === "short" && <path d={capsule(rig.shoulder, add(rig.shoulder, mul(norm(sub(mid, rig.shoulder)), 30)), 10.5, 9.5)} fill={skin} />}
      <path d={capsule(rig.shoulder, mid, 10.5, 8.2)} fill={look.sleeve === "short" ? skin : sleeve} stroke={shade(look.sleeve === "short" ? look.skin : look.shirt, -0.3)} strokeWidth={0.7} />
      {look.sleeve === "short" && <path d={capsule(rig.shoulder, add(rig.shoulder, mul(norm(sub(mid, rig.shoulder)), 24)), 11, 10)} fill={sleeve} />}
      {look.sleeve !== "short" && <path d={capsule(mid, end, 8.2, 6.4)} fill={forearmColor} stroke={shade(look.shirt, -0.3)} strokeWidth={0.7} />}
      <Hand wrist={end} dir={handDir} look={look} grip={spec.grip} far={far} gloves={spec.gloves} />
    </g>
  );
}

function ProfileLeg({ rig, spec, look, far }) {
  if (!spec) return null;
  // Knees bend toward the front by default.
  const bend = (spec.bend ?? -1) * rig.facing;
  const { mid, end } = solveLimb(rig.hipJoint, spec.to, BODY.thigh, BODY.shin, bend);
  const pants = far ? shade(look.pants, -0.22) : look.pants;
  const shin = norm(sub(end, mid));
  const footDir = spec.foot != null ? dirOf(spec.foot) : rotate(shin, -90 * rig.facing);
  return (
    <g>
      <path d={capsule(rig.hipJoint, mid, 15, 10.5)} fill={pants} stroke={shade(look.pants, -0.35)} strokeWidth={0.7} />
      <path d={capsule(mid, end, 10.5, 7.2)} fill={pants} stroke={shade(look.pants, -0.35)} strokeWidth={0.7} />
      <path d={capsule(add(end, mul(footDir, -3)), add(end, mul(footDir, BODY.foot)), 7, 5.2)} fill={far ? shade(look.shoe, 0.1) : look.shoe} />
    </g>
  );
}

/** Side-view head drawn facing +x with the neck base at the origin. */
export function ProfileHead({ look, face = "open", mouth = 0 }) {
  const facePoints = [[6, -41], [11, -35.5], [12.6, -30.5], [11.7, -27.6], [13.2, -25], [17.2, -19], [14.3, -17], [13.9, -15.2], [14.6, -13.8], [13.2, -12.6], [14, -11.3], [13, -8.4], [9.5, -5.6], [3.5, -5], [-1, -9], [-3, -22]];
  const ink = shade(look.skin, -0.55);
  return (
    <g>
      <path d={capsule([0, 2], [1.5, -12], 7, 6.4)} fill={look.skin} stroke={shade(look.skin, -0.3)} strokeWidth={0.7} />
      <ellipse cx={-1} cy={-27} rx={14.6} ry={15.6} fill={look.skin} stroke={shade(look.skin, -0.3)} strokeWidth={0.7} />
      <path d={smoothClosed(facePoints)} fill={look.skin} />
      <path d={smoothOpen(facePoints.slice(0, 13))} fill="none" stroke={shade(look.skin, -0.3)} strokeWidth={0.7} />
      <path d="M9.5 -39.5 C6 -44.5 -6 -45.5 -12.5 -38.5 C-17 -32 -16.8 -21.5 -12.5 -15.5 L-9.6 -17.5 C-11.6 -23.5 -10.6 -30.5 -5.6 -34.2 C-0.6 -37.6 5.6 -37.4 9.6 -35.6 Z" fill={look.hair} />
      <ellipse cx={-1.6} cy={-25} rx={3.3} ry={4.6} fill={shade(look.skin, -0.12)} stroke={shade(look.skin, -0.32)} strokeWidth={0.6} />
      <path d={face === "distress" ? "M8.4 -31.6 L12.4 -30.2" : "M8.4 -30.6 L12.4 -30.6"} stroke={look.hair} strokeWidth={1.4} strokeLinecap="round" />
      {face === "closed"
        ? <path d="M8.6 -26.8 Q10.2 -25.6 11.9 -26.8" fill="none" stroke={ink} strokeWidth={1} strokeLinecap="round" />
        : <circle cx={10.4} cy={-27.1} r={1.35} fill={INK} />}
      {mouth > 0.05
        ? <ellipse cx={12.6} cy={-12.9} rx={1.8} ry={0.6 + mouth * 2.4} fill="#4A1F1A" />
        : <path d="M11.6 -12.6 L14 -12.8" stroke={ink} strokeWidth={0.9} strokeLinecap="round" />}
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
  return (
    <g>
      <ProfileArm rig={rig} spec={pose.armF} look={look} far />
      <ProfileLeg rig={rig} spec={pose.legF} look={look} far />
      <g transform={`translate(${pt(pose.hip)}) rotate(${r1(rig.a + 90)}) scale(${rig.facing},1)`}>
        <path d={smoothClosed([...outline, [2, 4]])} fill={look.pants} stroke={shade(look.pants, -0.35)} strokeWidth={0.7} />
        <path d={smoothClosed([[14.2, -0.24 * L], ...shirt, [-13.2, -0.24 * L]])} fill={look.shirt} stroke={shade(look.shirt, -0.3)} strokeWidth={0.7} />
        <path d={`M14 ${r1(-0.25 * L)} L-13 ${r1(-0.25 * L)}`} stroke={shade(look.pants, -0.4)} strokeWidth={2} />
        <g transform={`translate(3 ${-L}) rotate(${r1(-(pose.head ?? 0))})`}>
          <ProfileHead look={look} face={pose.face} mouth={pose.mouth} />
        </g>
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
  const skin = spec.gloves ? GLOVE : look.skin;
  const tip = add(end, mul(dir, spec.grip === "heel" ? 11 : 14));
  return (
    <g>
      <path d={capsule(shoulder, mid, 10, 8)} fill={look.shirt} stroke={shade(look.shirt, -0.3)} strokeWidth={0.7} />
      <path d={capsule(mid, end, 8, 6.3)} fill={look.sleeve === "long" ? look.shirt : look.skin} stroke={shade(look.shirt, -0.3)} strokeWidth={0.7} />
      <path d={capsule(end, tip, 6.4, 5.6)} fill={skin} stroke={shade(skin, -0.35)} strokeWidth={0.8} />
    </g>
  );
}

function FrontHead({ look, at, headDown = 0, turn = 0, talk = 0, neck = true }) {
  const [x, y] = at;
  const eyeY = y - 1 + headDown * 5;
  const fx = x + turn * 4;
  return (
    <g>
      {neck && <rect x={x - 5.5} y={y + 9} width={11} height={13} fill={shade(look.skin, -0.12)} />}
      <ellipse cx={x - 13.2} cy={eyeY + 1} rx={2.6} ry={4.4} fill={shade(look.skin, -0.1)} />
      <ellipse cx={x + 13.2} cy={eyeY + 1} rx={2.6} ry={4.4} fill={shade(look.skin, -0.1)} />
      <ellipse cx={x} cy={y} rx={13.4} ry={15.8} fill={look.skin} stroke={shade(look.skin, -0.3)} strokeWidth={0.7} />
      <path d={`M${x - 13.6} ${y - 2 + headDown * 8} C${x - 15} ${y - 20} ${x + 15} ${y - 20} ${x + 13.6} ${y - 2 + headDown * 8} C${x + 9} ${y - 9 + headDown * 7} ${x - 9} ${y - 9 + headDown * 7} ${x - 13.6} ${y - 2 + headDown * 8}Z`} fill={look.hair} />
      {headDown < 0.85 && <>
        <circle cx={fx - 5} cy={eyeY} r={1.4} fill={INK} />
        <circle cx={fx + 5} cy={eyeY} r={1.4} fill={INK} />
        <path d={`M${fx} ${eyeY + 2} L${fx - 0.8} ${eyeY + 6.5} L${fx + 1} ${eyeY + 6.8}`} fill="none" stroke={shade(look.skin, -0.4)} strokeWidth={0.8} />
        {talk > 0.1
          ? <ellipse cx={fx} cy={eyeY + 10.5} rx={2.6} ry={1 + talk * 1.8} fill="#4A1F1A" />
          : <path d={`M${fx - 3} ${eyeY + 10.5} Q${fx} ${eyeY + 12} ${fx + 3} ${eyeY + 10.5}`} fill="none" stroke={shade(look.skin, -0.5)} strokeWidth={0.9} />}
      </>}
    </g>
  );
}

/** Kneeling thighs; draw before the casualty so they are hidden behind them. */
export function FrontLower({ pose, look, ground }) {
  return (
    <g>
      <path d={capsule([pose.x - 10, pose.hipY + 4], [pose.x - 13, ground - 8], 13, 10)} fill={shade(look.pants, -0.1)} />
      <path d={capsule([pose.x + 10, pose.hipY + 4], [pose.x + 13, ground - 8], 13, 10)} fill={shade(look.pants, -0.1)} />
    </g>
  );
}

/** Upper body seen from the front: lean (deg), headDown 0–1, turn −1–1, armL/armR. */
export function FrontUpper({ pose, look }) {
  const rig = frontRig(pose);
  const { x, hipY } = pose;
  const s = rig.shoulderY;
  const torso = `M${x - 17} ${hipY + 6} L${x - 20} ${s + 30} C${x - 25} ${s + 14} ${x - 27} ${s + 2} ${x - 17} ${s - 2} L${x + 17} ${s - 2} C${x + 27} ${s + 2} ${x + 25} ${s + 14} ${x + 20} ${s + 30} L${x + 17} ${hipY + 6}Z`;
  return (
    <g>
      <path d={torso} fill={look.shirt} stroke={shade(look.shirt, -0.3)} strokeWidth={0.8} />
      <path d={`M${x - 6} ${s - 1} Q${x} ${s + 6} ${x + 6} ${s - 1}`} fill={shade(look.shirt, -0.25)} />
      <FrontHead look={look} at={rig.head} headDown={pose.headDown} turn={pose.turn} talk={pose.talk} neck={(pose.headDrop ?? 0) < 12} />
      <FrontArm shoulder={rig.left} spec={pose.armL} look={look} bend={1} />
      <FrontArm shoulder={rig.right} spec={pose.armR} look={look} bend={-1} />
    </g>
  );
}

// ── Scene furniture and annotation ──────────────────────────────
export function Floor({ y, width = 640 }) {
  return (
    <g>
      <rect x={0} y={y} width={width} height={360 - y} fill="#DCE3EE" />
      <line x1={0} y1={y} x2={width} y2={y} stroke="#B7C2D6" strokeWidth={1.5} />
    </g>
  );
}

export function GroundShadow({ x, y, rx, ry = 5 }) {
  return <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="#9AA7BE" opacity={0.35} />;
}

/** Leader-line label: a dot on the target joined to a text box. */
export function Callout({ at, to, text, color = COLORS.blue, anchor = "start", size = 10.5 }) {
  const lines = Array.isArray(text) ? text : [text];
  const width = Math.max(...lines.map(line => line.length)) * size * 0.54 + 12;
  const height = lines.length * (size + 3) + 7;
  const x = anchor === "end" ? to[0] - width : anchor === "middle" ? to[0] - width / 2 : to[0];
  const y = to[1] - height / 2;
  const join = [anchor === "end" ? to[0] : anchor === "middle" ? to[0] : to[0], to[1]];
  return (
    <g>
      <line x1={at[0]} y1={at[1]} x2={join[0]} y2={join[1]} stroke={color} strokeWidth={1.1} />
      <circle cx={at[0]} cy={at[1]} r={3} fill="#fff" stroke={color} strokeWidth={1.6} />
      <rect x={x} y={y} width={width} height={height} rx={4} fill="#fff" stroke={color} strokeWidth={1} />
      {lines.map((line, i) => (
        <text key={i} x={x + 6} y={y + 5 + (i + 1) * (size + 3) - 3} fontSize={size} fill={COLORS.text} fontFamily="'IBM Plex Sans',sans-serif" fontWeight={i === 0 ? 600 : 400}>{line}</text>
      ))}
    </g>
  );
}

export function Arrow({ from, to, color = COLORS.red, width = 2.2, head = 7 }) {
  const u = norm(sub(to, from));
  const n = [-u[1], u[0]];
  const base = sub(to, mul(u, head));
  return (
    <g>
      <line x1={from[0]} y1={from[1]} x2={base[0]} y2={base[1]} stroke={color} strokeWidth={width} strokeLinecap="round" />
      <path d={`M${pt(to)} L${pt(add(base, mul(n, head * 0.55)))} L${pt(sub(base, mul(n, head * 0.55)))}Z`} fill={color} />
    </g>
  );
}

export function Bubble({ at, text, tail = "left", color = COLORS.ink, size = 11 }) {
  const lines = Array.isArray(text) ? text : [text];
  const width = Math.max(...lines.map(line => line.length)) * size * 0.55 + 16;
  const height = lines.length * (size + 3) + 10;
  const [x, y] = at;
  const tx = tail === "left" ? x + 12 : x + width - 12;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={8} fill="#fff" stroke={color} strokeWidth={1.2} />
      <path d={`M${tx - 5} ${y + height - 0.6} L${tx + (tail === "left" ? -8 : 8)} ${y + height + 9} L${tx + 5} ${y + height - 0.6}`} fill="#fff" stroke={color} strokeWidth={1.2} strokeLinejoin="round" />
      <rect x={tx - 5.5} y={y + height - 2} width={11} height={2.6} fill="#fff" />
      {lines.map((line, i) => (
        <text key={i} x={x + 8} y={y + 4 + (i + 1) * (size + 3)} fontSize={size} fontWeight={600} fill={color} fontFamily="'IBM Plex Sans',sans-serif">{line}</text>
      ))}
    </g>
  );
}

/** Rounded information panel with a title and optional lines. */
export function Panel({ x, y, w, title, lines = [], color = COLORS.blue, size = 10 }) {
  const h = 22 + lines.length * (size + 4);
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={6} fill="#fff" stroke={color} strokeWidth={1} />
      <rect x={x} y={y} width={4} height={h} rx={2} fill={color} />
      <text x={x + 11} y={y + 15} fontSize={size + 1} fontWeight={700} fill={color} fontFamily="'IBM Plex Sans',sans-serif">{title}</text>
      {lines.map((line, i) => (
        <text key={i} x={x + 11} y={y + 30 + i * (size + 4)} fontSize={size} fill={COLORS.text} fontFamily="'IBM Plex Sans',sans-serif">{line}</text>
      ))}
    </g>
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
    <g>
      <circle cx={x} cy={y} r={r} fill="#fff" stroke="#D5DCE8" strokeWidth={4} />
      {k > 0 && <path d={`M${x} ${y - r} A${r} ${r} 0 ${k > 0.5 ? 1 : 0} 1 ${pt(end)}`} fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" />}
      <text x={x} y={y + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill={COLORS.ink} fontFamily="'IBM Plex Mono',monospace">{label}</text>
    </g>
  );
}

export function Tag({ x, y, text, color = COLORS.red, size = 10 }) {
  const w = text.length * size * 0.6 + 12;
  return (
    <g>
      <rect x={x} y={y} width={w} height={size + 8} rx={3} fill={color} />
      <text x={x + 6} y={y + size + 2.5} fontSize={size} fontWeight={700} fill="#fff" fontFamily="'IBM Plex Sans',sans-serif">{text}</text>
    </g>
  );
}

export function Cross({ x, y, size = 10, color = COLORS.red }) {
  return <path d={`M${x - size} ${y - size} L${x + size} ${y + size} M${x + size} ${y - size} L${x - size} ${y + size}`} stroke={color} strokeWidth={2.4} strokeLinecap="round" />;
}

export function Check({ x, y, size = 8, color = COLORS.green }) {
  return <path d={`M${x - size} ${y} L${x - size / 3} ${y + size * 0.7} L${x + size} ${y - size * 0.7}`} fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />;
}
