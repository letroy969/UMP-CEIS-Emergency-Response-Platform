import { useEffect, useRef, useState } from "react";
import { BLEEDING_SCENES } from "./bleedingScenes.jsx";
import { BURNS_SCENES } from "./burnsScenes.jsx";
import { CHOKING_SCENES } from "./chokingScenes.jsx";
import { CPR_SCENES } from "./cprScenes.jsx";
import { CAMERAS } from "./cameras.js";
import { CameraContext, makeCamera } from "./figures.jsx";
import { SCENE, TOON_CSS } from "./rig.js";

const SCENES = { cpr: CPR_SCENES, choking: CHOKING_SCENES, bleeding: BLEEDING_SCENES, burns: BURNS_SCENES };

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/** Seconds since the step started; frozen while not running or with reduced motion. */
function useSceneClock(running, resetKey) {
  const [t, setT] = useState(0);
  const elapsed = useRef(0);
  useEffect(() => {
    elapsed.current = 0;
    setT(0);
  }, [resetKey]);
  useEffect(() => {
    if (!running || prefersReducedMotion()) return undefined;
    let frame;
    let last = performance.now();
    const tick = now => {
      elapsed.current += Math.min(0.1, (now - last) / 1000);
      last = now;
      setT(elapsed.current);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running, resetKey]);
  return t;
}

function FirstAidSimulation({ guide, step, running, color, caption }) {
  const scene = SCENES[guide][step];
  const clock = useSceneClock(running, `${guide}-${step}`);
  const t = !running && clock === 0 ? scene.rest : clock;
  const camera = CAMERAS[guide][step] ? makeCamera(CAMERAS[guide][step]) : null;
  return (
    <div>
      <style>{TOON_CSS}</style>
      <svg className="fa-toon" viewBox="0 0 640 360" role="img" aria-label={scene.label} style={{ width: "100%", display: "block", borderRadius: 8, background: SCENE.sky, border: `1px solid ${SCENE.border}` }}>
        <CameraContext.Provider value={camera}>
          {camera ? <g transform={camera.transform}>{scene.main(t)}</g> : scene.main(t)}
        </CameraContext.Provider>
      </svg>
      {caption}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 10, marginTop: 12 }}>
        {scene.insets.map(inset => (
          <figure key={inset.title} style={{ margin: 0, background: "#fff", border: "1px solid #DCE2EC", borderRadius: 8, overflow: "hidden" }}>
            <figcaption style={{ padding: "7px 10px", fontSize: 11, fontWeight: 700, color: "#344060", borderBottom: "1px solid #E8EDF5", fontFamily: "'IBM Plex Sans',sans-serif" }}>{inset.title}</figcaption>
            <svg className="fa-toon" viewBox="0 0 260 170" role="img" aria-label={inset.title} style={{ width: "100%", display: "block", background: SCENE.inset }}>
              {inset.render(t)}
            </svg>
          </figure>
        ))}
      </div>
      {scene.checks && (
        <div style={{ marginTop: 12, padding: "10px 12px", background: "#fff", border: "1px solid #DCE2EC", borderLeft: `3px solid ${color}`, borderRadius: 7 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color, marginBottom: 6, fontFamily: "'IBM Plex Sans',sans-serif" }}>Get it right</div>
          <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 3 }}>
            {scene.checks.map(item => <li key={item} style={{ fontSize: 12, color: "#344060", lineHeight: 1.5, fontFamily: "'IBM Plex Sans',sans-serif" }}>{item}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

export function SimCPR(props) { return <FirstAidSimulation guide="cpr" {...props} />; }
export function SimChoking(props) { return <FirstAidSimulation guide="choking" {...props} />; }
export function SimBleeding(props) { return <FirstAidSimulation guide="bleeding" {...props} />; }
export function SimBurns(props) { return <FirstAidSimulation guide="burns" {...props} />; }
