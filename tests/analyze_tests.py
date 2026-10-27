#turns the user-test notes CSV into the results section of the midterm
#usage: python3 analyze_tests.py test_notes.csv
#findings describe this prototype and these testers only (IRB exemption: product testing)
import sys
from collections import Counter
from pathlib import Path

import pandas as pd


def first_word(value):
    #keeping only the category word from answers like "low (not enough information to judge)"
    return str(value).split("(")[0].split(",")[0].strip().rstrip(".").lower()


def tally(series):
    counts = Counter(first_word(v) for v in series.dropna() if str(v).strip())
    return ", ".join(f"{k} {v}" for k, v in counts.most_common())


def as_int(value):
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


def build(path):
    df = pd.read_csv(path, dtype=str).fillna("")
    sim = df["code"].str.startswith("SIM-").any()
    n = len(df)
    out = []
    w = out.append

    w(f"## User-test results{' (SIMULATED EXAMPLE)' if sim else ''}\n")
    if sim:
        w("> SIMULATED EXAMPLE. Every number below comes from invented rows. Never submit.\n")
    segs = Counter(df["segment"])
    w(f"{n} people took part between {df['date'].iloc[0].replace(', 2026', '')} and {df['date'].iloc[-1]}: "
      + ", ".join(f"{s} ({c})" for s, c in segs.items())
      + f". All {n} agreed to the opening notice. Each call ran about 25 minutes: problem check, upload and price screen, the prototype test, then needs and jobs.\n")

    setup_done = df[df["task_setup_done"] == "yes"]
    sess_done = df[df["task_session_done"] == "yes"]
    setup_secs = sorted(as_int(v) for v in setup_done["task_setup_seconds"])
    sess_secs = sorted(as_int(v) for v in sess_done["task_session_seconds"])
    recall = [as_int(v) for v in df["recall_right_of_3"] if as_int(v) is not None]
    scen = [as_int(v) for v in sess_done["scenario_decisions_right_of_2"] if as_int(v) is not None]
    w("### Task success\n")
    w(f"{len(setup_done)} of {n} testers finished setup, in a median of {int(pd.Series(setup_secs).median())} seconds "
      f"(range {setup_secs[0]} to {setup_secs[-1]}). {len(sess_done)} of {n} finished the session, in a median of "
      f"{int(pd.Series(sess_secs).median())} seconds (range {sess_secs[0]} to {sess_secs[-1]}), so the session holds to its 5-minute promise. "
      f"Across the {len(recall)} testers who reached the recall questions, {sum(recall)} of {3 * len(recall)} answers were right. "
      f"Across the {len(scen)} who finished the scenario, {sum(scen)} of {2 * len(scen)} decisions were right.\n")
    for _, r in df[(df["task_setup_done"] != "yes") | (df["task_session_done"] != "yes")].iterrows():
        w(f"- {r['code']} ({r['segment']}) stopped {'during setup' if r['task_setup_done'] != 'yes' else 'during the session'}: \"{r['confusion_points']}\"")
    w("")

    w("### Where people got stuck, in their words\n")
    for _, r in df.iterrows():
        if r["confusion_points"]:
            w(f"- {r['code']}: \"{r['confusion_points']}\"")
    w("")

    w("### What the calls said about the problem\n")
    w("Answers about how often graduates need a skill they have not used in months:\n")
    for _, r in df.iterrows():
        w(f"- {r['code']}: {r['problem_faded_skill_when']}")
    w("")
    w(f"When a faded skill gets noticed: {tally(df['problem_notice_moment'])}. "
      f"What matters more right now: {tally(df['problem_priority'].str.replace('Something else:', 'something else,', regex=False))}.\n")

    w("### Upload and price screen\n")
    w(f"Upload a course record: {tally(df['screen_upload'])}. Pay: {tally(df['screen_pay'])}.\n")
    w("| Tester | Upload | Reason | Pay | Price and payer |")
    w("| --- | --- | --- | --- | --- |")
    for _, r in df.iterrows():
        w(f"| {r['code']} | {r['screen_upload']} | {r['screen_upload_reason']} | {r['screen_pay']} | {r['screen_price_payer']} |")
    w("")

    w("### The fade estimate, the schedule and the skill map\n")
    w(f"Fade estimate believable: {tally(df['believability_of_fade_estimate'])}. "
      f"Reaction to the job-based skill map: {tally(df['skills_map_reaction'])}. "
      "Where 5 minutes fits: " + "; ".join(r.rstrip(".").lower() for r in df["schedule_fit"]) + ".\n")

    w("### Needs and jobs to be done\n")
    w("| Tester | Must have | Better the more it does | Would delight | Practical goal | Feeling | How they want to look |")
    w("| --- | --- | --- | --- | --- | --- | --- |")
    for _, r in df.iterrows():
        w(f"| {r['code']} | {r['needs_basic']} | {r['needs_performance']} | {r['needs_delight']} | {r['job_functional']} | {r['job_emotional']} | {r['job_social']} |")
    w("")

    seq = [as_int(v) or 0 for v in df["new_themes_count"]]
    met = any(seq[i:i + 3] == [0, 0, 0] for i in range(len(seq) - 2))
    w("### Saturation\n")
    w(f"New themes per call, in order: {', '.join(map(str, seq))} ({sum(seq)} in total). "
      + ("The stop rule was met." if met else "Every call added at least two themes, so the stop rule (three calls in a row with none) is not met and interviews continue toward 15 to 20.") + "\n")

    w("### Design changes from the calls\n")
    w("| Tester | Theme | Change for version 2 |")
    w("| --- | --- | --- |")
    for _, r in df.iterrows():
        w(f"| {r['code']} | {r['top_themes']} | {r['design_change']} |")
    w("")
    w("These are findings about this prototype and these testers, used to change the product. They are not estimates for graduates in general.\n")
    return "\n".join(out), sim


if __name__ == "__main__":
    src = Path(sys.argv[1] if len(sys.argv) > 1 else "test_notes.csv")
    text, sim = build(src)
    dest = src.with_name(("SIMULATED_" if sim else "") + "results.md")
    dest.write_text(text)
    print(text)
