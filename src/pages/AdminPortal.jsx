import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Clock3,
  Download,
  FileText,
  ScrollText,
  Users,
  Inbox,
  Map,
  MapPin,
  Paperclip,
  Radio,
  Siren,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { NAVY, NAVY2, RED, REDL, ORANGE, ORANGEL, GREEN, GREENL, GOLD, WHITE, PAPER, PAPER2, BD, NK, SL, MID, INC_TYPES, PRIORITY, STATUS_FLOW, STATUS_LABEL, MBOMBELA_BUILDINGS, ZONE_COLORS } from "../constants.js";
import CampusMap from "../components/CampusMap.jsx";
import { MAPPED_BUILDINGS } from "../maps/campusBuildings.js";
import { checkCampusLocation } from "../maps/location.js";
import { STYLES } from "./portalStyles.js";
import { assignIncident, createIncident, listAccessRequests, listResponders, reviewAccessRequest as submitAccessRequest, subscribeIncidents, updateIncident } from "../incidentApi.js";
import IncidentEvidenceList from "../components/IncidentEvidenceList.jsx";
import IncidentEmergencyContacts from "../components/IncidentEmergencyContacts.jsx";
import IncidentMedicalInfo from "../components/IncidentMedicalInfo.jsx";
import PushNotificationsButton from "../components/PushNotificationsButton.jsx";
import CampusAlertComposer from "../components/CampusAlertComposer.jsx";
import IncidentAnalyticsPanel from "../components/IncidentAnalyticsPanel.jsx";
import UserManagementPanel from "../components/admin/UserManagementPanel.jsx";
import AuditLogPanel from "../components/admin/AuditLogPanel.jsx";
import IncidentTimeline from "../components/admin/IncidentTimeline.jsx";
import ResponderSelect from "../components/admin/ResponderSelect.jsx";
import ReporterInfo from "../components/admin/ReporterInfo.jsx";
import { downloadCsv, incidentsToCsv } from "../admin/incidentCsv.js";
import { setResponderSpecialization } from "../adminApi.js";
import { RESPONDER_SPECIALIZATIONS, SPECIALIZATION_KEYS, requiredFieldsText } from "../responder/specializations.js";

const ADMIN_PORTAL_BACKGROUND = new URL("../../Administration Backgrounf/Administration Background.jpg", import.meta.url).href;

