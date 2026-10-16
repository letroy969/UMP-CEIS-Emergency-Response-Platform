import { useState, useRef, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  Ambulance,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  CircleUserRound,
  Eye,
  EyeOff,
  FileText,
  GraduationCap,
  Hospital,
  Home,
  LifeBuoy,
  Map,
  Radio,
  Settings,
  Shield,
  ShieldCheck,
  Siren,
  TriangleAlert,
} from "lucide-react";
import {
  NAVY, NAVY2, NAVY3, NAVYL, RED, REDL, ORANGE, GREEN, GREENL,
  GOLD, WHITE, BD, NK, SL, MID,
  LOGO,
  INC_TYPES, PRIORITY, STATUS_LABEL,
  MBOMBELA_BUILDINGS,
} from "./constants.js";
import CampusMap from "./components/CampusMap.jsx";
import IncidentEvidenceCapture from "./components/IncidentEvidenceCapture.jsx";
import { MAPPED_BUILDINGS } from "./maps/campusBuildings.js";
import { checkCampusLocation, getCurrentLocation } from "./maps/location.js";
import Signup from "./auth/Signup.jsx";
import SOSActivation from "./components/SOSActivation.jsx";
import PushNotificationsButton from "./components/PushNotificationsButton.jsx";
import { auth } from "./lib/firebase.js";
import { canAccessPortal } from "./auth/roles.js";
import { isRegistrationInProgress, isValidEmail, loadAppUser, requestPasswordReset, signInUser, signOutUser } from "./auth/firebaseAuth.js";
import AdminPortal from "./pages/AdminPortal.jsx";
import ResponderPortal from "./pages/ResponderPortal.jsx";
import StudentProfile from "./pages/StudentProfile.jsx";
import { STYLES } from "./pages/portalStyles.js";
import { createCheckin, createIncident, getCheckin, listIncidents, uploadIncidentAttachment } from "./incidentApi.js";

