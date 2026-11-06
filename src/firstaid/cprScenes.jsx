/* CPR simulation scenes. Each scene draws a 640×360 main view plus close-up insets. */
import { COLORS, LOOKS, add, dirOf, mix, mul, phase, profileRig, seq } from "./rig.js";
import { Arrow, Bubble, Screen, Callout, Check, Floor, FrontLower, FrontUpper, GroundShadow, Panel, Phone, Profile, Tag, TimerRing } from "./figures.jsx";
import { AedSign, AirwayHead, BreathTrace, ChestTopView, InsetText, Pointer, TORSO_MARKS, TorsoFront } from "./diagrams.jsx";

const G = 300;
const BEAT = 60 / 110;
const font = { fontFamily: "'IBM Plex Sans',sans-serif" };

function casualty(extra = {}) {
  return {
    hip: [420, G - 17], torso: 180, facing: 1, head: 0, face: "closed",
    armN: { to: [437, G - 10] }, armF: { to: [437, G - 12] },
    legN: { to: [548, G - 9] }, legF: { to: [545, G - 11] },
    ...extra,
  };
}

const BASE = profileRig(casualty());
const STERNUM = BASE.local([18.5, -0.66 * 92]);
const SHOULDER_TOP = BASE.local([14, -0.82 * 92]);

function compression(t) {
  const c = (t % BEAT) / BEAT;
  return { c, depth: Math.sin(Math.PI * c), count: Math.floor(t / BEAT) % 30 + 1 };
}

function compressPose(depth, x = STERNUM[0]) {
  const press = depth * 8;
  const wrist = [x, STERNUM[1] + press * 0.9 - 11];
  return {
    x, hipY: 232 + press * 0.3, shoulderY: 154 + press, headDown: 0.45,
    armL: { to: wrist, straight: true, grip: "heel", hand: 90 },
    armR: { to: wrist, straight: true, grip: "heel", hand: 90 },
  };
}

function Scene({ rescuer, cas, children, before = null, after = null }) {
  return (
    <>
      <Floor y={G} />
      <GroundShadow x={400} y={G + 2} rx={150} />
      {before}
      {rescuer && <FrontLower pose={rescuer} look={LOOKS.rescuer} ground={G} />}
      <Profile pose={cas} look={LOOKS.casualty} />
      {rescuer && <FrontUpper pose={rescuer} look={LOOKS.rescuer} />}
      {after}
      {children}
    </>
  );
}

function CompressionHud({ t }) {
  const { c, depth, count } = compression(t);
  const cm = depth * 5.5;
  const recoil = c > 0.78 || c < 0.06;
  return (
    <Screen><g style={font}>
      <rect x={14} y={14} width={200} height={150} rx={8} fill="#fff" stroke="#C8D0E0" />
      <text x={26} y={34} fontSize={9.5} fontWeight={700} fill={COLORS.muted} letterSpacing={1}>COMPRESSIONS</text>
      <text x={26} y={74} fontSize={38} fontWeight={700} fill={COLORS.red} fontFamily="'IBM Plex Mono',monospace">{String(count).padStart(2, "0")}</text>
      <text x={78} y={74} fontSize={14} fontWeight={600} fill={COLORS.muted}>/ 30</text>
      <text x={26} y={98} fontSize={11} fontWeight={700} fill={COLORS.ink}>110 per minute</text>
      {[0, 1, 2, 3].map(i => <circle key={i} cx={30 + i * 14} cy={110} r={4.5} fill={(count - 1) % 4 === i ? COLORS.red : "#E3E8F0"} />)}
      <circle cx={30} cy={136} r={6} fill={recoil ? COLORS.green : "#E3E8F0"} />
      <text x={42} y={140} fontSize={10.5} fontWeight={600} fill={recoil ? COLORS.green : COLORS.muted}>Let the chest rise fully</text>
      <rect x={168} y={28} width={16} height={116} rx={3} fill="#EEF2F7" stroke="#C8D0E0" />
      <rect x={168} y={28 + 5 * 15.5} width={16} height={15.5} fill={COLORS.green} opacity={0.35} />
      {[0, 2, 4, 6].map(v => <text key={v} x={190} y={32 + v * 15.5} fontSize={8} fill={COLORS.muted}>{v} cm</text>)}
      <path d={`M162 ${28 + cm * 15.5} l-8 -5 v10z`} fill={COLORS.red} />
      <rect x={168} y={28} width={16} height={cm * 15.5} rx={3} fill={COLORS.red} opacity={0.55} />
    </g></Screen>
  );
}

