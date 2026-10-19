/* PrepSage account sign-in and per-account cloud sync.
   Requires the public Supabase publishable/anon key in supabase-config.js. */
(function(){
 const URL=window.PREPSAGE_SUPABASE_URL,KEY=window.PREPSAGE_SUPABASE_ANON_KEY;
 let client=null, syncTimer=null, restoring=false, profile=null, currentUser=null, recoveryMode=false, authMode="signup";
 const $=s=>document.querySelector(s);
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 function notice(msg){const n=$("#account-message");if(n)n.textContent=msg;}
 function setGate(active){
  document.body.classList.toggle("auth-gate",!!active);
  const modal=$("#account-modal");
  if(active&&modal&&!modal.open)modal.showModal();
  if(!active&&modal?.open)modal.close();
 }
 function addUI(){
  const actions=document.querySelector(".top-actions");if(actions&&!$("#account-button")){
   const b=document.createElement("button");b.id="account-button";b.className="button button-outline account-button";b.textContent="Sign in";b.onclick=()=>{$("#account-modal").showModal();};actions.insertBefore(b,actions.firstChild);
  }
  if(!$("#account-modal")){
   const d=document.createElement("dialog");d.id="account-modal";d.className="modal auth-dialog";
   d.innerHTML='<form method="dialog" class="modal-inner auth-inner" id="account-form"><div class="auth-brand"><span class="auth-brand-mark">✳</span><span><strong>PrepSage</strong><small>JAMB 2027</small></span></div><div class="modal-heading"><div><span class="eyebrow">YOUR PERSONAL STUDY SPACE</span><h2 id="account-title">Create your account</h2></div><button type="button" class="icon-button auth-close" aria-label="Close">×</button></div><p class="auth-intro">A calmer way to prepare for JAMB, one topic at a time. Create an account to keep your lessons, quiz results and study plan with you.</p><label for="account-name" id="account-name-label">What should we call you?</label><input id="account-name" class="form-input" maxlength="80" autocomplete="name" placeholder="Your name"><label for="account-email">Email address</label><input id="account-email" class="form-input" type="email" autocomplete="email" required placeholder="you@example.com"><label for="account-password" id="account-password-label">Create a password</label><input id="account-password" class="form-input" type="password" autocomplete="new-password" minlength="8" required placeholder="At least 8 characters"><button type="button" class="auth-forgot" id="account-forgot">Forgot password?</button><p id="account-message" class="account-message" role="status">Create your account to get started.</p><div class="auth-actions"><button type="button" class="button button-quiet" id="account-signout" hidden>Sign out</button><button type="submit" class="button button-primary" id="account-login">Create account</button><button type="button" class="auth-switch" id="account-switch">Already have an account? Sign in</button></div><p class="auth-footnote">Your study progress is saved to your account when cloud sync is set up.</p></form>';
   document.body.appendChild(d);
   $("#account-form").addEventListener("submit",async e=>{e.preventDefault();if(recoveryMode)await updatePassword();else if(authMode==="signup")await signUp();else await signIn();});
   $("#account-switch").onclick=()=>{authMode=authMode==="signup"?"signin":"signup";setSignedIn(null);notice(authMode==="signup"?"Create your account to get started.":"Sign in to continue your study journey.");};
   $("#account-signout").onclick=signOut;$("#account-forgot").onclick=sendPasswordReset;
   $(".auth-close").onclick=()=>{if(!document.body.classList.contains("auth-gate"))d.close();};
   d.addEventListener("cancel",e=>{if(document.body.classList.contains("auth-gate"))e.preventDefault();});
  }
 }
 function setSignedIn(user){
  const b=$("#account-button");if(b)b.textContent=user?"My account":"Sign in";
  const signout=$("#account-signout");if(signout)signout.hidden=!user;
  const title=$("#account-title"),name=$("#account-name"),nameLabel=$("#account-name-label"),pw=$("#account-password"),pwLabel=$("#account-password-label"),submit=$("#account-login"),switcher=$("#account-switch"),forgot=$("#account-forgot");
  if(title)title.textContent=recoveryMode?"Choose a new password":user?"Your PrepSage account":authMode==="signup"?"Create your account":"Welcome back";
  if(name)name.hidden=authMode!=="signup"||!!user||recoveryMode;
  if(nameLabel)nameLabel.hidden=authMode!=="signup"||!!user||recoveryMode;
  if(pw)pw.autocomplete=recoveryMode||authMode==="signup"?"new-password":"current-password";
  if(pwLabel)pwLabel.textContent=recoveryMode?"New password":authMode==="signup"?"Create a password":"Password";
  if(pw)pw.placeholder=recoveryMode?"At least 8 characters":authMode==="signup"?"At least 8 characters":"Your password";
  if(submit)submit.textContent=recoveryMode?"Update password":authMode==="signup"?"Create account":"Sign in";
  if(switcher){switcher.hidden=!!user||recoveryMode;switcher.textContent=authMode==="signup"?"Already have an account? Sign in":"New to PrepSage? Create an account";}
  if(forgot)forgot.hidden=authMode==="signup"||!!user||recoveryMode;
  const intro=document.querySelector(".auth-intro");if(intro&&!recoveryMode)intro.textContent=authMode==="signup"?"A calmer way to prepare for JAMB, one topic at a time. Create an account to keep your lessons, quiz results and study plan with you.":"Welcome back. Sign in to continue your JAMB preparation and pick up where you left off.";
  const adminLink=document.querySelector('[data-view-link="admin"]');if(adminLink)adminLink.hidden=!(user&&profile?.role==="admin");
 }
 async function updatePassword(){
  const password=$("#account-password").value;if(password.length<8){notice("Use at least 8 characters for your new password.");return;}
  const {error}=await client.auth.updateUser({password});if(error){notice(error.message);return;}
  recoveryMode=false;authMode="signin";notice("Password updated. You are signed in.");setSignedIn((await client.auth.getUser()).data.user);setGate(false);
 }
 async function setup(){
  addUI();
  let projectUrl=URL,publicKey=KEY;
  if(!publicKey){try{const cfg=await fetch("/api/public-config").then(r=>r.json());if(cfg.anonKey){projectUrl=cfg.url;publicKey=cfg.anonKey;}}catch{}}
  if(!projectUrl||!publicKey){notice("Add SUPABASE_ANON_KEY in Vercel Environment Variables, then redeploy. Never use a service-role key in the browser.");return;}
  if(!window.supabase?.createClient){notice("Could not load the Supabase client. Check your connection and refresh.");return;}
  client=window.supabase.createClient(projectUrl,publicKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const {data:{session}}=await client.auth.getSession();
  if(session){await onSession(session,false);setGate(false);}else{setSignedIn(null);setGate(true);}
  client.auth.onAuthStateChange((event,session)=>{if(event==="PASSWORD_RECOVERY"){recoveryMode=true;setSignedIn(session?.user||null);notice("Enter a new password with at least 8 characters.");return;}if(event==="SIGNED_IN"&&session)setTimeout(()=>onSession(session,true),0);if(event==="SIGNED_OUT"){profile=null;currentUser=null;recoveryMode=false;authMode="signup";setSignedIn(null);setGate(true);notice("You have signed out. Create an account or sign in to continue.");}});
  window.prepSageCloudRole=()=>profile?.role||"student";\n  window.prepSageDisplayName=()=>profile?.display_name||currentUser?.user_metadata?.display_name||currentUser?.user_metadata?.full_name||"";
  window.prepSageCloudUser=()=>client?.auth.getSession();
  window.prepSageSyncState=(state)=>{if(!client||!profile||restoring)return;clearTimeout(syncTimer);syncTimer=setTimeout(async()=>{try{const {data:{user}}=await client.auth.getUser();if(!user)return;const {error}=await client.from("student_state").upsert({user_id:user.id,state,updated_at:new Date().toISOString()},{onConflict:"user_id"});if(error)console.error("PrepSage sync:",error.message);else notice("Signed in. Progress synced to your account.");}catch(e){console.error("PrepSage sync failed",e);}},900);};
 }
 async function onSession(session,fromLogin){
  if(!client||!session)return;
  const {data:{user}}=await client.auth.getUser();if(!user)return;
  const {data:p}=await client.from("profiles").select("display_name,role").eq("id",user.id).maybeSingle();profile=p||{display_name:user.user_metadata?.display_name||"",role:"student"};
  setSignedIn(user);
  try{
   const {data:row,error}=await client.from("student_state").select("state,updated_at").eq("user_id",user.id).maybeSingle();
   if(error)throw error;
   if(row?.state&&typeof row.state==="object"){
    const local=localStorage.getItem("prepsage-jamb-v1");
    const remoteDate=Date.parse(row.updated_at||0),localObj=local?JSON.parse(local):null;
    if(fromLogin&&localObj&&confirm("This account has saved progress. Use the cloud copy and replace this browser's current progress?")){restoring=true;localStorage.setItem("prepsage-jamb-v1",JSON.stringify(row.state));location.reload();return;}
    if(!local){restoring=true;localStorage.setItem("prepsage-jamb-v1",JSON.stringify(row.state));location.reload();return;}
   }else if(fromLogin){
    const local=localStorage.getItem("prepsage-jamb-v1");
    if(local&&confirm("Import the progress currently saved in this browser into this account? Choose Cancel to start this account with a fresh study space.")){
      const {error:saveError}=await client.from("student_state").upsert({user_id:user.id,state:JSON.parse(local),updated_at:new Date().toISOString()},{onConflict:"user_id"});if(saveError)throw saveError;
    }else{restoring=true;localStorage.removeItem("prepsage-jamb-v1");location.reload();return;}
   }
   notice("Signed in. Your progress syncs to this account.");
  }catch(e){notice("Signed in, but database sync needs setup: "+(e.message||"check the Supabase schema and RLS policies."));}
 }
 async function signIn(){
  if(!client){notice("Account services are not ready yet. Refresh and try again.");return;}
  const email=$("#account-email").value.trim(),password=$("#account-password").value;
  const {data,error}=await client.auth.signInWithPassword({email,password});if(error){notice(error.message);return;}
  await onSession(data.session,true);setGate(false);
 }
 async function signUp(){
  if(!client){notice("Account services are not ready yet. Refresh and try again.");return;}
  const email=$("#account-email").value.trim(),password=$("#account-password").value,name=$("#account-name").value.trim();
  if(!email||password.length<8){notice("Enter an email and a password with at least 8 characters.");return;}
  const {data,error}=await client.auth.signUp({email,password,options:{data:{display_name:name},emailRedirectTo:"https://prepsage-jamb.vercel.app/"}});
  if(error){notice(error.message);return;}
  if(data.session){await onSession(data.session,true);setGate(false);}
  else notice("Your account was created. Check your email to confirm it, then sign in.");
 }
 async function sendPasswordReset(){if(!client){notice("Account services are not ready yet.");return;}const email=$("#account-email").value.trim();if(!email){notice("Enter your email address first, then choose Forgot password.");$("#account-email").focus();return;}const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:"https://prepsage-jamb.vercel.app/"});if(error){notice(error.message);return;}notice("If an account exists for that email, a password reset link has been sent.");}
 async function signOut(){if(!client)return;const {error}=await client.auth.signOut();if(error)notice(error.message);else{profile=null;authMode="signup";setSignedIn(null);setGate(true);notice("You have signed out. Sign in or create an account to continue.");}}
 document.addEventListener("DOMContentLoaded",setup);
})();
