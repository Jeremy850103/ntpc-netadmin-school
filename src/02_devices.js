  /* ---------- 新北版設備：依光纖到班案與現況盤點的機型畫埠位 ----------
     校端 L3 路由器 Juniper EX3400-24T（既有，維持不變）
     核心光纖交換器 MikroTik CRS518-16XS-2XQ-RM（16 埠 SFP28＋2 埠 QSFP28，畫面只畫 6＋2）
     副控點交換器 MikroTik CRS326-24S+2Q+RM（24 埠 SFP+＋2 埠 QSFP+）
     教室端交換器 Edgecore ECS4125-10PL（8 埠 2.5G PoE＋2 埠 10G SFP+，畫面畫 6＋2）
     既有匯聚 D-Link DGS-1250-52XMP、校內測速主機（雷達）、壁掛光纖收容盒、光纖終端箱 */
  const SCH = { name: '雲海國小', abbr: 'YHPS', code: '014250' };
  const CH1 = '第一章 · L1 光纖到班', CH2 = '第二章 · L2 交換器', CH3 = '第三章 · L3 門牌與路由', CH4 = '第四章 · L4–L7 窗口與守門員', CH5 = '第五章 · 無線教室', CH6 = '第六章 · 智慧網管', CH7 = '第七章 · 斷線大搜查', CH0 = '序章';
  const CHAP_OSI = { [CH0]: [], [CH1]: [1], [CH2]: [2], [CH3]: [3], [CH4]: [4, 5], [CH5]: [1, 2], [CH6]: [1, 2, 3], [CH7]: [1, 2, 3, 4, 5] };
  const rj = (dx, label, extra = {}) => Object.assign({ dx, dy: 56, label }, extra);
  const sfp = (dx, label, extra = {}) => Object.assign({ dx, dy: 56, label, media: 'sfp' }, extra);
  const L3 = () => ({
    name: '校端 L3 路由器',
    sub: `Juniper EX3400 · ${SCH.abbr}-L3`,
    brand: 'JUNIPER',
    kind: 'rack',
    bridge: true,
    w: 332,
    h: 92,
    ports: {
      up: sfp(40, '對外'),
      s1: sfp(104, 'SFP+1'),
      s2: sfp(140, 'SFP+2'),
      g1: rj(196, 'ge-1'),
      g2: rj(232, 'ge-2'),
      g3: rj(268, 'ge-3'),
      g4: rj(304, 'ge-4')
    }
  });
  const CORE = () => ({
    name: '核心光纖交換器',
    sub: `CRS518 · ${SCH.abbr}-CORE`,
    brand: 'MIKROTIK',
    kind: 'rack',
    bridge: true,
    psu: 2,
    w: 332,
    h: 92,
    ports: {
      s1: sfp(34, 'S1'), s2: sfp(70, 'S2'), s3: sfp(106, 'S3'), s4: sfp(142, 'S4'), s5: sfp(178, 'S5'), s6: sfp(214, 'S6'),
      q1: sfp(262, 'Q1', { media: 'qsfp' }), q2: sfp(302, 'Q2', { media: 'qsfp' })
    }
  });
  // 教室端交換器（機櫃版）：P1–P6 畫 6 個 2.5G PoE 埠，S1、S2 是 10G SFP+ 上行
  const EDGE = (name, sub) => ({
    name: name || '教室端交換器',
    sub: sub || 'ECS4125-10PL · 8 埠 PoE',
    brand: 'EDGECORE',
    kind: 'rack',
    bridge: true,
    w: 332,
    h: 88,
    ports: (() => {
      const o = {};
      for (let i = 1; i <= 6; i++) o['p' + i] = rj(34 + (i - 1) * 36, 'P' + i, { poe: true });
      o.s1 = sfp(262, 'S1');
      o.s2 = sfp(298, 'S2');
      return o
    })()
  });
  const OLDAGG = (name, sub) => ({
    name: name || '既有匯聚交換器',
    sub: sub || `DGS-1250 · ${SCH.abbr}-L2-01`,
    brand: 'D-LINK',
    kind: 'rack',
    bridge: true,
    w: 332,
    h: 88,
    ports: (() => {
      const o = {};
      for (let i = 1; i <= 6; i++) o['p' + i] = rj(34 + (i - 1) * 36, String(i));
      o.s1 = sfp(262, 'S1');
      o.s2 = sfp(298, 'S2');
      return o
    })()
  });
  const RADAR = () => ({
    name: '校內測速主機',
    sub: `雷達 · ${SCH.abbr}-RADAR`,
    brand: 'RADAR',
    kind: 'rack',
    bridge: false,
    w: 332,
    h: 72,
    ports: { p: rj(34, 'LAN') }
  });
  const PC = (name, sub) => ({
    name: name || '教室電腦',
    sub: sub || '',
    kind: 'pc',
    w: 150,
    h: 124,
    ports: { nic: { dx: 112, dy: 97, label: '網路孔' } }
  });
  // 對外線路：校端 L3 的「對外」埠接教育局骨幹，不能動
  const UPLINK = {
    a: 'net',
    b: 'l3.up',
    cls: 'fiber',
    occupy: true,
    msg: '這條黃色的是學校連到教育局教育網路中心的線路，拔了全校都斷線，別動它！'
  };
  // 校端 L3 ↔ 新核心：10G SFP+ 或 DAC（邀標書第 30 條）
  const L3CORE = (p = 'core.s1', msg) => ({
    a: 'l3.s1',
    b: p,
    cls: 'fixed',
    occupy: true,
    msg: msg || '這條是新核心交換器往校端 L3 路由器的 10G 介接線，已經接好了，不用動它。'
  });
  /* 副控點交換器（精簡盒狀）：上行兩埠（接核心）、下行三埠（接教室端） */
  const AGG = (n, sub) => ({
    name: n + ' 棟副控交換器',
    sub: sub || `CRS326 · ${SCH.abbr}-AGG-${n}`,
    pwr: true,
    psu: 2,
    kind: 'box',
    bridge: true,
    still: true,
    w: 220,
    h: 96,
    ports: {
      up: sfp(36, '上行 1'),
      up2: sfp(80, '上行 2'),
      d1: sfp(130, 'D1'),
      d2: sfp(166, 'D2'),
      d3: sfp(202, 'D3')
    }
  });
  /* 教室端交換器（精簡盒狀）：一個 10G 上行、一個教室 RJ45 */
  const ACC = (n, sub) => ({
    name: n,
    sub: sub || '教室端 ECS4125-10PL',
    pwr: true,
    kind: 'box',
    bridge: true,
    still: true,
    w: 100,
    h: 96,
    ports: {
      up: sfp(30, '上行'),
      x: rj(72, '教室', { dy: 60, poe: true })
    }
  });
  const TREE = () => ({
    l3: L3(),
    core: CORE(),
    da: AGG('A'),
    db: AGG('B'),
    a1: ACC('A 棟 1F'),
    a2: ACC('A 棟 2F'),
    b1: ACC('B 棟 1F'),
    b2: ACC('B 棟 2F')
  });
  const TREE_LAY = {
    wide: {
      W: 900, H: 560,
      net: { x: 226, y: 44 },
      rack: { x: 40, y: 98, w: 372, h: 424 },
      pos: { l3: [60, 122], core: [60, 262], da: [450, 120], db: [450, 330], a1: [740, 70], a2: [740, 176], b1: [740, 300], b2: [740, 406] }
    },
    narrow: {
      W: 440, H: 620,
      net: { x: 220, y: 42 },
      rack: { x: 34, y: 98, w: 372, h: 214 },
      pos: { l3: [54, 108], core: [54, 212], da: [4, 344], db: [226, 344], a1: [6, 496], a2: [114, 496], b1: [226, 496], b2: [334, 496] }
    }
  };
  const TREE_ZONES = {
    wide: [[450, 104, '副控點：每棟一台（CRS326）'], [740, 56, '教室端：每間教室一台（ECS4125-10PL）']],
    narrow: [[4, 334, '副控點：每棟一台'], [6, 486, '教室端：每間教室一台']]
  };
  const TREE_FIXED = () => [UPLINK, L3CORE()];
  const treeAllow = (a, b) => {
    const tier = x => x === 'l3' ? -1 : x === 'core' ? 0 : x[0] === 'd' ? 1 : 2,
      bld = x => x[0] === 'd' ? x[1] : x[0].toLowerCase();
    const d = [a.split('.')[0], b.split('.')[0]].sort((x, y) => tier(x) - tier(y)),
      t = d.map(tier).join('');
    if (t[0] === '-') return '校端 L3 路由器只接新核心交換器，那條線已經接好了。';
    if (t === '01') return null;
    if (t === '12') return bld(d[0]) === bld(d[1]) ? null : '這間教室在另一棟，光纖拉不過去。教室端接自己那一棟的副控點交換器。';
    if (t === '02') return '直接接核心也會通，但單棟 6 間以下教室才直達機房。這所學校多棟，先接到該棟的副控點交換器。';
    if (t === '22') return '教室端一台串一台，前面那台壞了，後面全部跟著斷。這正是光纖到班要收攏的舊做法，每間教室各自接回副控。';
    return '兩台副控互接可以當備援，但沒設定好會形成迴圈。這一關先不接。'
  };
  // 縮小版桌機、筆電、盒狀設備（含無線）
  const DESK = (name, sub) => ({ name, sub, kind: 'desk', still: true, w: 108, h: 100, ports: { p: { dx: 84, dy: 88, label: '網路孔' } } });
  const LAPTOP = (name, sub) => ({ name, sub, kind: 'laptop', still: true, w: 130, h: 84, ports: {}, tag: '' });
  const BOX = (name, sub) => ({ name, sub, kind: 'box', still: true, w: 100, h: 96, ports: { p: { dx: 50, dy: 60, label: '網路孔' } } });
  const AP = (name, sub) => Object.assign(BOX(name, sub), { kind: 'ap' });
  const WDEV = (name, sub) => ({ name, sub, kind: 'box', still: true, w: 100, h: 96, ports: {}, tag: '' });
  const DEST = (name, ip) => ({ name, sub: ip, ip, kind: 'box', still: true, w: 100, h: 96, ports: {}, tag: '還沒判斷' });
  // 五台教室設備接在一台教室端交換器的版面（第二、三、四章共用）
  const L5 = {
    wide: {
      W: 900, H: 540,
      net: { x: 226, y: 44 },
      rack: { x: 40, y: 98, w: 372, h: 424 },
      pos: { l3: [60, 122], sw: [60, 262], e1: [450, 120], e2: [600, 120], e3: [750, 120], e4: [525, 300], e5: [675, 300] }
    },
    narrow: {
      W: 440, H: 580,
      net: { x: 220, y: 42 },
      rack: { x: 34, y: 98, w: 372, h: 214 },
      pos: { l3: [54, 108], sw: [54, 212], e1: [14, 340], e2: [170, 340], e3: [326, 340], e4: [92, 452], e5: [248, 452] }
    }
  };
  // 教室端交換器的 S1 是往副控的 10G 上行；這些關卡把副控與核心省略，直接畫到校端 L3
  const SWFIX = () => [UPLINK, {
    a: 'l3.s1',
    b: 'sw.s1',
    cls: 'fixed',
    occupy: true,
    msg: '這條是教室端交換器經副控、核心回到校端 L3 的上行（畫面省略中間兩層），不用動它。'
  }];
  const swAllow = (a, b) => {
    const d = [a.split('.')[0], b.split('.')[0]];
    return d.includes('sw') && d.some(x => x[0] === 'e') ? null : '這一關的設備都接在教室端交換器上。'
  };
  const IPC = (ip, mask, gw, extra = '') => `<span class="d">C:\\&gt; ipconfig</span>\n  IPv4 位址 . . . : ${ip}\n  子網路遮罩 . . : ${mask}\n  預設閘道 . . . : ${gw||'（空白）'}${extra}`;
  function ipEval(c, dupe) {
    const no = { gw: false, srv: false, net: false };
    if (!c.ip.startsWith(NET + '.')) return { ...no, why: 'ip' };
    if (c.ip === GW) return { ...no, why: 'isgw' };
    if (dupe) return { ...no, why: 'dupe' };
    const g = c.gw === GW, m = c.mask === '255.255.255.0';
    return { gw: true, srv: g && m, net: g, why: !g ? 'gw' : !m ? 'mask' : null }
  }
  /* 報修單的結案紀錄：M 是各原因的 {rc 根本原因, pv 預防措施, say 回覆老師的說明}，k 是這次的原因 */
  const CLOSE = (M, k, pvX, rcX = []) => {
    const m = M[k];
    return [
      ['1. 根本原因是什麼？', m.rc, [...Object.keys(M).filter(x => x !== k).map(x => M[x].rc), ...rcX].slice(0, 3), '對。紀錄寫下根本原因，下次遇到類似的症狀，就知道先查哪裡。'],
      ['2. 要避免再發生，最該做的預防措施是？', m.pv, pvX, '對。修好是治標，預防才是治本。'],
      ['3. 要怎麼回覆報修的老師？', `已經修好了。${m.say}。之後再遇到，請記下時間和是哪幾台電腦，直接找我。`, ['修好了，是網路設備的問題。之後如果又不能上網，再打電話給我就好。', `已經修好了。原因是${m.rc}，相關設定已經調整完畢。`, '處理好了。網路的東西很複雜，細節說了您也不太懂，有問題再找我就好。'], '對。用老師聽得懂的話說明原因，不丟術語，再告訴他下次怎麼回報。']
    ]
  };
  const NOTE = {
    wide: [[450, 440, '前任資訊組長的交接筆記'], [450, 462, `閘道 ${GW}　DNS ${DNS1}`], [450, 484, `DHCP 範圍 ${NET}.101 到 ${NET}.200（校端 L3 發放）`]],
    narrow: [[14, 474, '前任資訊組長的交接筆記'], [14, 496, `閘道 ${GW}　DNS ${DNS1}`], [14, 518, `DHCP 範圍 ${NET}.101 到 ${NET}.200`]]
  };
  const DHCPF = [{ k: 'end', label: '發放範圍的最後一個位址', opts: [NET + '.119', NET + '.200', NET + '.254'] }, { k: 'dns', label: '發放的 DNS 伺服器', opts: [SRV + '.53', DNS1, GW] }];
  const RULEF = [103, 104, 105].map(n => ({ k: 'r' + n, label: '規則 ' + n, opts: ['啟用', '停用'] }));
  const DHCPV = (c, full) => {
    const a = host(101), b = c.end ? host(+c.end.split('.')[3]) : 0, n = c.end && b >= a ? b - a + 1 : 0;
    return `<span class="d">校端 L3 路由器 › DHCP 伺服器（教學網段）</span>\n  發放範圍 . . : ${c.end?NET+'.101 到 '+c.end:'（未設定）'}\n  已發出 . . . : ${full?n:Math.min(n,Math.round(n*.57))} / ${n}\n  預設閘道 . . : ${GW}\n  DNS 伺服器 . : ${c.dns||'（未設定）'}\n  租用期限 . . : 8 小時`
  };
  const RULEV = (c, bad) => '<span class="d">校端 L3 路由器 › 存取控制清單（由上往下比對，符合就停）</span>\n  編號｜來源 → 目的｜服務｜動作｜狀態\n' + [
    ['101', '任何 → 學校網站', '80、443', '允許', '啟用'],
    ['102', '教學網段 → 校務系統', '443', '允許', '啟用'],
    ['103', '訪客網段 → 校內網段', '任何', '拒絕', c.r103],
    ['104', '任何 → 教育局公告之惡意網站清單', '任何', '拒絕', c.r104],
    ['105', '教學網段 → 校外', bad ? '443' : '23', '拒絕', c.r105],
    ['106', '校內網段 → 校外', '任何', '允許', '啟用']
  ].map(r => '  ' + r.join('｜')).join('\n');
  const RULENOTE = c => c.r103 === '停用' || c.r104 === '停用' ? ['<span class="x">提醒：規則 103、104 是擋訪客和惡意網站的資安規則，跟這次的問題無關，不要停用。</span>'] : [];
  const cfgFail = (L, id, k) => { if (D[id].cfg[k] !== L.good[id][k]) fails++ };
  const esc = t => t.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  // 可重現亂數（mulberry32）：存檔只記種子和操作
  let seed = 0;
  const rnd = () => {
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  };
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a };
  const pickOne = a => a[Math.floor(rnd() * a.length)];
  // 智慧網管用語
  const NMS = '智慧網管系統';
  const WHO_OPTS = ['自己處理', '找光纖到班維護廠商', '找教育網路中心', '找既有網路維護廠商', '不是學校的設備'];
  // 副控點交換器（機櫃版）：S1–S6 畫 6 個 SFP+ 10G、Q1、Q2 是 QSFP+ 40G
  const AGGR = (n, sub) => ({
    name: (n ? n + ' 棟' : '') + '副控點交換器',
    sub: sub || `CRS326 · ${SCH.abbr}-AGG-${n||'B'}`,
    brand: 'MIKROTIK',
    kind: 'rack',
    bridge: true,
    psu: 2,
    w: 332,
    h: 92,
    ports: {
      s1: sfp(34, 'S1'), s2: sfp(70, 'S2'), s3: sfp(106, 'S3'), s4: sfp(142, 'S4'), s5: sfp(178, 'S5'), s6: sfp(214, 'S6'),
      q1: sfp(262, 'Q1', { media: 'qsfp' }), q2: sfp(302, 'Q2', { media: 'qsfp' })
    }
  });
  // 一種線材就好的關卡：OS2 單模光纖，兩端 LR 模組已裝好
  const FIBER_KIND = { fiber: { name: 'OS2 單模光纖', note: '兩端 LR 模組已裝', far: '10 公里', max: 10000, cost: '', media: 'sfp', direct: true, sw: 'lr' } };
  const FIBER_UTP_KINDS = { utp: { name: 'Cat6 網路線', max: 100, far: '100 公尺', cost: '$', media: 'rj' }, ...FIBER_KIND };