function PostureSide({ depth }) {
  const p = depth * 7;
  const floor = 266;
  const chestTop = 232 + p * 0.55;
  const shoulder = [300, 128 + p];
  const a = -66;
  const d = dirOf(a);
  const front = [-d[1], d[0]];
  const hip = add(add(shoulder, mul(front, 2)), mul(d, -0.86 * 92));
  const arm = { to: [300, chestTop - 10], straight: true, hand: 90, grip: "heel" };
  const pose = { hip, torso: a, facing: 1, head: -16, face: "open", armN: arm, armF: arm, legN: { to: [hip[0] - 66, floor - 7], foot: 182 }, legF: { to: [hip[0] - 63, floor - 9], foot: 182 } };
  return (
    <g>
      <g transform="translate(-96 -32) scale(0.72)">
        <rect x={150} y={floor} width={260} height={8} fill="#DCE3EE" />
        <ellipse cx={300} cy={floor - 17} rx={36} ry={17} fill={LOOKS.casualty.shirt} stroke="#5D7FA3" />
        <Profile pose={pose} look={LOOKS.rescuer} />
        <line x1={300} y1={shoulder[1] - 6} x2={300} y2={chestTop + 2} stroke={COLORS.green} strokeWidth={2} strokeDasharray="5 4" />
        <path d={`M300 ${chestTop - 12} h12 v12`} fill="none" stroke={COLORS.green} strokeWidth={1.6} />
      </g>
      <InsetText x={160} y={30} lines={["Shoulders directly", "over your hands"]} color={COLORS.green} />
      <InsetText x={160} y={66} lines={["Arms straight,", "elbows locked"]} />
      <InsetText x={160} y={102} lines={["Bend at the hips —", "use body weight"]} />
      <InsetText x={160} y={138} lines={["Push 5–6 cm,", "then let it rise"]} />
    </g>
  );
}

function RatioBar({ t }) {
  const cycle = 30 * BEAT + 5;
  const k = t % cycle;
  const index = k < 30 * BEAT ? Math.floor(k / BEAT) : 30 + Math.min(1, Math.floor((k - 30 * BEAT) / 2.5));
  return (
    <g>
      <InsetText x={12} y={22} lines={["One CPR cycle: 30 compressions, 2 breaths"]} />
      {Array.from({ length: 32 }, (_, i) => (
        <rect key={i} x={i >= 30 ? 237 + (i - 30) * 12 : 12 + i * 7.3} y={44} width={i >= 30 ? 9 : 5.5} height={i >= 30 ? 30 : 22} rx={1.5}
          fill={i >= 30 ? COLORS.amber : COLORS.red} opacity={i === index ? 1 : i < index ? 0.55 : 0.18} />
      ))}
      <InsetText x={12} y={98} lines={["Restart compressions within 10 seconds", "of the first breath. If the chest does not", "rise, re-tilt the head before breath two —", "never more than 2 attempts."]} size={8.8} />
    </g>
  );
}

