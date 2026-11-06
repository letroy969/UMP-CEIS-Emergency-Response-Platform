/* Severe bleeding simulation scenes: wound on the casualty's thigh. */
import { BODY, COLORS, GLOVE, INK, LOOKS, clamp01, lerp, mix, phase, profileRig, seq, solveLimb } from "./rig.js";
import { Arrow, Bubble, Callout, Cross, Floor, FrontLower, FrontUpper, GroundShadow, Panel, Phone, Profile, Tag } from "./figures.jsx";
import { InsetText, LegDiagram } from "./diagrams.jsx";

const G = 300;
const PALE = { ...LOOKS.casualty, skin: "#D3A584" };

function casualty(extra = {}) {
  return {
    hip: [330, G - 17], torso: 180, facing: 1, head: 6, face: "open", mouth: 0.15,
    armN: { to: [346, G - 10] }, armF: { to: [346, G - 12] },
    legN: { to: [458, G - 9] }, legF: { to: [455, G - 12] },
    ...extra,
  };
}

/* Point on top of the near thigh, s = 0 at the hip, 1 at the knee. */
const RIG = profileRig(casualty());
const KNEE = solveLimb(RIG.hipJoint, [458, G - 9], BODY.thigh, BODY.shin, -1).mid;
const thighTop = s => { const p = [lerp(RIG.hipJoint[0], KNEE[0], s), lerp(RIG.hipJoint[1], KNEE[1], s)]; return [p[0], p[1] - lerp(14, 10.5, s)]; };
const WOUND = thighTop(0.55);
const TQ = thighTop(0.36);

function Blood({ amp, t, pool }) {
  return (
    <g>
      <ellipse cx={WOUND[0] + 6} cy={G + 4} rx={10 + pool * 46} ry={3 + pool * 6} fill={COLORS.blood} opacity={0.85} />
      <ellipse cx={WOUND[0]} cy={WOUND[1] + 7} rx={18} ry={9} fill={COLORS.blood} opacity={0.55} />
      {amp > 0.02 && [0, 1, 2, 3, 4, 5].map(i => {
        const p = ((t * 1.4 + i / 6) % 1);
        const beat = 0.6 + 0.4 * Math.abs(Math.sin(t * Math.PI * 1.4));
        return <circle key={i} cx={WOUND[0] + p * 34 * beat} cy={WOUND[1] - p * 30 * beat * amp + p * p * 46} r={2.4 - p} fill={COLORS.blood} opacity={amp * (1 - p * 0.7)} />;
      })}
    </g>
  );
}

function Wound({ open = 1 }) {
  return (
    <g>
      <ellipse cx={WOUND[0]} cy={WOUND[1] + 2} rx={8 + 14 * open} ry={2 + 3 * open} fill={LOOKS.casualty.skin} opacity={open} />
      <path d={`M${WOUND[0] - 7} ${WOUND[1] + 1} q4 -3 7 0 t7 0`} fill="none" stroke={COLORS.blood} strokeWidth={2.4} strokeLinecap="round" />
    </g>
  );
}

function Pads({ count, stain, lift = 0 }) {
  return (
    <g>
      {Array.from({ length: count }, (_, i) => (
        <g key={i} transform={`translate(0 ${-i * 4 - (i === count - 1 ? lift : 0)})`}>
          <rect x={WOUND[0] - 15} y={WOUND[1] - 4} width={30} height={6} rx={2} fill="#F7F7F2" stroke="#C9CBC2" />
          {i === 0 && <ellipse cx={WOUND[0]} cy={WOUND[1] - 1} rx={4 + stain * 10} ry={1.5 + stain * 1.5} fill={COLORS.blood} opacity={0.8} />}
        </g>
      ))}
    </g>
  );
}

function Tourniquet({ on = 1, twist = 0 }) {
  if (on <= 0) return null;
  const w = 12 * Math.abs(Math.cos(twist));
  return (
    <g opacity={on}>
      <rect x={TQ[0] - 4} y={TQ[1] - 1} width={8} height={28} rx={2} fill="#2B2B2B" />
      <rect x={TQ[0] - 4} y={TQ[1] + 12} width={8} height={4} fill="#C62828" />
      <line x1={TQ[0] - w} y1={TQ[1] - 3} x2={TQ[0] + w} y2={TQ[1] - 3} stroke="#555" strokeWidth={3.4} strokeLinecap="round" />
      <circle cx={TQ[0]} cy={TQ[1] - 3} r={2.6} fill="#777" />
    </g>
  );
}

