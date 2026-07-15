#!/usr/bin/env python3
"""
Incremental World Athletics -> StatTC athlete syncer.

Design goals (see the sync-strategy discussion):
  * ADD MODE (default): pops a small batch of NEW athletes off scripts/sync-queue.json,
    fetches each profile + historical results, merges into _data/athletes.json, and
    removes them from the queue. Run it on a cron a few times a day and coverage grows
    slowly without ever hammering World Athletics.
  * REFRESH MODE (--refresh): re-fetches only the CURRENT-SEASON results of athletes
    whose `lastSynced` is older than --stale-days (default 7). Historical years, honours
    and bio are treated as permanent and never re-fetched.

Anti-block discipline (every run, not just the first):
  * hard per-run cap (--batch, default 8 new / 25 refresh)
  * randomised 1.2-2.0s pause between athletes, 0.6-1.0s between history-year calls
  * stops the whole run immediately on the first sign of throttling (403 / 429 / WAF)

Nothing here runs on its own. `cron` (or launchd) is what makes it "keep going" —
this script just does one small, polite batch and exits.
"""
import json, re, time, sys, random, ssl, unicodedata, os, argparse, datetime
import urllib.request, urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH  = os.path.join(ROOT, '_data', 'athletes.json')
QUEUE_PATH = os.path.join(ROOT, 'scripts', 'sync-queue.json')
LOG_PATH   = os.path.join(ROOT, 'scripts', 'sync-log.txt')

APPSYNC_URL = 'https://ak33a7mldndxdfb6sznwcinjxy.appsync-api.eu-west-1.amazonaws.com/graphql'
APPSYNC_KEY = 'da2-tul3z5puffbebn4pptbgqj253i'

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
                  '(KHTML, like Gecko) Chrome/120.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml',
}

# python.org build ships without a usable CA store on this machine (curl works via the
# macOS keychain). Point at the system bundle rather than disabling verification.
_SSL_CTX = (ssl.create_default_context(cafile='/etc/ssl/cert.pem')
            if os.path.exists('/etc/ssl/cert.pem') else ssl.create_default_context())

HISTORY_YEARS = [2025, 2024, 2023, 2022, 2021]

SHORT_EVENT = {
    '100 Metres': '100m', '200 Metres': '200m', '400 Metres': '400m', '800 Metres': '800m',
    '1500 Metres': '1500m', '2000 Metres': '2000m', '3000 Metres': '3000m', '5000 Metres': '5000m',
    '10,000 Metres': '10000m', '3000 Metres Steeplechase': '3000m SC',
}
HONOUR_SHORT = {
    'Olympic Games': 'OLY', 'World Championships': 'WC', 'World Indoor Championships': 'WI',
    'World Athletics Indoor Championships': 'WI', 'Diamond League': 'DLF',
    'European Championships': 'EC', 'European Indoor Championships': 'EI',
    'Commonwealth Games': 'CG', 'World U20 Championships': 'WU20',
    'World U23 Championships': 'WU23', 'African Championships': 'AC',
}
# 3-letter WA / IOC codes -> 2-letter ISO used by js/flags.js. Broad coverage for
# athletics nations; unknown codes fall back to text (renders the code as-is).
CC3_TO_2 = {
    'NOR':'NO','KEN':'KE','POR':'PT','RSA':'ZA','GBR':'GB','GER':'DE','FRA':'FR','USA':'US',
    'TUR':'TR','CZE':'CZ','AUS':'AU','ESP':'ES','ITA':'IT','NED':'NL','BEL':'BE','SWE':'SE',
    'MAR':'MA','IRL':'IE','CAN':'CA','AUT':'AT','ALG':'DZ','JPN':'JP','NZL':'NZ','AND':'AD',
    'ETH':'ET','UGA':'UG','TAN':'TZ','POL':'PL','GRE':'GR','SUI':'CH','DEN':'DK','FIN':'FI',
    'CRO':'HR','HUN':'HU','UKR':'UA','BRA':'BR','MEX':'MX','COL':'CO','KOR':'KR','CHN':'CN',
    'IND':'IN','QAT':'QA','BRN':'BH','DJI':'DJ','ERI':'ER','SOM':'SO','BOT':'BW','NGR':'NG',
    'GHA':'GH','CMR':'CM','SEN':'SN','EGY':'EG','TUN':'TN','RUS':'RU','SRB':'RS','EST':'EE',
    'LAT':'LV','LTU':'LT','ISL':'IS','THA':'TH','URU':'UY','GUA':'GT','CUB':'CU','JAM':'JM',
    'TTO':'TT','VIN':'VC',
}

# ── HTTP ──────────────────────────────────────────────────────────────────────
class Throttled(Exception):
    """Raised on the first sign of rate-limiting so the run aborts cleanly."""

def _urlopen(req):
    try:
        return urllib.request.urlopen(req, timeout=25, context=_SSL_CTX)
    except urllib.error.HTTPError as e:
        if e.code in (403, 429, 503):
            raise Throttled(f'HTTP {e.code} from {req.full_url}')
        raise