/* ── Step 1: danger and response ──────────────────────────────── */
const step1 = {
  label: "Rescuer checks the area is safe, then taps the casualty's shoulders and shouts.",
  rest: 3,
  main: t => {
    const k = t % 6.5;
    const scanning = k < 1.8;
    const reach = phase(k, 1.6, 0.5);
    const tap = scanning ? 0 : Math.abs(Math.sin((k - 1.8) * Math.PI * 2.2)) * 3.5;
    const left = mix([326, 246], [SHOULDER_TOP[0] - 8, SHOULDER_TOP[1] - 11 + tap], reach);
    const right = mix([350, 246], [SHOULDER_TOP[0] + 8, SHOULDER_TOP[1] - 11 + tap], reach);
    const rescuer = {
      x: 338, hipY: 232, lean: 10 + 14 * reach, headDown: 0.25 * reach,
      turn: scanning ? Math.sin(k * 3.5) : 0.3, talk: scanning ? 0 : (Math.sin(k * 10) > 0 ? 0.9 : 0.3),
      armL: { to: left, hand: 90 }, armR: { to: right, hand: 90 },
    };
    return (
      <Scene rescuer={rescuer} cas={casualty()}>
        {scanning
          ? <Panel x={16} y={16} w={232} title="1. Check for danger first" color={COLORS.amber} lines={["Traffic, fire, electricity, gas, falling", "objects — only approach when safe."]} />
          : <Bubble at={[372, 104]} text={["Are you all right?", "Can you hear me?"]} />}
        {!scanning && <Callout at={[SHOULDER_TOP[0] + 8, SHOULDER_TOP[1] - 2]} to={[440, 210]} text={["Tap both shoulders", "firmly and shout"]} />}
        {k > 3.6 && <Panel x={16} y={16} w={232} title="No response?" color={COLORS.red} lines={["Shout for help. Keep a helper with you", "to call 10177 and fetch an AED."]} />}
      </Scene>
    );
  },
  insets: [
    {
      title: "What counts as a response",
      render: () => (
        <g>
          {[["Opens eyes", true], ["Moves or groans", true], ["Speaks to you", true]].map(([text], i) => (
            <g key={text}>
              <Check x={22} y={26 + i * 26} />
              <InsetText x={38} y={30 + i * 26} lines={text} size={10} />
            </g>
          ))}
          <InsetText x={14} y={114} lines={["Responds: leave them as found, find out", "what's wrong and get help.", "No response: shout for help, then open", "the airway."]} size={8.8} />
        </g>
      ),
    },
    {
      title: "Safe approach",
      render: () => (
        <g>
          {["Traffic", "Fire / smoke", "Live electricity", "Gas or chemicals"].map((text, i) => (
            <g key={text}>
              <rect x={12 + (i % 2) * 122} y={14 + Math.floor(i / 2) * 44} width={114} height={34} rx={6} fill="#FFF7E8" stroke="#F0C67A" />
              <path d={`M${24 + (i % 2) * 122} ${40 + Math.floor(i / 2) * 44} l8 -16 l8 16z`} fill="#F5B731" stroke="#9A6A00" strokeWidth={0.8} />
              <InsetText x={46 + (i % 2) * 122} y={35 + Math.floor(i / 2) * 44} lines={text} size={9.5} />
            </g>
          ))}
          <InsetText x={12} y={124} lines={["Don't become a second casualty. If it's", "unsafe, call 10177 and wait at a distance."]} size={8.8} />
        </g>
      ),
    },
  ],
  checks: ["Approach only when it is safe", "Tap both shoulders firmly and shout", "No response: shout for help"],
};

/* ── Step 2: open the airway ──────────────────────────────────── */
function airwayHands(rig, reach) {
  const forehead = rig.headLocal([8, -39]);
  const chin = rig.headLocal([8, -6]);
  return {
    forehead, chin,
    left: { to: mix([280, 246], [forehead[0] - 9, forehead[1] - 10], reach), hand: 52 },
    right: { to: mix([330, 246], [chin[0] + 13, chin[1] + 3], reach), hand: 196 },
  };
}