function Scene({ rescuer, cas = casualty(), look = LOOKS.casualty, under = null, over = null, children }) {
  return (
    <>
      <Floor y={G} />
      <GroundShadow x={330} y={G + 2} rx={140} />
      {under}
      {rescuer && <FrontLower pose={rescuer} look={LOOKS.rescuer} ground={G} />}
      <Profile pose={cas} look={look} />
      {over}
      {rescuer && <FrontUpper pose={rescuer} look={LOOKS.rescuer} />}
      {children}
    </>
  );
}

function pressing(depth = 0, extra = {}) {
  const wrist = [WOUND[0], WOUND[1] - 18 + depth];
  return {
    x: WOUND[0], hipY: 232, shoulderY: 160 + depth, headDown: 0.5,
    armL: { to: wrist, straight: true, grip: "heel", hand: 90, gloves: true },
    armR: { to: wrist, straight: true, grip: "heel", hand: 90, gloves: true },
    ...extra,
  };
}

const step1 = {
  label: "Rescuer puts on gloves and calls 10177 on speaker while the wound bleeds heavily.",
  rest: 3,
  main: t => {
    const k = t % 6;
    const pull = Math.sin(k * 7) * 4;
    const ready = phase(k, 3.2, 0.6);
    const rescuer = {
      x: WOUND[0], hipY: 232, lean: 6, headDown: 0.35,
      armL: { to: mix([WOUND[0] - 12, 200], [WOUND[0] - 12, 246], ready), hand: 80, gloves: k > 1.4 },
      armR: { to: mix([WOUND[0] + 8 + pull, 206], [WOUND[0] + 12, 246], ready), hand: 100, gloves: k > 2.3 },
    };
    return (
      <Scene rescuer={rescuer} under={<Blood amp={1} t={t} pool={0.4 + 0.3 * Math.min(1, k / 6)} />} over={<Wound open={0} />}>
        <Phone x={480} y={268} t={k} />
        <Callout at={[WOUND[0] - 12, 198]} to={[236, 126]} anchor="end" text={["Gloves on — or a clean", "plastic bag over each hand"]} />
        <Callout at={WOUND} to={[236, 220]} anchor="end" color={COLORS.red} text={["Spurting, pooling or", "soaking = severe bleeding"]} />
        <Callout at={[491, 268]} to={[470, 196]} text={["Call 10177", "on speaker"]} />
      </Scene>
    );
  },
  insets: [
    {
      title: "Severe bleeding looks like",
      render: () => (
        <g>
          {["Blood spurting or pumping out", "Blood pooling on the ground", "Clothing soaked through", "Bleeding that won't slow down", "Pale, cold, confused person"].map((text, i) => (
            <g key={text}>
              <path d={`M18 ${18 + i * 26} q-6 8 0 12 q6 -4 0 -12z`} fill={COLORS.blood} />
              <InsetText x={30} y={28 + i * 26} size={10} lines={text} weight={400} />
            </g>
          ))}
        </g>
      ),
    },
    {
      title: "Protect yourself",
      render: () => <InsetText x={14} y={28} size={10} lines={["Use disposable gloves if there are any.", "No gloves? Use a clean plastic bag,", "cling film or several layers of cloth.", "", "Don't let fear of blood stop you —", "pressure saves lives. Wash your hands", "afterwards."]} />,
    },
  ],
  checks: ["Gloves or a barrier on your hands", "Call 10177 for severe bleeding", "Act fast — every second counts"],
};