def http_get(url):
    with _urlopen(urllib.request.Request(url, headers=HEADERS)) as r:
        body = r.read().decode('utf-8', 'ignore')
    if 'awswaf' in body.lower() and '__NEXT_DATA__' not in body:
        raise Throttled('AWS WAF challenge page returned')
    return body

def http_post_json(url, payload):
    data = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data, headers={**HEADERS,
        'Content-Type': 'application/json', 'x-api-key': APPSYNC_KEY})
    with _urlopen(req) as r:
        return json.loads(r.read().decode('utf-8', 'ignore'))

# ── PARSING ───────────────────────────────────────────────────────────────────
def map_event(name): return SHORT_EVENT.get(name, name)

def aaid_from_url(url):
    m = re.search(r'-(\d+)$', url.strip('/'))
    return int(m.group(1)) if m else None

def slugify(name):
    s = unicodedata.normalize('NFKD', name.lower()).encode('ascii', 'ignore').decode('ascii')
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')

def cap_name(name):
    def cap(w):
        if len(w) <= 3 and w.isupper() and w not in ('DE','VAN','DER','DA'):
            return w
        wl = w.capitalize()
        m = re.match(r'^(Mc|Mac)([a-z].+)$', wl, re.I)
        return (m.group(1).capitalize() + m.group(2).capitalize()) if m else wl
    return ' '.join(cap(w) for w in name.split())

def fetch_profile(wa_path):
    html = http_get('https://worldathletics.org' + wa_path)
    m = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.S)
    if not m:
        raise RuntimeError('no __NEXT_DATA__')
    return json.loads(m.group(1))['props']['pageProps']['competitor']

def fetch_history(aa_id, years):
    out = {}
    q = ('query($id:Int,$y:Int,$o:String){getSingleCompetitorResultsDiscipline'
         '(id:$id,resultsByYear:$y,resultsByYearOrderBy:$o){resultsByEvent{discipline '
         'results{date competition mark place}}}}')
    for y in years:
        try:
            resp = http_post_json(APPSYNC_URL, {'query': q,
                'variables': {'id': aa_id, 'y': y, 'o': 'discipline'}})
            grp = ((resp.get('data') or {}).get('getSingleCompetitorResultsDiscipline') or {})
            races = []
            for g in grp.get('resultsByEvent') or []:
                ev = map_event(g['discipline'])
                for r in g.get('results', []):
                    races.append({'date': r['date'], 'meet': r['competition'],
                                  'event': ev, 'time': r['mark'], 'place': r.get('place', '')})
            if races:
                out[str(y)] = races
        except Throttled:
            raise
        except Exception as e:
            log(f'    history {y} failed: {e}')
        time.sleep(0.6 + random.random() * 0.4)
    return out

def wa_date_to_short(date):
    p = date.split()
    return f'{p[1].upper()} {int(p[0])}' if len(p) >= 2 else date

def build_prs(comp):
    return [{'event': map_event(r['discipline']), 'time': r['mark']}
            for r in (comp.get('personalBests') or {}).get('results', []) or []]

def build_honours(comp):
    out = []
    for g in comp.get('honours') or []:
        cat = g.get('categoryName', '')
        short = HONOUR_SHORT.get(cat, ''.join(w[0] for w in cat.split()[:3]).upper())
        for r in g.get('results', []) or []:
            try:
                place = int((r.get('place') or '').replace('.', ''))
            except ValueError:
                continue
            d = r.get('date', '')
            out.append({'competition': cat, 'short': short,
                        'discipline': map_event(r.get('discipline', '')),
                        'place': place, 'year': d.split()[-1] if d else ''})
    return out

def build_current_results(comp):
    out = []
    for g in (comp.get('resultsByYear') or {}).get('resultsByEvent') or []:
        ev = map_event(g['discipline'])
        for r in g.get('results', []):
            out.append({'date': wa_date_to_short(r.get('date', '')), 'meet': r.get('competition', ''),
                        'event': ev, 'time': r.get('mark', ''), 'place': r.get('place', ''), 'round': ''})
    return out

def build_record(seed, comp, template_keys, event_label):
    bd = comp['basicData']
    given, family = bd.get('givenName') or '', bd.get('familyName') or ''
    name = cap_name(f'{given} {family}'.strip()) or seed.get('name', '')
    cc3 = bd.get('countryCode') or ''
    rec = {k: None for k in template_keys}
    rec.update({
        'name': name,
        'flag': CC3_TO_2.get(cc3, cc3[:2] if cc3 else None),
        'country': bd.get('countryFullName') or seed.get('country', ''),
        'dob': bd.get('birthDate') or seed.get('dob', ''),
        'prs': build_prs(comp),
        'honours': build_honours(comp),
        'results': build_current_results(comp),
        'id': slugify(name),
        'waUrl': 'https://worldathletics.org' + seed['url'],
        'aaId': bd.get('aaId') or aaid_from_url(seed['url']),
        'countryCode3': cc3,
        'event': event_label,
        'lastSynced': today(),
    })
    return rec

