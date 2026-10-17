import { useState } from "react";
import { BD, GREEN, MID, NAVY, RED, REDL, SL, WHITE } from "../constants.js";
import { registerUser, validateNewPassword } from "./firebaseAuth.js";

const ROLE_COPY = {
  student: {
    title: "Create a student account",
    button: "Create student account",
    description: "Use your 9-digit UMP student number followed by @ump.ac.za (19 characters total). Verify your email before signing in.",
  },
  staff: {
    title: "Create a staff account",
    button: "Create staff account",
    description: "Use your official @ump.ac.za staff email and verify it before signing in. Staff accounts do not require administrator approval.",
  },
  responder: {
    title: "Request responder access",
    button: "Request responder access",
    description: "Use your official @ump.ac.za email and verify it before signing in. A CEIS administrator must approve responder access.",
  },
  admin: {
    title: "Request admin access",
    button: "Request admin access",
    description: "Use your official @ump.ac.za email and verify it before signing in. Admin access is denied until an existing CEIS administrator approves your request. If approved, an administrator will email you with the verification steps needed to activate access.",
  },
};

export default function Signup({ onBack, role = "student" }) {
  const accountRole = ROLE_COPY[role] ? role : "student";
  const copy = ROLE_COPY[accountRole];
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setSuccess(false);
    const passwordError = validateNewPassword(password);
    if (passwordError) { setMessage(passwordError); return; }
    if (password !== confirm) { setMessage("The passwords do not match."); return; }
    setLoading(true);
    try {
      const { verificationEmail } = await registerUser({
        fullName,
        email,
        password,
        requestedRole: accountRole === "student" ? null : accountRole,
        onProgress: setMessage,
      });
      setPassword("");
      setConfirm("");
      setSuccess(true);
      setMessage("Your account is created. A verification email is being sent; verify your address, then sign in.");
      verificationEmail.then(error => {
        if (error) {
          setSuccess(false);
          setMessage(`Your account was created, but the verification email could not be requested: ${error.message} Sign in to request another verification email.`);
          return;
        }
        setMessage(accountRole === "student" || accountRole === "staff"
          ? `Your ${accountRole} account is created. Verify your @ump.ac.za email, then sign in to the ${accountRole} portal.`
          : `Your ${accountRole} account request is created. Verify your @ump.ac.za email and sign in to submit it for administrator review. ${accountRole === "admin" ? "Admin access remains denied until an existing administrator approves it; if approved, an administrator will email you with the verification steps needed to activate access." : "Responder access remains unavailable until an administrator approves your request."}`);
      });
    } catch (error) {
      setMessage(error.message || "Could not connect to the authentication service.");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = { display:"block",width:"100%",marginTop:6,padding:"11px 13px",border:`1.5px solid ${BD}`,borderRadius:7,fontSize:14,color:"#1F2937",outline:"none" };
  const labelStyle = { display:"block",fontSize:11,fontWeight:700,color:MID,textTransform:"uppercase",letterSpacing:.7,marginBottom:13 };
  return (
    <div style={{background:WHITE,borderRadius:16,maxHeight:"calc(100vh - 24px)",overflowY:"auto",overflowX:"hidden",boxShadow:"0 24px 80px rgba(0,0,0,.4)"}}>
      <div style={{background:NAVY,padding:"22px 28px",borderBottom:"3px solid #D4960E"}}>
        <button type="button" onClick={onBack} style={{background:"none",border:0,color:"rgba(255,255,255,.7)",cursor:"pointer",marginBottom:8}}>← Back to sign in</button>
        <h2 style={{fontFamily:"'IBM Plex Serif',serif",fontSize:21,color:WHITE}}>{copy.title}</h2>
        <p style={{fontSize:12,color:"rgba(255,255,255,.68)",marginTop:5}}>{copy.description}</p>
      </div>
      <form onSubmit={handleSubmit} style={{padding:"23px 28px"}}>
        <label style={labelStyle}>Full name<input value={fullName} onChange={e=>setFullName(e.target.value)} autoComplete="name" minLength={2} maxLength={100} required style={inputStyle}/></label>
        <label style={labelStyle}>UMP email address<input value={email} onChange={e=>setEmail(e.target.value.toLowerCase())} type="email" placeholder={accountRole === "student" ? "230021646@ump.ac.za" : "name@ump.ac.za"} autoComplete="email" required minLength={accountRole === "student" ? 19 : undefined} maxLength={accountRole === "student" ? 19 : 254} pattern={accountRole === "student" ? "[0-9]{9}@ump\\.ac\\.za" : "[^\\s@]+@ump\\.ac\\.za"} title={accountRole === "student" ? "Enter your 9-digit UMP student number followed by @ump.ac.za (19 characters total)." : "Enter a valid email address ending in @ump.ac.za."} style={inputStyle}/>{accountRole === "student"&&<span style={{display:"block",fontSize:11,fontWeight:400,textTransform:"none",letterSpacing:0,color:SL,marginTop:5}}>Exactly 19 characters: 9 digits followed by @ump.ac.za.</span>}</label>
        <label style={labelStyle}>Password<input value={password} onChange={e=>setPassword(e.target.value)} type="password" autoComplete="new-password" minLength={12} maxLength={128} required style={inputStyle}/><span style={{display:"block",fontSize:11,fontWeight:400,textTransform:"none",letterSpacing:0,color:SL,marginTop:5}}>12–128 characters; include uppercase, lowercase, a number, and a symbol.</span></label>
        <label style={labelStyle}>Confirm password<input value={confirm} onChange={e=>setConfirm(e.target.value)} type="password" autoComplete="new-password" minLength={12} maxLength={128} required style={inputStyle}/></label>
        {message&&<p role="status" style={{background:loading?`${NAVY}0D`:success?`${GREEN}14`:REDL,color:loading?NAVY:success?GREEN:RED,padding:11,borderRadius:7,fontSize:12.5,lineHeight:1.55,marginBottom:14}}>{message}</p>}
        <button type="submit" disabled={loading} style={{position:"sticky",bottom:0,zIndex:2,width:"100%",padding:13,marginTop:14,background:NAVY,color:WHITE,border:0,borderRadius:7,fontSize:14,fontWeight:700,cursor:loading?"wait":"pointer",opacity:loading ? .75 : 1,boxShadow:"0 -8px 16px rgba(255,255,255,.92)"}}>{loading?(message||"Creating account…"):copy.button}</button>
      </form>
    </div>
  );
}
