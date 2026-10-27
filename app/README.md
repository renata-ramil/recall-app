# Recall front end

Mobile-first web app for the Recall skill-retention product, built from Renata's screen designs with Vite, React, TypeScript and React Router. Plain CSS, self-hosted Gilroy, no UI kit, no icon or chart library.

## Run

```
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
npm run preview
```

Node 18 or newer. Gilroy is self-hosted from `public/fonts/` (commercial font: a web license is needed before public launch).

## Where things live

| Path | What |
| --- | --- |
| `src/api/mock-data.json` | all data the screens show, including every forgetting-model value (recall, half-life, daysUntilFade, job weight) |
| `src/api/index.ts` | the typed api module: the only place the app reads data from; also the priority and skill-state rules |
| `src/api/types.ts` | types for every record the api returns |
| `src/state/store.tsx` | app state (survey, transcript, topics, session) with localStorage persistence; a refresh mid-session resumes |
| `src/styles/recall.css` | the design tokens and component classes, plus the fluid column shell |
| `src/components/ui.tsx` | Btn, IconBtn, Segments, Opt, StepHeader, BottomBar, Nav, Note, the three icons |
| `src/screens/` | Onboarding (Welcome, Survey, Course record, Topic picker, Your plan), Today, Session (Question, Scenario, Summary, Skills tab), SkillDetail, Profile |
| `compare/` | Playwright scripts: `shots.mjs` screenshots every state at 390 x 844 @2x and builds side-by-side images in `compare/out/`; `flow.mjs` clicks the whole flow; `domcheck.mjs` checks the rendered DOM against the design specification |

## Plugging in the real model and backend

Everything the model supplies passes through `src/api/index.ts`. To go live:

1. Replace the `api` object's methods with fetches to your backend. The shapes to return are in `src/api/types.ts`; `Skill` carries `recall`, `jobWeight`, `daysUntilFade` and `halfLifeDays`, and `SkillDetail.curve.segments` drives the forgetting-curve chart.
2. Keep `skillState`, `priority`, `sortByPriority` and `fadeLabel` where they are, or move them server-side and return `state` and `priority` on each skill; the screens only call these helpers.
3. `checkRulesAgainstMock()` runs once in development and warns if the rules stop reproducing the mock order.
4. The transcript parser is mocked in `CourseRecord`: the chosen file is never read or stored; the result comes from `api.transcript()`. Replace the `processing` effect with an upload call and keep the "File deleted" line true.
5. Session scoring: recalled count and duration come from the real session; the before/after recall values on the summary come from `api.summary()` until the model supplies them.

## Screenshots

Start the dev server, then `npm run shots`. Each `compare/out/<name>-compare.png` shows the design (left), the app (middle) and a difference mask (right).
