# PrepSage JAMB

A personal JAMB UTME 2027 study website for one learner, focused on learning by the official syllabus and practising each topic.

## Current MVP

- Responsive website dashboard for Use of English, Chemistry, Biology and Physics
- Topic-by-topic lesson pathway, with a sample lesson and original practice questions
- Interactive sample CBT quiz with answer explanations
- Word of the Day vocabulary card
- Daily study goals, study timetable and reading tracker
- Personal library interface for study materials
- Local progress saved in the browser
- Installable PWA foundation and offline caching

## Important content note

The starter includes sample lessons and **original practice questions**, not a fabricated collection labelled as official JAMB past questions. Add verified, lawfully usable past-question content before describing a question as an authentic past question. Match the syllabus and admission guidance to current official JAMB resources.

## Run locally

This first version is a static site. You can open `index.html` directly for most features, or serve the folder locally:

```bash
npx serve .
```

Deploy by importing this repository into Vercel and selecting the static site defaults, or use GitHub Pages.

## AI tutor (planned)

OpenAI API calls must be made by a server-side endpoint, never from browser JavaScript. Put the API key in a server-side environment variable named `OPENAI_API_KEY`; do not commit keys to this repository. The AI tutor is not enabled in this static MVP yet.

## Roadmap

1. Confirm official syllabus topic lists and seed the four subject libraries.
2. Add verified past-question sources and curated topic-matched YouTube lessons.
3. Add secure learner sign-in/database sync if useful.
4. Implement a server-side AI tutor with usage limits.
5. Expand PWA/offline library support and test on mobile.
