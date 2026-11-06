/* Choking simulation scenes (adult, conscious then unresponsive). */
import { COLORS, LOOKS, add, phase, profileRig, seq } from "./rig.js";
import { Arrow, Bubble, Screen, Callout, Check, Cross, Floor, GroundShadow, Panel, Phone, Profile, Tag } from "./figures.jsx";
import { InsetText, TORSO_MARKS, TorsoBack, TorsoFront } from "./diagrams.jsx";

const G = 318;
const X = 330;

function standing(x, facing, extra = {}) {
  return {
    hip: [x, G - 130], torso: -90, facing, head: 0, face: "open",
    armN: { to: [x + 8 * facing, G - 62] }, armF: { to: [x - 4 * facing, G - 64] },
    legN: { to: [x + 8 * facing, G - 6] }, legF: { to: [x - 8 * facing, G - 6] },
    ...extra,
  };
}

function clutching(extra = {}) {
  const base = standing(X, 1, { face: "distress", mouth: 0.55, head: -4, ...extra });
  const rig = profileRig(base);
  const throat = rig.headLocal([8, -5]);
  return {
    ...base,
    armN: { to: add(throat, [9, 11]), hand: -122, bend: 1 },
    armF: { to: add(throat, [5, 13]), hand: -112, bend: 1 },
  };
}

function Stage({ children }) {
  return <><Floor y={G} /><GroundShadow x={X - 10} y={G + 2} rx={90} />{children}</>;
}

/* Back blows: casualty leaning well forward, rescuer to the side and behind. */
function backBlowFrame(k) {
  const cas = {
    hip: [X - 6, G - 127], torso: -38, facing: 1, head: 8, face: "distress", mouth: 0.5,
    legN: { to: [X + 6, G - 6] }, legF: { to: [X - 12, G - 6] },
  };
  const rig = profileRig(cas);
  cas.armN = { to: add(rig.shoulder, [10, 88]) };
  cas.armF = { to: add(rig.shoulder, [2, 88]) };
  const blow = rig.local([-16, -0.8 * 92]);
  const chest = rig.local([20, -0.62 * 92]);
  const n = Math.min(4, Math.floor(k / 1.1));
  const r = k - n * 1.1;
  const lift = k < 5.5 ? seq(r, [[0, 0], [0.45, 1], [0.6, 0], [1.1, 0]]) : 0;
  const hitting = k < 5.5 && r > 0.55 && r < 0.75;
  const rescuer = {
    hip: [X - 66, G - 128], torso: -76, facing: 1, head: -14, face: "open",
    legN: { to: [X - 46, G - 6] }, legF: { to: [X - 84, G - 6] },
    armF: { to: add(chest, [-4, -6]), hand: 10 },
    armN: { to: add(blow, [-28 * lift - 6, -40 * lift - 8]), hand: 70, grip: "heel" },
  };
  return { cas, rescuer, blow, chest, count: Math.min(5, n + 1), hitting, done: k >= 5.5 };
}

/* Abdominal thrusts: rescuer directly behind with arms around the upper abdomen. */
function thrustFrame(k) {
  const n = Math.min(4, Math.floor(k / 1.1));
  const r = k - n * 1.1;
  const pull = k < 5.5 ? seq(r, [[0, 0], [0.12, 1], [0.6, 0], [1.1, 0]]) : 0;
  const cas = {
    hip: [X, G - 129], torso: -72 - pull * 4, facing: 1, head: -6, face: "distress", mouth: 0.4 + pull * 0.4,
    legN: { to: [X + 10, G - 6] }, legF: { to: [X - 8, G - 6] },
  };
  const rig = profileRig(cas);
  cas.armN = { to: add(rig.shoulder, [22, 82]) };
  cas.armF = { to: add(rig.shoulder, [14, 84]) };
  const point = rig.local([15, -0.47 * 92]);
  const fist = add(point, [-7 * pull, -7 * pull]);
  const rescuer = {
    hip: [X - 30, G - 128], torso: -80, facing: 1, head: -8, face: "open",
    legN: { to: [X + 2, G - 6] }, legF: { to: [X - 62, G - 6] },
    armF: { to: add(fist, [-6, 2]), hand: 0, bend: -1 },
    armN: { to: add(fist, [-7, 2]), grip: "fist", bend: -1 },
  };
  return { cas, rescuer, point, fist, count: Math.min(5, n + 1), pulling: pull > 0.5, done: k >= 5.5 };
}

