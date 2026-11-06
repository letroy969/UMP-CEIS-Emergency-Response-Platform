/* Close-up diagrams for the first-aid simulation insets. */
import { COLORS, GLOVE, INK, LOOKS, SCENE, capsule, clamp01, lerp, shade } from "./rig.js";
import { Profile, ProfileHead } from "./figures.jsx";

const SKIN = LOOKS.casualty.skin;
const BONE = "#EFE3C8";
const label = { fontFamily: "'IBM Plex Sans',sans-serif", fill: COLORS.text };

export function InsetText({ x, y, lines, size = 9, color = COLORS.text, weight = 400, anchor = "start" }) {
  const rows = Array.isArray(lines) ? lines : [lines];
  return rows.map((line, i) => (
    <text key={i} x={x} y={y + i * (size + 3)} fontSize={size} fontWeight={i === 0 ? Math.max(weight, 600) : weight} fill={color} textAnchor={anchor} style={label}>{line}</text>
  ));
}

export function Pointer({ from, to, color = COLORS.blue }) {
  return (
    <g>
      <line x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]} stroke={color} strokeWidth={1} />
      <circle cx={from[0]} cy={from[1]} r={2.4} fill="#fff" stroke={color} strokeWidth={1.4} />
    </g>
  );
}

/* ── CPR: chest seen from above, head to the left ─────────────── */
export function ChestTopView({ pulse = 0, hands = true }) {
  const sink = pulse * 2.5;
  return (
    <g>
      <circle cx={34} cy={85} r={21} fill={SKIN} stroke={INK} strokeWidth={0.8} />
      <path d="M22 70 C14 78 14 92 22 100 C18 92 18 78 22 70Z" fill={LOOKS.casualty.hair} />
      <path d="M13 76 Q8 85 13 94 Q16 85 13 76Z" fill={LOOKS.casualty.hair} />
      <rect x={53} y={76} width={16} height={18} fill={shade(SKIN, -0.08)} />
      <path d="M68 42 Q66 24 86 24 L222 34 Q240 38 240 60 L240 110 Q240 132 222 136 L86 146 Q66 146 68 128 Z" fill={SKIN} stroke={INK} strokeWidth={0.8} />
      {[0, 1, 2, 3, 4].map(i => (
        <g key={i} stroke={shade(SKIN, -0.16)} strokeWidth={1} fill="none">
          <path d={`M${92 + i * 15} 80 Q${86 + i * 15} 55 ${100 + i * 15} 32`} />
          <path d={`M${92 + i * 15} 90 Q${86 + i * 15} 115 ${100 + i * 15} 138`} />
        </g>
      ))}
      <path d="M76 82 Q74 64 80 40 M76 88 Q74 106 80 130" fill="none" stroke={shade(SKIN, -0.22)} strokeWidth={2} />
      <rect x={78} y={81} width={74} height={8} rx={4} fill={BONE} stroke={shade(BONE, -0.25)} strokeWidth={0.8} />
      <rect x={114} y={78} width={38} height={14} rx={5} fill={COLORS.green} opacity={0.18} />
      <line x1={128} y1={46} x2={128} y2={124} stroke={COLORS.muted} strokeWidth={0.9} strokeDasharray="3 3" />
      <circle cx={128} cy={58} r={2.4} fill={shade(SKIN, -0.35)} />
      <circle cx={128} cy={112} r={2.4} fill={shade(SKIN, -0.35)} />
      <circle cx={205} cy={85} r={2.2} fill={shade(SKIN, -0.4)} />
      {hands && (
        <g transform={`translate(0 ${sink * 0.2})`}>
          <path d="M120 170 L122 98 L146 98 L148 170Z" fill={LOOKS.rescuer.shirt} />
          <circle cx={134} cy={86 + sink * 0.1} r={13 + pulse * 3} fill="none" stroke={COLORS.red} strokeWidth={1.4} opacity={pulse} />
          <rect x={120} y={54} width={28} height={40} rx={9} fill={shade(LOOKS.rescuer.skin, -0.12)} stroke={INK} strokeWidth={0.8} />
          {[123.5, 130.5, 137.5, 144.5].map(x => <path key={x} d={capsule([x, 58], [x, 34], 3.1, 2.7)} fill={shade(LOOKS.rescuer.skin, -0.12)} stroke={INK} strokeWidth={0.7} />)}
          <path d={capsule([146, 82], [158, 70], 3.4, 3)} fill={shade(LOOKS.rescuer.skin, -0.12)} stroke={INK} strokeWidth={0.7} />
          <rect x={121} y={60} width={27} height={36} rx={9} fill={LOOKS.rescuer.skin} stroke={INK} strokeWidth={0.8} />
          {[127, 134, 141].map(x => <path key={x} d={capsule([x, 62], [x, 49], 3, 2.7)} fill={LOOKS.rescuer.skin} stroke={INK} strokeWidth={0.7} />)}
          <path d={capsule([122, 84], [111, 74], 3.4, 3)} fill={LOOKS.rescuer.skin} stroke={INK} strokeWidth={0.7} />
          <ellipse cx={134} cy={90} rx={9} ry={4} fill={COLORS.red} opacity={0.25 + pulse * 0.35} />
        </g>
      )}
    </g>
  );
}

