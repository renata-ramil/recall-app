# Prototype test protocol (25 minutes per call)

Every call is a product test under the IRB exemption: questions are about the product and about recent graduates, never about the person. Notes go in `test_notes.csv` (one row per call, codes P1, P2, ...). Emails stay in a separate sheet.

## 0:00 Opening (1 min)
Read the opening script from the Interview Kit. Record `consent_yes`.

## 0:01 Problem check (4 min)
Ask the four problem-check questions from the Interview Kit. Fill `problem_miss_most`, `problem_faded_skill_when`, `problem_priority` (keeping skills fresh / learning new skills for the job / applying a recent course at work / something else), `problem_notice_moment` (job interview / new job first week / project at work / none / other).

## 0:05 Screen (3 min)
Upload and price questions. Fill `screen_upload` (yes / maybe / no), `screen_upload_reason`, `screen_pay` (yes / maybe / no), `screen_price_payer`.

## 0:08 Prototype, part 1: setup (4 min, screen share, tester drives)
Send the prototype link. Say: "Go through setup as if it were real. Use the demo transcript button. Think out loud." Time it. Fill `task_setup_done`, `task_setup_seconds`, and anything confusing into `confusion_points`.

Ask while on the plan screen: "Does a list of skills fading by an estimated date feel believable to graduates? What would make it more believable?" Fill `believability_of_fade_estimate` (high / medium / low).

## 0:12 Prototype, part 2: the session (6 min)
Say: "Do today's practice. Say what you expect before you tap." Time it. Fill `task_session_done`, `task_session_seconds`, `recall_right_of_3`, `scenario_decisions_right_of_2`.

Ask after: "Which parts of this would be confusing for people using it?" Add to `confusion_points`. "Where would a 5-minute practice fit in a graduate's day?" Fill `schedule_fit`. "How would graduates feel about an app that joins what they learned with a map of what jobs need?" Fill `skills_map_reaction` (positive / neutral / skeptical).

## 0:18 Needs and jobs (5 min)
From the Interview Kit sections B and C. Fill `needs_basic`, `needs_performance`, `needs_delight`, `job_functional`, `job_emotional`, `job_social` with short phrases.

## 0:23 Close (2 min)
"Who else should I talk to?" Thank them.

## Right after the call (5 min)
Fill `new_themes_count` (themes not heard in any earlier call), `top_themes` (semicolon-separated), `design_change` (one concrete change, or "none"). Make the change in the prototype the same day and note it in the change log.

## Rendering results
`python3 analyze_tests.py test_notes.csv` writes `results.md`, the results section of the midterm PDF. Run it after every call to watch saturation.

## Change log
| Date | From | Change | Where |
| --- | --- | --- | --- |
| | | | |
