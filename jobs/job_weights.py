#turns real job postings into job weights for the skills in the data science module
#usage: python3 jobs/job_weights.py path/to/data_jobs_data/data
#data: Glassdoor postings scraped in June 2020 for data analyst, data scientist, business analyst
#and data engineer searches (github.com/picklesueat/data_jobs_data, MIT license)
#a weight is the share of postings for a role that ask for the skill, scaled so the role's most asked skill is 1.0
import json
import re
import sys
from pathlib import Path

import numpy as np
import pandas as pd

OUT = Path(__file__).parent / "out"

#each role: which file it comes from and which job titles count
ROLES = {
    "Data analyst": ("DataAnalyst.csv", r"data analyst|analyst"),
    "Data scientist": ("DataScientist.csv", r"data scien"),
    "Business analyst": ("BusinessAnalyst.csv", r"business analyst|business systems analyst|business intelligence analyst"),
    "ML engineer": (["DataScientist.csv", "DataEngineer.csv"], r"machine learning engineer|\bml engineer|machine learning scientist|ai engineer"),
}

#senior titles left out, since Recall is for recent graduates
SENIOR = r"\b(senior|sr\.?|lead|principal|manager|director|head|staff|vp|chief|iii|iv)\b"

#phrases that count as asking for each skill; written to miss loose uses like "regression testing"
SKILLS = {
    "cleaning": r"data cleaning|clean(?:ing|se|sing)? (?:the |large |raw |messy )?data|data (?:preparation|wrangling|munging|quality|validation)|\betl\b|wrangl",
    "exploring": r"visuali[sz]|tableau|power ?bi|dashboard|exploratory|looker|matplotlib|ggplot|qlik|plotting|charts? and graphs",
    "probability": r"probabilit|stochastic|statistical distributions|monte carlo",
    "inference": r"hypothesis test|statistical (?:inference|significance|tests?|testing|analysis)|significance test|confidence interval|t-tests?|anova|chi-square|sampling methods",
    "regression": r"(?<!debugging )regression(?!\s*test)",
    "causal": r"causal|a/b test|ab test|experiment(?:al)? design|design of experiments|randomi[sz]ed|controlled experiment|counterfactual|difference.in.difference|incrementality|uplift",
    "ml": r"machine learning|predictive model|deep learning|neural net|random forest|scikit|sklearn|xgboost|classification model|clustering|supervised",
    "bayesian": r"bayes",
    "pythonsql": r"\bpython\b|sql|pandas|numpy",
    "communicating": r"communicat\w* (?:complex|technical|analytical|data|findings|results|insights)|present\w* (?:findings|results|insights|recommendations)|storytelling|non-technical (?:audience|stakeholders|users)|(?:written and verbal|verbal and written|oral and written|written and oral) communication",
}

NAMES = {
    "cleaning": "Data cleaning and preparation", "exploring": "Exploring and plotting data", "probability": "Probability",
    "inference": "Statistical inference", "regression": "Regression", "causal": "Causal thinking",
    "ml": "Machine learning basics", "bayesian": "Bayesian modeling", "pythonsql": "Python and SQL for data",
    "communicating": "Communicating results",
}


def load_role(folder, files, title_pattern):
    files = files if isinstance(files, list) else [files]
    df = pd.concat([pd.read_csv(folder / f) for f in files], ignore_index=True)
    #dropping repeats of the same posting, the scraper saw some twice
    df = df.drop_duplicates(subset=["Job Title", "Company Name", "Job Description"])
    title = df["Job Title"].str.lower()
    keep = title.str.contains(title_pattern, regex=True) & ~title.str.contains(SENIOR, regex=True)
    return df[keep]


def asks_for(descriptions):
    text = descriptions.str.lower()
    return pd.DataFrame({k: text.str.contains(p, regex=True) for k, p in SKILLS.items()})


def interval(hits, n_boot=2000, seed=0):
    #bootstrap over postings for a 95% interval on each share
    rng = np.random.default_rng(seed)
    arr = hits.to_numpy()
    shares = np.array([arr[rng.integers(0, len(arr), len(arr))].mean(axis=0) for _ in range(n_boot)])
    lo, hi = np.percentile(shares, [2.5, 97.5], axis=0)
    return dict(zip(hits.columns, lo)), dict(zip(hits.columns, hi))


