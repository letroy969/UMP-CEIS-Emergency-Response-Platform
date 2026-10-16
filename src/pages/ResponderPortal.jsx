import { useEffect, useState } from "react";
import { NAVY, RED, REDL, GREEN, GOLD, WHITE, PAPER, PAPER2, BD, NK, SL, MID, LOGO, INC_TYPES, PRIORITY, STATUS_LABEL } from "../constants.js";
import { STYLES } from "./portalStyles.js";
import { subscribeIncidents, updateIncident } from "../incidentApi.js";
import IncidentEvidenceList from "../components/IncidentEvidenceList.jsx";
import IncidentEmergencyContacts from "../components/IncidentEmergencyContacts.jsx";

export default function ResponderPortal({ user, authUser, onLogout }) {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState("");

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeIncidents(
      authUser,
      rows => {
        if (active) {
          setIncidents(rows);
          setLoading(false);
        }
      },
      issue => {
        if (active) {
          setError(issue.message);
          setLoading(false);
        }
      },
    );
    return () => {
      active = false;
      unsubscribe();
    };
  }, [authUser]);

  async function advanceIncident(incident, status) {
    setUpdatingId(incident.id);
    setError("");
    try {
      await updateIncident(authUser, { id: incident.id, status });
    } catch (issue) {
      setError(issue.message);
    } finally {
      setUpdatingId("");
    }
  }

  const activeIncidents = incidents.filter(incident => !["RESOLVED", "CLOSED"].includes(incident.status));
  const nextStatus = incident => ({
    TEAM_DISPATCHED: "ACKNOWLEDGED",
    ACKNOWLEDGED: "ON_SCENE",
    ON_SCENE: "RESOLVED",
  })[incident.status];

  return (
    <main style={{minHeight:"100vh",background:PAPER,fontFamily:"'IBM Plex Sans',sans-serif"}}>
      <style>{STYLES}</style>
      <header style={{background:NAVY,borderBottom:`3px solid ${GOLD}`,color:WHITE}}>
        <div style={{maxWidth:1100,margin:"0 auto",padding:"12px 5%",display:"flex",alignItems:"center",justifyContent:"space-between",gap:16}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <img src={LOGO} alt="UMP" style={{height:36,objectFit:"contain",mixBlendMode:"lighten"}}/>
            <div><div style={{fontSize:10,color:"rgba(255,255,255,.58)",letterSpacing:1.5,textTransform:"uppercase"}}>Protected responder workspace</div><div style={{fontSize:15,fontWeight:700}}>{user.name}</div></div>
          </div>
          <button onClick={onLogout} style={{background:"rgba(255,255,255,.08)",border:"1px solid rgba(255,255,255,.18)",color:WHITE,borderRadius:5,padding:"8px 13px",cursor:"pointer"}}>Sign out</button>
        </div>
      </header>
      <section style={{maxWidth:1100,margin:"0 auto",padding:"28px 5% 56px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"end",gap:16,flexWrap:"wrap",marginBottom:20}}>
          <div><h1 style={{fontFamily:"'IBM Plex Serif',serif",fontSize:28,color:NK,marginBottom:5}}>Assigned response alerts</h1><p style={{fontSize:14,color:SL}}>Only incidents dispatched to your responder account appear here.</p></div>
          <div style={{padding:"10px 14px",background:WHITE,border:`1px solid ${BD}`,borderRadius:8,fontWeight:700,color:NAVY}}>{activeIncidents.length} active assignment{activeIncidents.length===1?"":"s"}</div>
        </div>
        {error&&<div role="alert" style={{background:REDL,color:RED,padding:12,borderRadius:7,marginBottom:16}}>{error}</div>}
        {loading?<div role="status" style={{padding:24,textAlign:"center",color:SL}}>Loading your assignments…</div>
          : incidents.length===0?<div style={{background:WHITE,border:`1px solid ${BD}`,borderRadius:10,padding:32,textAlign:"center",color:SL}}>No incidents have been assigned to you.</div>
            :<div style={{display:"grid",gap:12}}>
              {incidents.map(incident=>{
                const priority = PRIORITY[incident.priority] || PRIORITY.P3;
                const targetStatus = nextStatus(incident);
                return <article key={incident.id} style={{background:WHITE,border:`1px solid ${BD}`,borderLeft:`5px solid ${priority.color}`,borderRadius:10,padding:18,boxShadow:"0 4px 14px rgba(15,35,70,.05)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"start",flexWrap:"wrap"}}>
                    <div><div style={{fontSize:11,color:MID,fontFamily:"'IBM Plex Mono',monospace"}}>{incident.reference || incident.id} · {incident.time}</div><h2 style={{fontSize:18,color:NK,margin:"5px 0"}}>{INC_TYPES[incident.type]?.label || "Incident"} — {incident.loc}</h2></div>
                    <div style={{display:"flex",gap:8}}><span style={{padding:"5px 9px",borderRadius:5,background:`${priority.color}14`,color:priority.color,fontWeight:800,fontSize:12}}>{incident.priority}</span><span style={{padding:"5px 9px",borderRadius:5,background:PAPER2,color:NAVY,fontWeight:700,fontSize:12}}>{STATUS_LABEL[incident.status] || incident.status}</span></div>
                  </div>
                  <p style={{color:SL,fontSize:14,lineHeight:1.6,margin:"10px 0"}}>{incident.desc || "No additional description supplied."}</p>
                  <IncidentEvidenceList incident={incident} user={authUser} />
                  <IncidentEmergencyContacts incident={incident} user={authUser} />
                  <div style={{fontSize:12,color:MID,marginBottom:14}}>Reported by {incident.reporter || "Campus user"}{incident.lat != null&&incident.lng != null?` · Location ${incident.lat.toFixed(5)}, ${incident.lng.toFixed(5)}`:""}</div>
                  {targetStatus&&<button disabled={updatingId===incident.id} onClick={()=>advanceIncident(incident,targetStatus)} style={{padding:"10px 14px",background:NAVY,color:WHITE,border:0,borderRadius:6,fontWeight:700,cursor:updatingId===incident.id?"wait":"pointer",opacity:updatingId===incident.id?0.65:1}}>{updatingId===incident.id?"Updating…":`Mark ${STATUS_LABEL[targetStatus] || targetStatus}`}</button>}
                  {!targetStatus&&<div style={{fontSize:12,fontWeight:700,color:GREEN}}>✓ Assignment resolved</div>}
                </article>;
              })}
            </div>}
      </section>
    </main>
  );
}

/* ══════════════════════════════════════════════════════════════
   APP ROUTER
   ══════════════════════════════════════════════════════════════ */