const STUDENT_PORTAL_BACKGROUND = new URL(
  "../Home page  src/UMP-Great-Hall-IMG-Western-Lobby-03.webp",
  import.meta.url,
).href;

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
    if (!isValidEmail(emailVal) || !pwdVal) {
      setLoginError("Enter a valid email address and password.");
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
    if (!isValidEmail(emailVal)) {
      setResetMessage("Enter a valid email address.");
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
              <label style={{fontSize:11,fontWeight:700,color:MID,textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:15}}>Email address
                <input type="email" autoComplete="username" value={emailVal} onChange={event=>setEmailVal(event.target.value)} required placeholder="name@example.com" style={{display:"block",width:"100%",marginTop:7,padding:"11px 14px",border:`1.5px solid ${BD}`,borderRadius:7,fontSize:14,outline:"none",color:NK}}/>
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
                {key:"student",title:"Student Portal",sub:"Report incidents, check in, view safety status",Icon:GraduationCap},
                {key:"staff",title:"Staff Portal",sub:"Incident reporting for UMP staff",Icon:Shield},
                {key:"admin",title:"Admin Portal",sub:"Manage incidents, analytics, and responder dispatch",Icon:Settings},
                {key:"responder",title:"Responder Portal",sub:"View and respond to assigned incidents",Icon:Ambulance},
              ].map(({key,title,sub,Icon})=><button key={key} onClick={()=>setPortal(key)} className="ceis-icon-action" style={{background:"rgba(255,255,255,.08)",border:"1.5px solid rgba(255,255,255,.14)",borderRadius:12,padding:"22px 16px",cursor:"pointer",textAlign:"center",color:WHITE}}><Icon size={30} strokeWidth={1.7} aria-hidden="true" style={{marginBottom:10}}/><div style={{fontSize:14,fontWeight:700,marginBottom:5}}>{title}</div><div style={{fontSize:11.5,color:"rgba(255,255,255,.58)",lineHeight:1.5}}>{sub}</div></button>)}</div>
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
              <label style={{fontSize:11,fontWeight:700,color:MID,textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:15}}>Email address<input type="email" autoComplete="username" value={emailVal} onChange={event=>setEmailVal(event.target.value)} required placeholder="name@example.com" style={{display:"block",width:"100%",marginTop:7,padding:"11px 14px",border:`1.5px solid ${BD}`,borderRadius:7,fontSize:14,outline:"none",color:NK}}/></label>
              <label style={{fontSize:11,fontWeight:700,color:MID,textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:6}}>Password<div style={{position:"relative",marginTop:7}}><input type={showPwd?"text":"password"} autoComplete="current-password" value={pwdVal} onChange={event=>setPwdVal(event.target.value)} required style={{width:"100%",padding:"11px 42px 11px 14px",border:`1.5px solid ${BD}`,borderRadius:7,fontSize:14,outline:"none",color:NK}}/><button type="button" aria-label={showPwd?"Hide password":"Show password"} aria-pressed={showPwd} onClick={()=>setShowPwd(value=>!value)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:0,cursor:"pointer",color:MID,padding:4}}>{showPwd?<EyeOff size={18} aria-hidden="true"/>:<Eye size={18} aria-hidden="true"/>}</button></div></label>
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
function StudentPortal({ user, authUser, onLogout, onProfileUpdated, onOpenMedicalTriage }) {
  const [view, setView]         = useState("home");
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [profileHasUnsavedChanges, setProfileHasUnsavedChanges] = useState(false);
  const [incidents, setIncidents] = useState([]);
  const [form, setForm]         = useState({ type:"medical", building:"", desc:"", priority:"P3" });
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [reportLocation, setReportLocation] = useState(null);
  const [submittedReport, setSubmittedReport] = useState(null);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [evidenceProgress, setEvidenceProgress] = useState(null);
  const [evidenceUploadError, setEvidenceUploadError] = useState("");
  const [isRecordingEvidence, setIsRecordingEvidence] = useState(false);
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
      setForm(current => ({ ...current, building: "" }));
      setLocationState(`Device location captured (±${Math.round(location.accuracyMeters)} m). This GPS location will be used; building selection is skipped.`);
    } catch (error) {
      setLocationState(error.message || "Location is unavailable. You can choose a building or pin the location on the map.");
    } finally {
      setLocating(false);
    }
  }

  async function submitReport() {
    if (submittingReport.current || isRecordingEvidence || (!reportLocation && !form.building) || locating) return;
    submittingReport.current = true;
    setIsSubmittingReport(true);
    setDataError("");
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
        type:form.type, priority:form.priority,
        building:reportLocation ? "" : form.building,
        buildingName:reportLocation ? (mappedBuilding?.name || null) : MBOMBELA_BUILDINGS.find(building => building.id === form.building)?.name,
        desc:form.desc,
        lat:location?.latitude ?? null, lng:location?.longitude ?? null,
        accuracy:location?.accuracyMeters ?? null, locationCapturedAt:location?.capturedAt ?? null,
        locationSource:location?.source ?? null,
        campusVerified:campusCheck === "inside" ? true : campusCheck === "outside" ? false : null,
      });
    } catch (error) {
      setDataError(error.message);
      submittingReport.current = false;
      setIsSubmittingReport(false);
      return;
    }

    const uploadedAttachments = [];
    let uploadError = "";
    for (const [index, file] of evidenceFiles.entries()) {
      setEvidenceProgress({ index: index + 1, total: evidenceFiles.length, percent: 0 });
      try {
        const attachment = await uploadIncidentAttachment(authUser, newInc.id, file, percent => {
          setEvidenceProgress({ index: index + 1, total: evidenceFiles.length, percent: Math.round(percent * 100) });
        });
        uploadedAttachments.push(attachment);
      } catch (error) {
        uploadError = `${error.message} Your incident was saved as ${newInc.reference}.`;
        break;
      }
    }
    newInc = { ...newInc, attachments: uploadedAttachments };
    setIncidents(current => [newInc, ...current]);
    setMyReports(current => [newInc, ...current]);
    setEvidenceUploadError(uploadError);
    setEvidenceProgress(null);
    setSubmittedReport({ type: form.type, reference: newInc.reference });
    submittingReport.current = false;
    setIsSubmittingReport(false);
  }

  function resetIncidentForm() {
    setSubmittedReport(null);
    setForm({ type:"medical", building:"", desc:"", priority:"P3" });
    setEvidenceFiles([]);
    setReportLocation(null);
    setLocationState("");
    setEvidenceUploadError("");
    setEvidenceProgress(null);
    setIsRecordingEvidence(false);
    setView("home");
  }

  const NAVITEMS = [
    ["home",Home,"Home"],["report",Siren,"Report"],["map",Map,"Campus Map"],["checkin",ShieldCheck,"Safe Check"],["my",ClipboardList,"My Reports"],["profile",CircleUserRound,"My Profile"]
  ];
  function navigateToView(nextView) {
    if (nextView === view) return;
    if (view === "profile" && profileHasUnsavedChanges
      && !window.confirm("You have unsaved profile changes. Leave without saving?")) return;
    setView(nextView);
    if (nextView === "report") void captureReportLocation();
    setAccountMenuOpen(false);
  }

  return (
    <div className="student-portal-shell" style={{minHeight:"100vh",background:"transparent",fontFamily:"'IBM Plex Sans',sans-serif"}}>
      <style>{STYLES}</style>
      <div className="student-portal-background" aria-hidden="true">
        <img src={STUDENT_PORTAL_BACKGROUND} alt="" />
        <div />
      </div>
      {/* Header */}
<div style={{background:NAVY,borderBottom:`3px solid ${GOLD}`,position:"sticky",top:0,zIndex:100}}>
  <div style={{maxWidth:1100,margin:"0 auto",padding:"0 5%",height:60,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
    
    <div style={{display:"flex",alignItems:"center",gap:12}}>
      <img src={LOGO} alt="UMP" style={{height:36,objectFit:"contain",mixBlendMode:"lighten"}}/>
      
      <button type="button" onClick={()=>navigateToView("profile")} aria-label={`Open profile for ${user.name}`} style={{border:0,background:"transparent",padding:0,textAlign:"left",cursor:"pointer"}}>
        <div style={{fontSize:9,fontWeight:700,color:"rgba(255,255,255,0.5)",letterSpacing:1.8,textTransform:"uppercase"}}>
          {user.portal === "staff" ? "Staff Portal" : "Student Portal"}
        </div>
        <div style={{fontSize:14,fontWeight:700,color:WHITE,fontFamily:"'IBM Plex Serif',serif"}}>
          {user.name}
        </div>
      </button>
    </div>

    <div style={{display:"flex",gap:8,alignItems:"center"}}>
      <div style={{position:"relative"}}>
        <button type="button" aria-label="Open account menu" aria-expanded={accountMenuOpen} onClick={()=>setAccountMenuOpen(open=>!open)} style={{display:"flex",alignItems:"center",gap:5,background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.14)",color:"rgba(255,255,255,0.8)",borderRadius:5,padding:"6px 9px",cursor:"pointer"}}>
          <CircleUserRound size={17} aria-hidden="true"/><ChevronDown size={14} aria-hidden="true"/>
        </button>
        {accountMenuOpen&&<div role="menu" style={{position:"absolute",right:0,top:"calc(100% + 8px)",minWidth:180,background:WHITE,border:`1px solid ${BD}`,borderRadius:7,boxShadow:"0 8px 24px rgba(0,0,0,.18)",padding:5,zIndex:120}}>
          <button type="button" role="menuitem" onClick={()=>navigateToView("profile")} style={{width:"100%",textAlign:"left",padding:"9px 10px",border:0,borderRadius:5,background:WHITE,color:NK,fontWeight:600,cursor:"pointer"}}>My Profile</button>
          <button type="button" role="menuitem" onClick={()=>{if(view!=="profile"||!profileHasUnsavedChanges||window.confirm("You have unsaved profile changes. Sign out without saving?"))onLogout();}} style={{width:"100%",textAlign:"left",padding:"9px 10px",border:0,borderRadius:5,background:WHITE,color:RED,fontWeight:600,cursor:"pointer"}}>Sign Out</button>
        </div>}
      </div>
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
          <span style={{display:"inline-flex",alignItems:"center",gap:5}}>{safeStatus==="safe" ? <><CheckCircle2 size={14} aria-hidden="true"/>Safe</> : <><TriangleAlert size={14} aria-hidden="true"/>Needs Help</>}</span>
        </div>
      )}

      <PushNotificationsButton user={authUser} compact />
      <button
        onClick={()=>{if(view!=="profile"||!profileHasUnsavedChanges||window.confirm("You have unsaved profile changes. Sign out without saving?"))onLogout();}}
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
          {NAVITEMS.map(([k,Icon,lbl])=>(
            <button key={k} onClick={()=>navigateToView(k)} aria-current={view===k?"page":undefined} className="ceis-icon-action" style={{padding:"12px 20px",background:"none",border:"none",borderBottom:`2px solid ${view===k?GOLD:"transparent"}`,color:view===k?NAVY:MID,fontSize:13,fontWeight:view===k?700:500,cursor:"pointer",display:"flex",alignItems:"center",gap:6,transition:"all .2s",marginBottom:-1}}>
              <Icon size={17} strokeWidth={1.8} aria-hidden="true"/>{lbl}
            </button>
          ))}
        </div>
      </div>

      <div style={{maxWidth:1100,margin:"0 auto",padding:"28px 5% 60px"}}>
        {view==="profile"&&<StudentProfile user={user} authUser={authUser} onLogout={onLogout} onBack={()=>{setProfileHasUnsavedChanges(false);setView("home");}} onUserUpdated={profile=>onProfileUpdated(profile)} onUnsavedChangesChange={setProfileHasUnsavedChanges}/>}
        {/* HOME */}
        {view==="home"&&(
          <div style={{animation:"fadeIn .35s ease"}}>
            <SOSActivation user={authUser} />
            <h2 style={{fontFamily:"'IBM Plex Serif',serif",fontSize:26,fontWeight:700,color:NK,marginBottom:6}}>Welcome back, {user.name.split(" ")[0]}</h2>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:28}}>
              {[
                { title:"Report Emergency",  sub:"Fire, medical, security threats",  Icon:Siren, color:RED,   action:()=>navigateToView("report") },
                { title:"Safety Check-In",   sub:"Mark yourself as safe or in need", Icon:ShieldCheck, color:GREEN, action:()=>setView("checkin") },
                { title:"Active Incidents",  sub:`${incidents.filter(i=>!["RESOLVED","CLOSED"].includes(i.status)).length} incidents on campus`, Icon:Radio, color:ORANGE, action:()=>setView("map") },
              ].map((c,i)=>(
                <button key={i} onClick={c.action} className="ceis-icon-action" style={{background:WHITE,border:`1.5px solid ${BD}`,borderRadius:10,padding:"20px",textAlign:"left",cursor:"pointer",transition:"all .2s",borderTop:`3px solid ${c.color}`}}>
                  <c.Icon size={28} strokeWidth={1.7} color={c.color} aria-hidden="true" style={{marginBottom:10}}/>
                  <div style={{fontSize:14,fontWeight:700,color:NK,fontFamily:"'IBM Plex Serif',serif",marginBottom:4}}>{c.title}</div>
                  <div style={{fontSize:12.5,color:SL}}>{c.sub}</div>
                </button>
              ))}
            </div>
            {/* Emergency contacts */}
            <div style={{background:NAVY,borderRadius:10,padding:"18px 22px",marginBottom:20}}>
              <div style={{fontSize:10.5,fontWeight:700,color:"rgba(255,255,255,0.5)",letterSpacing:1.8,textTransform:"uppercase",marginBottom:12}}>Emergency Contacts</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
                {[
                  {Icon:Ambulance,label:"Medical Emergency",number:"10177",href:"tel:10177"},
                  {Icon:Shield,label:"Campus Security",number:"013 002 0010",href:"tel:0130020010"},
                  {Icon:Hospital,label:"Campus Clinic",number:"013 002 0200",href:"tel:0130020200"},
                ].map(({Icon,label,number,href})=>(
                  <a key={number} href={href} className="ceis-icon-action" style={{display:"block",background:"rgba(255,255,255,0.08)",borderRadius:7,padding:"12px 14px",color:WHITE,textDecoration:"none"}} aria-label={`Call ${label}, ${number}`}>
                    <Icon size={20} strokeWidth={1.8} aria-hidden="true" style={{marginBottom:5}}/>
                    <div style={{fontSize:11,color:"rgba(255,255,255,0.65)"}}>{label}</div>
                    <div style={{fontSize:15,fontWeight:800,color:WHITE,fontFamily:"'IBM Plex Mono',monospace"}}>{number}</div>
                  </a>
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
            {submittedReport?(
              <div style={{background:GREENL,border:`1.5px solid ${GREEN}`,borderRadius:10,padding:"24px",textAlign:"center",animation:"fadeIn .4s ease"}}>
                <CheckCircle2 size={40} strokeWidth={1.7} color={GREEN} aria-hidden="true" style={{marginBottom:12}}/>
                <h3 style={{fontFamily:"'IBM Plex Serif',serif",fontSize:20,color:GREEN,marginBottom:8}}>Report saved</h3>
                <p style={{fontSize:14,color:SL}}>Reference: <strong>{submittedReport.reference}</strong>. Your report is available to authorized campus staff. No responder was notified automatically.</p>
                {evidenceProgress&&<p role="status" style={{fontSize:13,color:SL}}>Uploading evidence {evidenceProgress.index} of {evidenceProgress.total} · {evidenceProgress.percent}%</p>}
                {evidenceUploadError&&<p role="alert" style={{fontSize:13,color:RED,background:WHITE,padding:10,borderRadius:6}}>{evidenceUploadError}</p>}
                {submittedReport.type==="medical"&&(
                  <div style={{margin:"16px auto",maxWidth:440,background:WHITE,border:`1px solid ${BD}`,borderRadius:8,padding:14}}>
                    <p style={{fontSize:13,color:NK,lineHeight:1.6,margin:"0 0 10px"}}>Would guided medical triage help? It provides informational guidance only and does not diagnose or contact emergency services. Call 10177 for urgent medical help.</p>
                    <button type="button" onClick={onOpenMedicalTriage} style={{minHeight:42,padding:"10px 14px",background:NAVY,color:WHITE,border:0,borderRadius:6,fontSize:13,fontWeight:700,cursor:"pointer"}}>Open medical triage</button>
                  </div>
                )}
                <button type="button" onClick={resetIncidentForm} style={{minHeight:42,padding:"10px 14px",background:WHITE,color:NAVY,border:`1px solid ${BD}`,borderRadius:6,fontSize:13,fontWeight:600,cursor:"pointer"}}>Return to portal</button>
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
                          <v.icon size={21} strokeWidth={1.8} color={v.color} aria-hidden="true" style={{marginBottom:4}}/>
                          <div style={{fontSize:11,fontWeight:600,color:form.type===k?v.color:SL}}>{v.label}</div>
                        </button>
                      ))}
                    </div>
                  )},
                  { label:"Incident location", content:(
                    <div>
                      <button type="button" onClick={captureReportLocation} disabled={locating} style={{minHeight:42,padding:"9px 13px",marginBottom:8,background:WHITE,border:`1px solid ${BD}`,borderRadius:6,color:NAVY,fontSize:12.5,fontWeight:600,cursor:locating?"wait":"pointer"}}>{locating?"Getting location…":reportLocation?"Refresh device location":"Retry device location"}</button>
                      {locationState&&<p role="status" style={{fontSize:12,color:SL,lineHeight:1.5,margin:"0 0 9px"}}>{locationState}</p>}
                      {reportLocation
                        ? <p style={{fontSize:12,color:GREEN,margin:"0 0 10px"}}>GPS/map coordinates will be submitted. Campus building selection is not required.</p>
                        : locating
                          ? <p role="status" style={{fontSize:12,color:SL,margin:"0 0 10px"}}>Trying to capture your current device location…</p>
                          : <label style={{display:"block",fontSize:12,fontWeight:600,color:NK,marginBottom:10}}>If device location is unavailable, choose a campus building
                              <select value={form.building} onChange={e=>setForm(f=>({...f,building:e.target.value}))} style={{display:"block",width:"100%",marginTop:7,padding:"11px 14px",border:`1.5px solid ${BD}`,borderRadius:7,fontSize:14,color:NK,outline:"none",background:WHITE}}>
                                <option value="">Select campus building…</option>
                                {MBOMBELA_BUILDINGS.map(building=><option key={building.id} value={building.id}>Building {building.id} — {building.name}</option>)}
                              </select>
                            </label>}
                      <CampusMap
                      compact
                      incidents={[]}
                      selectedBuilding={form.building}
                      location={reportLocation}
                      onLocationChange={location=>{
                        setReportLocation(location);
                        if(location?.source!=="mapped-building")setForm(current=>({...current,building:""}));
                      }}
                      onBuildingClick={building=>{
                        const mapped=MAPPED_BUILDINGS.find(item=>item.id===building.id);
                        setForm(current=>({...current,building:building.id}));
                        if(mapped)setReportLocation({latitude:mapped.lat,longitude:mapped.lng,accuracyMeters:null,capturedAt:new Date().toISOString(),source:"mapped-building"});
                      }}
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
                  { label:"Description (optional)", content:(
                    <div>
                      <textarea value={form.desc} maxLength={4000} onChange={e=>setForm(f=>({...f,desc:e.target.value}))} placeholder="Add details that could help responders, such as what is happening or any immediate hazards…" style={{width:"100%",minHeight:100,padding:"11px 14px",border:`1.5px solid ${BD}`,borderRadius:7,fontSize:14,color:NK,resize:"vertical",outline:"none",lineHeight:1.65}}/>
                      <div style={{fontSize:11,color:MID,textAlign:"right",marginTop:3}}>{form.desc.length}/4000</div>
                    </div>
                  )},
                ].map((field,i)=>(
                  <div key={i} style={{marginBottom:20}}>
                    <label style={{fontSize:11,fontWeight:700,color:MID,textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:8}}>{field.label}</label>
                    {field.content}
                  </div>
                ))}
                <div style={{marginBottom:20}}>
                  <label style={{fontSize:11,fontWeight:700,color:MID,textTransform:"uppercase",letterSpacing:1,display:"block",marginBottom:8}}>Attachments (optional)</label>
                  <IncidentEvidenceCapture files={evidenceFiles} onFilesChange={setEvidenceFiles} disabled={isSubmittingReport} onRecordingChange={setIsRecordingEvidence}/>
                </div>
                {evidenceProgress&&<p role="status" style={{fontSize:12,color:SL,margin:"0 0 10px"}}>Uploading evidence {evidenceProgress.index} of {evidenceProgress.total} · {evidenceProgress.percent}%</p>}
                <button onClick={submitReport} disabled={(!reportLocation&&!form.building)||locating||isSubmittingReport||isRecordingEvidence} style={{width:"100%",padding:"13px",background:(!reportLocation&&!form.building)||locating||isSubmittingReport||isRecordingEvidence?BD:RED,color:WHITE,border:"none",borderRadius:7,fontSize:15,fontWeight:700,cursor:(!reportLocation&&!form.building)||locating||isSubmittingReport||isRecordingEvidence?"not-allowed":"pointer"}}>
                  <Siren size={18} strokeWidth={1.8} aria-hidden="true"/> {isSubmittingReport?"Saving report…":isRecordingEvidence?"Stop recording to submit":"Submit Incident Report"}
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
                          <div style={{fontSize:12,color:NK,marginTop:4}}>{inc.desc||"No additional description supplied."}</div>
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
                      {(() => { const Icon=INC_TYPES[inc.type]?.icon || FileText; return <Icon size={17} strokeWidth={1.8} color={INC_TYPES[inc.type]?.color || MID} aria-hidden="true"/>; })()}
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
                  {safeStatus==="safe"?<CheckCircle2 size={32} color={GREEN} aria-hidden="true" style={{marginBottom:8}}/>:<LifeBuoy size={32} color={RED} aria-hidden="true" style={{marginBottom:8}}/>}
                  <div style={{fontSize:16,fontWeight:700,color:safeStatus==="safe"?GREEN:RED,fontFamily:"'IBM Plex Serif',serif"}}>
                    {safeStatus==="safe"?"You are marked as SAFE":"ASSISTANCE REQUEST SAVED — Call Security for immediate help"}
                  </div>
                  <div style={{fontSize:12,color:SL,marginTop:6}}>Last updated: {new Date().toLocaleTimeString("en-ZA")}</div>
                </div>
              )}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <button onClick={async()=>{try{await createCheckin(authUser,{status:"safe"});setSafeStatus("safe");setDataError("");}catch(error){setDataError(error.message);}}} style={{padding:"22px",background:safeStatus==="safe"?GREENL:WHITE,border:`2px solid ${safeStatus==="safe"?GREEN:BD}`,borderRadius:10,cursor:"pointer",textAlign:"center",transition:"all .2s"}}>
                  <CheckCircle2 size={36} color={GREEN} aria-hidden="true" style={{marginBottom:8}}/>
                  <div style={{fontSize:15,fontWeight:700,color:GREEN}}>I am SAFE</div>
                  <div style={{fontSize:12,color:SL,marginTop:4}}>I am in a safe location</div>
                </button>
                <button onClick={async()=>{try{await createCheckin(authUser,{status:"help"});setSafeStatus("help");setDataError("");}catch(error){setDataError(error.message);}}} style={{padding:"22px",background:safeStatus==="help"?REDL:WHITE,border:`2px solid ${safeStatus==="help"?RED:BD}`,borderRadius:10,cursor:"pointer",textAlign:"center",transition:"all .2s"}}>
                  <LifeBuoy size={36} color={RED} aria-hidden="true" style={{marginBottom:8}}/>
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
                  <div style={{display:"flex",gap:10,alignItems:"center"}}>{(() => { const Icon=INC_TYPES[inc.type]?.icon || FileText; return <Icon size={22} strokeWidth={1.8} color={INC_TYPES[inc.type]?.color || MID} aria-hidden="true"/>; })()}<div><div style={{fontSize:13,fontWeight:700,color:NK}}>{inc.loc}</div><div style={{fontSize:12,color:MID}}>{inc.id} · {inc.time}</div></div></div>
                  <span style={{padding:"3px 10px",background:`${PRIORITY[inc.priority].color}14`,color:PRIORITY[inc.priority].color,borderRadius:3,fontSize:11,fontWeight:700}}>{inc.priority} — {PRIORITY[inc.priority].label}</span>
                </div>
                <div style={{fontSize:13,color:SL,marginBottom:6}}>{inc.desc||"No additional description supplied."}</div>
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
export default function CommandCenterApp({ onBack, onOpenMedicalTriage }) {
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

  function handleProfileUpdated(profile) {
    setSession(current => current ? { ...current, user: { ...current.user, ...profile } } : current);
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
      {!["admin", "responder"].includes(selectedPortal) && <StudentPortal user={activeUser} authUser={activeUser} onLogout={handleLogout} onProfileUpdated={handleProfileUpdated} onOpenMedicalTriage={onOpenMedicalTriage} />}
    </>
  );
}