function Layered({ cas, rescuer }) {
  return (
    <>
      <Profile pose={rescuer} look={LOOKS.rescuer} layer="body" />
      <Profile pose={cas} look={LOOKS.casualty} />
      <Profile pose={rescuer} look={LOOKS.rescuer} layer="nearArm" />
    </>
  );
}

function Counter({ label, count, color = COLORS.amber }) {
  return (
    <Screen>
      <rect x={16} y={16} width={168} height={58} rx={8} fill="#fff" stroke="#C8D0E0" />
      <text x={28} y={36} fontSize={9.5} fontWeight={700} fill={COLORS.muted} letterSpacing={1} fontFamily="'IBM Plex Sans',sans-serif">{label}</text>
      {[1, 2, 3, 4, 5].map(i => <circle key={i} cx={34 + (i - 1) * 26} cy={56} r={9} fill={i <= count ? color : "#E3E8F0"} />)}
      {[1, 2, 3, 4, 5].map(i => <text key={i} x={34 + (i - 1) * 26} y={60} textAnchor="middle" fontSize={10} fontWeight={700} fill={i <= count ? "#fff" : COLORS.muted} fontFamily="'IBM Plex Sans',sans-serif">{i}</text>)}
    </Screen>
  );
}

function Impact({ at, show }) {
  if (!show) return null;
  return [0, 1, 2, 3, 4].map(i => {
    const a = (-150 + i * 30) * Math.PI / 180;
    return <line key={i} x1={at[0] + Math.cos(a) * 8} y1={at[1] + Math.sin(a) * 8} x2={at[0] + Math.cos(a) * 16} y2={at[1] + Math.sin(a) * 16} stroke={COLORS.amber} strokeWidth={2} strokeLinecap="round" />;
  });
}

function BackBlowScene({ k, showLabels = true }) {
  const f = backBlowFrame(k);
  return (
    <>
      <Layered cas={f.cas} rescuer={f.rescuer} />
      <Impact at={f.blow} show={f.hitting} />
      <Counter label="BACK BLOWS" count={f.count} />
      {showLabels && <>
        <Callout at={f.blow} to={[150, 128]} anchor="end" text={["Heel of hand,", "between the", "shoulder blades"]} />
        <Callout at={f.chest} to={[470, 150]} text={["Support the chest", "with your other hand"]} />
        <Callout at={profileRig(f.cas).local([0, -0.5 * 92])} to={[470, 214]} text={["Lean them well", "forward"]} />
      </>}
      {f.done && <Tag x={200} y={22} text="Check: has it cleared? If not → abdominal thrusts" color={COLORS.blue} size={10.5} />}
    </>
  );
}

function ThrustScene({ k, showLabels = true }) {
  const f = thrustFrame(k);
  return (
    <>
      <Layered cas={f.cas} rescuer={f.rescuer} />
      {f.pulling && <Arrow from={add(f.point, [12, 10])} to={add(f.point, [-4, -10])} color={COLORS.red} />}
      <Counter label="ABDOMINAL THRUSTS" count={f.count} color={COLORS.red} />
      {showLabels && <>
        <Callout at={f.point} to={[470, 150]} text={["Fist between the navel", "and the breastbone tip"]} />
        <Callout at={add(f.point, [-4, 6])} to={[470, 214]} color={COLORS.red} text={["Pull sharply", "inwards and upwards"]} />
        <Callout at={[X - 50, G - 6]} to={[150, 250]} anchor="end" text={["Stand behind,", "one foot between theirs"]} />
      </>}
      {f.done && <Tag x={200} y={22} text="Check: has it cleared? If not → back blows again" color={COLORS.blue} size={10.5} />}
    </>
  );
}

