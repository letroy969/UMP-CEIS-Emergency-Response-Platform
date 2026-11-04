/* Burns simulation scenes: kitchen burn to the forearm, chemical and electrical burns. */
import { BODY, COLORS, LOOKS, clamp01, lerp, mix, phase, profileRig, shade, solveLimb } from "./rig.js";
import { Arrow, Callout, Check, Cross, Floor, GroundShadow, Panel, Phone, Profile, Tag, TimerRing } from "./figures.jsx";
import { ArmCloseUp, DontItem, InsetText, StopDropRoll, TorsoFront } from "./diagrams.jsx";

const G = 318;
const font = { fontFamily: "'IBM Plex Sans',sans-serif" };

/* ── Kitchen: stove on the left, sink on the right ────────────── */
const SINK_CAS = {
  hip: [440, G - 128], torso: -72, facing: 1, head: -10, face: "distress", mouth: 0.15,
  legN: { to: [452, G - 6] }, legF: { to: [428, G - 6] },
  armN: { to: [526, 192], hand: 4 }, armF: { to: [486, 204], hand: 0 },
};
const SINK_RIG = profileRig(SINK_CAS);
const ELBOW = solveLimb(SINK_RIG.shoulder, SINK_CAS.armN.to, BODY.upperArm, BODY.forearm, 1).mid;
const BURN = [(ELBOW[0] + SINK_CAS.armN.to[0]) / 2, (ELBOW[1] + SINK_CAS.armN.to[1]) / 2];
const SPOUT = [BURN[0], 148];

function Counter() {
  return (
    <g>
      <rect x={470} y={206} width={170} height={G - 206} fill="#E7DCCB" stroke="#B9A88E" />
      <rect x={462} y={200} width={178} height={8} rx={2} fill="#C9B79B" />
      <rect x={490} y={208} width={96} height={30} rx={4} fill="#9FB3C8" />
      {[0, 1].map(i => <rect key={i} x={482 + i * 80} y={250} width={66} height={56} rx={3} fill="none" stroke="#B9A88E" />)}
      <path d={`M${SPOUT[0] + 44} 200 L${SPOUT[0] + 44} 140 Q${SPOUT[0] + 44} 128 ${SPOUT[0] + 30} 128 L${SPOUT[0] + 6} 128 Q${SPOUT[0]} 128 ${SPOUT[0]} ${SPOUT[1] - 8}`} fill="none" stroke="#9AA3AE" strokeWidth={6} strokeLinecap="round" />
      <rect x={SPOUT[0] + 38} y={176} width={14} height={6} rx={2} fill="#9AA3AE" />
    </g>
  );
}

function Stream({ t, width = 6 }) {
  return (
    <g>
      <rect x={SPOUT[0] - width / 2} y={SPOUT[1] - 6} width={width} height={BURN[1] - SPOUT[1] - 1} fill="#7CC4FF" opacity={0.75} />
      <line x1={SPOUT[0]} y1={SPOUT[1]} x2={SPOUT[0]} y2={BURN[1] - 8} stroke="#fff" strokeWidth={1.4} strokeDasharray="5 7" strokeDashoffset={-t * 60} />
      {[0, 1, 2, 3, 4].map(i => {
        const p = (t * 2 + i / 5) % 1;
        return <circle key={i} cx={BURN[0] - 10 + i * 5} cy={BURN[1] + 8 + p * 30} r={1.6} fill="#7CC4FF" opacity={1 - p} />;
      })}
    </g>
  );
}

function BurnMark({ k = 1 }) {
  return <ellipse cx={BURN[0]} cy={BURN[1] - 1} rx={12} ry={5} fill="#D9473A" opacity={0.35 + 0.5 * k} transform={`rotate(10 ${BURN[0]} ${BURN[1]})`} />;
}

function Blanket({ rig, on = 1 }) {
  if (on <= 0) return null;
  const p = [rig.local([-4, -1.02 * 92]), rig.local([-19, -0.8 * 92]), rig.local([-20, -0.42 * 92]), rig.local([16, -0.5 * 92]), rig.local([19, -0.86 * 92]), rig.local([8, -1.0 * 92])];
  return <path d={`M${p.map(q => q.join(" ")).join(" L")}Z`} fill="#B5482E" stroke="#7E2F1D" opacity={0.92 * on} />;
}

