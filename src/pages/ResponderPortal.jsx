import { useEffect, useState } from "react";
import { NAVY, RED, REDL, GREEN, GOLD, WHITE, PAPER2, BD, NK, SL, MID, LOGO, INC_TYPES, PRIORITY, STATUS_LABEL } from "../constants.js";
import { STYLES } from "./portalStyles.js";
import { claimSOS, subscribeIncidents, subscribeOpenSOS, updateIncident } from "../incidentApi.js";
import IncidentEvidenceList from "../components/IncidentEvidenceList.jsx";
import IncidentEmergencyContacts from "../components/IncidentEmergencyContacts.jsx";

const RESPONDER_PORTAL_BACKGROUND = new URL("../../Responder Background/Responderbackground.jpg", import.meta.url).href;

export default function ResponderPortal({ user, authUser, onLogout }) {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  const [openSOS, setOpenSOS] = useState([]);
  const [sosError, setSosError] = useState("");
  const [claimingId, setClaimingId] = useState("");

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeOpenSOS(
      authUser,
      rows => { if (active) { setOpenSOS(rows.filter(row => row.status === "NEW")); setSosError(""); } },
      issue => { if (active) setSosError(issue.message); },
    );
    return () => { active = false; unsubscribe(); };
  }, [authUser]);

  async function acceptSOS(incident) {
    setClaimingId(incident.id);
    setSosError("");
    try {
      await claimSOS(authUser, incident.id);
    } catch (issue) {
      setSosError(issue.message);
    } finally {
      setClaimingId("");
    }
  }

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
    <main className="student-portal-shell" style={{minHeight:"100vh",background:"transparent",fontFamily:"'IBM Plex Sans',sans-serif"}}>
      <style>{STYLES}</style>
      <div className="student-portal-background" aria-hidden="true">
        <img src={RESPONDER_PORTAL_BACKGROUND} alt="" />
        <div />
      </div>
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
          <div><h1 style={{fontFamily:"'IBM Plex Serif',serif",fontSize:28,color:NK,marginBottom:5}}>Assigned response alerts</h1><p style={{fontSize:14,color:SL}}>Incidents dispatched to your responder account, plus any open SOS alert waiting for a responder.</p></div>
          <div style={{padding:"10px 14px",background:WHITE,border:`1px solid ${BD}`,borderRadius:8,fontWeight:700,color:NAVY}}>{activeIncidents.length} active assignment{activeIncidents.length===1?"":"s"}</div>
        </div>
        {(openSOS.length>0||sosError)&&<section aria-label="Open SOS alerts" style={{background:"#fff4f2",border:"1px solid #f2c4bd",borderLeft:`5px solid ${RED}`,borderRadius:10,padding:18,marginBottom:20}}>
          <h2 role={openSOS.length?"alert":undefined} style={{fontSize:17,color:"#9d1b1b",marginBottom:4}}>{openSOS.length} open SOS alert{openSOS.length===1?"":"s"} need a responder</h2>
          <p style={{fontSize:13,color:"#62413d",marginBottom:openSOS.length?12:0}}>Accepting assigns the SOS to you and tells the admin team and the person who raised it that you are on the way.</p>
          {sosError&&<div role="alert" style={{background:REDL,color:RED,padding:10,borderRadius:6,marginBottom:10,fontSize:13}}>{sosError}</div>}
          <div style={{display:"grid",gap:10}}>
            {openSOS.map(incident=><article key={incident.id} style={{background:WHITE,border:`1px solid ${BD}`,borderRadius:8,padding:14,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
              <div>
                <div style={{fontSize:11,color:MID,fontFamily:"'IBM Plex Mono',monospace"}}>{incident.reference || incident.id} · {incident.time}</div>
                <div style={{fontSize:15,fontWeight:700,color:NK,margin:"3px 0"}}>SOS — {incident.reporter || "Campus user"}</div>
                <div style={{fontSize:12.5,color:SL}}>{incident.loc}{incident.lat!=null&&incident.lng!=null&&<> · <a href={`https://www.google.com/maps?q=${incident.lat},${incident.lng}`} target="_blank" rel="noreferrer" style={{color:NAVY,fontWeight:700}}>Open in Maps</a></>}</div>
              </div>
              <button type="button" disabled={claimingId===incident.id} onClick={()=>acceptSOS(incident)} style={{padding:"10px 16px",background:RED,color:WHITE,border:0,borderRadius:6,fontWeight:800,cursor:claimingId===incident.id?"wait":"pointer",opacity:claimingId===incident.id?0.65:1}}>{claimingId===incident.id?"Accepting…":"Accept & respond"}</button>
            </article>)}
          </div>
        </section>}
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