/* ── Steps ────────────────────────────────────────────────────── */
const step1 = {
  label: "A person clutches their throat and cannot speak; the rescuer asks if they are choking.",
  rest: 3,
  main: t => {
    const k = t % 7;
    const nod = k > 2.4 && k < 4.2 ? Math.sin((k - 2.4) * 10) * 7 : 0;
    const cas = clutching({ head: -4 + nod });
    const rescuer = standing(424, -1, { armN: { to: [400, G - 150], hand: 200 }, armF: { to: [432, G - 64] } });
    return (
      <Stage>
        <Profile pose={cas} look={LOOKS.casualty} />
        <Profile pose={rescuer} look={LOOKS.rescuer} />
        {k < 4.4 && <Bubble at={[455, 40]} text="Are you choking?" tail="left" />}
        {k > 2.4 && k < 4.4 && <Tag x={16} y={16} text="Nods — can’t speak" color={COLORS.red} size={11} />}
        {k >= 4.4 && <Panel x={16} y={16} w={262} color={COLORS.red} title="Severe choking — act now" lines={["Cannot speak, breathe or cough well", "May clutch the throat or turn blue", "Get someone to call 10177"]} />}
        <Callout at={profileRig(cas).headLocal([8, -5])} to={[150, 200]} anchor="end" text={["Hands at the", "throat: the choking", "sign"]} />
      </Stage>
    );
  },
  insets: [
    {
      title: "Mild or severe?",
      render: () => (
        <g>
          <rect x={8} y={8} width={118} height={150} rx={6} fill="#EEF8EF" stroke="#9BCB9F" />
          <rect x={134} y={8} width={118} height={150} rx={6} fill="#FFF1F1" stroke="#F3B3B3" />
          <InsetText x={16} y={26} size={10} color={COLORS.green} lines={["MILD", "Can speak", "Coughing loudly", "Can breathe", "", "→ Encourage", "   coughing"]} />
          <InsetText x={142} y={26} size={10} color={COLORS.red} lines={["SEVERE", "Can't speak", "Weak or silent cough", "Can't breathe,", "may turn blue", "→ Back blows and", "   abdominal thrusts"]} />
        </g>
      ),
    },
    {
      title: "Ask, then act",
      render: () => <InsetText x={14} y={28} size={10} lines={["Ask clearly: \"Are you choking?\"", "", "A nod without words, a silent cough or", "no breathing means severe choking.", "", "Act straight away and get someone", "else to call 10177 while you help."]} />,
    },
  ],
  checks: ["Ask: \"Are you choking?\"", "Severe: can't speak, cough or breathe", "Act at once and have someone call 10177"],
};