function SinkScene({ t, rescuerArm = null, blanket = 0, burnK = 1, children }) {
  const rescuer = {
    hip: [372, G - 130], torso: -84, facing: 1, head: 0, face: "open",
    legN: { to: [380, G - 6] }, legF: { to: [362, G - 6] },
    armF: { to: [392, G - 70] },
    armN: rescuerArm || { to: SINK_RIG.local([-20, -0.7 * 92]), hand: 20 },
  };
  return (
    <>
      <Floor y={G} />
      <Counter />
      <GroundShadow x={410} y={G + 2} rx={80} />
      <Profile pose={rescuer} look={LOOKS.rescuer} layer="body" />
      <Profile pose={SINK_CAS} look={LOOKS.casualty} />
      <BurnMark k={burnK} />
      <Blanket rig={SINK_RIG} on={blanket} />
      <Profile pose={rescuer} look={LOOKS.rescuer} layer="nearArm" />
      {children}
      <Stream t={t} />
    </>
  );
}

/* Close-up frame: ArmCloseUp scaled up to fill the main view. */
const CLOSE = { x: 6, y: -64, s: 2.4 };
const C = p => [CLOSE.x + p[0] * CLOSE.s, CLOSE.y + p[1] * CLOSE.s];

function CloseUp({ children, overlay }) {
  return (
    <>
      <rect x={0} y={0} width={640} height={360} fill="#EEF2F7" />
      <g transform={`translate(${CLOSE.x} ${CLOSE.y}) scale(${CLOSE.s})`}>{children}</g>
      {overlay}
    </>
  );
}

function walk(x, t, facing) {
  const s = Math.sin(t * 6.5), c = Math.cos(t * 6.5);
  const hip = [x, G - 129 + Math.abs(s) * 2];
  return {
    hip, torso: -90 + facing * 4, facing, face: "open",
    legN: { to: [x + facing * 24 * s, G - 6 - Math.max(0, c) * 8] },
    legF: { to: [x - facing * 24 * s, G - 6 - Math.max(0, -c) * 8] },
    armN: { to: [x - facing * 18 * s, hip[1] + 8] }, armF: { to: [x + facing * 18 * s, hip[1] + 8] },
  };
}

function Stove({ flame, t }) {
  const f = Math.sin(t * 13) * 3;
  return (
    <g>
      <rect x={30} y={G - 108} width={140} height={108} fill="#D8DEE6" stroke="#9AA3AE" />
      <rect x={24} y={G - 114} width={152} height={8} rx={2} fill="#5E6670" />
      <circle cx={150} cy={G - 92} r={6} fill="#3C4458" />
      <rect x={60} y={G - 150} width={70} height={36} rx={4} fill="#4A4F58" />
      <rect x={128} y={G - 140} width={36} height={6} rx={3} fill="#4A4F58" />
      {flame > 0.02 && (
        <g transform={`translate(95 ${G - 150}) scale(${flame})`}>
          <path d={`M-30 0 C-30 -30 -12 -24 -10 ${-52 + f} C-2 -28 8 -40 6 ${-64 - f} C22 -34 30 -32 30 0Z`} fill="#F57C00" />
          <path d={`M-16 0 C-16 -18 -6 -16 -4 ${-34 + f} C2 -18 10 -26 10 ${-40 - f} C18 -20 18 -16 18 0Z`} fill="#FFD54F" />
        </g>
      )}
    </g>
  );
}