/* ── Airway: head in profile with the tongue and windpipe ─────── */
export function AirwayHead({ tilt }) {
  const k = clamp01(tilt / 24);
  const tongueX = lerp(1.2, 6.6, k);
  const open = k > 0.7;
  return (
    <g>
      <g transform="translate(70 126) scale(2.35)">
        <path d={capsule([0, 2], [0, 22], 7, 7.5)} fill={SKIN} stroke={INK} strokeWidth={0.4} />
        <path d="M-1.6 0 L-1.6 22 M2.6 0 L2.6 22" stroke="#E9A2A2" strokeWidth={0.8} />
        <rect x={-1.6} y={0} width={4.2} height={22} fill="#F6D2D2" />
        <g transform={`rotate(${-tilt})`}>
          <ProfileHead look={LOOKS.casualty} face="closed" mouth={0.2} />
          <path d="M-3.4 -15 C-3.6 -9 -2.4 -3 -1.6 1 L2.6 1 C3 -3 4 -8 8 -11 L12.5 -12 L12.5 -13.6 L4 -14.8 Z" fill="#F6D2D2" stroke="#D98C8C" strokeWidth={0.5} />
          <ellipse cx={tongueX} cy={-11.8} rx={5.6} ry={3.1} transform={`rotate(${lerp(18, 4, k)} ${tongueX} -11.8)`} fill="#D96B7B" stroke="#B04B5B" strokeWidth={0.5} />
          {open && <path d="M13 -14 C6 -16 -1 -15 0 -6 L0.5 12" fill="none" stroke={COLORS.blue} strokeWidth={0.8} strokeDasharray="1.6 1.4" />}
        </g>
      </g>
      <InsetText x={150} y={36} lines={open ? ["Airway open", "Head tilted back,", "chin lifted: the tongue", "is pulled forward off", "the back of the throat."] : ["Airway blocked", "Head flat: the relaxed", "tongue falls back and", "closes the throat."]} color={open ? COLORS.green : COLORS.red} />
    </g>
  );
}