const step2 = {
  label: "Rescuer places one hand on the forehead and two fingertips under the chin and tilts the head back.",
  rest: 3.5,
  main: t => {
    const k = t % 6;
    const tilt = seq(k, [[0.9, 0], [2.3, 24], [4.9, 24], [5.6, 0]]);
    const reach = seq(k, [[0, 0], [0.9, 1], [5.2, 1], [5.9, 0]]);
    const cas = casualty({ head: tilt });
    const hands = airwayHands(profileRig(cas), reach);
    const rescuer = { x: 302, hipY: 236, lean: 26, headDown: 0.45, armL: hands.left, armR: hands.right };
    return (
      <Scene rescuer={rescuer} cas={cas}>
        <Panel x={16} y={16} w={236} title="Position" lines={["On their back, on a firm flat surface.", "Kneel beside their head and chest."]} />
        <Callout at={[hands.forehead[0] - 2, hands.forehead[1] + 1]} to={[236, 168]} anchor="end" text={["Hand on the forehead —", "tilt the head back gently"]} />
        <Callout at={hands.chin} to={[430, 200]} text={["Two fingertips under", "the bony part of the chin —", "lift the chin"]} />
        {tilt > 20 && <Tag x={16} y={92} text="Airway open" color={COLORS.green} size={11} />}
        {reach > 0.5 && tilt < 20 && <Arrow from={[280, 252]} to={[268, 272]} color={COLORS.amber} />}
      </Scene>
    );
  },
  insets: [
    { title: "Why the head tilt matters", render: t => <AirwayHead tilt={seq(t % 6, [[0.9, 0], [2.3, 24], [4.9, 24], [5.6, 0]])} /> },
    {
      title: "Avoid",
      render: () => (
        <g>
          {["Pressing the soft skin under the chin", "Forcing the head back roughly", "Blind finger sweeps of the mouth"].map((text, i) => (
            <g key={text}>
              <path d={`M18 ${22 + i * 30} l10 10 m0 -10 l-10 10`} stroke={COLORS.red} strokeWidth={2.2} strokeLinecap="round" />
              <InsetText x={36} y={31 + i * 30} lines={text} size={9.5} />
            </g>
          ))}
          <InsetText x={14} y={124} lines={["Remove an object only if you can", "clearly see it in the mouth."]} size={9} />
        </g>
      ),
    },
  ],
  checks: ["Hand on forehead, fingertips under the bony chin", "Tilt gently until the chin points up", "Keep holding the airway open"],
};

/* ── Step 3: check breathing ──────────────────────────────────── */
const step3 = {
  label: "Rescuer keeps the airway open, puts their cheek near the mouth and watches the chest for up to 10 seconds.",
  rest: 6,
  main: t => {
    const k = t % 13;
    const gasp = k > 5.4 && k < 6.6 ? Math.sin((k - 5.4) / 1.2 * Math.PI) : 0;
    const cas = casualty({ head: 24, mouth: gasp * 0.9 });
    const rig = profileRig(cas);
    const hands = airwayHands(rig, 1);
    const mouth = rig.headLocal([13, -13]);
    const shoulderY = 252 - 92 * Math.cos(58 * Math.PI / 180);
    const rescuer = { x: mouth[0] - 4, hipY: 252, lean: 58, headDown: 0.55, turn: 1, headDrop: mouth[1] - 21 - (shoulderY - 21 + 4.4), armL: hands.left, armR: hands.right };
    const eye = [mouth[0] + 4, mouth[1] - 22];
    return (
      <Scene rescuer={rescuer} cas={cas}>
        <TimerRing x={52} y={58} r={30} progress={Math.min(k, 10) / 10} label={`${Math.min(10, Math.floor(k))} s`} />
        <Screen>
          <text x={92} y={50} fontSize={11} fontWeight={700} fill={COLORS.ink} style={font}>Look and listen</text>
          <text x={92} y={65} fontSize={10} fill={COLORS.muted} style={font}>no more than 10 seconds</text>
        </Screen>
        <line x1={eye[0]} y1={eye[1]} x2={STERNUM[0]} y2={STERNUM[1] - 2} stroke={COLORS.blue} strokeWidth={1.2} strokeDasharray="4 3" />
        <Callout at={[STERNUM[0], STERNUM[1] - 1]} to={[430, 196]} text={["Look: is the chest", "rising and falling?"]} />
        <Callout at={[mouth[0] - 6, mouth[1] - 10]} to={[236, 150]} anchor="end" text={["Listen and feel at", "the mouth for breath"]} />
        {gasp > 0.1 && <Callout at={[mouth[0] + 2, mouth[1] - 2]} to={[430, 120]} color={COLORS.red} text={["A gasp is NOT", "normal breathing"]} />}
        {k > 10 && <Panel x={16} y={96} w={238} color={COLORS.red} title="Not breathing normally" lines={["→ Call 10177 and get an AED", "→ Start chest compressions now", "Unsure? Treat it as not normal."]} />}
      </Scene>
    );
  },
  insets: [
    { title: "Normal breathing vs gasping", render: t => <BreathTrace t={t} /> },
    {
      title: "If they are breathing normally",
      render: () => <InsetText x={14} y={30} size={10} lines={["Turn them into the recovery position", "on their side so the airway stays clear.", "", "Call 10177, stay with them and keep", "checking that breathing stays normal.", "Start CPR if it stops."]} />,
    },
  ],
  checks: ["Keep the airway open while you check", "Watch the chest and listen at the mouth", "Gasping is not normal breathing"],
};

