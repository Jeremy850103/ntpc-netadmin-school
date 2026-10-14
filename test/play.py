#!/usr/bin/env python3
"""守門【P】：用 playwright 載入成品，逐關注入解法事件重播，確認每關都能過關、沒有 console 錯誤。
用法：python3 test/play.py [key ...]（不給就跑 ROAD 全部）"""
import sys, os, json, pathlib
from playwright.sync_api import sync_playwright
H = pathlib.Path(__file__).resolve().parents[1]
OUT = H / '出稿' / '新北網管小學堂.html'
SOL = (H / 'test' / '_solutions.js').read_text(encoding='utf-8')
want = sys.argv[1:]
def main():
    bad = []
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={'width': 1280, 'height': 900})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append('console.' + m.type + ': ' + m.text) if m.type in ('error',) else None)
        pg.goto(OUT.as_uri(), wait_until='load')
        pg.evaluate('()=>{localStorage.clear()}')
        pg.reload(wait_until='load'); pg.wait_for_timeout(300)
        pg.add_script_tag(content=SOL)
        if not pg.evaluate('()=>!!window.__nq'):
            print('載入失敗：', '\n'.join(errs)); sys.exit(1)
        keys = pg.evaluate("()=>window.__nq.ROAD.flatMap(c=>c[1].map(r=>r[2])).map(no=>window.__nq.LEVELS.find(l=>l.no===no).key)")
        if want: keys = want
        (H / 'test' / 'shots').mkdir(exist_ok=True)
        for k in keys:
            e0 = len(errs)
            r = pg.evaluate("""async (k)=>{
                const nq=window.__nq, L=nq.lvk(k); nq.load(L.no);
                await new Promise(r=>setTimeout(r,150));
                while(nq.busy) await new Promise(r=>setTimeout(r,20));
                const ev = window.__sol[k] ? window.__sol[k](nq.LV(), nq.D(), nq.cables()) : null;
                if(!ev) return {skip:true};
                let n=0;
                for(const e of ev){ const ok=nq.apply(e); if(!ok) return {fail:'apply 失敗 '+JSON.stringify(e)+' 第 '+n+' 步'}; n++; while(nq.busy) await new Promise(r=>setTimeout(r,20)); }
                await new Promise(r=>setTimeout(r,100));
                return {won:nq.won, fails:nq.fails, status:document.getElementById('status').textContent, n}
            }""", k)
            pg.screenshot(path=str(H / 'test' / 'shots' / f'{k}.png'), full_page=True)
            ne = errs[e0:]
            tag = 'SKIP' if r.get('skip') else ('OK' if r.get('won') else 'FAIL')
            if tag == 'FAIL' or ne: bad.append(k)
            print(f'{tag:4} {k:5} {json.dumps(r, ensure_ascii=False)[:300]} {" | ".join(ne)[:300]}')
        b.close()
    print('未過關／有錯誤：', bad if bad else '無')
    sys.exit(1 if bad else 0)
main()