const step2 = {
  label: "The person coughs forcefully; the rescuer encourages coughing without hitting their back.",
  rest: 0.25,
  main: t => {
    const k = t % 3.2;
    const cough = Math.max(seq(k, [[0, 0], [0.12, 1], [0.7, 0]]), seq(k, [[1.6, 0], [1.72, 1], [2.3, 0]]));
    const base = standing(X, 1, { torso: -90 + 6 + cough * 14, head: -6 - cough * 6, face: cough > 0.4 ? "closed" : "open", mouth: 0.15 + cough * 0.7 });
    const rig = profileRig(base);
    const mouth = rig.headLocal([14, -13]);
    base.armN = { to: add(mouth, [5, 12]), grip: "fist", bend: 1 };
    const rescuer = standing(440, -1, { armN: { to: [418, G - 100], hand: 160 }, armF: { to: [448, G - 64] }, mouth: 0.4 });
    return (
      <Stage>
        <Profile pose={base} look={LOOKS.casualty} />
        <Profile pose={rescuer} look={LOOKS.rescuer} />
        {cough > 0.2 && [0, 1, 2].map(i => (
          <path key={i} d={`M${mouth[0] + 10 + i * 8} ${mouth[1] - 8 + i * 2} q6 8 0 16`} fill="none" stroke={COLORS.muted} strokeWidth={1.6} opacity={cough} />
        ))}
        <Bubble at={[410, 70]} text={["Keep coughing —", "big coughs!"]} />
        <Panel x={16} y={16} w={236} color={COLORS.green} title="Mild choking" lines={["Can speak, cough and breathe.", "Coughing is the best way to clear it."]} />
        <Callout at={rig.local([-15, -0.75 * 92])} to={[160, 196]} anchor="end" color={COLORS.red} text={["Don't slap their back", "while coughing works"]} />
      </Stage>
    );
  },
  insets: [
    {
      title: "Stay with them and watch for",
      render: () => (
        <g>
          {["Cough becomes weak or silent", "They can no longer speak", "They struggle to breathe", "Lips or face turn blue"].map((text, i) => (
            <g key={text}>
              <circle cx={18} cy={24 + i * 26} r={4} fill={COLORS.red} />
              <InsetText x={30} y={28 + i * 26} lines={text} size={10} weight={400} />
            </g>
          ))}
          <InsetText x={14} y={140} size={9.2} lines={["Any of these: start back blows now."]} color={COLORS.red} />
        </g>
      ),
    },
    {
      title: "Do / don't",
      render: () => (
        <g>
          <Check x={22} y={30} /><InsetText x={38} y={34} size={10} lines="Encourage loud coughs" weight={400} />
          <Check x={22} y={58} /><InsetText x={38} y={62} size={10} lines="Stay close and reassure" weight={400} />
          <Cross x={22} y={88} size={6} /><InsetText x={38} y={92} size={10} lines="Slap their back" weight={400} />
          <Cross x={22} y={116} size={6} /><InsetText x={38} y={120} size={10} lines="Give them water to drink" weight={400} />
          <Cross x={22} y={144} size={6} /><InsetText x={38} y={148} size={10} lines="Reach into the mouth" weight={400} />
        </g>
      ),
    },
  ],
  checks: ["Encourage coughing", "Don't hit their back while coughing works", "Watch for the cough becoming weak"],
};

const step3 = {
  label: "Rescuer supports the chest, leans the person forward and gives up to five sharp back blows.",
  rest: 0.5,
  main: t => <Stage><BackBlowScene k={t % 7} /></Stage>,
  insets: [
    {
      title: "Where to strike (from behind)",
      render: t => {
        const r = (t % 7) % 1.1;
        const hit = (t % 7) < 5.5 && r > 0.5 && r < 0.8;
        return (
          <TorsoBack x={12} y={22} s={0.95}>
            <circle cx={60} cy={44} r={hit ? 16 : 12} fill={COLORS.red} opacity={0.18} />
            <path d="M48 52 Q46 38 54 34 L66 34 Q74 38 72 52 Q66 62 60 62 Q54 62 48 52Z" fill={LOOKS.rescuer.skin} stroke="#5A3520" strokeWidth={0.8} transform={`translate(${hit ? 0 : -10} ${hit ? 0 : -14})`} />
            <InsetText x={128} y={36} size={9} lines={["Heel of the hand,", "between the", "shoulder blades"]} />
            <InsetText x={128} y={92} size={9} lines={["Sharp, firm blows —", "check after each one"]} />
          </TorsoBack>
        );
      },
    },
    {
      title: "Why lean them forward?",
      render: () => <InsetText x={14} y={28} size={10} lines={["With the head lower than the chest,", "a dislodged object falls out of the", "mouth instead of going further down.", "", "Support the chest firmly so they", "don't fall."]} />,
    },
  ],
  checks: ["Stand to the side and slightly behind", "Support the chest and lean them well forward", "Up to 5 sharp blows, check after each"],
};

