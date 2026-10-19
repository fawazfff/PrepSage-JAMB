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

## Connect the Supabase project and enable student accounts

Project URL: `https://ujeyybdabqudzgvjbpiv.supabase.co`.

### 1. Create the tables

Open the [Supabase SQL Editor](https://supabase.com/dashboard/project/ujeyybdabqudzgvjbpiv/sql/new), open `supabase/schema.sql` from this repository, copy the entire SQL file into the editor, and click **Run**. This creates the per-student profile, topic progress, quiz attempts, study sessions, goals, timetable, resource and synced-state tables with Row Level Security. If you later edit and rerun this SQL, review any policy errors before proceeding.

### 2. Configure Vercel environment variables

In Vercel → Project → Settings → Environment Variables, add these for Production:

- `SUPABASE_URL` = `https://ujeyybdabqudzgvjbpiv.supabase.co`
- `SUPABASE_ANON_KEY` = your project's **publishable key** (or legacy anon key) from Supabase API Keys. This key is designed to be used in browser clients, with RLS enabled.
- `SUPABASE_SERVICE_ROLE_KEY` = the project's secret/service-role key. **Server-side only. Never add this to any browser file, commit it to GitHub, or share it in chat.**

Redeploy after adding variables. The public config endpoint exposes only the publishable/anon key to the browser, never the service-role key.

### 3. Create student accounts

Open the site and use **Sign in → Create account** for each student. If email confirmation is enabled, each student must confirm their email before signing in. Students should use separate accounts and never share passwords.

### 4. Promote the owner account to administrator

After creating your own account and confirming the email, run this SQL in the Supabase SQL Editor, replacing the email with the exact email used for your account:

```sql
update public.profiles p
set role = 'admin'
from auth.users u
where p.id = u.id
  and lower(u.email) = lower('YOUR_OWNER_EMAIL_HERE');
```

Do not let students choose their own role. The signup trigger always assigns `student`; the admin API verifies the role server-side.

### 5. Verify

Sign in on the website, make a small progress change, then check the `student_state` table in Supabase Table Editor. Open **Study overview** using the admin account to view student accounts, synced minutes, completed topics, quiz counts, average quiz accuracy, and last-sync time.

The account sync stores the app's current progress snapshot per authenticated user. Normalized tables are included for a future migration to event-by-event analytics. Do not treat a browser's offline changes as synced until the account panel confirms success.
