    /* ===== 第三章 門牌與路由（L3） ===== */
    {
      key: '3-1', no: 10, id: '3-1', chap: CH3,
      name: 'IP 三劍客',
      task: '任務：幫新電腦設定 IP',
      min: 3, max: 3, s2: 'first', testLabel: '測試連線',
      noCut: '這一關不用動線，點「新電腦」設定它的 IP。',
      idle: '按「測試連線」會 ping 閘道、校務系統和 8.8.8.8',
      intro: '線接好了、燈也亮了，電腦還是不能上網，因為它還沒有門牌。每台電腦上網都需要三樣東西：IP 位址是門牌，子網路遮罩劃出社區範圍，預設閘道是通往外面的社區大門。新北各校的教學網段是 10.213.校編號.0/24，閘道在校端 L3 路由器上。',
      start: '點「新電腦」打開設定，把三個欄位選好。畫面上有這間教室的網段資料，旁邊兩台電腦的 IP 已經有人用了。',
      devs: { ...RACK4(), e1: DESK('新電腦', '還沒設定'), e2: DESK('教務處電腦', NET + '.23'), e3: DESK('導師電腦', NET + '.31') },
      zones: { wide: [[450, 440, `這間教室的網段：${NET}.0，遮罩 255.255.255.0`], [450, 462, `閘道：${GW}（校端 L3 路由器）`], [450, 484, `可用的空門牌：${NET}.60`]], narrow: [[14, 460, `網段：${NET}.0，遮罩 255.255.255.0`], [14, 482, `閘道：${GW}`], [14, 504, `可用的空門牌：${NET}.60`]] },
      fixed: SWFIX(), lay: L5, need: [], allow: swAllow,
      init() { const d = this.devs.e1; d.cfg = { ip: '', mask: '', gw: '' }; d.subfn = () => d.cfg.ip || '還沒設定'; return { cables: [1, 2, 3].map(i => ({ a: 'e' + i + '.p', b: 'sw.p' + i })), intro: this.intro } },
      onDev(id) {
        if (id !== 'e1') { say(`${D[id].name}已經設定好了，IP 是 ${D[id].sub}。新電腦不能用同一個門牌。`); return }
        showCfg(id, '新電腦的網路設定', [{ k: 'ip', label: 'IP 位址', opts: ['192.168.1.60', NET + '.23', NET + '.60', GW] }, { k: 'mask', label: '子網路遮罩', opts: ['255.0.0.0', '255.255.0.0', '255.255.255.0'] }, { k: 'gw', label: '預設閘道', opts: ['8.8.8.8', '192.168.1.1', NET + '.1', GW] }])
      },
      check() {
        const c = D.e1.cfg, H = '從新電腦 ping 三個地方';
        if (!c.ip || !c.mask || !c.gw) return { ok: false, free: true, head: H, lines: [], msg: '三個欄位都要選。點「新電腦」打開設定。' };
        const r = ipEval(c, c.ip === NET + '.23'), L = (n, ok) => `<span class="${ok?'o':'x'}">${n}：${ok?'有回應':'要求等候逾時'}</span>`;
        const lines = [L('閘道 ' + GW, r.gw), L('校務系統 ' + SRV + '.5', r.srv), L('外網 8.8.8.8', r.net)];
        const M = { ip: `${c.ip} 不在這間教室的網段裡。就像門牌寫成別的社區，鄰居和大門都找不到你。`, dupe: `${NET}.23 已經是教務處電腦的門牌。兩台搶同一個門牌，兩邊都會斷斷續續，${NMS}也會跳 IP 衝突告警。`, isgw: `${GW} 是閘道自己的門牌。你搶了社區大門的地址，整間教室都會出不去。`, gw: `閘道選成 ${c.gw}。電腦找得到鄰居，但要出社區時走錯大門，外面都到不了。`, mask: `遮罩選成 ${c.mask}，電腦以為 ${SRV}.5 也是同社區的鄰居，直接喊它卻沒人應，沒有把封包交給閘道。` };
        return r.why ? { ok: false, head: H, lines, msg: M[r.why] } : { ok: true, head: H, lines }
      },
      goals: [['三個欄位都選好', () => { const c = lvk('3-1').devs.e1.cfg || {}; return !!(c.ip && c.mask && c.gw) }]],
      extra: '對照畫面上的網段資料再選',
      passMsg: '過關！新電腦有了門牌，知道社區範圍，也找得到大門。',
      hints: [`IP 位址要在這間教室的網段裡，前三段是 ${NET}，而且不能和別人重複。畫面上寫了可用的空門牌。`, '子網路遮罩照畫面上寫的選。255.255.255.0 代表前三段相同的才是鄰居。', `預設閘道是通往外面的大門，畫面上寫的是 ${GW}。`],
      learn: ['<strong>IP 位址</strong>是門牌，同一個網段裡不能重複。', '<strong>子網路遮罩</strong>劃出社區範圍，決定誰是可以直接喊的鄰居。', '<strong>預設閘道</strong>是社區大門，要去外面的封包都交給它。新北各校的閘道目前在校端 L3 路由器，光纖到班之後各棟副控會成為該棟子網路的閘道。'],
      tip: '實務經驗：固定 IP 的設備（印表機、伺服器、交換器管理位址）要記在 IP 分配表上。新北的交換器管理段是 10.226.校編號、AP 是 10.228.校編號，報修時一說 IP 就知道是哪一類設備。',
      see: ['bin', 'ipv6', 'addr'],
      home: ['在自己的電腦執行 ipconfig，找出 IP 位址、子網路遮罩、預設閘道三行，看第二段是不是 213（教學）或 215（行政）。']
    },

    {
      key: '3-2', no: 11, id: '3-2', chap: CH3,
      name: '棟內還是跨棟',
      task: '任務：判斷封包要怎麼送',
      min: 0, max: 0, s2: 'first', testLabel: '對答案',
      idle: '五個目的地都判斷完，按「對答案」',
      intro: '電腦 A 每次要送資料，都會先問自己：對方是同社區的鄰居，還是外面的人？是鄰居就直接送，不是就交給閘道。它靠子網路遮罩來判斷。光纖到班之後各棟是獨立子網路，跨棟的封包會交給該棟副控轉送，對外的再經核心到校端 L3。',
      start: '看畫面上電腦 A 的 IP 和遮罩，再點每個目的地，判斷電腦 A 會直接送，還是交給閘道。',
      devs: { ...RACK4(), e1: DEST('同棟教學電腦', NET + '.23'), e2: DEST('鄰棟第二教學網段', SEG.user + '.251.40'), e3: DEST('行政處室', ADM + '.9'), e4: DEST('校務系統', SRV + '.5'), e5: DEST('教育局 DNS', DNS1) },
      fixed: SWFIX(), lay: L5, need: [], allow: swAllow,
      init() {
        this.mask = rnd() < .5 ? '255.255.255.0' : '255.255.252.0';
        for (let i = 1; i <= 5; i++) this.devs['e' + i].tag = '還沒判斷';
        const t = `電腦 A：${NET}.60　遮罩 ${this.mask}`;
        this.zones = { wide: [[450, 106, t]], narrow: [[14, 332, t]] };
        return { cables: [], intro: this.intro }
      },
      bits() { return this.mask === '255.255.255.0' ? 24 : 22 },
      num: ip => ip.split('.').reduce((a, x) => a * 256 + (+x), 0),
      local(ip) { const n = this.bits(), m = n >= 32 ? 0xffffffff : (0xffffffff << (32 - n)) >>> 0; return ((this.num(ip) & m) >>> 0) === ((this.num(NET + '.60') & m) >>> 0) },
      onDev(id) { const d = D[id]; showActs(`${d.name} ${d.ip}：電腦 A 要怎麼送？`, [['直接送（同一個網段）', () => { d.tag = '本地：直接送' }], ['交給閘道（不同網段）', () => { d.tag = '長途：交給閘道' }]]) },
      check() {
        const ids = ['e1', 'e2', 'e3', 'e4', 'e5'], H = '電腦 A 的判斷', n = this.bits();
        if (ids.some(id => D[id].tag === '還沒判斷')) return { ok: false, free: true, head: H, lines: [], msg: '還有目的地沒判斷。每一個都點一下。' };
        const right = id => (D[id].tag[0] === '本') === this.local(D[id].ip), lines = ids.map(id => `<span class="${right(id)?'o':'x'}">${D[id].ip.padEnd(16)}${this.local(D[id].ip)?'本地':'長途'}${right(id)?'':'　你答錯了'}</span>`);
        const bad = ids.find(id => !right(id));
        if (!bad) return { ok: true, head: H, lines };
        const ip = D[bad].ip;
        return { ok: false, head: H, lines, msg: n === 24 ? `遮罩 255.255.255.0 代表前三段是社區名稱。${ip} 的前三段是 ${ip.split('.').slice(0,3).join('.')}，和電腦 A 的 ${NET} ${this.local(ip)?'相同，是鄰居，直接送':'不同，要交給閘道'}。` : `遮罩 255.255.252.0 是 /22，第三段 248 到 251 都算同一個社區（4 個 /24 合併）。${ip} ${this.local(ip)?'在這個範圍裡，是鄰居，直接送':'不在這個範圍裡，要交給閘道'}。` }
      },
      goals: [['五個目的地都判斷完', () => [1, 2, 3, 4, 5].every(i => lvk('3-2').devs['e' + i].tag !== '還沒判斷')]],
      extra: '先看遮罩有幾個 255，再比對前幾段',
      passMsg: '過關！你已經會用遮罩分辨鄰居和外人。',
      hints: ['遮罩裡有幾個 255，就代表 IP 的前幾段是「社區名稱」。255.255.252.0 比 /24 大，第三段差 4 以內都算同一區。', `把目的地 IP 的那幾段，和電腦 A 的 ${NET}.60 比一比。完全一樣就是鄰居。`, '新北的網段第二段代表用途：213 教學、215 行政、217 伺服器。第二段不同的一定要交給閘道。'],
      learn: ['電腦用<strong>子網路遮罩</strong>比對自己和對方的 IP。前面幾段相同，就是同一個網段。', '同網段<strong>直接送</strong>，不同網段<strong>交給閘道</strong>。所以遮罩設錯，電腦就會找錯人。', '255.255.255.0 也寫成 <strong>/24</strong>，255.255.252.0 是 <strong>/22</strong>。新北有些學校的教學網段是 /20 或 /21，一個網段涵蓋十幾個 /24。'],
      tip: '實務經驗：兩台電腦 IP 看起來很接近卻互相連不到，先比對它們的遮罩和網段，常常是其中一台設到隔壁網段去了。',
      see: ['cidr', 'bin', 'l3sub'],
      home: ['用 ipconfig 看到的遮罩，判斷自己學校的教學網段是 /24、/22 還是更大。再查校務系統的 IP，想想它跟你的電腦在不在同一個網段。']
    },

    {
      key: '3-3', no: 12, id: '3-3', chap: CH3,
      name: '領不到門牌',
      task: '任務：找出領不到 IP 的原因',
      min: 3, max: 3, s2: 'first', firstLabel: '沒有動到正常的線和設備', testLabel: '測試連線',
      idle: '按「測試連線」會從三台電腦各 ping 8.8.8.8',
      intro: '大部分電腦不用手動設定 IP，開機時會自動向 DHCP 伺服器領一個。這所學校的 DHCP 伺服器在校端 L3 路由器上；光纖到班之後各棟副控以 DHCP Relay 把教室的請求轉送到校端 L3。這間教室有電腦不能上網。',
      start: '先按「測試連線」看是哪幾台。點電腦可以執行 ipconfig，點校端 L3、副控、教室端可以查看它們的狀態。',
      devs: (() => { const l3 = L3(), core = CORE(), aggr = AGGR('B'), sw = EDGE(); l3.tap = aggr.tap = sw.tap = true; return { l3, core, aggr, sw, e1: DESK('電腦 A', ''), e2: DESK('電腦 B', ''), e3: DESK('電腦 C', '') } })(),
      fixed: SWFIX(),
      lay: {
        wide: { W: 900, H: 540, net: { x: 226, y: 44 }, rack: { x: 40, y: 98, w: 372, h: 424 }, pos: { l3: [60, 108], core: [60, 208], aggr: [60, 308], sw: [60, 408], e1: [450, 120], e2: [600, 120], e3: [750, 120] } },
        narrow: { W: 440, H: 700, net: { x: 220, y: 42 }, rack: { x: 34, y: 98, w: 372, h: 420 }, pos: { l3: [54, 108], core: [54, 208], aggr: [54, 308], sw: [54, 408], e1: [14, 540], e2: [170, 540], e3: [326, 540] } }
      },
      need: [], allow: swAllow,
      init() {
        const ids = ['e1', 'e2', 'e3'], i = Math.floor(rnd() * 3), cs = ids.map((id, n) => ({ a: id + '.p', b: 'sw.p' + (n + 1) }));
        this.who = ids[i];
        this.cause = ['loose', 'pool', 'vlan', 'relay'][Math.floor(rnd() * 4)];
        this.fixedPool = false;
        this.relay = this.cause === 'relay' ? '未設定' : GW;
        let n = 101;
        ids.forEach(id => { const d = this.devs[id]; d.noip = this.cause === 'relay' || id === this.who; d.ipv = d.noip ? '' : NET + '.' + (n++); d.subfn = () => d.noip ? '169.254.37.12' : d.ipv });
        if (this.cause === 'loose') cs[i].broken = true;
        if (this.cause === 'vlan') this.devs.sw.ports['p' + (i + 1)].vlan = 99;
        return { cables: cs, intro: this.cause === 'relay' ? 'B 棟今天剛切換到新副控，整間教室三台電腦都不能上網，A 棟一切正常。' : this.intro }
      },
      cab: id => cables.find(c => dv(c.a) === id || dv(c.b) === id),
      blocked(id) {
        const c = this.cab(id);
        if (!c || c.broken) return true;
        if (this.cause === 'pool' && !this.fixedPool) return true;
        if (this.relay !== GW) return true;
        const k = dv(c.a) === 'sw' ? c.a : c.b;
        return pobj(k).vlan === 99
      },
      onDev(id) {
        const L = this, d = D[id];
        if (id === 'l3') return showActs('校端 L3 路由器（DHCP 伺服器）：', [
          ['查看 DHCP 發放狀況', () => say(L.cause === 'pool' && !L.fixedPool ? `教學網段可發放範圍是 ${NET}.101 到 ${NET}.102，只有 2 個，已經全部發完。第三台電腦來領的時候，沒有門牌可發了。` : L.relay !== GW ? '可發放範圍還有很多空位，但最近十分鐘沒有收到 B 棟任何一筆 DHCP 請求。請求在半路就沒了。' : '可發放範圍還有很多空位，DHCP 伺服器運作正常。')],
          ['擴大可發放範圍', () => { if (L.cause === 'pool' && !L.fixedPool) { L.fixedPool = true; say(`範圍擴大到 ${NET}.101 到 ${NET}.200。現在有門牌可發了，回去請那台電腦重新領一次。`, 'ok') } else { fails++; say('可發放的門牌本來就夠用，問題不在這裡。', 'bad') } }],
          ['重新開機', () => { fails++; say('校端 L3 重開，全校斷線三分鐘。回來之後問題還在。', 'bad') }],
          ['不處理', () => {}]
        ]);
        if (id === 'aggr') return showActs('B 棟副控點交換器：', [
          ['查看 DHCP Relay 設定', () => say(L.relay === GW ? `B 棟子網路的 DHCP Relay 指向 ${GW}（校端 L3），正常。` : `B 棟子網路的 DHCP Relay 是「未設定」。教室的 DHCP 廣播到副控就停了，沒有被轉送到校端 L3。這是今天切換時漏掉的設定。`)],
          [`把 DHCP Relay 指向校端 L3（${GW}）`, () => { if (L.relay !== GW) { L.relay = GW; say('Relay 設好了。回去請每一台電腦重新領一次 IP。', 'ok') } else { fails++; say('Relay 本來就指向校端 L3，不用改。', 'bad') } }],
          ['不處理', () => {}]
        ]);
        if (id === 'sw') {
          const odd = Object.keys(d.ports).filter(q => d.ports[q].vlan === 99).map(q => q.toUpperCase());
          return showActs('教室端交換器：', [
            ['查看各埠 VLAN', () => say(odd.length ? `${odd.join('、')} 被設在 VLAN 99，其他埠都在 VLAN 20。VLAN 99 沒有閘道也沒有 DHCP Relay，那一埠的電腦喊破喉嚨也沒人回應。` : '所有埠都在教學 VLAN 20，沒有問題。')],
            ['把所有埠改回 VLAN 20', () => { if (odd.length) { odd.forEach(q => delete d.ports[q.toLowerCase()].vlan); say('改回 VLAN 20 了。回去請那台電腦重新領一次 IP。', 'ok') } else { fails++; say('本來就都在 VLAN 20，不用改。', 'bad') } }],
            ['不處理', () => {}]
          ])
        }
        showActs(`${d.name}：`, [
          ['執行 ipconfig', () => { showTerm(IPC(d.noip ? '169.254.37.12' : d.ipv, d.noip ? '255.255.0.0' : '255.255.255.0', d.noip ? '' : GW)); say(d.noip ? '169.254 開頭不是學校發的門牌。電腦喊了半天沒有 DHCP 伺服器回應，只好自己編一個，所以哪裡都去不了。' : `${d.name}有領到學校發的 IP，正常。`) }],
          ['重新領 IP（ipconfig /renew）', () => { if (!d.noip) say(`${d.name}本來就有 IP，重新領一次還是一樣。`); else if (L.blocked(id)) say('重新領取失敗：連絡不到 DHCP 伺服器。原因還沒排除，往線路、教室端 VLAN、副控 Relay、校端 L3 查。', 'bad'); else { d.noip = false; d.ipv = NET + '.' + (103 + ['e1', 'e2', 'e3'].indexOf(id)); say(`領到了！${d.name}拿到 ${d.ipv}。`, 'ok') } }],
          ['不處理', () => {}]
        ])
      },
      onCut(rc) { if (rc.broken) say('這條線的水晶頭卡榫斷了，插著但沒有接觸好，所以連線燈不亮。換一條新線接回去，再請電腦重新領 IP。', 'ok'); else { fails++; say('這條線是好的，記得接回去。', 'bad') } },
      check() {
        const ids = ['e1', 'e2', 'e3'], H = '從三台電腦各 ping 8.8.8.8', okd = id => { const c = this.cab(id); return c && !c.broken && !D[id].noip };
        const lines = ids.map(id => okd(id) ? `<span class="o">${D[id].name}：回覆自 8.8.8.8 時間=4ms</span>` : `<span class="x">${D[id].name}：傳輸失敗</span>`), bad = ids.find(id => !okd(id));
        return bad ? { ok: false, free: true, head: H, lines, msg: `${D[bad].name}不能上網。點它執行 ipconfig，看它拿到什麼 IP。`, at: bad } : { ok: true, head: H, lines }
      },
      goals: [['排除領不到 IP 的原因', () => { const L = lvk('3-3'); return ['e1', 'e2', 'e3'].every(id => !L.blocked(id)) }], ['讓電腦重新領到 IP', () => ['e1', 'e2', 'e3'].every(id => !lvk('3-3').devs[id].noip)]],
      extra: '由下往上查：先看燈，再看教室端，再看副控，最後看校端 L3',
      passMsg: '過關！三台電腦都領到門牌了。工具 ipconfig 已經學會。',
      hints: ['點不能上網的電腦，執行 ipconfig。IP 是 169.254 開頭，代表它沒領到學校發的門牌。', '領不到有四個方向，由下往上查：那一埠的連線燈有沒有亮？教室端那一埠的 VLAN 對不對？副控的 DHCP Relay 有沒有設？校端 L3 還有沒有門牌可發？整間教室都領不到，多半在副控或校端 L3。', '原因排除之後，電腦不會自己好。再點它一次，選「重新領 IP」。'],
      learn: ['<strong>DHCP</strong> 讓電腦開機時自動領到 IP、遮罩、閘道和 DNS。新北各校的 DHCP 伺服器在校端 L3 路由器。', '光纖到班之後各棟是獨立子網路，DHCP 廣播出不了棟，副控要用 <strong>DHCP Relay</strong> 把請求轉送到校端 L3。Relay 漏設，整棟都領不到。', 'IP 是 <strong>169.254</strong> 開頭，代表電腦沒領到。看到它就往線路、VLAN、Relay、DHCP 伺服器四個方向查；原因排除後用 <strong>ipconfig /renew</strong> 重新領一次。'],
      tip: '實務經驗：整棟同時拿到 169.254，多半是副控 Relay 或上行線路出問題。只有一台，就查那一台的線和它插的那一埠。切換到新副控當天，廠商的切換計畫書要列出 Relay 設定與回復步驟。',
      see: ['special', 'relay'],
      home: ['執行 ipconfig /all，找「DHCP 伺服器」和「租用期限」兩行，看學校的 IP 是哪一台發的、多久要續約。']
    },

    {
      key: '3-4', no: 13, id: '3-4', chap: CH3,
      name: '私接分享器',
      task: '任務：找出亂發 IP 的設備',
      min: 5, max: 5, s2: 'first', firstLabel: '一次就找對', testLabel: '測試連線',
      idle: '按「測試連線」會從三台電腦各 ping 校務系統',
      intro: `三年二班的老師說，教室的電腦有的可以上網、有的不行，不行的那幾台連校務系統都打不開。${NMS}跳出「非法 DHCP」告警。上週有老師嫌教室收訊不好，自己帶了一台機器來插。`,
      start: '點電腦可以執行 ipconfig 和 arp -a，點教室端交換器可以查看 MAC 位址表，也可以啟用 DHCP Snooping。兩台「設備 ?」在隔壁教室，現場看不到。',
      devs: (() => { const sw = EDGE(); sw.tap = true; return { l3: L3(), core: CORE(), aggr: AGGR('B'), sw, e1: DESK('電腦 A', ''), e2: DESK('電腦 B', ''), e3: DESK('電腦 C', ''), e4: BOX('設備 ?', '在隔壁教室'), e5: BOX('設備 ?', '在隔壁教室') } })(),
      fixed: SWFIX(), lay: L5, need: [], allow: swAllow,
      init() {
        const ids = ['e1', 'e2', 'e3', 'e4', 'e5'], macs = shuffle(['3c-52-82-1a-9f-04', 'a4-bb-6d-70-21-c8', '00-1b-a9-5e-33-90', 'd8-9e-f3-0c-47-1e', '14-eb-b6-3c-90-d2']), ports = shuffle([1, 2, 3, 4, 5, 6]);
        this.rogue = rnd() < .5 ? 'e4' : 'e5';
        this.snoop = false;
        const hit = shuffle(['e1', 'e2', 'e3']).slice(0, rnd() < .5 ? 1 : 2);
        let n = 101, m = 103;
        ids.forEach((id, i) => { const d = this.devs[id]; d.mac = macs[i]; if (i < 3) { d.bad = hit.includes(id); d.good = NET + '.' + (n++); d.fake = '192.168.0.' + (m++); d.subfn = () => d.bad ? d.fake : d.good } else { d.name = '設備 ?'; d.sub = '在隔壁教室' } });
        return { cables: ids.map((id, i) => ({ a: id + '.p', b: 'sw.p' + ports[i] })), intro: this.intro }
      },
      cab: id => cables.find(c => dv(c.a) === id || dv(c.b) === id),
      live() { return !!this.cab(this.rogue) && !this.snoop },
      onDev(id) {
        const L = this, d = D[id], R = D[L.rogue];
        if (id === 'sw') return showActs('教室端交換器：', [
          ['查看 MAC 位址表', () => { showTerm('<span class="d">教室端交換器 MAC 位址表</span>\n  埠   MAC 位址\n' + cables.map(c => dv(c.a) === 'sw' ? [c.a, c.b] : [c.b, c.a]).sort((x, y) => x[0] < y[0] ? -1 : 1).map(x => '  ' + x[0].slice(3).toUpperCase() + '   ' + D[dv(x[1])].mac).join('\n') + '\n  S1   cc-2d-e0-11-7a-01（上行）'); say('這張表記錄每個 MAC 是從哪一埠進來的。拿可疑的 MAC 來對。') }],
          ['啟用 DHCP Snooping（只信任上行埠 S1）', () => { if (!L.snoop) { L.snoop = true; say('啟用了。從現在起只有 S1 進來的 DHCP 回應會被放行，其他埠送出的 DHCP 回應一律丟棄。那台設備還在，但發不出假門牌了。接著還是要找到它拔掉。', 'ok') } else { fails++; say('DHCP Snooping 已經啟用。', 'bad') } }],
          ['不處理', () => {}]
        ]);
        if (id === 'e4' || id === 'e5') { say(d.name === '設備 ?' ? '這台設備在隔壁教室，從壁掛箱看不到它是什麼。用交換器的 MAC 位址表來判斷。' : `這是${d.name}。`); return }
        showActs(`${d.name}：`, [
          ['執行 ipconfig /all', () => { showTerm(IPC(d.bad ? d.fake : d.good, '255.255.255.0', d.bad ? '192.168.0.1' : GW, '\n  DHCP 伺服器 . . : ' + (d.bad ? '192.168.0.1' : GW))); say(d.bad ? `${d.name}拿到的是 192.168.0 開頭的 IP，發給它的 DHCP 伺服器是 192.168.0.1。學校的網段是 ${NET}，這不是學校發的。` : `${d.name}的 IP 是校端 L3 ${GW} 發的，正常。`) }],
          ['執行 arp -a', () => { showTerm('<span class="d">C:\\&gt; arp -a</span>\n  IP 位址          MAC 位址\n  ' + (d.bad ? '192.168.0.1     ' + R.mac : GW + '  cc-2d-e0-11-7a-01')); say(d.bad ? '這是那台冒牌 DHCP 伺服器的 MAC。記下來，去教室端交換器的 MAC 位址表找它插在哪一埠。' : '這是學校閘道的 MAC，從上行埠 S1 進來。') }],
          ['重新領 IP（ipconfig /renew）', () => { if (!d.bad) say(`${d.name}的 IP 本來就是學校發的。`); else if (L.live()) say(`${d.name}又領到 192.168.0 開頭的 IP。那台設備還在網路上，它回答得比校端 L3 快。`, 'bad'); else { d.bad = false; say(`${d.name}這次領到學校發的 ${d.good} 了。`, 'ok') } }],
          ['不處理', () => {}]
        ])
      },
      onCut(rc) {
        const id = [dv(rc.a), dv(rc.b)].find(x => x !== 'sw');
        if (id === this.rogue) { D[id].name = '無線分享器'; D[id].sub = '老師自己帶來的'; build(); say('找到了！是一台家用無線分享器。它的 LAN 孔被插到牆上的網路孔，就開始對整間教室發自己的 IP。拔掉後，請拿到假門牌的電腦重新領 IP。', 'ok') } else { fails++; say(`你拔掉的是${D[id].name==='設備 ?'?'隔壁教室的印表機':D[id].name}，那是正常的設備。把線接回去，再對一次 MAC。`, 'bad') }
      },
      check() {
        const ids = ['e1', 'e2', 'e3'], H = `從三台電腦各 ping 校務系統 ${SRV}.5`, okd = id => this.cab(id) && !D[id].bad;
        const lines = ids.map(id => okd(id) ? `<span class="o">${D[id].name}：有回應</span>` : `<span class="x">${D[id].name}：要求等候逾時</span>`), bad = ids.find(id => !okd(id));
        if (this.live()) return { ok: false, free: true, head: H, lines, msg: '亂發 IP 的設備還在網路上。點不能上網的電腦執行 ipconfig /all 和 arp -a，再去教室端交換器對 MAC 位址表。', at: bad };
        if (!this.cab(this.rogue === 'e4' ? 'e5' : 'e4')) return { ok: false, free: true, head: H, lines, msg: '隔壁教室的印表機被你拔掉了，把它的線接回去。' };
        if (this.cab(this.rogue) && !bad) return { ok: false, head: H, lines, msg: 'DHCP Snooping 擋住了假門牌，電腦都正常了。但那台分享器還插在網路上，找到它拔掉，不然它的無線網路還在發送。' };
        return bad ? { ok: false, free: true, head: H, lines, msg: this.cab(bad) ? `分享器的假門牌被擋掉了，但${D[bad].name}手上還拿著它發的假門牌。點它，重新領一次 IP。` : `${D[bad].name}的線還沒接回去。` } : { ok: true, head: H, lines }
      },
      goals: [['阻斷亂發 IP 的設備（拔線或啟用 DHCP Snooping）', () => !lvk('3-4').live()], ['讓拿到假門牌的電腦重新領 IP', () => ['e1', 'e2', 'e3'].every(id => !lvk('3-4').devs[id].bad)], ['把分享器拔掉', () => !lvk('3-4').cab(lvk('3-4').rogue)]],
      extra: '用 arp -a 和 MAC 位址表確認之後再拔線',
      passMsg: '過關！冒牌的 DHCP 伺服器被你揪出來了。',
      hints: ['點不能上網的電腦，執行 ipconfig /all。注意它的 IP 開頭，還有「DHCP 伺服器」那一行。', '再對同一台電腦執行 arp -a，可以看到那台冒牌 DHCP 伺服器的 MAC。', '點教室端交換器查看 MAC 位址表，找到那個 MAC 在哪一埠，把那一埠的線拔掉。最後回電腦重新領 IP。來不及到現場時，先啟用 DHCP Snooping 止血。'],
      learn: ['家用無線分享器自己就是一台 <strong>DHCP 伺服器</strong>。接錯孔，它會對整個網段發自己的 IP。', `症狀是同一間教室<strong>有的通、有的不通</strong>，不通的電腦拿到 192.168.0 或 192.168.1 開頭的 IP；${NMS}會跳<strong>非法 DHCP</strong>告警。`, '找它的方法和第二章一樣：<strong>IP 查 MAC，MAC 查埠</strong>。本案教室端交換器啟用 <strong>DHCP Snooping</strong>，只信任上行埠的 DHCP 回應，影響範圍限於一間教室。'],
      tip: '實務經驗：這是校園最常見的人為故障之一。光纖到班的教室端預設開 DHCP Snooping 與 Port Isolation，但舊設備區域還是要靠智慧網管的非法 DHCP 告警。',
      see: ['nat', 'relay'],
      home: ['巡一次教室和辦公室，看有沒有私接的無線分享器或小交換器。看到先記下位置，跟老師溝通後再處理，不要直接拔。']
    },

    {
      key: '3-5', no: 30, id: '3-5', chap: CH3,
      name: '新舊閘道並存',
      task: '任務：完成 B 棟閘道切換，解除 IP 衝突',
      min: 2, max: 2, s2: 'first', firstLabel: '先備份再改設定', testLabel: '測試連線',
      noCut: '線路都是好的。問題在設定，點校端 L3 和副控。',
      idle: '按「測試連線」會從兩台電腦各 ping 閘道與 8.8.8.8',
      intro: `今天是 B 棟切換日：依切換計畫，B 棟教學子網路的閘道 ${GW} 要從校端 L3 路由器移到新的 B 棟副控。廠商把副控的 VLAN 20 介面設好啟用了，但校端 L3 上同一個介面還開著。${NMS}跳出「IP 衝突」告警，B 棟電腦時通時斷。`,
      start: '點校端 L3 和副控，先查看 VLAN 20 介面的設定。改設定之前先備份，照切換計畫把閘道留在副控、停用校端 L3 的那個介面。',
      devs: (() => { const l3 = L3(), core = CORE(), aggr = AGGR('B'), sw = EDGE(); l3.tap = aggr.tap = true; return { l3, core, aggr, sw, e1: DESK('電腦 A', NET + '.101'), e2: DESK('電腦 B', NET + '.102') } })(),
      fixed: SWFIX(),
      lay: {
        wide: { W: 900, H: 540, net: { x: 226, y: 44 }, rack: { x: 40, y: 98, w: 372, h: 424 }, pos: { l3: [60, 108], core: [60, 208], aggr: [60, 308], sw: [60, 408], e1: [500, 140], e2: [700, 140] } },
        narrow: { W: 440, H: 680, net: { x: 220, y: 42 }, rack: { x: 34, y: 98, w: 372, h: 420 }, pos: { l3: [54, 108], core: [54, 208], aggr: [54, 308], sw: [54, 408], e1: [60, 540], e2: [250, 540] } }
      },
      zones: { wide: [[450, 300, '切換計畫（B 棟教學 VLAN 20）：'], [450, 322, `1. 備份校端 L3 與副控設定　2. 副控 VLAN 20 介面 ${GW} 啟用`], [450, 344, '3. 停用校端 L3 的 VLAN 20 介面　4. 教室電腦重新領 IP 並測試']], narrow: [] },
      need: [], allow: swAllow,
      init() {
        this.devs.aggr.cfg = { gw20: GW }; this.devs.l3.cfg = { vl20: '啟用' };
        this.bk = { l3: false, aggr: false }; this.early = false;
        return { cables: [{ a: 'e1.p', b: 'sw.p1' }, { a: 'e2.p', b: 'sw.p2' }], intro: this.intro }
      },
      conflict() { return D.aggr.cfg.gw20 === GW && D.l3.cfg.vl20 === '啟用' },
      done() { return D.aggr.cfg.gw20 === GW && D.l3.cfg.vl20 === '停用' },
      onCfg(id) { if (!this.bk[id]) this.early = true },
      s2ok() { return !this.early },
      onDev(id) {
        const L = this;
        if (id === 'l3') return showActs('校端 L3 路由器：', [
          ['備份目前設定', () => { L.bk.l3 = true; say('校端 L3 的設定已匯出備份（檔名含今天日期）。改壞了可以回得去。', 'ok') }],
          ['查看 VLAN 20 介面', () => showTerm(`<span class="d">校端 L3 › interfaces › irb.20</span>\n  位址 . . . : ${GW}/24\n  狀態 . . . : ${D.l3.cfg.vl20}${L.conflict()?'\n<span class="x">  警告：偵測到相同位址 '+GW+' 來自另一個 MAC（副控）</span>':''}`)],
          ['修改 VLAN 20 介面', () => showCfg('l3', '校端 L3 的 VLAN 20 介面', [{ k: 'vl20', label: '介面狀態', opts: ['啟用', '停用'] }])],
          ['不處理', () => {}]
        ]);
        if (id === 'aggr') return showActs('B 棟副控點交換器：', [
          ['備份目前設定', () => { L.bk.aggr = true; say('副控的設定已匯出備份。', 'ok') }],
          ['查看 VLAN 20 介面', () => showTerm(`<span class="d">副控 › ip address › vlan20</span>\n  位址 . . . : ${D.aggr.cfg.gw20==='停用'?'（停用）':D.aggr.cfg.gw20+'/24'}\n  L3 硬體卸載 : 啟用${L.conflict()?'\n<span class="x">  警告：偵測到相同位址 '+GW+' 來自另一個 MAC（校端 L3）</span>':''}`)],
          ['修改 VLAN 20 介面', () => showCfg('aggr', '副控的 VLAN 20 閘道位址', [{ k: 'gw20', label: '閘道位址', opts: [GW, NET + '.253', '停用'] }])],
          ['不處理', () => {}]
        ]);
        showActs(`${D[id].name}：`, [['ping 閘道', () => { showTerm(`<span class="d">C:\\&gt; ping ${GW}</span>\n` + (L.conflict() ? '<span class="o">回覆自 ' + GW + '：時間=1ms</span>\n<span class="x">要求等候逾時。</span>\n<span class="o">回覆自 ' + GW + '：時間=1ms</span>\n<span class="x">要求等候逾時。</span>' : D.aggr.cfg.gw20 === GW || D.l3.cfg.vl20 === '啟用' ? '<span class="o">回覆自 ' + GW + '：時間=1ms（4 次都有回應）</span>' : '<span class="x">要求等候逾時。（沒有任何設備回應 ' + GW + '）</span>')); say(L.conflict() ? '時通時斷：兩台設備都在回應同一個閘道位址，電腦的 ARP 一下指到校端 L3、一下指到副控。' : '閘道回應穩定。') }], ['不處理', () => {}]])
      },
      check() {
        const H = '從兩台電腦各 ping 閘道與 8.8.8.8', c = this.conflict(), none = D.aggr.cfg.gw20 !== GW && D.l3.cfg.vl20 === '停用';
        const st = c ? '時通時斷' : none ? '要求等候逾時' : '有回應';
        const lines = ['e1', 'e2'].map(id => `<span class="${c||none?'x':'o'}">${D[id].name}：閘道 ${st}　8.8.8.8 ${st}</span>`);
        if (c) return { ok: false, free: true, head: H, lines, msg: `兩台設備同時用 ${GW}。照切換計畫，閘道留在副控，停用校端 L3 的 VLAN 20 介面。改之前先備份。`, at: 'l3' };
        if (none) return { ok: false, head: H, lines, msg: `現在沒有任何設備回應 ${GW}，整棟都出不去了。副控的 VLAN 20 介面要設成 ${GW} 並啟用。` };
        if (!this.done()) return { ok: false, head: H, lines, msg: `衝突解除了，但閘道還在校端 L3 上，切換計畫沒有完成。副控的 VLAN 20 介面要是 ${GW}，校端 L3 的介面要停用。` };
        return { ok: true, head: H, lines }
      },
      goals: [['兩台設備都備份過設定', () => { const b = lvk('3-5').bk; return !!(b && b.l3 && b.aggr) }], ['閘道只在副控上', () => lvk('3-5').done()]],
      extra: '先備份，再只改切換計畫要求的那一項',
      passMsg: '過關！B 棟的閘道順利移到副控，衝突解除。',
      hints: ['點校端 L3 和副控各選「查看 VLAN 20 介面」，兩邊都是同一個位址而且都啟用，就是衝突來源。', '改設定前，兩台都先選「備份目前設定」。', '切換計畫寫得很清楚：閘道留在副控，把校端 L3 的 VLAN 20 介面改成「停用」。改成副控停用也能解除衝突，但切換就沒完成。'],
      learn: ['兩台設備用<strong>同一個閘道位址</strong>，電腦的 ARP 會一下指到這台、一下指到那台，症狀是整棟時通時斷。', '閘道切換要照<strong>切換計畫</strong>：先備份、設新閘道、停舊介面、重新領 IP 測試。每一步都有回復方法。', '本案各校的 VLAN 與子網路調整方案載入該校施工計畫書，涉及閘道變更時廠商要先備份並避免新舊閘道同時啟用相同 IP。'],
      tip: `實務經驗：切換當天盯著${NMS}的 IP 衝突與非法 IP 告警，一出現就先看是不是新舊閘道同時啟用，比到處拔線快得多。`,
      see: ['backup', 'l3sub'],
      home: ['問光纖到班施工單位：自己學校的切換日是哪一天、切換計畫書在哪裡、回復步驟寫了什麼。']
    },

    {
      key: 't3', no: 14, id: '報修單', chap: CH3,
      name: 'IP 設定出包',
      task: '報修單：電腦教室的怪現象',
      min: 4, max: 4, s2: 'first', firstLabel: '只改了有問題的那一項', testLabel: '測試連線',
      noCut: '線路都是好的，連線燈都亮著。問題在設定，點電腦看它的 IP 設定。',
      idle: '按「測試連線」會從四台電腦各 ping 閘道、校務系統、外網',
      intro: '',
      start: '先按「測試連線」看症狀。點電腦可以看到並修改它的 IP 設定。把有問題的和正常的放在一起比。',
      devs: { ...RACK4(), e1: DESK('電腦 A', ''), e2: DESK('電腦 B', ''), e3: DESK('電腦 C', ''), e4: DESK('電腦 D', '') },
      zones: () => { const t = 'A .' + host(61) + '　B .' + host(62) + '　C .' + host(63) + '　D .' + host(64); return { wide: [[450, 440, '固定 IP 分配表：' + t], [450, 462, `遮罩 255.255.255.0，閘道 ${GW}`]], narrow: [[14, 574, '分配表：' + t], [14, 596, `遮罩 255.255.255.0，閘道 ${GW}`]] } },
      fixed: SWFIX(), lay: { wide: L5.wide, narrow: Object.assign({}, L5.narrow, { H: 620 }) }, need: [], allow: swAllow,
      init() {
        const ids = ['e1', 'e2', 'e3', 'e4'], i = Math.floor(rnd() * 4), f = this.cause = ['gw', 'mask', 'dupe'][Math.floor(rnd() * 3)], X = this.devs[ids[i]];
        this.changes = 0;
        ids.forEach((id, n) => { const d = this.devs[id]; d.cfg = { ip: NET + '.6' + (n + 1), mask: '255.255.255.0', gw: GW }; d.subfn = () => d.cfg.ip });
        if (f === 'gw') X.cfg.gw = NET + '.245';
        if (f === 'mask') X.cfg.mask = '255.255.0.0';
        if (f === 'dupe') X.cfg.ip = NET + '.6' + ((i + 1) % 4 + 1);
        return { cables: ids.map((id, n) => ({ a: id + '.p', b: 'sw.p' + (n + 1) })), intro: { gw: `電腦教室的${X.name}不能上網，可是它和隔壁電腦互傳檔案沒問題。這間教室用的是固定 IP，上週有工讀生幫忙重灌過其中一台。`, mask: `電腦教室的${X.name}可以上網，也能和隔壁互傳檔案，就是打不開校務系統（${SRV}.5）。其他三台都正常。上週有工讀生幫忙重灌過其中一台。`, dupe: `電腦教室有兩台電腦輪流斷線，螢幕右下角跳出「偵測到 IP 位址衝突」，${NMS}也有 IP 衝突告警。這間教室用的是固定 IP，上週有工讀生幫忙重灌過其中一台。` }[f] }
      },
      onCfg() { this.changes++ },
      s2ok() { return this.changes <= 1 },
      onDev(id) { const d = D[id]; showTerm(IPC(d.cfg.ip, d.cfg.mask, d.cfg.gw)); showCfg(id, `${d.name}的網路設定`, [{ k: 'ip', label: 'IP 位址', opts: [NET + '.61', NET + '.62', NET + '.63', NET + '.64', GW] }, { k: 'mask', label: '子網路遮罩', opts: ['255.0.0.0', '255.255.0.0', '255.255.255.0'] }, { k: 'gw', label: '預設閘道', opts: [NET + '.1', NET + '.245', GW] }]) },
      res() { const ids = ['e1', 'e2', 'e3', 'e4']; return ids.map(id => ({ id, r: ipEval(D[id].cfg, ids.some(x => x !== id && D[x].cfg.ip === D[id].cfg.ip)) })) },
      check() {
        const H = '從四台電腦各 ping 閘道、校務系統、外網', rs = this.res(), w = b => b ? '通' : '不通';
        const lines = rs.map(x => `<span class="${x.r.why?'x':'o'}">${D[x.id].name}：閘道 ${w(x.r.gw)}　校務系統 ${w(x.r.srv)}　外網 ${w(x.r.net)}${x.r.why==='dupe'?'（時通時斷）':''}</span>`);
        return rs.some(x => x.r.why) ? { ok: false, free: true, head: H, lines, msg: '還有電腦不正常。點它看 IP 設定，和正常的電腦、畫面上的分配表逐項比對。' } : { ok: true, head: H, lines }
      },
      goals: [['找出設定錯誤並改正', () => lvk('t3').res().every(x => !x.r.why)]],
      extra: '改之前先比對，只改錯的那一項',
      passMsg: '修好了！四台電腦都恢復正常。工具 ping 已經學會。',
      hints: ['先按「測試連線」。看每一台的三個 ping 結果，哪一台、哪一項不通。', '閘道不通外網也不通，看「預設閘道」。只有校務系統不通，看「子網路遮罩」。兩台時通時斷，看它們的 IP 是不是一樣。', '點那台電腦，把錯的那一項改成和分配表一樣。'],
      learn: ['<strong>IP 衝突</strong>：兩台用同一個門牌，兩邊都時通時斷，智慧網管會告警。', '<strong>閘道設錯</strong>：找得到鄰居，出不了社區。<strong>遮罩設錯</strong>：某些網段莫名其妙連不到。', '排查順序：<strong>ping 閘道</strong>看內網，<strong>ping 外面的 IP</strong>看出口。哪一步不通，問題就在那一段。'],
      tip: '實務經驗：手動設定最容易打錯字。找不出問題時，拿一台正常的電腦，把 ipconfig 的結果和壞的那台逐行比對，通常一眼就看到。',
      see: ['ping'],
      home: ['找出學校的固定 IP 分配表。沒有的話，從印表機、伺服器、交換器管理位址開始建立一份。'],
      close() {
        return CLOSE({
          gw: { rc: '有一台電腦的預設閘道打錯了', pv: '固定 IP 都登記在分配表上，照表設定，設完 ping 閘道和外面的 IP 確認', say: '那台電腦通往外面的大門設錯了，所以連不出去，已經改好' },
          mask: { rc: '有一台電腦的子網路遮罩設錯了', pv: '固定 IP 都登記在分配表上，照表設定，設完 ping 閘道和外面的 IP 確認', say: '那台電腦的網段範圍設錯了，所以連不到校務系統，已經改好' },
          dupe: { rc: '兩台電腦設成同一個 IP（撞號）', pv: '固定 IP 都登記在分配表上，照表設定，設完 ping 閘道和外面的 IP 確認', say: '有兩台電腦用了同一個 IP，互相搶線，已經把其中一台改掉' }
        }, this.cause, ['電腦有問題就直接重灌，設定會回到乾淨的狀態', '每週把校端 L3 重開一次，清掉所有連線和暫存', '把 IP 設定方法教給老師，以後請老師自己改'], ['教室端交換器的連接埠壞了'])
      }
    },