const step4 = {
  label: "Rescuer stands behind, places a fist above the navel and pulls sharply inwards and upwards up to five times.",
  rest: 0.15,
  main: t => <Stage><ThrustScene k={t % 7} /></Stage>,
  insets: [
    {
      title: "Fist position",
      render: t => {
        const r = (t % 7) % 1.1;
        const pull = (t % 7) < 5.5 ? seq(r, [[0, 0], [0.12, 1], [0.6, 0], [1.1, 0]]) : 0;
        const [px, py] = TORSO_MARKS.thrust;
        return (
          <TorsoFront x={10} y={10} s={1}>
            <circle cx={TORSO_MARKS.xiphoid[0]} cy={TORSO_MARKS.xiphoid[1]} r={2.4} fill={COLORS.blue} />
            <circle cx={TORSO_MARKS.navel[0]} cy={TORSO_MARKS.navel[1] - 1} r={2.4} fill={COLORS.blue} />
            <ellipse cx={px} cy={py - pull * 4} rx={12} ry={9} fill={LOOKS.rescuer.skin} stroke="#5A3520" strokeWidth={0.8} />
            <path d={`M${px - 10} ${py - 2 - pull * 4} q10 -6 20 0`} fill="none" stroke="#5A3520" strokeWidth={0.8} />
            <Arrow from={[px + 22, py + 12]} to={[px + 22, py - 12]} color={COLORS.red} width={1.8} head={6} />
            <InsetText x={128} y={30} size={9} lines={["Bottom of the", "breastbone"]} color={COLORS.blue} />
            <InsetText x={128} y={70} size={9} lines={["Fist here, thumb", "side in, other", "hand over it"]} />
            <InsetText x={128} y={118} size={9} lines={["Navel"]} color={COLORS.blue} />
          </TorsoFront>
        );
      },
    },
    {
      title: "Important",
      render: () => <InsetText x={14} y={28} size={9.8} lines={["Pregnant or very large person: give", "chest thrusts instead — hands on the", "lower breastbone, pull straight back.", "", "Abdominal thrusts can cause internal", "injury: anyone who received them must", "be checked by a medical professional."]} />,
    },
  ],
  checks: ["Fist between navel and bottom of breastbone", "Pull sharply inwards and upwards", "Up to 5 thrusts, check after each"],
};

const step5 = {
  label: "Rescuer alternates five back blows with five abdominal thrusts.",
  rest: 0.5,
  main: t => {
    const k = t % 13;
    const blows = k < 6.5;
    return (
      <Stage>
        {blows ? <BackBlowScene k={k} showLabels={false} /> : <ThrustScene k={k - 6.5} showLabels={false} />}
        <Panel x={16} y={86} w={194} color={COLORS.amber} title="Repeat the cycle" lines={["5 back blows", "→ 5 abdominal thrusts", "→ until it clears or they", "   become unresponsive"]} />
      </Stage>
    );
  },
  insets: [
    {
      title: "The cycle",
      render: t => {
        const blows = t % 13 < 6.5;
        return (
          <g>
            <rect x={14} y={30} width={100} height={56} rx={10} fill={blows ? COLORS.amber : "#FFF3DC"} />
            <rect x={146} y={30} width={100} height={56} rx={10} fill={!blows ? COLORS.red : "#FFE8E4"} />
            <InsetText x={64} y={54} anchor="middle" size={11} color={blows ? "#fff" : COLORS.amber} lines={["5 back", "blows"]} />
            <InsetText x={196} y={54} anchor="middle" size={11} color={!blows ? "#fff" : COLORS.red} lines={["5 abdominal", "thrusts"]} />
            <Arrow from={[118, 46]} to={[142, 46]} color={COLORS.muted} width={1.6} head={6} />
            <Arrow from={[142, 72]} to={[118, 72]} color={COLORS.muted} width={1.6} head={6} />
            <InsetText x={14} y={112} size={9.4} lines={["Check after every blow and thrust.", "If it clears, stop — and get the person", "medically checked."]} />
          </g>
        );
      },
    },
    {
      title: "Keep help coming",
      render: () => <InsetText x={14} y={28} size={10} lines={["If it hasn't cleared after the first", "cycle, make sure 10177 has been called.", "", "Keep going — don't stop to look", "in the mouth between cycles."]} />,
    },
  ],
  checks: ["Alternate 5 blows and 5 thrusts", "Check after each one", "Ensure 10177 is on the way"],
};

