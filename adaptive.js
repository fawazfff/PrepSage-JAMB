/* Adaptive study coach: uses recent local quiz performance to suggest revision. */
document.addEventListener("DOMContentLoaded",()=>{
 const dashboard=document.querySelector("#view-dashboard");if(!dashboard)return;
 if(!document.querySelector("#adaptive-study-panel")){
  const panel=document.createElement("section");panel.id="adaptive-study-panel";panel.className="panel adaptive-panel";
  panel.innerHTML='<div class="panel-heading"><div><span class="eyebrow">YOUR NEXT BEST STEP</span><h3>Study smarter, one topic at a time</h3><p class="panel-subtitle">Suggestions update as you complete lessons and quizzes.</p></div><span class="goal-icon">✦</span></div><div id="adaptive-study-list" class="adaptive-list"></div>';
  const heading=dashboard.querySelector(".section-heading");if(heading)heading.insertAdjacentElement("beforebegin",panel);else dashboard.appendChild(panel);
 }
 function render(){if(!window.prepSageSnapshot)return;const s=window.prepSageSnapshot(),host=document.querySelector("#adaptive-study-list");if(!host)return;host.innerHTML=s.recommendations.map(r=>'<div class="adaptive-item"><strong>'+esc(r.title)+'</strong><p>'+esc(r.body)+'</p><button class="button button-outline" data-adaptive-topic="'+esc(r.topic||"")+'">Study this topic →</button></div>').join("")||'<p class="empty-state">Complete a short quiz and your next steps will appear here.</p>';host.querySelectorAll("[data-adaptive-topic]").forEach(b=>b.onclick=()=>{const id=b.dataset.adaptiveTopic;const t=s.topics.find(t=>t.id===id);if(!t)return;const subjectMap={"Biology":"biology","Chemistry":"chemistry","Use of English":"english","Physics":"physics"};const tab=document.querySelector('[data-subject-tab="'+(subjectMap[t.subject]||"biology")+'"]');if(tab)tab.click();const topicButton=document.querySelector('[data-topic-id="'+id+'"]');if(topicButton)topicButton.click();const learn=document.querySelector('[data-view-link="learn"]');if(learn)learn.click();});}
 function esc(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
 render();document.querySelectorAll("[data-view-link]").forEach(b=>b.addEventListener("click",()=>{if(b.dataset.viewLink==="dashboard")render();}));document.addEventListener("click",e=>{if(e.target.closest("#quiz-next")||e.target.closest("#save-goal")||e.target.closest("#reading-form"))setTimeout(render,0);});
});
