    /* ===== 第七章 斷線大搜查 ===== */
    {
      key: '7-1', no: 22, id: '7-1', chap: CH7,
      name: 'SOP 總驗收',
      task: '報修單：這台電腦不能上網',
      min: 2, max: 2, s2: 'first', firstLabel: '沒有做多餘的處理', testLabel: '測試連線',
      idle: '按「測試連線」會從報修電腦開啟網頁',
      intro: '',
      start: '照 SOP 由下往上：看連線燈，ipconfig 看 IP，ping 閘道、ping 外面的 IP、ping 網址。哪一步不通，問題就在那一層。所有設備都可以點，畫面上有前任資訊組長留下的交接筆記。',
      devs: (() => { const l3 = L3(), sw = EDGE(); l3.tap = sw.tap = true; return { l3, core: CORE(), aggr: AGGR('B'), sw, e1: DESK('報修電腦', ''), e2: DESK('隔壁電腦', '') } })(),
      zones: NOTE, fixed: SWFIX(), lay: L5, need: [], allow: swAllow,
      init() {
        const f = this.cause = ['loose', 'vlan', 'pool', 'dns', 'rule'][Math.floor(rnd() * 5)], d = this.devs.e1, n = this.devs.e2, cs = [{ a: 'e1.p', b: 'sw.p1' }, { a: 'e2.p', b: 'sw.p2' }];
        this.all = f === 'dns' || f === 'rule';
        this.devs.l3.cfg = { end: f === 'pool' ? NET + '.119' : NET + '.200', dns: f === 'dns' ? SRV + '.53' : DNS1, r103: '啟用', r104: '啟用', r105: '啟用' };
        this.devs.sw.cfg = { p1: f === 'vlan' ? 'VLAN 99' : 'VLAN 20', p2: 'VLAN 20' };
        this.good = { l3: { end: NET + '.200', dns: DNS1, r103: '啟用', r104: '啟用', r105: f === 'rule' ? '停用' : '啟用' }, sw: { p1: 'VLAN 20', p2: 'VLAN 20' } };
        d.noip = ['loose', 'vlan', 'pool'].includes(f); d.dns = this.devs.l3.cfg.dns; d.subfn = () => d.noip ? '169.254.61.7' : NET + '.130';
        n.sub = NET + '.131'; n.dns = d.dns;
        if (f === 'loose') cs[0].broken = true;
        if (f === 'vlan') this.devs.sw.ports.p1.vlan = 99;
        return { cables: cs, intro: `導師打電話來：「我的電腦不能上網！」你到了教室。${this.all?'問了一下，隔壁電腦也一樣不行。':'問了一下，隔壁電腦一切正常。'}這一關的原因可能出在任何一層，把前面學過的工具都拿出來用。` }
      },
      cab: id => cables.find(c => dv(c.a) === id || dv(c.b) === id),
      full() { return ![NET + '.200', GW].includes(D.l3.cfg.end) },
      rule() { return this.cause === 'rule' && D.l3.cfg.r105 === '啟用' },
      blocked() { const c = this.cab('e1'); if (!c || c.broken || this.full()) return true; return pobj(dv(c.a) === 'sw' ? c.a : c.b).vlan === 99 },
      dok(d) { return [DNS1, DNS2].includes(d.dns) },
      web() { const d = D.e1; return !d.noip && this.dok(d) && !this.rule() && !!this.cab('e1') && D.l3.cfg.end !== GW },
      onCfg(id, k) { cfgFail(this, id, k); const v = D[id].cfg[k]; if (id === 'sw') { const p = D.sw.ports[k]; if (v === 'VLAN 99') p.vlan = 99; else delete p.vlan } if (id === 'l3' && k === 'dns') D.e2.dns = v },
      onDev(id) {
        const L = this, d = D.e1;
        if (id === 'e2') { const n = D.sw.ports.p2.vlan === 99; say(n ? '隔壁電腦剛剛還好好的，現在也不能上網了。' : L.all && (L.rule() || !L.dok(D.e2)) ? '隔壁電腦也打不開網頁。' : '隔壁電腦可以正常上網。'); return }
        if (id === 'sw') return showActs('教室端交換器：', [
          ['查看各埠狀態', () => { const s = D.sw, rows = [1, 2, 3, 4, 5, 6].map(n => { const c = cables.find(x => x.a === 'sw.p' + n || x.b === 'sw.p' + n); return `  P${n}　｜VLAN ${s.ports['p'+n].vlan||20}｜${c&&!c.broken?'已連線':'未連線'}` }); showTerm('<span class="d">教室端交換器 › 各埠狀態</span>\n  埠　｜VLAN｜連線\n' + rows.join('\n') + '\n  S1　｜Trunk｜已連線（往副控）') }],
          ['修改埠的 VLAN', () => showCfg('sw', '教室端交換器：各埠的 VLAN', [{ k: 'p1', label: 'P1', opts: ['VLAN 20', 'VLAN 99'] }, { k: 'p2', label: 'P2', opts: ['VLAN 20', 'VLAN 99'] }])],
          ['不處理', () => {}]
        ]);
        if (id === 'l3') return showActs('校端 L3 路由器（DHCP 與存取控制）：', [
          ['查看 DHCP 設定', () => showTerm(DHCPV(D.l3.cfg, L.cause === 'pool'))],
          ['查看存取控制規則', () => showTerm(RULEV(D.l3.cfg, L.cause === 'rule'))],
          ['修改 DHCP 設定', () => showCfg('l3', '校端 L3 的 DHCP 設定', DHCPF)],
          ['修改存取控制規則', () => showCfg('l3', '存取控制規則：啟用或停用', RULEF)],
          ['重新開機', () => { fails++; say('校端 L3 重開，全校斷線三分鐘。回來之後問題還在。', 'bad') }],
          ['不處理', () => {}]
        ]);
        const c = L.cab('e1'), link = c && !c.broken;
        showActs('報修電腦：', [
          ['看連線燈', () => say(link ? '電腦網路孔和教室端那一埠的連線燈都亮著。' : '電腦網路孔和教室端那一埠的連線燈都不亮。線有插著。')],
          ['ipconfig /all', () => showTerm(IPC(d.noip ? '169.254.61.7' : NET + '.130', d.noip ? '255.255.0.0' : '255.255.255.0', d.noip ? '' : GW, '\n  DNS 伺服器 . . : ' + (d.noip ? '（空白）' : d.dns)))],
          ['ping 測試', () => { const ip = !d.noip, nm = ip && L.dok(d), o = (t, k) => `<span class="d">C:\\&gt; ping ${t}</span>\n` + (k ? '<span class="o">有回應</span>' : '<span class="x">沒有回應</span>') + '\n'; showTerm(o(`${GW}（閘道）`, ip) + o('8.8.8.8（外面的 IP）', ip) + o('www.google.com（網址）', nm)) }],
          ['重新領 IP', () => { if (L.blocked()) say('重新領取失敗：連絡不到 DHCP 伺服器，或沒有門牌可發。', 'bad'); else { d.noip = false; d.dns = D.l3.cfg.dns; say(`重新領到 ${NET}.130。`, 'ok') } }],
          ['不處理', () => {}]
        ])
      },
      onCut(rc) { if (rc.broken) say('這條線的水晶頭鬆脫了。換一條新線接回原來的埠，再請電腦重新領 IP。', 'ok'); else { fails++; say('這條線是好的，記得接回去。', 'bad') } },
      check() {
        const ok = this.web(), H = '從報修電腦開啟網頁', lines = [ok ? '<span class="o">www.google.com：成功</span>' : '<span class="x">www.google.com：無法連線</span>'];
        if (!ok && D.l3.cfg.end === GW && !D.e1.noip) return { ok: false, head: H, lines, msg: `DHCP 範圍設到 ${GW}，那是閘道自己的位址。發到它的電腦會跟閘道撞號。範圍要照交接筆記設定。` };
        if (ok && D.sw.ports.p2.vlan === 99) return { ok: false, head: H, lines, msg: '報修電腦好了，可是 P2 被改到 VLAN 99，隔壁電腦反而斷線了。只改有問題的那一埠。' };
        return ok ? { ok: true, head: H, lines: lines.concat(RULENOTE(D.l3.cfg)) } : { ok: false, free: true, head: H, lines, msg: '還是不能上網。照 SOP 由下往上：連線燈、ipconfig、ping 閘道、ping 外面、ping 網址。' }
      },
      goals: [['找出原因並排除', () => lvk('7-1').web()]],
      extra: '每一步先確認再動手',
      passMsg: '修好了！你已經能照 SOP 由下往上排除各層的問題。',
      hints: ['先點隔壁電腦，確認是一台壞還是大家都壞。再點報修電腦看連線燈。', '連線燈亮著，就執行 ipconfig /all。169.254 代表沒領到 IP，查看教室端各埠狀態和校端 L3 的 DHCP 設定，跟交接筆記比對。', '有 IP 就做 ping 測試。只有網址不通是 DNS，比對 ipconfig 的 DNS 和交接筆記；三個都通但網頁打不開，查看存取控制規則，找出擋掉一般網頁（443）的那一條。'],
      learn: ['<strong>先問範圍</strong>：一台壞查那一台，大家都壞查共用的設備。', '<strong>由下往上</strong>：連線燈、IP、閘道、外面的 IP、網址。哪一步不通，問題就在那一層。', '每一種工具回答一個問題：ipconfig 問「有沒有門牌」，ping 問「到不到得了」，nslookup 問「查不查得到名字」，智慧網管問「哪一台離線」。'],
      tip: '實務經驗：網路故障不是玄學，都是可以拆解的科學。照著 SOP 一層一層查，再配合智慧網管的告警，真相只有一個。',
      see: ['ping', 'special'],
      home: ['把這一關的 SOP（看燈、ipconfig、ping 閘道、ping 外面的 IP、ping 網址、看智慧網管）抄在一張卡上，貼在機櫃或辦公桌旁。'],
      close() {
        return CLOSE({
          loose: { rc: '報修電腦的網路線鬆脫', pv: '整理教室的線材，網路線固定好，不要被桌椅或腳踢到', say: '您電腦的網路線鬆了，已經重新接好' },
          vlan: { rc: '教室端那一埠被設在錯的 VLAN 99', pv: '交換器設定變更前先備份，改完記錄是哪一埠、改成什麼；每週用平台比對設定', say: '教室交換器有一個設定錯了，您的電腦被分到錯的網段，已經改回來' },
          pool: { rc: 'DHCP 可以發放的 IP 已經全部發完', pv: '依實際設備數量規劃 DHCP 範圍，並定期看使用率', say: '學校可以發的網路門牌用完了，已經擴大範圍' },
          dns: { rc: 'DHCP 發給電腦的 DNS 是一台已經停用的舊主機', pv: '設備停用前，先檢查有哪些設定指向它，每次變更都記錄下來', say: '網路設定還指向一台已經停用的舊主機，已經改成教育局的 DNS' },
          rule: { rc: '校端 L3 的規則 105 擋掉了教學網段對外的加密網頁（443）', pv: '存取控制規則的新增和修改都要記錄原因，改完從教室實際測試常用網站', say: '校端路由器有一條規則誤擋了校外的網站，已經停用' }
        }, this.cause, ['每次有人報修，先把校端 L3 重開，多半就會恢復', '把整間教室的電腦都重灌，設定會回到乾淨的狀態', '把常見的設定方法教給老師，請老師自己先試著改'])
      }
    },

    {
      key: '7-2', no: 23, id: '7-2', chap: CH7,
      name: '回報對的窗口',
      task: '報修單：校內不通，要找誰？',
      min: 1, max: 1, s2: 'first', firstLabel: '先測試，再回報', testLabel: '送出回報', goalLast: '對方確認收到',
      noCut: '線路都是好的。',
      idle: '做完測試、填好回報內容，按「送出回報」',
      intro: '新北的校園網路有三個報修窗口：光纖到班維護廠商（核心、副控、教室端與光纖）、既有網路維護廠商（校端 L3 與既有設備）、教育網路中心（對外線路與骨幹）。找錯窗口，對方會請你再找別人，多耗半天。這一關的故障隨機落在三者之一。',
      start: '點教室電腦做四項測試，再看智慧網管的告警，判斷問題在哪一層、是誰的設備。點「回報」填寫內容和通報對象。',
      devs: (() => { const l3 = L3(), core = CORE(); l3.tap = core.tap = true; const c = WDEV('回報', '三個窗口'); c.tag = '點我回報'; return { l3, core, aggr: AGGR('B'), sw: EDGE(), e1: DESK('教室電腦', NET + '.60'), e2: c } })(),
      fixed: SWFIX(),
      lay: {
        wide: { W: 900, H: 540, net: { x: 226, y: 44 }, rack: { x: 40, y: 98, w: 372, h: 424 }, pos: { l3: [60, 108], core: [60, 208], aggr: [60, 308], sw: [60, 408], e1: [500, 140], e2: [700, 140] } },
        narrow: { W: 440, H: 700, net: { x: 220, y: 42 }, rack: { x: 34, y: 98, w: 372, h: 420 }, pos: { l3: [54, 108], core: [54, 208], aggr: [54, 308], sw: [54, 408], e1: [60, 540], e2: [280, 540] } }
      },
      need: [], allow: () => null,
      CASES: {
        out: { alarm: `對外設備離線：${SCH.abbr}-L3 對外埠；Radar 異常`, gw: true, ext: false, hop: '第 1 站之後', who: '教育網路中心', why: '校端 L3 通、出了學校就不通，而且校內設備都在線。對外線路與骨幹由教育網路中心處理。', reply: '收到，全校對外不通、校端 L3 正常、斷在第 1 站之後。我們查到貴校對外線路異常，已派工。' },
        core: { alarm: `離線：${SCH.abbr}-CORE；離線：${SCH.abbr}-AGG-B 及其下 18 台教室端`, gw: false, ext: false, hop: '第 1 站就沒有回應', who: '光纖到班維護廠商', why: '核心離線，副控與教室端全部跟著離線，連閘道都 ping 不到。核心是光纖到班案設備，在保固內由光纖到班維護廠商處理。', reply: '收到，核心交換器離線、兩棟副控與教室端跟著離線。工程師 4 小時內到場更換。' },
        l3: { alarm: `離線：${SCH.abbr}-L3；對外設備離線；Radar 異常。核心、副控、教室端均在線`, gw: false, ext: false, hop: '第 1 站就沒有回應', who: '既有網路維護廠商', why: '校端 L3 本身離線，它底下的核心、副控、教室端都在線，所以是校端 L3 的問題。它是既有設備，由既有網路維護廠商處理，並同時通知教育網路中心。', reply: '收到，校端 L3 路由器離線、校內新設備均在線。工程師今日到場處理。' }
      },
      init() {
        this.k = pickOne(['out', 'core', 'l3']);
        this.did = new Set(); this.early = false;
        this.devs.e2.cfg = { scope: '', gw: '', ext: '', hop: '', who: '' }; this.devs.e2.tag = '點我回報';
        this.devs.core.down = this.k === 'core' ? 'off' : null; this.devs.l3.down = this.k === 'l3' ? 'off' : null;
        return { cables: [{ a: 'e1.p', b: 'sw.p1' }], intro: this.intro }
      },
      onCfg() { if (this.did.size < 4) this.early = true },
      s2ok() { return !this.early && fails === 0 },
      onDev(id) {
        const L = this, C = L.CASES[L.k];
        if (id === 'l3' || id === 'core') return showActs(`${D[id].name}：`, [
          [`查看${NMS}告警`, () => { L.did.add('nms'); showTerm(`<span class="d">${NMS} › 告警（${SCH.name}）</span>\n  ${C.alarm}`); say('告警列出了哪些設備離線。對照拓樸：離線的最上游那一台是誰的設備？') }],
          ['重新開機', () => { fails++; say(`${D[id].name}${D[id].down?'沒有回應，重開指令送不進去':'運作正常，重開只會讓校內多斷線幾分鐘'}。先回報。`, 'bad') }],
          ['不處理', () => {}]
        ]);
        if (id === 'e2') return showCfg('e2', '回報內容', [{ k: 'scope', label: '影響範圍', opts: ['只有一間教室', '一棟', '全校'] }, { k: 'gw', label: 'ping 校端 L3 閘道', opts: ['通', '不通'] }, { k: 'ext', label: 'ping 校外（8.8.8.8）', opts: ['通', '不通'] }, { k: 'hop', label: 'tracert', opts: ['第 1 站之後', '第 2 站之後', '第 1 站就沒有回應'] }, { k: 'who', label: '通報對象', opts: ['教育網路中心', '光纖到班維護廠商', '既有網路維護廠商'] }]);
        showActs('教室電腦：', [
          [`ping 閘道 ${GW}`, () => { L.did.add('gw'); showTerm(`<span class="d">C:\\&gt; ping ${GW}</span>\n` + (C.gw ? `<span class="o">回覆自 ${GW}：時間=1ms</span>` : '<span class="x">要求等候逾時。\n要求等候逾時。</span>')); say(C.gw ? '校端 L3 有回應，校內到校端 L3 這一段是通的。' : '連閘道都沒有回應。問題在教室和校端 L3 之間，或校端 L3 本身。') }],
          ['ping 8.8.8.8', () => { L.did.add('ext'); showTerm('<span class="d">C:\\&gt; ping 8.8.8.8</span>\n<span class="x">要求等候逾時。\n要求等候逾時。</span>'); say('校外沒有回應。') }],
          ['tracert 教網 DNS', () => { L.did.add('tr'); showTerm(`<span class="d">C:\\&gt; tracert -d ${DNS1}</span>\n` + (C.gw ? `  1    1 ms   ${GW}\n  2    *      要求等候逾時\n  3    *      要求等候逾時` : '  1    *      要求等候逾時\n  2    *      要求等候逾時')); say(C.gw ? '第 1 站有回應，下一站開始就沒有了。' : '第 1 站就沒有回應。') }],
          ['看教室端的燈', () => { L.did.add('led'); say(L.k === 'core' ? '教室端的 P1 燈亮、S1 上行燈亮，但副控往核心的燈不亮。教室端和副控都有電，問題在更上游。' : '教室端 P1 與 S1 燈都亮，校內設備正常。') }],
          ['不處理', () => {}]
        ])
      },
      check() {
        const c = D.e2.cfg, C = this.CASES[this.k], H = '對方的回覆', w = { scope: '全校', gw: C.gw ? '通' : '不通', ext: '不通', hop: C.hop, who: C.who };
        if (Object.keys(w).some(k => !c[k])) return { ok: false, free: true, head: H, lines: [], msg: '回報內容還沒填完。點「回報」，五項都要填。' };
        const M = { scope: '全校都連不出去，影響範圍是全校。', gw: C.gw ? '校端 L3 實際上是通的，回報前先實際 ping 一次。' : '校端 L3 實際上 ping 不到。', ext: '校外實際上不通。', hop: 'tracert 的結果報錯了，再執行一次。', who: C.why };
        const bad = Object.keys(w).find(k => c[k] !== w[k]);
        if (bad) return { ok: false, head: H, lines: ['<span class="x">「你們回報的狀況和我們這邊看到的對不起來，請再確認一次。」</span>'], msg: M[bad] };
        return { ok: true, head: H, lines: [`<span class="o">「${C.reply}」</span>`] }
      },
      goals: [['完成四項測試', () => lvk('7-2').did && lvk('7-2').did.size >= 4], ['填好回報內容與通報對象', () => { const c = lvk('7-2').devs.e2.cfg || {}; return !!(c.scope && c.gw && c.ext && c.hop && c.who) }]],
      extra: '回報的每一項都要有實際測試的依據，通報對象看是誰的設備',
      passMsg: '過關！找對窗口，半天就省下來了。',
      hints: ['先做四項測試：ping 閘道、ping 8.8.8.8、tracert、看燈。再點校端 L3 或核心看智慧網管告警。', '閘道通、外面不通：對外線路，找教育網路中心。閘道不通：看告警裡離線的最上游是哪一台。', '離線的是核心（新案設備）找光纖到班維護廠商；離線的是校端 L3（既有設備）找既有網路維護廠商。'],
      learn: ['新北校園網路的三個報修窗口：<strong>光纖到班維護廠商</strong>管核心、副控、教室端與光纖；<strong>既有網路維護廠商</strong>管校端 L3 與既有設備；<strong>教育網路中心</strong>管對外線路與骨幹。', '判斷的方法：<strong>ping 閘道</strong>分校內校外，<strong>智慧網管告警</strong>看離線的最上游是誰的設備。', '回報要講五件事：影響範圍、閘道通不通、外面通不通、tracert 結果、通報對象。'],
      tip: '實務經驗：光纖到班案設備報修 SLA 由建議書載明到場時數，通報時說清楚設備名稱（例如 YHPS-CORE）和智慧網管告警時間，廠商派工更快。',
      see: ['sla'],
      home: ['把三個窗口的電話、保固到期日和 SLA 時數做成一張表，貼在機櫃上。']
    },

    {
      key: '7-3', no: 24, id: '7-3', chap: CH7,
      name: '畢業任務',
      task: '畢業任務：盤點自己的學校',
      min: 0, max: 0, testLabel: '完成盤點', goalLast: '按下「完成盤點」',
      idle: '', custom: true,
      intro: '最後一關沒有標準答案。把你自己學校的網路資料填進來，畫面會畫出你們學校的光纖到班架構，終端機會產生一份盤點表。新手資訊組長最需要的不是背指令，是知道自己學校的網路長什麼樣子、壞了找誰。',
      start: '資料只存在你這台裝置的瀏覽器裡，不會傳到別的地方。不知道的欄位先空著，回學校查到再補。',
      devs: {}, fixed: [], need: [], allow: () => null,
      lay: { wide: { W: 900, H: 560, net: { x: 0, y: 0 }, rack: { x: 0, y: 0, w: 0, h: 0 }, pos: {} }, narrow: { W: 440, H: 660, net: { x: 0, y: 0 }, rack: { x: 0, y: 0, w: 0, h: 0 }, pos: {} } },
      F: [
        ['school', '學校名稱', 1, '例：雲海國小'],
        ['abbr', '設備命名用的學校縮寫', 1, '例：YHPS'],
        ['blds', '各棟名稱（用逗號分開）', 1, '例：行政樓,教學樓,活動中心'],
        ['gw', '校端 L3 管理 IP', 1, '例：10.226.87.254'],
        ['dns', 'DNS 伺服器', 1, '例：163.20.1.1'],
        ['tel', '教育網路中心服務電話', 1, ''],
        ['tel2', '光纖到班維護廠商電話', 0, ''],
        ['tel3', '既有網路維護廠商電話', 0, ''],
        ['batch', '光纖到班批次與完工狀態', 0, '例：第 2 批，115 年 12 月完工'],
        ['radar', '雷達主機 IP', 0, '例：10.226.87.250'],
        ['ssid', '無線網路名稱', 0, '例：YHPS-Teacher, YHPS-Student'],
        ['rack', '主機櫃在哪裡', 0, '例：行政樓 3 樓 331 機房']
      ],
      noTr: true,
      init() {
        this.v = {};
        try { this.v = VIEW ? { ...VIEW.x } : JSON.parse(localStorage.getItem('nq-school') || '{}') } catch (e) {}
        if (!VIEW && XL) { const c = SCHOOL, pre = { school: c.school, blds: c.blds, gw: c.net + '.' + c.gw, dns: c.dns, tel: c.tel, ssid: Object.values(c.ssid).join(', ') }; for (const k in pre) if (!this.v[k] && pre[k]) this.v[k] = pre[k] }
        return { cables: [], intro: this.intro }
      },
      blds() { return (this.v.blds || '').split(/[,，、]/).map(s => s.trim()).filter(Boolean).slice(0, 4) },
      onLoad() {
        const a = $('acts'), L = this;
        a.hidden = false; a.onclick = null;
        a.innerHTML = L.F.map(f => `<label>${f[1]}${f[2]?'':'（選填）'}<input id="sc-${f[0]}" data-k="${f[0]}" placeholder="${f[3]}" autocomplete="off"></label>`).join('') + '<div class="btns"><button id="sc-copy">複製盤點表</button><button id="sc-print">列印 SOP 卡</button><button id="sc-save" hidden>存成我的學校網路設定</button></div>';
        L.F.forEach(f => { $('sc-' + f[0]).value = L.v[f[0]] || '' });
        a.oninput = e => { const k = e.target.dataset.k; if (!k) return; L.v[k] = e.target.value; if (!VIEW) try { localStorage.setItem('nq-school', JSON.stringify(L.v)) } catch (x) {} unwin(); build(); L.sheet() };
        $('sc-copy').onclick = () => { const t = L.text(); (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => say('盤點表已複製，可以貼到文件或訊息裡。', 'ok')).catch(() => say('這個瀏覽器不允許自動複製。請直接選取終端機裡的文字來複製。')) };
        $('sc-print').onclick = () => { $('printcard').innerHTML = L.card(); document.body.classList.add('pc'); window.print() };
        $('sc-save').hidden = !(API && WHO && !WHO.bad && !VIEW);
        $('sc-save').onclick = async () => {
          const o = sheetSchool(L.v);
          if (!o) { say('先填好校端 L3 管理 IP，例如 10.226.87.254。網段會從它算出來。', 'bad'); return }
          let err = await saveMySchool({ ...(WHO.school || {}), ...o });
          if (err && o.ssid && /SSID/.test(err)) { delete o.ssid; const e2 = await saveMySchool({ ...(WHO.school || {}), ...o }); if (!e2) { say('已存成你的學校網路設定。SSID 沒有存：四個都要不同、只能用英數字，可以在上方「學校網路設定」再改。', 'ok'); return } err = e2 }
          say(err ? '沒有存成學校設定：' + err : '已存成你的學校網路設定。其他關卡的網段、SSID 都會換成你學校的。', err ? 'bad' : 'ok')
        };
        L.sheet()
      },
      text() {
        const v = this.v, b = this.blds();
        return `【${v.school||'（學校名稱）'} 校園網路盤點表】\n設備命名縮寫：${v.abbr||'待查'}\n校端 L3 管理 IP：${v.gw||'待查'}\nDNS 伺服器：${v.dns||'待查'}\n建築（副控點）：${b.length?b.join('、'):'待查'}\n光纖到班批次：${v.batch||'待查'}\n雷達主機：${v.radar||'待查'}\n無線網路：${v.ssid||'待查'}\n主機櫃位置：${v.rack||'待查'}\n\n報修窗口：\n教育網路中心（對外線路、骨幹）：${v.tel||'待查'}\n光纖到班維護廠商（核心、副控、教室端、光纖）：${v.tel2||'待查'}\n既有網路維護廠商（校端 L3、既有設備）：${v.tel3||'待查'}\n\n故障時的 SOP：\n1. 先問範圍：一台、一間教室，還是整棟、全校\n2. 看智慧網管：告警卡與拓樸圖紅框最上游的那一台\n3. 看連線燈和電源燈\n4. ipconfig 看有沒有領到 IP\n5. ping ${v.gw?v.gw.replace(/\\.\\d+$/,'.254'):'閘道'} → ping 8.8.8.8 → ping 網址（DNS：${v.dns||'待查'}）\n6. 閘道通、外面不通：不要重開設備，打 ${v.tel||'教育網路中心'} 回報`
      },
      card() {
        const v = this.v, B = x => (x || '').trim() ? esc(sp(x.trim())) : '<span class="pc-blank"></span>', b = this.blds();
        return `<h1>${B(v.school)} 網路報修 SOP</h1><p class="pc-sub">貼在機櫃或辦公桌旁。由上往下查，哪一步不通，問題就在那一段。</p><ol>
<li><b>先問範圍</b>：一台、一間教室、一整棟，還是全校？從什麼時候開始？</li>
<li><b>看智慧網管</b>（nms.ntpc.edu.tw）：單位資訊卡有沒有對外設備離線；拓樸圖紅框最上游的那一台是斷點。</li>
<li><b>看燈號</b>：電腦網路孔和教室端那一埠的連線燈；副控與核心的 PSU1、PSU2 燈。</li>
<li><b>ipconfig /all</b>：有沒有領到 IP？169.254 開頭代表沒領到。</li>
<li><b>ping 閘道 ${B(v.gw ? v.gw.replace(/\.\d+$/, '.254') : '')}</b>：不通，問題在校內（線路、教室端、副控、核心）。</li>
<li><b>ping 8.8.8.8</b>：閘道通、這裡不通，問題在學校出口之後。</li>
<li><b>ping 網址、nslookup</b>：IP 通、網址不通，是 DNS。本校 DNS：${B(v.dns)}</li></ol>
<table><tr><th>教育網路中心</th><td>${B(v.tel)}　對外線路、骨幹</td></tr><tr><th>光纖到班維護廠商</th><td>${B(v.tel2)}　核心、副控、教室端、光纖（保固 5 年自總驗收起算）</td></tr><tr><th>既有網路維護廠商</th><td>${B(v.tel3)}　校端 L3、既有設備</td></tr><tr><th>建築（副控點）</th><td>${b.length?esc(sp(b.join('、'))):B('')}</td></tr><tr><th>設備命名</th><td>${B(v.abbr)}-L3／-CORE／-AGG-棟／-E-教室</td></tr><tr><th>主機櫃位置</th><td>${B(v.rack)}</td></tr></table>
<p class="pc-foot">列印日期：${new Date().toLocaleDateString('zh-TW')}　資料有變動時請更新。新北網管小學堂</p>`
      },
      sheet() { $('term').textContent = this.text() },
      draw() {
        const v = this.v, b = this.blds(), cx = W / 2,
          g = (x, y, w, h, name, sub) => { const n = el('g', { class: 'dev still', transform: `translate(${x-w/2},${y})` }, svg); el('rect', { class: 'body', width: w, height: h, rx: 5 }, n); el('text', { class: 'name', x: w / 2, y: 22, 'text-anchor': 'middle' }, n, name); if (sub) el('text', { class: 'sub', x: w / 2, y: 40, 'text-anchor': 'middle' }, n, sub) };
        const line = (x1, y1, x2, y2, cls = 'cable fixed') => el('path', { class: cls, d: `M${x1},${y1} L${x2},${y2}` }, svg);
        el('text', { class: 'zone', x: 16, y: 28 }, svg, (v.school || '我的學校') + ' 光纖到班架構');
        const ab = (v.abbr || 'XXXX').toUpperCase().slice(0, 6);
        line(cx, 96, cx, 130); line(cx, 186, cx, 220, 'cable lr');
        const n = Math.max(1, b.length), bw = Math.min(170, (W - 32) / n - 12), y3 = H > 600 ? 400 : 350, y4 = y3 + 100;
        for (let i = 0; i < n; i++) {
          const x = W / 2 + (i - (n - 1) / 2) * (bw + 12);
          line(cx, 276, x, y3, 'cable lr');
          g(x, y3, bw, 74, (b[i] || '（棟名）').slice(0, Math.max(3, Math.floor(bw / 16))), ab + '-AGG 副控');
          if (y4 + 50 < H - 40) { line(x, y3 + 74, x, y4, 'cable lr'); g(x, y4, bw, 50, '教室端 ×n', ab + '-E-') }
        }
        const c = el('g', { class: 'net' }, svg);
        el('rect', { class: 'body', x: cx - 92, y: 44, width: 184, height: 52, rx: 26 }, c);
        el('text', { class: 'name', x: cx, y: 66 }, c, '教育網路中心');
        el('text', { class: 'sub', x: cx, y: 84 }, c, v.tel ? '電話 ' + v.tel : '服務電話待查');
        g(cx, 130, 240, 56, ab + '-L3 校端 L3', v.gw || '管理 IP 待查');
        g(cx, 220, 240, 56, ab + '-CORE 核心', v.rack ? v.rack.slice(0, 16) : '機櫃位置待查');
        el('text', { class: 'zone', x: 16, y: H - 40 }, svg, 'DNS：' + (v.dns || '待查') + '　雷達：' + (v.radar || '待查'));
        el('text', { class: 'zone', x: 16, y: H - 18 }, svg, '批次：' + (v.batch || '待查').slice(0, 30))
      },
      check() {
        const miss = this.F.filter(f => f[2] && !(this.v[f[0]] || '').trim()).map(f => f[1]);
        this.sheet();
        return miss.length ? { ok: false, free: true, head: esc(this.text()), lines: [], msg: `還有必填的資料沒填：${miss.join('、')}。不知道的話，這就是你回學校要查的第一件事。` } : { ok: true, head: esc(this.text()), lines: [] }
      },
      s2ok() { return this.F.every(f => (this.v[f[0]] || '').trim()) },
      firstLabel: '選填的資料也都查到了', s2: 'first',
      goals: [['填好六項必填資料', () => { const L = lvk('7-3'); return !!L.v && L.F.filter(f => f[2]).every(f => (L.v[f[0]] || '').trim()) }]],
      extra: '回學校把選填的六項也查出來',
      passMsg: '恭喜畢業！這份盤點表，就是你接手學校網路的第一張地圖。',
      hints: ['校端 L3 的管理 IP 在智慧網管「網路架構」的最上層那一台；DNS 在任何一台電腦執行 ipconfig /all 就看得到。', '各棟名稱用逗號分開，最多畫四棟，每棟對應一台副控。', '三個報修窗口的電話問前任資訊組長或教務處，並把它們貼在機櫃上。'],
      learn: ['你已經走過 L1 到 L7：<strong>光纖到班接線、交換器、IP 與路由、DNS 與存取控制、無線網路、智慧網管</strong>，也修過每一層的故障。', '排障的心法只有四句：<strong>先問範圍、先看智慧網管、由下往上、先確認再動手</strong>。', '八成的日常故障都發生在最底下三層。先蹲下去看看光纖和電源插好了沒。'],
      tip: '感謝所有在校園辛苦工作的資訊組長與網管老師。光纖到班之後，網路會更快，也更需要看得懂它的人。',
      see: ['backup']
    }
