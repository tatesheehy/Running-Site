# Athlete sync scripts

A small, polite pipeline that grows the StatTC athlete database from World
Athletics **incrementally** — a few athletes per run — so it never looks like a
scrape and stays under WA's bot-protection radar.

There is **no always-on process**. `cron` (or `launchd`) is what makes it "keep
going": each run does one small batch and exits. That's the whole "agent."

## The three scripts

| Script | What it does |
| --- | --- |
| `build_queue.py` | Reads a WA world-rankings list (default men's 1500m, top 500), drops anyone already in `_data/athletes.json`, and writes the rest to `sync-queue.json`. Re-run any time to top up the queue. |
| `sync_athletes.py` | **Default (add):** pops up to `--batch` (8) new athletes off the queue, fetches full profile + 5 years of history, merges into `_data/athletes.json`, removes them from the queue. **`--refresh`:** re-fetches only current-season results for athletes whose `lastSynced` is ≥ `--stale-days` (7) old. |

`sync-queue.json` = pending work. `sync-log.txt` = append-only run log.

## Manual use

```bash
cd running-site
python3 scripts/build_queue.py                 # (re)build the pending queue
python3 scripts/sync_athletes.py               # add up to 8 new athletes
python3 scripts/sync_athletes.py --batch 15    # add up to 15
python3 scripts/sync_athletes.py --refresh     # weekly: refresh stale in-season results
```

Every run backs off instantly on the first `403/429/503` or WAF challenge,
leaving the queue intact so nothing is lost — just retry later.

## Running it "slowly, on its own" (cron)

Add small paced batches a few times a day, plus one weekly refresh. `crontab -e`:

```cron
# Add ~8 new athletes at 09:00, 14:00, 19:00 daily (≈24/day → full 500 in ~2.5 weeks)
0 9,14,19 * * *  cd /Users/tsheehy/Documents/GitHub/Running-Site/running-site && /usr/bin/python3 scripts/sync_athletes.py --batch 8 >> scripts/sync-log.txt 2>&1

# Refresh stale in-season results once a week (Mon 06:00)
0 6 * * 1        cd /Users/tsheehy/Documents/GitHub/Running-Site/running-site && /usr/bin/python3 scripts/sync_athletes.py --refresh >> scripts/sync-log.txt 2>&1
```

Tune the cadence down (fewer runs / smaller `--batch`) if you ever see throttling
in the log. Slower is always safer.

## Notes

* New athletes get `aaId` / `countryCode3` metadata fields the site ignores.
* Unknown country codes fall back to showing the raw code as text — add the flag
  to `js/flags.js` if you want the icon (e.g. `TR` for Turkey is currently missing).
* Requires only the Python standard library.