# ── PLUMBING ──────────────────────────────────────────────────────────────────
def today(): return datetime.date.today().isoformat()

def log(msg):
    line = f'{datetime.datetime.now().isoformat(timespec="seconds")}  {msg}'
    print(line, file=sys.stderr)
    with open(LOG_PATH, 'a') as f:
        f.write(line + '\n')

def load_json(path, default):
    if not os.path.exists(path):
        return default
    with open(path) as f:
        return json.load(f)

def save_json_atomic(path, obj):
    tmp = path + '.tmp'
    with open(tmp, 'w') as f:
        json.dump(obj, f, indent=1, ensure_ascii=False)
    os.replace(tmp, path)

def existing_identity_set(items):
    ids = set()
    for a in items:
        if a.get('aaId'):  ids.add(('aa', int(a['aaId'])))
        if a.get('waUrl'):
            n = aaid_from_url(a['waUrl'])
            if n: ids.add(('aa', n))
        if a.get('id'):    ids.add(('slug', a['id']))
        if a.get('name'):  ids.add(('name', a['name'].strip().lower()))
    return ids

def stale_days(a, n):
    ls = a.get('lastSynced')
    if not ls:
        return True
    try:
        return (datetime.date.today() - datetime.date.fromisoformat(ls)).days >= n
    except ValueError:
        return True

# ── MODES ─────────────────────────────────────────────────────────────────────
def run_add(batch, event_label):
    data = load_json(DATA_PATH, {'items': []})
    items = data['items']
    template_keys = list(items[0].keys()) if items else []
    known = existing_identity_set(items)
    queue = load_json(QUEUE_PATH, [])
    if not queue:
        log('ADD: queue empty, nothing to do.'); return

    added, remaining = 0, []
    for seed in queue:
        if added >= batch:
            remaining.append(seed); continue
        aid = aaid_from_url(seed['url'])
        if ('aa', aid) in known or ('name', seed.get('name','').strip().lower()) in known:
            log(f'  skip (already in DB): {seed.get("name")}'); continue
        log(f'  fetching: {seed.get("name")} (rank {seed.get("rank","?")})')
        try:
            comp = fetch_profile(seed['url'])
            rec = build_record(seed, comp, template_keys, event_label)
            if ('slug', rec['id']) in known:
                log(f'    slug collision {rec["id"]}, skipping'); continue
            if rec.get('aaId'):
                rec['resultsHistory'] = fetch_history(rec['aaId'], HISTORY_YEARS)
                rec['lastHistorySynced'] = today()
            items.append(rec)
            known |= {('aa', rec['aaId']), ('slug', rec['id']), ('name', rec['name'].lower())}
            added += 1
            log(f'    OK  prs={len(rec["prs"])} honours={len(rec["honours"])} '
                f'2026={len(rec["results"])} hist={len(rec.get("resultsHistory",{}))}')
        except Throttled as t:
            log(f'  !! THROTTLED ({t}) — aborting run, keeping queue intact'); remaining.append(seed)
            remaining += queue[queue.index(seed)+1:]
            break
        except Exception as e:
            log(f'    FAILED, dropping from queue: {e}')  # bad url/deleted profile: don't retry forever
        time.sleep(1.2 + random.random() * 0.8)

    save_json_atomic(DATA_PATH, data)
    save_json_atomic(QUEUE_PATH, remaining)
    log(f'ADD done: +{added} athletes (total {len(items)}), {len(remaining)} left in queue.')

def run_refresh(batch, stale_n):
    data = load_json(DATA_PATH, {'items': []})
    items = data['items']
    due = [a for a in items if a.get('aaId') and a.get('waUrl') and stale_days(a, stale_n)]
    log(f'REFRESH: {len(due)} athletes stale >= {stale_n}d; processing up to {batch}.')
    done = 0
    for a in due:
        if done >= batch:
            break
        path = a['waUrl'].replace('https://worldathletics.org', '')
        log(f'  refreshing 2026: {a["name"]}')
        try:
            comp = fetch_profile(path)
            a['results'] = build_current_results(comp)
            a['prs'] = build_prs(comp) or a.get('prs')
            a['lastSynced'] = today()
            done += 1
            log(f'    OK 2026={len(a["results"])}')
        except Throttled as t:
            log(f'  !! THROTTLED ({t}) — aborting refresh'); break
        except Exception as e:
            log(f'    FAILED: {e}')
        time.sleep(1.2 + random.random() * 0.8)
    save_json_atomic(DATA_PATH, data)
    log(f'REFRESH done: {done} updated.')

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--refresh', action='store_true', help='refresh stale current-season results instead of adding new athletes')
    ap.add_argument('--batch', type=int, default=None, help='max athletes this run')
    ap.add_argument('--stale-days', type=int, default=7)
    ap.add_argument('--event', default='1500m', help='event label stamped on new athletes')
    args = ap.parse_args()
    if args.refresh:
        run_refresh(args.batch or 25, args.stale_days)
    else:
        run_add(args.batch or 8, args.event)

if __name__ == '__main__':
    main()
