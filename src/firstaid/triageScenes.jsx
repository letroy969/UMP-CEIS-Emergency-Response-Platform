/* Live Simulation scenes for the emergency triage page.
   Each guidance step names an animation type (AID_DB `anim`). Types that
   match a first-aid library scene reuse it; the rest are drawn here with
   the same cartoon cast. Labels are hidden: the triage panel is narrow,
   so each scene carries a short caption below it instead. */
import { BODY, COLORS, LOOKS, SCENE, add, clamp01, lerp, mix, phase, profileRig, seq, solveLimb } from "./rig.js";
import { Arrow, Cross, Floor, FrontLower, FrontUpper, GroundShadow, Phone, Profile } from "./figures.jsx";
import { BLEEDING_SCENES } from "./bleedingScenes.jsx";
import { BURNS_SCENES } from "./burnsScenes.jsx";
import { CHOKING_SCENES } from "./chokingScenes.jsx";
import { CPR_SCENES } from "./cprScenes.jsx";

const G = 300;
const L = BODY.torso;
const font = { fontFamily: "'IBM Plex Sans',sans-serif" };
const WOOD = "#C98B55";
const WOOD_DARK = "#A8703F";

// ── Lying casualty with a rescuer kneeling behind ───────────────
function lying(extra = {}) {
  return {
    hip: [330, G - 17], torso: 180, facing: 1, head: 6, face: "closed",
    armN: { to: [346, G - 10] }, armF: { to: [346, G - 12] },
    legN: { to: [458, G - 9] }, legF: { to: [455, G - 12] },
    ...extra,
  };
}
const LIE = profileRig(lying());
const KNEE = solveLimb(LIE.hipJoint, [458, G - 9], BODY.thigh, BODY.shin, -1).mid;
const ANKLE = [458, G - 9];
const SHIN = [lerp(KNEE[0], ANKLE[0], 0.5), lerp(KNEE[1], ANKLE[1], 0.5) - 9];

/** Convulsing casualty: limbs and head jerk while `on` is 1. */
function seizing(t, on = 1, extra = {}) {
  const j = (a, b, s = 5) => [Math.sin(t * a) * s * on, -Math.abs(Math.cos(t * b)) * s * 1.4 * on];
  return lying({
    head: 6 + Math.sin(t * 23) * 6 * on, mouth: 0.15,
    armN: { to: add([344, G - 14], j(31, 27)) }, armF: { to: add([350, G - 18], j(29, 33)) },
    legN: { to: add(ANKLE, [Math.sin(t * 26) * 3 * on, 0]) }, legF: { to: add([455, G - 12], [Math.cos(t * 24) * 3 * on, 0]) },
    ...extra,
  });
}

function kneel(x, armL, armR, extra = {}) {
  return {
    x, hipY: 248, shoulderY: 190, headDown: 0.45,
    armL: armL && { straight: true, ...armL }, armR: armR && { straight: true, ...armR },
    ...extra,
  };
}

function LyingStage({ cas = lying(), rescuer = null, under = null, over = null, children }) {
  return (
    <>
      <Floor y={G} />
      <GroundShadow x={330} y={G + 2} rx={140} />
      {under}
      {rescuer && <FrontLower pose={rescuer} look={LOOKS.rescuer} ground={G} />}
      <Profile pose={cas} look={LOOKS.casualty} />
      {over}
      {rescuer && <FrontUpper pose={rescuer} look={LOOKS.rescuer} />}
      {children}
    </>
  );
}

// ── Seated casualty on a chair, rescuer standing beside ─────────
const SEAT = [300, 228];

function seated(extra = {}) {
  return {
    hip: [SEAT[0] - 2, SEAT[1] - 6], torso: -92, facing: 1, head: 0, face: "open",
    legN: { to: [SEAT[0] + 72, G - 6] }, legF: { to: [SEAT[0] + 64, G - 6] },
    armN: { to: [SEAT[0] + 54, SEAT[1] - 10] }, armF: { to: [SEAT[0] + 48, SEAT[1] - 12] },
    ...extra,
  };
}

function standing(x, facing, extra = {}) {
  return {
    hip: [x, G - 130], torso: facing > 0 ? -84 : -96, facing, head: -4, face: "open",
    armN: { to: [x + 6 * facing, G - 62] }, armF: { to: [x - 4 * facing, G - 64] },
    legN: { to: [x + 8 * facing, G - 6] }, legF: { to: [x - 8 * facing, G - 6] },
    ...extra,
  };
}

/** Rescuer standing behind the chair, near hand resting on the patient's shoulder. */
function behindChair(casRig, extra = {}) {
  return standing(228, 1, {
    torso: -78, head: -10,
    armN: { to: casRig.local([4, -0.95 * L]), hand: 10 },
    armF: { to: casRig.local([-10, -0.9 * L]), hand: 10 },
    ...extra,
  });
}