/* ── Steps ────────────────────────────────────────────────────── */
const step1 = {
  label: "A pan catches fire; the person pulls away and the rescuer switches off the stove once it is safe.",
  rest: 4.9,
  main: t => {
    const k = t % 8;
    const flinch = phase(k, 1.1, 0.3);
    let cas;
    if (k < 1.5) {
      cas = { hip: [214, G - 129], torso: -96, facing: -1, head: 0, face: flinch > 0.5 ? "distress" : "open", mouth: flinch * 0.5,
        legN: { to: [206, G - 6] }, legF: { to: [222, G - 6] },
        armN: { to: mix([124, G - 150], [190, G - 160], flinch) }, armF: { to: [222, G - 66] } };
    } else if (k < 3.6) {
      cas = { ...walk(lerp(214, 330, (k - 1.5) / 2.1), k, 1), face: "distress", mouth: 0.3 };
    } else {
      cas = { hip: [330, G - 130], torso: -88, facing: 1, head: -8, face: "distress", mouth: 0.2, legN: { to: [338, G - 6] }, legF: { to: [322, G - 6] }, armN: { to: [352, G - 150], hand: -40 }, armF: { to: [344, G - 146] } };
    }
    const resX = k < 1.5 ? 640 : k < 4 ? lerp(640, 214, (k - 1.5) / 2.5) : 214;
    const knob = phase(k, 4, 0.7);
    const rescuer = k < 4
      ? walk(resX, k, -1)
      : { hip: [214, G - 128], torso: -90 - 34 * knob, facing: -1, head: 0, face: "open", legN: { to: [206, G - 6] }, legF: { to: [224, G - 6] }, armN: { to: mix([200, G - 66], [156, G - 98], knob), hand: 200 }, armF: { to: [224, G - 66] } };
    const flame = 1 - phase(k, 4.6, 0.8);
    return (
      <>
        <Floor y={G} />
        <Stove flame={flame} t={t} />
        <GroundShadow x={260} y={G + 2} rx={120} />
        <Profile pose={rescuer} look={LOOKS.rescuer} />
        <Profile pose={cas} look={LOOKS.casualty} />
        {k > 1.5 && k < 3.6 && <Arrow from={[300, 120]} to={[360, 120]} color={COLORS.green} />}
        <Callout at={[150, G - 92]} to={[236, 50]} text={["Switch off the heat", "only if it is safe"]} />
        {k >= 3.6 && <Callout at={[352, G - 150]} to={[440, 130]} text={["Move them away", "from the heat source"]} />}
        {k < 1.5 && <Tag x={16} y={16} text="Burn!" color={COLORS.red} size={12} />}
      </>
    );
  },
  insets: [
    { title: "Clothes on fire", render: t => <StopDropRoll t={t} /> },
    {
      title: "Your safety first",
      render: () => <InsetText x={14} y={28} size={10} lines={["Never enter smoke or flames.", "Don't throw water on burning oil —", "cover the pan with a lid or damp cloth.", "Smother burning clothes with a heavy", "blanket or coat.", "Call 10177, or 112 from a mobile."]} />,
    },
  ],
  checks: ["Make sure you are safe", "Move the person from the heat", "Stop, drop and roll for burning clothes"],
};

const step2 = {
  label: "The burned forearm is held under cool running water for 20 minutes while the rescuer keeps the person warm.",
  rest: 4,
  main: t => {
    const k = t % 12;
    const minutes = Math.min(20, k / 10 * 20);
    const blanket = phase(k, 1.5, 1);
    return (
      <SinkScene t={t} blanket={blanket} burnK={1 - minutes / 30}>
        <TimerRing x={52} y={58} r={32} progress={minutes / 20} label={`${String(Math.floor(minutes)).padStart(2, "0")}:00`} color={COLORS.blue} />
        <text x={94} y={50} fontSize={11} fontWeight={700} fill={COLORS.ink} style={font}>Cool for 20 minutes</text>
        <text x={94} y={65} fontSize={9.5} fill={COLORS.muted} style={font}>shown speeded up</text>
        <Callout at={[SPOUT[0], SPOUT[1] + 12]} to={[600, 60]} anchor="end" text={["Cool or lukewarm", "running water"]} />
        {blanket > 0.5 && <Callout at={SINK_RIG.local([-18, -0.7 * 92])} to={[250, 130]} anchor="end" text={["Keep the rest of", "them warm"]} />}
        <Tag x={16} y={100} text="No ice or iced water" color={COLORS.red} size={11} />
      </SinkScene>
    );
  },
  insets: [
    { title: "Under the tap", render: t => <ArmCloseUp burn={1 - Math.min(1, (t % 12) / 10) * 0.6} stream={{ x: 95, t }} /> },
    {
      title: "Never put on a burn",
      render: () => (
        <g>
          <DontItem x={10} y={14} text="Ice" />
          <DontItem x={136} y={14} text="Butter / oil" />
          <DontItem x={10} y={54} text="Toothpaste" />
          <DontItem x={136} y={54} text="Creams" />
          <InsetText x={14} y={110} size={9.4} lines={["Cooling still helps up to 3 hours after", "the burn. Start as soon as you can."]} />
        </g>
      ),
    },
  ],
  checks: ["Cool running water, 20 minutes", "Start as soon as possible", "No ice; keep the person warm"],
};

