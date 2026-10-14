  /* ---------- 術語白話：關卡文字裡每個術語第一次出現時加底線，點開看一行解釋 ---------- */
  const GL_KEYS = Object.keys(GLOSSARY).sort((a, b) => b.length - a.length);
  const GL_RE = new RegExp('(?<![A-Za-z0-9])(?:' + GL_KEYS.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')(?![A-Za-z0-9])', 'g');
  function gl(text, isHtml) {
    const parts = (isHtml ? sp(String(text)) : esc(sp(String(text)))).split(/(<[^>]+>)/), seen = new Set();
    return parts.map(p => p.startsWith('<') ? p : p.replace(GL_RE, m => { if (seen.has(m)) return m; seen.add(m); return `<span class="gl" tabindex="0" role="button" data-gl="${m}">${m}</span>` })).join('')
  }
  function glShow(g) {
    const k = g.dataset.gl, tip = $('gltip');
    if (!GLOSSARY[k]) return;
    tip.innerHTML = `<b>${esc(k)}</b>　${esc(GLOSSARY[k])}`;
    tip.hidden = false;
    const r = g.getBoundingClientRect();
    tip.style.left = Math.max(8, Math.min(window.scrollX + r.left, window.scrollX + document.documentElement.clientWidth - 340)) + 'px';
    tip.style.top = (window.scrollY + r.bottom + 6) + 'px'
  }
  document.addEventListener('click', e => { const g = e.target.closest && e.target.closest('.gl'); if (g) { e.preventDefault(); glShow(g) } else if (!e.target.closest('#gltip')) $('gltip').hidden = true });
  document.addEventListener('keydown', e => { const g = e.target.closest && e.target.closest('.gl'); if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); glShow(g) } if (e.key === 'Escape') $('gltip').hidden = true });
  // 答錯時把封包卡住的那一台設備反白幾秒
  function flashDev(id) { const g = gDev[id]; if (!g) return; g.classList.add('stuck'); setTimeout(() => g.classList.remove('stuck'), 4000) }
  let DEMO = false; // 看示範：自動播放正解，這一局不計分、不存檔

  /* ---------- 狀態 ---------- */
  // 存檔：SAVE[關卡索引] = {cur: 這一局, done: 最近一次過關的那一局}，每局是 {s: 亂數種子, e: 操作清單, w: 過關星數}
  let SAVE = {};
  try {
    SAVE = JSON.parse(localStorage.getItem('nq-save') || '{}') || {}
  } catch (e) {}
  let REC = null,
    gen = 0,
    replaying = false,
    quick = false,
    VIEW = null,
    steps = [],
    testStep = null;
  let LV, D, li = 0,
    kind = 'utp',
    fails = 0,
    mode = null,
    W, H, net, R, cables = [],
    hints = 0,
    busy = false,
    won = false,
    pend = null,
    drag = null,
    revealed = false,
    selCable = null,
    selDev = null;
  let gCables, gLab, gTop, gDev = {},
    pkt, tempEl;
  const pos = k => {
    if (k === 'net') return {
      x: net.x,
      y: net.y + 26
    };
    const [d, p] = k.split('.');
    return {
      x: D[d].x + D[d].ports[p].dx,
      y: D[d].y + D[d].ports[p].dy
    }
  };
  const dv = k => k.split('.')[0];

  function pathD(a, b) {
    const k = 26 + Math.hypot(a.x - b.x, a.y - b.y) * .1;
    return `M${a.x},${a.y} C${a.x},${a.y+k} ${b.x},${b.y+k} ${b.x},${b.y}`
  }
  const fixedAt = k => LV.fixed.find(f => f.occupy && (f.a === k || f.b === k));
  const used = k => cables.some(c => c.a === k || c.b === k) || !!fixedAt(k);
  const S = () => ({
    cables,
    used: k => cables.some(c => c.a === k || c.b === k),
    link: (x, y) => cables.some(c => {
      const s = [dv(c.a), dv(c.b)];
      return s.includes(x) && s.includes(y) && x !== y
    }),
    plink: (k, y) => cables.some(c => (c.a === k && dv(c.b) === y) || (c.b === k && dv(c.a) === y)),
    cabled: x => cables.some(c => dv(c.a) === x || dv(c.b) === x),
    pow
  });

  function ledOn(k) {
    const d = D[dv(k)];
    if (d.down) return false;
    const c = cables.find(c => c.a === k || c.b === k) || fixedAt(k);
    if (!c || c.broken || c.bad) return false;
    const o = c.a === k ? c.b : c.a;
    return o === 'net' || !D[dv(o)].down
  }

  const modName = m => ((LV && LV.kinds && Object.values(LV.kinds).find(k => k.mod === m)) || {}).name || m;

  function slowAt(k) {
    const c = cables.find(c => c.a === k || c.b === k);
    return !!c && (!!c.slow || [c.a, c.b].some(x => D[dv(x)].forced))
  }

  function loopCables() {
    return cables.filter(e => {
      const A = dv(e.a),
        B = dv(e.b),
        seen = new Set([A]),
        q = [A];
      while (q.length) {
        const u = q.shift();
        if (u === B) return true;
        for (const c of cables) {
          if (c === e) continue;
          const x = dv(c.a),
            y = dv(c.b),
            v = x === u ? y : y === u ? x : null;
          if (v && !seen.has(v)) {
            seen.add(v);
            q.push(v)
          }
        }
      }
      return false
    })
  }

  function showActs(title, list) {
    if (probe) {
      probe.push(...list);
      return
    }
    const a = $('acts');
    a.hidden = false;
    a.onchange = null;
    delete a.dataset.cable;
    const hide = x => SHONLY && SH.hosts.length && shSig(x[0]);
    a.innerHTML = `<span>${sp(title)}${list.some(hide)?'（指令請在終端機輸入）':''}</span>` + list.map((x, i) => `<button data-i="${i}" data-l="${escA(x[0])}"${hide(x)?' hidden':''}>${sp(x[0])}</button>`).join('');
    a.onclick = e => {
      const b = e.target.closest('button');
      if (!b) return;
      rec(['b', b.dataset.l], `選「${b.dataset.l}」`);
      a.hidden = true;
      unwin();
      const n0 = sayN,
        h0 = $('term').innerHTML;
      list[+b.dataset.i][1]();
      settle(n0, h0);
      place()
    }
  }

  function settle(n0, h0) {
    if (sayN !== n0) return;
    say($('term').innerHTML !== h0 ? '結果在下方的終端機。看完再決定要做什麼。' : LV.start)
  }

  function showTerm(h) {
    if (!probe) $('term').innerHTML = sp(h)
  }

  function showCfg(id, title, fields) {
    if (probe) return;
    const a = $('acts'),
      c = D[id].cfg;
    a.hidden = false;
    delete a.dataset.cable;
    a.onclick = e => {
      if (e.target.closest('button')) {
        a.hidden = true;
        place()
      }
    };
    a.innerHTML = `<span>${sp(title)}</span>` + fields.map(f => `<label>${f.label}<select id="cfg-${f.k}" data-k="${f.k}"><option value="">請選擇</option>${f.opts.map(o=>`<option value="${escA(o)}"${c[f.k]===o?' selected':''}>${esc(sp(o))}</option>`).join('')}</select></label>`).join('') + '<button>關閉</button>';
    a.onchange = e => {
      const k = e.target.dataset.k;
      if (!k) return;
      rec(['f', k, e.target.value], `把「${e.target.parentNode.firstChild.textContent}」設成 ${e.target.value||'（未選）'}`);
      c[k] = e.target.value;
      if (LV.onCfg) LV.onCfg(id, k);
      unwin();
      place();
      say('設定已更新。改完之後按測試看結果。')
    }
  }

  function setVlan(k) {
    const v = LV.kinds[kind].vlan;
    rec(['v', k], `把${D[dv(k)].name}的${pobj(k).label}放進 VLAN ${v}`);
    if (dv(k) !== 'sw') {
      say('VLAN 是設定在交換器的埠上，不是設在電腦上。點交換器上它插的那一埠。', 'bad');
      return
    }
    if (fixedAt(k)) {
      say(fixedAt(k).msg || '這是上行埠（Trunk），要同時載運所有 VLAN，已經設好了，不用動。');
      return
    }
    pobj(k).vlan = v;
    unwin();
    place();
    say(`${pobj(k).label} 埠放進 VLAN ${v}。`, 'ok')
  }
  const pobj = k => D[dv(k)].ports[k.split('.')[1]];

  function alloc() {
    let w = 0;
    const on = {};
    cables.forEach(c => {
      const id = pobj(c.b).poe && D[dv(c.a)].need ? dv(c.a) : pobj(c.a).poe && D[dv(c.b)].need ? dv(c.b) : null;
      if (id && !D[id].adapter && (!LV.perPort || D[id].need <= LV.perPort) && (!LV.budget || w + D[id].need <= LV.budget)) {
        w += D[id].need;
        on[id] = 1
      }
    });
    return {
      w,
      on
    }
  }
  const onPoe = id => cables.some(c => (dv(c.a) === id && pobj(c.b).poe) || (dv(c.b) === id && pobj(c.a).poe));

  function pow(id) {
    return !!D[id].adapter || !!alloc().on[id]
  }

  function build() {
    svg.innerHTML = '';
    gDev = {};
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    if (LV.draw) {
      LV.draw();
      gCables = el('g', {}, svg);
      gLab = el('g', {}, svg);
      gTop = el('g', {}, svg);
      pkt = el('circle', {
        class: 'pkt',
        r: 8,
        visibility: 'hidden'
      }, gTop);
      place();
      return
    }
    const n = el('g', {
      class: 'net'
    }, svg);
    el('rect', {
      class: 'body',
      x: net.x - 92,
      y: net.y - 30,
      width: 184,
      height: 56,
      rx: 28
    }, n);
    el('text', {
      class: 'name',
      x: net.x,
      y: net.y - 4
    }, n, '教育網路中心');
    el('text', {
      class: 'sub',
      x: net.x,
      y: net.y + 13
    }, n, 'TANet · 網際網路');
    const rk = el('g', {
      class: 'rack'
    }, svg);
    el('rect', {
      class: 'frame',
      x: R.x,
      y: R.y,
      width: R.w,
      height: R.h,
      rx: 3
    }, rk);
    [R.x, R.x + R.w - 16].forEach(x => {
      el('rect', {
        class: 'rail',
        x,
        y: R.y,
        width: 16,
        height: R.h
      }, rk);
      for (let y = R.y + 10; y < R.y + R.h - 4; y += 14) el('circle', {
        class: 'hole',
        cx: x + 8,
        cy: y,
        r: 2.2
      }, rk)
    });
    el('text', {
      x: R.x + R.w,
      y: R.y - 6,
      'text-anchor': 'end'
    }, rk, '機房機櫃');
    for (const id in D) {
      const d = D[id],
        g = el('g', {
          class: 'dev' + (d.passive ? ' passive' : '') + (d.still ? ' still' : '') + (d.still && movable(d) ? ' move' : '') + (d.kind === 'ap' ? ' ap' : ''),
          'data-dev': id
        }, svg);
      gDev[id] = g;
      // 鍵盤：Tab 選到設備，Enter 查看或操作，方向鍵移動位置
      const kc = canPick(id),
        km = canMove(d);
      if (kc || km) {
        g.setAttribute('tabindex', 0);
        g.setAttribute('role', 'button');
        g.setAttribute('aria-label', d.name + (kc ? '，按 Enter 查看或操作' : '') + (km ? '，方向鍵移動位置' : ''))
      }
      if (d.kind === 'rack') {
        el('rect', {
          class: 'ear',
          width: d.w,
          height: d.h,
          rx: 2
        }, g);
        el('rect', {
          class: 'body',
          x: 16,
          width: d.w - 32,
          height: d.h,
          rx: 3
        }, g);
        [
          [8, 12],
          [8, d.h - 12],
          [d.w - 8, 12],
          [d.w - 8, d.h - 12]
        ].forEach(c => el('circle', {
          class: 'screw',
          cx: c[0],
          cy: c[1],
          r: 3
        }, g));
        el('text', {
          class: 'name',
          x: 26,
          y: 23
        }, g, d.name);
        el('text', {
          class: 'sub',
          x: 26 + d.name.length * 15 + 10,
          y: 22
        }, g, d.sub);
        if (!d.passive && d.psu === 2) {
          el('text', { class: 'tiny', x: d.w - 58, y: 21 }, g, 'PSU1');
          el('circle', { class: 'pwr psu1', cx: d.w - 49, cy: 18, r: 3 }, g);
          el('text', { class: 'tiny', x: d.w - 30, y: 21 }, g, 'PSU2');
          el('circle', { class: 'pwr psu2', cx: d.w - 21, cy: 18, r: 3 }, g)
        } else if (!d.passive) {
          el('text', {
            class: 'tiny',
            x: d.w - 40,
            y: 21
          }, g, 'PWR');
          el('circle', {
            class: 'pwr',
            cx: d.w - 31,
            cy: 18,
            r: 3
          }, g)
        }
      } else if (d.kind === 'box') {
        el('rect', {
          class: 'body',
          width: d.w,
          height: d.h,
          rx: 5
        }, g);
        el('text', {
          class: 'name',
          x: 12,
          y: 22
        }, g, d.name);
        el('text', {
          class: 'sub',
          x: 12,
          y: 38
        }, g, d.sub);
        if (d.tag != null) el('text', {
          class: 'tagt',
          x: d.w / 2,
          y: 70,
          'text-anchor': 'middle'
        }, g, d.tag);
        if (d.need || d.pwr) el('circle', {
          class: 'pw',
          cx: d.w - 14,
          cy: 15,
          r: 4
        }, g);
      } else if (d.kind === 'ap') {
        // 無線 AP：像天花板上的白色圓盤，右上角有 Wi-Fi 符號
        el('rect', {
          class: 'body',
          width: d.w,
          height: d.h,
          rx: 18
        }, g);
        el('rect', {
          class: 'ring',
          x: 5,
          y: 5,
          width: d.w - 10,
          height: d.h - 10,
          rx: 14
        }, g);
        const cx = d.w - 17,
          cy = 22;
        [10, 6.5, 3].forEach(r => el('path', {
          class: 'wifi',
          d: `M${cx-r*.75},${cy-r*.66}A${r},${r} 0 0 1 ${cx+r*.75},${cy-r*.66}`
        }, g));
        el('circle', {
          class: 'wifi-dot',
          cx,
          cy: cy + 1,
          r: 1.8
        }, g);
        el('text', {
          class: 'name',
          x: 12,
          y: 22
        }, g, d.name);
        el('text', {
          class: 'sub',
          x: 12,
          y: 38
        }, g, d.sub);
        if (d.tag != null) el('text', {
          class: 'tagt',
          x: d.w / 2,
          y: 70,
          'text-anchor': 'middle'
        }, g, d.tag);
        if (d.need || d.pwr) el('circle', {
          class: 'pw',
          cx: d.w - 14,
          cy: 44,
          r: 4
        }, g);
      } else if (d.kind === 'desk') {
        el('rect', {
          class: 'body',
          x: 4,
          width: d.w - 8,
          height: 54,
          rx: 4
        }, g);
        el('rect', {
          class: 'screen',
          x: 9,
          y: 5,
          width: d.w - 18,
          height: 42,
          rx: 2
        }, g);
        el('text', {
          class: 'sub',
          x: d.w / 2,
          y: 30,
          'text-anchor': 'middle'
        }, g, d.sub);
        el('rect', {
          class: 'ear',
          x: d.w / 2 - 6,
          y: 54,
          width: 12,
          height: 8
        }, g);
        el('rect', {
          class: 'body',
          y: 62,
          width: d.w,
          height: d.h - 62,
          rx: 4
        }, g);
        const nm = el('text', {
            class: 'name',
            x: 8,
            y: 87
          }, g, d.name),
          nw = nm.getComputedTextLength();
        if (nw > 56) nm.style.fontSize = Math.max(10, 15 * 56 / nw) + 'px';
      } else if (d.kind === 'laptop') {
        el('rect', {
          class: 'body',
          x: 10,
          width: d.w - 20,
          height: 58,
          rx: 4
        }, g);
        el('rect', {
          class: 'screen',
          x: 15,
          y: 5,
          width: d.w - 30,
          height: 48,
          rx: 2
        }, g);
        el('text', {
          class: 'name',
          x: d.w / 2,
          y: 26,
          'text-anchor': 'middle'
        }, g, d.name);
        el('text', {
          class: 'sub',
          x: d.w / 2,
          y: 43,
          'text-anchor': 'middle'
        }, g, d.sub);
        el('path', {
          class: 'body',
          d: `M6,60H${d.w-6}L${d.w},${d.h}H0Z`
        }, g);
        if (d.tag != null) el('text', {
          class: 'tagt',
          x: d.w / 2,
          y: 76,
          'text-anchor': 'middle'
        }, g, d.tag);
      } else if (d.kind === 'jack') {
        el('rect', {
          class: 'plate',
          width: d.w,
          height: d.h,
          rx: 6
        }, g);
        el('text', {
          class: 'plate-t',
          x: d.w / 2,
          y: 20,
          'text-anchor': 'middle'
        }, g, d.name);
      } else {
        el('rect', {
          class: 'body',
          x: 10,
          width: 130,
          height: 66,
          rx: 4
        }, g);
        el('rect', {
          class: 'screen',
          x: 16,
          y: 6,
          width: 118,
          height: 50,
          rx: 2
        }, g);
        el('text', {
          class: 'screen-t',
          x: 75,
          y: 35,
          'text-anchor': 'middle',
          id: 'scr'
        }, g, '未連線');
        el('rect', {
          class: 'ear',
          x: 68,
          y: 66,
          width: 14,
          height: 10
        }, g);
        el('rect', {
          class: 'body',
          y: 76,
          width: 150,
          height: 48,
          rx: 4
        }, g);
        el('text', {
          class: 'name',
          x: 10,
          y: 106
        }, g, d.name);
      }
      for (const pid in d.ports) {
        if (d.ports[pid].ghost) continue;
        const p = d.ports[pid],
          k = id + '.' + pid,
          pg = el('g', {
            class: 'port',
            'data-port': k,
            tabindex: fixedAt(k) ? -1 : 0,
            role: 'button',
            'aria-label': d.name + ' ' + p.label
          }, g);
        if (p.media === 'qsfp') {
          el('rect', {
            class: 'sock sfp qsfp',
            x: p.dx - 17,
            y: p.dy - 11,
            width: 34,
            height: 21,
            rx: 2
          }, pg);
          el('rect', {
            class: 'mod',
            x: p.dx - 12,
            y: p.dy - 6,
            width: 24,
            height: 11,
            rx: 1
          }, pg)
        } else if (p.media === 'sfp') {
          el('rect', {
            class: 'sock sfp',
            x: p.dx - 14,
            y: p.dy - 10,
            width: 28,
            height: 19,
            rx: 2
          }, pg);
          el('rect', {
            class: 'mod',
            x: p.dx - 10,
            y: p.dy - 6,
            width: 20,
            height: 11,
            rx: 1
          }, pg)
        } else el('path', {
          class: 'sock' + (p.poe ? ' poe' : ''),
          d: `M${p.dx-13},${p.dy-11}h26v15h-6v7h-14v-7h-6z`
        }, pg);
        el('rect', {
          class: 'led link',
          x: p.dx - 12,
          y: p.dy - 18,
          width: 8,
          height: 4
        }, pg);
        el('rect', {
          class: 'led act',
          x: p.dx + 4,
          y: p.dy - 18,
          width: 8,
          height: 4
        }, pg);
      }
    }
    gCables = el('g', {}, svg);
    const gZone = el('g', {
      'pointer-events': 'none'
    }, svg);
    gLab = el('g', {
      'pointer-events': 'none'
    }, svg);
    gTop = el('g', {}, svg);
    // 關卡說明文字畫在線的上層，底下墊一塊底板，線經過也看得清楚
    ((typeof LV.zones === 'function' ? LV.zones() : LV.zones || {})[mode] || []).forEach(z => {
      const t = el('text', {
          class: 'zone',
          x: z[0],
          y: z[1]
        }, gZone, z[2]),
        b = t.getBBox();
      gZone.insertBefore(el('rect', {
        class: 'zone-bg',
        x: b.x - 5,
        y: b.y - 2,
        width: b.width + 10,
        height: b.height + 4,
        rx: 3
      }), t)
    });
    pkt = el('circle', {
      class: 'pkt',
      r: 8,
      visibility: 'hidden'
    }, gTop);
    place();
  }

  function place() {
    const open = !$('acts').hidden;
    for (const id in D) {
      const d = D[id],
        g = gDev[id];
      g.setAttribute('transform', `translate(${d.x},${d.y})`);
      g.classList.toggle('sel', open && id === selDev);
      g.classList.toggle('down', !!d.down);
      if (d.subfn) g.querySelector('.sub').textContent = tr(d.subfn());
      if (d.tag != null) g.querySelector('.tagt').textContent = tr(d.tag)
    }
    $('inv').hidden = !LV.max || !!LV.noCut || !!LV.noInv;
    const fc = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.cable;
    gCables.innerHTML = '';
    LV.fixed.forEach((f, i) => {
      f.el = null;
      if (f.hidden && !revealed) return;
      const a = pos(f.a),
        b = pos(f.b);
      f.el = el('path', {
        class: 'cable ' + f.cls,
        d: pathD(a, b)
      }, gCables);
      if (f.cls === 'wall') return;
      el('path', {
        class: 'hit',
        'data-fixed': i,
        d: pathD(a, b)
      }, gCables);
      el('circle', {
        class: 'plug ' + f.cls,
        cx: a.x,
        cy: a.y,
        r: 6
      }, gCables);
      el('circle', {
        class: 'plug ' + f.cls,
        cx: b.x,
        cy: b.y,
        r: 6
      }, gCables)
    });
    cables.forEach((c, i) => {
      const a = pos(c.a),
        b = pos(c.b),
        sl = i === selCable ? ' sel' : '';
      const t = c.type && c.type !== 'utp' ? ' ' + c.type : '';
      if (sl) el('path', {
        class: 'halo',
        d: pathD(a, b)
      }, gCables);
      c.el = el('path', {
        class: 'cable' + t + sl,
        d: pathD(a, b)
      }, gCables);
      el('path', {
        class: 'hit',
        'data-cable': i,
        d: pathD(a, b),
        tabindex: 0,
        role: 'button',
        'aria-label': `網路線：${D[dv(c.a)].name} ${pobj(c.a).label} ↔ ${D[dv(c.b)].name} ${pobj(c.b).label}，按 Enter 選取`
      }, gCables);
      el('circle', {
        class: 'plug' + t + sl,
        cx: a.x,
        cy: a.y,
        r: 6
      }, gCables);
      el('circle', {
        class: 'plug' + t + sl,
        cx: b.x,
        cy: b.y,
        r: 6
      }, gCables);
    });
    if (fc != null) {
      const x = gCables.querySelector(`[data-cable="${fc}"]`);
      if (x) x.focus({
        preventScroll: true
      })
    }
    svg.querySelectorAll('.port').forEach(p => {
      const k = p.dataset.port,
        m = p.querySelector('.mod');
      if (m) m.setAttribute('class', 'mod ' + (pobj(k).mod || ''));
      const po = pobj(k),
        on = ledOn(k),
        sl = slowAt(k);
      p.setAttribute('class', ['port', on && 'on', k === pend && 'sel', po.vlan > 1 && 'v' + po.vlan, sl && 'slow'].filter(Boolean).join(' '));
      // 報讀軟體也聽得到燈號、VLAN、模組和有沒有拿著線頭
      p.setAttribute('aria-label', `${D[dv(k)].name} ${po.label}：${on?(sl?'連線燈橘色，只有 100 Mbps':'連線燈亮'):used(k)?'有接線，連線燈不亮':'空的'}${po.vlan>1?`，VLAN ${po.vlan}`:''}${po.mod?`，已裝${modName(po.mod)}`:''}${k===pend?'，已拿起線頭':''}`)
    });
    gLab.innerHTML = '';
    for (const id in D)
      for (const q in D[id].ports) {
        const po = D[id].ports[q],
          o = pos(id + '.' + q);
        if (po.ghost) continue;
        if (po.sticker) {
          el('rect', {
            class: 'stk',
            x: o.x - 15,
            y: o.y + 14,
            width: 30,
            height: 13,
            rx: 1.5
          }, gLab);
          el('text', {
            class: 'stk-t',
            x: o.x,
            y: o.y + 24
          }, gLab, po.label)
        } else el('text', {
          class: 'pl',
          x: o.x,
          y: o.y + 25
        }, gLab, po.vlan > 1 ? po.label + '/' + po.vlan : po.label)
      }
    svg.classList.toggle('storm', !!LV.storm && loopCables().length > 0);
    const s = S();
    $('goals').innerHTML = LV.goals.map(g => `<li class="${g[1](s)?'done':''}">${g[0]}</li>`).join('') + `<li class="${won?'done':''}">${LV.goalLast||'測試連線成功'}</li>`;
    let h = (LV.invLabel || '線材') + ' ';
    for (let i = 0; i < LV.max; i++) h += `<i class="${i<cables.length?'used':''}"></i>`;
    const w = alloc().w;
    for (const id in D)
      if (D[id].need) gDev[id].classList.toggle('powered', pow(id));
      else if (D[id].pwr) gDev[id].classList.toggle('powered', D[id].down !== 'nopower')
    $('inv').innerHTML = h + ` 剩 ${LV.max-cables.length} 條` + (LV.budget ? `　PoE 供電 ${w} / ${LV.budget} W` : '');
  }
  let sayN = 0;
  let lastSay = '';

  function say(t, c) {
    if (probe) return;
    sayN++;
    lastSay = String(t);
    const s = $('status');
    s.textContent = sp(t);
    s.className = 'status' + (c ? ' ' + c : '')
  }

  function unwin() {
    revealed = false;
    if (won || svg.classList.contains('live')) {
      won = false;
      svg.classList.remove('live');
      if (gDev.pc) {
        gDev.pc.classList.remove('online');
        $('scr').textContent = '未連線'
      }
      $('win').hidden = true
    }
  }

  function connect(a, b) {
    if (a === b) return;
    rec(['c', a, b], `接線：${D[dv(a)].name} ${pobj(a).label} ↔ ${D[dv(b)].name} ${pobj(b).label}`);
    if (dv(a) === dv(b)) {
      say(D[dv(a)].passive ? '配線架的兩個埠互接，等於把兩間教室的線直接對接，沒有經過交換器，誰都上不了網。' : '同一台設備的兩個埠互接會形成迴圈，整個網路可能癱瘓。第二章會專門認識它。', 'bad');
      return
    }
    if (used(a) || used(b)) {
      say('這個埠已經插了線，換一個空的埠。', 'bad');
      return
    }
    const no = LV.allow(a, b);
    if (no) {
      say(no, 'bad');
      return
    }
    if (cables.length >= LV.max) {
      say('網路線用完了。點一下畫面上的線可以拔下來重接。', 'bad');
      return
    }
    const c = {
      a,
      b
    };
    if (LV.kinds) {
      const K = LV.kinds[kind],
        pm = k => { const m = D[dv(k)].ports[k.split('.')[1]].media || 'rj'; return m === 'qsfp' ? 'sfp' : m };
      if (pm(a) !== K.media || pm(b) !== K.media) {
        say(K.media === 'sfp' ? '光纖或 DAC 要插在黃框的 SFP+ 插槽，兩端都是。RJ45 埠是給網路線用的。' : 'UTP 網路線要插在 RJ45 埠。黃框的 SFP+ 插槽是給光模組用的。', 'bad');
        return
      }
      if (K.media === 'sfp' && !K.direct && (!pobj(a).mod || !pobj(b).mod)) {
        say('SFP+ 插槽是空的，光纖沒有地方插。先在選單選一顆模組，點插槽把它裝上去，兩端都要裝。', 'bad');
        return
      }
      c.type = kind;
      const d = D[dv(a)].dist || D[dv(b)].dist || 0;
      c.bad = d > K.max;
      if (K.media === 'sfp' && !K.direct && (pobj(a).mod !== kind || pobj(b).mod !== kind)) {
        c.bad = true;
        c.why = 'mod'
      }
      if (K.direct && (pobj(a).mod || pobj(b).mod)) {
        c.bad = true;
        c.why = 'dac'
      }
    }
    cables.push(c);
    unwin();
    const pd = [dv(a), dv(b)].find(x => D[x].need);
    if (pd && LV.perPort && !D[pd].adapter && onPoe(pd) && D[pd].need > LV.perPort) {
      say(`${D[pd].name}需要 ${D[pd].need} W，超過單一埠 802.3at 的 ${LV.perPort} W 上限，這一埠有連線，但供不了電。`, 'bad');
      return
    }
    if (pd && LV.budget && !D[pd].adapter && onPoe(pd) && !pow(pd)) {
      say(`供電不足：${D[pd].name}需要 ${D[pd].need} W，交換器的 ${LV.budget} W 總預算不夠分了。這一埠有連線，但不送電。`, 'bad');
      return
    }
    say(`接好了：${D[dv(a)].name} ↔ ${D[dv(b)].name}${D[dv(a)].passive&&D[dv(b)].passive?'':'，有電的那一端連線燈亮起'}。`, 'ok');
  }

  function inspect(id) {
    const d = D[id],
      a = $('acts');
    a.hidden = false;
    delete a.dataset.cable;
    a.innerHTML = `<span>${d.name}：要做什麼？</span><button data-act="power">檢查電源線與插座</button><button data-act="reboot">重新開機</button><button data-act="x">不處理</button>`;
    a.onclick = e => {
      const b = e.target.closest('button');
      if (!b) return;
      rec(['b', b.textContent], `選「${b.textContent}」`);
      a.hidden = true;
      const act = b.dataset.act,
        n0 = sayN,
        h0 = $('term').innerHTML;
      if (act === 'power') {
        if (d.down === 'nopower') {
          d.down = null;
          say(LV.powerMsg ? LV.powerMsg(d) : `${d.name}的插頭鬆脫了，可能是昨晚停電後沒有復歸。插回去之後電源燈亮起，各埠燈號陸續恢復。`, 'ok')
        } else {
          fails++;
          say(`${d.name}的電源燈本來就亮著，電源沒有問題。`, 'bad')
        }
      } else if (act === 'reboot') {
        if (d.down === 'hang') {
          d.down = null;
          say(LV.hangMsg ? LV.hangMsg(d) : `${d.name}重新開機後，各埠燈號恢復了。它有電但所有埠都不亮，是設備當機。`, 'ok')
        } else if (d.down === 'nopower') {
          fails++;
          say(`${d.name}根本沒有電，按重新開機沒有反應。先看電源燈。`, 'bad')
        } else {
          fails++;
          say(`${d.name}運作正常。重新開機會讓它底下的教室多斷線幾分鐘。`, 'bad')
        }
      }
      settle(n0, h0);
      unwin();
      place()
    };
  }

  function nearCable(el, p, r) {
    if (!el) return false;
    const L = el.getTotalLength();
    for (let t = 0; t <= 1; t += .02) {
      const q = el.getPointAtLength(L * t);
      if (Math.hypot(q.x - p.x, q.y - p.y) <= r) return true
    }
    return false
  }

  function selectCable(i) {
    const c = cables[i],
      na = D[dv(c.a)].name,
      nb = D[dv(c.b)].name;
    rec(['s', i], `選取線：${na} ↔ ${nb}`);
    selCable = i;
    place();
    showActs(`選到這條線：${na} ↔ ${nb}`, [
      ['拔掉這條線', () => {
        selCable = null;
        cutCable(i)
      }],
      ['不拔', () => {
        selCable = null;
        say('沒有拔。要拔別條線，點那條線。')
      }]
    ]);
    $('acts').dataset.cable = '1';
    say(`選到 ${na} ↔ ${nb} 的線，變粗的那條就是。確定要拔，按「拔掉這條線」。`)
  }
  // 電腦和無線 AP 可以拖曳換位置；其他固定的設備（大樓、插座、目的地）只能點
  const movable = d => ['desk', 'laptop', 'ap'].includes(d.kind) || /電腦|筆電/.test(d.name);
  const canMove = d => !d.still || movable(d),
    canPick = id => !!(LV.onDev || LV.inspect) && !!(D[id].still || D[id].tap);
  // 搬過的位置記在設備上（寬版、窄版各一組），換版面或重播時放回去
  // 連續搬同一台（例如按住方向鍵）只留最後一筆
  function moveDev(id) {
    const d = D[id];
    (d.at = d.at || {})[mode] = [d.x, d.y];
    const L = REC && REC.e[REC.e.length - 1];
    if (!replaying && L && L[0] === 'p' && L[1] === id && steps.length && steps[steps.length - 1].p === id) {
      REC.e.pop();
      steps.pop()
    }
    const st = rec(['p', id, `${mode},${d.x},${d.y}`], `把「${d.name}」搬到別的位置`);
    st.p = id
  }

  function pickDev(id) {
    rec(['d', id], `點「${D[id].name}」`);
    selDev = id;
    if (SH.hosts.includes(id)) {
      SH.host = id;
      shUI()
    }
    LV.onDev ? LV.onDev(id) : inspect(id);
    place()
  }

  function clearSel() {
    if (selCable == null) return;
    selCable = null;
    const a = $('acts');
    if (a.dataset.cable) {
      a.hidden = true;
      delete a.dataset.cable
    }
    place()
  }

  function cutCable(i) {
    const rc = cables.splice(i, 1)[0];
    pend = null;
    unwin();
    if (LV.onCut) LV.onCut(rc);
    else if (!LV.inspect) say('拔掉一條線。');
    else if (rc.broken) say('這條線拔下來一看，外皮被施工的機具壓斷了。拿一條新的線，照原來的兩個埠接回去。', 'ok');
    else {
      fails++;
      say('這條線本身是好的。記得照原樣接回去。拔線之前，先看燈號判斷。', 'bad')
    }
  }

  function pt(e) {
    const m = svg.getScreenCTM().inverse();
    return new DOMPoint(e.clientX, e.clientY).matrixTransform(m)
  }

  function nearPort(p, r) {
    let best = null,
      bd = r;
    for (const d in D)
      for (const q in D[d].ports) {
        if (D[d].ports[q].ghost) continue;
        const k = d + '.' + q,
          o = pos(k),
          dist = Math.hypot(o.x - p.x, o.y - p.y);
        if (dist < bd) {
          bd = dist;
          best = k
        }
      }
    return best
  }

  function setMod(k) {
    const p = pobj(k),
      m = LV.kinds[kind].mod;
    rec(['m', k], `${p.mod===m?'拔下':'裝上'}${LV.kinds[kind].name}：${D[dv(k)].name} ${p.label}`);
    if (p.media !== 'sfp') {
      say('模組只能裝在黃框的 SFP+ 插槽。RJ45 埠不需要模組。', 'bad');
      return
    }
    if (cables.some(c => c.a === k || c.b === k)) {
      say('這個插槽上還插著光纖，先把光纖拔掉才能換模組。', 'bad');
      return
    }
    if (p.mod === m) {
      delete p.mod;
      say('模組拔下來了。')
    } else {
      p.mod = m;
      say(`裝上${LV.kinds[kind].name}。記得對面那一端也要裝同一種。`, 'ok')
    }
    unwin();
    place()
  }

  function portTap(k) {
    if (LV.kinds && LV.kinds[kind].vlan != null) {
      setVlan(k);
      return
    }
    if (LV.kinds && LV.kinds[kind].mod) {
      setMod(k);
      return
    }
    const f = fixedAt(k);
    if (f && !pend) {
      say(f.msg || '這個埠已經接好固定線路，不用動它。');
      return
    }
    if (pend && pend !== k) {
      const a = pend;
      pend = null;
      connect(a, k)
    } else if (pend === k) {
      pend = null
    } else if (used(k)) {
      say('這個埠已經插了線。想重接，先點那條線把它拔掉。')
    } else {
      pend = k;
      say('已拿起線頭，再點另一台設備的連接埠就會接上。')
    }
    place();
  }
  svg.addEventListener('pointerdown', e => {
    if (busy || replaying) return;
    const p = pt(e),
      k = nearPort(p, 20);
    if (k && LV.kinds && LV.kinds[kind].vlan != null) {
      e.preventDefault();
      setVlan(k);
      return
    }
    if (k && LV.kinds && LV.kinds[kind].mod) {
      e.preventDefault();
      setMod(k);
      return
    }
    if (k) {
      e.preventDefault();
      clearSel();
      svg.setPointerCapture(e.pointerId);
      if (!used(k) && !pend && cables.length < LV.max) {
        drag = {
          type: 'cable',
          from: k,
          start: p,
          moved: false
        };
        tempEl = el('path', {
          class: 'cable temp'
        }, gTop)
      } else drag = {
        type: 'tap',
        from: k
      };
      return
    }
    const t = e.target.closest ? e.target : null,
      hc = t && t.closest('[data-cable]');
    const hot = (LV.onDev || LV.inspect) && Object.keys(D).find(id => (D[id].still || D[id].tap) && p.x >= D[id].x && p.x <= D[id].x + D[id].w && p.y >= D[id].y && p.y <= D[id].y + D[id].h);
    // 線壓在可點的設備上時：點在線本身（離線心 6 以內）算線，點設備其他地方算設備；不能拔線的關卡一律算設備
    const cableWins = hc && (!hot || (!LV.noCut && nearCable(cables[+hc.dataset.cable].el, p, 6)));
    if (!cableWins) clearSel();
    if (hot && !cableWins) {
      if (movable(D[hot])) {
        svg.setPointerCapture(e.pointerId);
        drag = {
          type: 'dev',
          d: D[hot],
          id: hot,
          ox: p.x - D[hot].x,
          oy: p.y - D[hot].y,
          start: p,
          moved: false,
          pick: true
        }
      } else pickDev(hot);
      return
    }
    const fx = t && t.closest('[data-fixed]');
    if (fx) {
      say(LV.fixed[+fx.dataset.fixed].msg, 'bad');
      return
    }
    if (hc && LV.noCut) {
      say(LV.noCut);
      return
    }
    if (hc) {
      selectCable(+hc.dataset.cable);
      return
    }
    const g = t && t.closest('[data-dev]');
    if (g) {
      const d = D[g.dataset.dev];
      if (d.still && !movable(d) && (LV.onDev || LV.inspect)) {
        pickDev(g.dataset.dev);
        return
      }
      if (d.still && !movable(d)) {
        say(d.kind === 'jack' ? '資訊插座固定在牆上，搬不動。從它的連接埠拉線就好。' : '這棟樓搬不動，從它的連接埠拉線就好。');
        return
      }
      svg.setPointerCapture(e.pointerId);
      drag = {
        type: 'dev',
        d,
        id: g.dataset.dev,
        ox: p.x - d.x,
        oy: p.y - d.y,
        start: p,
        moved: false,
        pick: d.still && !!(LV.onDev || LV.inspect)
      }
    }
  });
  svg.addEventListener('pointermove', e => {
    if (!drag) return;
    const p = pt(e);
    if (drag.type === 'dev' && drag.d.kind === 'rack') {
      const d = drag.d,
        ny = Math.max(R.y + 8, Math.min(R.y + R.h - d.h - 8, Math.round((p.y - drag.oy) / 7) * 7));
      if (Object.values(D).every(o => o === d || o.kind !== 'rack' || ny + d.h + 6 <= o.y || ny >= o.y + o.h + 6)) d.y = ny;
      place()
    } else if (drag.type === 'dev') {
      const d = drag.d;
      if (!drag.moved && Math.hypot(p.x - drag.start.x, p.y - drag.start.y) < 6) return;
      drag.moved = true;
      const nx = Math.round(Math.max(4, Math.min(W - d.w - 4, p.x - drag.ox))),
        ny = Math.round(Math.max(84, Math.min(H - d.h - 18, p.y - drag.oy)));
      // 電腦和 AP 不能搬進機櫃裡
      if (!R.w || nx + d.w <= R.x || nx >= R.x + R.w || ny + d.h <= R.y || ny >= R.y + R.h) {
        d.x = nx;
        d.y = ny
      }
      place()
    } else if (drag.type === 'cable') {
      if (Math.hypot(p.x - drag.start.x, p.y - drag.start.y) > 8) drag.moved = true;
      const t = nearPort(p, 22);
      tempEl.setAttribute('d', pathD(pos(drag.from), t && t !== drag.from ? pos(t) : p))
    }
  });

  function up(e) {
    if (!drag) return;
    const dr = drag;
    drag = null;
    if (tempEl) {
      tempEl.remove();
      tempEl = null
    }
    if (dr.type === 'tap') portTap(dr.from);
    else if (dr.type === 'dev') {
      if (dr.moved) moveDev(dr.id);
      else if (dr.pick) pickDev(dr.id)
    } else if (dr.type === 'cable') {
      if (!dr.moved) portTap(dr.from);
      else {
        const t = nearPort(pt(e), 22);
        if (t && t !== dr.from) connect(dr.from, t);
        else say('線頭沒有對到連接埠，再拉一次，放在另一台設備的埠上。')
      }
    }
    place();
  }
  svg.addEventListener('pointerup', up);
  svg.addEventListener('pointercancel', up);
  svg.addEventListener('keydown', e => {
    if (busy || replaying) return;
    const t = e.target.closest ? e.target : null,
      p = t && t.closest('.port'),
      go = e.key === 'Enter' || e.key === ' ';
    if (e.key === 'Escape' && pend) {
      pend = null;
      place();
      say('放下線頭了。');
      return
    }
    if (p) {
      if (go) {
        e.preventDefault();
        portTap(p.dataset.port)
      }
      return
    }
    const hc = t && t.dataset.cable;
    if (hc != null && go) {
      e.preventDefault();
      if (LV.noCut) {
        say(LV.noCut);
        return
      }
      selectCable(+hc);
      const b = $('acts').querySelector('button');
      if (b) b.focus();
      return
    }
    const g = t && t.closest('[data-dev]');
    if (!g) return;
    const id = g.dataset.dev,
      d = D[id];
    if (go) {
      e.preventDefault();
      if (canPick(id)) {
        pickDev(id);
        const x = $('acts').hidden ? null : $('acts').querySelector('button:not([hidden]),select');
        if (x) x.focus()
      } else if (d.still && !movable(d)) say(d.kind === 'jack' ? '資訊插座固定在牆上，搬不動。從它的連接埠拉線就好。' : '這棟樓搬不動，從它的連接埠拉線就好。');
      else say(`${d.name}：用方向鍵移動位置，Tab 到它的連接埠按 Enter 拉線。`);
      return
    }
    const dir = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1]
    } [e.key];
    if (!dir || !canMove(d)) return;
    e.preventDefault();
    const n = e.shiftKey ? 40 : 10,
      x0 = d.x,
      y0 = d.y;
    if (d.kind === 'rack') {
      const ny = Math.max(R.y + 8, Math.min(R.y + R.h - d.h - 8, d.y + dir[1] * 14));
      if (Object.values(D).every(o => o === d || o.kind !== 'rack' || ny + d.h + 6 <= o.y || ny >= o.y + o.h + 6)) d.y = ny
    } else {
      const nx = Math.round(Math.max(4, Math.min(W - d.w - 4, d.x + dir[0] * n))),
        ny = Math.round(Math.max(84, Math.min(H - d.h - 18, d.y + dir[1] * n)));
      if (!R.w || nx + d.w <= R.x || nx >= R.x + R.w || ny + d.h <= R.y || ny >= R.y + R.h) {
        d.x = nx;
        d.y = ny
      }
    }
    if (d.x !== x0 || d.y !== y0) {
      place();
      moveDev(id)
    }
  });

  /* ---------- 測試連線 ---------- */
  function trace(start = 'pc.nic') {
    const adj = {},
      add = (a, b, o) => {
        (adj[a] = adj[a] || []).push({
          to: b,
          o,
          rev: false
        });
        (adj[b] = adj[b] || []).push({
          to: a,
          o,
          rev: true
        })
      };
    const up = k => k === 'net' || !D[dv(k)].down;
    cables.forEach(c => c.bad || c.broken || !up(c.a) || !up(c.b) || add(c.a, c.b, c));
    LV.fixed.forEach(f => up(f.a) && up(f.b) && add(f.a, f.b, f));
    for (const id in D)
      if (D[id].bridge && !D[id].down) {
        const ks = Object.keys(D[id].ports).map(p => id + '.' + p);
        for (let i = 1; i < ks.length; i++) add(ks[0], ks[i], null)
      }
    const par = {
        [start]: null
      },
      depth = {
        [start]: 0
      },
      q = [start];
    let deep = start;
    while (q.length) {
      const u = q.shift();
      for (const e of adj[u] || [])
        if (!(e.to in par)) {
          par[e.to] = {
            from: u,
            e
          };
          depth[e.to] = depth[u] + (e.o ? 1 : 0);
          if (depth[e.to] > depth[deep]) deep = e.to;
          q.push(e.to)
        }
    }
    const ok = 'net' in par,
      segs = [],
      devs = new Set();
    for (let n = ok ? 'net' : deep; par[n]; n = par[n].from) {
      devs.add(dv(n));
      if (par[n].e.o) segs.unshift({
        el: par[n].e.o.el,
        rev: par[n].e.rev
      })
    }
    return {
      ok,
      segs,
      devs,
      deep
    };
  }

  function travel(segs, cb) {
    segs = segs.filter(s => s.el);
    if (reduce || quick || !segs.length) {
      cb();
      return
    }
    pkt.setAttribute('visibility', 'visible');
    const per = LV.sources ? 280 : 520,
      t0 = performance.now();
    (function f(now) {
      const t = Math.max(0, (now - t0) / per),
        i = Math.min(segs.length - 1, Math.floor(t));
      const s = segs[i],
        u = Math.min(1, t - i) * (s.half ? .5 : 1),
        L = s.el.getTotalLength(),
        q = s.el.getPointAtLength(L * (s.rev ? 1 - u : u));
      pkt.setAttribute('cx', q.x);
      pkt.setAttribute('cy', q.y);
      if (t < segs.length) requestAnimationFrame(f);
      else cb()
    })(t0);
  }

  function term(lines, head) {
    const t = $('term');
    t.innerHTML = sp(head || 'C:\\&gt; ping 8.8.8.8') + '\n';
    let i = 0;
    if (quick) {
      t.innerHTML += lines.map(x => sp(x) + '\n').join('');
      return Promise.resolve()
    }
    return new Promise(r => {
      (function n() {
        if (i >= lines.length) return r();
        t.innerHTML += sp(lines[i++]) + '\n';
        setTimeout(n, reduce ? 0 : 260)
      })()
    })
  }
  const back = s => s.slice().reverse().map(x => ({
    el: x.el,
    rev: !x.rev
  }));
  const nextPlayable = () => {
    const i = PLAY.indexOf(li);
    return i >= 0 && i + 1 < PLAY.length ? PLAY[i + 1] : -1
  };

  $('test').onclick = () => {
    if (busy) return;
    testStep = rec(['t'], `按「${LV.testLabel||'測試連線'}」：沒有通過`);
    busy = true;
    pend = null;
    unwin();
    track({
      t: 'test',
      lv: li,
      ms: tTake()
    });
    revealed = S().link('pc', 'jack');
    place();
    $('test').disabled = true;
    pkt.setAttribute('class', 'pkt');
    const fin0 = () => {
      pkt.setAttribute('visibility', 'hidden');
      busy = false;
      $('test').disabled = false;
      place();
      if (won && !reduce && !quick) $('win').scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      })
    };
    if (LV.check) {
      const r = LV.check();
      term(r.lines, r.head).then(() => {
        if (r.ok) {
          svg.classList.add('live');
          finishWin()
        } else {
          if (!r.free) fails++;
          if (r.at) flashDev(r.at);
          say(r.msg, 'bad')
        }
        fin0()
      });
      return
    }
    if (LV.sources) {
      testSources(fin0);
      return
    }
    const r = trace();
    travel(r.segs, () => {
      const fin = () => {
        pkt.setAttribute('visibility', 'hidden');
        busy = false;
        $('test').disabled = false;
        place()
      };
      if (!r.ok) {
        fails++;
        pkt.setAttribute('class', 'pkt bad');
        term(['<span class="x">要求等候逾時。</span>', '<span class="x">要求等候逾時。</span>', '已傳送 = 2，已收到 = 0，遺失 = 2 (100%)']).then(() => {
          if (r.deep && r.deep !== 'net') flashDev(dv(r.deep));
          say(LV.diagnose(S()), 'bad');
          busy = false;
          $('test').disabled = false;
          place();
          setTimeout(() => pkt.setAttribute('visibility', 'hidden'), 2500)
        });
        return
      }
      travel(back(r.segs), () => {
        term(['<span class="o">回覆自 8.8.8.8：位元組=32 時間=4ms</span>', '<span class="o">回覆自 8.8.8.8：位元組=32 時間=3ms</span>', '已傳送 = 2，已收到 = 2，遺失 = 0 (0%)']).then(() => {
          svg.classList.add('live');
          if (gDev.pc) {
            gDev.pc.classList.add('online');
            $('scr').textContent = '已連線 ✓'
          }
          if (!LV.need.every(d => r.devs.has(d))) {
            say(LV.almost);
            fin();
            return
          }
          finishWin();
          fin();
          if (!reduce && !quick) $('win').scrollIntoView({
            behavior: 'smooth',
            block: 'nearest'
          });
        })
      });
    });
  };
  $('kinds').onclick = e => {
    const b = e.target.closest('button[data-k]');
    if (!b) return;
    rec(['k', b.dataset.k], `改用「${LV.kinds[b.dataset.k].name}」`);
    kind = b.dataset.k;
    $('kinds').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
    say(LV.kinds[kind].vlan != null ? `已選 ${LV.kinds[kind].name}。點交換器的埠，把它放進這個隔間。` : LV.kinds[kind].mod ? `已選 ${LV.kinds[kind].name}。點黃框的 SFP 插槽把它裝上去。` : `已選 ${LV.kinds[kind].name}，最遠 ${LV.kinds[kind].far}。`)
  };
  $('next').onclick = () => {
    if (DISP) {
      draw();
      return
    }
    const nx = nextPlayable();
    if (nx >= 0 && !busy && !replaying) {
      load(nx);
      window.scrollTo({
        top: 0,
        behavior: reduce ? 'auto' : 'smooth'
      })
    }
  };
  $('demo').onclick = async () => {
    if (busy || replaying || VIEW) return;
    const sol = DEMO_SOL[LV.key];
    if (!sol) return;
    DEMO = true;
    fresh('示範開始：看每一步怎麼做。示範的這一局不計分，看完按「重來」自己做一次。');
    const myGen = gen;
    let ev = null;
    try { ev = sol(LV, D, cables) } catch (e) {}
    if (!ev) { DEMO = false; return }
    $('log').open = true;
    for (const e of ev) {
      if (gen !== myGen) return;
      let ok = false;
      try { ok = apply(e) } catch (x) {}
      if (!ok) break;
      while (busy) await new Promise(f => setTimeout(f, 30));
      await new Promise(f => setTimeout(f, reduce ? 200 : 900));
      if (gen !== myGen) return
    }
    if (gen !== myGen) return;
    say('示範結束。操作紀錄列出了每一步。這一局不計分，按「重來」自己做一次。', 'ok')
  };
  $('hintBtn').onclick = () => {
    const h = $('hint'),
      n = LV.hints.length,
      i = Math.min(hints, n - 1);
    rec(['h'], `看提示 ${i+1}`);
    h.hidden = false;
    h.innerHTML = gl(`提示 ${i+1}/${n}：` + LV.hints[i]);
    hints++
  };

  function layout(m) {
    mode = m;
    const L = LV.lay[m];
    W = L.W;
    H = L.H;
    net = L.net;
    R = L.rack;
    for (const id in D) {
      const a = D[id].at && D[id].at[m] || L.pos[id];
      D[id].x = Math.min(a[0], W - D[id].w - 4);
      D[id].y = Math.min(a[1], H - D[id].h - 18)
    }
    build()
  }

  function finishWin() {
    won = true;
    const s2 = LV.s2ok ? LV.s2ok() : LV.s2 === 'first' ? fails === 0 : cables.length === LV.min && (!LV.thrifty || LV.thrifty(cables)),
      s3 = hints === 0,
      n = 1 + s2 + s3;
    $('stars').innerHTML = '<b>' + '★'.repeat(n) + '</b>' + '★'.repeat(3 - n);
    if (testStep) testStep.t = `按「${LV.testLabel||'測試連線'}」：過關 ${'★'.repeat(n)}${'☆'.repeat(3-n)}`;
    if (!VIEW && !DEMO) {
      PROG.lv[li] = Math.max(PROG.lv[li] || 0, n);
      saveProg();
      road();
      bars();
      track({
        t: 'win',
        lv: li,
        stars: n,
        hints
      })
    }
    if (REC && !VIEW && !replaying) {
      REC.w = n;
      REC.t = Date.now();
      SAVE[li].done = {
        s: REC.s,
        e: REC.e.slice(),
        w: n,
        t: Date.now()
      };
      saveSave(li)
    }
    showLog();
    $('sgrid').innerHTML = `<span>★ 連線成功</span><span>${s2?'★':'☆'} ${LV.s2==='first'?LV.firstLabel||'第一次測試就成功':LV.s2label||'只用 '+LV.min+' 條線'}${s2?'':'（'+LV.extra+'）'}</span><span>${s3?'★':'☆'} 沒有看提示</span>`;
    const nx = nextPlayable();
    $('next').disabled = nx < 0 && !DISP;
    $('next').textContent = DISP ? '再抽一張報修單' : nx < 0 ? '下一關製作中' : `下一關：${BYNO[nx].id} ${BYNO[nx].name}`;
    $('dispfrom').hidden = !DISP;
    if (DISP) {
      $('dispfrom').textContent = sp(`這張報修單來自${chapOf(li).replace('　','「')}」的${LV.id}：${LV.name}。`);
      if (!VIEW && !replaying && !REC.dp) {
        REC.dp = 1;
        PROG.dp = (PROG.dp || 0) + 1;
        saveProg();
        dispN()
      }
    }
    showClose();
    $('win').hidden = false;
    say(LV.passMsg || '過關！教室電腦可以上網了。', 'ok');
  }
  // 結案紀錄：選項隨機排列，data-o 是原始索引（0 是正解）。不影響星數
  let CQ = null;

  function showClose() {
    const c = $('close');
    CQ = LV.close ? LV.close() : null;
    c.hidden = !CQ;
    if (!CQ) {
      c.innerHTML = '';
      return
    }
    c.innerHTML = '<h2>結案：填寫報修紀錄</h2><p class="lead">修好了還沒結束。把這張報修單記錄下來，下次就快多了。</p>' + CQ.map((q, i) => `<div class="cq"><p class="q">${esc(sp(q[0]))}</p><div class="btns">${[q[1],...q[2]].map((o,j)=>[Math.random(),j,o]).sort((x,y)=>x[0]-y[0]).map(([,j,o])=>`<button data-q="${i}" data-o="${j}">${esc(sp(o))}</button>`).join('')}</div><p class="fb" id="cfb-${i}" aria-live="polite"></p></div>`).join('') + '<p class="fb ok" id="cdone" aria-live="polite"></p>'
  }
  $('close').onclick = e => {
    const b = e.target.closest('button[data-q]');
    if (!b || !CQ) return;
    const i = +b.dataset.q,
      ok = b.dataset.o === '0',
      f = $('cfb-' + i);
    rec(['q', i, +b.dataset.o], `結案第 ${i+1} 題：${ok?'答對':'答錯'}`);
    f.textContent = ok ? CQ[i][3] : '不是這個。回想剛才查到的線索，再選一次。';
    f.className = 'fb ' + (ok ? 'ok' : 'bad');
    if (ok) {
      b.closest('.btns').querySelectorAll('button').forEach(x => x.disabled = x !== b);
      b.setAttribute('aria-pressed', 'true')
    }
    if (CQ.every((q, j) => $('close').querySelector(`button[data-q="${j}"][data-o="0"][aria-pressed]`))) $('cdone').textContent = '結案完成！這張報修單可以歸檔了。'
  };

  function testSources(fin) {
    const res = LV.sources.map(id => {
      const c = cables.find(x => dv(x.a) === id || dv(x.b) === id),
        d = D[id];
      if (!c) return {
        d,
        st: 'none',
        segs: []
      };
      if (d.need && !pow(id)) return {
        d,
        st: 'nopower',
        segs: []
      };
      if (c.bad) return {
        d,
        st: 'far',
        c,
        segs: [{
          el: c.el,
          rev: dv(c.a) !== id,
          half: true
        }]
      };
      const r = trace(c.a.startsWith(id + '.') ? c.a : c.b);
      return {
        d,
        st: r.ok ? 'ok' : 'dead',
        segs: r.segs,
        deep: r.deep
      }
    });
    let i = 0;
    (function step() {
      if (i >= res.length) {
        const bad = res.find(r => r.st !== 'ok');
        pkt.setAttribute('class', 'pkt');
        term(res.map(r => r.st === 'ok' ? `<span class="o">${r.d.name}：回覆自 8.8.8.8 時間=4ms</span>` : `<span class="x">${r.d.name}：要求等候逾時</span>`), LV.testHead || '從三棟樓各 ping 8.8.8.8').then(() => {
          if (!bad) {
            svg.classList.add('live');
            finishWin()
          }
          if (bad && !LV.freeTest) fails++;
          if (bad) flashDev(bad.st === 'dead' && bad.deep && bad.deep !== 'net' ? dv(bad.deep) : Object.keys(D).find(k => D[k] === bad.d));
          if (bad && bad.st === 'nopower' && onPoe(Object.keys(D).find(k => D[k] === bad.d))) say(`${bad.d.name}沒有電。PoE 交換器的總供電不夠分了。點一下各台設備，看誰旁邊有插座可以改用變壓器。`, 'bad');
          else if (bad && bad.st === 'nopower') say(`${bad.d.name}沒有電。它插在一般埠，一般埠只傳資料、不供電。改插橘框的 PoE 埠。`, 'bad');
          else if (bad && bad.st === 'none') say(`${bad.d.name}還沒有接線。`, 'bad');
          else if (bad && bad.st === 'far' && bad.c.why === 'mod') say(`${bad.d.name}的光纖接上了，但模組和光纖不是同一種，連線燈不亮。單模光纖配 LR 模組、多模配 SR 模組，兩端的模組也要一樣。`, 'bad');
          else if (bad && bad.st === 'far' && bad.c.why === 'dac') say(`${bad.d.name}用 DAC 直連，可是插槽裡還裝著光模組。DAC 自帶接頭，要插在空的 SFP+ 插槽。`, 'bad');
          else if (bad && bad.st === 'far') {
            const K = LV.kinds[bad.c.type];
            say(`${bad.d.name}距離機房 ${bad.d.dist} 公尺，${K.name}最遠只能跑 ${K.far}，訊號撐不到那麼遠。拔掉換一種線材。`, 'bad')
          } else if (bad) say(LV.failMsg || `${bad.d.name}的線沒有通到校端 L3 路由器。`, 'bad');
          fin()
        });
        return
      }
      const r = res[i++];
      pkt.setAttribute('class', 'pkt' + (r.st === 'ok' ? '' : ' bad'));
      travel(r.segs, () => setTimeout(step, reduce || quick ? 0 : r.st === 'ok' ? 120 : 350));
    })();
  }

  function fresh(msg, r, upto) {
    gen++;
    replaying = quick = false;
    selCable = null;
    selDev = null;
    steps = [];
    testStep = null;
    for (const id in D) {
      D[id].adapter = false;
      delete D[id].at;
      for (const q in D[id].ports) {
        delete D[id].ports[q].mod;
        delete D[id].ports[q].vlan
      }
    }
    cables = [];
    hints = 0;
    fails = 0;
    $('acts').hidden = true;
    // r 是要接回的紀錄；沒有就開一局新的。看別人的紀錄（VIEW）時不存檔
    const R0 = r || {
      s: Math.floor(Math.random() * 4294967296),
      e: [],
      t: 0
    };
    seed = R0.s;
    REC = VIEW || DEMO ? null : R0;
    if (!VIEW && !DEMO) {
      (SAVE[li] = SAVE[li] || {}).cur = R0;
      saveSave()
    }
    if (LV.init) {
      const r = LV.init();
      cables = r.cables;
      $('intro').innerHTML = gl(r.intro)
    }
    pend = null;
    won = false;
    revealed = false;
    svg.classList.remove('live');
    $('win').hidden = true;
    $('hint').hidden = true;
    $('term').innerHTML = LV.idleHtml ? sp(LV.idleHtml()) : '<span class="d">C:\\&gt; 等待測試…\n' + $('term').dataset.idle + '</span>';
    layout(pick());
    shInit();
    say(msg);
    if (LV.onLoad) LV.onLoad();
    showLog();
    if (R0.e.length && upto !== 0) replay(R0, upto)
  }
  $('reset').onclick = () => {
    if (busy || replaying) return;
    if (VIEW) {
      viewGo(0);
      return
    }
    DEMO = false;
    fresh('已全部重來。從任一個連接埠拉線開始。');
    REC.t = Date.now();
    saveSave(li)
  };
  /* ---------- 存檔與重播：每一步操作都記下來，重開這一關時照順序快速重播，回到離開時的樣子 ---------- */
  // 給了 lv 就順便排進雲端佇列（有加入班級時）。剛打開、還沒操作的一局 t 是 0，不會蓋掉另一台裝置上的進度
  const saveSave = lv => {
    try {
      localStorage.setItem('nq-save', JSON.stringify(SAVE))
    } catch (e) {}
    if (lv != null && !VIEW) pushSave(lv)
  };
  // 每個操作記一筆事件，同時產生給人看的步驟說明。重播時只產生說明，不重複記錄
  function rec(ev, t) {
    const st = {
      t
    };
    steps.push(st);
    if (!replaying && REC && REC.e.length < 800) {
      REC.e.push(ev);
      REC.t = Date.now();
      const d = SAVE[li] && SAVE[li].done;
      if (ev[0] === 'q' && won && d) {
        d.e.push(ev);
        d.t = REC.t
      }
      saveSave(li)
    }
    showLog();
    return st
  }
  const hasPort = k => typeof k === 'string' && !!D[dv(k)] && !!(D[dv(k)].ports || {})[k.split('.')[1]];
  // 照事件重做一次；找不到對應的按鈕或設備（遊戲改版了）就回傳 false
  function apply(ev) {
    const [t, a, b] = ev, A = $('acts');
    if (t === 'c') {
      if (!hasPort(a) || !hasPort(b)) return false;
      connect(a, b)
    } else if (t === 's') {
      if (!cables[a]) return false;
      selectCable(a)
    } else if (t === 'd') {
      if (!D[a]) return false;
      pickDev(a)
    } else if (t === 'm' || t === 'v') {
      if (!hasPort(a) || !LV.kinds) return false;
      t === 'm' ? setMod(a) : setVlan(a)
    } else if (t === 'k') {
      const x = $('kinds').querySelector(`button[data-k="${CSS.escape(String(a))}"]`);
      if (!x) return false;
      x.click()
    } else if (t === 't') $('test').onclick();
    else if (t === 'h') $('hintBtn').onclick();
    else if (t === 'p') {
      const [m, x, y] = String(b).split(',');
      if (!D[a] || !LV.lay[m] || !(+x >= 0) || !(+y >= 0)) return false;
      (D[a].at = D[a].at || {})[m] = [+x, +y];
      if (m === mode) {
        D[a].x = +x;
        D[a].y = +y;
        place()
      }
    } else if (t === 'b') {
      const x = A.hidden ? null : [...A.querySelectorAll('button')].find(x => (x.dataset.l || x.textContent) === a);
      if (!x) return false;
      x.click()
    } else if (t === 'f') {
      const x = A.hidden ? null : A.querySelector(`select[data-k="${CSS.escape(String(a))}"]`);
      if (!x || ![...x.options].some(o => o.value === b)) return false;
      x.value = b;
      x.dispatchEvent(new Event('change', {
        bubbles: true
      }))
    } else if (t === 'x') {
      if (a && !D[a]) return false;
      runSh(a || null, String(b))
    } else if (t === 'q') {
      const x = $('win').hidden ? null : $('close').querySelector(`button[data-q="${+a}"][data-o="${+b}"]`);
      if (!x) return false;
      x.click()
    } else return false;
    return true
  }
  // 中途換關或重來時 gen 會變，舊的重播就停下來
  async function replay(r, upto) {
    const all = r.e,
      n0 = upto == null ? all.length : Math.min(upto, all.length),
      my = gen;
    let n = 0;
    replaying = true;
    quick = true;
    for (; n < n0; n++) {
      let ok = false;
      try {
        ok = apply(all[n])
      } catch (e) {}
      if (!ok) break;
      while (busy) {
        await new Promise(f => setTimeout(f, 0));
        if (my !== gen) return
      }
    }
    replaying = false;
    quick = false;
    place();
    if (VIEW) {
      if (upto == null) VIEW.labels = steps.map(x => x.t);
      VIEW.at = n;
      VIEW.bad = n < n0;
      viewBar()
    } else if (n < all.length) {
      all.length = n;
      r.t = Date.now();
      saveSave(li);
      say(`遊戲改版了，上次的紀錄只接回前 ${n} 步。`)
    } else say(won ? '這一關上次已經過關，畫面停在你最後的樣子。想再挑戰一次，按「重來」。' : `已接回上次的進度（${n} 步）。想從頭開始，按「重來」。`);
    showLog()
  }

  function showLog() {
    if (replaying) return;
    const L = VIEW && VIEW.labels ? VIEW.labels : steps.map(x => x.t);
    $('logn').textContent = `（${L.length} 步）`;
    $('steps').innerHTML = L.map((t, i) => `<li>${VIEW?`<button data-n="${i+1}"${i+1===VIEW.at?' aria-current="step"':''}>${esc(sp(t))}</button>`:esc(sp(t))}</li>`).join('');
    const d = !VIEW && SAVE[li] && SAVE[li].done;
    $('share').hidden = !!VIEW;
    $('lastwin').hidden = !d || won;
    if (!VIEW) {
      $('shareurl').hidden = true;
      $('sharemsg').textContent = ''
    }
  }
  $('steps').onclick = e => {
    const b = e.target.closest('button[data-n]');
    if (b && VIEW && !busy && !replaying) viewGo(+b.dataset.n)
  };
  /* ---------- 分享：把一局的紀錄壓縮後放在網址的 # 後面。不經過伺服器，打開連結的人看得到每一步 ---------- */
  const b64u = u => {
    let t = '';
    for (const c of u) t += String.fromCharCode(c);
    return btoa(t).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  };
  const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  const zip = async (u, how) => new Uint8Array(await new Response(new Blob([u]).stream().pipeThrough(how)).arrayBuffer());
  async function pack(o) {
    const u = new TextEncoder().encode(JSON.stringify(o));
    return window.CompressionStream ? 'z' + b64u(await zip(u, new CompressionStream('deflate-raw'))) : 'j' + b64u(u)
  }
  async function unpack(s) {
    const u = unb64u(s.slice(1));
    return JSON.parse(new TextDecoder().decode(s[0] === 'z' ? await zip(u, new DecompressionStream('deflate-raw')) : u))
  }
  // 連結來自別人，先檢查格式。事件只會被拿來比對按鈕和設備，不會當成程式或網頁內容執行
  function okRec(p) {
    return !!p && p.v === 1 && Number.isInteger(p.l) && !!BYNO[p.l] && Number.isInteger(p.s) && Array.isArray(p.e) && p.e.length <= 800 &&
      p.e.every(x => Array.isArray(x) && x.length <= 3 && x.every(y => ['string', 'number'].includes(typeof y) && String(y).length <= 200))
  }
  $('share').onclick = async () => {
    if (!REC || VIEW) return;
    const p = {
      v: 1,
      l: li,
      s: REC.s,
      e: REC.e,
      w: won ? 1 : 0,
      n: WHO && WHO.name || ''
    };
    if (XL) p.c = SCHOOL;
    if (LV.F) p.x = Object.fromEntries(LV.F.map(f => [f[0], String(LV.v[f[0]] || '').slice(0, 200)]));
    const u = location.href.split('#')[0] + '#rec=' + await pack(p),
      f = $('shareurl'),
      m = $('sharemsg');
    f.value = u;
    f.hidden = false;
    try {
      await navigator.clipboard.writeText(u);
      m.textContent = '分享連結已複製。貼給同學或老師，對方打開就能一步一步看你的做法。'
    } catch (e) {
      f.select();
      m.textContent = '這個瀏覽器不允許自動複製。上面的連結已經選取好，按 Ctrl+C 複製。'
    }
  };
  $('lastwin').onclick = () => {
    const d = SAVE[li] && SAVE[li].done;
    if (d && !busy && !replaying) startView({
      l: li,
      s: d.s,
      e: d.e,
      w: d.w ? 1 : 0,
      c: XL ? SCHOOL : null
    }, '你上次過關')
  };
  /* ---------- 看紀錄（自己上次過關的，或別人分享的）：不存檔、不計分、不同步 ---------- */
  function startView(p, who) {
    const back = VIEW ? VIEW.back : li;
    setSchool(p.c && typeof p.c === 'object' ? p.c : null);
    VIEW = {
      r: {
        s: p.s,
        e: p.e
      },
      w: p.w,
      who: who || String(p.n || '').slice(0, 20) || '一位同學',
      x: Object.fromEntries(Object.entries(p.x && typeof p.x === 'object' ? p.x : {}).filter(e => typeof e[1] === 'string').map(e => [e[0], e[1].slice(0, 200)])),
      back
    };
    load(p.l, true);
    viewBar();
    $('log').open = true;
    window.scrollTo({
      top: 0,
      behavior: 'auto'
    })
  }

  function viewGo(n) {
    VIEW.at = n;
    fresh(LV.start, VIEW.r, n);
    if (n === 0 || !VIEW.r.e.length) {
      VIEW.bad = false;
      viewBar();
      showLog()
    }
  }

  function leaveView() {
    if (!VIEW) return;
    const b = VIEW.back;
    VIEW = null;
    setSchool(mySchool());
    viewBar();
    $('log').open = false;
    if (location.hash) history.replaceState(null, '', location.href.split('#')[0]);
    return b
  }

  function viewBar() {
    const v = $('viewbar');
    v.hidden = !VIEW;
    if (!VIEW) {
      v.innerHTML = '';
      return
    }
    const N = VIEW.r.e.length;
    v.innerHTML = `<p><b>${esc(VIEW.who)}</b>的「${esc(sp(LV.id+' '+LV.name))}」紀錄${VIEW.w?'（有過關）':'（還沒過關）'}。可以一步一步看，也可以接著操作，都不會影響你自己的進度。</p>` +
      `<div class="btns"><button data-v="0">從頭</button><button data-v="-">上一步</button><span>第 ${VIEW.at||0} / ${N} 步</span><button data-v="+">下一步</button><button data-v="end">最後</button><button data-v="out">回到我的進度</button></div>` +
      (VIEW.bad ? `<p class="bad">這份紀錄來自舊版的遊戲，只能播放到第 ${VIEW.at} 步。</p>` : '')
  }
  $('viewbar').onclick = e => {
    const b = e.target.closest('[data-v]');
    if (!b || !VIEW || busy || replaying) return;
    const k = b.dataset.v,
      N = VIEW.r.e.length,
      at = VIEW.at || 0;
    if (k === 'out') {
      load(leaveView());
      return
    }
    viewGo(k === '0' ? 0 : k === '-' ? Math.max(0, at - 1) : k === '+' ? Math.min(N, at + 1) : N)
  };
  async function openLink() {
    const m = location.hash.match(/^#rec=([zj][A-Za-z0-9_-]+)$/);
    if (!m) return false;
    let p = null;
    try {
      p = await unpack(m[1])
    } catch (e) {}
    if (!okRec(p)) {
      history.replaceState(null, '', location.href.split('#')[0]);
      say('這個分享連結不完整或已經損壞，請對方重新複製一次。', 'bad');
      return false
    }
    startView(p);
    return true
  }
  addEventListener('hashchange', () => {
    if (location.hash.startsWith('#rec=') && !busy && !replaying) openLink()
  });

  function road() {
    $('road').innerHTML = ROAD.map(c => `<h3 class="chap-h">${c[0]}</h3><ol class="road">` + c[1].map(r => {
      const n = PROG.lv[r[2]] || 0;
      const now = r[2] === li && !DISP;
      const req = REQUIRED.includes(r[2]);
      return `<li class="${now?'now':''}${req?' req':''}"><button data-lv="${r[2]}"><span>${r[0]} · ${now?'進行中':n?'<b>'+'★'.repeat(n)+'</b>'+'☆'.repeat(3-n):'還沒過'}</span>${r[1]}<em>${req?'必修':'進階'}</em></button></li>`
    }).join('') + '</ol>').join('');
    summary();
  }
  $('road').onclick = e => {
    const b = e.target.closest('button[data-lv]');
    if (b && !busy && !replaying) {
      load(+b.dataset.lv);
      window.scrollTo({
        top: 0,
        behavior: reduce ? 'auto' : 'smooth'
      })
    }
  };

  function load(i, view, disp) {
    if (!view && VIEW) leaveView();
    if (!view) DISP = !!disp;
    if (opened) {
      const ms = tTake();
      if (ms >= 1000) track({
        t: 'time',
        lv: li,
        ms
      })
    }
    opened = true;
    track({
      t: 'open',
      lv: i
    });
    li = i;
    LV = BYNO[i];
    D = LV.devs;
    $('lvl').textContent = DISP ? '隨機派工 · 報修單' : LV.id === LV.chap ? `${LV.id} · ${LV.name}` : `${LV.chap||CH1} · ${LV.id} ${LV.name}`;
    $('test').textContent = LV.testLabel || '測試連線';
    $('task').innerHTML = gl(LV.task);
    $('intro').innerHTML = gl(LV.intro);
    $('learn').innerHTML = LV.learn.map(x => `<li>${gl(x, true)}</li>`).join('');
    $('tip').innerHTML = gl(LV.tip);
    $('demo').hidden = !DEMO_SOL[LV.key];
    DEMO = false;
    $('see').hidden = !LV.see;
    $('see').innerHTML = LV.see ? '<h2>相關的知識卡</h2><div class="btns">' + LV.see.map(k => {
      const c = CARDS.find(x => x[0] === k);
      return `<button data-see="${k}">${esc(sp(c[1]))}${PROG.cd[k]?'（已答對）':''}</button>`
    }).join('') + '</div>' : '';
    $('home').hidden = !LV.home;
    $('home').innerHTML = LV.home ? '<h2>回學校試試</h2><p class="lead">只看、不改設定。查到的資料可以記在畢業任務的盤點表上。</p><ul>' + LV.home.map(x => `<li>${esc(sp(x))}</li>`).join('') + '</ul>' : '';
    kind = LV.kinds ? Object.keys(LV.kinds)[0] : 'utp';
    const kb = $('kinds');
    kb.hidden = !LV.kinds;
    kb.innerHTML = LV.kinds ? Object.entries(LV.kinds).map(([k, v]) => `<button data-k="${k}" aria-pressed="${k===kind}"><i class="${v.sw||k}"></i><span>${v.name} <small>${v.note||'最遠 '+v.far}</small></span><small>${v.cost}</small></button>`).join('') : '';
    $('term').dataset.idle = LV.idle ? LV.idle : LV.sources ? '按「測試連線」會從各棟各 ping 8.8.8.8' : '按「測試連線」會從教室電腦 ping 8.8.8.8';
    if (!VIEW) try {
      localStorage.setItem('nq-level', String(i))
    } catch (e) {}
    road();
    bars();
    $('toolnote').hidden = true;
    fresh(DISP ? '隨機派工：電話響了。先看報修內容，再決定從哪裡查起。' : LV.start, VIEW ? VIEW.r : !DISP && SAVE[i] && SAVE[i].cur && SAVE[i].cur.e ? SAVE[i].cur : null, VIEW ? VIEW.at : undefined);
  }
  /* ---------- 終端機：自己輸入指令。結果由各關點設備時的選單提供，所以指令和選單按鈕做的是同一件事 ---------- */
  // probe 不是 null 時，onDev 只把選單收集起來，不顯示、不說話，用來查這台設備能執行哪些指令
  let probe = null,
    SHONLY = false;
  const SH = {
    hosts: [],
    host: null
  };
  try {
    SHONLY = localStorage.getItem('nq-shonly') === '1'
  } catch (e) {}
  const SHLIST = ['help', 'ipconfig', 'ipconfig /all', 'ipconfig /renew', 'ipconfig /flushdns', 'ping 127.0.0.1', 'ping ' + GW, 'ping 8.8.8.8', 'ping www.google.com', 'nslookup www.google.com', 'tracert 8.8.8.8', 'arp -a', 'cls'];
  const SHHELP = ['ping 位址或網址　　到不到得了。順序：127.0.0.1 → 閘道 → 外面的 IP → 網址', 'ipconfig　　　　　這台電腦的 IP、遮罩、閘道（加 /all 看 DNS、DHCP 伺服器）', 'ipconfig /renew　　重新向 DHCP 伺服器領一次 IP', 'ipconfig /flushdns 清除 DNS 暫存', 'nslookup 網址　　　網址查不查得到 IP、問的是哪一台 DNS', 'tracert 位址　　　 路上經過哪幾站、斷在哪一站', 'arp -a　　　　　　 這台電腦記得的 IP 和 MAC 對照表', 'cls　　　　　　　　清除畫面'].join('\n');
  const shNorm = t => String(t).toLowerCase().trim().replace(/\s+/g, ' ').replace(/^ipconfig\/(\w+)/, 'ipconfig /$1').replace(/^tracert -d /, 'tracert ').replace(/ localhost$/, ' 127.0.0.1').replace(/ google\.com$/, ' www.google.com');
  // 選單按鈕的文字換成指令，例如「執行 ipconfig /all」→ ipconfig /all、「重新領 IP」→ ipconfig /renew。不是指令就回傳 null
  function shSig(label) {
    let t = String(label);
    const m = t.match(/（([a-z][^）]*)）/i);
    if (m) t = m[1];
    t = shNorm(t.replace(/^執行 /, '').replace('重新領 IP', 'ipconfig /renew').replace('學校首頁', 'www.yhps.ntpc.edu.tw').replace('教網 DNS', DNS1).replace(/閘道 (\d+\.\d+\.\d+\.\d+)/, '$1').replace(/^ping 測試$/, 'ping *'));
    return /^(ping|ipconfig|nslookup|tracert|arp)\b/.test(t) && !/[\u3400-\u9fff]/.test(t) ? t : null
  }

  function shList(id) {
    if (LV.sh === false || !LV.onDev || !D[id] || !canPick(id)) return [];
    probe = [];
    try {
      LV.onDev(id)
    } catch (e) {}
    const l = probe;
    probe = null;
    return l
  }

  function shMatch(list, c) {
    const L = list.map(x => [shSig(x[0]), x]).filter(x => x[0]),
      w = c.split(' ')[0],
      any = /^ipconfig( \/all)?$/;
    const f = L.find(x => x[0] === c) || (c !== w ? L.find(x => x[0] === w + ' *') : null) || (any.test(c) ? L.find(x => any.test(x[0])) : null);
    return f ? f[1] : null
  }
  // 第一章的教室電腦：ping 外面就是按「測試連線」
  const shPc = () => !!D.pc && !LV.check && !LV.sources;

  function shInit() {
    SH.hosts = Object.keys(D).filter(id => shList(id).some(x => shSig(x[0])));
    if (shPc()) SH.hosts.unshift('pc');
    SH.host = SH.hosts[0] || null;
    shUI()
  }

  function shUI() {
    const f = $('sh'),
      n = SH.hosts.length;
    $('shlist').innerHTML = SHLIST.map(x => `<option value="${escA(tr(x))}">`).join('');
    f.hidden = !n;
    $('shonlyl').hidden = !n;
    $('shonly').checked = SHONLY;
    if (!n) return;
    $('shhost').innerHTML = n > 1 ? `<select id="shpick" aria-label="在哪一台執行">${SH.hosts.map(id=>`<option value="${id}"${id===SH.host?' selected':''}>${esc(sp(D[id].name))}</option>`).join('')}</select>&gt;` : esc(sp(D[SH.host].name)) + '&gt;'
  }
  // line 是預設學校的寫法（存檔記的也是它）；畫面上的回顯換成目前學校的
  function runSh(id, line) {
    const c = shNorm(line);
    if (!c) return;
    const nm = id && D[id] ? D[id].name : '電腦',
      echo = `<span class="d">${esc(sp(nm))} C:\\&gt; ${esc(tr(line))}</span>\n`,
      w = c.split(' ')[0],
      out = h => {
        $('term').innerHTML = echo + sp(h)
      };
    if (c === 'cls') {
      $('term').innerHTML = '';
      return
    }
    if (c === 'help' || c === '?') {
      out(SHHELP);
      return
    }
    if (id === 'pc' && shPc() && /^ping (8\.8\.8\.8|www\.google\.com)$/.test(c)) {
      $('test').onclick();
      return
    }
    rec(['x', id || '', line], `在「${nm}」輸入 ${line}`);
    const it = id && id !== 'pc' && !['ping 127.0.0.1', 'ipconfig /flushdns'].includes(c) ? shMatch(shList(id), c) : null;
    if (it) {
      selDev = id;
      $('acts').hidden = true;
      unwin();
      const n0 = sayN,
        h0 = $('term').innerHTML;
      it[1]();
      const t = $('term');
      if (t.innerHTML === h0) {
        if (sayN !== n0) out(esc(lastSay))
      }
      // 結果第一行換成剛才輸入的指令（「ping 測試」這種一次做好幾項的除外）
      else if (!shSig(it[0]).endsWith('*')) t.innerHTML = t.innerHTML.replace(/^<span class="d">C:\\&gt; [^<]*<\/span>\n?/, echo);
      settle(n0, h0);
      place();
      return
    }
    out((c === 'ping 127.0.0.1' ? '<span class="o">回覆自 127.0.0.1：位元組=32 時間&lt;1ms\n回覆自 127.0.0.1：位元組=32 時間&lt;1ms</span>\n（只測試這台電腦自己的網路功能，不經過網路線）' :
      c === 'ipconfig /flushdns' ? 'Windows IP 設定\n<span class="o">已成功清除 DNS 解析快取。</span>' :
      !['ping', 'ipconfig', 'nslookup', 'tracert', 'arp'].includes(w) ? `'${esc(w)}' 不是內部或外部命令、可執行的程式或批次檔。\n輸入 help 看可以用的指令。` :
      `這一關沒有模擬「${esc(nm)}」執行這個指令的結果。\n想想這一關要查的是什麼，換一個指令或換一台設備試試。輸入 help 看說明。`))
  }

  $('sh').onsubmit = e => {
    e.preventDefault();
    if (busy || replaying) return;
    const i = $('shin'),
      v = i.value.trim().slice(0, 80);
    if (!v) return;
    i.value = '';
    runSh(SH.host, untr(v).slice(0, 80));
    i.focus()
  };
  $('sh').onchange = e => {
    if (e.target.id === 'shpick') {
      SH.host = e.target.value;
      $('shin').focus()
    }
  };
  $('shonly').onchange = e => {
    SHONLY = e.target.checked;
    try {
      localStorage.setItem('nq-shonly', SHONLY ? '1' : '0')
    } catch (x) {}
    $('acts').hidden = true;
    say(SHONLY ? '選單不再列出指令。點設備只會看到設定和處理的選項，指令要自己在終端機輸入。' : '選單會再列出指令。')
  };
  /* ---------- 隨機派工：從所有報修單抽一張，不說是哪一章 ---------- */
  let DISP = false;
  const TICKETS = TICKETS_DEF.map(k => lvk(k).no);
  $('disptext').textContent = `從 ${TICKETS.length} 張報修單隨機抽一張，不說是哪一章，就像電話打來的時候一樣。`;
  const chapOf = no => (ROAD.find(c => c[1].some(r => r[2] === no)) || [''])[0];

  function draw() {
    if (busy || replaying) return;
    const pool = TICKETS.filter(n => n !== li);
    load(pool[Math.floor(Math.random() * pool.length)], false, true);
    window.scrollTo({
      top: 0,
      behavior: reduce ? 'auto' : 'smooth'
    })
  }
  $('disp').onclick = draw;
  const dispN = () => {
    const n = PROG.dp || 0;
    $('dispn').textContent = n ? `　你已經用隨機派工結案 ${n} 張。` : ''
  };
  /* ---------- 過關紀錄、樓層、工具箱、知識卡 ---------- */
  const PROG = {
    lv: {},
    cd: {}
  };
  try {
    Object.assign(PROG, JSON.parse(localStorage.getItem('nq-prog') || '{}'))
  } catch (e) {}
  const saveProg = () => {
    try {
      localStorage.setItem('nq-prog', JSON.stringify(PROG))
    } catch (e) {}
  };
  const OSI = ['L1 實體層', 'L2 資料連結層', 'L3 網路層', 'L4 傳輸層', 'L5–L7 應用層'];
  const osiOf = l => l.osi || CHAP_OSI[l.chap || CH1] || [1];
  const TOOLS = TOOLS_DEF.map(t => [t[0], lvk(t[1]).no, t[2]]);

  function bars() {
    $('osi').hidden = DISP;
    const on = osiOf(LV);
    $('osi').innerHTML = OSI.map((n, i) => `<span class="${on.includes(i+1)?'on':''}">${n}</span>`).join('');
    $('tools').innerHTML = '<b>工具箱</b>' + TOOLS.map((t, i) => `<button data-t="${i}" class="${PROG.lv[t[1]]?'':'lock'}">${t[0]}${PROG.lv[t[1]]?'':'（未解鎖）'}</button>`).join('');
  }
  $('tools').onclick = e => {
    const b = e.target.closest('button[data-t]');
    if (!b) return;
    const t = TOOLS[+b.dataset.t],
      n = $('toolnote');
    n.hidden = false;
    n.textContent = PROG.lv[t[1]] ? `${t[0]}：${t[2]}` : `${t[0]} 還沒解鎖。通過「${BYNO[t[1]].id} ${BYNO[t[1]].name}」就會學到。`
  };
  // CARDS 定義在 80_cards.js
  // 過關畫面的「相關的知識卡」：打開那一張並捲過去
  $('see').onclick = e => {
    const b = e.target.closest('button[data-see]');
    if (!b) return;
    const d = $('cards').querySelectorAll('details')[CARDS.findIndex(c => c[0] === b.dataset.see)];
    d.open = true;
    d.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
    d.querySelector('summary').focus({
      preventScroll: true
    })
  };
  // 選項每次隨機排列；data-o 保留原始索引，用來比對答案
  function cards() {
    $('cards').innerHTML = CARDS.map((c, i) => `<details class="card"><summary>${c[1]}<span class="ck">${PROG.cd[c[0]]?'已答對':''}</span></summary><p>${c[2]}</p><p class="q">${c[3]}</p><div class="btns">${c[4].map((o,j)=>[Math.random(),j,o]).sort((x,y)=>x[0]-y[0]).map(([,j,o])=>`<button data-c="${i}" data-o="${j}">${o}</button>`).join('')}</div><p class="fb" id="fb-${i}" aria-live="polite"></p></details>`).join('')
  }
  $('cards').onclick = e => {
    const b = e.target.closest('button[data-c]');
    if (!b) return;
    const c = CARDS[+b.dataset.c],
      f = $('fb-' + b.dataset.c),
      ok = +b.dataset.o === c[5];
    f.textContent = ok ? c[6] : '不是這個。再讀一次上面的說明。';
    f.className = 'fb ' + (ok ? 'ok' : 'bad');
    if (ok && !PROG.cd[c[0]]) {
      PROG.cd[c[0]] = 1;
      saveProg();
      track({
        t: 'card',
        card: c[0]
      });
      b.closest('details').querySelector('.ck').textContent = '已答對';
      summary()
    }
  };

  function summary() {
    dispN();
    const lv = Object.keys(PROG.lv).length,
      st = Object.values(PROG.lv).reduce((a, b) => a + b, 0),
      cd = Object.keys(PROG.cd).length;
    const rq = REQUIRED.filter(n => PROG.lv[n]).length;
    $('prog').textContent = `必修 ${rq} / ${REQUIRED.length}　全部 ${lv} / ${LEVELS.length} 關　星星 ${st} / ${LEVELS.length*3}　知識卡 ${cd} / ${CARDS.length}`
  }
  addEventListener('afterprint', () => document.body.classList.remove('pc'));
  let armed = 0;
  $('wipe').onclick = () => {
    if (Date.now() - armed < 4000) {
      PROG.lv = {};
      PROG.cd = {};
      PROG.dp = 0;
      saveProg();
      SAVE = {};
      saveSave();
      if (!VIEW) fresh(LV.start);
      armed = 0;
      $('wipe').textContent = '清除紀錄';
      road();
      bars();
      cards();
      summary();
      say('過關紀錄已清除。')
    } else {
      armed = Date.now();
      $('wipe').textContent = '再按一次確認清除';
      setTimeout(() => {
        if (armed) {
          armed = 0;
          $('wipe').textContent = '清除紀錄'
        }
      }, 4000)
    }
  };
  /* ---------- 雲端進度：加入班級後把紀錄同步到 /api（worker/index.js）。file:// 或沒加入時什麼都不做 ---------- */
  const API = /^https?:$/.test(location.protocol) ? '/api/' : null,
    TEACH = new URLSearchParams(location.search).has('teacher');
  let WHO = null,
    Q = [],
    sending = false,
    flushT = 0,
    opened = false;
  try {
    WHO = JSON.parse(localStorage.getItem('nq-who') || 'null')
  } catch (e) {}
  try {
    Q = JSON.parse(localStorage.getItem('nq-queue') || '[]')
  } catch (e) {}
  const saveWho = () => {
    try {
      WHO ? localStorage.setItem('nq-who', JSON.stringify(WHO)) : localStorage.removeItem('nq-who')
    } catch (e) {}
  };
  const saveQ = () => {
    try {
      localStorage.setItem('nq-queue', JSON.stringify(Q))
    } catch (e) {}
  };
  // 只算畫面在前景、而且兩分鐘內有操作的時間
  let tAcc = 0,
    lastAct = Date.now();
  ['pointerdown', 'keydown'].forEach(t => addEventListener(t, () => {
    lastAct = Date.now()
  }, true));
  setInterval(() => {
    if (!document.hidden && Date.now() - lastAct < 120e3) tAcc += 5000
  }, 5000);
  const tTake = () => {
    const v = Math.min(tAcc, 15 * 60e3);
    tAcc = 0;
    return v
  };

  function track(ev) {
    if (VIEW || DEMO || replaying || !API || !WHO || WHO.bad || TEACH) return;
    Q.push(ev);
    if (Q.length > 500) Q = Q.slice(-500);
    saveQ();
    clearTimeout(flushT);
    flushT = setTimeout(flush, 400);
    whoBar()
  }
  // 同一關的存檔在佇列裡只留最新的一筆
  function pushSave(lv) {
    const v = SAVE[lv];
    if (!v || !API || !WHO || WHO.bad || TEACH) return;
    Q = Q.filter(x => !(x.t === 'save' && x.lv === lv));
    track({
      t: 'save',
      lv,
      cur: v.cur && v.cur.t ? v.cur : null,
      done: v.done || null
    })
  }
  // 雲端與本機的存檔逐關比時間，留比較新的；本機比較新的送上去。目前這一關換成雲端的版本時重新載入
  async function pullSaves() {
    const r = await call('saves');
    if (!r.ok || !r.d.saves) return;
    const sv = r.d.saves,
      T = x => x && x.t || 0;
    let cur = false;
    for (const k in sv) {
      if (!BYNO[k]) continue;
      const c = sv[k],
        l = SAVE[k] = SAVE[k] || {};
      if (T(c.done) > T(l.done)) l.done = c.done;
      if (T(c.cur) > T(l.cur) && !(+k === li && (busy || replaying || VIEW))) {
        l.cur = c.cur;
        if (+k === li) cur = true
      }
    }
    for (const k in SAVE) {
      const c = sv[k] || {};
      if (T(SAVE[k].cur) > T(c.cur) || T(SAVE[k].done) > T(c.done)) pushSave(+k)
    }
    saveSave();
    if (cur) load(li);
    else showLog()
  }
  async function call(path, opt = {}) {
    const r = await fetch(API + path, {
      ...opt,
      headers: {
        'content-type': 'application/json',
        ...(WHO && WHO.token ? {
          authorization: 'Bearer ' + WHO.token
        } : {})
      }
    });
    let d = {};
    try {
      d = await r.json()
    } catch (e) {}
    if (r.status === 401 && WHO) {
      WHO.bad = true;
      saveWho();
      Q = [];
      saveQ();
      whoBar()
    }
    return {
      ok: r.ok,
      status: r.status,
      d
    };
  }
  async function flush() {
    if (!API || !WHO || WHO.bad || sending || !Q.length) return;
    sending = true;
    const n = Math.min(Q.length, 100);
    try {
      const r = await call('event', {
        method: 'POST',
        body: JSON.stringify({
          events: Q.slice(0, n)
        })
      });
      if (r.ok) {
        Q.splice(0, n);
        saveQ();
        WHO.off = false
      } else if (r.status >= 500) WHO.off = true
    } catch (e) {
      WHO.off = true
    }
    sending = false;
    whoBar();
    if (Q.length && !WHO.bad) setTimeout(flush, WHO.off ? 30e3 : 0);
  }
  addEventListener('online', flush);
  // 雲端與本機逐關取最高星數，再把合併結果送回雲端
  async function pull() {
    if (!API) return;
    try {
      const r = await call('me');
      if (!r.ok) return;
      for (const k in r.d.lv) PROG.lv[k] = Math.max(PROG.lv[k] || 0, r.d.lv[k]);
      for (const c of r.d.cd) PROG.cd[c] = 1;
      WHO.className = r.d.className;
      WHO.resume = r.d.resume;
      WHO.cfg = r.d.cfg || null;
      WHO.school = r.d.school || null;
      saveWho();
      applySchool();
      saveProg();
      road();
      bars();
      cards();
      track({
        t: 'sync',
        lv: PROG.lv,
        cd: Object.keys(PROG.cd)
      });
      await pullSaves();
    } catch (e) {
      WHO.off = true;
      whoBar()
    }
  }
  // 實際套用的學校參數：預設學校 ← 講師的班級設定 ← 學員自己學校的設定。沒加入班級就是預設學校
  const mySchool = () => WHO && !WHO.bad && (WHO.cfg || WHO.school) ? {
    ...(WHO.cfg || {}),
    ...(WHO.school || {})
  } : null;

  function applySchool() {
    if (VIEW) return;
    const b = JSON.stringify(SCHOOL);
    setSchool(mySchool());
    if (JSON.stringify(SCHOOL) !== b && LV && !busy && !replaying) {
      load(li);
      road();
      cards()
    }
  }
  let whoMode = '',
    whoArm = 0,
    whoMsg = '';
  /* 學校網路設定表單：講師開班（縣市層級＋學校範例）和學員（只有學校層級）共用。空白的欄位不送出，沿用上一層的值 */
  const SC_SCHOOL = [
    ['net', '校內網段（前三段）'],
    ['gw', '閘道（最後一段）'],
    ['d0', 'DHCP 範圍起（最後一段）'],
    ['d1', 'DHCP 範圍迄（最後一段）'],
    ['domain', '學校網域'],
    ['st', '教師 SSID'],
    ['ss', '學生 SSID'],
    ['sg', '訪客 SSID'],
    ['si', '設備 SSID'],
    ['school', '學校名稱'],
    ['blds', '各棟名稱（逗號分開）']
  ];
  const SC_CLASS = [
    ['dns', '教育局指定 DNS'],
    ['up', '上游單位名稱'],
    ['upShort', '上游簡稱'],
    ['tel', '上游報修電話'],
    ['sf', '學校對外線路斷了找誰'],
    ['sw', '新核心交換器故障找誰'],
    ['sc', '校端 L3 路由器當機找誰']
  ];
  const SC_WHO = ['自己處理', '找光纖到班維護廠商', '找教育網路中心', '找既有網路維護廠商'];
  // 物件 ↔ 表單欄位的值
  const scFlat = c => c ? {
    net: c.net,
    gw: c.gw,
    d0: c.dhcp && c.dhcp[0],
    d1: c.dhcp && c.dhcp[1],
    domain: c.domain,
    st: c.ssid && c.ssid.t,
    ss: c.ssid && c.ssid.s,
    sg: c.ssid && c.ssid.g,
    si: c.ssid && c.ssid.i,
    school: c.school,
    blds: c.blds,
    dns: c.dns,
    up: c.up,
    upShort: c.upShort,
    tel: c.tel,
    sf: c.split && c.split.fiber,
    sw: c.split && c.split.fw,
    sc: c.split && c.split.core
  } : {};

  function scForm(fields, val, ph) {
    const v = scFlat(val),
      p = scFlat(ph);
    return fields.map(([k, l]) => k === 'sf' || k === 'sw' || k === 'sc' ?
      `<label>${l}<select name="sc_${k}"><option value="">${p[k]!=null?'沿用（'+SC_WHO[p[k]]+'）':'沿用'}</option>${SC_WHO.map((o,i)=>`<option value="${i}"${v[k]!=null&&+v[k]===i?' selected':''}>${o}</option>`).join('')}</select></label>` :
      `<label>${l}<input name="sc_${k}" value="${escA(v[k]??'')}" placeholder="${escA(p[k]??'')}" autocomplete="off" spellcheck="false"></label>`).join('')
  }

  function scRead(f, fields) {
    const g = k => {
        const x = f.elements['sc_' + k];
        return x ? x.value.trim() : ''
      },
      o = {},
      n = k => g(k) === '' ? null : +g(k);
    for (const [k] of fields) {
      const v = g(k);
      if (v === '') continue;
      if (k === 'gw') o.gw = +v;
      else if (k === 'd0' || k === 'd1') {
        if (g('d0') !== '' && g('d1') !== '') o.dhcp = [n('d0'), n('d1')]
      } else if (['st', 'ss', 'sg', 'si'].includes(k))(o.ssid = o.ssid || {})[{
        st: 't',
        ss: 's',
        sg: 'g',
        si: 'i'
      } [k]] = v;
      else if (['sf', 'sw', 'sc'].includes(k))(o.split = o.split || {})[{
        sf: 'fiber',
        sw: 'fw',
        sc: 'core'
      } [k]] = +v;
      else o[k] = v
    }
    return o
  }
  // 合併之後檢查，回傳錯誤訊息或空字串
  const scCheck = (...cs) => {
    const c = JSON.parse(JSON.stringify(DEFAULT_SCHOOL));
    for (const o of cs)
      for (const k in o || {}) c[k] = typeof c[k] === 'object' && !Array.isArray(c[k]) ? {
        ...c[k],
        ...o[k]
      } : o[k];
    try {
      return badSchool(c)
    } catch (e) {
      return '格式不對'
    }
  };
  const escA = t => String(t).replace(/[&<>"]/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;'
  })[c]);

  function whoBar() {
    const w = $('who');
    if (!API) {
      w.hidden = true;
      return
    }
    w.hidden = false;
    if (whoMode === 'join') {
      if (w.querySelector('form')) return;
      const pre = new URLSearchParams(location.search).get('join') || '';
      w.innerHTML = `<form id="joinf"><label>班級代碼<input name="code" value="${escA(pre)}" placeholder="NET-XXXX" autocomplete="off" autocapitalize="characters" required></label><label>你的名字<input name="name" maxlength="20" placeholder="例如 07 王小明" autocomplete="off" required></label><label id="rsl" hidden>復原碼<input name="resume" maxlength="6" autocomplete="off" autocapitalize="characters"></label><button class="go">加入</button><button type="button" data-w="cancel">取消</button><p class="msg">講師會看到你的名字和每一關的過關情形。</p></form>`;
      w.querySelector(pre ? '[name=name]' : '[name=code]').focus();
      return
    }
    if (whoMode === 'school' && WHO && !WHO.bad) {
      if (w.querySelector('form')) return;
      w.innerHTML = `<form id="schoolf"><p class="msg" style="flex-basis:100%">把關卡裡的網段、SSID 換成自己學校的。空白的欄位沿用講師的設定（灰色字）。只會影響你看到的關卡，不會改到學校的設備。</p>${scForm(SC_SCHOOL,WHO.school,{...DEFAULT_SCHOOL,...(WHO.cfg||{})})}<button class="go">儲存</button><button type="button" data-w="sclear">清除，改回講師的設定</button><button type="button" data-w="cancel">取消</button><p class="msg"></p></form>`;
      return
    }
    if (!WHO) {
      w.innerHTML = `<span>還沒加入班級，紀錄只存在這台電腦。</span><button data-w="join">加入班級</button>` + (whoMsg ? `<p class="msg">${whoMsg}</p>` : '');
      return
    }
    const st = WHO.bad ? '<span style="color:var(--bad)">登入已失效，請重新加入</span>' : Q.length ? `${WHO.off?'連不上伺服器，':''}${Q.length} 筆待上傳` : '<span class="ok">已同步 ✓</span>';
    w.innerHTML = `<span><b>${escA(WHO.name)}</b> · ${escA(WHO.className||'')}（${escA(WHO.code)}）· ${st}</span>` + (WHO.bad ? '<button data-w="join">重新加入</button>' : `<button data-w="resume">復原碼</button><button data-w="school">學校網路設定（${WHO.school?'我的學校':WHO.cfg?'講師的設定':'遊戲預設'}）</button>`) + `<button data-w="out">${whoArm?(Q.length&&!WHO.bad?`還有 ${Q.length} 筆沒上傳，`:'')+'再按一次登出':'登出'}</button>` + (whoMsg ? `<p class="msg">${whoMsg}</p>` : '');
  }
  $('who').onclick = e => {
    const a = e.target.closest('[data-w]');
    if (!a) return;
    const k = a.dataset.w;
    if (k === 'join') {
      if (WHO && WHO.bad) {
        WHO = null;
        saveWho()
      }
      whoMode = 'join';
      whoMsg = '';
      whoBar()
    } else if (k === 'cancel') {
      whoMode = '';
      whoBar()
    } else if (k === 'school') {
      whoMode = 'school';
      whoMsg = '';
      whoBar()
    } else if (k === 'sclear') saveMySchoolForm(null);
    else if (k === 'resume') {
      whoMsg = `你的復原碼是 <b>${escA(WHO.resume)}</b>。換電腦時用「加入班級」，輸入同樣的代碼、名字和這組復原碼，就能接回進度。`;
      whoBar()
    } else if (k === 'out') {
      if (Date.now() - whoArm < 4000) {
        // 教室電腦常是共用的：登出時清掉本機紀錄，雲端的還在，下次加入會接回來
        WHO = null;
        saveWho();
        Q = [];
        saveQ();
        PROG.lv = {};
        PROG.cd = {};
        saveProg();
        SAVE = {};
        saveSave();
        setSchool(null);
        if (!VIEW) fresh(LV.start);
        whoArm = 0;
        whoMsg = '已登出，這台電腦的紀錄已清除。雲端紀錄還在。';
        road();
        bars();
        cards();
        whoBar()
      } else {
        whoArm = Date.now();
        whoBar();
        setTimeout(() => {
          if (whoArm) {
            whoArm = 0;
            whoBar()
          }
        }, 4000)
      }
    }
  };
  // 存學員自己的學校設定（表單和 6-3 都用）。成功回傳空字串，失敗回傳原因
  async function saveMySchool(o) {
    if (!API || !WHO || WHO.bad) return '要先加入班級。';
    const bad = o && scCheck(WHO.cfg, o);
    if (bad) return bad;
    const r = await call('me/school', {
      method: 'PUT',
      body: JSON.stringify({
        school: o
      })
    }).catch(() => ({
      ok: false,
      d: {
        error: '連不上伺服器，請確認網路後再試。'
      }
    }));
    if (!r.ok) return r.d.error || '儲存失敗。';
    WHO.school = Object.keys(r.d.school || {}).length ? r.d.school : null;
    saveWho();
    whoMode = '';
    whoMsg = WHO.school ? '已換成你學校的設定，關卡裡的網段和 SSID 都跟著換了。' : '已改回講師的設定。';
    whoBar();
    applySchool();
    return ''
  }
  async function saveMySchoolForm(o) {
    const err = await saveMySchool(o),
      m = $('schoolf') && $('schoolf').querySelector('p.msg:last-of-type');
    if (err && m) {
      m.className = 'msg bad';
      m.textContent = err
    }
  }
  // 6-3 盤點表 → 學校設定：閘道 IP 拆成網段和閘道，DHCP 範圍沿用目前的（撞到閘道就換一段），SSID 依序當作教師、學生、訪客、設備
  function sheetSchool(v) {
    const g = String(v.gw || '').trim();
    if (!isIP(g)) return null;
    const x = g.split('.'),
      h = +x[3],
      o = {
        net: x.slice(0, 3).join('.'),
        gw: h
      };
    o.dhcp = [SCHOOL.dhcp, [101, 200],
      [2, 101],
      [150, 249],
      [10, 109]
    ].find(r => h < r[0] || h > r[1]);
    if (v.school && v.school.trim()) o.school = v.school.trim().slice(0, 30);
    if (v.blds && v.blds.trim()) o.blds = v.blds.trim().slice(0, 60);
    const ss = String(v.ssid || '').split(/[,，、\s]+/).filter(Boolean).slice(0, 4);
    if (ss.length) o.ssid = Object.fromEntries(ss.map((x, i) => ['tsgi' [i], x]));
    return o
  }
  $('who').onsubmit = async e => {
    e.preventDefault();
    const f = e.target;
    if (f.id === 'schoolf') {
      saveMySchoolForm(scRead(f, SC_SCHOOL));
      return
    }
    const m = f.querySelector('.msg'),
      b = f.querySelector('.go');
    const v = f.elements,
      body = {
        code: v.code.value,
        name: v.name.value,
        resume: v.resume.value
      };
    b.disabled = true;
    m.className = 'msg';
    m.textContent = '連線中…';
    try {
      const r = await call('join', {
        method: 'POST',
        body: JSON.stringify(body)
      });
      if (!r.ok) {
        m.className = 'msg bad';
        m.textContent = r.d.error || '加入失敗，請再試一次。';
        if (r.d.need === 'resume') {
          $('rsl').hidden = false;
          v.resume.focus();
          if (r.status === 409) m.textContent += '如果是你，輸入復原碼；不是的話換個名字（例如加上座號）。'
        }
        b.disabled = false;
        return
      }
      WHO = {
        token: r.d.token,
        code: r.d.code,
        name: r.d.name,
        className: r.d.className,
        resume: r.d.resume,
        cfg: r.d.cfg || null,
        school: r.d.school || null
      };
      saveWho();
      applySchool();
      Q = [];
      saveQ();
      whoMode = '';
      whoMsg = body.resume ? '已接回你的進度。' : `加入成功！你的復原碼是 <b>${escA(r.d.resume)}</b>，請抄下來，換電腦時用得到。`;
      track({
        t: 'open',
        lv: li
      });
      await pull();
      whoBar();
    } catch (x) {
      m.className = 'msg bad';
      m.textContent = '連不上伺服器，請確認網路後再試。';
      b.disabled = false
    }
  };
  /* ---------- 講師總表：網址加 ?teacher。班級代碼與講師金鑰存在 nq-teach ---------- */
  let tPick = null,
    TC = [],
    tSel = 0,
    tData = null,
    tErr = '',
    tTimer = 0,
    tShowRs = false,
    tArm = null,
    tForm = '';
  try {
    TC = JSON.parse(localStorage.getItem('nq-teach') || '[]')
  } catch (e) {}
  const saveTC = () => {
    try {
      localStorage.setItem('nq-teach', JSON.stringify(TC))
    } catch (e) {}
  };
  // 表頭兩列：上面是章（第一章），下面是關（1、2…、修）。欄位窄，筆電螢幕一眼看完全部 26 關
  const COLS = ROAD.flatMap(c => c[1].map((r, j) => ({
    lv: r[2],
    ch: j === 0,
    short: r[0] === '序章' ? '序' : r[0].startsWith('報修單') ? '修' + r[0].slice(4) : r[0].split('-')[1],
    full: `${r[0]} ${r[1]}`
  })));
  const CHS = ROAD.map(c => ({
    name: c[0].split('　')[0],
    n: c[1].length,
    full: c[0]
  }));
  const mins = ms => ms < 60e3 ? '不到 1 分鐘' : `約 ${Math.round(ms/60e3)} 分鐘`;
  async function tFetch() {
    const c = TC[tSel];
    if (!c || document.hidden) return;
    try {
      const r = await fetch(`${API}class/${encodeURIComponent(c.code)}`, {
        headers: {
          authorization: 'Bearer ' + c.key
        }
      });
      const d = await r.json();
      if (r.ok) {
        tData = d;
        if (!tForm) tErr = '';
        if (d.name !== c.name) {
          c.name = d.name;
          saveTC()
        }
      } else if (!tForm) tErr = d.error || '讀取失敗';
    } catch (e) {
      if (!tForm) tErr = '連不上伺服器，稍後自動重試。'
    }
    // 正在填表單時不重畫，免得打到一半的內容被清掉
    if (!tForm) teachView();
  }
  // 匯出 CSV：每人一列，先放總計，再放每關的星數、測試次數、分鐘。加 BOM 讓 Excel 認得 UTF-8
  const CSVL = ROAD.flatMap((c, ci) => c[1].map(r => r[0].startsWith('報修單') ? `${ci}-${r[0]}` : r[0]));

  function tCsv() {
    if (!tData) return;
    const S = tData.students;
    // 名字開頭是 = + - @ 時 Excel 會當公式，前面加 ' 擋掉
    const q = v => {
      v = String(v ?? '');
      if (/^[=+\-@\t\r]/.test(v)) v = "'" + v;
      return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v
    };
    const d = t => {
      if (!t) return '';
      const x = new Date(t),
        p = n => String(n).padStart(2, '0');
      return `${x.getFullYear()}-${p(x.getMonth()+1)}-${p(x.getDate())} ${p(x.getHours())}:${p(x.getMinutes())}`
    };
    const head = ['學員', '復原碼', '過關數', '星星總數', '知識卡', '最後上線', ...COLS.map((k, i) => CSVL[i] + ' 星數'), ...COLS.map((k, i) => CSVL[i] + ' 測試次數'), ...COLS.map((k, i) => CSVL[i] + ' 分鐘')];
    const rows = S.map(x => {
      const L = k => x.lv[k.lv] || {};
      return [x.name, x.resume, COLS.filter(k => L(k).s > 0).length, COLS.reduce((a, k) => a + (L(k).s || 0), 0), x.cards, d(x.last_seen),
        ...COLS.map(k => L(k).s || 0), ...COLS.map(k => L(k).a || 0), ...COLS.map(k => L(k).ms ? Math.round(L(k).ms / 6e3) / 10 : 0)
      ]
    });
    const csv = '\ufeff' + [head, ...rows].map(r => r.map(q).join(',')).join('\r\n') + '\r\n';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], {
      type: 'text/csv;charset=utf-8'
    }));
    a.download = `新北網管小學堂_${tData.name}_${d(tData.now).slice(0,10)}.csv`.replace(/[\\/:*?"<>|]/g, '_');
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function tPoll() {
    clearInterval(tTimer);
    tData = null;
    tFetch();
    tTimer = setInterval(tFetch, 5000)
  }

  function teachView() {
    const t = $('teach'),
      c = TC[tSel];
    const tabs = TC.map((x, i) => `<button data-t="sel" data-i="${i}" aria-pressed="${i===tSel}">${escA(x.name||x.code)}</button>`).join('');
    let h = `<h2 style="margin:0">講師總表</h2><div class="row">${tabs}<button data-t="new">開新班</button><button data-t="add">加入既有班級</button><a href="./">回到遊戲</a></div>`;
    if (tForm === 'new') h += `<form class="who" data-f="new"><label>講師密碼<input name="secret" type="password" autocomplete="off" required></label><label>班級名稱<input name="name" maxlength="40" placeholder="例如 10/8 新竹場" required></label><label>班級代碼（選填）<input name="code" maxlength="12" placeholder="例如 NET-KM2026" autocomplete="off" autocapitalize="characters"></label><details class="scbox"><summary>學校網路設定（選填，不填就用遊戲預設的學校）</summary><p class="msg">縣市層級的設定全班共用；學校層級的是範例，學員可以再改成自己學校的。</p>${scForm(SC_CLASS,null,DEFAULT_SCHOOL)}${scForm(SC_SCHOOL,null,DEFAULT_SCHOOL)}</details><button class="go">開班</button><button type="button" data-t="cancel">取消</button><p class="msg">${tErr&&tForm?escA(tErr):'講師密碼是部署時用 wrangler secret 設定的 TEACHER_SECRET。'}</p></form>`;
    if (tForm === 'cfg' && TC[tSel]) h += `<form class="who" data-f="cfg"><p class="msg" style="flex-basis:100%">修改「${escA(TC[tSel].name||TC[tSel].code)}」的學校網路設定。學員下次開啟或同步時套用，玩到一半的關卡照樣接得回來。空白的欄位用遊戲預設值。</p>${scForm(SC_CLASS,tData&&tData.cfg,DEFAULT_SCHOOL)}${scForm(SC_SCHOOL,tData&&tData.cfg,DEFAULT_SCHOOL)}<button class="go">儲存</button><button type="button" data-t="cancel">取消</button><p class="msg">${tErr&&tForm?escA(tErr):''}</p></form>`;
    if (tForm === 'add') h += `<form class="who" data-f="add"><label>班級代碼<input name="code" required autocomplete="off"></label><label>講師金鑰<input name="key" required autocomplete="off"></label><button class="go">加入</button><button type="button" data-t="cancel">取消</button><p class="msg">${tErr&&tForm?escA(tErr):'在別台電腦開的班，輸入當時顯示的代碼和金鑰。'}</p></form>`;
    if (!c) {
      t.innerHTML = h + (tForm ? '' : '<p class="row">還沒有班級。按「開新班」建立一個。</p>');
      return
    }
    const link = `${location.origin}${location.pathname}?join=${c.code}`;
    h += `<div class="row">班級代碼 <code>${escA(c.code)}</code>學員連結 <code>${escA(link)}</code><button data-t="copy">複製連結</button><button data-t="cfg">學校網路設定（${tData&&tData.cfg?'已自訂':'遊戲預設'}）</button>講師金鑰 <code>${escA(c.key)}</code><button data-t="forget">${tArm==='forget'?'再按一次移除':'從這台電腦移除'}</button></div>`;
    if (tErr && !tForm) h += `<p class="row" style="color:var(--bad)">${escA(tErr)}</p>`;
    if (!tData) {
      t.innerHTML = h + '<p class="row">讀取中…</p>';
      return
    }
    const S = tData.students,
      now = tData.now,
      on = S.filter(x => now - (x.last_seen || 0) < 120e3).length;
    const stuck = (x, lv, p) => p && !p.w && (p.a >= 5 || (x.cur_lv === lv && now - x.cur_at > 600e3 && now - (x.last_seen || 0) < 300e3));
    let nStuck = 0;
    const rows = S.map(x => {
      const won = COLS.filter(k => (x.lv[k.lv] || {}).s > 0).length;
      const cells = COLS.map(k => {
        const p = x.lv[k.lv],
          st = stuck(x, k.lv, p);
        if (st) nStuck++;
        const cl = [k.ch ? 'ch' : '', p && p.s ? 'w' : p ? 'o' : '', x.cur_lv === k.lv && now - (x.last_seen || 0) < 300e3 ? 'now' : '', st ? 'stuck' : ''].join(' ').trim();
        const tip = p ? `${x.name} · ${k.full}：${p.s?'★'.repeat(p.s)+' 過關':'還沒過'}，測試 ${p.a} 次，${mins(p.ms)}${p.h!=null?`，提示 ${p.h} 次`:''}` : `${x.name} · ${k.full}：還沒開始`;
        return `<td class="${cl}${p?' pk':''}" title="${escA(tip+(p?'。點一下看每一步':''))}"${p?` data-t="cell" data-s="${x.id}" data-l="${k.lv}" tabindex="0"`:''}${tPick&&tPick.sid===x.id&&tPick.lv===k.lv?' aria-current="true"':''}>${p&&p.s?'★'.repeat(p.s):p&&p.a?p.a:p?'·':''}</td>`
      }).join('');
      return `<tr><th class="nm"><i class="${now-(x.last_seen||0)<120e3?'on':''}"></i>${escA(x.name)}${tShowRs?`<small>${escA(x.resume)}</small>`:''}<button data-t="rm" data-i="${x.id}" title="移除 ${escA(x.name)}">${tArm==='rm'+x.id?'確定移除？':'✕'}</button></th><td>${won}</td>${cells}</tr>`
    }).join('');
    const foot = COLS.map(k => {
      const ps = S.map(x => x.lv[k.lv]).filter(Boolean),
        w = ps.filter(p => p.s).length,
        a = ps.length ? ps.reduce((s, p) => s + p.a, 0) / ps.length : 0;
      return `<td class="${k.ch?'ch':''}" title="${escA(k.full)}：${w}/${S.length} 人過關，平均測試 ${a.toFixed(1)} 次">${w}<br>${a?a.toFixed(1):''}</td>`
    }).join('');
    h += `<div class="row"><span>${S.length} 位學員，${on} 人在線上${nStuck?`，<b style="color:var(--bad)">${nStuck} 格可能卡關</b>`:''}</span><label><input type="checkbox" data-t="rs" ${tShowRs?'checked':''}> 顯示復原碼</label><button data-t="csv">匯出 CSV</button><span>每 5 秒更新</span></div>`;
    if (tPick) {
      const P = tPick,
        d = P.d,
        L = x => x.e.length + ' 步';
      h += `<div class="row tpick"><b>${escA(P.name)} · ${escA(P.full)}</b>` + (!d ? '<span>讀取中…</span>' : d.error ? `<span style="color:var(--bad)">${escA(d.error)}</span>` :
          !d.cur && !d.done ? '<span>這一關雲端上沒有存檔。學員可能是在加入班級之前玩的，或是用舊版的遊戲。</span>' :
          (d.cur && d.cur.e.length ? `<button data-t="watch" data-w="cur">看目前這一局（${L(d.cur)}${d.cur.w?'，有過關':''}）</button>` : '') +
          (d.done ? `<button data-t="watch" data-w="done">看過關的那一局（${'★'.repeat(d.done.w||1)}，${L(d.done)}）</button>` : '')) +
        '<button data-t="pclose">關閉</button><span>會在新分頁打開，可以一步一步看。</span></div>'
    }
    h += S.length ? `<div class="tscroll"><table class="tgrid"><thead><tr><th class="nm" rowspan="2">學員</th><th rowspan="2">過關</th>${CHS.map(c=>`<th class="ch" colspan="${c.n}" title="${escA(c.full)}">${escA(c.name)}</th>`).join('')}</tr><tr>${COLS.map(k=>`<th class="${k.ch?'ch':''}" title="${escA(k.full)}">${escA(k.short)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody><tfoot><tr><th class="nm">過關人數<br>平均測試</th><td></td>${foot}</tr></tfoot></table></div>` :
      '<p class="row">還沒有學員加入。把上面的學員連結給學員，或請他們在遊戲上方按「加入班級」輸入班級代碼。</p>';
    h += '<p class="row">★ 過關星數；數字是還沒過關時的測試次數；· 開過但還沒測試。藍框是學員目前開著的關卡。紅底是可能卡關：測試 5 次以上還沒過，或同一關停留超過 10 分鐘。游標停在格子上看細節，點一下可以看學員每一步怎麼做；表頭的「修」是各章的報修單。名字旁的 ✕ 可以移除學員。</p>';
    t.innerHTML = h;
  }
  if (TEACH && API) {
    document.body.classList.add('teach');
    $('teach').hidden = false;
    document.title = '講師總表 · 新北網管小學堂';
    $('teach').onclick = async e => {
      const a = e.target.closest('[data-t]');
      if (!a) return;
      const k = a.dataset.t;
      if (k === 'sel') {
        tSel = +a.dataset.i;
        tArm = null;
        tPick = null;
        tPoll()
      } else if (k === 'cell') {
        const c = TC[tSel],
          sid = +a.dataset.s,
          lv = +a.dataset.l,
          x = tData.students.find(y => y.id === sid),
          col = COLS.find(y => y.lv === lv);
        tPick = {
          sid,
          lv,
          name: x ? x.name : '',
          full: col ? col.full : '',
          d: null
        };
        teachView();
        try {
          const r = await fetch(`${API}class/${encodeURIComponent(c.code)}/student/${sid}/save/${lv}`, {
              headers: {
                authorization: 'Bearer ' + c.key
              }
            }),
            d = await r.json();
          if (tPick && tPick.sid === sid && tPick.lv === lv) {
            tPick.d = r.ok ? d : {
              error: d.error || '讀取失敗'
            };
            teachView()
          }
        } catch (e) {
          if (tPick) {
            tPick.d = {
              error: '連不上伺服器。'
            };
            teachView()
          }
        }
      } else if (k === 'watch') {
        const r = tPick && tPick.d && tPick.d[a.dataset.w];
        if (!r) return;
        const x = tData && tData.students.find(y => y.id === tPick.sid),
          sc = {
            ...(tData && tData.cfg || {}),
            ...(x && x.school || {})
          };
        const u = location.origin + location.pathname + '#rec=' + await pack({
          v: 1,
          l: tPick.lv,
          s: r.s,
          e: r.e,
          w: r.w ? 1 : 0,
          n: tPick.name,
          ...(Object.keys(sc).length ? {
            c: sc
          } : {})
        });
        window.open(u, '_blank', 'noopener')
      } else if (k === 'pclose') {
        tPick = null;
        teachView()
      } else if (k === 'new' || k === 'add' || k === 'cfg') {
        tForm = k;
        tErr = '';
        teachView();
        const x = $('teach').querySelector('form input');
        if (x) x.focus()
      } else if (k === 'cancel') {
        tForm = '';
        tErr = '';
        teachView()
      } else if (k === 'rs') {
        tShowRs = a.checked;
        teachView()
      } else if (k === 'csv') tCsv();
      else if (k === 'copy') {
        try {
          await navigator.clipboard.writeText(`${location.origin}${location.pathname}?join=${TC[tSel].code}`);
          a.textContent = '已複製'
        } catch (x) {}
      } else if (k === 'forget' || k === 'rm') {
        const arm = k === 'rm' ? 'rm' + a.dataset.i : 'forget';
        if (tArm !== arm) {
          tArm = arm;
          teachView();
          setTimeout(() => {
            if (tArm === arm) {
              tArm = null;
              teachView()
            }
          }, 4000);
          return
        }
        tArm = null;
        if (k === 'forget') {
          TC.splice(tSel, 1);
          saveTC();
          tSel = 0;
          tPoll()
        } else {
          const c = TC[tSel];
          await fetch(`${API}class/${encodeURIComponent(c.code)}/student/${a.dataset.i}`, {
            method: 'DELETE',
            headers: {
              authorization: 'Bearer ' + c.key
            }
          });
          tFetch()
        }
      }
    };
    $('teach').onsubmit = async e => {
      e.preventDefault();
      const f = e.target,
        v = f.elements,
        b = f.querySelector('.go'),
        msg = t => {
          tErr = t;
          b.disabled = false;
          [...f.querySelectorAll('.msg')].pop().textContent = t
        };
      b.disabled = true;
      try {
        if (f.dataset.f === 'new' || f.dataset.f === 'cfg') {
          const cfg = {
              ...scRead(f, SC_CLASS),
              ...scRead(f, SC_SCHOOL)
            },
            bad = scCheck(cfg);
          if (bad) {
            msg('學校網路設定：' + bad);
            return
          }
          if (f.dataset.f === 'cfg') {
            const c = TC[tSel],
              r = await fetch(`${API}class/${encodeURIComponent(c.code)}`, {
                method: 'PUT',
                headers: {
                  'content-type': 'application/json',
                  authorization: 'Bearer ' + c.key
                },
                body: JSON.stringify({
                  cfg
                })
              }),
              d = await r.json();
            if (!r.ok) {
              msg(d.error || '儲存失敗');
              return
            }
            tForm = '';
            tErr = '';
            tFetch();
            return
          }
          const r = await fetch(API + 'class', {
            method: 'POST',
            headers: {
              'content-type': 'application/json'
            },
            body: JSON.stringify({
              secret: v.secret.value,
              name: v.name.value,
              code: v.code.value,
              cfg
            })
          });
          const d = await r.json();
          if (!r.ok) {
            msg(d.error || '開班失敗');
            return
          }
          TC.push({
            code: d.code,
            name: d.name,
            key: d.key
          })
        } else {
          const code = v.code.value.toUpperCase().replace(/\s/g, ''),
            key = v.key.value.toUpperCase().replace(/\s/g, '');
          const r = await fetch(`${API}class/${encodeURIComponent(code)}`, {
            headers: {
              authorization: 'Bearer ' + key
            }
          });
          const d = await r.json();
          if (!r.ok) {
            tErr = d.error || '讀取失敗';
            b.disabled = false;
            f.querySelector('.msg').textContent = tErr;
            return
          }
          if (!TC.some(x => x.code === code)) TC.push({
            code,
            name: d.name,
            key
          })
        }
        saveTC();
        tSel = TC.length - 1;
        tForm = '';
        tErr = '';
        tPoll()
      } catch (x) {
        tErr = '連不上伺服器。';
        b.disabled = false;
        f.querySelector('.msg').textContent = tErr
      }
    };
    $('teach').onkeydown = e => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset.t === 'cell') {
        e.preventDefault();
        e.target.click()
      }
    };
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) tFetch()
    });
    teachView();
    if (TC.length) tPoll();
  }
  const pick = () => svg.parentElement.clientWidth < 600 ? 'narrow' : 'wide';
  cards();
  let st = lvk('pro').no;
  try {
    const v = localStorage.getItem('nq-level');
    if (v != null && BYNO[+v]) st = +v
  } catch (e) {}
  setSchool(mySchool());
  load(st);
  openLink();
  if (API && new URLSearchParams(location.search).get('join') && !WHO) whoMode = 'join';
  if (!TEACH) {
    whoBar();
    if (WHO && !WHO.bad) pull().then(flush)
  }
  new ResizeObserver(() => {
    const m = pick();
    if (m !== mode && !busy) layout(m)
  }).observe(svg.parentElement);
  // 自動測試鉤子：守門腳本用它逐關重播解法；一般使用不會碰到
  window.__nq = { load, apply, lvk, LEVELS, ROAD, CARDS, get won() { return won }, get li() { return li }, get busy() { return busy }, get fails() { return fails }, D: () => D, LV: () => LV, S, cables: () => cables };