const step2 = {
  label: "Rescuer opens the trouser leg to expose the wound and find exactly where the blood is coming from.",
  rest: 3,
  main: t => {
    const k = t % 6;
    const open = phase(k, 1, 2);
    const spread = open * 14;
    const rescuer = {
      x: WOUND[0], hipY: 232, lean: 24, headDown: 0.55,
      armL: { to: [WOUND[0] - 8 - spread, WOUND[1] - 10], hand: 120, gloves: true },
      armR: { to: [WOUND[0] + 8 + spread, WOUND[1] - 10], hand: 60, gloves: true },
    };
    return (
      <Scene rescuer={rescuer} under={<Blood amp={1} t={t} pool={0.75} />} over={<Wound open={open} />}>
        <Panel x={16} y={16} w={220} title="Lay them down first" lines={["It reduces fainting and lets you", "use your body weight to press."]} />
        <Callout at={[WOUND[0] - 10, WOUND[1] + 1]} to={[236, 200]} anchor="end" text={["Open or cut clothing —", "find the exact source"]} />
      </Scene>
    );
  },
  insets: [
    {
      title: "Object stuck in the wound?",
      render: () => (
        <g>
          <rect x={14} y={92} width={232} height={44} rx={10} fill={LOOKS.casualty.skin} stroke={INK} />
          <path d="M122 96 L128 40 L136 40 L138 96Z" fill="#9AA3AE" stroke="#5E6670" />
          <rect x={86} y={78} width={30} height={16} rx={6} fill="#F7F7F2" stroke="#C9CBC2" />
          <rect x={144} y={78} width={30} height={16} rx={6} fill="#F7F7F2" stroke="#C9CBC2" />
          <Arrow from={[101, 50]} to={[101, 74]} color={COLORS.green} />
          <Arrow from={[159, 50]} to={[159, 74]} color={COLORS.green} />
          <Cross x={210} y={46} size={7} />
          <InsetText x={14} y={18} size={9.4} lines={["Don't pull it out — it may be plugging", "the wound. Pad and press on both sides."]} />
          <InsetText x={14} y={156} size={9} lines={["Press around the object, never on it"]} color={COLORS.green} />
        </g>
      ),
    },
    {
      title: "Check quickly",
      render: () => <InsetText x={14} y={28} size={10} lines={["Where is the blood coming from?", "Is there more than one wound?", "Spurting bright red blood usually", "means an artery — press immediately.", "", "Talk to them and keep them still."]} />,
    },
  ],
  checks: ["Lay the person down", "Expose the wound to find the source", "Never remove an embedded object"],
};

const step3 = {
  label: "Rescuer places a dressing on the wound and presses down hard with both hands and straight arms.",
  rest: 3,
  main: t => {
    const k = t % 7;
    const place = phase(k, 0, 0.8);
    const amp = clamp01(1 - (k - 0.8) / 2.6);
    const pulse = Math.sin(k * 3) * 1.2 + 2;
    const rescuer = place < 1
      ? { x: WOUND[0], hipY: 232, lean: 26, headDown: 0.5, armL: { to: [WOUND[0] - 8, lerp(220, WOUND[1] - 16, place)], hand: 80, gloves: true }, armR: { to: [WOUND[0] + 8, lerp(220, WOUND[1] - 16, place)], hand: 100, gloves: true } }
      : pressing(pulse);
    return (
      <Scene rescuer={rescuer} under={<Blood amp={amp} t={t} pool={0.8} />} over={<><Wound /><g transform={`translate(0 ${place < 1 ? (1 - place) * -40 : pulse * 0.4})`}><Pads count={1} stain={0.2} /></g></>}>
        <Callout at={[WOUND[0] + 18, 196]} to={[440, 120]} text={["Both hands, straight arms —", "lean your body weight in"]} />
        <Callout at={[WOUND[0] + 14, WOUND[1] - 2]} to={[440, 210]} color={COLORS.red} text={["Press hard directly", "on the wound"]} />
        <Tag x={16} y={16} text={amp > 0.05 ? "Firm, continuous pressure" : "Bleeding slowing — keep pressing"} color={amp > 0.05 ? COLORS.red : COLORS.green} size={11} />
      </Scene>
    );
  },
  insets: [
    {
      title: "Deep wound: pack it",
      render: t => {
        const fill = clamp01((t % 6) / 4);
        return (
          <g>
            <path d="M14 60 L110 60 Q118 60 120 70 L126 120 Q130 132 140 120 L146 70 Q148 60 156 60 L246 60 L246 150 L14 150Z" fill={LOOKS.casualty.skin} stroke={INK} />
            <path d={`M122 ${124 - fill * 58} L144 ${124 - fill * 58} L142 124 Q133 130 124 124Z`} fill="#F7F7F2" stroke="#C9CBC2" />
            <path d={`M133 ${66 - fill * 4} Q140 ${40} 160 ${34}`} fill="none" stroke="#F7F7F2" strokeWidth={7} />
            <rect x={110} y={46 - fill * 8} width={46} height={20} rx={6} fill={GLOVE} opacity={0.9} />
            <InsetText x={14} y={18} size={9.4} lines={["Push gauze or clean cloth firmly into", "the wound until it is full, then press."]} />
          </g>
        );
      },
    },
    {
      title: "How long?",
      render: () => <InsetText x={14} y={28} size={10} lines={["Keep firm, continuous pressure until", "help takes over — don't keep checking.", "", "If you get tired, have someone press", "next to your hands before you let go."]} />,
    },
  ],
  checks: ["Dressing directly on the wound", "Both hands, straight arms, body weight", "Pack deep wounds, then press"],
};