const step3 = {
  label: "While the burn cools, the rescuer slides off a watch and a ring before the area swells.",
  rest: 2.4,
  main: t => {
    const k = t % 6;
    const watch = phase(k, 0.6, 1.8);
    const ring = phase(k, 3, 1.4);
    const wx = lerp(162, 262, watch);
    const rx = lerp(226, 262, ring);
    return (
      <CloseUp overlay={<>
        <Callout at={C([wx + 6, 76])} to={[230, 50]} anchor="end" text={["Remove watches and bracelets", "before the arm swells"]} />
        <Callout at={C([rx + 2, 89])} to={[420, 330]} text={["Slide rings off gently"]} />
        <Tag x={16} y={16} text="Leave anything stuck to the burn" color={COLORS.red} size={11} />
      </>}>
        <ArmCloseUp burn={0.7} stream={{ x: 95, t }} />
        <rect x={wx} y={76} width={12} height={32} rx={3} fill="#3C4458" opacity={1 - clamp01((watch - 0.85) * 6)} />
        <rect x={rx} y={88.5} width={4} height={6} rx={1} fill="#D4A017" opacity={1 - clamp01((ring - 0.85) * 6)} />
        <path d={`M${wx + 4} 70 q10 -10 22 -6 l-4 10z`} fill={LOOKS.rescuer.skin} stroke={shade(LOOKS.rescuer.skin, -0.3)} strokeWidth={0.6} />
        <path d={`M${rx + 1} 112 q8 10 20 6 l-4 -8z`} fill={LOOKS.rescuer.skin} stroke={shade(LOOKS.rescuer.skin, -0.3)} strokeWidth={0.6} opacity={k > 2.8 ? 1 : 0} />
      </CloseUp>
    );
  },
  insets: [
    {
      title: "Stuck clothing",
      render: () => <InsetText x={14} y={28} size={10} lines={["If fabric is melted or stuck to the", "burn, leave it — pulling it off tears", "the skin. Cut around it if needed and", "cool over the top.", "", "Hospital staff will remove it."]} />,
    },
    {
      title: "Why now?",
      render: () => <InsetText x={14} y={28} size={10} lines={["Burns swell quickly. A ring or watch", "left on can cut off the blood supply", "to the hand within an hour."]} />,
    },
  ],
  checks: ["Remove jewellery early", "Loosen tight clothing near the burn", "Leave anything stuck to the skin"],
};

const step4 = {
  label: "After cooling, strips of cling film are laid along the burn instead of being wrapped around the arm.",
  rest: 3.6,
  main: t => {
    const k = t % 6;
    const film = clamp01((k - 0.4) / 3.6);
    const strip = Math.min(2, Math.floor(film * 3));
    const handX = 52 + 88 * clamp01(film * 3 - strip);
    return (
      <CloseUp overlay={<>
        <Callout at={C([120, 82])} to={[620, 40]} anchor="end" text={["Lay strips ALONG the burn —", "don't wrap around the limb"]} />
        <Callout at={C([96, 104])} to={[560, 330]} anchor="end" text={["Loose cover: the burn will swell"]} />
        <Tag x={16} y={16} text="No creams · don't burst blisters" color={COLORS.red} size={11} />
      </>}>
        <ArmCloseUp burn={0.5} film={film} />
        {film < 1 && <path d={`M${handX - 6} ${74 + strip * 9} q10 -14 26 -8 l-6 12z`} fill={LOOKS.rescuer.skin} stroke={shade(LOOKS.rescuer.skin, -0.3)} strokeWidth={0.6} />}
      </CloseUp>
    );
  },
  insets: [
    {
      title: "Right",
      render: () => (
        <g>
          <g transform="translate(0 -20)"><ArmCloseUp burn={0.5} film={1} /></g>
          <Check x={20} y={140} />
          <InsetText x={36} y={144} size={10} lines={["Strips laid along the burn"]} color={COLORS.green} />
        </g>
      ),
    },
    {
      title: "Wrong",
      render: () => (
        <g>
          <g transform="translate(0 -20)"><ArmCloseUp burn={0.5} wrap /></g>
          <Cross x={20} y={140} size={6} />
          <InsetText x={36} y={144} size={10} lines={["Wrapped tightly round the arm"]} color={COLORS.red} />
        </g>
      ),
    },
  ],
  checks: ["Cool first for 20 minutes", "Cling film in strips, or a non-fluffy dressing", "Nothing greasy; leave blisters intact"],
};

