#!/usr/bin/env python3
"""
(Re)build scripts/sync-queue.json from a World Athletics world-rankings list.

Fetches N ranking pages (100 athletes each), drops anyone already present in
_data/athletes.json (matched by WA numeric id or name), and writes the rest as
the pending queue that sync_athletes.py drips through. Safe to re-run any time —
it only ever *adds* not-yet-present athletes to the queue.

Usage:
  python3 scripts/build_queue.py                      # men's 1500m, top 500
  python3 scripts/build_queue.py --event 800m --pages 3
"""
import json, os, re, ssl, sys, time, random, argparse
import urllib.request, urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH  = os.path.join(ROOT, '_data', 'athletes.json')
QUEUE_PATH = os.path.join(ROOT, 'scripts', 'sync-queue.json')

_SSL_CTX = (ssl.create_default_context(cafile='/etc/ssl/cert.pem')
            if os.path.exists('/etc/ssl/cert.pem') else ssl.create_default_context())
UA = ('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/120.0 Safari/537.36')

def aaid_from_url(url):
    m = re.search(r'-(\d+)$', url.strip('/'))
    return int(m.group(1)) if m else None

def fetch_rankings_page(event, page, rank_date):
    url = (f'https://worldathletics.org/world-rankings/{event}/men'
           f'?regionType=world&page={page}&rankDate={rank_date}&limitByCountry=0')
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=25, context=_SSL_CTX) as r:
        html = r.read().decode('utf-8', 'ignore')
    if 'awswaf' in html.lower() and 'data-athlete-url' not in html:
        raise RuntimeError('WAF challenge on rankings page — stop and retry later')
    # Each ranked row: <tr ... data-athlete-url="/..."> <td>rank</td> <td>NAME</td> ...
    rows = []
    for m in re.finditer(r'data-athlete-url="([^"]+)"(.*?)</tr>', html, re.S):
        url_ = m.group(1)
        cells = re.findall(r'<td[^>]*>(.*?)</td>', m.group(2), re.S)
        clean = [re.sub(r'<[^>]+>', '', c).strip() for c in cells]
        rows.append({
            'rank': clean[0] if len(clean) > 0 else '',
            'name': clean[1] if len(clean) > 1 else '',
            'dob':  clean[2] if len(clean) > 2 else '',
            'country': clean[3] if len(clean) > 3 else '',
            'url': url_,
        })
    return rows

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--event', default='1500m')
    ap.add_argument('--pages', type=int, default=5)
    ap.add_argument('--rank-date', default='2026-07-07')
    args = ap.parse_args()

    data = json.load(open(DATA_PATH))
    known_ids, known_names = set(), set()
    for a in data['items']:
        for key in ('aaId',):
            if a.get(key): known_ids.add(int(a[key]))
        if a.get('waUrl'):
            n = aaid_from_url(a['waUrl'])
            if n: known_ids.add(n)
        if a.get('name'): known_names.add(a['name'].strip().lower())

    existing_queue = json.load(open(QUEUE_PATH)) if os.path.exists(QUEUE_PATH) else []
    queued_ids = {aaid_from_url(s['url']) for s in existing_queue}

    seeds, seen_total, new_count = list(existing_queue), 0, 0
    for page in range(1, args.pages + 1):
        rows = fetch_rankings_page(args.event, page, args.rank_date)
        seen_total += len(rows)
        for s in rows:
            aid = aaid_from_url(s['url'])
            if aid in known_ids or s['name'].strip().lower() in known_names or aid in queued_ids:
                continue
            seeds.append(s); queued_ids.add(aid); new_count += 1
        print(f'page {page}: {len(rows)} rows', file=sys.stderr)
        time.sleep(1.0 + random.random() * 0.6)

    json.dump(seeds, open(QUEUE_PATH, 'w'), indent=1, ensure_ascii=False)
    print(f'scanned {seen_total} ranked; +{new_count} new queued; '
          f'{len(seeds)} total pending in {QUEUE_PATH}', file=sys.stderr)

if __name__ == '__main__':
    main()