/* ── Breathing trace: normal vs agonal gasps ──────────────────── */
export function BreathTrace({ t }) {
  const row = (y, fn, color) => {
    const points = [];
    for (let x = 18; x <= 244; x += 3) {
      const time = t - (244 - x) / 226 * 12;
      points.push(`${x},${(y - fn(time) * 22).toFixed(1)}`);
    }
    return <polyline points={points.join(" ")} fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />;
  };
  const normal = time => (Math.sin(time * Math.PI * 2 / 4) + 1) / 2;
  const gasp = time => { const m = ((time % 7) + 7) % 7; return m < 0.6 ? Math.sin(m / 0.6 * Math.PI) : 0; };
  return (
    <g>
      <InsetText x={18} y={20} lines="Normal breathing: regular, quiet, 12–20 a minute" color={COLORS.green} />
      <line x1={18} y1={70} x2={244} y2={70} stroke="#E1E6EF" />
      {row(70, normal, COLORS.green)}
      <InsetText x={18} y={102} lines="NOT normal: occasional gasps or none" color={COLORS.red} />
      <line x1={18} y1={152} x2={244} y2={152} stroke="#E1E6EF" />
      {row(152, gasp, COLORS.red)}
      <line x1={244} y1={26} x2={244} y2={160} stroke={COLORS.muted} strokeDasharray="2 2" />
    </g>
  );
}

/* ── AED sign ─────────────────────────────────────────────────── */
export function AedSign({ x, y, size = 60 }) {
  const s = size / 60;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect width={60} height={60} rx={8} fill="#0A8F4A" />
      <path d="M30 50 C14 40 8 31 8 23 C8 15 14 10 20.5 10 C25 10 28.5 12.5 30 16 C31.5 12.5 35 10 39.5 10 C46 10 52 15 52 23 C52 31 46 40 30 50Z" fill="#fff" />
      <path d="M33 15 L24 31 L30 31 L26 45 L37 27 L31 27 L35 15Z" fill="#0A8F4A" />
      <path d="M44 6 L47 6 M45.5 4.5 L45.5 7.5" stroke="#fff" strokeWidth={1.6} />
    </g>
  );
}

/* ── Front of torso with landmarks (local 0–120 × 0–150) ──────── */
export const TORSO_MARKS = {
  notch: [60, 24], xiphoid: [60, 74], navel: [60, 110], nippleL: [40, 54], nippleR: [80, 54],
  padUpper: [36, 34], padLower: [92, 70], thrust: [60, 92],
};

export function TorsoFront({ x = 0, y = 0, s = 1, skin = SKIN, children }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M50 0 L70 0 L72 14 Q96 14 108 22 Q116 28 116 46 L114 70 L104 70 L102 48 Q100 80 98 104 Q96 128 102 150 L18 150 Q24 128 22 104 Q20 80 18 48 L16 70 L6 70 L4 46 Q4 28 12 22 Q24 14 48 14 Z" fill={skin} stroke={INK} strokeWidth={0.9} />
      <path d="M60 24 Q42 20 22 22 M60 24 Q78 20 98 22" fill="none" stroke={shade(skin, -0.22)} strokeWidth={1.6} />
      <rect x={56.5} y={24} width={7} height={50} rx={3.5} fill={BONE} opacity={0.75} />
      <circle cx={40} cy={54} r={2.2} fill={shade(skin, -0.35)} />
      <circle cx={80} cy={54} r={2.2} fill={shade(skin, -0.35)} />
      <path d="M57 110 Q60 113 63 110" fill="none" stroke={shade(skin, -0.45)} strokeWidth={1.2} />
      <path d="M22 76 Q60 92 98 76" fill="none" stroke={shade(skin, -0.14)} strokeWidth={1} />
      {children}
    </g>
  );
}

