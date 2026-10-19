/* Topic-matched YouTube Data API results. Browser cache avoids repeat quota use. */
(function(){
const cacheKey=(s,t)=>"prepsage-youtube:"+s+":"+t;
window.loadPrepSageVideos=async function(topic){
 const host=document.querySelector("#lesson-content .lesson-video");if(!host||!topic)return;
 let box=document.querySelector("#topic-video-results");
 if(!box){box=document.createElement("div");box.id="topic-video-results";box.className="topic-video-results";host.insertAdjacentElement("afterend",box);}
 box.innerHTML='<div class="video-results-heading"><strong>Recommended video lessons</strong><span>Matched to this topic</span></div><p class="video-loading">Finding relevant lessons on YouTube…</p>';
 const subject=({biology:"Biology",chemistry:"Chemistry",english:"Use of English",physics:"Physics"})[String(topic[0]).split("-")[0]]||"JAMB";
 const id=String(topic[0]),key=cacheKey(subject,id);let data;
 try{
  const saved=localStorage.getItem(key);
  if(saved){const parsed=JSON.parse(saved);if(Date.now()-parsed.time<21600000)data=parsed.data;}
 }catch{}
 try{
  if(!data){const q=new URLSearchParams({subject,topic:topic[1],q:topic[5]||topic[1]});const response=await fetch("/api/youtube?"+q.toString());data=await response.json();if(!response.ok)throw new Error(data.error||"Video search is not configured yet.");try{localStorage.setItem(key,JSON.stringify({time:Date.now(),data}));}catch{}}
  if(!document.querySelector("#lesson-content .lesson-video"))return;
  if(!data.videos||!data.videos.length)throw new Error("No matching videos found. Try the YouTube search link above.");
  box.innerHTML='<div class="video-results-heading"><strong>Recommended video lessons</strong><span>From YouTube · check the teacher and topic</span></div><div class="video-results-grid">'+data.videos.map(v=>'<a class="video-result" href="'+v.url+'" target="_blank" rel="noopener noreferrer"><img loading="lazy" src="'+v.thumbnail+'" alt=""><span class="video-result-copy"><strong>'+escapeHtml(v.title)+'</strong><small>'+escapeHtml(v.channel)+'</small><em>Watch on YouTube ↗</em></span></a>').join("")+'</div><p class="video-results-note">Recommendations are search matches, not a guarantee of accuracy. Check that the lesson follows the JAMB syllabus.</p>';
 }catch(e){box.innerHTML='<div class="video-results-heading"><strong>Recommended video lessons</strong><span>YouTube</span></div><p class="video-loading">'+escapeHtml(e.message||"Video search is unavailable.")+'</p><a class="button button-outline" target="_blank" rel="noopener noreferrer" href="https://www.youtube.com/results?search_query='+encodeURIComponent(subject+" "+topic[1]+" JAMB UTME lesson")+'">Search YouTube instead ↗</a>';}
};
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
})();
