import { useState, useRef, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  NAVY, NAVY2, NAVY3, NAVYL, RED, REDL, ORANGE, ORANGEL, GREEN, GREENL,
  GOLD, WHITE, PAPER, PAPER2, BD, NK, SL, MID,
  LOGO,
  INC_TYPES, PRIORITY, STATUS_FLOW, STATUS_LABEL,
  MBOMBELA_BUILDINGS, ZONE_COLORS,
} from "./constants.js";
import CampusMap from "./components/CampusMap.jsx";
import { MAPPED_BUILDINGS } from "./maps/campusBuildings.js";
import { checkCampusLocation, getCurrentLocation } from "./maps/location.js";
import Signup from "./auth/Signup.jsx";
import { auth } from "./lib/firebase.js";
import { loadAppUser, signInUser, signOutUser } from "./auth/firebaseAuth.js";
import { createCheckin, createIncident, getCheckin, listIncidents, updateIncident } from "./incidentApi.js";


/* ── GLOBAL STYLES ────────────────────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Serif:wght@400;600;700&family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  html{scroll-behavior:smooth;}
  ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${BD};border-radius:3px}
  @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes slideIn{from{opacity:0;transform:translateX(-14px)}to{opacity:1;transform:translateX(0)}}
  @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.6;transform:scale(1.06)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}
  @keyframes ping{0%{transform:scale(1);opacity:1}75%,100%{transform:scale(2.2);opacity:0}}
`;

/* ══════════════════════════════════════════════════════════════
   LOGIN PAGE
   ══════════════════════════════════════════════════════════════ */
function LoginPage({ onLogin, onBack }) {
  const [portal, setPortal]       = useState(null);  // "student" | "staff"
  const [authView, setAuthView]   = useState("portal");
  // onBack goes back to the public landing site
  const [emailVal, setEmailVal]   = useState("");
  const [pwdVal, setPwdVal]       = useState("");
  const [showPwd, setShowPwd]     = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading]     = useState(false);
  const [shake, setShake]         = useState(false);

  async function handleSubmit() {
    if (!/^\S+@ump\.ac\.za$/i.test(emailVal.trim()) || !pwdVal) {
      setLoginError("Enter your @ump.ac.za email address and password.");
      return;
    }
    setLoginError("");
    setLoading(true);
    try {
      const result = await signInUser(emailVal, pwdVal);
      const isStaff = result.user.portal === "staff";
      if ((portal === "staff") !== isStaff) {
        setLoginError(portal === "staff" ? "This account is not provisioned for staff access." : "Use the Command Centre portal for this account.");
      } else {
        onLogin(result);
      }
    } catch (error) {
      setLoginError(error.message || "We could not sign you in. Check your details and verify your email address.");
      setShake(true);
      setTimeout(()=>setShake(false),600);
    } finally {
      setLoading(false);
    }
  }

  const BG = (
    <div style={{position:"fixed",inset:0,background:`linear-gradient(135deg, ${NAVY3} 0%, ${NAVY} 50%, ${NAVY2} 100%)`,zIndex:0}}>
      <div style={{position:"absolute",inset:0,backgroundImage:`radial-gradient(circle at 20% 20%, ${NAVYL}18 0%, transparent 50%), radial-gradient(circle at 80% 80%, ${GOLD}10 0%, transparent 50%)`}}/>
      <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",opacity:0.04}} xmlns="http://www.w3.org/2000/svg"><defs><pattern id="g" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M0 40L40 0M-10 10L10-10M30 50L50 30" stroke={WHITE} strokeWidth="0.5"/></pattern></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",position:"relative",fontFamily:"'IBM Plex Sans',sans-serif"}}>
      <style>{STYLES}</style>{BG}
      <div style={{position:"relative",zIndex:1,width:"100%",maxWidth:460,margin:"0 20px"}}>
        <div style={{textAlign:"center",marginBottom:28,animation:"fadeIn .5s ease"}}>
          <img src={LOGO} alt="University of Mpumalanga" style={{height:52,objectFit:"contain",mixBlendMode:"lighten",marginBottom:14}}/>
          <div style={{fontSize:12,fontWeight:700,color:"rgba(255,255,255,.55)",letterSpacing:3,textTransform:"uppercase",marginBottom:8}}>University of Mpumalanga</div>
          <div style={{fontSize:26,fontWeight:800,color:WHITE,fontFamily:"'IBM Plex Serif',serif"}}>CEIS Command Centre</div>
          <div style={{fontSize:12,color:"rgba(255,255,255,.4)",marginTop:4}}>Campus Emergency Intelligence System</div>
        </div>
        {authView === "register" ? <Signup onBack={()=>setAuthView("portal")}/> : !portal ? (
          <div style={{animation:"fadeIn .4s ease"}}>
            <div style={{background:"rgba(255,255,255,.06)",backdropFilter:"blur(12px)",borderRadius:16,border:"1px solid rgba(255,255,255,.12)",overflow:"hidden"}}>
              <div style={{padding:"22px 28px 14px",textAlign:"center",color:"rgba(255,255,255,.65)",fontSize:13}}>Select your access portal to continue</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,padding:"14px 24px 28px"}}>{[
                {key:"student",title:"Student Portal",sub:"Report incidents, check in, view safety status",icon:"🎓"},
                {key:"staff",title:"Command Centre",sub:"Provisioned staff access",icon:"🛡️"},
              ].map(item=><button key={item.key} onClick={()=>setPortal(item.key)} style={{background:"rgba(255,255,255,.08)",border:"1.5px solid rgba(255,255,255,.14)",borderRadius:12,padding:"22px 16px",cursor:"pointer",textAlign:"center",color:WHITE}}><div style={{fontSize:32,marginBottom:10}}>{item.icon}</div><div style={{fontSize:14,fontWeight:700,marginBottom:5}}>{item.title}</div><div style={{fontSize:11.5,color:"rgba(255,255,255,.58)",lineHeight:1.5}}>{item.sub}</div></button>)}</div>
            </div>
            <div style={{textAlign:"center",marginTop:18}}><button onClick={()=>setAuthView("register")} style={{background:"none",border:"1px solid rgba(255,255,255,.28)",borderRadius:7,padding:"10px 18px",color:WHITE,fontWeight:600,cursor:"pointer"}}>Create student account</button>{onBack&&<div><button onClick={onBack} style={{marginTop:12,background:"none",border:0,color:"rgba(255,255,255,.6)",cursor:"pointer"}}>← Back to Landing</button></div>}</div>
          </div>
        ) : (
          <div style={{background:WHITE,borderRadius:16,overflow:"hidden",boxShadow:"0 24px 80px rgba(0,0,0,.45)",animation:shake?"shake .3s":"slideIn .35s ease"}}>
            <div style={{background:`linear-gradient(135deg,${NAVY},${NAVY2})`,padding:"22px 28px",borderBottom:`3px solid ${portal==="student"?GOLD:RED}`}}>
              <button onClick={()=>{setPortal(null);setEmailVal("");setPwdVal("");setLoginError("");}} style={{background:"rgba(255,255,255,.08)",border:"1px solid rgba(255,255,255,.14)",color:"rgba(255,255,255,.7)",borderRadius:4,padding:"4px 10px",fontSize:11,cursor:"pointer",marginBottom:10}}>← Change portal</button>
              <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,.55)",letterSpacing:2,textTransform:"uppercase",marginBottom:5}}>{portal==="student"?"Student Portal":"Command Centre Access"}</div><div style={{fontSize:20,fontWeight:700,color:WHITE,fontFamily:"'IBM Plex Serif',serif"}}>Sign In</div>
            </div>
            <form onSubmit={event=>{event.preventDefault();handleSubmit();}} style={{padding:"26px 28px"}}>
              <label style={{fontSize:11,fontWeight:700,color:MID,textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:15}}>UMP email address<input type="email" autoComplete="username" value={emailVal} onChange={event=>setEmailVal(event.target.value)} required placeholder="name@ump.ac.za" style={{display:"block",width:"100%",marginTop:7,padding:"11px 14px",border:`1.5px solid ${BD}`,borderRadius:7,fontSize:14,outline:"none",color:NK}}/></label>
              <label style={{fontSize:11,fontWeight:700,color:MID,textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:6}}>Password<div style={{position:"relative",marginTop:7}}><input type={showPwd?"text":"password"} autoComplete="current-password" value={pwdVal} onChange={event=>setPwdVal(event.target.value)} required style={{width:"100%",padding:"11px 42px 11px 14px",border:`1.5px solid ${BD}`,borderRadius:7,fontSize:14,outline:"none",color:NK}}/><button type="button" onClick={()=>setShowPwd(value=>!value)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:0,cursor:"pointer"}}>{showPwd?"🙈":"👁"}</button></div></label>
              {loginError&&<div role="status" style={{fontSize:12,color:RED,background:REDL,borderRadius:6,padding:10,margin:"10px 0 14px"}}>{loginError}</div>}
              <button type="submit" disabled={loading} style={{width:"100%",padding:13,marginTop:13,background:portal==="student"?NAVY:RED,color:WHITE,border:0,borderRadius:7,fontSize:15,fontWeight:700,cursor:loading?"wait":"pointer"}}>{loading?"Signing in…":"Sign in"}</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   STUDENT PORTAL
   ══════════════════════════════════════════════════════════════ */
