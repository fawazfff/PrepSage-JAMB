/* PrepSage account sign-in and per-account cloud sync.
   Requires the public Supabase publishable/anon key in supabase-config.js. */
(function(){
 const URL=window.PREPSAGE_SUPABASE_URL,KEY=window.PREPSAGE_SUPABASE_ANON_KEY;
 let client=null, syncTimer=null, restoring=false, profile=null, recoveryMode=false;
 const $=s=>document.querySelector(s);
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 function notice(msg){const n=$("#account-message");if(n)n.textContent=msg;}
 function addUI(){
  const actions=document.querySelector(".top-actions");if(actions&&!$("#account-button")){
   const b=document.createElement("button");b.id="account-button";b.className="button button-outline account-button";b.textContent="Sign in";b.onclick=()=>$("#account-modal").showModal();actions.insertBefore(b,actions.firstChild);
  }
  if(!$("#account-modal")){
   const d=document.createElement("dialog");d.id="account-modal";d.className="modal";
   d.innerHTML='<form method="dialog" class="modal-inner" id="account-form"><div class="modal-heading"><div><span class="eyebrow">YOUR PERSONAL STUDY SPACE</span><h2 id="account-title">Sign in to PrepSage</h2></div><button class="icon-button" aria-label="Close">×</button></div><p class="panel-subtitle">Your lessons, quiz results and study plan will follow your account across devices.</p><label for="account-name">Name (for a new account)</label><input id="account-name" class="form-input" maxlength="80" placeholder="Your name"><label for="account-email">Email</label><input id="account-email" class="form-input" type="email" autocomplete="email" required placeholder="you@example.com"><label for="account-password">Password</label><input id="account-password" class="form-input" type="password" autocomplete="current-password" minlength="8" required placeholder="At least 8 characters"><p id="account-message" class="account-message" role="status">Choose sign in or create an account.</p><div class="modal-actions"><button type="button" class="button button-quiet" id="account-signout" hidden>Sign out</button><button type="button" class="button button-quiet" id="account-forgot">Forgot password?</button><button type="button" class="button button-outline" id="account-signup">Create account</button><button type="submit" class="button button-primary" id="account-login">Sign in</button></div></form>';
   document.body.appendChild(d);
   $("#account-form").addEventListener("submit",async e=>{e.preventDefault();await signIn();});
   $("#account-signup").onclick=signUp;$("#account-signout").onclick=signOut;$("#account-forgot").onclick=sendPasswordReset;
  }
 }
 function setSignedIn(user){const b=$("#account-button");if(b)b.textContent=user?(profile?.display_name||user.email||"Account"):"Sign in";const signout=$("#account-signout");if(signout)signout.hidden=!user;const title=$("#account-title");if(title)title.textContent=recoveryMode?"Choose a new password":user?"Your PrepSage account":"Sign in to PrepSage";const login=$("#account-login"),signup=$("#account-signup"),forgot=$("#account-forgot"),pw=$("#account-password"),pwLabel=document.querySelector('label[for="account-password"]');if(login)login.textContent=recoveryMode?"Update password":"Sign in";if(signup)signup.hidden=!!user||recoveryMode;if(forgot)forgot.hidden=!!user||recoveryMode;if(pw)pw.autocomplete=recoveryMode?"new-password":"current-password";if(pwLabel)pwLabel.textContent=recoveryMode?"New password":"Password";const adminLink=document.querySelector('[data-view-link="admin"]');if(adminLink)adminLink.hidden=!(user&&profile?.role==="admin");}
 async function setup(){
  addUI();
  let projectUrl=URL,publicKey=KEY;
  if(!publicKey){try{const cfg=await fetch("/api/public-config").then(r=>r.json());if(cfg.anonKey){projectUrl=cfg.url;publicKey=cfg.anonKey;}}catch{}}
  if(!projectUrl||!publicKey){notice("Add SUPABASE_ANON_KEY in Vercel Environment Variables, then redeploy. Never use a service-role key in the browser.");return;}
  if(!window.supabase?.createClient){notice("Could not load the Supabase client. Check your connection and refresh.");return;}
  client=window.supabase.createClient(projectUrl,publicKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const {data:{session}}=await client.auth.getSession();
  if(session)await onSession(session,false);else setSignedIn(null);
  client.auth.onAuthStateChange((event,session)=>{if(event==="PASSWORD_RECOVERY"){recoveryMode=true;setSignedIn(session?.user||null);notice("Enter a new password with at least 8 characters.");return;}if(event==="SIGNED_IN"&&session)setTimeout(()=>onSession(session,true),0);if(event==="SIGNED_OUT"){profile=null;recoveryMode=false;setSignedIn(null);notice("You have signed out.");}});
  window.prepSageCloudRole=()=>profile?.role||"student";
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
  if(!client){notice("Add the Supabase publishable/anon key first.");return;}
  if(recoveryMode){const password=$("#account-password").value;if(password.length<8){notice("Use at least 8 characters for your new password.");return;}const {error}=await client.auth.updateUser({password});if(error){notice(error.message);return;}recoveryMode=false;notice("Password updated. You are signed in.");setSignedIn((await client.auth.getUser()).data.user);return;}
  const email=$("#account-email").value.trim(),password=$("#account-password").value;
  const {data,error}=await client.auth.signInWithPassword({email,password});if(error){notice(error.message);return;}await onSession(data.session,true);
 }
 async function signUp(){
  if(!client){notice("Add the Supabase publishable/anon key first.");return;}
  const email=$("#account-email").value.trim(),password=$("#account-password").value,name=$("#account-name").value.trim();
  if(!email||password.length<8){notice("Enter an email and a password with at least 8 characters.");return;}
  const {data,error}=await client.auth.signUp({email,password,options:{data:{display_name:name}}});
  if(error){notice(error.message);return;}
  if(data.session)await onSession(data.session,true);else notice("Check your email to confirm the account, then sign in.");
 }
 async function sendPasswordReset(){if(!client){notice("Account services are not ready yet.");return;}const email=$("#account-email").value.trim();if(!email){notice("Enter your email address first, then choose Forgot password.");$("#account-email").focus();return;}const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+window.location.pathname});if(error){notice(error.message);return;}notice("If an account exists for that email, a password reset link has been sent.");}
 async function signOut(){if(!client)return;const {error}=await client.auth.signOut();if(error)notice(error.message);else{profile=null;setSignedIn(null);notice("Signed out. This browser keeps its last local copy; another account will not automatically import it.");}}
 document.addEventListener("DOMContentLoaded",setup);
})();