function Chair() {
  const [x, y] = SEAT;
  return (
    <g>
      <rect x={x - 32} y={y - 96} width={11} height={100} rx={4} fill={WOOD_DARK} />
      <rect x={x - 28} y={y + 6} width={8} height={G - y - 6} fill={WOOD_DARK} />
      <rect x={x + 34} y={y + 6} width={8} height={G - y - 6} fill={WOOD_DARK} />
      <rect x={x - 34} y={y - 2} width={80} height={11} rx={4} fill={WOOD} />
    </g>
  );
}

function SeatedStage({ cas, rescuer = null, behind = null, under = null, over = null, children }) {
  return (
    <>
      <Floor y={G} />
      <GroundShadow x={SEAT[0] + 20} y={G + 2} rx={120} />
      {under}
      {behind && <Profile pose={behind} look={LOOKS.rescuer} layer="body" />}
      <Chair />
      <Profile pose={cas} look={LOOKS.casualty} />
      {behind && <Profile pose={behind} look={LOOKS.rescuer} layer="nearArm" />}
      {rescuer && <Profile pose={rescuer} look={LOOKS.rescuer} />}
      {over}
      {children}
    </>
  );
}

/** Seated casualty pose plus its rig, with the near hand lifted to the mouth by `lift` (0–1). */
function seatedReach(lift, extra = {}) {
  const base = seated(extra);
  const rig = profileRig(base);
  const mouth = rig.headLocal([15, -11]);
  const rest = [SEAT[0] + 54, SEAT[1] - 10];
  const hand = mix(rest, add(mouth, [4, 6]), lift);
  return { pose: { ...base, armN: { to: hand, hand: lerp(20, -100, lift), bend: 1 } }, rig, mouth, hand };
}

function breathing(t, inhale = 2, exhale = 3) {
  const c = t % (inhale + exhale);
  return c < inhale ? Math.sin((c / inhale) * Math.PI / 2) : Math.cos(((c - inhale) / exhale) * Math.PI / 2);
}

function Puffs({ at, t, color = "#fff", dir = 1, n = 3 }) {
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const k = (t * 0.9 + i / n) % 1;
        return <circle key={i} cx={at[0] + dir * k * 26} cy={at[1] - k * 6} r={2 + k * 4} fill={color} opacity={0.85 * (1 - k)} stroke="none" />;
      })}
    </g>
  );
}

function SoundArcs({ at, t, dir = 1 }) {
  return (
    <g fill="none" stroke={COLORS.blue} strokeWidth={2} strokeLinecap="round">
      {[0, 1, 2].map(i => {
        const k = (t * 1.2 + i / 3) % 1;
        const r = 6 + k * 14;
        return <path key={i} d={`M${at[0] + dir * r * 0.7} ${at[1] - r * 0.7} Q${at[0] + dir * r * 1.05} ${at[1]} ${at[0] + dir * r * 0.7} ${at[1] + r * 0.7}`} opacity={1 - k} />;
      })}
    </g>
  );
}

// ── New scenes ──────────────────────────────────────────────────
const rest = {
  label: "Patient sitting upright on a chair holding their chest while a responder keeps a hand on their shoulder.",
  rest: 1,
  main: t => {
    const b = breathing(t, 1.4, 1.8);
    const cas = seated({ face: "distress", mouth: 0.2, rise: b * 3 });
    const rig = profileRig(cas);
    cas.armN = { to: rig.local([19, -0.64 * L]), hand: 200, bend: 1 };
    return <SeatedStage cas={cas} behind={behindChair(rig, { head: -10 + Math.sin(t * 1.6) * 3 })} />;
  },
};

const upright = {
  label: "Patient sitting on a chair leaning forward with hands on knees, breathing slowly, while a responder supports them.",
  rest: 1,
  main: t => {
    const b = breathing(t, 1.6, 2.4);
    const cas = seated({ torso: -74 - b * 4, face: "distress", mouth: 0.3 + b * 0.3, rise: b * 4, head: 10 });
    const rig = profileRig(cas);
    cas.armN = { to: [SEAT[0] + 62, SEAT[1] - 6], hand: 80 };
    cas.armF = { to: [SEAT[0] + 56, SEAT[1] - 8], hand: 80 };
    return <SeatedStage cas={cas} behind={behindChair(rig)} over={b < 0.5 && <Puffs at={rig.headLocal([17, -12])} t={t} />} />;
  },
};

