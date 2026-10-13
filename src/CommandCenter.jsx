import { useState, useRef, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  NAVY, NAVY2, NAVY3, NAVYL, RED, REDL, ORANGE, GREEN, GREENL,
  GOLD, WHITE, PAPER, BD, NK, SL, MID,
  LOGO,
  INC_TYPES, PRIORITY, STATUS_LABEL,
  MBOMBELA_BUILDINGS,
} from "./constants.js";
import CampusMap from "./components/CampusMap.jsx";
import { MAPPED_BUILDINGS } from "./maps/campusBuildings.js";
import { checkCampusLocation, getCurrentLocation } from "./maps/location.js";
import Signup from "./auth/Signup.jsx";
import { auth } from "./lib/firebase.js";
import { canAccessPortal } from "./auth/roles.js";
import { isRegistrationInProgress, loadAppUser, requestPasswordReset, signInUser, signOutUser } from "./auth/firebaseAuth.js";
import AdminPortal from "./pages/AdminPortal.jsx";
import ResponderPortal from "./pages/ResponderPortal.jsx";
import { STYLES } from "./pages/portalStyles.js";
import { createCheckin, createIncident, getCheckin, listIncidents } from "./incidentApi.js";


/* ══════════════════════════════════════════════════════════════
   LOGIN PAGE
   ══════════════════════════════════════════════════════════════ */