/* ── Step 4: call and send for an AED ─────────────────────────── */
function walking(x, t, facing, ground) {
  const s = Math.sin(t * 6.5);
  const c = Math.cos(t * 6.5);
  const hip = [x, ground - 129 + Math.abs(s) * 2];
  return {
    hip, torso: -90 + facing * 4, facing, face: "open",
    legN: { to: [x + facing * 26 * s, ground - 6 - Math.max(0, c) * 9] },
    legF: { to: [x - facing * 26 * s, ground - 6 - Math.max(0, -c) * 9] },
    armN: { to: [x - facing * 20 * s, hip[1] + 8] },
    armF: { to: [x + facing * 20 * s, hip[1] + 8] },
  };
}

const step4 = {
  label: "Rescuer calls 10177 on speaker and sends a bystander to fetch an AED.",
  rest: 2.5,
  main: t => {
    const k = t % 8;
    const point = seq(k, [[0.8, 0], [1.3, 1], [3.6, 1], [4.2, 0]]);
    const rescuer = {
      x: 352, hipY: 232, lean: 6, turn: 0.6 * point, talk: point > 0.5 ? (Math.sin(k * 11) > 0 ? 0.9 : 0.3) : 0,
      armL: { to: [334, 250], hand: 90 },
      armR: { to: mix([372, 250], [470, 140], point), hand: mix(90, -30, point) },
    };
    const leaving = k > 3.8;
    const bystander = leaving
      ? walking(590 + (k - 3.8) * 30, k, 1, G)
      : { hip: [590, G - 130], torso: -90, facing: -1, head: Math.sin(k * 6) * (k > 2.2 ? 6 : 0), face: "open", armN: { to: [582, G - 66] }, armF: { to: [596, G - 64] }, legN: { to: [585, G - 6] }, legF: { to: [597, G - 6] } };
    return (
      <Scene rescuer={rescuer} cas={casualty()} after={<Profile pose={bystander} look={LOOKS.bystander} />}>
        <Phone x={232} y={262} t={k} />
        <Callout at={[243, 262]} to={[226, 186]} anchor="end" text={["Call 10177 —", "phone on speaker,", "hands stay free"]} />
        {point > 0.5 && <Bubble at={[292, 64]} text={["You — fetch an AED", "and bring it here!"]} />}
        {leaving && <Arrow from={[560, 120]} to={[620, 120]} color={COLORS.green} />}
      </Scene>
    );
  },
  insets: [
    {
      title: "Tell the 10177 operator",
      render: () => <InsetText x={14} y={26} size={9.6} lines={["Exactly where you are: building,", "floor and the entrance to meet at", "", "The person is unresponsive and", "not breathing normally", "", "Stay on the line — they will guide you"]} />,
    },
    {
      title: "Look for this sign",
      render: () => (
        <g>
          <AedSign x={16} y={20} size={70} />
          <InsetText x={100} y={36} size={9.6} lines={["AED: automated", "external defibrillator.", "", "It talks you through", "every step and only", "shocks if needed."]} />
        </g>
      ),
    },
  ],
  checks: ["Call 10177 on speaker", "Send someone for an AED", "Don't leave the person to search yourself if others can go"],
};

