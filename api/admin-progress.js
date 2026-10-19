export default async function handler(req,res){
 if(req.method!=="GET"){res.setHeader("Allow","GET");return res.status(405).json({error:"Method not allowed"});}
 const url=process.env.SUPABASE_URL||"https://ujeyybdabqudzgvjbpiv.supabase.co";
 const anon=process.env.SUPABASE_ANON_KEY;
 const service=process.env.SUPABASE_SERVICE_ROLE_KEY;
 const auth=req.headers.authorization||"";
 if(!/^Bearer\s+\S+$/i.test(auth))return res.status(401).json({error:"Sign in required"});
 if(!anon||!service)return res.status(503).json({error:"Admin API needs SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY in Vercel environment variables."});
 try{
  const userRes=await fetch(url+"/auth/v1/user",{headers:{apikey:anon,authorization:auth}});
  if(!userRes.ok)return res.status(401).json({error:"Session expired. Sign in again."});
  const user=await userRes.json();
  const h={apikey:service,authorization:"Bearer "+service};
  const profileRes=await fetch(url+"/rest/v1/profiles?id=eq."+encodeURIComponent(user.id)+"&select=role,display_name",{headers:h});
  const own=await profileRes.json();
  if(!profileRes.ok||own?.[0]?.role!=="admin")return res.status(403).json({error:"Admin access only. Promote your owner account in Supabase SQL Editor first."});
  const [profilesRes,statesRes]=await Promise.all([
   fetch(url+"/rest/v1/profiles?select=id,display_name,role,created_at&order=created_at.asc",{headers:h}),
   fetch(url+"/rest/v1/student_state?select=user_id,state,updated_at",{headers:h})
  ]);
  if(!profilesRes.ok||!statesRes.ok)return res.status(502).json({error:"Could not load student progress. Check database schema."});
  const [profiles,states]=await Promise.all([profilesRes.json(),statesRes.json()]);
  const students=profiles.filter(p=>p.role==="student").map(p=>{
   const row=states.find(s=>s.user_id===p.id),s=row?.state||{},quizzes=Array.isArray(s.quizzes)?s.quizzes:[];
   const completed=Array.isArray(s.completed)?s.completed:[];
   return {id:p.id,name:p.display_name||"Student",created_at:p.created_at,last_synced:row?.updated_at||null,minutes:Number(s.minutes)||0,completed_topics:completed.length,quiz_attempts:quizzes.length,average_score:quizzes.length?Math.round(quizzes.reduce((n,q)=>n+(Number(q.correct)||0)/Math.max(1,Number(q.total)||1)*100,0)/quizzes.length):null,subjects:s.subjects||[],recent_quizzes:quizzes.slice(-5).reverse()};
  });
  return res.status(200).json({students});
 }catch(e){return res.status(500).json({error:"Unable to load student progress."});}
}
