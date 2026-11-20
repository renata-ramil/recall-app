# Pilot setup (Mac)

The pilot build lives at https://renata-ramil.github.io/recall-app/pilot/ and the landing page at https://renata-ramil.github.io/recall-app/landing/ once this folder is pushed. The demo at https://renata-ramil.github.io/recall-app/ stays as it was.

## 1. Push this version

1. Unzip `recall-app-v3-pilot.zip` from the project files.
2. In Finder, open your local `recall-app` folder (the clone of github.com/renata-ramil/recall-app). Copy everything from the unzipped `recall-app` folder into it and choose Replace.
3. Open Terminal and run:
   ```
   cd ~/path/to/recall-app
   git add -A
   git commit -m "Pilot build, landing page, floor model"
   git push
   ```
4. Wait about a minute, then open the pilot link with a test code: https://renata-ramil.github.io/recall-app/pilot/?code=TEST1

## 2. Connect your Google Sheet

1. Make a new Google Sheet called "Recall pilot data" in your own account.
2. Extensions > Apps Script. Delete what is there, paste all of `pilot/apps_script.gs`, and save.
3. Deploy > New deployment > the gear > Web app. Execute as: Me. Who has access: Anyone. Deploy, allow the permissions, and copy the web app URL (it starts with https://script.google.com/macros/s/).
4. On github.com, open `docs/pilot/log-url.txt`, click the pencil, replace the line with your URL, and commit. No rebuild is needed. The landing page reads the same file.
5. Open the pilot link with code TEST1, finish one session, and check that the sheet now has the tabs consent, split, setup, answer and session_done. Then delete the TEST1 rows.

## 3. Run the pilot

- Give each person a code (R01, R02, ...) and their own link: `https://renata-ramil.github.io/recall-app/pilot/?code=R01`. Keep the list of who has which code in a separate private file, not in the sheet.
- Daily reminder: send one message a day at the time each person picked in setup (the setup tab, column reminder). The consent tab gives each code a nudge_arm. Send "plain" codes the plain message and "streak" codes the streak message (both are in the pilot plan).
- Dry run first: you and one other person use it for two days before real participants start.
- A delete request shows up in the delete_request tab. Delete all rows with that code in every tab.

## 4. Results

1. In the sheet, File > Download > Comma-separated values, once per tab, into one folder.
2. In Terminal: `python3 pilot/analyze_pilot.py ~/Downloads/recall-pilot` writes `pilot_results_real.md` in that folder.
3. `python3 model/floor_model.py ~/Downloads/recall-pilot` runs the "levels off" test on the first answers.
4. `pip install numpy pandas scipy` once if Python asks for them.

## Settings

All pilot settings are in `app/src/pilot/config.ts`: the pilot length, the fixed schedule (1, 3, 7, 14, 30 days; in a 14-day pilot only 1, 3 and 7 happen), the common review on day 11 and the pause on days 12 to 14, the fade line that makes a personalized skill due (60%), and the model values. Changing them needs a rebuild: `cd app && npm install && npm run build:all`, then push.
The privacy notice and terms are in `app/src/pilot/legal.ts`.