/* ── Step 5: chest compressions ───────────────────────────────── */
const step5 = {
  label: "Rescuer gives chest compressions with straight arms, shoulders over the hands, at 110 per minute.",
  rest: BEAT * 0.5,
  main: t => {
    const { depth } = compression(t);
    const rescuer = compressPose(depth);
    return (
      <Scene rescuer={rescuer} cas={casualty({ press: depth * 7 })}>
        <CompressionHud t={t} />
        <Callout at={[STERNUM[0] + 21, 158 + depth * 8]} to={[440, 104]} text={["Shoulders directly", "over your hands"]} />
        <Callout at={[STERNUM[0] + 11, 212 + depth * 6]} to={[440, 162]} text={["Arms straight —", "elbows locked"]} />
        <Callout at={[STERNUM[0] + 4, STERNUM[1] + depth * 6]} to={[440, 222]} color={COLORS.red} text={["Heel of hand: lower", "half of the breastbone"]} />
      </Scene>
    );
  },
  insets: [
    {
      title: "Hand position (from above)",
      render: t => (
        <g>
          <ChestTopView pulse={compression(t).depth} />
          <Pointer from={[134, 92]} to={[178, 154]} color={COLORS.red} />
          <InsetText x={180} y={152} lines={["Heel of hand"]} size={8.5} color={COLORS.red} />
          <Pointer from={[145, 40]} to={[176, 18]} />
          <InsetText x={178} y={16} lines={["Fingers interlocked,", "lifted off the ribs"]} size={8.5} />
          <InsetText x={8} y={14} lines={["Lower half of breastbone (shaded)"]} size={8.5} color={COLORS.green} />
        </g>
      ),
    },
    { title: "Body position (side view)", render: t => <PostureSide depth={compression(t).depth} /> },
  ],
  checks: ["Heel of hand on the lower half of the breastbone", "Straight arms, shoulders over hands", "5–6 cm deep, 100–120 a minute, full recoil"],
};

/* ── Step 6: rescue breaths ───────────────────────────────────── */
const step6 = {
  label: "Rescuer pinches the nose, seals their lips over the mouth and gives two 1-second breaths, watching the chest rise.",
  rest: 1.6,
  main: t => {
    const k = t % 7.5;
    const rise = seq(k, [[0.9, 0], [1.9, 6], [2.9, 0], [3.1, 0], [4.1, 6], [5.1, 0]]);
    const sealed = (k > 0.6 && k < 1.95) || (k > 2.95 && k < 4.15);
    const back = phase(k, 5.2, 1.2);
    const cas = casualty({ head: 24 * (1 - back), rise });
    const rig = profileRig(cas);
    const mouth = rig.headLocal([13, -13]);
    const nose = rig.headLocal([15, -21]);
    const chin = rig.headLocal([8, -6]);
    const shoulderY = 250 - 92 * Math.cos(55 * Math.PI / 180);
    const atMouth = mouth[1] - 19 - (shoulderY - 21 + 4);
    const breathing = {
      x: mouth[0] - 2, hipY: 250, lean: 55, headDown: 0.5, turn: sealed ? 0 : 1, headDrop: sealed ? atMouth : atMouth - 20,
      armL: { to: [nose[0] - 7, nose[1] - 10], hand: 50 }, armR: { to: [chin[0] + 13, chin[1] + 3], hand: 196 },
    };
    const rescuer = back > 0 ? mix(breathing, compressPose(0), back) : breathing;
    const breath = k < 2.95 ? 1 : 2;
    return (
      <Scene rescuer={rescuer} cas={cas}>
        {back === 0 && <>
          <Tag x={16} y={16} text={`Breath ${breath} of 2`} color={COLORS.amber} size={12} />
          <Callout at={nose} to={[236, 132]} anchor="end" text={["Pinch the soft", "part of the nose"]} />
          <Callout at={[mouth[0] + 3, mouth[1] - 4]} to={[236, 190]} anchor="end" text={["Seal your lips", "around their mouth"]} />
          <Callout at={[STERNUM[0], STERNUM[1] - rise]} to={[430, 186]} color={rise > 2 ? COLORS.green : COLORS.blue} text={["Blow steadily for 1 s —", "watch the chest rise"]} />
        </>}
        {back > 0 && <Tag x={16} y={16} text="Back to compressions — within 10 seconds" color={COLORS.red} size={11} />}
      </Scene>
    );
  },
  insets: [
    { title: "30 : 2", render: t => <RatioBar t={t} /> },
    {
      title: "Not trained, or not willing?",
      render: () => <InsetText x={14} y={28} size={10} lines={["Skip the breaths and give continuous", "chest compressions — hands-only CPR.", "", "It still keeps blood flowing to the brain", "until the ambulance or an AED arrives."]} />,
    },
  ],
  checks: ["Head tilted, chin lifted, nose pinched", "1 second per breath — chest visibly rises", "Restart compressions within 10 seconds"],
};