def main(folder):
    folder = Path(folder)
    OUT.mkdir(exist_ok=True)
    result, all_hits = {}, []
    for role, (files, pattern) in ROLES.items():
        df = load_role(folder, files, pattern)
        hits = asks_for(df["Job Description"])
        all_hits.append(hits)
        share = hits.mean()
        lo, hi = interval(hits)
        top = share.max()
        result[role] = {
            "postings": int(len(df)),
            "skills": {k: {"share": round(float(share[k]), 3), "low": round(float(lo[k]), 3), "high": round(float(hi[k]), 3),
                           "weight": round(float(share[k] / top), 2)} for k in SKILLS},
        }
    #"Other" pools every posting so a user without a listed role still gets a ranking
    pooled = pd.concat(all_hits, ignore_index=True)
    share = pooled.mean()
    result["Other"] = {"postings": int(len(pooled)), "skills": {k: {"share": round(float(share[k]), 3), "weight": round(float(share[k] / share.max()), 2)} for k in SKILLS}}

    #sensitivity check: does keeping senior postings change the ranking?
    from scipy.stats import spearmanr
    checks = {}
    for role, (files, pattern) in ROLES.items():
        files_l = files if isinstance(files, list) else [files]
        df = pd.concat([pd.read_csv(folder / f) for f in files_l], ignore_index=True).drop_duplicates(subset=["Job Title", "Company Name", "Job Description"])
        df = df[df["Job Title"].str.lower().str.contains(pattern, regex=True)]
        with_senior = asks_for(df["Job Description"]).mean()
        junior = pd.Series({k: result[role]["skills"][k]["share"] for k in SKILLS})
        checks[role] = {"postings_with_senior": int(len(df)), "spearman_vs_entry_level": round(float(spearmanr(junior, with_senior[junior.index]).statistic), 3)}
    result["_checks"] = checks
    result["_source"] = "Glassdoor postings scraped June 2020, github.com/picklesueat/data_jobs_data; senior titles removed; weight = share of postings asking for the skill / share for the role's most asked skill"

    spot_check(folder, 8)
    (OUT / "job_weights.json").write_text(json.dumps(result, indent=2))
    plot(result)
    for role in ROLES:
        r = result[role]
        print(f"\n{role} ({r['postings']} postings)")
        for k, v in sorted(r["skills"].items(), key=lambda kv: -kv[1]["share"]):
            print(f"  {NAMES[k]:32s} {v['share']*100:5.1f}%  [{v['low']*100:4.1f}-{v['high']*100:4.1f}]  weight {v['weight']:.2f}")
    print("\nchecks", json.dumps(checks, indent=1))


def spot_check(folder, per_skill, seed=1):
    #random matched snippets per skill, so a person can read whether the phrase really asks for the skill
    import random
    random.seed(seed)
    texts = []
    for files, pattern in ROLES.values():
        texts += list(load_role(folder, files, pattern)["Job Description"].str.lower())
    lines = ["# Spot check: random matched snippets per skill", ""]
    for k, p in SKILLS.items():
        found = []
        for t in texts:
            m = re.search(p, t)
            if m:
                found.append(t[max(0, m.start() - 70):m.end() + 60].replace("\n", " "))
        lines += [f"## {NAMES[k]} ({len(found)} postings matched)", ""]
        lines += [f"- [ ] ...{x}..." for x in random.sample(found, min(per_skill, len(found)))]
        lines.append("")
    (OUT / "spot_check.md").write_text("\n".join(lines))


def plot(result):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    roles = [r for r in ROLES]
    order = sorted(SKILLS, key=lambda k: -np.mean([result[r]["skills"][k]["share"] for r in roles]))
    colors = ["#2F5D8A", "#7E9CBC", "#E8B656", "#566270"]
    fig, ax = plt.subplots(figsize=(9, 5.2), dpi=200)
    h = 0.2
    y = np.arange(len(order))
    for i, r in enumerate(roles):
        vals = [result[r]["skills"][k]["share"] * 100 for k in order]
        ax.barh(y + (i - 1.5) * h, vals, height=h, color=colors[i], label=f"{r} ({result[r]['postings']})")
    ax.set_yticks(y, [NAMES[k] for k in order])
    ax.invert_yaxis()
    ax.set_xlabel("Share of postings that ask for the skill (%)")
    ax.legend(frameon=False, fontsize=8, loc="lower right")
    for s in ["top", "right"]:
        ax.spines[s].set_visible(False)
    fig.tight_layout()
    fig.savefig(OUT / "job_weights.png")


if __name__ == "__main__":
    main(sys.argv[1])
