import { useState } from "react";
import { BD, GREEN, NAVY, RED, REDL, SL, WHITE } from "../constants.js";
import { applyEmailVerificationCode } from "./firebaseAuth.js";

export default function VerifyEmail() {
  const [code] = useState(() => new URLSearchParams(window.location.search).get("oobCode") || "");
  const [status, setStatus] = useState("ready");
  const [message, setMessage] = useState("");

  async function verifyEmail() {
    if (!code) {
      setStatus("error");
      setMessage("This verification link is invalid or incomplete.");
      return;
    }
    setStatus("loading");
    setMessage("");
    try {
      await applyEmailVerificationCode(code);
      setStatus("success");
      setMessage("Your email address is verified. You can now sign in to CEIS.");
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Could not connect to the verification service.");
    }
  }

  return (
    <main style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"linear-gradient(135deg,#0B1530,#172B58)",padding:20,fontFamily:"'IBM Plex Sans',sans-serif"}}>
      <section style={{width:"100%",maxWidth:480,background:WHITE,borderRadius:16,padding:32,boxShadow:"0 24px 80px rgba(0,0,0,.35)"}}>
        <div style={{fontSize:10,fontWeight:700,color:SL,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>UMP CEIS · Account verification</div>
        <h1 style={{fontFamily:"'IBM Plex Serif',serif",fontSize:25,color:NAVY,marginBottom:10}}>Verify your email</h1>
        <p style={{fontSize:14,color:SL,lineHeight:1.7,marginBottom:20}}>Confirm that you control your university email address to activate your account.</p>
        {status === "ready"&&<button onClick={verifyEmail} style={{width:"100%",padding:13,background:NAVY,color:WHITE,border:0,borderRadius:7,fontWeight:700,fontSize:14,cursor:"pointer"}}>Verify my email</button>}
        {status === "loading"&&<p role="status" style={{color:SL}}>Verifying email…</p>}
        {message&&<p role="status" style={{padding:12,borderRadius:7,background:status==="success"?`${GREEN}14`:REDL,color:status==="success"?GREEN:RED,fontSize:13,lineHeight:1.6}}>{message}</p>}
        {status === "error"&&<button onClick={verifyEmail} style={{width:"100%",padding:12,marginTop:12,background:WHITE,color:NAVY,border:`1px solid ${BD}`,borderRadius:7,fontWeight:700,cursor:"pointer"}}>Try again</button>}
        {status === "success"&&<a href="/" style={{display:"block",marginTop:18,color:NAVY,fontWeight:700,fontSize:13}}>Continue to CEIS</a>}
      </section>
    </main>
  );
}