/* ── Back view with shoulder blades (same frame as TorsoFront) ── */
export function TorsoBack({ x = 0, y = 0, s = 1, skin = SKIN, shirt = LOOKS.casualty.shirt, children }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx={60} cy={-14} rx={15} ry={17} fill={LOOKS.casualty.hair} />
      <rect x={52} y={-2} width={16} height={16} fill={skin} />
      <path d="M48 14 Q24 14 12 22 Q4 28 4 46 L6 70 L16 70 L18 48 Q20 80 22 104 Q24 128 18 150 L102 150 Q96 128 98 104 Q100 80 102 48 L104 70 L114 70 L116 46 Q116 28 108 22 Q96 14 72 14 Z" fill={shirt} stroke={INK} strokeWidth={0.9} />
      <path d="M30 26 L52 30 L44 68 Z M90 26 L68 30 L76 68 Z" fill={shade(shirt, -0.1)} stroke={INK} strokeWidth={0.9} />
      <line x1={60} y1={16} x2={60} y2={140} stroke={shade(shirt, -0.25)} strokeWidth={1.2} strokeDasharray="4 3" />
      {children}
    </g>
  );
}

/* ── Leg seen from the side for tourniquet placement ──────────── */
export function LegDiagram({ tight = 0 }) {
  return (
    <g>
      <path d="M14 70 Q14 52 30 52 L146 60 Q160 56 172 62 L238 72 L238 92 L172 98 Q160 104 146 100 L30 108 Q14 108 14 90Z" fill={LOOKS.casualty.skin} stroke={INK} strokeWidth={0.9} />
      <circle cx={160} cy={80} r={13} fill="none" stroke={COLORS.red} strokeWidth={1.2} strokeDasharray="3 2" />
      <text x={160} y={124} textAnchor="middle" fontSize={8.5} fill={COLORS.red} style={label}>knee: never here</text>
      <path d="M104 72 Q110 78 116 74 Q112 82 106 80Z" fill={COLORS.blood} />
      <text x={110} y={48} textAnchor="middle" fontSize={8.5} fill={COLORS.blood} style={label}>wound</text>
      <rect x={76} y={50} width={10} height={60} rx={2} fill="#2B2B2B" />
      <rect x={70} y={44} width={22} height={6} rx={2} fill="#555" transform={`rotate(${tight * 360} 81 47)`} />
      <path d="M81 132 L81 136 L106 136 L106 132" fill="none" stroke={COLORS.blue} strokeWidth={1.2} />
      <text x={93} y={148} textAnchor="middle" fontSize={8.5} fontWeight={700} fill={COLORS.blue} style={label}>5–7 cm above</text>
    </g>
  );
}

/* ── Stop · drop · roll pictogram strip ───────────────────────── */
export function StopDropRoll({ t }) {
  const roll = Math.sin(t * 3) * 6;
  const standing = { hip: [0, -130], torso: -90, facing: 1, face: "distress", mouth: 0.3, armN: { to: [10, -60] }, armF: { to: [-4, -62] }, legN: { to: [4, -7] }, legF: { to: [-6, -7] } };
  const kneeling = { hip: [0, -70], torso: -60, facing: 1, head: -20, face: "closed", armN: { to: [40, -12], bend: -1 }, armF: { to: [36, -10], bend: -1 }, legN: { to: [-50, -7] }, legF: { to: [-48, -9] } };
  const lying = { hip: [40, -17 - Math.abs(roll) * 0.4], torso: 180 + roll, facing: 1, face: "closed", armN: { to: [-30, -50] }, armF: { to: [-26, -48] }, legN: { to: [168, -9] }, legF: { to: [165, -11] } };
  return (
    <g>
      {[["Stop", standing, 38], ["Drop", kneeling, 118], ["Roll", lying, 170]].map(([name, pose, x]) => (
        <g key={name}>
          <g transform={`translate(${x} 142) scale(0.42)`}><Profile pose={pose} look={LOOKS.casualty} /></g>
          <text x={name === "Roll" ? 214 : x + 4} y={164} textAnchor="middle" fontSize={10} fontWeight={700} fill={COLORS.red} style={label}>{name}</text>
        </g>
      ))}
      <line x1={8} y1={142} x2={252} y2={142} stroke="#B7C2D6" />
      <InsetText x={10} y={16} lines="Clothes on fire? Cover the face, drop to the floor and roll." size={8.5} />
    </g>
  );
}