const step4 = {
  label: "Blood soaks through the first dressing; the rescuer adds another on top without lifting it and keeps pressing.",
  rest: 4,
  main: t => {
    const k = t % 7;
    const stain = clamp01(k / 2);
    const fetch = seq(k, [[2.2, 0], [2.9, 1], [3.6, 2]]);
    const right = fetch < 1 ? mix([WOUND[0] + 4, WOUND[1] - 18], [470, G - 6], fetch) : mix([470, G - 6], [WOUND[0], WOUND[1] - 22], fetch - 1);
    const rescuer = fetch > 0 && fetch < 2
      ? pressing(2, { armR: { to: right, hand: 90, gloves: true }, armL: { to: [WOUND[0], WOUND[1] - 18], straight: true, grip: "heel", hand: 90, gloves: true } })
      : pressing(fetch >= 2 ? -2 : 2);
    return (
      <Scene rescuer={rescuer} under={<Blood amp={0.25} t={t} pool={0.85} />} over={<><Wound /><Pads count={fetch >= 2 ? 2 : 1} stain={stain} /></>}>
        {fetch > 0.9 && fetch < 2 && <rect x={right[0] - 15} y={right[1] + 10} width={30} height={6} rx={2} fill="#F7F7F2" stroke="#C9CBC2" />}
        {fetch === 0 && <rect x={455} y={G + 2} width={30} height={6} rx={2} fill="#F7F7F2" stroke="#C9CBC2" />}
        <Callout at={[WOUND[0] - 10, WOUND[1] - 1]} to={[236, 200]} anchor="end" color={COLORS.red} text={["Soaked through?", "Add more on top"]} />
        <Tag x={16} y={16} text="Never lift the first dressing to check" color={COLORS.red} size={11} />
      </Scene>
    );
  },
  insets: [
    {
      title: "Layering (cut-away)",
      render: () => (
        <g>
          <rect x={14} y={120} width={232} height={36} fill={LOOKS.casualty.skin} />
          <path d="M120 120 Q130 132 140 120" fill={COLORS.blood} />
          <rect x={90} y={108} width={80} height={12} rx={2} fill="#F7F7F2" stroke="#C9CBC2" />
          <ellipse cx={130} cy={114} rx={30} ry={4} fill={COLORS.blood} opacity={0.8} />
          <rect x={90} y={95} width={80} height={12} rx={2} fill="#F7F7F2" stroke="#C9CBC2" />
          <rect x={98} y={64} width={64} height={30} rx={8} fill={GLOVE} />
          <Arrow from={[130, 30]} to={[130, 60]} color={COLORS.red} />
          <InsetText x={180} y={104} size={9} lines={["new layer"]} />
          <InsetText x={180} y={118} size={9} lines={["first layer"]} />
          <InsetText x={14} y={18} size={9.4} lines={["Lifting tears away the forming clot", "and restarts the bleeding."]} />
        </g>
      ),
    },
    {
      title: "Still bleeding heavily?",
      render: () => <InsetText x={14} y={28} size={10} lines={["Press harder over the exact spot.", "", "On an arm or leg, if firm pressure", "doesn't control life-threatening", "bleeding, use a tourniquet (next step)."]} />,
    },
  ],
  checks: ["Don't lift the dressing", "Add layers on top", "Press harder"],
};