const step5 = {
  label: "Wearing gloves, the rescuer brushes dry chemical powder off the arm and then flushes it with plenty of running water.",
  rest: 1.6,
  main: t => {
    const k = t % 10;
    const brush = clamp01(k / 2.6);
    const flushing = k > 3;
    const minutes = flushing ? Math.min(20, (k - 3) / 6 * 20) : 0;
    const gx = 60 + Math.abs(Math.sin(k * 3)) * 70;
    return (
      <CloseUp overlay={<>
        {!flushing && <Callout at={C([gx + 10, 76])} to={[230, 40]} anchor="end" text={["Gloves on, then brush", "off any dry chemical first"]} />}
        {flushing && <>
          <TimerRing x={52} y={300} r={30} progress={minutes / 20} label={`${String(Math.floor(minutes)).padStart(2, "0")}:00`} />
          <Callout at={C([95, 60])} to={[620, 40]} anchor="end" text={["Flush with plenty of running", "water for at least 20 minutes"]} />
        </>}
        <Tag x={430} y={322} text="Call 10177 · note the chemical name" color={COLORS.red} size={11} />
      </>}>
        <ArmCloseUp burn={0.6} powder={1 - brush} stream={flushing ? { x: 95, t } : null} gloveHand={!flushing ? [gx, 70] : null} />
        {flushing && <rect x={70} y={0} width={50} height={80} fill="#7CC4FF" opacity={0.35} />}
      </CloseUp>
    );
  },
  insets: [
    {
      title: "Protect yourself",
      render: () => <InsetText x={14} y={28} size={10} lines={["Wear gloves — and eye protection if", "there's a splash risk.", "Remove contaminated clothing and", "jewellery while flushing.", "Let the runoff drain away from", "unburnt skin."]} />,
    },
    {
      title: "Chemical in the eye?",
      render: () => <InsetText x={14} y={28} size={10} lines={["Hold the eye open under gently", "running water for at least", "20 minutes, injured eye lowest so", "water runs away from the other eye.", "", "Keep the container for responders."]} />,
    },
  ],
  checks: ["Gloves on before touching", "Brush off powder, then flush 20+ minutes", "Call 10177 with the chemical name"],
};

/* Electrical: casualty on the floor still holding a plugged-in appliance. */
const ELEC_CAS = { hip: [372, G - 17], torso: 180, facing: 1, head: 0, face: "closed", armN: { to: [470, G - 12] }, armF: { to: [466, G - 14] }, legN: { to: [500, G - 9] }, legF: { to: [497, G - 11] } };

