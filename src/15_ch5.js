    /* ===== 第五章 無線教室 ===== */
    {
      key: '5-1', no: 19, id: '5-1', chap: CH5,
      name: '選對名字選對車道',
      task: '任務：幫每台設備選 SSID 和頻段',
      min: 0, max: 0, s2: 'first', testLabel: '測試連線',
      idle: '五台設備都設定好，按「測試連線」',
      intro: '學校的無線網路有四個名字（SSID），各自通往不同的隔間：教師、學生、訪客、設備。頻段則像車道：2.4 GHz 是鄉間小路，慢又擠，但穿牆能力強、傳得遠；5 GHz 是高速公路，快，但隔一道牆就弱很多。',
      start: '點每一台設備，幫它選 SSID 和頻段。注意設備下方的說明：有的只支援 2.4 GHz，有的離 AP 很遠。',
      devs: { ...RACK4(), e1: LAPTOP('老師筆電', '支援 5 GHz'), e2: WDEV('學生平板', '支援 5 GHz'), e3: WDEV('來賓手機', '來賓自己帶的'), e4: WDEV('舊印表機', '只支援 2.4 GHz'), e5: WDEV('遠端感測器', '隔兩道牆') },
      POOL: {
        t: [{ name: '老師筆電', sub: '支援 5 GHz', lap: 1, band: '5 GHz' }, { name: '老師的舊筆電', sub: '只支援 2.4 GHz', lap: 1, band: '2.4 GHz', why: 'old' }, { name: '老師筆電', sub: '在走廊盡頭的辦公室', lap: 1, band: '2.4 GHz', why: 'far' }],
        s: [{ name: '學生平板', sub: '支援 5 GHz', band: '5 GHz' }, { name: '學生平板', sub: '在隔兩道牆的教室', band: '2.4 GHz', why: 'far' }, { name: '學生筆電', sub: '支援 5 GHz', lap: 1, band: '5 GHz' }],
        g: [{ name: '來賓手機', sub: '來賓自己帶的', band: '' }, { name: '來賓筆電', sub: '演講者自己帶的', lap: 1, band: '' }],
        i: [{ name: '舊印表機', sub: '只支援 2.4 GHz', band: '2.4 GHz', why: 'old' }, { name: '遠端感測器', sub: '隔兩道牆', band: '2.4 GHz', why: 'far' }, { name: '投影機', sub: '支援 5 GHz', band: '5 GHz' }, { name: '門禁讀卡機', sub: '只支援 2.4 GHz', band: '2.4 GHz', why: 'old' }]
      },
      SSID: { t: 'YHPS-Teacher', s: 'YHPS-Student', g: 'YHPS-Guest', i: 'YHPS-IoT' },
      fixed: SWFIX(), lay: L5, need: [], allow: swAllow,
      init() {
        const P = this.POOL, pick = a => a[Math.floor(rnd() * a.length)], io = shuffle(P.i.slice()).slice(0, 2);
        let set = [['t', pick(P.t)], ['s', pick(P.s)], ['g', pick(P.g)], ['i', io[0]], ['i', io[1]]];
        const ids = shuffle(['e1', 'e2', 'e3', 'e4', 'e5']);
        this.want = {}; this.prof = {};
        set.forEach(([r, f], n) => { const id = ids[n], d = this.devs[id]; Object.assign(d, f.lap ? LAPTOP(f.name, f.sub) : WDEV(f.name, f.sub)); delete d.lap; d.cfg = { ssid: '', band: '' }; d.tag = '還沒設定'; this.want[id] = [this.SSID[r], f.band]; this.prof[id] = { ...f, role: r } });
        return { cables: [], intro: this.intro }
      },
      onCfg(id) { const c = D[id].cfg; D[id].tag = c.ssid || c.band ? `${c.ssid?tr(c.ssid).replace(/^.*[-_]/,'').slice(0,10):'?'} · ${c.band||'?'}` : '還沒設定' },
      onDev(id) { showCfg(id, `${D[id].name}（${D[id].sub}）`, [{ k: 'ssid', label: 'SSID', opts: ['YHPS-Teacher', 'YHPS-Student', 'YHPS-Guest', 'YHPS-IoT'] }, { k: 'band', label: '頻段', opts: ['2.4 GHz', '5 GHz'] }]) },
      why(id) {
        const c = D[id].cfg, w = this.want[id], f = this.prof[id], n = D[id].name;
        if (f.why === 'old' && c.band === '5 GHz') return `${n}只支援 2.4 GHz，它根本看不到 5 GHz 的訊號，連不上。`;
        if (f.why === 'far' && c.band === '5 GHz') return `${n}和 AP 隔了好幾道牆，5 GHz 穿不過去，訊號太弱一直斷線。距離遠、有隔牆的設備用 2.4 GHz。`;
        if (c.ssid !== w[0]) return { t: `${n}要連 YHPS-Teacher 才進得了校務系統。`, s: `${n}要連 YHPS-Student，學生不應該進到教師或設備的隔間。`, g: `${n}是外人的設備，只能連 YHPS-Guest。讓外人進到校內的隔間，資料就有風險。`, i: `${n}是設備，連 YHPS-IoT，和人用的網路分開。` }[f.role];
        if (w[1] && c.band !== w[1]) return `${n}支援 5 GHz、離 AP 也不遠，卻選了 2.4 GHz。連得上，但又慢又擠。主力設備走 5 GHz。`;
        return null
      },
      check() {
        const ids = ['e1', 'e2', 'e3', 'e4', 'e5'], H = '五台設備的連線狀況';
        if (ids.some(id => !D[id].cfg.ssid || !D[id].cfg.band)) return { ok: false, free: true, head: H, lines: [], msg: '還有設備沒設定完。每一台都要選 SSID 和頻段。' };
        const lines = ids.map(id => `<span class="${this.why(id)?'x':'o'}">${D[id].name}：${this.why(id)?'有問題':'連線良好'}</span>`), bad = ids.find(id => this.why(id));
        return bad ? { ok: false, head: H, lines, msg: this.why(bad) } : { ok: true, head: H, lines }
      },
      goals: [['五台設備都設定完', () => [1, 2, 3, 4, 5].every(i => { const c = lvk('5-1').devs['e' + i].cfg || {}; return c.ssid && c.band })]],
      extra: '先看設備下方的說明，再選頻段',
      passMsg: '過關！每台設備都進了對的隔間、走了對的車道。',
      hints: ['SSID 看「誰在用」：老師、學生、來賓各有自己的名字，印表機和感測器這類設備用 YHPS-IoT。', '頻段看「設備和距離」：新的筆電、平板、手機走 5 GHz。', '只支援 2.4 GHz 的舊設備，還有離 AP 遠、隔著牆的設備，選 2.4 GHz。'],
      learn: ['<strong>SSID</strong> 是無線網路的名字。學校用不同的 SSID 把教師、學生、訪客、設備分到不同的隔間（VLAN）。', '<strong>2.4 GHz</strong> 慢、擠、干擾多，但穿牆強、傳得遠；<strong>5 GHz</strong> 快，但穿牆弱。', '主力設備走 5 GHz，舊設備和遠處的設備留在 2.4 GHz。'],
      tip: '實務經驗：老師抱怨「連得上但進不了校務系統」，先問他連的是哪一個 SSID。連到訪客或學生網路，是最常見的原因。',
      see: ['pmac'],
      home: ['用手機看學校有哪些 SSID，問清楚每一個給誰用、是 2.4 GHz 還是 5 GHz，記在盤點表上。']
    },

    {
      key: '5-2', no: 20, id: '5-2', chap: CH5,
      name: '擺對位置選對頻道',
      task: '任務：改善三間教室的無線訊號',
      min: 3, max: 3, s2: 'first', testLabel: '量測訊號',
      noCut: 'AP 的線是好的。點 AP 調整它的頻道和位置。',
      idle: '按「量測訊號」，看每間教室的訊號強度和干擾',
      intro: '三間教室各有一台 2.4 GHz 的 AP，老師都說「訊號有，但常常卡住」。當初安裝的人圖方便，頻道隨手設，有的 AP 還被塞進櫃子裡。光纖到班完工後 AP 會改接教室端的 PoE 埠，這是把位置和頻道一起整理的好時機。',
      start: '先看畫面下方的教室排列，哪幾間相鄰。點 AP 可以改頻道和擺放位置。先按「量測訊號」看現況。',
      devs: { ...RACK4(), e1: AP('教室 A', ''), e2: AP('教室 B', ''), e3: AP('教室 C', '') },
      ROOMS: [{ pairs: [['e1', 'e2'], ['e2', 'e3']], wide: '教室排列：A ｜ B ｜ C（相鄰的會互相干擾）', narrow: '教室排列：A ｜ B ｜ C', ex: '1、6、11，或 1、6、1' }, { pairs: [['e1', 'e3'], ['e3', 'e2']], wide: '教室排列：A ｜ C ｜ B（相鄰的會互相干擾）', narrow: '教室排列：A ｜ C ｜ B', ex: 'A 1、C 6、B 11，或 A 1、C 6、B 1' }, { pairs: [['e1', 'e2'], ['e2', 'e3'], ['e1', 'e3']], wide: 'A、B 相鄰，C 在兩間的正上方：三間兩兩互相干擾', narrow: 'A、B 相鄰，C 在正上方：兩兩干擾', ex: '1、6、11，三間都要不一樣' }],
      fixed: SWFIX(), lay: L5, need: [], allow: swAllow,
      init() {
        const rm = this.room = this.ROOMS[Math.floor(rnd() * 3)], P = ['天花板中央', '鐵櫃裡面', '牆角地上'], C = ['1', '4', '6', '11'], ids = ['e1', 'e2', 'e3'], pick = a => a[Math.floor(rnd() * a.length)];
        this.zones = { wide: [[450, 440, '訊號強度：-65 dBm 以上良好，-75 dBm 以下容易斷線'], [450, 462, rm.wide]], narrow: [[14, 460, '-65 dBm 以上良好，-75 dBm 以下容易斷線'], [14, 482, rm.narrow]] };
        do ids.forEach(id => { const d = this.devs[id]; d.cfg = { ch: pick(C), pos: pick(P) }; d.subfn = () => `頻道 ${d.cfg.ch}` }); while (ids.every(id => this.devs[id].cfg.pos === P[0]) || !this.clash(this.devs));
        this.hints = ['先處理位置。AP 要放在高處、教室中央，周圍不要有金屬。', '再處理頻道。看畫面下方的教室排列，相鄰的兩間教室不能用同一個或太接近的頻道。', `2.4 GHz 互不重疊的頻道只有 1、6、11。這次的排列可以用 ${rm.ex}。`];
        return { cables: [1, 2, 3].map(i => ({ a: 'e' + i + '.p', b: 'sw.p' + i })), intro: this.intro }
      },
      onDev(id) { showCfg(id, `${D[id].name} 的 AP`, [{ k: 'ch', label: '頻道', opts: ['1', '4', '6', '11'] }, { k: 'pos', label: '擺放位置', opts: ['天花板中央', '鐵櫃裡面', '牆角地上'] }]) },
      dbm: p => ({ '天花板中央': -48, '鐵櫃裡面': -79, '牆角地上': -71 }[p]),
      clash(ds = D) { const c = id => +ds[id].cfg.ch; return this.room.pairs.find(p => Math.abs(c(p[0]) - c(p[1])) < 5) },
      check() {
        const ids = ['e1', 'e2', 'e3'], H = '三間教室的量測結果', cl = this.clash(), hit = id => cl && cl.includes(id);
        const lines = ids.map(id => { const s = this.dbm(D[id].cfg.pos); return `<span class="${s<-65||hit(id)?'x':'o'}">${D[id].name}：訊號 ${s} dBm　${hit(id)?'干擾嚴重':'干擾低'}</span>` });
        const weak = ids.find(id => this.dbm(D[id].cfg.pos) < -65);
        if (weak) return { ok: false, head: H, lines, msg: D[weak].cfg.pos === '鐵櫃裡面' ? `${D[weak].name} 的 AP 被放在鐵櫃裡。金屬會把無線訊號擋住，等於把它關在籠子裡。移到天花板中央。` : `${D[weak].name} 的 AP 放在牆角地上，訊號被桌椅和人擋住，還有一半打到牆外。移到天花板中央。` };
        if (cl) return { ok: false, head: H, lines, msg: `${D[cl[0]].name} 和 ${D[cl[1]].name} 相鄰，頻道是 ${D[cl[0]].cfg.ch} 和 ${D[cl[1]].cfg.ch}，太接近了，兩台互相蓋台。2.4 GHz 只有 1、6、11 三個頻道互不重疊。` };
        return { ok: true, head: H, lines }
      },
      goals: [['三台 AP 的位置都適當', () => ['e1', 'e2', 'e3'].every(id => (lvk('5-2').devs[id].cfg || {}).pos === '天花板中央')], ['相鄰教室的頻道互不干擾', () => lvk('5-2').devs.e1.cfg && !lvk('5-2').clash()]],
      extra: '先量測，看清楚是訊號弱還是干擾，再調整',
      passMsg: '過關！三間教室訊號良好、互不干擾。工具「訊號強度」已經學會。',
      hints: [],
      learn: ['AP 要放在<strong>高處、中央</strong>，遠離金屬櫃、水塔、微波爐。', '相鄰的 AP 要錯開頻道。2.4 GHz 只有 <strong>1、6、11</strong> 三個頻道互不重疊。', '訊號強度用 <strong>dBm</strong> 表示，數字越接近 0 越強。-65 dBm 以上才算穩定。'],
      tip: '實務經驗：手機裝一個 Wi-Fi 分析 App，走一圈就能看到每個位置的訊號強度，以及附近有哪些 AP 擠在同一個頻道。',
      see: ['speed'],
      home: ['手機裝一個 Wi-Fi 分析 App，在一間教室的前、中、後各量一次訊號，看有沒有低於 -65 dBm 的角落，以及附近 AP 用了哪些頻道。']
    },

    {
      key: '5-3', no: 31, id: '5-3', chap: CH5,
      name: 'AP 改接教室端',
      task: '任務：把教室 AP 改接到新教室端交換器，三個 SSID 都要能用',
      min: 1, max: 2, s2: 'first', firstLabel: '一次改對埠模式', testLabel: '測試連線',
      idle: '按「測試連線」會用三個 SSID 各連一次，看能不能領到 IP',
      intro: '這間教室的 AP 原本接在走廊舊交換器的 Trunk 埠，同時發出教師、學生、訪客三個 SSID，各走不同 VLAN。新教室端交換器裝好了，要把 AP 改接到它的 PoE 埠。教室端的埠預設是教學 VLAN 20 的 Access 模式，接 AP 的那一埠要改成 Trunk。',
      start: '把 AP 的線從舊交換器改接到教室端交換器的 P1，再點教室端交換器把 P1 改成 Trunk。',
      devs: (() => { const sw = EDGE(); sw.tap = true; return { sw, old: { name: '走廊舊交換器', sub: 'D-Link DGS-1210-10P', kind: 'box', bridge: true, still: true, w: 200, h: 96, ports: { up: rj(36, '上行', { dy: 60 }), d1: rj(120, 'Trunk', { dy: 60 }) } }, ap: Object.assign(AP('教室 AP', '三個 SSID'), { need: 26 }), e3: WDEV('學生平板', 'YHPS-Student') } })(),
      fixed: [{ a: 'net', b: 'sw.s1', cls: 'fiber', occupy: true, msg: '新教室端往副控的 10G 光纖，已經接好。' }, { a: 'net', b: 'old.up', cls: 'fixed', occupy: true, msg: '走廊舊交換器往既有匯聚的上行，這一關不用動。' }],
      lay: {
        wide: { W: 900, H: 500, net: { x: 450, y: 44 }, rack: { x: 0, y: 0, w: 0, h: 0 }, pos: { sw: [40, 250], old: [560, 110], ap: [620, 280], e3: [760, 400] } },
        narrow: { W: 440, H: 640, net: { x: 220, y: 42 }, rack: { x: 0, y: 0, w: 0, h: 0 }, pos: { old: [110, 110], sw: [54, 260], ap: [60, 420], e3: [300, 420] } }
      },
      zones: { wide: [[40, 236, '教室壁掛箱（新）'], [560, 96, '走廊']], narrow: [[14, 250, '教室壁掛箱（新）'], [110, 96, '走廊']] },
      need: [], allow: () => null,
      init() { this.devs.sw.cfg = { p1: 'Access VLAN 20' }; return { cables: [{ a: 'old.d1', b: 'ap.p' }], intro: this.intro } },
      onDev(id) {
        if (id === 'sw') return showCfg('sw', '教室端交換器 P1 的埠模式', [{ k: 'p1', label: 'P1', opts: ['Access VLAN 20', 'Trunk（放行 30、100、200）'] }]);
        if (id === 'ap') { say('AP 同時發出 YHPS-Teacher（VLAN 200）、YHPS-Student（VLAN 100）、YHPS-Guest（VLAN 30），需要接在 Trunk 埠，而且需要 PoE 供電。'); return }
        say('學生平板連的是 YHPS-Student。')
      },
      apOn() { return cables.some(c => (dv(c.a) === 'ap' && c.b === 'sw.p1') || (dv(c.b) === 'ap' && c.a === 'sw.p1')) },
      check() {
        const H = '用三個 SSID 各連一次', onSw = S().link('ap', 'sw'), onOld = S().link('ap', 'old'), trunk = D.sw.cfg.p1.startsWith('Trunk'), viaP1 = this.apOn();
        const lines = onOld ? ['<span class="o">YHPS-Teacher：領到 IP（走舊交換器）</span>', '<span class="o">YHPS-Student：領到 IP（走舊交換器）</span>', '<span class="o">YHPS-Guest：領到 IP（走舊交換器）</span>'] : !onSw ? ['<span class="x">AP 沒有連線</span>'] : trunk && viaP1 ? ['<span class="o">YHPS-Teacher：領到 10.235 網段 IP</span>', '<span class="o">YHPS-Student：領到 10.233 網段 IP</span>', '<span class="o">YHPS-Guest：領到 10.231 網段 IP</span>'] : ['<span class="x">YHPS-Teacher：169.254（領不到）</span>', '<span class="o">YHPS-Student：領到 10.213 網段 IP（錯的網段）</span>', '<span class="x">YHPS-Guest：169.254（領不到）</span>'];
        if (onOld) return { ok: false, free: true, head: H, lines, msg: 'AP 還接在舊交換器。把那條線拔掉，改接到新教室端交換器的 P1。' };
        if (!onSw) return { ok: false, free: true, head: H, lines, msg: 'AP 沒有接線。' };
        if (!viaP1) return { ok: false, free: true, head: H, lines, msg: '這一關請把 AP 接在 P1，埠模式的設定是針對 P1。' };
        if (!trunk) return { ok: false, head: H, lines, msg: 'AP 接上了，但 P1 是 Access VLAN 20，三個 SSID 的資料都被塞進教學 VLAN，教師和訪客網路領不到 IP。把 P1 改成 Trunk。' };
        return { ok: true, head: H, lines }
      },
      goals: [['AP 接到教室端交換器的 P1', () => lvk('5-3').apOn()], ['P1 改成 Trunk', () => (lvk('5-3').devs.sw.cfg || {}).p1 === 'Trunk（放行 30、100、200）']],
      extra: '接線前先想好 AP 要放行哪幾個 VLAN',
      passMsg: '過關！AP 改接到教室端，三個 SSID 都正常，也改由 PoE 供電。',
      hints: ['點 AP 的線拔掉，從 AP 的網路孔拉一條線到教室端交換器的 P1。', 'AP 發出三個 SSID，每個 SSID 用不同的 VLAN，接 AP 的埠一定要是 Trunk。', '點教室端交換器，把 P1 的埠模式改成「Trunk（放行 30、100、200）」。'],
      learn: ['AP 接的那一埠是 <strong>Trunk</strong>，每個 SSID 用到的 VLAN 都要放行，漏掉一個，那個 SSID 就領不到 IP。', '邀標書第二十四條要求原有 AP 改接教室端；改接時<strong>埠模式要跟著設</strong>，換線之後還要改 Trunk。本案的 VLAN 範本會把 AP 埠設成 Trunk。', '改接後 AP 由教室端 <strong>PoE</strong> 供電，教室端支援依 ping 或 SNMP 自動重新供電，AP 當機時自動斷電重啟。'],
      tip: '實務經驗：改接 AP 之後一定要用每一個 SSID 實際連線測試，不能只看 AP 的燈亮。',
      see: ['pmac'],
      home: ['問光纖到班施工單位：自己學校的 AP 改接是哪一批、教室端接 AP 的埠會用哪一個 VLAN 範本。']
    },

    {
      key: 't5', no: 21, id: '報修單', chap: CH5, osi: [2, 3, 5],
      name: '平板可以，電腦不行',
      task: '報修單：同一間教室，不同命運',
      min: 1, max: 1, s2: 'first', firstLabel: '沒有做多餘的處理', testLabel: '測試連線',
      noCut: 'AP 的線是好的。平板能上網，代表 AP 和線路都正常。',
      idle: '按「測試連線」會從平板和筆電各開啟校務系統',
      intro: '老師很困惑：「明明在同一間教室、連同一台 AP，為什麼學生的平板可以上網，我的筆電就是不行？」同一台 AP 會發出好幾個 SSID，每個 SSID 通往不同的隔間，規則也不同。',
      start: '點筆電和平板，比較它們連的 SSID 和拿到的 IP。AP 接在教室端交換器的 P1。',
      devs: (() => { const sw = EDGE(); sw.tap = true; sw.ports.p1.label = 'P1 Trunk'; const lap = LAPTOP('老師的筆電', ''); return { l3: L3(), core: CORE(), aggr: AGGR('B'), sw, e1: AP('無線 AP', '發出多個 SSID'), e2: lap, e3: WDEV('學生平板', 'YHPS-Student') } })(),
      fixed: SWFIX(), lay: L5, need: [], allow: swAllow,
      init() {
        const f = this.cause = ['guest', 'auth', 'trunk'][Math.floor(rnd() * 3)], d = this.devs.e2;
        d.ssid = f === 'guest' ? 'YHPS-Guest' : 'YHPS-Teacher'; d.auth = f !== 'auth'; this.trunk = f !== 'trunk'; d.noip = f === 'trunk'; d.tag = 'Wi-Fi 已連線'; d.subfn = () => d.ssid;
        this.devs.e3.tag = '可以上網';
        return { cables: [{ a: 'e1.p', b: 'sw.p1' }], intro: this.intro }
      },
      ok() { const d = D.e2; return d.ssid === 'YHPS-Teacher' && this.trunk && !d.noip && d.auth },
      ip() { const d = D.e2; return d.noip ? '169.254.44.9' : d.ssid === 'YHPS-Guest' ? SEG.wl1 + '.' + SCH_NO + '.57' : SEG.wl3 + '.' + SCH_NO + '.15' },
      onDev(id) {
        const L = this, d = D.e2;
        if (id === 'e1') { say('AP 同時發出 YHPS-Teacher（VLAN 200）、YHPS-Student（VLAN 100）、YHPS-Guest（VLAN 30）三個 SSID，都走同一條線回教室端交換器。'); return }
        if (id === 'e3') { say(`學生平板連的是 YHPS-Student，IP 是 ${SEG.wl2}.${SCH_NO}.23，可以上網。記下它的 SSID，和筆電比一比。`); return }
        if (id === 'sw') return showActs('教室端交換器：', [
          ['查看 P1 的 Trunk 設定', () => say(L.trunk ? 'P1 是 Trunk，放行 VLAN 30、100、200。三個 SSID 的資料都過得去。' : 'P1 是 Trunk，但只放行 VLAN 30 和 100。YHPS-Teacher 用的 VLAN 200 沒有被放行，教師網路的資料到這裡就被丟掉了。')],
          ['把 VLAN 200 加進 Trunk', () => { if (!L.trunk) { L.trunk = true; say('VLAN 200 加進去了。請筆電重新領一次 IP。', 'ok') } else { fails++; say('VLAN 200 本來就有放行，不用改。', 'bad') } }],
          ['不處理', () => {}]
        ]);
        showActs('老師的筆電：', [
          ['ipconfig /all', () => { showTerm('<span class="d">C:\\&gt; ipconfig /all</span>\n  無線網路 SSID . : ' + d.ssid + '\n  IPv4 位址 . . . : ' + L.ip() + '\n  預設閘道 . . . : ' + (d.noip ? '（空白）' : L.ip().replace(/\d+$/, '254'))); say(d.noip ? '連的是 YHPS-Teacher，但 IP 是 169.254 開頭，沒領到。教師網路的 VLAN 在某個地方斷了。' : d.ssid === 'YHPS-Guest' ? '筆電連的是 YHPS-Guest，拿到訪客網段的 IP。平板連的是 YHPS-Student。它們不在同一個隔間。' : '連的是 YHPS-Teacher，也領到教師網段的 IP。第三層沒問題，往上查。') }],
          ['開啟瀏覽器', () => say(d.noip ? '無法連線到網際網路。' : d.ssid === 'YHPS-Guest' ? '跳出「訪客上網登入」頁面，要輸入當日的訪客密碼。' : !d.auth ? '跳出「教師網路登入」頁面，要輸入教育局單一簽入帳號。老師說他以為是廣告，每次都直接關掉。' : '網頁正常開啟。')],
          ['改連 YHPS-Teacher', () => { if (d.ssid !== 'YHPS-Teacher') { d.ssid = 'YHPS-Teacher'; say('改連 YHPS-Teacher 了。筆電之前記住了訪客網路，每次都自動連過去。', 'ok') } else { fails++; say('筆電本來就連 YHPS-Teacher。', 'bad') } }],
          ['在登入頁輸入學校帳號', () => { if (d.ssid === 'YHPS-Guest') { fails++; say('訪客網路登入後只能上外面的網站，校務系統還是進不去。老師應該連教師專用的 SSID。', 'bad') } else if (d.noip) { fails++; say('筆電沒有 IP，連登入頁都打不開。', 'bad') } else if (!d.auth) { d.auth = true; say('登入成功。教師網路要先通過帳號認證才放行，那個頁面不是廣告。', 'ok') } else { fails++; say('已經登入過了。', 'bad') } }],
          ['重新領 IP', () => { if (d.ssid === 'YHPS-Teacher' && !L.trunk) say('重新領取失敗：DHCP 沒有回應。', 'bad'); else { d.noip = false; say(`筆電領到 ${L.ip()}。`, 'ok') } }],
          ['不處理', () => {}]
        ])
      },
      check() {
        const ok = this.ok(), H = '開啟校務系統', lines = ['<span class="o">學生平板：成功</span>', ok ? '<span class="o">老師的筆電：成功</span>' : '<span class="x">老師的筆電：無法連線</span>'];
        return ok ? { ok: true, head: H, lines } : { ok: false, free: true, head: H, lines, msg: '筆電還是進不去。點筆電執行 ipconfig /all，看它連的是哪個 SSID、拿到什麼 IP，再開瀏覽器看看。', at: 'e2' }
      },
      goals: [['筆電連上教師網路並通過認證', () => { const L = lvk('t5'), d = L.devs.e2; return d.ssid === 'YHPS-Teacher' && L.trunk && !d.noip && d.auth }]],
      extra: '先比較兩台的 SSID 和 IP，再決定怎麼處理',
      passMsg: '修好了！老師的筆電進得了校務系統。',
      hints: ['點筆電執行 ipconfig /all，看 SSID 那一行。和平板連的是不是同一個？', 'SSID 是 YHPS-Guest，就改連 YHPS-Teacher。SSID 對但 IP 是 169.254，去教室端交換器看 P1 的 Trunk 有沒有放行教師的 VLAN。', 'SSID 和 IP 都對，就開瀏覽器。跳出登入頁時，要輸入學校帳號才會放行。'],
      learn: ['同一台 AP 會發出<strong>多個 SSID</strong>，各自對應不同的 VLAN 和政策。連的 SSID 不同，結果就不同。', 'AP 接的那一埠是 <strong>Trunk</strong>，每個 SSID 用到的 VLAN 都要放行，漏掉一個，那個 SSID 就領不到 IP。', '有些網路要先通過<strong>登入認證</strong>才放行。跳出登入頁不是壞掉，也不是廣告。'],
      tip: '實務經驗：「同一個地方，有的可以有的不行」，先比對兩台設備的 SSID 和 IP 網段。九成的答案就在這兩行。',
      see: ['pmac'],
      home: ['確認學校的教師網路要怎麼登入（用哪個帳號、登入頁長什麼樣），寫成一頁說明，給新進的老師。'],
      close() {
        return CLOSE({
          guest: { rc: '筆電連到訪客網路 YHPS-Guest，進不了校務系統', pv: '在教室貼上各 SSID 的用途說明，並在研習時告訴老師該連哪一個', say: '您的筆電連到訪客網路了，訪客網路不能進校務系統。已經改連教師網路，之後請連 YHPS-Teacher' },
          auth: { rc: '筆電連上教師網路，但還沒在登入頁輸入學校帳號', pv: '把教師網路的登入方式寫成一頁說明，發給老師並貼在教室', say: '教師網路要先在跳出來的登入頁輸入學校帳號才會放行，已經登入好了' },
          trunk: { rc: 'AP 那一埠的 Trunk 沒有放行教師網路的 VLAN', pv: '改完交換器或 AP 的設定，要用每一個 SSID 實際連線測試', say: 'AP 接的交換器設定漏了教師網路，所以只有教師網路不能用，已經補上' }
        }, this.cause, ['把所有 SSID 合併成一個，大家都連同一個就不會連錯', '把 AP 的發射功率調到最大，訊號強就不會出問題', '請老師改用平板上課，平板比較不會遇到這種問題'], ['筆電的無線網卡壞了'])
      }
    },