const step5 = {
  label: "Rescuer applies a tourniquet 5 to 7 centimetres above the wound, twists it until the bleeding stops and records the time.",
  rest: 4.6,
  main: t => {
    const k = t % 7.5;
    const on = phase(k, 0.2, 0.8);
    const twist = seq(k, [[1, 0], [3.2, Math.PI * 3]]);
    const amp = clamp01(1 - (k - 1) / 2.2);
    const writing = k > 3.5;
    const rescuer = {
      x: TQ[0] + 4, hipY: 236, lean: 26, headDown: 0.55,
      armL: { to: [TQ[0] - 6, TQ[1] - 14], hand: 70, gloves: true },
      armR: { to: writing ? [TQ[0] + 16, TQ[1] - 18] : [TQ[0] + 10 + Math.cos(twist) * 6, TQ[1] - 14 + Math.sin(twist) * 3], hand: 110, gloves: true },
    };
    return (
      <Scene rescuer={rescuer} under={<Blood amp={amp} t={t} pool={0.9} />} over={<><Wound /><Pads count={2} stain={1} /><Tourniquet on={on} twist={twist} /></>}>
        <Callout at={[TQ[0], TQ[1] + 24]} to={[236, 230]} anchor="end" text={["5–7 cm above the wound,", "never over a joint"]} />
        {!writing && <Callout at={[TQ[0], TQ[1] - 4]} to={[440, 120]} color={COLORS.red} text={["Twist until the", "bleeding stops"]} />}
        {writing && <><Tag x={TQ[0] + 24} y={TQ[1] - 46} text={`TIME ON ${"14:32"}`} color={COLORS.red} size={11} world /><Callout at={[TQ[0] + 6, TQ[1] - 4]} to={[440, 160]} text={["Note the time it", "went on — tell 10177"]} /></>}
        <Tag x={16} y={16} text="Only for life-threatening bleeding from an arm or leg" color={COLORS.ink} size={10.5} />
      </Scene>
    );
  },
  insets: [
    { title: "Placement", render: t => <LegDiagram tight={seq(t % 7.5, [[1, 0], [3.2, 1.5]])} /> },
    {
      title: "Know before you use one",
      render: () => <InsetText x={14} y={28} size={9.8} lines={["It will hurt — that is expected.", "Do not loosen or remove it.", "", "Improvised: a wide cloth band (4 cm+)", "twisted tight with a stick. Never use", "wire, string or a thin cord."]} />,
    },
  ],
  checks: ["5–7 cm above the wound, not on a joint", "Tighten until bleeding stops", "Write down the time"],
};

const step6 = {
  label: "Rescuer bandages firmly over the dressings, covers the person with a blanket and watches for signs of shock.",
  rest: 4.5,
  main: t => {
    const k = t % 7;
    const wraps = Math.floor(clamp01(k / 2.6) * 5);
    const blanket = phase(k, 2.8, 1);
    const rescuer = blanket < 0.5
      ? { x: WOUND[0], hipY: 234, lean: 24, headDown: 0.5, armL: { to: [WOUND[0] - 10, WOUND[1] - 12 + Math.sin(k * 6) * 5], hand: 80, gloves: true }, armR: { to: [WOUND[0] + 10, WOUND[1] - 12 - Math.sin(k * 6) * 5], hand: 100, gloves: true } }
      : { x: 280, hipY: 232, lean: 10, headDown: 0.3, talk: Math.sin(k * 8) > 0 ? 0.6 : 0.2, armL: { to: [262, 252], hand: 90 }, armR: { to: [296, 256], hand: 90 } };
    const cas = casualty({ face: k > 4 ? "closed" : "open", mouth: 0.25 });
    return (
      <Scene rescuer={rescuer} cas={cas} look={k > 3 ? PALE : LOOKS.casualty} under={<Blood amp={0} t={t} pool={0.9} />}
        over={<>
          <Pads count={2} stain={1} />
          <Tourniquet twist={0.4} />
          {Array.from({ length: wraps }, (_, i) => <rect key={i} x={WOUND[0] - 18 + i * 7} y={WOUND[1] - 10} width={6} height={30} rx={1.5} fill="#FBFBF7" stroke="#D2D4CA" transform={`rotate(14 ${WOUND[0] - 15 + i * 7} ${WOUND[1] + 5})`} />)}
          {blanket > 0 && <path d={`M232 ${G - 2} L232 ${262 - blanket * 4} Q240 250 270 252 L${330 - 20 + 0} 254 L${WOUND[0] - 26} 262 L${WOUND[0] - 26} ${G - 2}Z`} fill="#B5482E" opacity={0.92 * blanket} stroke="#7E2F1D" />}
        </>}>
        {k < 2.8 && <Callout at={[WOUND[0] + 8, WOUND[1] - 6]} to={[440, 150]} text={["Bandage firmly", "over the dressings"]} />}
        {blanket > 0.5 && <Callout at={[270, 256]} to={[236, 150]} anchor="end" text={["Keep them lying down", "and warm"]} />}
        {blanket > 0.5 && <Tag x={16} y={16} text="Nothing to eat or drink" color={COLORS.red} size={11} />}
      </Scene>
    );
  },
  insets: [
    {
      title: "Signs of shock",
      render: () => (
        <g>
          {["Pale, cold, clammy skin", "Fast, shallow breathing", "Fast, weak pulse", "Anxious, confused or drowsy", "Thirst, nausea, dizziness"].map((text, i) => (
            <g key={text}>
              <circle cx={18} cy={22 + i * 26} r={4} fill={COLORS.amber} />
              <InsetText x={30} y={26 + i * 26} size={10} lines={text} weight={400} />
            </g>
          ))}
          <InsetText x={14} y={156} size={9} lines={["Shock is life-threatening: tell 10177."]} color={COLORS.red} />
        </g>
      ),
    },
    {
      title: "Check the bandage",
      render: () => <InsetText x={14} y={28} size={10} lines={["Firm, but not cutting off circulation:", "fingers or toes beyond it should stay", "warm and pink.", "", "If they turn pale, cold or numb,", "loosen the bandage (not a tourniquet)."]} />,
    },
  ],
  checks: ["Bandage firmly over the dressing", "Lying down, warm, nothing by mouth", "Watch for signs of shock"],
};

