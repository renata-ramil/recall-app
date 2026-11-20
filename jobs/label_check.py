#makes a hand-label sheet of 50 random postings, then scores the keyword rules against the hand labels
#usage: python3 jobs/label_check.py make path/to/data_jobs_data/data   (writes jobs/out/label_sheet.csv)
#       python3 jobs/label_check.py score                              (after the 1/0 columns are filled in)
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent))
from job_weights import OUT, ROLES, SKILLS, asks_for, load_role


def make(folder, n=50, seed=7):
    rows = []
    for role, (files, pattern) in ROLES.items():
        df = load_role(Path(folder), files, pattern)
        #sampling in proportion to how often each role is chosen would favor analysts, so each role gets an equal share
        take = df.sample(n - (n // len(ROLES)) * (len(ROLES) - 1) if role == "Data analyst" else n // len(ROLES), random_state=seed)
        for _, r in take.iterrows():
            rows.append({"role": role, "title": r["Job Title"], "company": r["Company Name"], "description": r["Job Description"]})
    sheet = pd.DataFrame(rows).head(n)
    auto = asks_for(sheet["description"]).astype(int)
    for k in SKILLS:
        sheet[f"hand_{k}"] = ""
    sheet.to_csv(OUT / "label_sheet.csv", index_label="id")
    auto.to_csv(OUT / "label_sheet_auto.csv", index_label="id")
    print(f"wrote {len(sheet)} postings to {OUT / 'label_sheet.csv'}")


def score():
    sheet = pd.read_csv(OUT / "label_sheet.csv", index_col="id")
    auto = pd.read_csv(OUT / "label_sheet_auto.csv", index_col="id")
    out = []
    for k in SKILLS:
        hand = pd.to_numeric(sheet[f"hand_{k}"], errors="coerce")
        ok = hand.notna()
        if not ok.any():
            continue
        h, a = hand[ok].astype(int), auto.loc[ok, k]
        agree = (h == a).mean()
        precision = (h[a == 1] == 1).mean() if (a == 1).any() else float("nan")
        recall = (a[h == 1] == 1).mean() if (h == 1).any() else float("nan")
        out.append({"skill": k, "labeled": int(ok.sum()), "agreement": round(agree, 2), "precision": round(precision, 2), "recall": round(recall, 2)})
    print(pd.DataFrame(out).to_string(index=False))


if __name__ == "__main__":
    make(sys.argv[2]) if sys.argv[1] == "make" else score()
