    /* ===== 第二章 交換器（L2） ===== */
    {
      key: '2-1', no: 6, id: '2-1', chap: CH2,
      name: '誰是誰',
      task: '任務：找出中毒的設備',
      min: 0, max: 5, s2: 'first', firstLabel: '一次就找對', testLabel: '檢查結果',
      intro: '',
      start: '下方終端機有兩張表：校端 L3 的 ARP 表、教室端交換器的 MAC 位址表。先用 IP 找到 MAC，再用 MAC 找到埠，然後點那一埠的線把它拔掉。',
      devs: { ...RACK4(), e1: DESK('設備 ?', '在某間教室'), e2: DESK('設備 ?', '在某間教室'), e3: DESK('設備 ?', '在某間教室'), e4: DESK('設備 ?', '在某間教室'), e5: DESK('設備 ?', '在某間教室') },
      fixed: SWFIX(), lay: L5, need: [], allow: swAllow,
      init() {
        const R = [[NET + '.23', '教務處電腦'], [NET + '.31', '導師電腦'], [NET + '.50', '印表機'], [NET + '.77', '電腦教室 07'], [NET + '.102', '圖書館電腦']];
        const macs = shuffle(['3c-52-82-1a-9f-04', 'a4-bb-6d-70-21-c8', '00-1b-a9-5e-33-90', 'd8-9e-f3-0c-47-1e', 'f0-2f-74-b6-88-52']), ports = shuffle([1, 2, 3, 4, 5, 6]), ord = shuffle([0, 1, 2, 3, 4]), ids = ['e1', 'e2', 'e3', 'e4', 'e5'];
        ids.forEach((id, i) => Object.assign(this.devs[id], DESK('設備 ?', '在某間教室'), { ip: R[ord[i]][0], role: R[ord[i]][1], mac: macs[i], port: ports[i] }));
        this.t = ids[Math.floor(rnd() * 5)];
        const T = this.devs[this.t], ds = ids.map(id => this.devs[id]), last = d => +d.ip.split('.')[3];
        this.tables = `<span class="d">校端 L3 路由器 › show arp（教學網段）</span>\n  IP 位址          MAC 位址\n` + ds.slice().sort((a, b) => last(a) - last(b)).map(d => '  ' + d.ip.padEnd(16) + d.mac).join('\n') + `\n  ${GW}  cc-2d-e0-11-7a-01\n\n<span class="d">教室端交換器 ${SCH.abbr}-E-B203 › MAC 位址表</span>\n  埠   MAC 位址\n` + ds.slice().sort((a, b) => a.port - b.port).map(d => '  P' + d.port + '   ' + d.mac).join('\n') + '\n  S1   cc-2d-e0-11-7a-01（上行）';
        return { cables: ids.map(id => ({ a: id + '.p', b: 'sw.p' + this.devs[id].port })), intro: `教育網路中心來電：「貴校 ${T.ip} 這台設備中毒了，一直對外亂發封包，請先把它的網路線拔掉。」${NMS}的 IP 查詢顯示它在 ${SCH.abbr}-E-B203 這台教室端交換器上。壁掛箱裡插著五條線，線上都沒有標籤。哪一條才是 ${T.ip}？` }
      },
      idleHtml() { return this.tables },
      check() {
        const ids = ['e1', 'e2', 'e3', 'e4', 'e5'], s = S(), gone = ids.filter(id => !s.cabled(id)), T = D[this.t];
        if (!gone.length) return { ok: false, free: true, head: this.tables, lines: [], msg: '還沒有拔線。先用兩張表找出目標插在哪一埠。' };
        if (gone.length === 1 && gone[0] === this.t) {
          ids.forEach(id => { D[id].name = D[id].role; D[id].sub = 'IP 結尾 .' + D[id].ip.split('.')[3]; if (D[id].role === '印表機') Object.assign(D[id], BOX(D[id].name, D[id].sub)) });
          build();
          return { ok: true, head: this.tables, lines: [`<span class="o">找對了：${T.ip} 是插在 P${T.port} 的${T.role}。</span>`] }
        }
        return { ok: false, head: this.tables, lines: [], msg: `你拔掉的是${gone.filter(id=>id!==this.t).map(id=>D[id].role).join('、')}，那不是目標，人家正在上課。把線接回去，再對一次：先用 IP 找 MAC，再用 MAC 找埠。` }
      },
      goals: [['拔掉目標設備的網路線', s => !s.cabled(lvk('2-1').t)]],
      extra: '對完兩張表再動手',
      passMsg: '過關！你靠兩張表，把一個 IP 追到了實際的那條線。',
      hints: ['第一張表是校端 L3 的 ARP 表，記錄 IP 對應哪個 MAC。先在裡面找到目標 IP 那一列，記下它的 MAC。', '第二張表是教室端交換器的 MAC 位址表，記錄每個 MAC 是從哪一埠進來的。找到剛才那個 MAC，看它在 P 幾。', '回到壁掛箱，找教室端交換器上那個編號的埠，點一下插在上面的線，再按「拔掉這條線」。'],
      learn: ['<strong>MAC 位址</strong>是網卡出廠就燒好的身分證。手機和平板連 Wi-Fi 時常用<strong>私人（隨機）MAC 位址</strong>，查設備時要注意。', '<strong>ARP 表</strong>查出某個 IP 現在是哪個 MAC 在用；<strong>交換器 MAC 位址表</strong>記住每個 MAC 接在哪一埠。兩張表接起來，就能從 IP 追到實體的線。', `${NMS}的「IP 查詢」把這兩步合併，直接告訴你在哪一台交換器的哪一埠；但要先知道它是怎麼查到的。`],
      tip: `實務經驗：教育網路中心通報某個 IP 中毒時，先到${NMS}的 IP 查詢輸入那個 IP，再到現場拔線。所以教室端交換器的埠位和教室對照表要平常就做好。`,
      see: ['pmac', 'nmsip'],
      home: [`到${NMS}的「IP 查詢」輸入自己電腦的 IP，看它查到哪一台交換器、第幾埠。`]
    },

    {
      key: '2-2', no: 7, id: '2-2', chap: CH2,
      name: 'VLAN 區域化',
      task: '任務：用 VLAN 把教室端的埠分成三個隔間',
      min: 5, max: 5, s2: 'first', testLabel: '廣播測試',
      idle: '按「廣播測試」，看每台設備送出的廣播誰收得到',
      intro: '光纖到班之前，這所學校每間教室一個 VLAN 跨棟延伸，全校超過 20 個。新架構改成依用途規劃：行政 VLAN 10、教學 VLAN 20、訪客 VLAN 30，各棟副控是該棟子網路的路由邊界。這台教室端交換器同時接著行政電腦、教學電腦和訪客 AP，現在所有埠都在同一個隔間，把它們分開。',
      start: '先在選單選一個 VLAN，再點教室端交換器上的埠，把那一埠放進這個隔間。S1 是往副控的 Trunk，已經設好。這一關不用動線。',
      kinds: {
        v10: { name: 'VLAN 10 行政', vlan: 10, sw: 'v10', note: '10.215 網段', cost: '' },
        v20: { name: 'VLAN 20 教學', vlan: 20, sw: 'v20', note: '10.213 網段', cost: '' },
        v30: { name: 'VLAN 30 訪客', vlan: 30, sw: 'v30', note: '10.231 網段', cost: '' },
        v1: { name: 'VLAN 1 預設', vlan: 1, sw: 'v1', note: '還原', cost: '' }
      },
      noCut: '這一關不用動線，只要設定每個埠的 VLAN。',
      devs: (() => { const sw = EDGE(); sw.ports.s1.label = 'Trunk'; return { l3: L3(), core: CORE(), aggr: AGGR('B'), sw, e1: DESK('行政 1', '人事室電腦'), e2: DESK('教學 1', '教室電腦'), e3: DESK('行政 2', '出納組電腦'), e4: AP('訪客 AP', '給來賓用'), e5: DESK('教學 2', '教室電腦') } })(),
      want: { e1: 10, e2: 20, e3: 10, e4: 30, e5: 20 },
      dept: { 10: '行政', 20: '教學', 30: '訪客' },
      fixed: (() => { const f = SWFIX(); f[3].msg = 'S1 是往副控的 Trunk，要同時載運 VLAN 10、20、30，已經設好了，不用動。'; return f })(),
      lay: L5, need: [], allow: swAllow,
      init() {
        const ps = shuffle([1, 2, 3, 4, 5, 6]).slice(0, 5), ids = ['e1', 'e2', 'e3', 'e4', 'e5'];
        this.port = {};
        ids.forEach((id, i) => this.port[id] = ps[i]);
        const at = id => `P${this.port[id]}`, D0 = this.devs;
        this.hints = ['VLAN 是設定在交換器的埠上。順著每台設備的線，看它插在教室端交換器的 P 幾，那一埠就要放進它所屬的 VLAN。', `${D0.e1.name}在 ${at('e1')}、${D0.e3.name}在 ${at('e3')}，都要放進 VLAN 10；${D0.e2.name}在 ${at('e2')}、${D0.e5.name}在 ${at('e5')}，放進 VLAN 20。`, `${D0.e4.name}在 ${at('e4')}，放進 VLAN 30。S1 是往副控的 Trunk，要同時載運所有 VLAN，已經設好了，不用動。`];
        return { cables: ids.map(id => ({ a: id + '.p', b: 'sw.p' + this.port[id] })), intro: this.intro }
      },
      vl(id) { return pobj('sw.p' + this.port[id]).vlan || 1 },
      check() {
        const ids = ['e1', 'e2', 'e3', 'e4', 'e5'];
        const lines = ids.map(id => { const v = this.vl(id), o = ids.filter(x => x !== id && this.vl(x) === v).map(x => D[x].name); return `<span class="${v===this.want[id]&&o.every(n=>n[0]===D[id].name[0])?'o':'x'}">${D[id].name}（P${this.port[id]}，VLAN ${v}）看得到：${o.join('、')||'沒有別人'}</span>` });
        const bad = ids.find(id => this.vl(id) !== this.want[id]);
        if (!bad) return { ok: true, head: '從每台設備送出廣播，看誰收得到', lines };
        const v = this.vl(bad), w = this.want[bad];
        return { ok: false, head: '從每台設備送出廣播，看誰收得到', lines, msg: v === 1 ? `${D[bad].name}（P${this.port[bad]}）還在預設的 VLAN 1，和其他沒設定的設備混在同一間。把它放進 VLAN ${w}（${this.dept[w]}）。` : `${D[bad].name}被放進 VLAN ${v}，它應該在 VLAN ${w}（${this.dept[w]}）。` }
      },
      goals: [['兩台行政電腦在 VLAN 10', () => lvk('2-2').vl('e1') === 10 && lvk('2-2').vl('e3') === 10], ['兩台教學電腦在 VLAN 20', () => lvk('2-2').vl('e2') === 20 && lvk('2-2').vl('e5') === 20], ['訪客 AP 在 VLAN 30', () => lvk('2-2').vl('e4') === 30]],
      extra: '設定完先對一次每個埠的編號',
      passMsg: '過關！三個隔間互不相通，行政資料安全了。',
      hints: [],
      learn: ['<strong>VLAN</strong> 把一台交換器切成幾個互不相通的隔間，廣播只在自己的隔間裡傳。', 'VLAN 是<strong>設定在埠上</strong>的。電腦換了一個埠，就可能掉進別的隔間。本案的 VLAN 規劃以範本批次套用到全校教室端，並每週比對。', '往上接的 <strong>Trunk</strong> 要同時載運所有 VLAN；各棟副控是該棟子網路的<strong>路由邊界</strong>，不同 VLAN 之間在副控轉送，不再跨棟延伸。'],
      tip: '實務經驗：電腦換座位後不能上網，或拿到別的網段的 IP，先查它插的那一埠被設在哪個 VLAN。',
      see: ['l3sub'],
      home: ['問既有網路維護廠商：學校目前切了哪些 VLAN、編號多少、各自給誰用。把答案記在盤點表上，施工前廠商會依它規劃新架構的 VLAN。']
    },

    {
      key: '2-3', no: 8, id: '2-3', chap: CH2,
      name: '燈亮但很慢',
      task: '任務：找出變慢的原因',
      min: 3, max: 3, s2: 'first', firstLabel: '沒有動到正常的線和設定', testLabel: '測試速度',
      idle: '按「測試速度」，量三台電腦到雷達主機的下載速度',
      intro: '電腦教室的老師說：「有一台電腦網路特別慢，傳個檔案要等好久，可是它明明連得上。」教室端交換器的埠是 2.5G，電腦網卡 2.5G 或 1G 都正常，連線燈有亮不代表沒問題，這次要看燈的顏色。',
      start: '連線燈綠色是 1G 以上，橘色是只有 100 Mbps。先按「測試速度」，再點電腦查看網卡設定。點線可以拔下來檢查。',
      devs: { ...RACK4(), e1: DESK('電腦 A', '電腦教室'), e2: DESK('電腦 B', '電腦教室'), e3: DESK('電腦 C', '電腦教室') },
      fixed: SWFIX(), lay: L5, need: [], allow: swAllow,
      init() {
        const ids = ['e1', 'e2', 'e3'], i = Math.floor(rnd() * 3), cs = ids.map((id, n) => ({ a: id + '.p', b: 'sw.p' + (n + 1) }));
        ids.forEach(id => this.devs[id].forced = false);
        if (rnd() < .5) cs[i].slow = true; else this.devs[ids[i]].forced = true;
        return { cables: cs, intro: this.intro }
      },
      cab: id => cables.find(c => dv(c.a) === id || dv(c.b) === id),
      bad() { return ['e1', 'e2', 'e3'].some(id => { const c = this.cab(id); return !c || slowAt(c.a) }) },
      check() {
        const ids = ['e1', 'e2', 'e3'], miss = ids.find(id => !this.cab(id));
        if (miss) return { ok: false, free: true, head: '速度測試（教室電腦 → 雷達主機）', lines: [], msg: `${D[miss].name}的線還沒接回去。` };
        const sl = ids.filter(id => slowAt(this.cab(id).a)), lines = ids.map(id => sl.includes(id) ? `<span class="x">${D[id].name}：下載 94 Mbps</span>` : `<span class="o">${D[id].name}：下載 941 Mbps</span>`);
        return sl.length ? { ok: false, free: true, head: '速度測試（教室電腦 → 雷達主機）', lines, msg: `${D[sl[0]].name}只有 94 Mbps，是別台的十分之一。看它那一埠連線燈的顏色，再點它查看網卡設定。` } : { ok: true, head: '速度測試（教室電腦 → 雷達主機）', lines }
      },
      onDev(id) {
        const d = D[id], c = this.cab(id);
        showActs(`${d.name}：要做什麼？`, [
          ['查看網卡設定', () => say(d.forced ? `${d.name}的網卡被手動鎖在「100 Mbps 半雙工」。交換器那邊是自動協商，兩邊不一致，速度就上不去。` : c && c.slow ? `${d.name}的網卡是自動協商，卻只協商到 100 Mbps。設定沒問題，那就是線有問題。` : `${d.name}的網卡是自動協商，目前 1 Gbps，一切正常。`)],
          ['改成自動協商', () => { if (d.forced) { d.forced = false; say('改回自動協商後，連線燈由橘轉綠，速度回到 1 Gbps。', 'ok') } else { fails++; say(`${d.name}本來就是自動協商，不用改。`, 'bad') } }],
          ['不處理', () => {}]
        ])
      },
      onCut(rc) { if (rc.slow) say('這條線拔下來一看，是一條舊的 Cat5 線，水晶頭只壓了四芯。八芯全通才跑得到 1 Gbps 以上，只通四芯就只有 100 Mbps。拿一條本案配發的 Cat6 成品線接回去。', 'ok'); else { fails++; say('這條線是好的，記得接回去。動手之前先查看網卡設定。', 'bad') } },
      goals: [['找出變慢的原因並排除', () => !lvk('2-3').bad()]],
      extra: '先看燈的顏色和網卡設定，再決定要換線還是改設定',
      passMsg: '過關！三台電腦都回到 1 Gbps。',
      hints: ['三個埠的連線燈都亮，但有一個是橘色。橘色代表那條連線只有 100 Mbps。', '點那台電腦，選「查看網卡設定」。如果被手動鎖在 100 Mbps，改回自動協商就好。', '如果網卡是自動協商卻只有 100 Mbps，問題在線。點那條線拔掉，再拉一條新的接回原來的埠。'],
      learn: ['連線燈的<strong>顏色</strong>常用來表示速度。ECS4125-10PL 的埠有速度指示燈，綠燈、橘燈各代表什麼要看面板說明。', '網路線八芯要全通才能跑 1 Gbps 以上。<strong>舊線或壓壞的線</strong>會讓速度掉到 100 Mbps，但燈照樣亮。本案配發 Cat6 成品線（3、5、15 公尺），教室不要再用舊線。', '<strong>速度與雙工</strong>兩端要一致。除非有特別理由，兩邊都用自動協商。'],
      tip: '實務經驗：有人抱怨「連得上但很慢」，先到智慧網管看那一埠協商到的速度，或用教室電腦對雷達主機測速。只有 100 Mbps 的話，換一條線通常就解決了。',
      see: ['speed', 'radar'],
      home: ['在一間教室用瀏覽器連雷達主機測速，看上行與下行是不是接近網卡速度。']
    },

    {
      key: '2-4', no: 29, id: '2-4', chap: CH2,
      name: '收攏層數',
      task: '任務：把教室裡串接的小交換器改接到新教室端',
      min: 2, max: 5, s2: 'first', firstLabel: '一次就接對，沒有留下舊的串接',
      idle: '按「測試連線」會從 AP 和電腦各 ping 8.8.8.8',
      intro: '這間教室在光纖到班之前，網路是從走廊的舊交換器拉一條線進教室，再接一台 5 埠小交換器，AP 和電腦都掛在小交換器上，一共串了三層。盤點計畫裡這種第 5 到 10 層的串接全市有一千多台。今天新教室端交換器裝好了，邀標書第二十四條要求把原有 AP 和連網設備改接到教室端。',
      start: '先按「測試連線」看現況。把 AP 和電腦的線改接到新教室端交換器的 PoE 埠，再把小交換器的線拔掉。',
      testHead: '從 AP 和電腦各 ping 8.8.8.8',
      devs: {
        sw: EDGE('新教室端交換器', 'ECS4125-10PL · 今天裝的'),
        old: { name: '走廊舊交換器', sub: 'D-Link DGS-1210-10P', kind: 'box', bridge: true, still: true, w: 200, h: 96, ports: { up: rj(36, '上行', { dy: 60 }), d1: rj(100, '1', { dy: 60 }), d2: rj(136, '2', { dy: 60 }), d3: rj(172, '3', { dy: 60 }) } },
        mini: { name: '教室小交換器', sub: '5 埠，老師買的', kind: 'box', bridge: true, still: true, w: 200, h: 96, ports: { up: rj(36, '上行', { dy: 60 }), d1: rj(100, '1', { dy: 60 }), d2: rj(136, '2', { dy: 60 }), d3: rj(172, '3', { dy: 60 }) } },
        ap: Object.assign(AP('教室 AP', '目前用變壓器'), { ports: { p: { dx: 50, dy: 60, label: '網路孔' } } }),
        pc: PC()
      },
      fixed: [{ a: 'net', b: 'sw.s1', cls: 'fiber', occupy: true, msg: '新教室端往副控的 10G 光纖，已經接好。' }, { a: 'net', b: 'old.up', cls: 'fixed', occupy: true, msg: '走廊舊交換器往既有匯聚的上行。完工後整條舊線路由廠商處理，這一關不用動。' }],
      lay: {
        wide: { W: 900, H: 560, net: { x: 450, y: 44 }, rack: { x: 0, y: 0, w: 0, h: 0 }, pos: { sw: [40, 250], old: [560, 110], mini: [560, 260], ap: [620, 410], pc: [250, 400] } },
        narrow: { W: 440, H: 760, net: { x: 220, y: 42 }, rack: { x: 0, y: 0, w: 0, h: 0 }, pos: { old: [110, 110], mini: [110, 230], sw: [54, 360], ap: [14, 600], pc: [250, 600] } }
      },
      zones: { wide: [[40, 236, '教室壁掛箱（新）'], [560, 96, '走廊'], [560, 246, '教室角落（舊）']], narrow: [[14, 350, '教室壁掛箱（新）'], [110, 96, '走廊'], [110, 216, '教室角落（舊）']] },
      need: [], allow: () => null,
      init() {
        return { cables: [{ a: 'old.d1', b: 'mini.up' }, { a: 'mini.d1', b: 'ap.p' }, { a: 'mini.d2', b: 'pc.nic' }], intro: this.intro }
      },
      path(id) { const c = cables.find(x => dv(x.a) === id || dv(x.b) === id); if (!c) return null; return trace(dv(c.a) === id ? c.a : c.b) },
      check() {
        const H = '從 AP 和電腦各 ping 8.8.8.8', res = ['ap', 'pc'].map(id => ({ id, r: this.path(id) }));
        const lines = res.map(x => `<span class="${x.r&&x.r.ok&&x.r.devs.has('sw')?'o':x.r&&x.r.ok?'x':'x'}">${D[x.id].name}：${!x.r?'沒有接線':!x.r.ok?'要求等候逾時':x.r.devs.has('mini')?'有回應，但經過小交換器（三層串接）':x.r.devs.has('old')?'有回應，但還走舊線路':'有回應，經新教室端交換器'}</span>`);
        const notLinked = res.find(x => !x.r);
        if (notLinked) return { ok: false, free: true, head: H, lines, msg: `${D[notLinked.id].name}還沒有接線。` };
        const viaOld = res.find(x => x.r.devs.has('mini') || x.r.devs.has('old'));
        if (viaOld) return { ok: false, free: true, head: H, lines, msg: `${D[viaOld.id].name}還是經過舊的串接。改接到新教室端交換器的 PoE 埠。` };
        if (S().cabled('mini')) return { ok: false, head: H, lines, msg: '設備都改接好了，但小交換器還掛在網路上。把它的線拔掉收走，不然下次有人又會插回去。' };
        return { ok: true, head: H, lines }
      },
      onCut(rc) { const ids = [dv(rc.a), dv(rc.b)]; if (ids.includes('mini')) say('拔掉舊的串接線。小交換器收走後，教室裡只剩新教室端交換器一層。', 'ok'); else say('拔掉一條線。') },
      goals: [['AP 改接到新教室端交換器', s => s.link('ap', 'sw')], ['電腦改接到新教室端交換器', s => s.link('pc', 'sw')], ['小交換器不再掛在網路上', s => !s.cabled('mini')]],
      extra: '改接前先想好每一條線要去哪一埠，一次接對',
      passMsg: '過關！教室只剩一層交換器，AP 也改由 PoE 供電。',
      hints: ['先按「測試連線」，AP 和電腦都通，但走的是三層串接。', '點 AP 的線拔掉，從 AP 的網路孔拉一條新線到新教室端交換器的 P 埠；電腦也一樣。', '最後把走廊舊交換器到小交換器那條線拔掉，小交換器收走。'],
      learn: ['盤點計畫裡第 5 層以下的設備有 1,215 台，多半是教室裡串接的小交換器。<strong>每多串一層，就多一個故障點</strong>，也多一個私接迴圈的機會。', '邀標書第二十四條：末端點位下行的原有 AP 與連網設備要<strong>改接至教室端交換器</strong>，不含舊線拆除。改接後 AP 可以直接吃 PoE，變壓器收走。', '改接完到智慧網管確認拓樸圖已更新，教室端底下直接掛 AP 與電腦。'],
      tip: '實務經驗：改接時先記下每台設備原本在哪一埠、要改到哪一埠，一次改完一間教室再測試。小交換器收走並貼上「請勿自行加裝交換器」。',
      see: ['naming'],
      home: ['到智慧網管的盤點計畫看自己學校有幾台第 5 層以下的設備，列成一張改接清單。']
    },

    {
      key: 't2', no: 9, id: '報修單', chap: CH2,
      name: '全校間歇性斷線',
      task: '報修單：全校網路忽通忽斷',
      min: 6, max: 7, s2: 'first', firstLabel: '沒有動到正常的線和設備',
      idle: '按「測試連線」會從四間教室各 ping 8.8.8.8',
      storm: true, kinds: FIBER_UTP_KINDS,
      intro: `星期一早上，全校的電話都打來了：「網路一下通一下斷，而且超級慢！」不是某一棟，是全校。${NMS}跳出 Port Loop 告警，機房裡每台交換器的燈都在狂閃。上週五有老師說教室的網路孔不夠用，自己「處理」了一下。`,
      start: '所有活動燈都在狂閃，這是廣播風暴。點各棟副控、各教室端可以查看各埠的廣播流量。對照三層架構，找出不該存在的那條線。',
      devs: TREE(), fixed: TREE_FIXED(), zones: TREE_ZONES, lay: TREE_LAY, need: [], allow: treeAllow,
      pairs: [['core', 'da'], ['core', 'db'], ['da', 'a1'], ['da', 'a2'], ['db', 'b1'], ['db', 'b2']],
      init() {
        const cs = [{ a: 'core.s2', b: 'da.up' }, { a: 'core.s3', b: 'db.up' }, { a: 'da.d1', b: 'a1.up' }, { a: 'da.d2', b: 'a2.up' }, { a: 'db.d1', b: 'b1.up' }, { a: 'db.d2', b: 'b2.up' }].map(c => Object.assign(c, { type: 'fiber' }));
        const r = [{ a: 'a1.x', b: 'a2.x', type: 'utp' }, { a: 'b1.x', b: 'b2.x', type: 'utp' }, { a: 'da.d3', b: 'db.d3', type: 'fiber' }][Math.floor(rnd() * 3)];
        cs.push(Object.assign(r, { rogue: true }));
        this.alarm = `<span class="d">${NMS} › 告警 › Port Loop</span>\n  時間      單位      設備            說明\n  08:12:04  ${SCH.name}  ${SCH.abbr}-CORE  各埠廣播封包暴增\n  08:12:09  ${SCH.name}  ${SCH.abbr}-AGG-A  各埠廣播封包暴增\n  08:12:09  ${SCH.name}  ${SCH.abbr}-AGG-B  各埠廣播封包暴增`;
        return { cables: cs, intro: this.intro }
      },
      idleHtml() { return this.alarm },
      whole() { const s = S(); return cables.length === 6 && this.pairs.every(p => s.link(p[0], p[1])) },
      check() {
        const names = ['a1', 'a2', 'b1', 'b2'].map(id => D[id].name), H = '從四間教室各 ping 8.8.8.8';
        if (loopCables().length) return { ok: false, free: true, head: H, lines: names.map((n, i) => i % 2 ? `<span class="x">${n}：回覆自 8.8.8.8 時間=1840ms</span>` : `<span class="x">${n}：要求等候逾時</span>`), msg: '廣播風暴還在：同一個廣播封包在迴圈裡不停繞圈，把全校的頻寬吃光。找出三層架構裡不該有的那條線。' };
        if (!this.whole()) return { ok: false, free: true, head: H, lines: [], msg: '迴圈解除了，但架構和原本的三層不一樣。你拔掉的是正常的上行線，請接回去，再拔掉私接的那一條。' };
        return { ok: true, head: H, lines: names.map(n => `<span class="o">${n}：回覆自 8.8.8.8 時間=4ms</span>`) }
      },
      onDev(id) {
        const d = D[id];
        showActs(`${d.name}：要做什麼？`, [
          ['查看各埠廣播流量', () => { const lp = loopCables(), ps = lp.flatMap(c => [c.a, c.b]).filter(k => dv(k) === id).map(k => pobj(k).label); say(!lp.length ? `${d.name}各埠的流量都正常。` : ps.length ? `${d.name}的「${ps.join('」「')}」埠廣播封包暴增。風暴就在這幾個埠之間打轉，沿著它們接出去的線追下去。` : `${d.name}各埠的廣播都偏高，但沒有特別暴增的埠。它只是被風暴波及，不在迴圈上。`) }],
          ['重新開機', () => { fails++; say(`${d.name}重開之後，幾秒鐘風暴又回來了。迴圈還在，重開機沒有用。`, 'bad') }],
          ['不處理', () => {}]
        ])
      },
      onCut(rc) { if (rc.rogue) say('這條線不在學校的拓樸圖上，是有人私自接的。拔掉之後，各埠的燈不再狂閃。', 'ok'); else { fails++; say('這條是三層架構裡本來就有的線，記得接回去。', 'bad') } },
      goals: [['拔掉造成迴圈的線', () => !loopCables().length], ['三層架構維持原狀', () => lvk('t2').whole()]],
      extra: '先查流量、對照架構，再決定拔哪一條',
      passMsg: '修好了！全校網路恢復正常。',
      hints: ['三層架構是一棵樹：核心接副控，副控接教室端，同一層之間不會互接。', '看圖上有沒有「同一層互接」的線，例如兩間教室之間，或兩台副控之間。', '點交換器選「查看各埠廣播流量」。暴增的埠接出去的線裡，有一條是架構裡不該有的。點它拔掉。'],
      learn: ['兩台交換器之間多接一條線，就可能形成<strong>迴圈</strong>。廣播封包在裡面不停繞圈、越滾越多，叫做<strong>廣播風暴</strong>。', `症狀是<strong>全校</strong>忽通忽斷、非常慢，${NMS}會發出 <strong>Port Loop</strong> 告警。`, '元兇通常是<strong>私接</strong>：一條線兩頭都插在網路孔上，或自己帶來的小交換器接錯。本案教室端有迴圈防護與風暴抑制，但舊設備未必有。'],
      tip: '實務經驗：全校忽快忽慢，先到智慧網管看 Port Loop 告警落在哪一台，再到現場找燈閃得最瘋的埠。平常就要把交換器的迴圈防護（STP、Loop Protection）打開，並請老師不要私接設備。',
      see: ['snmp'],
      home: ['到智慧網管的告警記錄查過去一個月有沒有 Port Loop，發生在哪幾台。'],
      close() {
        return CLOSE({ loop: { rc: '有人在兩台交換器之間多接了一條線，形成迴圈，造成廣播風暴', pv: '交換器開啟 STP 或迴圈防護，並請老師不要自己接線或接交換器', say: '有人在教室多接了一條線，讓網路繞成一圈，全校都被塞爆。網路孔不夠用請先找我，不要自己接' } }, 'loop', ['把核心交換器換成更高階的型號，廣播再多也撐得住', '每天早上把所有交換器重開一次，清掉累積的廣播', '把出事的那個網路孔封起來，其他地方維持原狀'], ['核心交換器的效能不夠', '有電腦中毒，大量對外連線', '校端 L3 的對外頻寬被占滿'])
      }
    },