const step6 = {
  label: "The rescuer stays clear, switches the power off at the wall, then checks the person's breathing.",
  rest: 2.4,
  main: t => {
    const k = t % 9;
    const off = k > 2.6;
    const switchK = phase(k, 2.1, 0.5);
    let rescuer;
    if (k < 1.2) rescuer = { hip: [560, G - 130], torso: -90, facing: -1, face: "open", head: 0, legN: { to: [552, G - 6] }, legF: { to: [568, G - 6] }, armN: { to: [520, G - 160], hand: 250 }, armF: { to: [568, G - 66] } };
    else if (k < 3) rescuer = { hip: [572, G - 130], torso: -86, facing: 1, face: "open", head: 0, legN: { to: [580, G - 6] }, legF: { to: [566, G - 6] }, armN: { to: mix([590, G - 120], [606, 190], switchK), hand: -60 }, armF: { to: [566, G - 66] } };
    else if (k < 5.2) rescuer = walk(lerp(572, 300, (k - 3) / 2.2), k, -1);
    else {
      const kneel = phase(k, 5.2, 0.8);
      rescuer = mix(walk(300, 5.2, -1), { hip: [300, G - 66], torso: -110, facing: -1, head: -30, face: "open", legN: { to: [360, G - 7], foot: 0 }, legF: { to: [356, G - 9], foot: 0 }, armN: { to: [262, G - 34] }, armF: { to: [270, G - 30] } }, kneel);
    }
    return (
      <>
        <Floor y={G} />
        <rect x={588} y={176} width={30} height={48} rx={4} fill="#F4F4F4" stroke="#9AA3AE" />
        <rect x={597} y={182} width={12} height={14} rx={2} fill={off ? "#C62828" : "#2E7D32"} />
        <text x={603} y={214} textAnchor="middle" fontSize={7} fill={COLORS.muted} style={font}>{off ? "OFF" : "ON"}</text>
        <path d={`M603 224 C600 280 ${560} ${G - 6} 470 ${G - 8}`} fill="none" stroke="#222" strokeWidth={2.4} />
        <rect x={468} y={G - 24} width={26} height={22} rx={5} fill="#E9EDF2" stroke="#8C96A3" />
        <GroundShadow x={380} y={G + 2} rx={140} />
        {k >= 3 && <Profile pose={rescuer} look={LOOKS.rescuer} />}
        <Profile pose={ELEC_CAS} look={LOOKS.casualty} />
        {k < 3 && <Profile pose={rescuer} look={LOOKS.rescuer} />}
        {!off && [0, 1, 2, 3].map(i => {
          const a = (t * 9 + i * 1.7) % 6.28;
          return <path key={i} d={`M478 ${G - 18} l${Math.cos(a) * 10} ${Math.sin(a) * 8} l4 -6 l${Math.cos(a) * 8} ${Math.sin(a) * 6}`} fill="none" stroke="#FFB300" strokeWidth={1.8} />;
        })}
        {k < 1.4 && <Tag x={16} y={16} text="STOP — don't touch them while the power is on" color={COLORS.red} size={11} />}
        {k >= 1.4 && k < 3 && <Callout at={[606, 190]} to={[440, 60]} text={["Switch off at the plug", "or the mains first"]} />}
        {k >= 5.6 && <><Phone x={180} y={274} t={k} /><Panel x={16} y={16} w={286} color={COLORS.red} title="Power off: now you can help" lines={["Call 10177 — electrical burns always need hospital", "Check breathing; start CPR if not normal", "Cool any visible burns with running water"]} /></>}
      </>
    );
  },
  insets: [
    {
      title: "High-voltage lines",
      render: () => <InsetText x={14} y={28} size={10} lines={["Overhead or underground power lines:", "stay at least 18 metres away and keep", "others back. Call 10177 and wait for", "the power company — you cannot make", "it safe yourself."]} />,
    },
    {
      title: "Hidden damage",
      render: () => <InsetText x={14} y={28} size={10} lines={["A small mark where the current went in", "and out can hide deep damage to", "muscles and the heart.", "", "Always go to hospital, even if the", "person feels fine."]} />,
    },
  ],
  checks: ["Don't touch until the power is off", "Call 10177", "Check breathing; CPR if needed"],
};

/* When to get emergency care: body map with the high-risk areas. */
const BODY_ORIGIN = [128, 66];
const BS = 0.62;
const B = p => [BODY_ORIGIN[0] + p[0] * BS, BODY_ORIGIN[1] + p[1] * BS];

function BodyMap({ t }) {
  const pulse = 0.35 + 0.25 * Math.sin(t * 4);
  const skin = LOOKS.casualty.skin;
  const spots = [[60, -30, 22], [-8, 178, 13], [128, 178, 13], [36, 342, 13], [84, 342, 13], [60, 150, 12], [-2, 100, 10], [122, 100, 10], [36, 245, 11], [84, 245, 11]];
  return (
    <g transform={`translate(${BODY_ORIGIN[0]} ${BODY_ORIGIN[1]}) scale(${BS})`}>
      {[[[12, 30], [-2, 100], [-7, 168]], [[108, 30], [122, 100], [127, 168]]].map((arm, i) => (
        <g key={i} fill={skin} stroke={shade(skin, -0.3)}>
          <path d={`M${arm[0][0] - 9} ${arm[0][1]} L${arm[1][0] - 8} ${arm[1][1]} L${arm[2][0] - 7} ${arm[2][1]} L${arm[2][0] + 7} ${arm[2][1]} L${arm[1][0] + 8} ${arm[1][1]} L${arm[0][0] + 9} ${arm[0][1]}Z`} />
          <ellipse cx={arm[2][0]} cy={arm[2][1] + 12} rx={9} ry={14} />
        </g>
      ))}
      {[[38, 36], [82, 84]].map(([x, x2]) => (
        <g key={x} fill={skin} stroke={shade(skin, -0.3)}>
          <path d={`M${x - 18} 146 L${x - 12} 245 L${x - 9} 330 L${x + 9} 330 L${x + 12} 245 L${x + 18} 146Z`} />
          <ellipse cx={x2} cy={340} rx={14} ry={7} />
        </g>
      ))}
      <TorsoFront />
      <rect x={50} y={-12} width={20} height={20} fill={skin} />
      <ellipse cx={60} cy={-36} rx={24} ry={30} fill={skin} stroke={shade(skin, -0.3)} />
      <path d="M36 -44 C36 -72 84 -72 84 -44 C76 -56 44 -56 36 -44Z" fill={LOOKS.casualty.hair} />
      <circle cx={51} cy={-36} r={2.2} fill="#222" /><circle cx={69} cy={-36} r={2.2} fill="#222" />
      <path d="M53 -20 Q60 -16 67 -20" fill="none" stroke="#5A3520" strokeWidth={1.4} />
      {spots.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill={COLORS.red} opacity={pulse} />)}
    </g>
  );
}