/* ── Forearm close-up for burns (elbow left, hand right) ──────── */
export function ArmCloseUp({ burn = 1, stream = null, film = 0, wrap = false, ring = 0, watch = 0, powder = 0, gloveHand = null }) {
  const skin = LOOKS.casualty.skin;
  return (
    <g>
      <path d="M0 76 L150 82 Q164 78 176 80 L214 84 Q228 84 232 92 Q230 100 214 102 L176 104 Q164 106 150 104 L0 112Z" fill={skin} stroke={INK} strokeWidth={0.9} />
      {[0, 1, 2, 3].map(i => <path key={i} d={capsule([214, 86 + i * 4.4], [246 - Math.abs(i - 1.5) * 4, 86 + i * 4.4], 2.3, 2)} fill={skin} stroke={INK} strokeWidth={0.6} />)}
      <path d={capsule([180, 80], [196, 72], 3, 2.6)} fill={skin} stroke={INK} strokeWidth={0.6} />
      <ellipse cx={95} cy={94} rx={40} ry={11} fill="#D9473A" opacity={0.55 * burn + 0.08} />
      <ellipse cx={95} cy={94} rx={24} ry={6} fill="#B7221A" opacity={0.45 * burn} />
      {powder > 0 && Array.from({ length: 22 }, (_, i) => (
        <circle key={i} cx={64 + (i * 37) % 64} cy={86 + (i * 13) % 16 + (1 - powder) * 40 * ((i % 3) + 1) / 3} r={1.4} fill="#7A7F87" opacity={powder} />
      ))}
      {watch > 0 && <rect x={lerp(162, 250, 1 - watch)} y={76} width={12} height={32} rx={3} fill="#3C4458" opacity={watch} />}
      {ring > 0 && <rect x={lerp(226, 252, 1 - ring)} y={88.5} width={4} height={6} rx={1} fill="#D4A017" opacity={ring} />}
      {stream && (
        <g>
          <rect x={stream.x - 5} y={0} width={10} height={80} fill={SCENE.water} opacity={0.55} />
          <path d={`M${stream.x} 0 L${stream.x} 80`} stroke="#fff" strokeWidth={2} strokeDasharray="6 8" strokeDashoffset={-stream.t * 60} opacity={0.8} />
          {[0, 1, 2, 3].map(i => <circle key={i} cx={stream.x - 16 + i * 10} cy={74 - ((stream.t * 3 + i * 0.3) % 1) * 10} r={1.6} fill={SCENE.water} />)}
        </g>
      )}
      {film > 0 && [0, 1, 2].slice(0, Math.ceil(film * 3)).map(i => (
        <rect key={i} x={52} y={80 + i * 9} width={88 * clamp01(film * 3 - i)} height={11} fill="#DDEFFF" opacity={0.55} stroke="#9CC9F0" strokeWidth={0.8} />
      ))}
      {wrap && [0, 1, 2, 3, 4].map(i => <path key={i} d={`M${56 + i * 18} 72 L${70 + i * 18} 116`} stroke="#9CC9F0" strokeWidth={9} opacity={0.55} />)}
      {gloveHand && <path d={capsule(gloveHand, [gloveHand[0] + 26, gloveHand[1] - 8], 7, 6)} fill={GLOVE} stroke={INK} strokeWidth={0.8} />}
    </g>
  );
}

export function DontItem({ x, y, text }) {
  return (
    <g>
      <rect x={x} y={y} width={112} height={30} rx={5} fill="#FFF1F1" stroke="#F3B3B3" />
      <path d={`M${x + 10} ${y + 9} L${x + 22} ${y + 21} M${x + 22} ${y + 9} L${x + 10} ${y + 21}`} stroke={COLORS.red} strokeWidth={2.2} strokeLinecap="round" />
      <text x={x + 30} y={y + 19} fontSize={10} fontWeight={600} fill={INK} style={label}>{text}</text>
    </g>
  );
}
