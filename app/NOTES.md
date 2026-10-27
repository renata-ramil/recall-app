# Decisions and defaults

## Defaults
1. Verdict for right but not sure: "Right. Now you know it." (`verdicts.rightNotSure` in mock-data.json).
2. Scenario step 2: the "what should happen next" step from scenario S01 in the content bank, four options, key A.
3. Scenario scoring: one point per step; step 3 counts when no checkpoint is Missed (`scenarioPoints` in Session.tsx). The summary shows the computed score, so the designed "3 of 3" appears only when the session earns it.
4. Scenario step 1 shows no right or wrong feedback; the choice is recorded and the flow continues.
5. Gilroy is self-hosted from the supplied files for development only.

## Calls the design did not cover
- Three recall questions: mock-data.json had one. Two more (statistical inference, communicating results) were added from the capstone item bank in the same shape, so the session matches the designed "3 skills to refresh".
- Fade banner: names the next skill still above 60% that is close to fading ("Statistical inference is close to fading"). Fade status is shown as three states (faded, fading soon, solid) with no day counts or countdown, since the model's uncertainty is too wide for a date.
- Recall questions have an "I don't know" button that records the item as not recalled, so a random guess never counts as remembering.
- Greeting uses the device clock (before 12:00 morning, 12:00 to 17:59 afternoon, after evening).
- Finish month and year are native selects styled as filled pills; the option list covers 2022 to 2027.
- Before-upload course record: a paper-2 panel with the note, an "Upload transcript" button and a one-line format hint. Processing: "Reading your transcript" with a navy progress bar on cream-2-d, about 1.3 seconds.
- Course record: "Skip for now" moves on without an upload; after an upload the button becomes "Continue". The upload is simulated: the file is never read, and the result comes from the demo data.
- Topic picker: the name is a button too, so the whole row toggles; each confidence bar is a 44 px tall button; unticked rows show static bars.
- Skills tab reuses the Your plan list under "Your skills" with the same subtitle; rows are buttons that open Skill detail.
- Skill detail header fill follows the skill's state; the back button uses the matching -d token (ochre-d, sand-d, mint-d). The mock supplies one curve and answer history, shown for every skill until the model provides per-skill data.
- Profile: name and finish date line, the four single-select survey groups as editable rows, "Pause reminders" toggles to "Resume reminders", "Delete my data" clears localStorage and returns to Welcome.
- Completed Today: the session block keeps its layout and swaps the button for the "Done for today" line in cream; the streak count adds one.
- Step 3 of the scenario shows "Compare with a model answer" before the model answer and ratings appear; the design shows the after state.
- Routes before onboarding redirect to Welcome. Session state (answers, step, text, ratings) persists in localStorage, so a refresh mid-session resumes.
- Pixel comparison: every designed screen matches its PNG except sub-pixel antialiasing on identical glyphs (under 700 differing pixels at 2x on the largest, the chart card).
