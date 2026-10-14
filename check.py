#!/usr/bin/env python3
"""守門：A 語法與組裝、B 關卡完整性、C 文風禁詞、D 舊版殘留、E 全關自動解題（呼叫 test/play.py）"""
import re, glob, os, subprocess, sys, json
H = os.path.dirname(os.path.abspath(__file__))
def src(pat): return {os.path.basename(f): open(f, encoding='utf-8').read() for f in sorted(glob.glob(os.path.join(H, 'src', pat)))}
bad = []
# A
r = subprocess.run(['sh', os.path.join(H, 'test', 'syntax.sh')], capture_output=True, text=True)
print('【A】語法', 'ok' if 'syntax ok' in r.stdout else 'FAIL ' + r.stderr[-300:]); bad += [] if 'syntax ok' in r.stdout else ['A']
# B：用瀏覽器把 LEVELS/ROAD/CARDS 讀出來檢查
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page()
    pg.goto('file://' + os.path.join(H, '出稿', '新北網管小學堂.html'), wait_until='load')
    info = pg.evaluate("""()=>{const nq=window.__nq; return {levels: nq.LEVELS.map(l=>({key:l.key,no:l.no,name:l.name,task:l.task,hints:(l.hints||[]).length,learn:(l.learn||[]).length,tip:!!l.tip,goals:(l.goals||[]).length,see:l.see||[],hasIntro:!!(l.intro||l.init),start:!!l.start})), road: nq.ROAD.flatMap(c=>c[1].map(r=>r[2])), cards: nq.CARDS.map(c=>c[0]), groups: nq.CARD_GROUPS.flatMap(g=>g[1])}}""")
    b.close()
L = info['levels']; keys = [l['key'] for l in L]; nos = [l['no'] for l in L]
if len(set(keys)) != len(keys) or len(set(nos)) != len(nos): bad.append('B key/no 重複')
miss = [l['key'] for l in L if l['no'] not in info['road']]
if miss: bad.append('B 未排入闖關路線：' + ','.join(miss))
for l in L:
    probs = [k for k, v in [('learn', l['learn'] >= 1), ('tip', l['tip']), ('goals', l['goals'] >= 1), ('intro', l['hasIntro']), ('start', l['start'])] if not v]
    if probs: bad.append(f"B {l['key']} 缺 {probs}")
    for s in l['see']:
        if s not in info['cards']: bad.append(f"B {l['key']} 引用不存在的知識卡 {s}")
from collections import Counter
gc = Counter(info['groups'])
dup = [k for k, v in gc.items() if v > 1]; nog = [c for c in info['cards'] if c not in gc]; ghost = [c for c in gc if c not in info['cards']]
if dup or nog or ghost: bad.append(f'B 知識卡分組 重複{dup} 未分組{nog} 不存在{ghost}')
print(f'【B】關卡 {len(L)} 關、知識卡 {len(info["cards"])} 張、路線 {len(info["road"])} 關', 'ok' if not [x for x in bad if x.startswith('B')] else 'FAIL')
# C：文風禁詞（自我評價、辯護式對比、流行語）；教學敘事保留口語
STYLE_BAD = ['不是口號', '不是示意圖', '誠實', '可辯護', '業界領先', '最佳', '唯一', '獨步', '而不是', '不是只', '並非只', '賦能', '閉環', '抓手', '打法', '痛點', '超強', '革命性', '顛覆']
texts = src('1*.js'); texts.update(src('80_cards.js'))
hits = []
for f, s in texts.items():
    for w in STYLE_BAD:
        for m in re.finditer(re.escape(w), s):
            line = s.count('\n', 0, m.start()) + 1
            hits.append(f'{f}:{line} {w}')
print('【C】文風禁詞', 'ok' if not hits else 'FAIL\n  ' + '\n  '.join(hits[:20])); bad += ['C'] if hits else []
# D：舊版殘留（原課程的網段、DNS、SSID、單位名）
OLD = ['192.168.88', '163.19.1', 'School-Teacher', 'School-Student', '縣網中心', '縣市網路中心', '佔位', '防火牆的 DHCP', 'school.edu.tw']
old = [f'{f}: {w}' for f, s in {**texts, **src('02_devices.js')}.items() for w in OLD if w in s]
print('【D】舊版殘留', 'ok' if not old else 'FAIL ' + '; '.join(old)); bad += ['D'] if old else []
# E：全關自動解題
r = subprocess.run([sys.executable, os.path.join(H, 'test', 'play.py')], capture_output=True, text=True)
print('【E】自動解題', 'ok' if r.returncode == 0 else 'FAIL'); print('  ' + r.stdout.strip().split('\n')[-1])
bad += [] if r.returncode == 0 else ['E']
print('結果：', '全部通過' if not bad else '未通過 ' + str(bad)); sys.exit(1 if bad else 0)