/* Collapse: the person goes limp and is lowered to the floor. */
const STAND = thrustFrame(5.6);
const LYING = { hip: [X + 40, G - 17], torso: -180, facing: 1, head: 0, face: "closed", mouth: 0.2, armN: { to: [X + 58, G - 10] }, armF: { to: [X + 56, G - 12] }, legN: { to: [X + 168, G - 9] }, legF: { to: [X + 165, G - 11] } };
const SAGGING = { hip: [X - 4, G - 92], torso: -112, facing: 1, head: -28, face: "closed", mouth: 0.3, armN: { to: [X + 20, G - 30] }, armF: { to: [X + 14, G - 32] }, legN: { to: [X + 26, G - 6] }, legF: { to: [X + 18, G - 6] } };
const SITTING = { hip: [X + 10, G - 20], torso: -140, facing: 1, head: -10, face: "closed", mouth: 0.2, armN: { to: [X + 40, G - 10] }, armF: { to: [X + 36, G - 12] }, legN: { to: [X + 138, G - 9] }, legF: { to: [X + 135, G - 11] } };

const step6 = {
  label: "The person becomes unresponsive; the rescuer lowers them to the floor, calls 10177 and starts CPR.",
  rest: 5.5,
  main: t => {
    const k = t % 9;
    const cas = seq(k, [[0.8, STAND.cas], [1.8, SAGGING], [2.8, SITTING], [3.8, LYING]]);
    const rig = profileRig(cas);
    const lower = phase(k, 0.8, 3);
    const rescuer = seq(k, [
      [0.8, STAND.rescuer],
      [2.6, { hip: [X - 46, G - 96], torso: -60, facing: 1, head: -10, face: "open", legN: { to: [X - 14, G - 6] }, legF: { to: [X - 84, G - 6] }, armN: { to: [X - 8, G - 108] }, armF: { to: [X - 10, G - 110] } }],
      [3.8, { hip: [X - 96, G - 64], torso: -64, facing: 1, head: -20, face: "open", legN: { to: [X - 150, G - 7], foot: 180 }, legF: { to: [X - 146, G - 9], foot: 180 }, armN: { to: [X - 54, G - 38] }, armF: { to: [X - 58, G - 36] } }],
    ]);
    if (lower > 0 && lower < 1) {
      rescuer.armN = { to: add(rig.shoulder, [-4, -10]) };
      rescuer.armF = { to: add(rig.shoulder, [-8, -8]) };
    }
    return (
      <Stage>
        <Profile pose={rescuer} look={LOOKS.rescuer} layer="body" />
        <Profile pose={cas} look={LOOKS.casualty} />
        <Profile pose={rescuer} look={LOOKS.rescuer} layer="nearArm" />
        {k < 3.9 && <Tag x={16} y={16} text="Support them and lower them gently to the floor" color={COLORS.red} size={11} />}
        {k >= 3.9 && <Phone x={160} y={274} t={k} />}
        {k >= 3.9 && <Panel x={16} y={16} w={300} color={COLORS.red} title="Call 10177 and start CPR" lines={["Begin with chest compressions straight away.", "Before each breath, look in the mouth: remove", "an object only if you can clearly see it.", "Never sweep a finger blindly."]} />}
      </Stage>
    );
  },
  insets: [
    {
      title: "Then: CPR",
      render: () => (
        <g>
          {["30 chest compressions", "Look in the mouth — remove only", "a clearly visible object", "2 rescue breaths (if trained)", "Repeat until help arrives"].map((text, i) => (
            <InsetText key={text} x={i === 2 ? 30 : 14} y={26 + i * 22} size={10} lines={`${i === 2 ? "" : "•"} ${text}`} weight={i === 0 ? 600 : 400} />
          ))}
        </g>
      ),
    },
    {
      title: "Why compressions help",
      render: () => <InsetText x={14} y={28} size={10} lines={["Chest compressions raise pressure in", "the chest and can push the blockage out,", "as well as keeping blood moving.", "", "See the CPR guide for full technique."]} />,
    },
  ],
  checks: ["Lower them gently — protect the head", "Call 10177, start compressions", "Remove only an object you can see"],
};

export const CHOKING_SCENES = [step1, step2, step3, step4, step5, step6];