const loosen = {
  label: "Responder loosening the tie and collar of a seated patient.",
  rest: 3,
  main: t => {
    const k = t % 5;
    const loose = phase(k, 0.6, 1.6);
    const cas = seated({ face: "distress", mouth: 0.25 });
    const rig = profileRig(cas);
    const ky = lerp(-0.95, -0.82, loose) * L;
    const knot = rig.local([13, ky]);
    const tie = [[10, ky], [16, ky], [21, -0.5 * L], [18, -0.45 * L], [14, -0.5 * L]].map(p => rig.local(p));
    const wiggle = k < 2.4 ? Math.sin(k * 14) * 2 : 0;
    const rescuer = standing(414, -1, {
      torso: -106, head: 6,
      armN: { to: add(knot, [4, 2 + wiggle]), hand: 200, bend: -1 },
      armF: { to: add(knot, [6, -4 - wiggle]), hand: 200, bend: -1 },
    });
    return (
      <SeatedStage cas={cas} over={<path d={`M${tie.map(p => p.join(" ")).join(" L")}Z`} fill="#C8463D" />} rescuer={rescuer}>
        <circle cx={knot[0]} cy={knot[1]} r={3.6} fill="#A9352D" />
      </SeatedStage>
    );
  },
};

const medicine = {
  label: "Seated patient lifting a tablet to their mouth to chew it slowly.",
  rest: 2.2,
  main: t => {
    const k = t % 5;
    const lift = seq(k, [[0, 0], [1.2, 1], [3.2, 1], [4.4, 0], [5, 0]]);
    const { pose, hand, mouth } = seatedReach(lift, { mouth: k > 1.4 && k < 3.2 ? 0.25 + 0.25 * Math.abs(Math.sin(k * 8)) : 0 });
    const rescuer = standing(420, -1, { armN: { to: [392, 192], hand: 180 } });
    return (
      <SeatedStage cas={pose} rescuer={rescuer}>
        {k < 1.4 && <circle cx={hand[0] + 2} cy={hand[1] - 3} r={3.6} fill="#fff" />}
        {k >= 1.4 && k < 3.2 && <circle cx={mouth[0] - 2} cy={mouth[1]} r={2} fill="#fff" />}
        <rect x={380} y={186} width={22} height={13} rx={2} fill="#E9EEF5" />
      </SeatedStage>
    );
  },
};

const hydrate = {
  label: "Seated patient sipping a cup of cool water slowly.",
  rest: 2.4,
  main: t => {
    const k = t % 6;
    const lift = seq(k, [[0, 0], [1.2, 1], [4, 1], [5.2, 0], [6, 0]]);
    const { pose, hand } = seatedReach(lift);
    const level = 1 - clamp01((k - 1.2) / 2.8) * 0.4;
    const tilt = lerp(0, -40, lift);
    return (
      <SeatedStage cas={pose} rescuer={standing(420, -1, {})}>
        <g transform={`translate(${hand[0] + 4} ${hand[1] - 8}) rotate(${tilt})`}>
          <rect x={-7} y={-12} width={14} height={20} rx={2} fill="#EAF6FF" />
          <rect x={-6} y={8 - 18 * level} width={12} height={18 * level} fill={SCENE.water} opacity={0.75} stroke="none" />
        </g>
      </SeatedStage>
    );
  },
};

const inhaler = {
  label: "Seated patient pressing a blue reliever inhaler at their mouth; a puff of medicine comes out.",
  rest: 2,
  main: t => {
    const k = t % 4;
    const lift = seq(k, [[0, 0], [0.8, 1], [3, 1], [3.6, 0], [4, 0]]);
    const { pose, mouth } = seatedReach(lift, { mouth: 0.3 });
    const puff = k > 1.4 && k < 2.6;
    const body = add(mouth, [6, -2]);
    return (
      <SeatedStage cas={pose} rescuer={standing(420, -1, {})}>
        <g transform={`translate(${body[0]} ${body[1]}) rotate(${lerp(-60, 0, lift)})`} opacity={lift > 0.1 ? 1 : 0}>
          <rect x={0} y={-2} width={14} height={8} rx={2} fill="#2F6FC9" />
          <rect x={10} y={-22} width={10} height={26} rx={3} fill="#4C8BE0" />
        </g>
        {puff && <Puffs at={add(mouth, [2, 0])} t={k * 2} color="#DCEBFA" dir={-1} n={4} />}
      </SeatedStage>
    );
  },
};

const breathe = {
  label: "Responder breathing slowly with the patient: in for four counts, out for six.",
  rest: 1,
  main: t => {
    const b = breathing(t, 2, 3);
    const out = (t % 5) >= 2;
    const cas = seated({ rise: b * 4, mouth: out ? 0.3 : 0, face: "open" });
    const rig = profileRig(cas);
    const rescuer = standing(424, -1, { rise: b * 4, mouth: out ? 0.3 : 0 });
    const rr = profileRig(rescuer);
    return (
      <SeatedStage cas={cas} rescuer={rescuer}>
        {out && <Puffs at={rig.headLocal([17, -12])} t={t} />}
        {out && <Puffs at={rr.headLocal([17, -12])} t={t} dir={-1} />}
        <text x={196} y={112} textAnchor="middle" fontSize={20} fontWeight={700} fill={COLORS.ink} style={font}>{out ? "out… 6" : "in… 4"}</text>
      </SeatedStage>
    );
  },
};

