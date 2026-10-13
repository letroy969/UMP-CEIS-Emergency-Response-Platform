import { useState } from "react";
import { BD, GREEN, MID, NAVY, RED, REDL, SL, WHITE } from "../constants.js";
import { registerUser } from "./firebaseAuth.js";

export default function Signup({ onBack }) {
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
    if (password !== confirm) { setMessage("The passwords do not match."); return; }
    setLoading(true);
    try {
      await registerUser({ fullName, email, password });
      setPassword("");
      setConfirm("");
      setSuccess(true);
      setMessage("A Firebase verification email has been sent. Verify your address before signing in, and check your spam folder.");
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
        <h2 style={{fontFamily:"'IBM Plex Serif',serif",fontSize:21,color:WHITE}}>Create a student account</h2>
        <p style={{fontSize:12,color:"rgba(255,255,255,.68)",marginTop:5}}>Confirm control of your @ump.ac.za email address to activate a student profile.</p>
      </div>
      <form onSubmit={handleSubmit} style={{padding:"23px 28px"}}>
        <label style={labelStyle}>Full name<input value={fullName} onChange={e=>setFullName(e.target.value)} autoComplete="name" minLength={2} maxLength={100} required style={inputStyle}/></label>
        <label style={labelStyle}>UMP email address<input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="student@ump.ac.za" autoComplete="email" required pattern="[^\s@]+@ump\.ac\.za" style={inputStyle}/></label>
        <label style={labelStyle}>Password<input value={password} onChange={e=>setPassword(e.target.value)} type="password" autoComplete="new-password" minLength={12} maxLength={128} required style={inputStyle}/><span style={{display:"block",fontSize:11,fontWeight:400,textTransform:"none",letterSpacing:0,color:SL,marginTop:5}}>Use 12–128 characters.</span></label>
        <label style={labelStyle}>Confirm password<input value={confirm} onChange={e=>setConfirm(e.target.value)} type="password" autoComplete="new-password" minLength={12} maxLength={128} required style={inputStyle}/></label>
        {message&&<p role="status" style={{background:success?`${GREEN}14`:REDL,color:success?GREEN:RED,padding:11,borderRadius:7,fontSize:12.5,lineHeight:1.55,marginBottom:14}}>{message}</p>}
        <p style={{fontSize:11,color:SL,lineHeight:1.55,marginTop:13}}>Email verification confirms control of the address only; it does not verify current UMP enrolment or employment. Staff accounts are provisioned separately by an administrator.</p>
        <button type="submit" disabled={loading} style={{position:"sticky",bottom:0,zIndex:2,width:"100%",padding:13,marginTop:14,background:NAVY,color:WHITE,border:0,borderRadius:7,fontSize:14,fontWeight:700,cursor:loading?"wait":"pointer",opacity:loading ? .75 : 1,boxShadow:"0 -8px 16px rgba(255,255,255,.92)"}}>{loading?"Creating account…":"Create account"}</button>
      </form>
    </div>
  );
}
