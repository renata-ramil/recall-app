"""
Midterm run of the hierarchical decay model: 4 chains, 2000 draws, with
diagnostics, a calibration plot, and a demo-user schedule for the prototype.

Reuses the model code from decay_model.py (the first version). Part 1 uses
the real Duolingo file when DUOLINGO_CSV_PATH exists, else the schema-matched
synthetic stand-in, and the report says which one ran.

Outputs (model/out/):
  summary.json            headline numbers for the report
  diagnostics_*.csv       R-hat and ESS per parameter group
  calibration_*.png       predicted vs observed recall, binned
  demo_schedule.json      per-topic half-life, recall today, fade date, priority (for the prototype)
  run.log                 everything printed

Run:  python3 run_model.py            (about 10 to 25 minutes on 2 cores)
      DUOLINGO_CSV_PATH=/path/to/settles.acl16.learning_traces.13m.csv.gz python3 run_model.py
"""
import json
import os
import sys
import time
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).parent))
import decay_model as dm  # noqa: E402

import arviz as az  # noqa: E402
import matplotlib  # noqa: E402

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

OUT = Path(__file__).parent / "out"
OUT.mkdir(exist_ok=True)
CHAINS, DRAWS, TUNE = 4, 2000, 1000
DUO_PATH = os.environ.get("DUOLINGO_CSV_PATH", dm.DUOLINGO_CSV_PATH)
TOPICS = ["T01", "T02", "T03", "T04", "T05", "T06", "T07", "T08", "T09", "T10"]
# hand-made stand-in for the job-posting weights (0 to 1); replaced by the NLP weights in the full draft
JOB_WEIGHTS = {"T01": 0.9, "T02": 0.7, "T03": 0.5, "T04": 0.8, "T05": 0.7,
               "T06": 0.6, "T07": 0.8, "T08": 0.4, "T09": 1.0, "T10": 0.8}


def log(msg):
    print(msg, flush=True)
    with (OUT / "run.log").open("a") as f:
        f.write(msg + "\n")


def fit(train, n_users, n_items, user_col, item_col):
    import pymc as pm
    t0 = time.time()
    user_idx = train[user_col].to_numpy()
    item_idx = train[item_col].to_numpy()
    delta = train["delta_days"].to_numpy()
    seen = train["session_seen"].to_numpy()
    correct = train["session_correct"].to_numpy()
    with pm.Model():
        mu = pm.Normal("mu", mu=1.0, sigma=1.0)
        sigma_user = pm.HalfNormal("sigma_user", sigma=1.0)
        sigma_item = pm.HalfNormal("sigma_item", sigma=1.0)
        user_offset = pm.Normal("user_offset", mu=0, sigma=sigma_user, shape=n_users)
        item_offset = pm.Normal("item_offset", mu=0, sigma=sigma_item, shape=n_items)
        log2_h = mu + user_offset[user_idx] + item_offset[item_idx]
        halflife = pm.Deterministic("halflife", 2 ** log2_h)
        p = pm.math.clip(2 ** (-delta / halflife), 1e-4, 1 - 1e-4)
        pm.Binomial("obs", n=seen, p=p, observed=correct)
        log(f"  sampling {CHAINS} chains x {DRAWS} draws (tune {TUNE}) on {len(train):,} rows ...")
        idata = pm.sample(draws=DRAWS, tune=TUNE, chains=CHAINS, cores=2, target_accept=0.9,
                          progressbar=False, random_seed=42)
    log(f"  done in {(time.time() - t0) / 60:.1f} min")
    return idata


def diagnostics(idata, label):
    summ = az.summary(idata, var_names=["mu", "sigma_user", "sigma_item", "user_offset", "item_offset"])
    summ.to_csv(OUT / f"diagnostics_{label}.csv")
    rhat_max = float(summ["r_hat"].max())
    ess_min = float(summ["ess_bulk"].min())
    div = int(idata.sample_stats["diverging"].sum())
    log(f"  {label}: max R-hat {rhat_max:.3f}, min bulk ESS {ess_min:.0f}, divergences {div}")
    return {"rhat_max": rhat_max, "ess_bulk_min": ess_min, "divergences": div}


def calibration(y_true, y_pred, label):
    bins = np.linspace(0, 1, 11)
    idx = np.clip(np.digitize(y_pred, bins) - 1, 0, 9)
    xs, ys, ns = [], [], []
    for b in range(10):
        m = idx == b
        if m.sum() >= 20:
            xs.append(y_pred[m].mean()); ys.append(y_true[m].mean()); ns.append(int(m.sum()))
    fig, ax = plt.subplots(figsize=(5, 5))
    ax.plot([0, 1], [0, 1], color="#999", lw=1)
    ax.scatter(xs, ys, s=[max(20, n / 10) for n in ns], color="#2f6fed")
    ax.set_xlabel("Predicted recall"); ax.set_ylabel("Observed recall")
    ax.set_title(f"Calibration: {label}")
    fig.tight_layout(); fig.savefig(OUT / f"calibration_{label}.png", dpi=150); plt.close(fig)
    gap = float(np.mean(np.abs(np.array(xs) - np.array(ys)))) if xs else float("nan")
    log(f"  {label}: mean calibration gap across bins {gap:.3f}")
    return gap