const cool = {
  label: "Patient resting in the shade while a responder fans them with a sheet of paper.",
  rest: 1,
  main: t => {
    const fan = Math.sin(t * 7);
    const cas = seated({ face: "closed", rise: breathing(t) * 2 });
    const rig = profileRig(cas);
    const face = rig.headLocal([20, -20]);
    const hand = [face[0] + 46, face[1] + fan * 12];
    const rescuer = standing(424, -1, { armN: { to: hand, hand: 180 + fan * 25 } });
    return (
      <>
        <rect x={SEAT[0] - 6} y={20} width={8} height={G - 20} fill="#8E98A6" />
        <path d={`M${SEAT[0] - 130} 64 Q${SEAT[0] - 2} -4 ${SEAT[0] + 126} 64 Z`} fill="#F28C6A" />
        <SeatedStage cas={cas} rescuer={rescuer}>
          <g transform={`translate(${hand[0] - 2} ${hand[1]}) rotate(${-10 + fan * 25})`}><rect x={-24} y={-3} width={26} height={18} rx={1} fill="#fff" /></g>
          {[0, 1, 2].map(i => {
            const k = (t * 1.2 + i / 3) % 1;
            const x = hand[0] - 22 - k * 30;
            return <path key={i} d={`M${x} ${face[1] - 12 + i * 10} q-6 -5 -12 0 t-12 0`} fill="none" stroke={SCENE.water} strokeWidth={2} strokeLinecap="round" opacity={1 - k} />;
          })}
        </SeatedStage>
      </>
    );
  },
};

