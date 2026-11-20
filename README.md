# Recall

A skill-retention app for recent graduates. A forgetting model estimates, per person and per skill, how much they still remember and whether it is fading; each day the app gives a 5-minute session on the skills most at risk for the job they want. Capstone project by Renata Ziiangaraeva, Minerva University, CP193 Digital Learning Venture track.

## Open the app

Live app (no install): https://renata-ramil.github.io/recall-app/

It runs in any browser. On a phone it fills the screen; on a laptop it sits as a phone-width column. The transcript upload is simulated in this version (any file shows the same demo courses, and "Skip for now" works too), and every value shown comes from the forgetting model's schedule for a demo user.

## Pilot (Nov 2026)

Pilot app: https://renata-ramil.github.io/recall-app/pilot/?code=YOURCODE. It adds a consent screen with a privacy notice and terms, study codes, a per-person split of skills into a personalized half (review when the estimate falls to the fade line) and a fixed half (1, 3 and 7 days, then one common review for both halves on day 11 and a pause on days 12 to 14), the 40 items and 3 scenarios from the content bank, real recall estimates from each person's answers, a closing check on days 15 and 16, and a row in the project's Google Sheet for every answer. Setup steps: `pilot/PILOT_SETUP.md`. Landing page with a price: https://renata-ramil.github.io/recall-app/landing/

## What is in this repository

| Folder | What |
| --- | --- |
| `docs/` | The built app, served by GitHub Pages. No action needed here. |
| `app/` | Source of the React front end: the designed screens, the api module that holds every model value, and the state store. |
| `model/` | The hierarchical forgetting model in PyMC: the first version, the 4-chain run, the real Duolingo run, and outputs (summaries, diagnostics, calibration plots, the demo schedule). `floor_model.py` tests whether recall levels off after months (plain curve against a curve with a floor). |
| `content/` | The data science module: 40 recall items and 3 scenarios and the validation script. |
| `jobs/` | Job weights from real postings: the script, the weights per role, a chart, and a spot-check sheet of matched phrases. |
| `pilot/` | Pilot setup steps, the Google Sheet logger (Apps Script) and the pilot analysis script. |
| `tests/` | The user-test protocol, the notes template, and the scripts that summarize the notes and check saturation. |

## Running things yourself

Front end: `cd app && npm install && npm run dev`, then open http://localhost:5173.

Model: `pip install pymc arviz pandas matplotlib`, then `python3 model/run_model.py` (synthetic data) or `python3 model/run_real_duolingo.py path/to/settles.acl16.learning_traces.13m.csv.gz` (the Duolingo file from Harvard Dataverse, doi:10.7910/DVN/N8XJME).

Job weights: download the four CSVs from github.com/picklesueat/data_jobs_data (Glassdoor postings, June 2020), then `python3 jobs/job_weights.py path/to/data_jobs_data/data`.

Gilroy is a commercial typeface; the font files in `app/public/fonts` and `docs/fonts` are used under a personal license for this prototype.