def demo_schedule(idata, user_id, n_topics=10):
    """Per-topic half-life for one user, recall today, fade date, priority for the prototype."""
    post = idata.posterior
    mu = float(post["mu"].mean())
    uo = float(post["user_offset"].mean(dim=["chain", "draw"]).values[user_id])
    io = post["item_offset"].mean(dim=["chain", "draw"]).values[:n_topics]
    io_sd = post["item_offset"].std(dim=["chain", "draw"]).values[:n_topics]
    demo_days = {"T01": 9, "T02": 27, "T03": 35, "T04": 14, "T05": 20, "T06": 12, "T07": 16, "T08": 7, "T09": 4, "T10": 18}
    days_since = np.array([demo_days[t] for t in TOPICS])  # fixed demo spread: days since last practice
    rows = []
    for k, t in enumerate(TOPICS):
        h = 2 ** (mu + uo + io[k])
        recall = 2 ** (-days_since[k] / h)
        fade_day = h * np.log2(1 / 0.6)  # days from last practice until recall drops below 0.6
        days_to_fade = max(0.0, fade_day - days_since[k])
        priority = (1 - recall) * JOB_WEIGHTS[t]
        rows.append({"topic": t, "halflife_days": round(float(h), 1),
                     "halflife_sd_log2": round(float(io_sd[k]), 2),
                     "days_since_practice": int(days_since[k]), "recall_today": round(float(recall), 2),
                     "days_until_fade": round(float(days_to_fade), 1), "job_weight": JOB_WEIGHTS[t],
                     "priority": round(float(priority), 3)})
    rows.sort(key=lambda r: -r["priority"])
    return {"user_id": int(user_id), "mu": mu, "user_offset": uo, "generated": time.strftime("%Y-%m-%d"),
            "note": "Schedule for a demo user from the skill-decay model (synthetic data). Topics map to the data science module.",
            "topics": rows}


def main():
    (OUT / "run.log").write_text("")
    summary = {"chains": CHAINS, "draws": DRAWS, "tune": TUNE, "date": time.strftime("%Y-%m-%d")}

    log("=" * 60); log("PART 1: Duolingo-schema data")
    if Path(DUO_PATH).exists():
        duo = dm.load_duolingo_traces(DUO_PATH)
        duo = duo.rename(columns={"delta": "delta_seconds"})
        duo["delta_days"] = duo["delta_seconds"] / 86400.0
        duo = duo.sample(n=min(len(duo), 200_000), random_state=42)
        duo["user_id"] = duo["user_id"].astype("category").cat.codes
        duo["lexeme_id"] = duo["lexeme_id"].astype("category").cat.codes
        summary["part1_data"] = f"real Duolingo HLR traces, {len(duo):,}-row sample"
    else:
        duo = dm.generate_synthetic_duolingo_traces(n_users=120, n_lexemes=25)
        summary["part1_data"] = "synthetic stand-in (real file not reachable from this machine)"
    log(f"  data: {summary['part1_data']}")
    n_u, n_l = int(duo["user_id"].max()) + 1, int(duo["lexeme_id"].max()) + 1
    tr, te = dm.train_test_split_by_row(duo)
    gh = dm.fit_global_average_baseline(tr)
    base_mae = float(dm.evaluate("baseline", te["p_recall"].to_numpy(), dm.predict_baseline(te, gh)))
    idata1 = fit(tr, n_u, n_l, "user_id", "lexeme_id")
    pred1 = dm.predict_hierarchical(idata1, te, "user_id", "lexeme_id")
    hier_mae = float(dm.evaluate("hierarchical", te["p_recall"].to_numpy(), pred1))
    summary["part1"] = {"baseline_mae": base_mae, "hierarchical_mae": hier_mae,
                        "global_halflife_days": float(gh), **diagnostics(idata1, "duolingo"),
                        "calibration_gap": calibration(te["p_recall"].to_numpy(), pred1, "duolingo")}
    hl = idata1.posterior["halflife"].values.flatten()
    summary["part1"]["halflife_range_days"] = [float(np.percentile(hl, 1)), float(np.percentile(hl, 99))]

    log("=" * 60); log("PART 2: synthetic skill-decay data (known ground truth)")
    sk, tu, ts = dm.generate_synthetic_skill_decay_data(n_users=60, n_skills=12)
    tr2, te2 = dm.train_test_split_by_row(sk)
    idata2 = fit(tr2, 60, 12, "user_id", "skill_id")
    pred2 = dm.predict_hierarchical(idata2, te2, "user_id", "skill_id")
    mae2 = float(dm.evaluate("hierarchical (skill decay)", te2["p_recall"].to_numpy(), pred2))
    uc, sc = dm.check_parameter_recovery(idata2, tu, ts)
    summary["part2"] = {"hierarchical_mae": mae2, "user_offset_corr": float(uc), "skill_offset_corr": float(sc),
                        **diagnostics(idata2, "skilldecay"),
                        "calibration_gap": calibration(te2["p_recall"].to_numpy(), pred2, "skilldecay")}

    sched = demo_schedule(idata2, user_id=0)
    (OUT / "demo_schedule.json").write_text(json.dumps(sched, indent=2))
    (OUT / "summary.json").write_text(json.dumps(summary, indent=2))
    log(json.dumps(summary, indent=2))
    log("Done.")


if __name__ == "__main__":
    main()