const cloth = {
  label: "Responder laying a cool damp cloth on the forehead of a patient lying down.",
  rest: 2.5,
  main: t => {
    const k = t % 5;
    const place = phase(k, 0.4, 1.4);
    const forehead = LIE.headLocal([14, -29]);
    const pad = mix(add(forehead, [8, -60]), add(forehead, [0, -3]), place);
    const rescuer = kneel(forehead[0] + 30, { to: add(pad, [-6, -4]), hand: 100 }, { to: add(pad, [6, -4]), hand: 80 }, { headDown: 0.55 });
    return (
      <LyingStage cas={lying({ face: "closed", rise: breathing(t) * 2 })} rescuer={rescuer}>
        <rect x={pad[0] - 13} y={pad[1] - 4} width={26} height={8} rx={3} fill="#BFE0FA" />
        {place >= 1 && [0, 1].map(i => <path key={i} d={`M${pad[0] - 6 + i * 10} ${pad[1] - 8 - ((t * 0.8 + i * 0.5) % 1) * 14} q3 -4 0 -8`} fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" opacity={0.8} />)}
      </LyingStage>
    );
  },
};

/* Recovery position, seen from above: on their side, top knee bent forward,
   top hand under the cheek, head tilted back to keep the airway open. */
const recovery = {
  label: "Top-down view of a person in the recovery position: on their side, top knee bent forward, hand under the cheek, head tilted back.",
  rest: 3,
  main: t => {
    const settle = phase(t % 6, 0.2, 1.6);
    const hip = [360, 214];
    const base = { hip, torso: 180, facing: 1, head: lerp(4, 22, settle), face: "closed", rise: breathing(t) * 2.5 };
    const rig = profileRig(base);
    const cheek = rig.headLocal([12, -8]);
    const pose = {
      ...base,
      legF: { to: [hip[0] + 128, hip[1] + 6] },
      legN: { to: mix([hip[0] + 128, hip[1] + 2], [hip[0] + 92, hip[1] - 18], settle), bend: -1 },
      armF: { to: mix(add(rig.shoulder, [10, 4]), add(rig.shoulder, [-6, -82]), settle) },
      armN: { to: mix(add(rig.shoulder, [30, 6]), add(cheek, [-6, -4]), settle), hand: 200, bend: 1 },
    };
    return (
      <>
        <rect data-fa="floor" x={-400} y={-400} width={1440} height={1160} fill={SCENE.floor} stroke="none" />
        <rect x={150} y={126} width={420} height={150} rx={18} fill="#C7DDF0" />
        <Profile pose={pose} look={LOOKS.casualty} />
      </>
    );
  },
};

const comfort = {
  label: "Responder kneeling beside a patient who is coming round, a hand on their shoulder, speaking calmly.",
  rest: 1.4,
  main: t => {
    const talk = Math.abs(Math.sin(t * 6)) * (t % 3 < 2 ? 1 : 0);
    const shoulder = LIE.local([10, -0.86 * L]);
    const rescuer = kneel(shoulder[0] + 22, { to: add(shoulder, [0, -6]), hand: 90, grip: "heel" }, { to: [shoulder[0] + 64, G - 26], hand: 90 }, { headDown: 0.25, talk, turn: -0.5 });
    const mouth = [shoulder[0] + 22, 134];
    return (
      <LyingStage cas={lying({ face: t % 4 < 3 ? "open" : "closed", head: 14, rise: breathing(t) * 2 })} rescuer={rescuer}>
        {talk > 0.2 && <SoundArcs at={add(mouth, [-20, 0])} t={t} dir={-1} />}
      </LyingStage>
    );
  },
};

const clear = {
  label: "During a seizure the responder pushes a bag and a mug away from the person on the floor without holding them down.",
  rest: 1.8,
  main: t => {
    const k = t % 6;
    const bagX = lerp(214, 150, phase(k, 0.5, 1.8));
    const mugX = lerp(488, 536, phase(k, 2.6, 1.2));
    const rescuer = kneel(bagX + 34, { to: [bagX + 12, G - 22], hand: 180 }, { to: [bagX + 14, G - 14], hand: 180 }, { headDown: 0.5 });
    return (
      <LyingStage
        cas={seizing(t)}
        rescuer={rescuer}
        under={<>
          <rect x={bagX - 22} y={G - 34} width={44} height={34} rx={9} fill="#7E8CA8" />
          <rect x={bagX - 12} y={G - 22} width={24} height={12} rx={4} fill="#6A7894" />
          <g transform={`translate(${mugX} ${G})`}><rect x={-9} y={-20} width={18} height={20} rx={3} fill="#E9EEF5" /><path d="M9 -15 q7 0 7 6 t-7 6" fill="none" stroke="#23262D" strokeWidth={2} /></g>
        </>}
      >
        <Arrow from={[bagX - 2, G - 48]} to={[bagX - 36, G - 48]} color={COLORS.amber} />
        {k > 2.4 && <Arrow from={[mugX - 6, G - 32]} to={[mugX + 26, G - 32]} color={COLORS.amber} />}
      </LyingStage>
    );
  },
};

const head = {
  label: "Responder sliding a folded jacket under the head of a person having a seizure.",
  rest: 2.6,
  main: t => {
    const k = t % 5;
    const place = phase(k, 0.4, 1.6);
    const under = LIE.headLocal([-4, -22]);
    const jacket = mix([under[0] + 30, G - 70], [under[0] - 2, G - 9], place);
    const rescuer = kneel(under[0] + 40, { to: add(jacket, [-14, -6]), hand: 100 }, { to: add(jacket, [14, -6]), hand: 80 }, { headDown: 0.6 });
    const pad = <rect x={jacket[0] - 26} y={jacket[1] - 8} width={52} height={16} rx={7} fill="#55607A" />;
    return <LyingStage cas={seizing(t, k > 3.2 ? 0.5 : 1)} rescuer={rescuer} under={place >= 1 && pad} over={place < 1 && pad} />;
  },
};

const timer = {
  label: "Responder timing a seizure on a stopwatch; at five minutes they call 10177.",
  rest: 1.2,
  main: t => {
    const k = t % 9;
    const secs = Math.min(300, Math.floor(k / 7 * 300));
    const alarm = secs >= 300;
    const hold = [372, 222];
    const rescuer = kneel(372, { to: add(hold, [-8, 0]), hand: 70 }, { to: add(hold, [8, 0]), hand: 110 }, { headDown: 0.7 });
    const c = [458, 168];
    const ang = (secs % 60) / 60 * 2 * Math.PI;
    return (
      <LyingStage cas={seizing(t, alarm ? 0.4 : 1)} rescuer={rescuer}>
        <rect x={hold[0] - 9} y={hold[1] - 16} width={18} height={30} rx={3} fill="#20263A" />
        <rect x={c[0] - 7} y={c[1] - 41} width={14} height={10} rx={2} fill="#8E9BAA" />
        <circle cx={c[0]} cy={c[1]} r={32} fill="#fff" />
        <circle cx={c[0]} cy={c[1]} r={32} fill="none" stroke={alarm ? COLORS.red : COLORS.blue} strokeWidth={5} strokeDasharray={`${(secs / 300) * 201} 210`} transform={`rotate(-90 ${c[0]} ${c[1]})`} />
        <line x1={c[0]} y1={c[1]} x2={c[0] + Math.sin(ang) * 22} y2={c[1] - Math.cos(ang) * 22} stroke={COLORS.ink} strokeWidth={3} strokeLinecap="round" />
        <text x={c[0]} y={c[1] + 18} textAnchor="middle" fontSize={13} fontWeight={700} fill={alarm ? COLORS.red : COLORS.ink} fontFamily="'IBM Plex Mono',monospace">{`${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`}</text>
        {alarm && <Phone x={hold[0] - 11} y={hold[1] - 70} t={t} />}
      </LyingStage>
    );
  },
};

const still = {
  label: "Responder steadying an injured lower leg exactly as it was found, one hand above and one below the injury.",
  rest: 1,
  main: t => {
    const pulse = 0.5 + 0.5 * Math.sin(t * 5);
    const above = add(mix(KNEE, ANKLE, 0.18), [0, -9]);
    const below = add(mix(KNEE, ANKLE, 0.86), [0, -8]);
    const rescuer = kneel(SHIN[0], { to: above, hand: 90 }, { to: below, hand: 90 }, { headDown: 0.6 });
    return (
      <LyingStage cas={lying({ face: "distress", mouth: 0.2 })} rescuer={rescuer}>
        <ellipse cx={SHIN[0]} cy={SHIN[1] + 5} rx={12} ry={6} fill="#C0504D" opacity={0.6} stroke="none" />
        {[0, 1, 2].map(i => {
          const a = -150 + i * 60;
          const r1 = 18 + pulse * 6, r2 = 26 + pulse * 6;
          const d = [Math.cos(a * Math.PI / 180), Math.sin(a * Math.PI / 180)];
          return <line key={i} x1={SHIN[0] + d[0] * r1} y1={SHIN[1] + d[1] * r1} x2={SHIN[0] + d[0] * r2} y2={SHIN[1] + d[1] * r2} stroke={COLORS.red} strokeWidth={2.4} strokeLinecap="round" opacity={0.5 + pulse * 0.5} />;
        })}
      </LyingStage>
    );
  },
};

const splint = {
  label: "Rolled padding placed along both sides of an injured lower leg and tied loosely in place.",
  rest: 4,
  main: t => {
    const k = t % 6;
    const pad = phase(k, 0.3, 1.2);
    const ties = [phase(k, 1.8, 0.6), phase(k, 2.6, 0.6)];
    const a = mix(KNEE, ANKLE, -0.05), b = mix(KNEE, ANKLE, 1.02);
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const knot = s => add(mix(KNEE, ANKLE, s), [0, -12]);
    const tieAt = ties[0] < 1 ? knot(0.3) : knot(0.75);
    const rescuer = kneel(tieAt[0], { to: add(tieAt, [-8, -6]), hand: 80 }, { to: add(tieAt, [8, -6]), hand: 100 }, { headDown: 0.6 });
    return (
      <LyingStage
        cas={lying({ face: "open" })}
        rescuer={rescuer}
        under={<g transform={`translate(${a[0]} ${a[1]}) rotate(${ang})`} opacity={pad}><rect x={0} y={6} width={len} height={11} rx={5.5} fill="#D9C39A" /></g>}
        over={<>
          <g transform={`translate(${a[0]} ${a[1]}) rotate(${ang})`} opacity={pad}><rect x={0} y={-20} width={len} height={11} rx={5.5} fill="#E3CFA8" /></g>
          {[0.3, 0.75].map((s, i) => ties[i] > 0 && (
            <g key={s} transform={`translate(${mix(KNEE, ANKLE, s).join(" ")}) rotate(${ang})`} opacity={ties[i]}>
              <rect x={-3} y={-22} width={6} height={42} rx={2} fill="#4A5874" />
            </g>
          ))}
        </>}
      />
    );
  },
};

const ice = {
  label: "Responder holding a cold pack wrapped in cloth on an injured lower leg: 20 minutes on, 20 minutes off.",
  rest: 2.4,
  main: t => {
    const k = t % 6;
    const place = phase(k, 0.3, 1.2);
    const spot = add(SHIN, [0, -6]);
    const pack = mix(add(spot, [10, -70]), spot, place);
    const rescuer = kneel(spot[0], { to: add(pack, [-10, -8]), hand: 90 }, { to: add(pack, [10, -8]), hand: 90 }, { headDown: 0.6 });
    return (
      <LyingStage cas={lying({ face: "open" })} rescuer={rescuer}>
        <rect x={pack[0] - 20} y={pack[1] - 9} width={40} height={18} rx={6} fill="#F4F6F8" />
        <rect x={pack[0] - 13} y={pack[1] - 6} width={26} height={12} rx={3} fill="#A9D6F5" />
        {place >= 1 && [0, 1, 2].map(i => {
          const p = (t * 0.7 + i / 3) % 1;
          return <circle key={i} cx={pack[0] - 16 + i * 16} cy={pack[1] - 14 - p * 18} r={2.2} fill="#fff" opacity={1 - p} stroke="none" />;
        })}
      </LyingStage>
    );
  },
};

function raisedLegs(t, both) {
  const k = t % 6;
  const lift = phase(k, 0.4, 1.6);
  const foot = mix(ANKLE, [452, G - 60], lift);
  const bag = phase(k, 2.1, 0.6);
  const cas = lying({ face: both ? "distress" : "open", legN: { to: foot }, ...(both ? { legF: { to: add(foot, [-3, -2]) } } : {}) });
  const rescuer = kneel(foot[0] + 6, { to: add(foot, [-12, 6]), hand: 90 }, { to: add(foot, [6, 8]), hand: 90 }, { headDown: 0.4 });
  const backpack = (
    <g opacity={bag}>
      <rect x={414} y={G - 50} width={56} height={50} rx={12} fill="#3F7F6B" />
      <rect x={426} y={G - 34} width={32} height={18} rx={5} fill="#356B5A" />
    </g>
  );
  return <LyingStage cas={cas} rescuer={rescuer} under={backpack} />;
}

const elevate = {
  label: "Responder gently raising the injured leg and resting it on a backpack.",
  rest: 3,
  main: t => raisedLegs(t, false),
};

const flat = {
  label: "Patient lying flat with both legs raised on a backpack.",
  rest: 3,
  main: t => raisedLegs(t, true),
};

const epipen = {
  label: "Responder pressing an adrenaline auto-injector into the outer thigh of a seated patient and holding it there.",
  rest: 2.6,
  main: t => {
    const k = t % 6;
    const approach = phase(k, 0.2, 1);
    const holding = k > 1.3 && k < 4.6;
    const away = phase(k, 4.6, 0.8);
    const cas = seated({ face: "distress", mouth: 0.4 });
    const rig = profileRig(cas);
    const knee = solveLimb(rig.hipJoint, cas.legN.to, BODY.thigh, BODY.shin, -1).mid;
    const thigh = add(mix(rig.hipJoint, knee, 0.55), [0, -4]);
    const dir = [0.45, -0.89];
    const gap = 26 * (1 - approach) + 26 * away;
    const tip = add(thigh, [dir[0] * gap, dir[1] * gap]);
    const top = add(tip, [dir[0] * 40, dir[1] * 40]);
    const rescuer = standing(436, -1, { torso: -106, head: 10, armN: { to: add(top, [2, -2]), hand: 240, grip: "fist", bend: -1 } });
    const count = holding ? Math.min(3, Math.floor((k - 1.3) / 1.1) + 1) : 0;
    const ang = Math.atan2(dir[1], dir[0]) * 180 / Math.PI;
    return (
      <SeatedStage cas={cas} rescuer={rescuer}>
        <g transform={`translate(${tip[0]} ${tip[1]}) rotate(${ang})`}>
          <rect x={0} y={-5} width={9} height={10} rx={3} fill="#F07F2A" />
          <rect x={8} y={-6} width={30} height={12} rx={4} fill="#F2C94C" />
          <rect x={36} y={-5} width={8} height={10} rx={3} fill="#3D7BD6" />
        </g>
        {holding && [1, 2, 3].map(i => <circle key={i} cx={thigh[0] - 30 + i * 15} cy={thigh[1] + 44} r={5} fill={i <= count ? COLORS.amber : "#fff"} />)}
      </SeatedStage>
    );
  },
};

/* "Don't use ice, butter, toothpaste or cream": the cooling scene with crossed-out remedies. */
function NoRemedies() {
  const items = [
    <rect key="ice" x={-11} y={-11} width={22} height={22} rx={4} fill="#CFEAFB" />,
    <rect key="butter" x={-14} y={-8} width={28} height={16} rx={3} fill="#F6D86B" />,
    <g key="paste"><rect x={-14} y={-6} width={22} height={12} rx={4} fill="#F4F6F8" /><rect x={8} y={-3} width={7} height={6} rx={1} fill="#3D7BD6" /></g>,
  ];
  return (
    <g>
      {items.map((item, i) => (
        <g key={i} transform={`translate(${470 + i * 60} 40)`}>
          <circle r={24} fill="#fff" />
          {item}
          <Cross x={0} y={0} size={15} />
        </g>
      ))}
    </g>
  );
}

// ── Catalogue ───────────────────────────────────────────────────
const reuse = (scene, ground) => ({ main: scene.main, rest: scene.rest, label: scene.label, ground });

export const TRIAGE_SCENES = {
  tap: { ...reuse(CPR_SCENES[0], 300), title: "Check responsiveness", sub: "Tap both shoulders and shout" },
  airway: { ...reuse(CPR_SCENES[1], 300), title: "Open the airway", sub: "Head tilt, chin lift — look, listen, feel" },
  monitor: { ...reuse(CPR_SCENES[2], 300), title: "Watch their breathing", sub: "Check breathing and response regularly" },
  call: { ...reuse(CPR_SCENES[3], 300), title: "Call 10177", sub: "Phone on speaker · give your exact location" },
  cpr: { ...reuse(CPR_SCENES[4], 300), title: "CPR: push hard and fast", sub: "30 compressions, 5–6 cm deep, 100–120 a minute" },
  cough: { ...reuse(CHOKING_SCENES[1], 318), title: "Encourage coughing", sub: "Stand by — coughing is the best way to clear it" },
  backblow: { ...reuse(CHOKING_SCENES[2], 318), title: "Up to 5 back blows", sub: "Lean them forward · heel of hand between shoulder blades" },
  thrust: { ...reuse(CHOKING_SCENES[3], 318), title: "Up to 5 abdominal thrusts", sub: "Fist above the navel · pull in and up" },
  alternate: { ...reuse(CHOKING_SCENES[4], 318), title: "Alternate 5 and 5", sub: "Back blows, then thrusts, until it clears" },
  gloves: { ...reuse(BLEEDING_SCENES[0], 300), title: "Protect yourself first", sub: "Gloves or a plastic bag over your hands" },
  pressure: { ...reuse(BLEEDING_SCENES[2], 300), title: "Firm direct pressure", sub: "Press hard on the wound with both hands" },
  layer: { ...reuse(BLEEDING_SCENES[3], 300), title: "Add layers — don’t lift", sub: "Stack more material on top and press harder" },
  tourniquet: { ...reuse(BLEEDING_SCENES[4], 300), title: "Tourniquet — last resort", sub: "5–7 cm above the wound · note the time" },
  water: { ...reuse(BURNS_SCENES[1], 318), title: "Cool running water", sub: "20 minutes · never ice or iced water" },
  noice: { ...reuse(BURNS_SCENES[1], 318), title: "Cool running water only", sub: "No ice, butter, toothpaste or creams", overlay: () => <NoRemedies /> },
  remove: { ...reuse(BURNS_SCENES[2], 318), title: "Remove jewellery and clothing", sub: "Only if it is not stuck to the burn" },
  cover: { ...reuse(BURNS_SCENES[3], 318), title: "Cover loosely", sub: "Cling film strips laid along the burn" },
  rest: { ...rest, ground: G, title: "Sit them down · no walking", sub: "Upright or most comfortable position" },
  upright: { ...upright, ground: G, title: "Sit up, lean forward", sub: "Hands on knees · never lay them flat" },
  loosen: { ...loosen, ground: G, title: "Loosen tight clothing", sub: "Collar, tie, belt or bra strap" },
  medicine: { ...medicine, ground: G, title: "Give medicine only if safe", sub: "Right dose · not allergic · able to swallow" },
  hydrate: { ...hydrate, ground: G, title: "Small sips of cool water", sub: "Only if awake and able to swallow" },
  inhaler: { ...inhaler, ground: G, title: "Reliever inhaler", sub: "1 puff every 30–60 seconds, up to 10" },
  breathe: { ...breathe, ground: G, title: "Breathe slowly together", sub: "In through the nose for 4, out for 6" },
  cool: { ...cool, ground: G, title: "Move to a cool, shaded place", sub: "Remove extra clothing · fan gently" },
  cloth: { ...cloth, ground: G, title: "Cool damp cloth", sub: "Forehead, neck, wrists · replace as it warms" },
  recovery: { ...recovery, ground: G, title: "Recovery position", sub: "On their side · top knee forward · head tilted back" },
  comfort: { ...comfort, ground: G, title: "Stay and reassure", sub: "Speak calmly · nothing to eat or drink yet" },
  clear: { ...clear, ground: G, title: "Clear the space", sub: "Move hard objects away · never hold them down" },
  head: { ...head, ground: G, title: "Protect the head", sub: "Something soft underneath — a folded jacket" },
  timer: { ...timer, ground: G, title: "Time the seizure", sub: "5 minutes or longer → call 10177" },
  still: { ...still, ground: G, title: "Keep the limb still", sub: "Support it exactly as you found it" },
  splint: { ...splint, ground: G, title: "Pad and support", sub: "Rolled clothing along both sides, tied loosely" },
  ice: { ...ice, ground: G, title: "Cold pack, wrapped", sub: "20 minutes on, 20 minutes off" },
  elevate: { ...elevate, ground: G, title: "Raise it gently", sub: "Only if it doesn’t hurt · rest on a bag" },
  flat: { ...flat, ground: G, title: "Lay flat, raise the legs", sub: "Sit them up instead if breathing is hard" },
  epipen: { ...epipen, ground: G, title: "Auto-injector: outer thigh", sub: "Through clothing if needed · hold it in place" },
};