const step7 = {
  label: "Paramedics arrive; the rescuer tells them what happened and when the tourniquet was applied.",
  rest: 4,
  main: t => {
    const k = t % 7;
    const arrive = phase(k, 0, 2.4);
    const walking = arrive < 1;
    const x = lerp(660, 540, arrive);
    const s = Math.sin(k * 6.5), c = Math.cos(k * 6.5);
    const paramedic = {
      hip: [x, G - 129 + (walking ? Math.abs(s) * 2 : 0)], torso: -92, facing: -1, face: "open",
      legN: { to: [x - (walking ? 24 * s : 6), G - 6 - (walking ? Math.max(0, c) * 8 : 0)] },
      legF: { to: [x + (walking ? 24 * s : 6), G - 6 - (walking ? Math.max(0, -c) * 8 : 0)] },
      armN: { to: [x + (walking ? 18 * s : -6), G - 122] }, armF: { to: [x - 22, G - 116], grip: "fist" },
    };
    const rescuer = { x: 400, hipY: 232, lean: 4, turn: 1, talk: !walking && Math.sin(k * 10) > 0 ? 0.8 : 0.2, armL: { to: [384, 250], hand: 90 }, armR: { to: !walking ? [TQ[0] + 30, 236] : [416, 250], hand: 160 } };
    return (
      <Scene rescuer={rescuer} under={<Blood amp={0} t={t} pool={0.9} />} over={<><Pads count={2} stain={1} /><Tourniquet twist={0.4} /><Tag x={TQ[0] - 96} y={TQ[1] - 30} text="TIME ON 14:32" color={COLORS.red} size={9} world /></>}>
        <Profile pose={paramedic} look={LOOKS.paramedic} />
        <rect x={x - 40} y={G - 112} width={26} height={22} rx={3} fill="#E6F2EA" stroke="#2F7D4F" />
        <path d={`M${x - 27} ${G - 106} v10 m-5 -5 h10`} stroke="#C62828" strokeWidth={2.4} />
        {!walking && <Bubble at={[300, 80]} text={["Thigh wound. Tourniquet", "on at 14:32. They're", "getting pale and drowsy."]} />}
      </Scene>
    );
  },
  insets: [
    {
      title: "Tell responders",
      render: () => <InsetText x={14} y={28} size={10} lines={["What happened and when", "Where the wound is and what you did", "Time the tourniquet went on", "Changes in breathing or alertness", "", "Stay with them until handed over."]} />,
    },
    {
      title: "If they collapse",
      render: () => (
        <g>
          <rect x={14} y={20} width={232} height={64} rx={8} fill="#FFE8E4" stroke="#F3B3B3" />
          <InsetText x={26} y={42} size={10.5} color={COLORS.red} lines={["Unresponsive and not breathing", "normally?", "Start CPR — keep someone pressing."]} />
          <InsetText x={14} y={110} size={9.6} lines={["Keep checking breathing every", "minute until help takes over."]} />
        </g>
      ),
    },
  ],
  checks: ["Stay with the person", "Report the tourniquet time", "Start CPR if breathing stops"],
};

export const BLEEDING_SCENES = [step1, step2, step3, step4, step5, step6, step7];
