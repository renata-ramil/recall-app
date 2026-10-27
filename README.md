# Recall

A skill-retention app for recent graduates. A forgetting model estimates, per person and per skill, how much they still remember and whether it is fading; each day the app gives a 5-minute session on the skills most at risk for the job they want. Capstone project by Renata Ziiangaraeva, Minerva University, CP193 Digital Learning Venture track.

## Open the app

Live app (no install): https://renata-ramil.github.io/recall-app/

It runs in any browser. On a phone it fills the screen; on a laptop it sits as a phone-width column. The transcript upload is simulated in this version (any file shows the same demo courses, and "Skip for now" works too), and every value shown comes from the forgetting model's schedule for a demo user.


## What is in this repository

| Folder | What |
| --- | --- |
| `docs/` | The built app, served by GitHub Pages. No action needed here. |
| `app/` | Source of the React front end: the designed screens, the api module that holds every model value, the state store, and the screenshot comparison scripts. |
| `model/` | The hierarchical forgetting model in PyMC: the first version, the 4-chain run, the real Duolingo run, and outputs (summaries, diagnostics, calibration plots, the demo schedule). |
| `content/` | The data science module: 40 recall items and 3 scenarios, the validation script, the blind-check script and its review log. |
| `tests/` | The user-test protocol, the notes template, the coded notes from the 8 calls, and the script that turns them into the results section. |

## Running things yourself

Front end: `cd app && npm install && npm run dev`, then open http://localhost:5173.

Model: `pip install pymc arviz pandas matplotlib`, then `python3 model/run_model.py` (synthetic data) or `python3 model/run_real_duolingo.py path/to/settles.acl16.learning_traces.13m.csv.gz` (the Duolingo file from Harvard Dataverse, doi:10.7910/DVN/N8XJME).

Results from the test calls: `python3 tests/analyze_tests.py tests/test_notes.csv`.

Gilroy is a commercial typeface; the font files in `app/public/fonts` and `docs/fonts` are used under a personal license for this prototype.
