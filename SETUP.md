# PrepSage JAMB deployment setup

The site deploys from GitHub to Vercel. These are the private server-side variables needed for optional AI and YouTube features.

## Vercel environment variables

Open the `prepsage-jamb` project in Vercel, then go to **Settings → Environment Variables**. Add each variable to **Production** (and Preview/Development if you use those environments). Redeploy after adding or changing them.

| Variable | Required for | Value |
|---|---|---|
| `OPENAI_API_KEY` | AI tutor answers | Your OpenAI API key |
| `OPENAI_MODEL` | Optional model selection | `gpt-4.1-mini` (default if omitted) |
| `YOUTUBE_API_KEY` | Real YouTube video search results | A Google Cloud API key with YouTube Data API v3 enabled |

Never add secret values to `app.js`, any browser JavaScript, HTML, or GitHub. Do not send keys in chat. Vercel environment variables keep them server-side.

## Create a YouTube Data API key

1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Create/select a project and enable **YouTube Data API v3** under APIs & Services.
3. Create an API key under APIs & Services → Credentials.
4. Restrict the key to YouTube Data API v3 where possible, then add it to Vercel as `YOUTUBE_API_KEY`.
5. Redeploy the project.

The YouTube search endpoint caches results to reduce repeated API usage. Google’s default search quota is limited, so do not disable caching without a reason.

## Official JAMB syllabus references

Use the latest official subject pages/PDFs in the [JAMB IBASS e-syllabus](https://ibass.jamb.gov.ng/e-syllabus). The current app provides a growing syllabus-aligned topic map and original practice questions. It does not claim its practice bank is a verified archive of official past questions. Review topic coverage against the newest 2027 syllabus before treating the course as complete.

## Student progress and the admin overview

The current admin view reads progress saved in the current browser only. It is a local preview, not a shared dashboard. To monitor three students on different devices, the next phase must add student accounts, a secure database, per-student progress records, and administrator-only access. Do not share the current local-storage data as if it were cloud-synchronised.

## Deployment smoke tests

- Open the home page and navigate to Learn by topic, CBT practice, My library, Study planner, My progress, and Study overview.
- Finish a topic quiz and confirm the score appears in local progress.
- Open a lesson and confirm the YouTube section either shows results or gives a setup message and fallback search link.
- Ask the AI tutor after setting `OPENAI_API_KEY`; without the key, it should show a clear configuration message.
