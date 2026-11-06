/* "Live Simulation" panel on the emergency triage page. */
import { useSceneClock } from "./FirstAidSimulation.jsx";
import { CameraContext, makeCamera } from "./figures.jsx";
import { SCENE, TOON_CSS } from "./rig.js";
import { TRIAGE_CAMERAS } from "./triageCameras.js";
import { TRIAGE_SCENES } from "./triageScenes.jsx";

export default function TriageSimulation({ type, running, color }) {
  const key = TRIAGE_SCENES[type] ? type : "monitor";
  const scene = TRIAGE_SCENES[key];
  const clock = useSceneClock(running, key);
  const t = !running && clock === 0 ? scene.rest : clock;
  const camera = makeCamera({ ...(TRIAGE_CAMERAS[key] ?? {}), hideUi: true });
  return (
    <figure style={{ margin: 0 }}>
      <style>{TOON_CSS}</style>
      <svg className="fa-toon" viewBox="0 0 640 360" role="img" aria-label={scene.label} style={{ width: "100%", display: "block", borderRadius: 8, background: SCENE.sky, border: `1px solid ${SCENE.border}` }}>
        <CameraContext.Provider value={camera}>
          <g transform={camera.transform}>{scene.main(t)}</g>
        </CameraContext.Provider>
        {scene.overlay?.(t)}
      </svg>
      <figcaption style={{ padding: "8px 2px 0", fontFamily: "'IBM Plex Sans',sans-serif" }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color }}>{scene.title}</div>
        <div style={{ fontSize: 11.5, color: "#44506A", lineHeight: 1.45, marginTop: 2 }}>{scene.sub}</div>
      </figcaption>
    </figure>
  );
}
