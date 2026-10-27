#fits the hierarchical half-life model on the real Duolingo traces (Settles and Meeder, 2016)
#usage: python3 run_real_duolingo.py path/to/settles.acl16.learning_traces.13m.csv.gz
#the subset keeps English speakers learning Spanish, the 300 most active users and the 150 most practiced words
import json
import sys
import time
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).parent))
import decay_model as dm  # noqa: E402
import run_model as rm  # noqa: E402

N_ROWS = 3_000_000
N_USERS = 300
N_WORDS = 150
MAX_DELTA_DAYS = 60


def load_subset(path):
    #reading the first N_ROWS rows keeps memory low; the file is ordered by time
    cols = ["p_recall", "delta", "user_id", "learning_language", "ui_language", "lexeme_id",
            "session_seen", "session_correct", "history_seen", "history_correct"]
    df = pd.read_csv(path, nrows=N_ROWS, usecols=cols)
    n_read = len(df)
    df = df[(df["learning_language"] == "es") & (df["ui_language"] == "en")]
    df["delta_days"] = df["delta"] / 86400.0
    #dropping same-day reviews and very long gaps, which the half-life form fits poorly
    df = df[(df["delta_days"] >= 0.01) & (df["delta_days"] <= MAX_DELTA_DAYS)]
    top_users = df["user_id"].value_counts().index[:N_USERS]
    df = df[df["user_id"].isin(top_users)]
    top_words = df["lexeme_id"].value_counts().index[:N_WORDS]
    df = df[df["lexeme_id"].isin(top_words)].copy()
    df["user_id"] = df["user_id"].astype("category").cat.codes
    df["lexeme_id"] = df["lexeme_id"].astype("category").cat.codes
    return df.reset_index(drop=True), n_read


def fit_lean(train, n_users, n_items):
    #same model as run_model.fit, without storing per-row deterministics, so 8000 draws fit in memory
    import pymc as pm
    t0 = time.time()
    u = train["user_id"].to_numpy()
    i = train["lexeme_id"].to_numpy()
    with pm.Model():
        mu = pm.Normal("mu", mu=1.0, sigma=1.0)
        sigma_user = pm.HalfNormal("sigma_user", sigma=1.0)
        sigma_item = pm.HalfNormal("sigma_item", sigma=1.0)
        user_offset = pm.Normal("user_offset", mu=0, sigma=sigma_user, shape=n_users)
        item_offset = pm.Normal("item_offset", mu=0, sigma=sigma_item, shape=n_items)
        #practice history terms, as in half-life regression: more right answers lengthen the half-life, more wrong ones shorten it
        b_right = pm.Normal("b_right", mu=0, sigma=1)
        b_wrong = pm.Normal("b_wrong", mu=0, sigma=1)
        x_right = np.sqrt(1 + train["history_correct"].to_numpy())
        x_wrong = np.sqrt(1 + train["history_seen"].to_numpy() - train["history_correct"].to_numpy())
        halflife = 2 ** (mu + user_offset[u] + item_offset[i] + b_right * x_right + b_wrong * x_wrong)
        #ceiling below 1 lets errors right after practice count as slips instead of fast forgetting
        ceiling = pm.Beta("ceiling", alpha=9, beta=1)
        p = pm.math.clip(ceiling * 2 ** (-train["delta_days"].to_numpy() / halflife), 1e-4, 1 - 1e-4)
        pm.Binomial("obs", n=train["session_seen"].to_numpy(), p=p, observed=train["session_correct"].to_numpy())
        rm.log(f"  sampling {rm.CHAINS} chains x {rm.DRAWS} draws (tune {rm.TUNE}) on {len(train):,} rows")
        idata = pm.sample(draws=rm.DRAWS, tune=rm.TUNE, chains=rm.CHAINS, cores=2, target_accept=0.9,
                          progressbar=False, random_seed=42)
    rm.log(f"  done in {(time.time() - t0) / 60:.1f} min")
    return idata


