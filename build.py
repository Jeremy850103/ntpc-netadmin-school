#!/usr/bin/env python3
"""組裝單檔 HTML：src/index.html 樣板 + src/style.css + src/*.js（依檔名排序）→ 出稿/新北網管小學堂.html"""
import glob, os, re, sys
H = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(H, 'src'); OUT = os.path.join(H, '出稿', '新北網管小學堂.html')
def main():
    js = []
    for f in sorted(glob.glob(os.path.join(SRC, '*.js'))):
        if os.path.basename(f).startswith('_'): continue
        js.append(f'/* ===== {os.path.basename(f)} ===== */\n' + open(f, encoding='utf-8').read())
    css = open(os.path.join(SRC, 'style.css'), encoding='utf-8').read()
    html = open(os.path.join(SRC, 'index.html'), encoding='utf-8').read()
    assert '/*__CSS__*/' in html and '/*__JS__*/' in html
    html = html.replace('/*__CSS__*/', css).replace('/*__JS__*/', '\n'.join(js))
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    open(OUT, 'w', encoding='utf-8').write(html)
    print(f'寫入 {OUT}（{len(html):,} 字元，JS 檔 {len(js)} 支）')
if __name__ == '__main__': main()
