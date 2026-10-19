export default async function handler(req,res){
  res.setHeader("Cache-Control","s-maxage=21600, stale-while-revalidate=86400");
  if(req.method!=="GET")return res.status(405).json({error:"Use GET to search for tutorials."});
  const key=process.env.YOUTUBE_API_KEY;
  if(!key)return res.status(503).json({error:"YouTube search is not connected yet. Add YOUTUBE_API_KEY in Vercel Environment Variables."});
  const subject=String(req.query.subject||"").slice(0,60);
  const topic=String(req.query.topic||"").slice(0,120);
  const query=String(req.query.q||"").slice(0,180);
  const search=[subject,topic,query,"JAMB UTME lesson explained"].filter(Boolean).join(" ");
  try{
    const url=new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("part","snippet");url.searchParams.set("type","video");
    url.searchParams.set("maxResults","5");url.searchParams.set("q",search);
    url.searchParams.set("regionCode","NG");url.searchParams.set("relevanceLanguage","en");
    url.searchParams.set("safeSearch","strict");url.searchParams.set("order","relevance");
    url.searchParams.set("videoEmbeddable","true");url.searchParams.set("key",key);
    const response=await fetch(url.toString());
    const data=await response.json();
    if(!response.ok)return res.status(502).json({error:"YouTube search could not return videos. Check the API key and enabled API."});
    const videos=(data.items||[]).filter(v=>v.id&&v.id.videoId&&v.snippet).map(v=>({
      id:v.id.videoId,title:v.snippet.title,channel:v.snippet.channelTitle,
      description:String(v.snippet.description||"").slice(0,260),
      thumbnail:v.snippet.thumbnails?.medium?.url||v.snippet.thumbnails?.default?.url||"",
      url:"https://www.youtube.com/watch?v="+v.id.videoId
    }));
    return res.status(200).json({videos,query:search});
  }catch(e){return res.status(500).json({error:"Could not reach YouTube right now."});}
}