/* ── Step 7: AED and keep going ───────────────────────────────── */
const PAD1 = BASE.local([14, -0.82 * 92]);
const PAD2 = BASE.local([3, -0.6 * 92]);
const AED = { x: 238, y: 268, button: [262, 282] };

function AedUnit({ screen, flash }) {
  return (
    <g>
      <rect x={AED.x} y={AED.y} width={48} height={36} rx={6} fill="#F2B705" stroke="#8A6800" />
      <rect x={AED.x + 5} y={AED.y + 5} width={26} height={12} rx={2} fill="#14212B" />
      <text x={AED.x + 18} y={AED.y + 13.5} textAnchor="middle" fontSize={4.6} fill="#7CFFB2" fontFamily="monospace">{screen}</text>
      <circle cx={AED.button[0]} cy={AED.button[1]} r={5} fill={flash ? "#FF3B30" : "#D93025"} stroke="#fff" strokeWidth={1} />
      <path d={`M${AED.x + 30} ${AED.y + 8} Q${(AED.x + PAD1[0]) / 2} ${AED.y - 30} ${PAD1[0] - 6} ${PAD1[1] - 2}`} fill="none" stroke="#333" strokeWidth={1.2} />
      <path d={`M${AED.x + 44} ${AED.y + 10} Q${(AED.x + PAD2[0]) / 2} ${AED.y + 40} ${PAD2[0] - 8} ${PAD2[1]}`} fill="none" stroke="#333" strokeWidth={1.2} />
    </g>
  );
}

