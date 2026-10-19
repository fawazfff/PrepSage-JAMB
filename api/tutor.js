export default async function handler(req,res){
res.setHeader("Cache-Control","no-store");
if(req.method!=="POST")return res.status(405).json({error:"Use POST for a tutor question."});
const auth=req.headers.authorization||"";
if(!/^Bearer\\s+\\S+$/i.test(auth))return res.status(401).json({error:"Sign in to use the AI tutor."});
const supabaseUrl=process.env.SUPABASE_URL||"https://ujeyybdabqudzgvjbpiv.supabase.co";
const publicKey=process.env.SUPABASE_ANON_KEY||process.env.SUPABASE_PUBLISHABLE_KEY;
if(!publicKey)return res.status(503).json({error:"Account verification is not configured. Try again later."});
try{
 const userResponse=await fetch(supabaseUrl+"/auth/v1/user",{headers:{apikey:publicKey,authorization:auth}});
 if(!userResponse.ok)return res.status(401).json({error:"Your session has expired. Sign in again."});
}catch(e){return res.status(502).json({error:"Could not verify your session. Please try again."});}
if(!process.env.OPENAI_API_KEY)return res.status(503).json({error:"AI tutor is not connected yet. Add OPENAI_API_KEY in Vercel Environment Variables."});
const {question,subject="General",topic="Study skills",history=[]}=req.body||{};
if(typeof question!=="string"||!question.trim()||question.length>3000)return res.status(400).json({error:"Enter a question under 3,000 characters."});
const safeHistory=Array.isArray(history)?history.slice(-6).filter(m=>m&&["user","assistant"].includes(m.role)&&typeof m.content==="string").map(m=>({role:m.role,content:m.content.slice(0,2000)})):[];
try{
const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Authorization":"Bearer "+process.env.OPENAI_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({model:process.env.OPENAI_MODEL||"gpt-4.1-mini",instructions:"You are PrepSage, a patient Nigerian JAMB 2027 tutor for Use of English, Chemistry, Biology and Physics. Explain simply for a secondary-school student, show steps in calculations, use short examples and end with a quick check question when useful. Never claim invented questions are official past questions. For uncertain syllabus details, say so and direct the student to official JAMB IBASS. Never promise admission or exam results. Be focused and encouraging.",input:[...safeHistory.filter(m=>m.content!==question.trim()),{role:"user",content:"Current subject: "+String(subject).slice(0,80)+"\nCurrent topic: "+String(topic).slice(0,160)+"\nStudent question: "+question.trim()},...safeHistory],max_output_tokens:700})});
const data=await response.json();if(!response.ok)return res.status(502).json({error:"Tutor service could not answer right now. Please try again shortly."});
const answer=(data.output||[]).flatMap(i=>i.content||[]).filter(i=>i.type==="output_text").map(i=>i.text).join("\n").trim();
if(!answer)return res.status(502).json({error:"Tutor returned an empty answer. Please try again."});return res.status(200).json({answer});
}catch(e){return res.status(500).json({error:"Could not reach the tutor. Check your connection and try again."});}
}