function StudentPortal({ user, authUser, onLogout }) {
  const [view, setView]         = useState("home");
  const [incidents, setIncidents] = useState([]);
  const [form, setForm]         = useState({ type:"medical", building:"", desc:"", priority:"P3", photo:null });
  const [reportLocation, setReportLocation] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [safeStatus, setSafeStatus] = useState(null);
  const [myReports, setMyReports] = useState([]);
  const [selectedBldg, setSelectedBldg] = useState(null);
  const [locationState, setLocationState] = useState("");
  const [locating, setLocating] = useState(false);
  const [dataError, setDataError] = useState("");
  const submittingReport = useRef(false);

  useEffect(() => {
    let active = true;
    Promise.all([listIncidents(authUser, true), getCheckin(authUser)])
      .then(([rows, checkin]) => { if (active) { setIncidents(rows); setMyReports(rows.filter(row => row.reportedBy === user.id)); setSafeStatus(checkin?.status || null); } })
      .catch(error => { if (active) setDataError(error.message); });
    return () => { active = false; };
  }, [authUser, user.id]);

  async function captureReportLocation() {
    setLocating(true);
    setLocationState("Requesting device location…");
    try {
      const location = await getCurrentLocation();
      setReportLocation(location);
      setLocationState(`Approximate device location captured (±${Math.round(location.accuracyMeters)} m). Confirm or adjust the pin on the map.`);
    } catch (error) {
      setLocationState(error.message || "Location is unavailable. You can choose a building or pin the location on the map.");
    } finally {
      setLocating(false);
    }
  }

  async function submitReport() {
    if (submittingReport.current || !form.building || !form.desc) return;
    submittingReport.current = true;
    const mappedBuilding = MAPPED_BUILDINGS.find((building) => building.id === form.building);
    const location = reportLocation || (mappedBuilding ? {
      latitude: mappedBuilding.lat,
      longitude: mappedBuilding.lng,
      accuracyMeters: null,
      capturedAt: new Date().toISOString(),
      source: "mapped-building",
    } : null);
    const campusCheck = location ? checkCampusLocation(location) : "unknown";
    let newInc;
    try {
      newInc = await createIncident(authUser, {
        type:form.type, priority:form.priority, building:form.building, desc:form.desc,
        lat:location?.latitude ?? null, lng:location?.longitude ?? null,
        accuracy:location?.accuracyMeters ?? null, locationCapturedAt:location?.capturedAt ?? null,
        locationSource:location?.source ?? null,
        campusVerified:campusCheck === "inside" ? true : campusCheck === "outside" ? false : null,
      });
    } catch (error) { setDataError(error.message); submittingReport.current=false; return; }
    setDataError("");
    setIncidents(p=>[newInc,...p]);
    setMyReports(p=>[newInc,...p]);
    setSubmitted(true);
    setTimeout(()=>{setSubmitted(false);setForm({type:"medical",building:"",desc:"",priority:"P3",photo:null});setReportLocation(null);setLocationState("");submittingReport.current=false;setView("home");},5000);
  }

  const NAVITEMS = [
    ["home","🏠","Home"],["report","🚨","Report"],["map","🗺","Campus Map"],["checkin","✅","Safe Check"],["my","📋","My Reports"]
  ];

  return (
    <div style={{minHeight:"100vh",background:PAPER,fontFamily:"'IBM Plex Sans',sans-serif"}}>
      <style>{STYLES}</style>
      {/* Header */}
<div style={{background:NAVY,borderBottom:`3px solid ${GOLD}`,position:"sticky",top:0,zIndex:100}}>
  <div style={{maxWidth:1100,margin:"0 auto",padding:"0 5%",height:60,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
    
    <div style={{display:"flex",alignItems:"center",gap:12}}>
      <img src={LOGO} alt="UMP" style={{height:36,objectFit:"contain",mixBlendMode:"lighten"}}/>
      
      <div style={{borderLeft:"1px solid rgba(255,255,255,0.15)",paddingLeft:12}}>
        <div style={{fontSize:9,fontWeight:700,color:"rgba(255,255,255,0.5)",letterSpacing:1.8,textTransform:"uppercase"}}>
          Student Portal
        </div>
        <div style={{fontSize:14,fontWeight:700,color:WHITE,fontFamily:"'IBM Plex Serif',serif"}}>
          {user.name}
        </div>
      </div>
    </div>

    <div style={{display:"flex",gap:8}}>
      {safeStatus && (
        <div
          style={{
            padding:"4px 12px",
            background:`${safeStatus==="safe"?GREEN:RED}22`,
            border:`1px solid ${safeStatus==="safe"?GREEN:RED}40`,
            borderRadius:4,
            fontSize:11,
            fontWeight:700,
            color:safeStatus==="safe"?GREEN:RED
          }}
        >
          {safeStatus==="safe" ? "✓ Safe" : "⚠ Needs Help"}
        </div>
      )}

      <button
        onClick={onLogout}
        style={{
          background:"rgba(255,255,255,0.07)",
          border:"1px solid rgba(255,255,255,0.14)",
          color:"rgba(255,255,255,0.6)",
          borderRadius:4,
          padding:"6px 14px",
          fontSize:12,
          cursor:"pointer"
        }}
      >
        Sign Out
      </button>
    </div>

  </div>
</div>
      {/* Nav */}
      <div style={{background:WHITE,borderBottom:`1px solid ${BD}`,position:"sticky",top:60,zIndex:99}}>
        <div style={{maxWidth:1100,margin:"0 auto",padding:"0 5%",display:"flex",gap:0}}>
          {NAVITEMS.map(([k,ico,lbl])=>(
            <button key={k} onClick={()=>setView(k)} style={{padding:"12px 20px",background:"none",border:"none",borderBottom:`2px solid ${view===k?GOLD:"transparent"}`,color:view===k?NAVY:MID,fontSize:13,fontWeight:view===k?700:500,cursor:"pointer",display:"flex",alignItems:"center",gap:6,transition:"all .2s",marginBottom:-1}}>
              <span>{ico}</span>{lbl}
            </button>
          ))}
        </div>
      </div>

      <div style={{maxWidth:1100,margin:"0 auto",padding:"28px 5% 60px"}}>
        {/* HOME */}
        {view==="home"&&(
          <div style={{animation:"fadeIn .35s ease"}}>
            <h2 style={{fontFamily:"'IBM Plex Serif',serif",fontSize:26,fontWeight:700,color:NK,marginBottom:6}}>Welcome back, {user.name.split(" ")[0]}</h2>
            <p style={{fontSize:14,color:SL,marginBottom:28}}>{user.faculty} · Year {user.year} · ID: {user.id}</p>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:28}}>
              {[
                { title:"Report Emergency",  sub:"Fire, medical, security threats",  icon:"🚨", color:RED,   action:()=>setView("report") },
                { title:"Safety Check-In",   sub:"Mark yourself as safe or in need", icon:"✅", color:GREEN, action:()=>setView("checkin") },
                { title:"Active Incidents",  sub:`${incidents.filter(i=>!["RESOLVED","CLOSED"].includes(i.status)).length} incidents on campus`, icon:"📡", color:ORANGE, action:()=>setView("map") },
              ].map((c,i)=>(
                <button key={i} onClick={c.action} style={{background:WHITE,border:`1.5px solid ${BD}`,borderRadius:10,padding:"20px",textAlign:"left",cursor:"pointer",transition:"all .2s",borderTop:`3px solid ${c.color}`}}>
                  <div style={{fontSize:28,marginBottom:10}}>{c.icon}</div>
                  <div style={{fontSize:14,fontWeight:700,color:NK,fontFamily:"'IBM Plex Serif',serif",marginBottom:4}}>{c.title}</div>
                  <div style={{fontSize:12.5,color:SL}}>{c.sub}</div>
                </button>
              ))}
            </div>
            {/* Emergency contacts */}
            <div style={{background:NAVY,borderRadius:10,padding:"18px 22px",marginBottom:20}}>
              <div style={{fontSize:10.5,fontWeight:700,color:"rgba(255,255,255,0.5)",letterSpacing:1.8,textTransform:"uppercase",marginBottom:12}}>Emergency Contacts</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
                {[["🚑","Medical Emergency","10177"],["🛡️","Campus Security","013 002 0010"],["🏥","Campus Clinic","013 002 0200"]].map(([ico,lbl,num])=>(
                  <div key={num} style={{background:"rgba(255,255,255,0.08)",borderRadius:7,padding:"12px 14px"}}>
                    <div style={{fontSize:20,marginBottom:5}}>{ico}</div>
                    <div style={{fontSize:11,color:"rgba(255,255,255,0.55)"}}>{lbl}</div>
                    <div style={{fontSize:15,fontWeight:800,color:WHITE,fontFamily:"'IBM Plex Mono',monospace"}}>{num}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* Recent campus map */}
            <div style={{background:WHITE,borderRadius:10,border:`1px solid ${BD}`,overflow:"hidden"}}>
              <div style={{padding:"14px 18px",borderBottom:`1px solid ${BD}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:14,fontWeight:700,color:NK,fontFamily:"'IBM Plex Serif',serif"}}>Campus Safety Overview</span>
                <button onClick={()=>setView("map")} style={{fontSize:12,color:NAVY,background:"none",border:"none",cursor:"pointer",fontWeight:600}}>Full Map →</button>
              </div>
              <div style={{padding:14}}><CampusMap incidents={incidents} compact={true}/></div>
            </div>
          </div>
        )}

        {/* REPORT INCIDENT */}
        {view==="report"&&(
          <div style={{maxWidth:620,animation:"fadeIn .35s ease"}}>
            <h2 style={{fontFamily:"'IBM Plex Serif',serif",fontSize:24,fontWeight:700,color:NK,marginBottom:6}}>Report an Incident</h2>
            <p style={{fontSize:14,color:SL,marginBottom:24}}>Reports are saved to the campus incident database for authorized staff review. The system does not notify responders automatically. For life-threatening emergencies, call 10177 directly.</p>
            {dataError&&<div role="alert" style={{background:REDL,color:RED,padding:12,borderRadius:7,marginBottom:16}}>{dataError}</div>}
            {submitted?(
              <div style={{background:GREENL,border:`1.5px solid ${GREEN}`,borderRadius:10,padding:"24px",textAlign:"center",animation:"fadeIn .4s ease"}}>
                <div style={{fontSize:40,marginBottom:12}}>✅</div>
                <h3 style={{fontFamily:"'IBM Plex Serif',serif",fontSize:20,color:GREEN,marginBottom:8}}>Report saved</h3>
                <p style={{fontSize:14,color:SL}}>Your report is available to authorized campus staff. No responder was notified automatically.</p>
              </div>
            ):(
              <div style={{background:WHITE,borderRadius:12,border:`1px solid ${BD}`,padding:"26px"}}>
                {form.type==="medical"&&(
                  <section aria-label="Urgent medical help" style={{background:REDL,border:`1px solid ${RED}45`,borderLeft:`4px solid ${RED}`,borderRadius:8,padding:16,marginBottom:22}}>
                    <div style={{fontSize:14,fontWeight:700,color:RED,marginBottom:4}}>Medical emergency?</div>
                    <p style={{fontSize:12.5,color:SL,lineHeight:1.6,marginBottom:12}}>You can call for help immediately without completing this report. Opening a call link does not confirm that the call connected.</p>
                    <div style={{display:"flex",flexWrap:"wrap",gap:9}}>
                      <a href="tel:10177" aria-label="Call emergency medical services at 10177" style={{display:"inline-flex",alignItems:"center",justifyContent:"center",minHeight:44,padding:"10px 15px",background:RED,color:WHITE,borderRadius:6,textDecoration:"none",fontSize:13,fontWeight:700}}>Call EMS · 10177</a>
                      <a href="tel:0130020010" aria-label="Call campus security at 013 002 0010" style={{display:"inline-flex",alignItems:"center",justifyContent:"center",minHeight:44,padding:"10px 14px",background:NAVY,color:WHITE,borderRadius:6,textDecoration:"none",fontSize:12.5,fontWeight:600}}>Campus Security</a>
                      <a href="tel:0130020200" aria-label="Call campus clinic at 013 002 0200" style={{display:"inline-flex",alignItems:"center",justifyContent:"center",minHeight:44,padding:"10px 14px",background:WHITE,border:`1px solid ${BD}`,color:NAVY,borderRadius:6,textDecoration:"none",fontSize:12.5,fontWeight:600}}>Campus Clinic</a>
                    </div>
                  </section>
                )}
                {[
                  { label:"Incident Type", content:(
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                      {Object.entries(INC_TYPES).map(([k,v])=>(
                        <button key={k} onClick={()=>setForm(f=>({...f,type:k}))} style={{padding:"10px 8px",background:form.type===k?`${v.color}12`:WHITE,border:`1.5px solid ${form.type===k?v.color:BD}`,borderRadius:7,cursor:"pointer",textAlign:"center"}}>
                          <div style={{fontSize:20,marginBottom:4}}>{v.icon}</div>
                          <div style={{fontSize:11,fontWeight:600,color:form.type===k?v.color:SL}}>{v.label}</div>
                        </button>
                      ))}
                    </div>
                  )},
                  { label:"Building / Location", content:(
                    <select value={form.building} onChange={e=>setForm(f=>({...f,building:e.target.value}))} style={{width:"100%",padding:"11px 14px",border:`1.5px solid ${BD}`,borderRadius:7,fontSize:14,color:NK,outline:"none",background:WHITE}}>
                      <option value="">Select building…</option>
                      {MBOMBELA_BUILDINGS.map(b=><option key={b.id} value={b.id}>Building {b.id} — {b.name}</option>)}
                    </select>
                  )},
                  { label:"Pin the incident location (optional)", content:(
                    <div>
                      <button type="button" onClick={captureReportLocation} disabled={locating} style={{minHeight:42,padding:"9px 13px",marginBottom:8,background:WHITE,border:`1px solid ${BD}`,borderRadius:6,color:NAVY,fontSize:12.5,fontWeight:600,cursor:locating?"wait":"pointer"}}>{locating?"Getting location…":"Use my device location"}</button>
                      {locationState&&<p role="status" style={{fontSize:12,color:SL,lineHeight:1.5,margin:"0 0 9px"}}>{locationState}</p>}
                      <CampusMap
                      compact
                      incidents={[]}
                      selectedBuilding={form.building}
                      location={reportLocation}
                      onLocationChange={setReportLocation}
                      allowLocationSelection
                      />
                    </div>
                  )},
                  { label:"Priority Level", content:(
                    <div style={{display:"flex",gap:8}}>
                      {["P1","P2","P3","P4"].map(p=>(
                        <button key={p} onClick={()=>setForm(f=>({...f,priority:p}))} style={{flex:1,padding:"9px 8px",background:form.priority===p?`${PRIORITY[p].color}14`:WHITE,border:`1.5px solid ${form.priority===p?PRIORITY[p].color:BD}`,borderRadius:6,cursor:"pointer"}}>
                          <div style={{fontSize:11,fontWeight:700,color:form.priority===p?PRIORITY[p].color:MID}}>{p}</div>
                          <div style={{fontSize:10,color:MID}}>{PRIORITY[p].label}</div>
                        </button>
                      ))}
                    </div>
                  )},
                  { label:"Description", content:(
                    <textarea value={form.desc} onChange={e=>setForm(f=>({...f,desc:e.target.value}))} placeholder="Describe what is happening, number of people involved, any injuries, exact location within the building…" style={{width:"100%",minHeight:100,padding:"11px 14px",border:`1.5px solid ${BD}`,borderRadius:7,fontSize:14,color:NK,resize:"vertical",outline:"none",lineHeight:1.65}}/>
                  )},
                ].map((field,i)=>(
                  <div key={i} style={{marginBottom:20}}>
                    <label style={{fontSize:11,fontWeight:700,color:MID,textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:8}}>{field.label}</label>
                    {field.content}
                  </div>
                ))}
                <button onClick={submitReport} disabled={!form.building||!form.desc} style={{width:"100%",padding:"13px",background:!form.building||!form.desc?BD:RED,color:WHITE,border:"none",borderRadius:7,fontSize:15,fontWeight:700,cursor:!form.building||!form.desc?"not-allowed":"pointer"}}>
                  🚨 Submit Incident Report
                </button>
              </div>
            )}
          </div>
        )}

        {/* CAMPUS MAP */}
        {view==="map"&&(
          <div style={{animation:"fadeIn .35s ease"}}>
            <h2 style={{fontFamily:"'IBM Plex Serif',serif",fontSize:24,fontWeight:700,color:NK,marginBottom:6}}>Campus Map — Live Safety Status</h2>
            <p style={{fontSize:14,color:SL,marginBottom:20}}>Mbombela Campus · GPS-tagged incidents and mapped building locations</p>
            <div className="ceis-student-map-layout" style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:18,alignItems:"start"}}>
              <div style={{background:WHITE,borderRadius:12,border:`1px solid ${BD}`,padding:16}}>
                <CampusMap incidents={incidents} selectedBuilding={selectedBldg?.id} onBuildingClick={b=>setSelectedBldg(b)}/>
              </div>
              <div>
                {selectedBldg?(
                  <div style={{background:WHITE,borderRadius:10,border:`1px solid ${BD}`,overflow:"hidden",animation:"fadeIn .3s ease"}}>
                    <div style={{padding:"14px 16px",background:NAVY,borderBottom:`2px solid ${GOLD}`}}>
                      <div style={{fontSize:9,fontWeight:700,color:"rgba(255,255,255,0.5)",letterSpacing:1.5,textTransform:"uppercase"}}>Building {selectedBldg.id}</div>
                      <div style={{fontSize:14,fontWeight:700,color:WHITE,fontFamily:"'IBM Plex Serif',serif",marginTop:3}}>{selectedBldg.name}</div>
                    </div>
                    <div style={{padding:"14px 16px"}}>
                      {incidents.filter(i=>i.building===selectedBldg.id&&!["RESOLVED","CLOSED"].includes(i.status)).length===0?(
                        <div style={{textAlign:"center",padding:"20px 0",color:GREEN,fontSize:13}}>✓ No active incidents</div>
                      ):incidents.filter(i=>i.building===selectedBldg.id&&!["RESOLVED","CLOSED"].includes(i.status)).map(inc=>(
                        <div key={inc.id} style={{padding:"10px 12px",background:REDL,border:`1px solid ${RED}28`,borderRadius:7,marginBottom:8}}>
                          <div style={{fontSize:11,fontWeight:700,color:RED}}>{PRIORITY[inc.priority].label} · {INC_TYPES[inc.type]?.label}</div>
                          <div style={{fontSize:12,color:NK,marginTop:4}}>{inc.desc}</div>
                          <div style={{fontSize:11,color:MID,marginTop:4}}>{inc.time} · {STATUS_LABEL[inc.status]}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ):(
                  <div style={{background:WHITE,borderRadius:10,border:`1px solid ${BD}`,padding:"20px",textAlign:"center",color:MID,fontSize:13}}>
                    Click any building on the map to view its status
                  </div>
                )}
                {/* Active incidents summary */}
                <div style={{background:WHITE,borderRadius:10,border:`1px solid ${BD}`,marginTop:12,overflow:"hidden"}}>
                  <div style={{padding:"12px 16px",borderBottom:`1px solid ${BD}`,fontSize:12,fontWeight:700,color:NK}}>Active Incidents</div>
                  {incidents.filter(i=>!["RESOLVED","CLOSED"].includes(i.status)).map(inc=>(
                    <div key={inc.id} style={{padding:"10px 16px",borderBottom:`1px solid ${BD}`,display:"flex",gap:8,alignItems:"flex-start"}}>
                      <span style={{fontSize:16}}>{INC_TYPES[inc.type]?.icon}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:600,color:NK,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{inc.loc}</div>
                        <div style={{fontSize:11,color:MID}}>{inc.time} · <span style={{color:PRIORITY[inc.priority].color,fontWeight:700}}>{inc.priority}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SAFETY CHECK-IN */}
        {view==="checkin"&&(
          <div style={{maxWidth:560,animation:"fadeIn .35s ease"}}>
            <h2 style={{fontFamily:"'IBM Plex Serif',serif",fontSize:24,fontWeight:700,color:NK,marginBottom:6}}>Safety Check-In</h2>
            <p style={{fontSize:14,color:SL,marginBottom:24}}>During an emergency, campus security needs to know your status. Please update your safety status below.</p>
            <div style={{background:WHITE,borderRadius:12,border:`1px solid ${BD}`,padding:"26px"}}>
              {safeStatus&&(
                <div style={{background:safeStatus==="safe"?GREENL:REDL,border:`1.5px solid ${safeStatus==="safe"?GREEN:RED}`,borderRadius:10,padding:"16px",textAlign:"center",marginBottom:20}}>
                  <div style={{fontSize:32,marginBottom:8}}>{safeStatus==="safe"?"✅":"🆘"}</div>
                  <div style={{fontSize:16,fontWeight:700,color:safeStatus==="safe"?GREEN:RED,fontFamily:"'IBM Plex Serif',serif"}}>
                    {safeStatus==="safe"?"You are marked as SAFE":"ASSISTANCE REQUEST SAVED — Call Security for immediate help"}
                  </div>
                  <div style={{fontSize:12,color:SL,marginTop:6}}>Last updated: {new Date().toLocaleTimeString("en-ZA")}</div>
                </div>
              )}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <button onClick={async()=>{try{await createCheckin(authUser,{status:"safe"});setSafeStatus("safe");setDataError("");}catch(error){setDataError(error.message);}}} style={{padding:"22px",background:safeStatus==="safe"?GREENL:WHITE,border:`2px solid ${safeStatus==="safe"?GREEN:BD}`,borderRadius:10,cursor:"pointer",textAlign:"center",transition:"all .2s"}}>
                  <div style={{fontSize:36,marginBottom:8}}>✅</div>
                  <div style={{fontSize:15,fontWeight:700,color:GREEN}}>I am SAFE</div>
                  <div style={{fontSize:12,color:SL,marginTop:4}}>I am in a safe location</div>
                </button>
                <button onClick={async()=>{try{await createCheckin(authUser,{status:"help"});setSafeStatus("help");setDataError("");}catch(error){setDataError(error.message);}}} style={{padding:"22px",background:safeStatus==="help"?REDL:WHITE,border:`2px solid ${safeStatus==="help"?RED:BD}`,borderRadius:10,cursor:"pointer",textAlign:"center",transition:"all .2s"}}>
                  <div style={{fontSize:36,marginBottom:8}}>🆘</div>
                  <div style={{fontSize:15,fontWeight:700,color:RED}}>Need HELP</div>
                  <div style={{fontSize:12,color:SL,marginTop:4}}>I need emergency assistance</div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MY REPORTS */}
        {view==="my"&&(
          <div style={{animation:"fadeIn .35s ease"}}>
            <h2 style={{fontFamily:"'IBM Plex Serif',serif",fontSize:24,fontWeight:700,color:NK,marginBottom:20}}>My Reports</h2>
            {myReports.length===0?(
              <div style={{background:WHITE,borderRadius:10,border:`1px solid ${BD}`,padding:"40px",textAlign:"center",color:MID,fontSize:14}}>You haven&apos;t submitted any reports this session.</div>
            ):myReports.map(inc=>(
              <div key={inc.id} style={{background:WHITE,borderRadius:10,border:`1px solid ${BD}`,padding:"16px 20px",marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                  <div style={{display:"flex",gap:10,alignItems:"center"}}><span style={{fontSize:22}}>{INC_TYPES[inc.type]?.icon}</span><div><div style={{fontSize:13,fontWeight:700,color:NK}}>{inc.loc}</div><div style={{fontSize:12,color:MID}}>{inc.id} · {inc.time}</div></div></div>
                  <span style={{padding:"3px 10px",background:`${PRIORITY[inc.priority].color}14`,color:PRIORITY[inc.priority].color,borderRadius:3,fontSize:11,fontWeight:700}}>{inc.priority} — {PRIORITY[inc.priority].label}</span>
                </div>
                <div style={{fontSize:13,color:SL,marginBottom:6}}>{inc.desc}</div>
                <div style={{fontSize:12,color:inc.status==="RESOLVED"?GREEN:ORANGE,fontWeight:600}}>● {STATUS_LABEL[inc.status]}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   ADMIN COMMAND CENTRE
   ══════════════════════════════════════════════════════════════ */
function CommandCentre({ user, authUser, onLogout }) {
  const [view, setView]             = useState(user.access === "staff" ? "input" : "dashboard");
  const [incidents, setIncidents]   = useState([]);
  const [selectedInc, setSelectedInc] = useState(null);
  const [selectedBldg, setSelectedBldg] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [filterPri, setFilterPri]   = useState("all");
  const [dispatchMsg, setDispatchMsg] = useState("");
  const [dataError, setDataError] = useState("");
  useEffect(() => {
    let active = true;
    listIncidents(authUser).then(rows => { if (active) setIncidents(rows); }).catch(error => { if (active) setDataError(error.message); });
    return () => { active = false; };
  }, [authUser]);
  async function updateStatus(id, status) {
    try {
      const updated = await updateIncident(authUser, { id, status });
      setIncidents(prev => prev.map(i => i.id===id ? updated : i));
      if (selectedInc?.id===id) setSelectedInc(updated);
      setDataError("");
    } catch (error) { setDataError(error.message); }
  }
  async function assignResponder(id, responder) {
    try {
      const updated = await updateIncident(authUser, { id, responder, status:"TEAM_DISPATCHED" });
      setIncidents(prev => prev.map(i => i.id===id ? updated : i));
      if (selectedInc?.id===id) setSelectedInc(updated);
      setDataError("");
    } catch (error) { setDataError(error.message); return; }
    setDispatchMsg(`Team dispatched: ${responder}`);
    setTimeout(()=>setDispatchMsg(""),3000);
  }

  const active = incidents.filter(i=>!["RESOLVED","CLOSED"].includes(i.status));
  const p1count = active.filter(i=>i.priority==="P1").length;
  const filtered = incidents.filter(i => (filterType==="all"||i.type===filterType) && (filterPri==="all"||i.priority===filterPri));

  const NAVITEMS = [
    ["dashboard","📡","Dashboard"],["incidents","🚨","Incidents"],["map","🗺","Live Map"],
    ["dispatch","⚡","Assignments"],["input","📥","Report Input"],
  ];
  const canAccess = (view) => {
    if (user.access === "staff") return view === "input";
    if (user.access==="medical"  && ["dispatch"].includes(view)) return false;
    return true;
  };

  return (
    <div style={{minHeight:"100vh",background:PAPER,fontFamily:"'IBM Plex Sans',sans-serif"}}>
      <style>{STYLES}</style>

      {/* P1 ALERT BANNER */}
      {p1count>0&&(
        <div style={{background:RED,padding:"8px 5%",display:"flex",alignItems:"center",justifyContent:"center",gap:12,animation:"blink 2s ease-in-out infinite"}}>
          <span style={{fontSize:16}}>🚨</span>
          <span style={{fontSize:13,fontWeight:700,color:WHITE,fontFamily:"'IBM Plex Mono',monospace"}}>{p1count} CRITICAL INCIDENT{p1count>1?"S":""} ACTIVE — IMMEDIATE RESPONSE REQUIRED</span>
          <span style={{fontSize:16}}>🚨</span>
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
            <button onClick={onLogout} style={{background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.14)",color:"rgba(255,255,255,0.6)",borderRadius:4,padding:"6px 14px",fontSize:12,cursor:"pointer"}}>Sign Out</button>
          </div>
        </div>
      </div>

      {/* NAV */}
      <div style={{background:WHITE,borderBottom:`1px solid ${BD}`,position:"sticky",top:p1count>0?96:60,zIndex:99}}>
        <div style={{maxWidth:1400,margin:"0 auto",padding:"0 3%",display:"flex",gap:0}}>
          {NAVITEMS.filter(([k])=>canAccess(k)).map(([k,ico,lbl])=>(
            <button key={k} onClick={()=>setView(k)} style={{padding:"11px 18px",background:"none",border:"none",borderBottom:`2px solid ${view===k?RED:"transparent"}`,color:view===k?RED:MID,fontSize:12.5,fontWeight:view===k?700:500,cursor:"pointer",display:"flex",alignItems:"center",gap:6,marginBottom:-1,transition:"all .2s"}}>
              <span>{ico}</span>{lbl}
            </button>
          ))}
        </div>
      </div>

      <div style={{maxWidth:1400,margin:"0 auto",padding:"20px 3% 60px"}}>
        {dataError&&<div role="alert" style={{background:REDL,color:RED,padding:12,borderRadius:7,marginBottom:16}}>{dataError}</div>}

        {/* ── DASHBOARD ── */}
        {view==="dashboard"&&(
          <div style={{animation:"fadeIn .35s ease"}}>
            {/* KPI row */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:20}}>
              {[
                { label:"Active Incidents", value:active.length, color:ORANGE, sub:"across campus" },
                { label:"Critical (P1)",    value:p1count, color:RED,    sub:"need immediate response" },
                { label:"High (P2)",        value:active.filter(i=>i.priority==="P2").length, color:"#B85000", sub:"urgent response" },
                { label:"Resolved Today",   value:incidents.filter(i=>i.status==="RESOLVED").length, color:GREEN, sub:"incidents closed" },
                { label:"Total Logged",     value:incidents.length, color:NAVY, sub:"all incidents today" },
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
                    <button key={inc.id} onClick={()=>{setSelectedInc(inc);setView("incidents");}} style={{width:"100%",padding:"12px 16px",background:"none",border:"none",borderBottom:`1px solid ${BD}`,cursor:"pointer",textAlign:"left",display:"flex",gap:10,alignItems:"flex-start",transition:"background .15s"}}>
                      <span style={{fontSize:20,flexShrink:0,marginTop:1}}>{INC_TYPES[inc.type]?.icon}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12.5,fontWeight:700,color:NK,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{inc.loc}</div>
                        <div style={{fontSize:11.5,color:SL,marginTop:2,lineHeight:1.4,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{inc.desc}</div>
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
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {filtered.map(inc=>{
                  const P=PRIORITY[inc.priority],T=INC_TYPES[inc.type];
                  const isSelected=selectedInc?.id===inc.id;
                  return (
                    <button key={inc.id} onClick={()=>setSelectedInc(inc)} style={{background:isSelected?`${NAVY}06`:WHITE,border:`1.5px solid ${isSelected?NAVY:BD}`,borderRadius:9,padding:"14px 16px",cursor:"pointer",textAlign:"left",transition:"all .15s",display:"flex",gap:12,alignItems:"flex-start"}}>
                      <span style={{fontSize:24,flexShrink:0,marginTop:2}}>{T?.icon}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                          <div>
                            <span style={{fontSize:11,fontWeight:700,color:MID,fontFamily:"'IBM Plex Mono',monospace"}}>{inc.id}</span>
                            <span style={{fontSize:12.5,fontWeight:700,color:NK,marginLeft:8}}>{inc.loc}</span>
                          </div>
                          <div style={{display:"flex",gap:6,flexShrink:0}}>
                            <span style={{padding:"2px 8px",background:`${P.color}14`,color:P.color,borderRadius:3,fontSize:10.5,fontWeight:700}}>{inc.priority}</span>
                            <span style={{padding:"2px 8px",background:PAPER2,color:SL,borderRadius:3,fontSize:10.5}}>{STATUS_LABEL[inc.status]}</span>
                          </div>
                        </div>
                        <div style={{fontSize:13,color:SL,marginBottom:4,lineHeight:1.5}}>{inc.desc}</div>
                        <div style={{fontSize:11.5,color:MID}}>📍 Building {inc.building} · ⏱ {inc.time} · 👤 {inc.responder}</div>
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
                  <p style={{fontSize:13.5,color:SL,lineHeight:1.7,marginBottom:16}}>{selectedInc.desc}</p>
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
                    {STATUS_FLOW.map(s=>(
                      <button key={s} onClick={()=>updateStatus(selectedInc.id,s)}
                        style={{padding:"6px 12px",background:selectedInc.status===s?NAVY:WHITE,color:selectedInc.status===s?WHITE:SL,border:`1.5px solid ${selectedInc.status===s?NAVY:BD}`,borderRadius:5,fontSize:11,fontWeight:selectedInc.status===s?700:500,cursor:"pointer",transition:"all .15s"}}>
                        {STATUS_LABEL[s]}
                      </button>
                    ))}
                  </div>
                  {/* Quick dispatch */}
                  <div style={{fontSize:10,fontWeight:700,color:MID,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Quick Dispatch</div>
                  {dispatchMsg&&<div style={{padding:"8px 12px",background:GREENL,border:`1px solid ${GREEN}28`,borderRadius:6,fontSize:12,color:GREEN,marginBottom:10}}>✓ {dispatchMsg}</div>}
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {[["Security","Sgt. Mthembu + Unit 2"],["Medical","Sr. Mahlangu + Emergency Kit"],["Fire + Security","Fire Response Team + Security"],["All Units","All available response units"]].map(([l,r])=>(
                      <button key={l} onClick={()=>assignResponder(selectedInc.id,r)} style={{padding:"9px 14px",background:PAPER,border:`1px solid ${BD}`,borderRadius:6,cursor:"pointer",textAlign:"left",fontSize:12.5,color:NK,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <span>{l}</span><span style={{fontSize:11,color:MID}}>→ {r}</span>
                      </button>
                    ))}
                  </div>
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
                          <div style={{fontSize:12.5,color:NK,lineHeight:1.5}}>{inc.desc}</div>
                          <div style={{fontSize:11,color:MID,marginTop:4}}>● {STATUS_LABEL[inc.status]}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                ):(
                  <div style={{background:WHITE,borderRadius:10,border:`1px solid ${BD}`,padding:"24px",textAlign:"center",color:MID,fontSize:13,marginBottom:14}}>
                    <div style={{fontSize:32,marginBottom:10}}>🗺️</div>
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
            <p style={{fontSize:14,color:SL,marginBottom:20}}>Assign and track response teams across all active incidents</p>
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
                    <div style={{fontSize:12.5,color:SL,marginBottom:8}}>{inc.desc}</div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      {[["Security",NAVY],["Medical",GREEN],["Fire",RED]].map(([label,col])=>(
                        <button key={label} onClick={()=>assignResponder(inc.id,`${label} Team`)} style={{padding:"6px 14px",background:`${col}10`,border:`1px solid ${col}30`,color:col,borderRadius:5,fontSize:12,fontWeight:700,cursor:"pointer"}}>
                          Dispatch {label}
                        </button>
                      ))}
                    </div>
                    <div style={{marginTop:8,fontSize:11.5,color:MID}}>Current: {inc.responder} · Status: <span style={{color:ORANGE,fontWeight:600}}>{STATUS_LABEL[inc.status]}</span></div>
                  </div>
                ))}
                {active.filter(i=>["P1","P2"].includes(i.priority)).length===0&&(
                  <div style={{background:GREENL,border:`1px solid ${GREEN}28`,borderRadius:9,padding:"20px",textAlign:"center",color:GREEN,fontSize:13,fontWeight:600}}>✓ No critical incidents requiring dispatch</div>
                )}
              </div>
              {/* Response units */}
              <div>
                <div style={{fontSize:12,fontWeight:700,color:MID,textTransform:"uppercase",letterSpacing:1,marginBottom:12}}>Response Units — Status</div>
                {[
                  { unit:"Security Unit 1",  officer:"Sgt. T. Mthembu",    status:"available",   skills:["security","crowd"],     loc:"Gate 1" },
                  { unit:"Security Unit 2",  officer:"Cst. N. Mahlatsi",   status:"deployed",    skills:["security"],             loc:"Building 16" },
                  { unit:"Medical Response", officer:"Sr. Z. Mahlangu",    status:"deployed",    skills:["medical","first_aid"],  loc:"Building 35" },
                  { unit:"Fire Response",    officer:"Chief S. Joubert",    status:"available",   skills:["fire","hazmat"],        loc:"Main Gate" },
                  { unit:"Student Support",  officer:"Ms. L. Ndlovu",      status:"available",   skills:["support","welfare"],    loc:"Student Centre" },
                  { unit:"Facilities",       officer:"Mr. P. Pretorius",   status:"available",   skills:["infra","maintenance"],  loc:"Building 25" },
                ].map((u,i)=>(
                  <div key={i} style={{background:WHITE,border:`1px solid ${BD}`,borderRadius:8,padding:"12px 14px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:NK}}>{u.unit}</div>
                      <div style={{fontSize:11.5,color:SL,marginTop:2}}>{u.officer} · {u.loc}</div>
                      <div style={{display:"flex",gap:4,marginTop:5}}>
                        {u.skills.map(s=><span key={s} style={{padding:"2px 7px",background:PAPER2,border:`1px solid ${BD}`,borderRadius:3,fontSize:10,color:MID}}>{s}</span>)}
                      </div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
                      <div style={{padding:"4px 10px",background:u.status==="available"?GREENL:ORANGEL,border:`1px solid ${u.status==="available"?GREEN:ORANGE}28`,borderRadius:4,fontSize:11,fontWeight:700,color:u.status==="available"?GREEN:ORANGE}}>
                        {u.status==="available"?"● Available":"● Deployed"}
                      </div>
                    </div>
                  </div>
                ))}
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
              {/* IoT / Sensor inputs */}
              <div>
                <div style={{background:WHITE,borderRadius:10,border:`1px solid ${BD}`,overflow:"hidden",marginBottom:14}}>
                  <div style={{padding:"13px 18px",borderBottom:`1px solid ${BD}`,background:PAPER}}>
                    <div style={{fontSize:11,fontWeight:700,color:MID,textTransform:"uppercase",letterSpacing:1}}>Sensor / IoT Inputs</div>
                    <div style={{fontSize:14,fontWeight:700,color:NK,fontFamily:"'IBM Plex Serif',serif",marginTop:3}}>Automated Triggers</div>
                  </div>
                  <div style={{padding:"14px 18px"}}>
                    {[
                      { sensor:"Smoke Sensor",    loc:"Chemistry Lab B19",     status:"TRIGGERED", color:RED,    time:"14:28", value:"Smoke concentration: HIGH" },
                      { sensor:"Panic Button",     loc:"Student Centre B16",    status:"OK",        color:GREEN,  time:"13:10", value:"Last press: None today" },
                      { sensor:"CCTV Motion",      loc:"Library B2 — Rear",     status:"ALERT",     color:ORANGE, time:"13:45", value:"Unusual activity detected" },
                      { sensor:"Crowd Counter",    loc:"Multi-Purpose Hall B36", status:"WARNING",   color:GOLD,   time:"12:44", value:"Occupancy: 87% capacity" },
                      { sensor:"Weather API",      loc:"Campus Wide",           status:"OK",        color:GREEN,  time:"14:00", value:"Clear · 24°C · Wind: 14km/h" },
                    ].map((s,i)=>(
                      <div key={i} style={{display:"flex",gap:12,padding:"10px 0",borderBottom:i<4?`1px solid ${BD}`:"none",alignItems:"center"}}>
                        <div style={{width:8,height:8,borderRadius:"50%",background:s.color,flexShrink:0,animation:["TRIGGERED","ALERT"].includes(s.status)?`blink 1.5s infinite`:"none"}}/>
                        <div style={{flex:1}}>
                          <div style={{fontSize:12.5,fontWeight:700,color:NK}}>{s.sensor} <span style={{fontSize:10.5,color:MID,fontWeight:400}}>· {s.loc}</span></div>
                          <div style={{fontSize:11.5,color:SL}}>{s.value}</div>
                        </div>
                        <div style={{textAlign:"right",flexShrink:0}}>
                          <div style={{fontSize:10.5,fontWeight:700,color:s.color}}>{s.status}</div>
                          <div style={{fontSize:10,color:MID}}>{s.time}</div>
                        </div>
                      </div>
                    ))}
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
          { label:"Incident Type", content:<select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))} style={{width:"100%",padding:"9px 12px",border:`1.5px solid ${BD}`,borderRadius:6,fontSize:13,outline:"none"}}>{Object.entries(INC_TYPES).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}</select> },
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

/* ══════════════════════════════════════════════════════════════
   APP ROUTER
   ══════════════════════════════════════════════════════════════ */
export default function CommandCenterApp({ onBack }) {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, async firebaseUser => {
      if (!firebaseUser) {
        if (active) {
          setSession(null);
          setAuthLoading(false);
        }
        return;
      }
      try {
        await firebaseUser.reload();
        if (!firebaseUser.emailVerified) {
          await signOutUser();
          return;
        }
        const user = await loadAppUser(firebaseUser);
        if (active) setSession({ user, firebaseUser });
      } catch (error) {
        console.error("Firebase session could not be loaded", error);
        if (active) setSession(null);
      } finally {
        if (active) setAuthLoading(false);
      }
    }, error => {
      console.error("Firebase authentication state failed", error);
      if (active) {
        setSession(null);
        setAuthLoading(false);
      }
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  function handleLogin(authResult) {
    setSession(authResult);
  }

  async function handleLogout() {
    await signOutUser();
    setSession(null);
    if (onBack) onBack();
  }

  const user = session?.user;
  if (authLoading) return <div role="status" style={{padding:24,textAlign:"center"}}>Loading your secure session…</div>;
  if (!user) return <LoginPage onLogin={handleLogin} onBack={onBack} />;
  if (user.portal==="student") return <StudentPortal user={user} authUser={session.firebaseUser} onLogout={handleLogout} />;
  return <CommandCentre user={user} authUser={session.firebaseUser} onLogout={handleLogout} />;
}