export default function AdminPortal({ user, authUser, onLogout }) {
  const [view, setView]             = useState(user.access === "staff" ? "input" : "dashboard");
  const [incidents, setIncidents]   = useState([]);
  const [selectedInc, setSelectedInc] = useState(null);
  const [selectedBldg, setSelectedBldg] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [filterPri, setFilterPri]   = useState("all");
  const [dispatchMsg, setDispatchMsg] = useState("");
  const [responders, setResponders] = useState([]);
  const [accessRequests, setAccessRequests] = useState([]);
  const [reviewingUid, setReviewingUid] = useState("");
  const [selectedResponders, setSelectedResponders] = useState({});
  const [savingFieldUid, setSavingFieldUid] = useState("");
  const [dataError, setDataError] = useState("");
  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeIncidents(
      authUser,
      rows => { if (active) setIncidents(rows); },
      error => { if (active) setDataError(error.message); },
    );
    if (user.access === "admin") {
      Promise.all([
        listResponders(authUser),
        listAccessRequests(authUser),
      ]).then(([roster, requests]) => {
        if (active) {
          setResponders(roster);
          setAccessRequests(requests);
        }
      }).catch(error => {
        if (active) setDataError(error.message);
      });
    }
    return () => { active = false; unsubscribe(); };
  }, [authUser, user.access]);
  async function updateStatus(id, status) {
    try {
      const updated = await updateIncident(authUser, { id, status });
      setIncidents(prev => prev.map(i => i.id===id ? updated : i));
      if (selectedInc?.id===id) setSelectedInc(updated);
      setDataError("");
    } catch (error) { setDataError(error.message); }
  }
  async function assignResponder(id, responderUid) {
    const responder = responders.find(item => item.uid === responderUid);
    if (!responder) {
      setDataError("Select a provisioned responder before dispatching.");
      return;
    }
    try {
      const updated = await assignIncident(authUser, id, responder);
      setIncidents(prev => prev.map(i => i.id===id ? updated : i));
      if (selectedInc?.id===id) setSelectedInc(updated);
      setDataError("");
    } catch (error) { setDataError(error.message); return; }
    setDispatchMsg(`Dispatch sent to ${responder.name}`);
    setTimeout(()=>setDispatchMsg(""),3000);
  }

  // Role changes, suspensions and deletions can add or remove dispatchable responders.
  const refreshResponders = useCallback(() => {
    listResponders(authUser).then(setResponders).catch(error => setDataError(error.message));
  }, [authUser]);

  // Availability changes as responders go on and off duty, so keep the roster fresh.
  useEffect(() => {
    if (user.access !== "admin") return undefined;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        listResponders(authUser).then(setResponders).catch(() => {});
      }
    }, 30000);
    return () => window.clearInterval(timer);
  }, [authUser, user.access]);

  async function changeResponderField(uid, specialization) {
    if (!specialization) return;
    setSavingFieldUid(uid);
    try {
      await setResponderSpecialization(authUser, uid, specialization);
      setResponders(previous => previous.map(person => person.uid === uid ? { ...person, specialization } : person));
      setDataError("");
    } catch (error) {
      setDataError(error.message);
    } finally {
      setSavingFieldUid("");
    }
  }
  const respondersWithoutField = responders.filter(person => !person.specialization).length;

  const peopleNames = useMemo(() => ({
    ...Object.fromEntries(responders.map(person => [person.uid, person.name])),
    [authUser.uid]: "You",
  }), [responders, authUser.uid]);

  function exportIncidents() {
    const csv = incidentsToCsv(filtered, {
      type: Object.fromEntries(Object.entries(INC_TYPES).map(([key, value]) => [key, value.label])),
      status: STATUS_LABEL,
    });
    downloadCsv(`ceis-incidents-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  async function reviewAccessRequest(uid, action) {
    setReviewingUid(uid);
    setDataError("");
    try {
      const result = await submitAccessRequest(authUser, uid, action);
      setAccessRequests(previous => previous.filter(request => request.uid !== uid));
      if (action === "approve" && result.requestedRole === "responder") {
        setResponders(await listResponders(authUser));
      }
    } catch (error) {
      setDataError(error.message);
    } finally {
      setReviewingUid("");
    }
  }

  const active = incidents.filter(i=>!["RESOLVED","CLOSED"].includes(i.status));
  const isToday = value => value && new Date(value).toDateString() === new Date().toDateString();
  const p1count = active.filter(i=>i.priority==="P1").length;
  const filtered = incidents.filter(i => (filterType==="all"||i.type===filterType) && (filterPri==="all"||i.priority===filterPri));

  const NAVITEMS = [
    ["analytics",BarChart3,"Analytics"],
    ["dashboard",Radio,"Dashboard"],["incidents",Siren,"Incidents"],["map",Map,"Live Map"],
    ["dispatch",Zap,"Assignments"],["input",Inbox,"Report Input"],
    ...(user.access === "admin" ? [
      ["access",ShieldCheck,`Access Requests${accessRequests.length ? ` (${accessRequests.length})` : ""}`],
      ["users",Users,"Users"],
      ["audit",ScrollText,"Audit Log"],
    ] : []),
  ];
  return (
    <div className="student-portal-shell" style={{minHeight:"100vh",background:"transparent",fontFamily:"'IBM Plex Sans',sans-serif"}}>
      <style>{STYLES}</style>
      <div className="student-portal-background" aria-hidden="true">
        <img src={ADMIN_PORTAL_BACKGROUND} alt="" />
        <div />
      </div>

      {/* P1 ALERT BANNER */}
      {p1count>0&&(
        <div style={{background:RED,padding:"8px 5%",display:"flex",alignItems:"center",justifyContent:"center",gap:12,animation:"blink 2s ease-in-out infinite"}}>
          <Siren size={17} aria-hidden="true"/>
          <span style={{fontSize:13,fontWeight:700,color:WHITE,fontFamily:"'IBM Plex Mono',monospace"}}>{p1count} CRITICAL INCIDENT{p1count>1?"S":""} ACTIVE — IMMEDIATE RESPONSE REQUIRED</span>
          <Siren size={17} aria-hidden="true"/>
        </div>
      )}

      {/* HEADER */}
      <div style={{background:NAVY,borderBottom:`3px solid ${RED}`,position:"sticky",top:p1count>0?36:0,zIndex:100}}>
        <div style={{maxWidth:1400,margin:"0 auto",padding:"0 3%",height:60,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <div style={{width:36,height:36,borderRadius:7,background:RED,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:13,color:WHITE}}>CC</div>
            <div>
              <div style={{fontSize:9,fontWeight:700,color:"rgba(255,255,255,0.45)",letterSpacing:2,textTransform:"uppercase"}}>CEIS Command Centre</div>
              <div style={{fontSize:14,fontWeight:700,color:WHITE,fontFamily:"'IBM Plex Serif',serif"}}>{user.name} <span style={{fontSize:11,color:"rgba(255,255,255,0.45)",fontWeight:400}}>· {user.dept}</span></div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <div style={{display:"flex",gap:8}}>
              {[["P1",RED],["P2",ORANGE],["P3",GOLD]].map(([p,c])=>{
                const cnt = active.filter(i=>i.priority===p).length;
                return cnt>0?<div key={p} style={{padding:"4px 10px",background:`${c}22`,border:`1px solid ${c}44`,borderRadius:4,fontSize:11,fontWeight:700,color:c,fontFamily:"'IBM Plex Mono',monospace"}}>{cnt}×{p}</div>:null;
              })}
            </div>
            <div style={{fontSize:10.5,color:"rgba(255,255,255,0.4)",fontFamily:"'IBM Plex Mono',monospace"}}>{new Date().toLocaleString("en-ZA")}</div>
            <PushNotificationsButton user={authUser} compact />
            <button onClick={onLogout} style={{background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.14)",color:"rgba(255,255,255,0.6)",borderRadius:4,padding:"6px 14px",fontSize:12,cursor:"pointer"}}>Sign Out</button>
          </div>
        </div>
      </div>

      {user.access === "admin" && <CampusAlertComposer user={authUser} />}

      {/* NAV */}
      <div style={{background:WHITE,borderBottom:`1px solid ${BD}`,position:"sticky",top:p1count>0?96:60,zIndex:99}}>
        <div style={{maxWidth:1400,margin:"0 auto",padding:"0 3%",display:"flex",gap:0}}>
          {NAVITEMS.map(([k,Icon,lbl])=>(
            <button key={k} onClick={()=>setView(k)} aria-current={view===k?"page":undefined} className="ceis-icon-action" style={{padding:"11px 18px",background:"none",border:"none",borderBottom:`2px solid ${view===k?RED:"transparent"}`,color:view===k?RED:MID,fontSize:12.5,fontWeight:view===k?700:500,cursor:"pointer",display:"flex",alignItems:"center",gap:6,marginBottom:-1,transition:"all .2s"}}>
              <Icon size={16} strokeWidth={1.8} aria-hidden="true"/>{lbl}
            </button>
          ))}
        </div>
      </div>

      <div style={{maxWidth:1400,margin:"0 auto",padding:"20px 3% 60px"}}>
        {dataError&&<div role="alert" style={{background:REDL,color:RED,padding:12,borderRadius:7,marginBottom:16}}>{dataError}</div>}

        {/* ── DASHBOARD ── */}
        {view==="analytics"&&<IncidentAnalyticsPanel incidents={incidents} />}
        {view==="users"&&user.access==="admin"&&<UserManagementPanel authUser={authUser} incidents={incidents} onRolesChanged={refreshResponders} />}
        {view==="audit"&&user.access==="admin"&&<AuditLogPanel authUser={authUser} />}
        {view==="access"&&user.access==="admin"&&(
          <section style={{animation:"fadeIn .35s ease"}}>
            <h2 style={{fontFamily:"'IBM Plex Serif',serif",fontSize:24,color:NK,marginBottom:6}}>Role access requests</h2>
            <p style={{fontSize:14,color:SL,marginBottom:20}}>Review responder and admin access requests. Verified UMP staff accounts receive staff access without administrator approval; admin access is never self-assigned.</p>
            {accessRequests.length === 0
              ? <div style={{background:WHITE,border:`1px solid ${BD}`,borderRadius:9,padding:24,color:SL}}>No pending role access requests. People who signed up but have not signed in yet are not listed here: find them in Users (marked “Verified · not signed in yet”) and assign their role there.</div>
              : <div style={{display:"grid",gap:10}}>
                {accessRequests.map(request=>(
                  <article key={request.uid} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,flexWrap:"wrap",background:WHITE,border:`1px solid ${BD}`,borderRadius:9,padding:16}}>
                    <div>
                      <div style={{fontWeight:700,color:NK}}>{request.name}</div>
                      <div style={{fontSize:13,color:SL,marginTop:4}}>{request.email}</div>
                      <div style={{fontSize:12,fontWeight:700,color:NAVY,marginTop:4,textTransform:"capitalize"}}>Requested role: {request.requestedRole}</div>
                      {request.requestedAt&&<div style={{fontSize:11,color:MID,marginTop:4}}>Requested {new Date(request.requestedAt).toLocaleString()}</div>}
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      <button type="button" disabled={reviewingUid===request.uid} onClick={()=>reviewAccessRequest(request.uid,"reject")} style={{padding:"8px 12px",border:`1px solid ${BD}`,borderRadius:5,background:WHITE,color:RED,fontWeight:700,cursor:"pointer"}}>Reject</button>
                      <button type="button" disabled={reviewingUid===request.uid} onClick={()=>reviewAccessRequest(request.uid,"approve")} style={{padding:"8px 12px",border:0,borderRadius:5,background:NAVY,color:WHITE,fontWeight:700,cursor:"pointer"}}>{reviewingUid===request.uid?"Saving…":`Approve ${request.requestedRole}`}</button>
                    </div>
                  </article>
                ))}
              </div>}
          </section>
        )}

        {view==="dashboard"&&(
          <div style={{animation:"fadeIn .35s ease"}}>
            {/* KPI row */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:20}}>
              {[
                { label:"Active Incidents", value:active.length, color:ORANGE, sub:"across campus" },
                { label:"Critical (P1)",    value:p1count, color:RED,    sub:"need immediate response" },
                { label:"High (P2)",        value:active.filter(i=>i.priority==="P2").length, color:"#B85000", sub:"urgent response" },
                { label:"Resolved Today",   value:incidents.filter(i=>["RESOLVED","CLOSED"].includes(i.status) && isToday(i.resolvedAt)).length, color:GREEN, sub:"incidents closed" },
                { label:"Reported Today",   value:incidents.filter(i=>isToday(i.createdAt)).length, color:NAVY, sub:"new incident reports" },
              ].map((k,i)=>(
                <div key={i} style={{background:WHITE,border:`1px solid ${BD}`,borderRadius:9,borderTop:`3px solid ${k.color}`,padding:"14px 16px"}}>
                  <div style={{fontSize:9.5,fontWeight:700,color:MID,textTransform:"uppercase",letterSpacing:1.2,marginBottom:6}}>{k.label}</div>
                  <div style={{fontSize:30,fontWeight:800,color:k.color,fontFamily:"'IBM Plex Mono',monospace",lineHeight:1}}>{k.value}</div>
                  <div style={{fontSize:10.5,color:MID,marginTop:4}}>{k.sub}</div>
                </div>
              ))}
            </div>
            <div className="ceis-admin-dashboard-map-layout" style={{display:"grid",gridTemplateColumns:"1fr 380px",gap:18}}>
              {/* Live map */}
              <div style={{background:WHITE,borderRadius:10,border:`1px solid ${BD}`,overflow:"hidden"}}>
                <div style={{padding:"13px 18px",borderBottom:`1px solid ${BD}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:14,fontWeight:700,color:NK,fontFamily:"'IBM Plex Serif',serif"}}>Live Campus Map</span>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{width:8,height:8,borderRadius:"50%",background:GREEN,display:"inline-block",animation:"blink 2s infinite"}}/>
                    <span style={{fontSize:11,color:GREEN,fontFamily:"'IBM Plex Mono',monospace"}}>LIVE</span>
                  </div>
                </div>
                <div style={{padding:16}}>
                  <CampusMap incidents={incidents} selectedBuilding={selectedBldg?.id} onBuildingClick={b=>{setSelectedBldg(b);setView("map");}}/>
                </div>
              </div>
              {/* Recent incidents */}
              <div style={{background:WHITE,borderRadius:10,border:`1px solid ${BD}`,overflow:"hidden"}}>
                <div style={{padding:"13px 18px",borderBottom:`1px solid ${BD}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:14,fontWeight:700,color:NK,fontFamily:"'IBM Plex Serif',serif"}}>Active Incidents</span>
                  <button onClick={()=>setView("incidents")} style={{fontSize:11.5,color:NAVY,background:"none",border:"none",cursor:"pointer",fontWeight:600}}>View All →</button>
                </div>
                <div style={{maxHeight:380,overflowY:"auto"}}>
                  {active.map(inc=>(
                    <button key={inc.id} onClick={()=>{setSelectedInc(inc);setView("incidents");}} className="ceis-icon-action" style={{width:"100%",padding:"12px 16px",background:"none",border:"none",borderBottom:`1px solid ${BD}`,cursor:"pointer",textAlign:"left",display:"flex",gap:10,alignItems:"flex-start",transition:"background .15s"}}>
                      {(() => { const Icon=INC_TYPES[inc.type]?.icon || FileText; return <Icon size={20} strokeWidth={1.8} color={INC_TYPES[inc.type]?.color || MID} aria-hidden="true" style={{flexShrink:0,marginTop:1}}/>; })()}
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12.5,fontWeight:700,color:NK,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{inc.loc}</div>
                        <div style={{fontSize:11.5,color:SL,marginTop:2,lineHeight:1.4,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{inc.desc||"No additional description supplied."}</div>
                        <div style={{fontSize:11,color:MID,marginTop:4,display:"flex",gap:8}}>
                          <span>{inc.time}</span>
                          <span style={{color:PRIORITY[inc.priority].color,fontWeight:700}}>{inc.priority}</span>
                          <span>● {STATUS_LABEL[inc.status]}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── INCIDENTS ── */}
        {view==="incidents"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 400px",gap:18,animation:"fadeIn .35s ease"}}>
            <div>
              <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
                <select value={filterType} onChange={e=>setFilterType(e.target.value)} style={{padding:"8px 12px",border:`1.5px solid ${BD}`,borderRadius:6,fontSize:13,color:NK,outline:"none",background:WHITE}}>
                  <option value="all">All Types</option>
                  {Object.entries(INC_TYPES).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                </select>
                <select value={filterPri} onChange={e=>setFilterPri(e.target.value)} style={{padding:"8px 12px",border:`1.5px solid ${BD}`,borderRadius:6,fontSize:13,color:NK,outline:"none",background:WHITE}}>
                  <option value="all">All Priorities</option>
                  {Object.keys(PRIORITY).map(p=><option key={p} value={p}>{p} — {PRIORITY[p].label}</option>)}
                </select>
                <div style={{marginLeft:"auto",fontSize:13,color:MID,alignSelf:"center"}}>{filtered.length} incident{filtered.length!==1?"s":""}</div>
                {user.access==="admin"&&(
                  <button type="button" onClick={exportIncidents} disabled={!filtered.length} title="Download the incidents matching these filters as a spreadsheet" style={{display:"inline-flex",alignItems:"center",gap:6,padding:"8px 12px",border:`1.5px solid ${BD}`,borderRadius:6,background:WHITE,color:NAVY,fontSize:12.5,fontWeight:700,cursor:filtered.length?"pointer":"not-allowed",opacity:filtered.length?1:0.5}}>
                    <Download size={15} aria-hidden="true"/> Export CSV
                  </button>
                )}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {filtered.map(inc=>{
                  const P=PRIORITY[inc.priority],T=INC_TYPES[inc.type];
                const TypeIcon=T?.icon || FileText;
                  const isSelected=selectedInc?.id===inc.id;
                  return (
                    <button key={inc.id} onClick={()=>setSelectedInc(inc)} className="ceis-icon-action" style={{background:isSelected?`${NAVY}06`:WHITE,border:`1.5px solid ${isSelected?NAVY:BD}`,borderRadius:9,padding:"14px 16px",cursor:"pointer",textAlign:"left",transition:"all .15s",display:"flex",gap:12,alignItems:"flex-start"}}>
                      <TypeIcon size={24} strokeWidth={1.8} color={T?.color || MID} aria-hidden="true" style={{flexShrink:0,marginTop:2}}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                          <div>
                            <span style={{fontSize:11,fontWeight:700,color:MID,fontFamily:"'IBM Plex Mono',monospace"}}>{inc.id}</span>
                            <span style={{fontSize:12.5,fontWeight:700,color:NK,marginLeft:8}}>{inc.loc}</span>
                          </div>
                          <div style={{display:"flex",gap:6,flexShrink:0}}>
                            <span style={{padding:"2px 8px",background:`${P.color}14`,color:P.color,borderRadius:3,fontSize:10.5,fontWeight:700}}>{inc.priority}</span>
                            <span style={{padding:"2px 8px",background:PAPER2,color:SL,borderRadius:3,fontSize:10.5}}>{STATUS_LABEL[inc.status]}</span>
                            {inc.attachments?.length>0&&<span title={`${inc.attachments.length} attachment${inc.attachments.length===1?"":"s"}`} style={{display:"inline-flex",alignItems:"center",gap:3,padding:"2px 7px",background:`${NAVY}10`,color:NAVY,borderRadius:3,fontSize:10.5,fontWeight:700}}><Paperclip size={11} aria-hidden="true"/>{inc.attachments.length}</span>}
                          </div>
                        </div>
                        <div style={{fontSize:13,color:SL,marginBottom:4,lineHeight:1.5}}>{inc.desc||"No additional description supplied."}</div>
                        <div style={{fontSize:11.5,color:MID,display:"flex",alignItems:"center",flexWrap:"wrap",gap:"3px 6px"}}>
                          <MapPin size={13} aria-hidden="true"/> {inc.loc} · <Clock3 size={13} aria-hidden="true"/> {inc.time} · <Siren size={13} aria-hidden="true"/> {inc.responder}
                        </div>
                        <div style={{marginTop:5,display:"flex",alignItems:"center",gap:6,fontSize:11.5,color:MID}}>
                          Reported by <ReporterInfo incident={inc} authUser={authUser} compact />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            {/* Incident detail panel */}
            {selectedInc?(
              <div style={{background:WHITE,borderRadius:10,border:`1px solid ${BD}`,overflow:"hidden",position:"sticky",top:100,maxHeight:"calc(100vh - 120px)",overflowY:"auto",animation:"slideIn .3s ease"}}>
                <div style={{background:`linear-gradient(135deg,${NAVY},${NAVY2})`,padding:"16px 18px",borderBottom:`2px solid ${PRIORITY[selectedInc.priority].color}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{fontSize:9,fontWeight:700,color:"rgba(255,255,255,0.5)",letterSpacing:1.5,textTransform:"uppercase"}}>{selectedInc.id}</div>
                    <button onClick={()=>setSelectedInc(null)} style={{background:"none",border:"none",color:"rgba(255,255,255,0.5)",cursor:"pointer",fontSize:16}}>✕</button>
                  </div>
                  <div style={{fontSize:17,fontWeight:700,color:WHITE,fontFamily:"'IBM Plex Serif',serif",marginTop:4}}>{selectedInc.loc}</div>
                  <div style={{display:"flex",gap:8,marginTop:8}}>
                    <span style={{padding:"3px 10px",background:`${PRIORITY[selectedInc.priority].color}30`,color:PRIORITY[selectedInc.priority].color,borderRadius:4,fontSize:11,fontWeight:700}}>{selectedInc.priority} — {PRIORITY[selectedInc.priority].label}</span>
                    <span style={{padding:"3px 10px",background:"rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.6)",borderRadius:4,fontSize:11}}>{STATUS_LABEL[selectedInc.status]}</span>
                  </div>
                </div>
                <div style={{padding:"16px 18px"}}>
                  <div style={{fontSize:10,fontWeight:700,color:MID,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Description</div>
                  <p style={{fontSize:13.5,color:SL,lineHeight:1.7,marginBottom:16}}>{selectedInc.desc || "No additional description supplied."}</p>
                  <div style={{fontSize:10,fontWeight:700,color:MID,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Reported by</div>
                  <ReporterInfo incident={selectedInc} authUser={authUser} canViewProfile={user.access==="admin"} />
                  <IncidentEmergencyContacts incident={selectedInc} user={authUser} />
                  <IncidentMedicalInfo incident={selectedInc} user={authUser} />
                  <IncidentEvidenceList key={selectedInc.id} incident={incidents.find(inc=>inc.id===selectedInc.id) || selectedInc} user={authUser} />
                  <div style={{height:16}} />
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
                    {[["Type",INC_TYPES[selectedInc.type]?.label],["Building",`#${selectedInc.building}`],["Time",selectedInc.time],["Responder",selectedInc.responder]].map(([l,v])=>(
                      <div key={l} style={{background:PAPER,borderRadius:6,padding:"9px 11px"}}>
                        <div style={{fontSize:9.5,fontWeight:700,color:MID,textTransform:"uppercase",letterSpacing:1}}>{l}</div>
                        <div style={{fontSize:13,fontWeight:600,color:NK,marginTop:3}}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {/* Status update */}
                  <div style={{fontSize:10,fontWeight:700,color:MID,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Update Status</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:16}}>
                    {STATUS_FLOW.filter(s=>s!=="TEAM_DISPATCHED").map(s=>(
                      <button key={s} onClick={()=>updateStatus(selectedInc.id,s)}
                        style={{padding:"6px 12px",background:selectedInc.status===s?NAVY:WHITE,color:selectedInc.status===s?WHITE:SL,border:`1.5px solid ${selectedInc.status===s?NAVY:BD}`,borderRadius:5,fontSize:11,fontWeight:selectedInc.status===s?700:500,cursor:"pointer",transition:"all .15s"}}>
                        {STATUS_LABEL[s]}
                      </button>
                    ))}
                  </div>
                  {/* Quick dispatch */}
                  <div style={{fontSize:10,fontWeight:700,color:MID,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Quick Dispatch</div>
                  {dispatchMsg&&<div style={{padding:"8px 12px",background:GREENL,border:`1px solid ${GREEN}28`,borderRadius:6,fontSize:12,color:GREEN,marginBottom:10}}>✓ {dispatchMsg}</div>}
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <ResponderSelect
                      ariaLabel="Choose responder for selected incident"
                      responders={responders}
                      incidents={incidents}
                      incident={selectedInc}
                      value={selectedResponders[selectedInc.id]}
                      onChange={uid=>setSelectedResponders(value=>({...value,[selectedInc.id]:uid}))}
                      style={{flex:1}}
                    />
                    <button
                      disabled={!selectedResponders[selectedInc.id]}
                      onClick={()=>assignResponder(selectedInc.id,selectedResponders[selectedInc.id])}
                      style={{padding:"9px 12px",background:NAVY,color:WHITE,border:0,borderRadius:6,fontWeight:700,cursor:"pointer",opacity:selectedResponders[selectedInc.id]?1:0.55}}
                    >Dispatch</button>
                  </div>
                  {user.access==="admin"&&<IncidentTimeline incidentId={selectedInc.id} people={peopleNames} />}
                </div>
              </div>
            ):(
              <div style={{background:WHITE,borderRadius:10,border:`1px solid ${BD}`,padding:"40px",textAlign:"center",color:MID,fontSize:13}}>Select an incident to view details and manage response</div>
            )}
          </div>
        )}

        {/* ── LIVE MAP ── */}
        {view==="map"&&(
          <div style={{animation:"fadeIn .35s ease"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
              <div>
                <h2 style={{fontFamily:"'IBM Plex Serif',serif",fontSize:24,fontWeight:700,color:NK,marginBottom:4}}>Live Campus Map — Mbombela</h2>
                <p style={{fontSize:13,color:MID,fontFamily:"'IBM Plex Mono',monospace"}}>{MAPPED_BUILDINGS.length} mapped building locations · {active.length} active incidents · Select a marker for details</p>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{width:8,height:8,borderRadius:"50%",background:GREEN,display:"inline-block",animation:"blink 2s infinite"}}/>
                <span style={{fontSize:11,color:GREEN,fontFamily:"'IBM Plex Mono',monospace"}}>LIVE — updates every 30s</span>
              </div>
            </div>
            <div className="ceis-admin-map-layout" style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:18,alignItems:"start"}}>
              <div style={{background:WHITE,borderRadius:12,border:`1px solid ${BD}`,padding:18}}>
                <CampusMap incidents={incidents} selectedBuilding={selectedBldg?.id} onBuildingClick={b=>setSelectedBldg(b)}/>
              </div>
              <div>
                {selectedBldg?(
                  <div style={{background:WHITE,borderRadius:10,border:`1px solid ${BD}`,overflow:"hidden",animation:"fadeIn .3s ease"}}>
                    <div style={{padding:"14px 18px",background:NAVY,borderBottom:`2px solid ${GOLD}`}}>
                      <div style={{fontSize:9,fontWeight:700,color:"rgba(255,255,255,0.5)",letterSpacing:1.5,textTransform:"uppercase"}}>Building {selectedBldg.id} · {selectedBldg.z}</div>
                      <div style={{fontSize:16,fontWeight:700,color:WHITE,fontFamily:"'IBM Plex Serif',serif",marginTop:4}}>{selectedBldg.name}</div>
                    </div>
                    <div style={{padding:"16px 18px"}}>
                      {incidents.filter(i=>i.building===selectedBldg.id).length===0?(
                        <div style={{textAlign:"center",padding:"16px 0",color:GREEN,fontSize:13}}>✓ No incidents recorded for this building</div>
                      ):incidents.filter(i=>i.building===selectedBldg.id).map(inc=>(
                        <button key={inc.id} onClick={()=>{setSelectedInc(inc);setView("incidents");}} style={{width:"100%",padding:"12px 14px",background:["RESOLVED","CLOSED"].includes(inc.status)?GREENL:REDL,border:`1px solid ${["RESOLVED","CLOSED"].includes(inc.status)?GREEN+"28":RED+"28"}`,borderRadius:7,marginBottom:8,cursor:"pointer",textAlign:"left"}}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                            <span style={{fontSize:11,fontWeight:700,color:PRIORITY[inc.priority].color}}>{inc.priority} · {INC_TYPES[inc.type]?.label}</span>
                            <span style={{fontSize:11,color:MID}}>{inc.time}</span>
                          </div>
                          <div style={{fontSize:12.5,color:NK,lineHeight:1.5}}>{inc.desc||"No additional description supplied."}</div>
                          <div style={{fontSize:11,color:MID,marginTop:4}}>● {STATUS_LABEL[inc.status]}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                ):(
                  <div style={{background:WHITE,borderRadius:10,border:`1px solid ${BD}`,padding:"24px",textAlign:"center",color:MID,fontSize:13,marginBottom:14}}>
                    <Map size={32} strokeWidth={1.7} aria-hidden="true" style={{marginBottom:10}}/>
                    Click any building to view its incident history and status
                  </div>
                )}
                {/* Zone legend */}
                <div style={{background:WHITE,borderRadius:10,border:`1px solid ${BD}`,padding:"14px 16px"}}>
                  <div style={{fontSize:11,fontWeight:700,color:MID,textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>Building Zones</div>
                  {Object.entries(ZONE_COLORS).map(([z,c])=>(
                    <div key={z} style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
                      <div style={{width:12,height:12,borderRadius:"50%",background:c,flexShrink:0}}/>
                      <span style={{fontSize:12,color:SL,textTransform:"capitalize"}}>{z}</span>
                    </div>
                  ))}
                  <div style={{marginTop:10,paddingTop:10,borderTop:`1px solid ${BD}`}}>
                    <div style={{fontSize:11,fontWeight:700,color:MID,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Active Incident Markers</div>
                    {[["P1 Critical",RED],["P2 High",ORANGE],["P3 Medium",GOLD]].map(([l,c])=>(
                      <div key={l} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                        <div style={{width:12,height:12,borderRadius:"50%",background:c,flexShrink:0,animation:`pulse 1.5s infinite`}}/>
                        <span style={{fontSize:12,color:c,fontWeight:600}}>{l}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── DISPATCH ── */}
        {view==="dispatch"&&(
          <div style={{animation:"fadeIn .35s ease"}}>
            <h2 style={{fontFamily:"'IBM Plex Serif',serif",fontSize:24,fontWeight:700,color:NK,marginBottom:6}}>Response Dispatch Engine</h2>
            <p style={{fontSize:14,color:SL,marginBottom:20}}>Assign provisioned responders to active incidents. Dispatches appear in protected responder queues.</p>
            {dispatchMsg&&<div role="status" style={{background:GREENL,color:GREEN,padding:12,borderRadius:7,marginBottom:14}}>{dispatchMsg}</div>}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}}>
              {/* P1+P2 queue */}
              <div>
                <div style={{fontSize:12,fontWeight:700,color:MID,textTransform:"uppercase",letterSpacing:1,marginBottom:12}}>Priority Queue — P1 &amp; P2</div>
                {active.filter(i=>["P1","P2"].includes(i.priority)).map(inc=>(
                  <div key={inc.id} style={{background:WHITE,border:`1.5px solid ${PRIORITY[inc.priority].color}40`,borderLeft:`4px solid ${PRIORITY[inc.priority].color}`,borderRadius:9,padding:"14px 16px",marginBottom:10}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                      <span style={{fontSize:11,fontFamily:"'IBM Plex Mono',monospace",color:MID}}>{inc.id}</span>
                      <span style={{padding:"2px 8px",background:`${PRIORITY[inc.priority].color}14`,color:PRIORITY[inc.priority].color,borderRadius:3,fontSize:10.5,fontWeight:700}}>{inc.priority}</span>
                    </div>
                    <div style={{fontSize:14,fontWeight:700,color:NK,marginBottom:4,fontFamily:"'IBM Plex Serif',serif"}}>{inc.loc}</div>
                    <div style={{fontSize:12.5,color:SL,marginBottom:8}}>{inc.desc || "No additional description supplied."}</div>
                    <div style={{marginBottom:8,display:"flex",alignItems:"center",gap:6,fontSize:11.5,color:MID}}>Reported by <ReporterInfo incident={inc} authUser={authUser} compact /></div>
                    <IncidentEvidenceList incident={inc} user={authUser} />
                    <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                      <ResponderSelect
                        ariaLabel={`Responder for ${inc.reference || inc.id}`}
                        responders={responders}
                        incidents={incidents}
                        incident={inc}
                        value={selectedResponders[inc.id]}
                        onChange={uid=>setSelectedResponders(value=>({...value,[inc.id]:uid}))}
                        style={{flex:"1 1 240px"}}
                      />
                      <button
                        onClick={()=>assignResponder(inc.id,selectedResponders[inc.id])}
                        disabled={!responders.length || !selectedResponders[inc.id]}
                        style={{padding:"8px 14px",background:NAVY,border:0,color:WHITE,borderRadius:5,fontSize:12,fontWeight:700,cursor:"pointer",opacity:!responders.length || !selectedResponders[inc.id]?0.55:1}}
                      >
                        Dispatch
                      </button>
                    </div>
                    <div style={{marginTop:8,fontSize:11.5,color:MID}}>Current: {inc.responder} · Status: <span style={{color:ORANGE,fontWeight:600}}>{STATUS_LABEL[inc.status]}</span></div>
                    <div style={{marginTop:4,fontSize:11.5,color:MID}}>Needs: {requiredFieldsText(inc)}</div>
                  </div>
                ))}
                {active.filter(i=>["P1","P2"].includes(i.priority)).length===0&&(
                  <div style={{background:GREENL,border:`1px solid ${GREEN}28`,borderRadius:9,padding:"20px",textAlign:"center",color:GREEN,fontSize:13,fontWeight:600}}>✓ No critical incidents requiring dispatch</div>
                )}
              </div>
              {/* Provisioned responders */}
              <div>
                <div style={{fontSize:12,fontWeight:700,color:MID,textTransform:"uppercase",letterSpacing:1,marginBottom:12}}>Provisioned Responders</div>
                {respondersWithoutField>0&&<div role="alert" style={{background:REDL,color:RED,border:`1px solid ${RED}30`,borderRadius:8,padding:"10px 12px",fontSize:12.5,marginBottom:10}}><strong>{respondersWithoutField} responder{respondersWithoutField===1?"":"s"} without a field.</strong> They cannot be dispatched or accept SOS alerts until you choose their field below.</div>}
                {responders.map(person=>{
                  const assigned = incidents.filter(inc=>inc.responderUid===person.uid && !["RESOLVED","CLOSED"].includes(inc.status)).length;
                  const [label,color,tint] = !person.available
                    ? [person.onDuty ? "Location not updating" : "Off duty", MID, PAPER2]
                    : assigned ? [`Available · ${assigned} active`, ORANGE, ORANGEL] : ["Available now", GREEN, GREENL];
                  return <div key={person.uid} style={{background:WHITE,border:`1px solid ${BD}`,borderRadius:8,padding:"12px 14px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
                    <div style={{minWidth:0}}><div style={{fontSize:13,fontWeight:700,color:NK}}>{person.name}</div><div style={{fontSize:11.5,color:SL,marginTop:2}}>{person.lastSeenAt?`Last location ${new Date(person.lastSeenAt).toLocaleTimeString("en-ZA",{hour:"2-digit",minute:"2-digit"})}`:"Never gone on duty"}{!person.available&&assigned?` · ${assigned} active`:""}</div>
                      <select aria-label={`Field for ${person.name}`} value={person.specialization||""} disabled={savingFieldUid===person.uid} onChange={event=>changeResponderField(person.uid,event.target.value)} style={{marginTop:6,padding:"5px 8px",border:`1px solid ${person.specialization?BD:RED}`,borderRadius:5,fontSize:12,color:NK,background:WHITE,maxWidth:"100%"}}>
                        {!person.specialization&&<option value="">Choose field…</option>}
                        {SPECIALIZATION_KEYS.map(key=><option key={key} value={key}>{RESPONDER_SPECIALIZATIONS[key].label}</option>)}
                      </select>
                    </div>
                    <div style={{padding:"4px 10px",background:tint,border:`1px solid ${color}28`,borderRadius:4,fontSize:11,fontWeight:700,color,whiteSpace:"nowrap"}}>● {label}</div>
                  </div>;
                })}
                {!responders.length&&<div style={{background:WHITE,border:`1px solid ${BD}`,borderRadius:8,padding:16,fontSize:12,color:SL}}>No responder accounts are provisioned yet. Assign a trusted Firebase user the responder role in their Firestore profile.</div>}
              </div>
            </div>
          </div>
        )}

        {/* ── REPORT INPUT (Layer 1) ── */}
        {view==="input"&&(
          <div style={{animation:"fadeIn .35s ease"}}>
            <h2 style={{fontFamily:"'IBM Plex Serif',serif",fontSize:24,fontWeight:700,color:NK,marginBottom:6}}>Input Layer — Incident Intake</h2>
            <p style={{fontSize:14,color:SL,marginBottom:22}}>Layer 1 of 6 — Manual incident logging by security or admin staff. All inputs are processed by the detection engine.</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}}>
              <OperatorIncidentForm incidents={incidents} setIncidents={setIncidents} authUser={authUser}/>
              <div>
                <div style={{background:WHITE,borderRadius:10,border:`1px solid ${BD}`,overflow:"hidden",marginBottom:14}}>
                  <div style={{padding:"13px 18px",borderBottom:`1px solid ${BD}`,background:PAPER}}>
                    <div style={{fontSize:11,fontWeight:700,color:MID,textTransform:"uppercase",letterSpacing:1}}>Automated Alerts</div>
                    <div style={{fontSize:14,fontWeight:700,color:NK,fontFamily:"'IBM Plex Serif',serif",marginTop:3}}>Campus sensor integrations</div>
                  </div>
                  <div style={{padding:"20px 18px",fontSize:13,color:SL,lineHeight:1.6}}>
                    No campus sensor integrations are connected. Only alerts from verified incident reports and responder dispatches are currently shown.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}


      </div>
    </div>
  );
}

/* Operator form sub-component */
function OperatorIncidentForm({ incidents, setIncidents, authUser }) {
  const [form, setForm] = useState({ type:"security", building:"", priority:"P2", desc:"", reporter:"", location:null });
  const [done, setDone] = useState(false);
  async function submit() {
    if (!form.building||!form.desc) return;
    const mappedBuilding = MAPPED_BUILDINGS.find((building) => building.id === form.building);
    const location = form.location || (mappedBuilding ? {
      latitude: mappedBuilding.lat,
      longitude: mappedBuilding.lng,
      accuracyMeters: null,
      capturedAt: new Date().toISOString(),
      source: "mapped-building",
    } : null);
    const campusCheck = location ? checkCampusLocation(location) : "unknown";
    let inc;
    try {
      inc = await createIncident(authUser, { type:form.type, priority:form.priority, building:form.building, desc:form.desc,
        lat:location?.latitude ?? null, lng:location?.longitude ?? null, accuracy:location?.accuracyMeters ?? null,
        locationCapturedAt:location?.capturedAt ?? null, locationSource:location?.source ?? null,
        campusVerified:campusCheck === "inside" ? true : campusCheck === "outside" ? false : null, reporter:form.reporter });
    } catch (error) { setDone(false); window.alert(error.message); return; }
    setIncidents(p=>[inc,...p]);
    setDone(true);
    setTimeout(()=>{setDone(false);setForm({type:"security",building:"",priority:"P2",desc:"",reporter:"",location:null});},2500);
  }
  return (
    <div style={{background:WHITE,borderRadius:10,border:`1px solid ${BD}`,overflow:"hidden"}}>
      <div style={{padding:"13px 18px",borderBottom:`1px solid ${BD}`,background:PAPER}}>
        <div style={{fontSize:11,fontWeight:700,color:MID,textTransform:"uppercase",letterSpacing:1}}>Security Operator Input</div>
        <div style={{fontSize:14,fontWeight:700,color:NK,fontFamily:"'IBM Plex Serif',serif",marginTop:3}}>Log New Incident</div>
      </div>
      <div style={{padding:"18px"}}>
        {done&&<div style={{background:GREENL,border:`1px solid ${GREEN}28`,borderRadius:7,padding:"10px 14px",marginBottom:14,fontSize:13,color:GREEN,fontWeight:600}}>✓ Incident logged and forwarded to detection engine</div>}
        {[
          { label:"Incident Type", content:<select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))} style={{width:"100%",padding:"9px 12px",border:`1.5px solid ${BD}`,borderRadius:6,fontSize:13,outline:"none"}}>{Object.entries(INC_TYPES).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select> },
          { label:"Building / Location", content:<select value={form.building} onChange={e=>setForm(f=>({...f,building:e.target.value}))} style={{width:"100%",padding:"9px 12px",border:`1.5px solid ${BD}`,borderRadius:6,fontSize:13,outline:"none",background:WHITE}}><option value="">Select…</option>{MBOMBELA_BUILDINGS.map(b=><option key={b.id} value={b.id}>B{b.id} — {b.name.slice(0,30)}</option>)}</select> },
          { label:"Pin location (optional)", content:<CampusMap compact incidents={incidents} selectedBuilding={form.building} location={form.location} onLocationChange={location=>setForm(f=>({...f,location}))} allowLocationSelection /> },
          { label:"Priority", content:<div style={{display:"flex",gap:7}}>{["P1","P2","P3","P4"].map(p=><button key={p} onClick={()=>setForm(f=>({...f,priority:p}))} style={{flex:1,padding:"8px",background:form.priority===p?`${PRIORITY[p].color}14`:WHITE,border:`1.5px solid ${form.priority===p?PRIORITY[p].color:BD}`,borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:700,color:form.priority===p?PRIORITY[p].color:MID}}>{p}</button>)}</div> },
          { label:"Description", content:<textarea value={form.desc} onChange={e=>setForm(f=>({...f,desc:e.target.value}))} placeholder="Describe the incident in detail…" style={{width:"100%",minHeight:80,padding:"9px 12px",border:`1.5px solid ${BD}`,borderRadius:6,fontSize:13,resize:"vertical",outline:"none",lineHeight:1.6}}/> },
          { label:"Reporting Officer", content:<input value={form.reporter} onChange={e=>setForm(f=>({...f,reporter:e.target.value}))} placeholder="Officer name / badge number" style={{width:"100%",padding:"9px 12px",border:`1.5px solid ${BD}`,borderRadius:6,fontSize:13,outline:"none"}}/> },
        ].map((field,i)=>(
          <div key={i} style={{marginBottom:14}}>
            <label style={{fontSize:10.5,fontWeight:700,color:MID,textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:6}}>{field.label}</label>
            {field.content}
          </div>
        ))}
        <button onClick={submit} disabled={!form.building||!form.desc} style={{width:"100%",padding:"11px",background:!form.building||!form.desc?BD:RED,color:WHITE,border:"none",borderRadius:7,fontSize:14,fontWeight:700,cursor:!form.building||!form.desc?"not-allowed":"pointer",fontFamily:"'IBM Plex Sans',sans-serif"}}>
          Log Incident →
        </button>
      </div>
    </div>
  );
}