function HandCompare() {
  const skin = LOOKS.casualty.skin;
  return (
    <g transform="translate(470 104)">
      <ellipse cx={30} cy={30} rx={62} ry={42} fill="#D9473A" opacity={0.6} />
      <path d="M8 60 L6 26 Q6 18 12 18 Q18 18 18 26 L18 6 Q18 -2 24 -2 Q30 -2 30 6 L30 2 Q30 -6 36 -6 Q42 -6 42 2 L42 8 Q42 0 48 0 Q54 0 54 8 L54 44 Q54 66 34 70 Q14 70 8 60Z" fill={skin} stroke={shade(skin, -0.35)} opacity={0.9} />
      <text x={30} y={98} textAnchor="middle" fontSize={10.5} fontWeight={700} fill={COLORS.red} style={font}>Larger than their hand</text>
      <text x={30} y={111} textAnchor="middle" fontSize={9.5} fill={COLORS.text} style={font}>(palm and fingers) → hospital</text>
    </g>
  );
}

const step7 = {
  label: "Body map highlighting burns that need emergency care: face, hands, feet, genitals, joints, and burns larger than the person's hand.",
  rest: 0.4,
  main: t => (
    <>
      <rect x={0} y={0} width={640} height={360} fill="#F4F6FA" />
      <BodyMap t={t} />
      <Callout at={B([82, -30])} to={[310, 40]} text="Face, neck or airway" color={COLORS.red} />
      <Callout at={B([136, 180])} to={[310, 186]} text="Hands" color={COLORS.red} />
      <Callout at={B([96, 342])} to={[310, 318]} text="Feet" color={COLORS.red} />
      <Callout at={B([70, 152])} to={[310, 150]} text="Genitals" color={COLORS.red} />
      <Callout at={B([132, 100])} to={[310, 100]} text="Over a joint" color={COLORS.red} />
      <Callout at={B([94, 245])} to={[310, 250]} text="Knees and other joints" color={COLORS.red} />
      <HandCompare />
      <Panel x={440} y={250} w={190} color={COLORS.red} title="Deep burns → hospital" lines={["White, leathery or charred", "Painless (nerves damaged)"]} />
      <Tag x={16} y={16} text="Call 10177 or go to hospital if any apply" color={COLORS.red} size={11} />
    </>
  ),
  insets: [
    {
      title: "Burn depth",
      render: () => (
        <g>
          {[["#E57373", "Red, painful, no blisters", "Usually minor"], ["#EF9A9A", "Blisters, very painful", "Get it checked"], ["#F2EDE4", "White or leathery", "Hospital"], ["#3B2A22", "Charred, black", "Hospital"]].map(([color, a, b], i) => (
            <g key={a}>
              <rect x={12} y={12 + i * 38} width={34} height={28} rx={5} fill={color} stroke="#B9A88E" />
              {i === 1 && [0, 1, 2].map(j => <circle key={j} cx={20 + j * 9} cy={26} r={3.6} fill="#FFF3E6" stroke="#E0A9A9" />)}
              <InsetText x={56} y={24 + i * 38} size={9.8} lines={[a, b]} color={i > 1 ? COLORS.red : COLORS.text} />
            </g>
          ))}
        </g>
      ),
    },
    {
      title: "Also get emergency care for",
      render: () => <InsetText x={14} y={26} size={9.8} lines={["Chemical or electrical burns", "Smoke inhalation: hoarse voice,", "  coughing, soot around nose or mouth", "Children, older adults, pregnant people", "Anyone who feels faint or unwell", "", "If unsure, call 10177 for advice."]} />,
    },
  ],
  checks: ["Bigger than their hand → hospital", "Face, hands, feet, genitals, joints → hospital", "Deep, chemical or electrical → hospital"],
};

export const BURNS_SCENES = [step1, step2, step3, step4, step5, step6, step7];