const step7 = {
  label: "Rescuer attaches the AED pads, stands clear while it analyses and shocks, then restarts compressions.",
  rest: 3.6,
  main: t => {
    const k = t % 12;
    const reachTo = (from, to) => ({ to: [to[0], to[1] - 11], hand: 90, from });
    const place = seq(k, [[0, 0], [0.6, 1], [1.3, 2], [1.9, 1], [2.6, 3], [3, 4]]);
    const handR = place < 1 ? mix([336, 250], [AED.x + 26, AED.y - 2], place)
      : place < 2 ? mix([AED.x + 26, AED.y - 2], [PAD1[0], PAD1[1] - 9], place - 1)
        : place < 3 ? mix([PAD1[0], PAD1[1] - 9], [PAD2[0] + 3, PAD2[1] - 9], place - 2)
          : [PAD2[0] + 3, PAD2[1] - 9];
    const analysing = k >= 3 && k < 5.2;
    const advise = k >= 5.2 && k < 6.4;
    const press = k >= 6.4 && k < 7;
    const shock = k >= 6.7 && k < 7;
    const cpr = k >= 7;
    const clear = { x: 316, hipY: 238, lean: 6, turn: 0, armL: { to: [282, 168] }, armR: { to: [350, 168] } };
    const placing = { x: 316, hipY: 245, lean: 50, headDown: 0.6, armL: { to: [300, 250], hand: 90 }, armR: { ...reachTo(null, [handR[0], handR[1] + 11]) } };
    const pressing = { ...clear, lean: 40, hipY: 245, armL: { to: [AED.button[0] + 2, AED.button[1] - 10], hand: 100 }, armR: { to: [348, 230] } };
    const rescuer = cpr ? compressPose(compression(k - 7).depth) : press ? pressing : (analysing || advise) ? clear : placing;
    const cas = casualty({ press: cpr ? compression(k - 7).depth * 7 : 0, hip: [420, G - 17 - (shock ? 3 : 0)] });
    const screen = analysing ? "ANALYSING" : advise ? "SHOCK ADVISED" : press ? "PRESS SHOCK" : cpr ? "START CPR" : "ATTACH PADS";
    return (
      <Scene rescuer={rescuer} cas={cas} before={<AedUnit screen={screen} flash={advise && Math.sin(k * 20) > 0} />}
        after={<>
          {place >= 1.9 && <rect x={PAD1[0] - 12} y={PAD1[1] - 4} width={22} height={6} rx={2} fill="#3A3F4B" stroke="#fff" strokeWidth={0.8} />}
          {place >= 2.9 && <rect x={PAD2[0] - 9} y={PAD2[1] - 8} width={16} height={16} rx={2} fill="#3A3F4B" stroke="#fff" strokeWidth={0.8} />}
        </>}>
        {k < 3 && <Callout at={PAD1} to={[440, 150]} text={["Pads on bare skin:", "below the right collarbone", "and on the left side"]} />}
        {(analysing || advise) && <rect x={250} y={232} width={330} height={74} rx={10} fill="none" stroke={COLORS.red} strokeWidth={2} strokeDasharray="7 5" />}
        {analysing && <Tag x={16} y={16} text="Analysing — nobody touch the person" color={COLORS.red} size={11} />}
        {advise && <Tag x={16} y={16} text="Shock advised — stand clear!" color={COLORS.red} size={12} />}
        {press && <Tag x={16} y={16} text="Press the flashing shock button" color={COLORS.red} size={11} />}
        {shock && <path d="M370 210 L356 240 L368 240 L352 272 L382 232 L368 232 L380 210Z" fill="#FFD60A" stroke="#C99700" />}
        {cpr && <Tag x={16} y={16} text="Restart CPR straight away — follow the AED prompts" color={COLORS.green} size={11} />}
      </Scene>
    );
  },
  insets: [
    {
      title: "Pad placement",
      render: () => (
        <TorsoFront x={14} y={8} s={1.02}>
          <rect x={TORSO_MARKS.padUpper[0] - 12} y={TORSO_MARKS.padUpper[1] - 9} width={24} height={18} rx={3} fill="#3A3F4B" opacity={0.9} />
          <rect x={TORSO_MARKS.padLower[0] - 9} y={TORSO_MARKS.padLower[1] - 13} width={18} height={26} rx={3} fill="#3A3F4B" opacity={0.9} />
          <InsetText x={128} y={30} size={9} lines={["Their RIGHT side:", "just below the", "collarbone"]} />
          <InsetText x={128} y={84} size={9} lines={["Their LEFT side:", "below the armpit,", "on the ribs"]} />
          <InsetText x={128} y={136} size={8.5} lines={["Remove clothing, wipe", "wet skin dry"]} />
        </TorsoFront>
      ),
    },
    {
      title: "Keep going until…",
      render: () => (
        <g>
          {[["Professional help takes over"], ["They wake up, move, open their eyes", "and breathe normally"], ["You are too exhausted to continue"]].map((text, i) => (
            <g key={text[0]}>
              <circle cx={20} cy={[24, 52, 92][i] - 4} r={3.2} fill={COLORS.blue} />
              <InsetText x={30} y={[24, 52, 92][i]} lines={text} size={9.6} weight={400} />
            </g>
          ))}
          <InsetText x={14} y={130} size={9} lines={["Swap rescuers every 2 minutes if you", "can — compressions get shallow with fatigue."]} />
        </g>
      ),
    },
  ],
  checks: ["Switch on the AED and follow its voice", "Nobody touches the person during analysis or shock", "Restart compressions immediately after"],
};

export const CPR_SCENES = [step1, step2, step3, step4, step5, step6, step7];