def halflife_with_history(idata, df):
    post = idata.posterior
    m = lambda v: post[v].mean(dim=["chain", "draw"]).values
    x_right = np.sqrt(1 + df["history_correct"].to_numpy())
    x_wrong = np.sqrt(1 + df["history_seen"].to_numpy() - df["history_correct"].to_numpy())
    return 2 ** (float(m("mu")) + m("user_offset")[df["user_id"].to_numpy()] + m("item_offset")[df["lexeme_id"].to_numpy()]
                 + float(m("b_right")) * x_right + float(m("b_wrong")) * x_wrong)


def predict_with_history(idata, df):
    return float(idata.posterior["ceiling"].mean()) * 2 ** (-df["delta_days"].to_numpy() / halflife_with_history(idata, df))


def main(path):
    df, n_read = load_subset(path)
    rm.log(f"real Duolingo subset: {len(df):,} rows from the first {n_read:,}, "
           f"{df['user_id'].nunique()} users, {df['lexeme_id'].nunique()} words, mean recall {df['p_recall'].mean():.3f}")
    tr, te = dm.train_test_split_by_row(df)
    gh = dm.fit_global_average_baseline(tr)
    y = te["p_recall"].to_numpy()
    base_mae = float(np.mean(np.abs(y - dm.predict_baseline(te, gh))))
    #a constant guess of the training mean is a second, harder baseline because most recalls are 1
    mean_mae = float(np.mean(np.abs(y - tr["p_recall"].mean())))
    idata = fit_lean(tr, int(df["user_id"].max()) + 1, int(df["lexeme_id"].max()) + 1)
    pred = predict_with_history(idata, te)
    hier_mae = float(np.mean(np.abs(y - pred)))
    #scoring probability forecasts: Brier score and binomial log loss, where lower is better
    def scores(q):
        q = np.clip(q, 1e-4, 1 - 1e-4)
        k, n = te["session_correct"].to_numpy(), te["session_seen"].to_numpy()
        return float(np.mean((y - q) ** 2)), float(-np.sum(k * np.log(q) + (n - k) * np.log(1 - q)) / n.sum())
    base_q = dm.predict_baseline(te, gh).to_numpy()
    mean_q = np.full(len(te), tr["p_recall"].mean())
    brier = {"hierarchical": scores(pred), "global_halflife": scores(base_q), "constant_mean": scores(mean_q)}
    post = idata.posterior
    hl = halflife_with_history(idata, tr)
    part = {"data": f"real Duolingo HLR traces: English speakers learning Spanish, {len(df):,} rows "
                    f"({df['user_id'].nunique()} users, {df['lexeme_id'].nunique()} words) from the first {n_read:,} rows",
            "brier_logloss": brier, "baseline_mae": base_mae, "mean_baseline_mae": mean_mae, "hierarchical_mae": hier_mae,
            "global_halflife_days": float(gh), **rm.diagnostics(idata, "duolingo_real"),
            "ceiling": float(idata.posterior["ceiling"].mean()), "b_right": float(idata.posterior["b_right"].mean()), "b_wrong": float(idata.posterior["b_wrong"].mean()),
            "calibration_gap": rm.calibration(y, pred, "duolingo_real"),
            "halflife_range_days": [float(np.percentile(hl, 1)), float(np.percentile(hl, 99))],
            "date": time.strftime("%Y-%m-%d")}
    import arviz as az
    extra = az.summary(idata, var_names=["b_right", "b_wrong", "ceiling"])
    part["rhat_max"] = max(part["rhat_max"], float(extra["r_hat"].max()))
    part["ess_bulk_min"] = min(part["ess_bulk_min"], float(extra["ess_bulk"].min()))
    out = rm.OUT / "summary_real_duolingo.json"
    out.write_text(json.dumps(part, indent=2))
    rm.log(json.dumps(part, indent=2))


if __name__ == "__main__":
    main(sys.argv[1])