function LoginPage({ onLogin, onBack }) {
  const [portal, setPortal]       = useState(null);
  const [authView, setAuthView]   = useState("portal");
  // onBack goes back to the public landing site
  const [emailVal, setEmailVal]   = useState("");
  const [pwdVal, setPwdVal]       = useState("");
  const [showPwd, setShowPwd]     = useState(false);
  const [loginError, setLoginError] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [shake, setShake]         = useState(false);

  async function handleSubmit() {
    if (!/^[^\s@]+@ump\.ac\.za$/i.test(emailVal.trim()) || !pwdVal) {
      setLoginError("Enter your @ump.ac.za email address and password.");
      return;
    }
    setLoginError("");
    setLoading(true);
    try {
      const result = await signInUser(emailVal, pwdVal);
      const roles = result.user.roles || [result.user.portal];
      if (!canAccessPortal(roles, portal)) {
        const portalName = portal === "admin" ? "Admin" : portal === "responder" ? "Responder" : portal === "student" ? "Student" : "Staff";
        setLoginError(`This account is not assigned to the ${portalName} Portal. Ask an administrator to update your Firestore profile.`);
      } else {
        const selectedPortal = portal === "staff" && !roles.includes("staff") ? result.user.portal : portal;
        onLogin({
          ...result,
          user: { ...result.user, portal: selectedPortal, role: selectedPortal, access: selectedPortal },
        });
      }
    } catch (error) {
      setLoginError(error.message || "We could not sign you in. Check your details and verify your email address.");
      setShake(true);
      setTimeout(()=>setShake(false),600);
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordReset(event) {
    event.preventDefault();
    setResetMessage("");
    setResetSuccess(false);
    if (!/^[^\s@]+@ump\.ac\.za$/i.test(emailVal.trim())) {
      setResetMessage("Enter your university email address ending in @ump.ac.za.");
      return;
    }
    setLoading(true);
    try {
      await requestPasswordReset(emailVal);
      setResetSuccess(true);
      setResetMessage("If an account exists for that address, Firebase will send a password reset link. Check your inbox and spam folder.");
    } catch (error) {
      setResetMessage(error.message || "Could not request a password reset. Try again.");
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
        {authView === "register" ? <Signup onBack={()=>setAuthView("portal")}/> : authView === "reset" ? (
          <div style={{background:WHITE,borderRadius:16,overflow:"hidden",boxShadow:"0 24px 80px rgba(0,0,0,.45)"}}>
            <div style={{background:`linear-gradient(135deg,${NAVY},${NAVY2})`,padding:"22px 28px",borderBottom:`3px solid ${GOLD}`}}>
              <button type="button" onClick={()=>{setAuthView("portal");setResetMessage("");}} style={{background:"rgba(255,255,255,.08)",border:"1px solid rgba(255,255,255,.14)",color:"rgba(255,255,255,.7)",borderRadius:4,padding:"4px 10px",fontSize:11,cursor:"pointer",marginBottom:10}}>← Back to sign in</button>
              <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,.55)",letterSpacing:2,textTransform:"uppercase",marginBottom:5}}>Firebase account recovery</div>
              <div style={{fontSize:20,fontWeight:700,color:WHITE,fontFamily:"'IBM Plex Serif',serif"}}>Reset your password</div>
            </div>
            <form onSubmit={handlePasswordReset} style={{padding:"26px 28px"}}>
              <label style={{fontSize:11,fontWeight:700,color:MID,textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:15}}>UMP email address
                <input type="email" autoComplete="username" value={emailVal} onChange={event=>setEmailVal(event.target.value)} required pattern="[^\s@]+@ump\.ac\.za" title="Use an address ending in @ump.ac.za." placeholder="name@ump.ac.za" style={{display:"block",width:"100%",marginTop:7,padding:"11px 14px",border:`1.5px solid ${BD}`,borderRadius:7,fontSize:14,outline:"none",color:NK}}/>
              </label>
              {resetMessage&&<div role="status" style={{fontSize:12,color:resetSuccess?GREEN:RED,background:resetSuccess?`${GREEN}14`:REDL,borderRadius:6,padding:10,margin:"10px 0 14px"}}>{resetMessage}</div>}
              <button type="submit" disabled={loading} style={{width:"100%",padding:13,marginTop:13,background:NAVY,color:WHITE,border:0,borderRadius:7,fontSize:15,fontWeight:700,cursor:loading?"wait":"pointer"}}>{loading?"Sending…":"Send reset link"}</button>
            </form>
          </div>
        ) : !portal ? (
          <div style={{animation:"fadeIn .4s ease"}}>
            <div style={{background:"rgba(255,255,255,.06)",backdropFilter:"blur(12px)",borderRadius:16,border:"1px solid rgba(255,255,255,.12)",overflow:"hidden"}}>
              <div style={{padding:"22px 28px 14px",textAlign:"center",color:"rgba(255,255,255,.65)",fontSize:13}}>Select your access portal to continue</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,padding:"14px 24px 28px"}}>{[
                {key:"student",title:"Student Portal",sub:"Report incidents, check in, view safety status",icon:"🎓"},
                {key:"staff",title:"Staff Portal",sub:"Incident reporting for UMP staff",icon:"🛡️"},
                {key:"admin",title:"Admin Portal",sub:"Manage incidents, analytics, and responder dispatch",icon:"⚙️"},
                {key:"responder",title:"Responder Portal",sub:"View and respond to assigned incidents",icon:"🚑"},
              ].map(item=><button key={item.key} onClick={()=>setPortal(item.key)} style={{background:"rgba(255,255,255,.08)",border:"1.5px solid rgba(255,255,255,.14)",borderRadius:12,padding:"22px 16px",cursor:"pointer",textAlign:"center",color:WHITE}}><div style={{fontSize:32,marginBottom:10}}>{item.icon}</div><div style={{fontSize:14,fontWeight:700,marginBottom:5}}>{item.title}</div><div style={{fontSize:11.5,color:"rgba(255,255,255,.58)",lineHeight:1.5}}>{item.sub}</div></button>)}</div>
            </div>
            <div style={{textAlign:"center",marginTop:18}}><button onClick={()=>setAuthView("register")} style={{background:"none",border:"1px solid rgba(255,255,255,.28)",borderRadius:7,padding:"10px 18px",color:WHITE,fontWeight:600,cursor:"pointer"}}>Create student account</button>{onBack&&<div><button onClick={onBack} style={{marginTop:12,background:"none",border:0,color:"rgba(255,255,255,.6)",cursor:"pointer"}}>← Back to Landing</button></div>}</div>
          </div>
        ) : (
          <div style={{background:WHITE,borderRadius:16,overflow:"hidden",boxShadow:"0 24px 80px rgba(0,0,0,.45)",animation:shake?"shake .3s":"slideIn .35s ease"}}>
            <div style={{background:`linear-gradient(135deg,${NAVY},${NAVY2})`,padding:"22px 28px",borderBottom:`3px solid ${portal==="student"?GOLD:RED}`}}>
              <button onClick={()=>{setPortal(null);setEmailVal("");setPwdVal("");setLoginError("");}} style={{background:"rgba(255,255,255,.08)",border:"1px solid rgba(255,255,255,.14)",color:"rgba(255,255,255,.7)",borderRadius:4,padding:"4px 10px",fontSize:11,cursor:"pointer",marginBottom:10}}>← Change portal</button>
              <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,.55)",letterSpacing:2,textTransform:"uppercase",marginBottom:5}}>{portal==="student"?"Student Portal":portal==="admin"?"Admin Portal":portal==="responder"?"Responder Portal":"Staff Portal"}</div><div style={{fontSize:20,fontWeight:700,color:WHITE,fontFamily:"'IBM Plex Serif',serif"}}>Sign In</div>
            </div>
            <form onSubmit={event=>{event.preventDefault();handleSubmit();}} style={{padding:"26px 28px"}}>
              <label style={{fontSize:11,fontWeight:700,color:MID,textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:15}}>UMP email address<input type="email" autoComplete="username" value={emailVal} onChange={event=>setEmailVal(event.target.value)} required pattern="[^\s@]+@ump\.ac\.za" title="Use an address ending in @ump.ac.za." placeholder="name@ump.ac.za" style={{display:"block",width:"100%",marginTop:7,padding:"11px 14px",border:`1.5px solid ${BD}`,borderRadius:7,fontSize:14,outline:"none",color:NK}}/></label>
              <label style={{fontSize:11,fontWeight:700,color:MID,textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:6}}>Password<div style={{position:"relative",marginTop:7}}><input type={showPwd?"text":"password"} autoComplete="current-password" value={pwdVal} onChange={event=>setPwdVal(event.target.value)} required style={{width:"100%",padding:"11px 42px 11px 14px",border:`1.5px solid ${BD}`,borderRadius:7,fontSize:14,outline:"none",color:NK}}/><button type="button" onClick={()=>setShowPwd(value=>!value)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:0,cursor:"pointer"}}>{showPwd?"🙈":"👁"}</button></div></label>
              {loginError&&<div role="status" style={{fontSize:12,color:RED,background:REDL,borderRadius:6,padding:10,margin:"10px 0 14px"}}>{loginError}</div>}
              <button type="submit" disabled={loading} style={{width:"100%",padding:13,marginTop:13,background:portal==="student"?NAVY:RED,color:WHITE,border:0,borderRadius:7,fontSize:15,fontWeight:700,cursor:loading?"wait":"pointer"}}>{loading?"Signing in…":"Sign in"}</button>
              <button type="button" onClick={()=>{setResetMessage("");setAuthView("reset");}} style={{display:"block",margin:"15px auto 0",padding:4,border:0,background:"none",color:NAVY,fontSize:12,fontWeight:700,cursor:"pointer"}}>Forgot password?</button>
              <button type="button" onClick={()=>setAuthView("register")} style={{display:"block",margin:"8px auto 0",padding:4,border:0,background:"none",color:NAVY,fontSize:12,fontWeight:700,cursor:"pointer"}}>Create student account</button>
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
          {user.portal === "staff" ? "Staff Portal" : "Student Portal"}
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
export default function CommandCenterApp({ onBack }) {
  const [session, setSession] = useState(null);
  const [activePortal, setActivePortal] = useState("");
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, async firebaseUser => {
      if (isRegistrationInProgress()) {
        if (active) setAuthLoading(false);
        return;
      }
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
        if (active) {
          setSession({ user, firebaseUser });
          setActivePortal(user.portal);
        }
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
    setActivePortal(authResult.user.portal);
  }

  async function handleLogout() {
    await signOutUser();
    setSession(null);
    if (onBack) onBack();
  }

  const user = session?.user;
  if (authLoading) return <div role="status" style={{padding:24,textAlign:"center"}}>Loading your secure session…</div>;
  if (!user) return <LoginPage onLogin={handleLogin} onBack={onBack} />;
  const availablePortals = user.roles || [user.portal];
  const selectedPortal = availablePortals.includes(activePortal) ? activePortal : user.portal;
  const activeUser = { ...user, role: selectedPortal, access: selectedPortal, portal: selectedPortal };
  return (
    <>
      {availablePortals.length > 1 && (
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"10px 16px",background:WHITE,borderBottom:`1px solid ${BD}`,fontFamily:"'IBM Plex Sans',sans-serif"}}>
          <span style={{fontSize:12,color:MID,fontWeight:600}}>Switch portal:</span>
          {availablePortals.map(portal => (
            <button
              key={portal}
              type="button"
              aria-pressed={selectedPortal === portal}
              onClick={() => setActivePortal(portal)}
              style={{padding:"7px 12px",border:`1px solid ${selectedPortal === portal ? NAVY : BD}`,borderRadius:6,background:selectedPortal === portal ? NAVY : WHITE,color:selectedPortal === portal ? WHITE : NAVY,fontWeight:700,cursor:"pointer"}}
            >
              {portal === "admin" ? "Admin" : portal === "responder" ? "Responder" : portal === "staff" ? "Staff" : "Student"}
            </button>
          ))}
        </div>
      )}
      {selectedPortal === "admin" && <AdminPortal user={activeUser} authUser={activeUser} onLogout={handleLogout} />}
      {selectedPortal === "responder" && <ResponderPortal user={activeUser} authUser={activeUser} onLogout={handleLogout} />}
      {!["admin", "responder"].includes(selectedPortal) && <StudentPortal user={activeUser} authUser={activeUser} onLogout={handleLogout} />}
    </>
  );
}
