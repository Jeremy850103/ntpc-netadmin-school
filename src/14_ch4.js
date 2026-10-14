    /* ===== 第四章 窗口與守門員（L4–L7） ===== */
    {
      key: '4-1', no: 15, id: '4-1', chap: CH4, osi: [5],
      name: '查號台',
      task: '任務：網址打不開的電腦',
      min: 1, max: 1, s2: 'first', firstLabel: '先診斷，再修改設定', testLabel: '測試連線',
      noCut: '線路是好的，連線燈亮著。點電腦做診斷。',
      idle: '按「測試連線」會 ping 8.8.8.8，再開啟 www.google.com',
      intro: '老師說：「網路明明有通，LINE 還能用，可是瀏覽器每個網址都打不開。」電腦上網其實靠的是 IP，我們打的網址要先問 DNS 這個查號台，換成 IP 才連得過去。新北各校的電腦依規定使用教育局指定的 DNS。',
      start: '點「教室電腦」。先用 ping 和 nslookup 找出問題在哪一段，再決定要改什麼設定。',
      devs: { l3: L3(), sw: EDGE(), e1: DESK('教室電腦', NET + '.60') },
      zones: { wide: [[450, 440, `教育局指定 DNS：${DNS1}`], [450, 462, '備用：8.8.8.8（Google 公用 DNS）']], narrow: [[14, 460, `教育局指定 DNS：${DNS1}`], [14, 482, '備用：8.8.8.8']] },
      fixed: SWFIX(), lay: L5, need: [], allow: swAllow,
      init() { this.devs.e1.cfg = { dns: rnd() < .5 ? '1.2.3.4' : SRV + '.54' }; this.diag = false; this.early = false; return { cables: [{ a: 'e1.p', b: 'sw.p1' }], intro: this.intro } },
      good() { return [DNS1, DNS2].includes(D.e1.cfg.dns) },
      onCfg() { if (!this.diag) this.early = true },
      s2ok() { return !this.early },
      onDev(id) {
        const L = this, d = D.e1, g = L.good(), dns = d.cfg.dns;
        showActs('教室電腦：', [
          ['ping 8.8.8.8', () => { showTerm('<span class="d">C:\\&gt; ping 8.8.8.8</span>\n<span class="o">回覆自 8.8.8.8：位元組=32 時間=4ms\n回覆自 8.8.8.8：位元組=32 時間=3ms</span>'); say('用 IP 去 ping，外面是通的。所以線路、IP、閘道都沒問題。') }],
          ['ping www.google.com', () => { L.diag = true; showTerm('<span class="d">C:\\&gt; ping www.google.com</span>\n' + (g ? '<span class="o">Ping www.google.com [142.250.196.68]\n回覆自 142.250.196.68：時間=5ms</span>' : '<span class="x">Ping 要求找不到主機 www.google.com。\n請檢查名稱，然後再試一次。</span>')); say(g ? '網址換得成 IP 了，DNS 正常。' : '用 IP 會通，用網址不通。問題就出在「網址換成 IP」這一步，也就是 DNS。') }],
          ['nslookup www.google.com', () => { L.diag = true; showTerm('<span class="d">C:\\&gt; nslookup www.google.com</span>\n伺服器:  ' + dns + '\n' + (g ? '<span class="o">名稱:    www.google.com\nAddress: 142.250.196.68</span>' : '<span class="x">DNS request timed out.\n*** 要求 ' + dns + ' 逾時</span>')); say(g ? '查號台有回答，DNS 正常。' : `電腦去問 ${dns} 這個查號台，對方沒有回應。${dns===SRV+'.54'?'那是一台去年已經停用的舊校內主機。':''}這台電腦的 DNS 伺服器設錯了。`) }],
          ['修改 DNS 設定', () => showCfg('e1', '教室電腦的 DNS 伺服器', [{ k: 'dns', label: 'DNS 伺服器', opts: ['1.2.3.4', DNS2, DNS1, SRV + '.54'] }])],
          ['不處理', () => {}]
        ])
      },
      check() {
        const g = this.good(), H = '從教室電腦測試', lines = ['<span class="o">ping 8.8.8.8：有回應</span>', g ? '<span class="o">開啟 www.google.com：成功</span>' : '<span class="x">開啟 www.google.com：找不到伺服器</span>'];
        return g ? { ok: true, head: H, lines } : { ok: false, free: true, head: H, lines, msg: '用 IP 會通，用網址不通。點電腦，用 nslookup 看它在問哪一個查號台。' }
      },
      goals: [['讓網址可以換成 IP', () => [DNS1, DNS2].includes((lvk('4-1').devs.e1.cfg || {}).dns)]],
      extra: '先用 ping 網址或 nslookup 確認是 DNS，再動設定',
      passMsg: '過關！查號台換對了，網址都打得開了。工具 nslookup 已經學會。',
      hints: ['點電腦，分別 ping 8.8.8.8 和 ping www.google.com。一個通、一個不通，差別在有沒有經過 DNS。', '執行 nslookup，第一行「伺服器」就是這台電腦在問的查號台。看它是不是畫面上寫的那兩個。', '選「修改 DNS 設定」，改成教育局指定的 DNS。'],
      learn: ['<strong>DNS</strong> 是網際網路的查號台，負責把網址換成 IP。', '<strong>ping IP 會通、ping 網址不通</strong>，就是 DNS 的問題，線路和 IP 都不用查。', '<strong>nslookup</strong> 可以看電腦在問哪一台 DNS、有沒有得到回答。校內舊主機停用前，要先查有哪些電腦的 DNS 還指向它。'],
      tip: '實務經驗：使用者說「LINE 可以、網頁不行」，先懷疑 DNS。App 常有自己記住的連線位址或 DNS 快取，暫時還連得上；瀏覽器開新網址一定要先查 DNS，所以最先出狀況。',
      see: ['ping', 'tcp'],
      home: ['執行 nslookup www.google.com，看第一行「伺服器」是哪一台。這就是學校電腦在用的 DNS，記在盤點表上。']
    },

    {
      key: '4-2', no: 16, id: '4-2', chap: CH4, osi: [4],
      name: '只開必要的窗',
      task: '任務：整理校端 L3 對校內伺服器的存取規則',
      min: 0, max: 0, s2: 'first', testLabel: '從校外掃描',
      idle: '按「從校外掃描」，看校外能連到哪些通訊埠',
      intro: '',
      start: '點校端 L3 路由器，逐一決定每個通訊埠要不要對校外開放。先想清楚：這台伺服器有誰需要從校外連進來？點伺服器可以再看一次它的用途。',
      devs: (() => { const l3 = L3(); l3.tap = true; return { l3, sw: EDGE(), e1: DEST('學校網站', SRV + '.5') } })(),
      zones: { wide: [[450, 440, '80 HTTP：一般網頁　443 HTTPS：加密網頁'], [450, 462, '22 SSH：加密的遠端管理　23 Telnet：不加密的遠端管理'], [450, 484, '3389 遠端桌面']], narrow: [[14, 460, '80 HTTP　443 HTTPS　3389 遠端桌面'], [14, 482, '22 SSH：加密的遠端管理'], [14, 504, '23 Telnet：不加密的遠端管理']] },
      fixed: SWFIX(), lay: L5, need: [], allow: swAllow,
      SC: {
        web: { name: '學校網站', ip: SRV + '.5', web: true, ssh: true, use: '學校網站伺服器（Linux）。家長要能看學校網站；維護廠商用 SSH 從他們公司遠端連進來管理。', story: '學校網站伺服器要讓家長看得到，但前任資訊組長圖方便，把很多窗口都對外打開了。駭客最喜歡這種伺服器。' },
        win: { name: '學校網站', ip: SRV + '.6', web: true, rdp: true, use: '學校網站伺服器（Windows）。家長要能看學校網站；維護廠商用遠端桌面從他們公司連進來管理。', story: '學校網站放在一台 Windows 伺服器上，要讓家長看得到，但前任資訊組長圖方便，把很多窗口都對外打開了。' },
        nas: { name: '檔案伺服器 NAS', ip: SRV + '.8', use: '學校的 NAS，存著老師的檔案，只給校內使用。廠商到校維護，不從校外連。', story: '學校的 NAS 存著老師的檔案，只給校內使用。前任資訊組長為了在家也能連，把好幾個窗口都對外打開了。這種 NAS 是勒索軟體最愛的目標。' }
      },
      init() {
        const k = ['web', 'win', 'nas'][Math.floor(rnd() * 3)], sc = this.sc = this.SC[k], e = this.devs.e1;
        this.k = k;
        Object.assign(e, { name: sc.name, sub: sc.ip, ip: sc.ip, tag: '對外服務中' });
        const yn = ['允許', '拒絕'], rm = ['允許所有人', '只允許廠商的 IP', '拒絕'], pick = a => a[Math.floor(rnd() * a.length)];
        let c;
        do c = { p80: pick(yn), p443: pick(yn), p22: pick(rm), p23: pick(yn), p3389: pick(rm), other: '允許' }; while (this.rules(c).filter(r => !r[2]).length < 3);
        this.devs.l3.cfg = c;
        this.hints = ['先處理最後一項「其他全部」。預設拒絕是基本原則，改成拒絕之後，再個別打開需要的。', sc.web ? '家長看學校網站要用 80 和 443，這兩個要允許。' : '這台 NAS 不對外服務，80 和 443 對外都要拒絕。', '23 Telnet 對外一律拒絕。' + (sc.ssh ? '22 SSH 是廠商維護用的，選「只允許廠商的 IP」；3389 用不到，拒絕。' : sc.rdp ? '3389 遠端桌面是廠商維護用的，選「只允許廠商的 IP」；22 用不到，拒絕。' : '22 和 3389 也沒有人要從校外用，都拒絕。')];
        return { cables: [], intro: 'IP 是大樓的地址，通訊埠是大樓裡的服務窗口。' + sc.story + '教育局在骨幹有防火牆，但校內自有伺服器對外開放哪些埠，在校端 L3 路由器的存取控制清單設定。黃金原則是預設拒絕：只開必要的，其餘全部關上。' }
      },
      onDev(id) {
        if (id !== 'l3') { say(`這是${this.sc.use}要不要讓校外連進來，由校端 L3 的存取控制清單決定。`); return }
        const yn = ['允許', '拒絕'], rm = ['允許所有人', '只允許廠商的 IP', '拒絕'];
        showCfg('l3', `校外連到${this.sc.name}的規則`, [{ k: 'p80', label: '80', opts: yn }, { k: 'p443', label: '443', opts: yn }, { k: 'p22', label: '22', opts: rm }, { k: 'p23', label: '23', opts: yn }, { k: 'p3389', label: '3389', opts: rm }, { k: 'other', label: '其他全部', opts: yn }])
      },
      rules(c) {
        const sc = this.sc, V = '只允許廠商的 IP', w = sc.web ? '允許' : '拒絕',
          rem = (k, need, name, how) => [k, name, c[k] === (need ? V : '拒絕'), need ? (c[k] === '拒絕' ? `${k.slice(1)} 整個關掉，維護廠商就連不進來了。改成只允許廠商的 IP。` : `${name}對所有人開放，全世界都能來猜密碼。改成只允許廠商的 IP。`) : c[k] === V ? `廠商不是用${how}維護這台，${k.slice(1)} 不需要開，關掉。` : k === 'p3389' ? '遠端桌面直接對外開放，是勒索軟體最常走的門。對外要關。' : '這台沒有人要從校外用 SSH 連進來，22 對外要關。'];
        return [
          ['p80', '80 HTTP', c.p80 === w, sc.web ? '家長打學校網址時連不上。80 要開著，至少讓它轉到加密的 443。' : '這台 NAS 不對外服務，80 對外開著只是多一個被攻擊的入口。'],
          ['p443', '443 HTTPS', c.p443 === w, sc.web ? '學校網站對外看不到了。443 是加密網頁，一定要開。' : 'NAS 的管理網頁也走 443，對外開著，全世界都能試著登入。關掉。'],
          rem('p22', sc.ssh, '22 SSH', 'SSH'),
          ['p23', '23 Telnet', c.p23 === '拒絕', 'Telnet 的帳號密碼是明文傳送，路上的人都看得到。對外一定要關，遠端管理改用 SSH。'],
          rem('p3389', sc.rdp, '3389 遠端桌面', '遠端桌面'),
          ['other', '其他全部', c.other === '拒絕', '「其他全部」還是允許，等於沒有管制。黃金原則是預設拒絕，沒有明確需要的一律關上。']
        ]
      },
      check() {
        const c = D.l3.cfg, H = `從校外掃描${this.sc.name}`, R = this.rules(c);
        const lines = R.map(r => `<span class="${r[2]?'o':'x'}">${r[1].padEnd(12)}${c[r[0]]}${r[2]?'':'　有問題'}</span>`), bad = R.find(r => !r[2]);
        return bad ? { ok: false, head: H, lines, msg: bad[3] } : { ok: true, head: H, lines }
      },
      goals: [['六條規則都檢查過', () => { const c = lvk('4-2').devs.l3.cfg || {}; return c.other === '拒絕' }]],
      extra: '每一埠先想清楚誰需要用，再決定開或關',
      passMsg: '過關！只留下必要的窗口，其餘全部關上。',
      hints: [],
      learn: ['<strong>通訊埠</strong>是伺服器上的服務窗口：80 和 443 是網頁，22 是 SSH，53 是 DNS。', '存取控制的黃金原則是<strong>預設拒絕</strong>：只開放必要的埠，其餘全部關閉。', '管理用的埠不要對全世界開放。<strong>限定來源 IP</strong>，並且用加密的 SSH，不用 Telnet。本案三層設備的管理介面也只開 SSHv2 與 HTTPS，Telnet 與 HTTP 關閉。'],
      tip: '實務經驗：教育單位的資安稽核，第一件事就是從校外掃描對外開放的埠。3389、23、資料庫的埠對外開著，幾乎一定會被列為缺失。',
      see: ['ssh', 'https', 'vpn'],
      home: ['問既有網路維護廠商：學校有哪些服務對外開放（例如學校網站）、開了哪些埠、管理介面是不是限定來源。先記下來，不要自己動設定。']
    },

    {
      key: 't4a', no: 17, id: '報修單 1', chap: CH4, osi: [3, 5],
      name: 'Wi-Fi 連上卻不能上網',
      task: '報修單：訊號滿格，就是不能用',
      min: 1, max: 1, s2: 'first', firstLabel: '沒有做多餘的處理', testLabel: '測試連線',
      noCut: 'AP 的線是好的，連線燈亮著。點筆電做診斷。',
      idle: '按「測試連線」會從筆電 ping 8.8.8.8，再開啟 www.google.com',
      intro: '老師拿著筆電走過來：「Wi-Fi 明明有連上，訊號滿格，為什麼就是不能上網？」這是學校網管最常聽到的一句話。訊號滿格只代表第一層沒問題，要一層一層往上查。',
      start: '點筆電，先執行 ipconfig /all 看它拿到什麼 IP，再做 ping 測試。DHCP 設定在校端 L3 路由器上，畫面上有前任資訊組長留下的交接筆記。',
      devs: (() => { const l3 = L3(); l3.tap = true; const lap = LAPTOP('老師的筆電', ''); lap.tag = 'Wi-Fi 已連線，訊號滿格'; return { l3, sw: EDGE(), e1: AP('無線 AP', 'YHPS-Teacher'), e2: lap } })(),
      zones: NOTE, fixed: SWFIX(), lay: L5, need: [], allow: swAllow,
      init() {
        const f = this.cause = ['pool', 'dhcpdns', 'manual'][Math.floor(rnd() * 3)], l3 = this.devs.l3, d = this.devs.e2;
        l3.cfg = { end: f === 'pool' ? NET + '.119' : NET + '.200', dns: f === 'dhcpdns' ? SRV + '.53' : DNS1 };
        d.cfg = { mode: f === 'manual' ? '手動設定' : '自動取得' };
        this.good = { l3: { end: NET + '.200', dns: DNS1 }, e2: { mode: '自動取得' } };
        d.noip = f === 'pool'; d.lease = l3.cfg.dns; d.dns = f === 'manual' ? '1.2.3.4' : d.lease; d.tag = 'Wi-Fi 已連線，訊號滿格';
        d.subfn = () => d.noip ? '169.254.80.3' : NET + '.120';
        return { cables: [{ a: 'e1.p', b: 'sw.p1' }], intro: this.intro }
      },
      full() { return ![NET + '.200', GW].includes(D.l3.cfg.end) },
      overlap() { return D.l3.cfg.end === GW },
      manual() { return D.e2.cfg.mode === '手動設定' },
      dnsOk() { return [DNS1, DNS2].includes(D.e2.dns) },
      onCfg(id, k) { cfgFail(this, id, k); const d = D.e2; if (id === 'e2' && !d.noip) d.dns = this.manual() ? '1.2.3.4' : d.lease },
      onDev(id) {
        const L = this, d = D.e2;
        if (id === 'e1') { say('AP 的電源燈和連線燈都亮著，筆電連的是 YHPS-Teacher。'); return }
        if (id === 'l3') return showActs('校端 L3 路由器（DHCP 伺服器）：', [
          ['查看 DHCP 設定', () => showTerm(DHCPV(D.l3.cfg, L.cause === 'pool'))],
          ['修改 DHCP 設定', () => showCfg('l3', '校端 L3 的 DHCP 設定', DHCPF)],
          ['重新開機', () => { fails++; say('校端 L3 重開，全校斷線三分鐘。回來之後問題還在。', 'bad') }],
          ['不處理', () => {}]
        ]);
        showActs('老師的筆電：', [
          ['ipconfig /all', () => showTerm(IPC(d.noip ? '169.254.80.3' : NET + '.120', d.noip ? '255.255.0.0' : '255.255.255.0', d.noip ? '' : GW, '\n  DHCP 伺服器 . : ' + (d.noip ? '（空白）' : GW) + '\n  DNS 伺服器 . . : ' + (d.noip ? '（空白）' : d.dns + (L.manual() ? '（手動設定）' : '（DHCP 發放）'))))],
          ['ping 測試', () => { const ip = !d.noip, nm = ip && L.dnsOk(); showTerm('<span class="d">C:\\&gt; ping 8.8.8.8</span>\n' + (ip ? '<span class="o">回覆自 8.8.8.8：時間=6ms</span>' : '<span class="x">傳輸失敗。一般失敗。</span>') + '\n<span class="d">C:\\&gt; ping www.google.com</span>\n' + (nm ? '<span class="o">回覆自 142.250.196.68：時間=7ms</span>' : '<span class="x">Ping 要求找不到主機 www.google.com。</span>')) }],
          ['nslookup www.google.com', () => showTerm('<span class="d">C:\\&gt; nslookup www.google.com</span>\n' + (d.noip ? '<span class="x">*** 沒有可用的 DNS 伺服器</span>' : `伺服器:  ${d.dns}\n` + (L.dnsOk() ? '<span class="o">名稱:    www.google.com\nAddress: 142.250.196.68</span>' : '<span class="x">DNS request timed out.\n*** 無法找到 www.google.com</span>')))],
          ['重新領 IP', () => { if (L.full()) { say('重新領取失敗：DHCP 伺服器沒有回應，或沒有門牌可發。', 'bad'); return } d.noip = false; d.lease = D.l3.cfg.dns; if (!L.manual()) d.dns = d.lease; say(`筆電重新領到 ${NET}.120。`, 'ok') }],
          ['網路介面卡設定', () => showCfg('e2', '筆電的網路介面卡設定', [{ k: 'mode', label: 'DNS 伺服器', opts: ['自動取得', '手動設定'] }])],
          ['不處理', () => {}]
        ])
      },
      check() {
        const d = D.e2, ip = !d.noip, nm = ip && this.dnsOk(), H = '從老師的筆電測試';
        const lines = [ip ? '<span class="o">ping 8.8.8.8：有回應</span>' : '<span class="x">ping 8.8.8.8：傳輸失敗</span>', nm ? '<span class="o">開啟 www.google.com：成功</span>' : '<span class="x">開啟 www.google.com：找不到伺服器</span>'];
        if (nm && this.overlap()) return { ok: false, head: H, lines, msg: `筆電可以上網了，但 DHCP 範圍設到 ${GW}，那是閘道自己的位址。發到它的電腦會跟閘道撞號，全班都會斷線。範圍要照交接筆記設定。` };
        return nm ? { ok: true, head: H, lines } : { ok: false, free: true, head: H, lines, msg: '還是不能上網。點筆電，先看 ipconfig /all，再做 ping 測試，判斷卡在哪一層。' }
      },
      goals: [['筆電領到學校的 IP', () => !lvk('t4a').devs.e2.noip], ['網址可以換成 IP', () => { const d = lvk('t4a').devs.e2; return !d.noip && [DNS1, DNS2].includes(d.dns) }]],
      extra: '照順序查：IP 有沒有領到，ping IP 通不通，ping 網址通不通',
      passMsg: '修好了！老師的筆電可以上網了。',
      hints: ['點筆電執行 ipconfig /all。IP 是 169.254 開頭，就是沒領到，去校端 L3 查看 DHCP 設定，跟畫面上的交接筆記比對。', '有領到 IP 的話，做 ping 測試和 nslookup。IP 會通、網址不通，就是 DNS。看 ipconfig /all 的 DNS 伺服器那一行，跟交接筆記比對。', 'DNS 寫著「手動設定」，就在筆電的「網路介面卡設定」改回自動取得。寫著「DHCP 發放」卻跟交接筆記不一樣，就去校端 L3 修改 DHCP 設定，再請筆電重新領 IP。'],
      learn: ['<strong>Wi-Fi 連上、訊號滿格</strong>只代表第一、二層沒問題，離能上網還有好幾步。', '排查順序：<strong>ipconfig</strong> 看有沒有領到 IP，<strong>ping IP</strong> 看出不出得去，<strong>ping 網址</strong> 看 DNS。', '最常見的根因是 <strong>DNS 設定錯誤</strong>，或 DHCP 沒有發出正確的 DNS。'],
      tip: '實務經驗：同一個問題，一台發生就查那一台；一整班都發生，就查 DHCP 伺服器和它發出去的設定。',
      see: ['ping'],
      home: ['用手機連學校 Wi-Fi，在 Wi-Fi 的詳細資訊裡看拿到的 IP、閘道、DNS，跟有線電腦的 ipconfig 比較看看。'],
      close() {
        return CLOSE({
          pool: { rc: 'DHCP 可以發放的 IP 已經全部發完', pv: '依實際設備數量規劃 DHCP 範圍，並定期看使用率', say: '學校可以發的網路門牌用完了，已經擴大範圍' },
          dhcpdns: { rc: 'DHCP 發給電腦的 DNS 是一台已經停用的舊主機', pv: '設備停用前，先檢查有哪些設定指向它，每次變更都記錄下來', say: '網路設定還指向一台已經停用的舊主機，已經改成教育局指定的 DNS' },
          manual: { rc: '筆電的 DNS 被手動設定成錯的位址', pv: '學校的電腦一律用自動取得，並提醒老師不要照網路教學自己改設定', say: '您筆電的 DNS 被手動改成錯的位址，已經改回自動取得' }
        }, this.cause, ['把全校的無線 AP 換成新款，訊號更強就不會出問題', '請老師遇到狀況先改用手機熱點，不用等網管', '每天早上重開一次校端 L3，讓 DHCP 重新整理'], ['無線訊號太弱'])
      }
    },

    {
      key: 't4b', no: 18, id: '報修單 2', chap: CH4, osi: [4, 5],
      name: '只能上學校網站',
      task: '報修單：Google 和 YouTube 打不開',
      min: 1, max: 1, s2: 'first', firstLabel: '沒有做多餘的處理', testLabel: '測試連線',
      noCut: '線路是好的。學校網站打得開，代表下面幾層都正常。',
      idle: '按「測試連線」會開啟學校首頁、Google、YouTube',
      intro: '電腦教室的老師說：「好奇怪，學校首頁打得開，可是 Google 和 YouTube 都不行。」能上部分網站，代表線路、IP、閘道基本都通，問題一定在比較上面的幾層。',
      start: '點電腦，用 nslookup 和 tracert 判斷是名稱查不到，還是路被擋住。校內 DNS 伺服器的轉送設定在它自己身上，存取控制規則在校端 L3，畫面上有前任資訊組長留下的交接筆記。',
      devs: (() => { const l3 = L3(); l3.tap = true; const dns = BOX('校內 DNS 伺服器', SRV + '.53'); dns.tap = true; return { l3, sw: EDGE(), e1: DESK('教室電腦', NET + '.60'), e2: dns } })(),
      zones: NOTE, fixed: SWFIX(), lay: L5, need: [], allow: swAllow,
      init() {
        const f = this.orig = rnd() < .5 ? 'dns' : 'rule';
        this.devs.e2.cfg = { fwd: f === 'dns' ? SRV + '.54' : DNS1 };
        this.devs.l3.cfg = { r103: '啟用', r104: '啟用', r105: '啟用' };
        this.good = { e2: { fwd: DNS1 }, l3: { r103: '啟用', r104: '啟用', r105: f === 'rule' ? '停用' : '啟用' } };
        return { cables: [{ a: 'e1.p', b: 'sw.p1' }, { a: 'e2.p', b: 'sw.p6' }], intro: this.intro }
      },
      bad() { const c = D.l3.cfg; return D.e2.cfg.fwd !== DNS1 ? 'dns' : this.orig === 'rule' && c.r105 === '啟用' ? 'rule' : '' },
      onCfg(id, k) { cfgFail(this, id, k) },
      onDev(id) {
        const L = this;
        if (id === 'e2') return showActs('校內 DNS 伺服器：', [
          ['查看 DNS 轉送設定', () => showTerm(`<span class="d">校內 DNS › 設定</span>\n  校內網域 yhps.ntpc.edu.tw . : 本機回答\n  其他名稱轉送給 . . . . . . : ${D.e2.cfg.fwd||'（未設定）'}`)],
          ['修改 DNS 轉送', () => showCfg('e2', '校內 DNS 的轉送設定', [{ k: 'fwd', label: '其他名稱轉送給', opts: [SRV + '.54', DNS1, GW] }])],
          ['不處理', () => {}]
        ]);
        if (id === 'l3') return showActs('校端 L3 路由器：', [
          ['查看存取控制規則', () => showTerm(RULEV(D.l3.cfg, L.orig === 'rule'))],
          ['修改存取控制規則', () => showCfg('l3', '存取控制規則：啟用或停用', RULEF)],
          ['重新開機', () => { fails++; say('校端 L3 重開，全校斷線三分鐘。回來之後問題還在。', 'bad') }],
          ['不處理', () => {}]
        ]);
        showActs('教室電腦：', [
          ['nslookup www.google.com', () => { const b = L.bad() === 'dns'; showTerm(`<span class="d">C:\\&gt; nslookup www.google.com</span>\n伺服器:  ${SRV}.53\n` + (b ? '<span class="x">DNS request timed out.\n*** 無法找到 www.google.com</span>' : '<span class="o">名稱:    www.google.com\nAddress: 142.250.196.68</span>')) }],
          ['nslookup 學校首頁', () => showTerm(`<span class="d">C:\\&gt; nslookup www.yhps.ntpc.edu.tw</span>\n伺服器:  ${SRV}.53\n<span class="o">名稱:    www.yhps.ntpc.edu.tw\nAddress: ${SRV}.5</span>`)],
          ['tracert 8.8.8.8', () => showTerm(`<span class="d">C:\\&gt; tracert -d 8.8.8.8</span>\n  1    1 ms   ${GW}\n  2    3 ms   163.20.250.1\n  3    6 ms   163.20.1.254\n  4    8 ms   8.8.8.8\n<span class="o">追蹤完成。</span>`)],
          ['不處理', () => {}]
        ])
      },
      check() {
        const c = this.bad(), ok = !c, H = '從教室電腦開啟網站', x = n => ok ? `<span class="o">${n}：成功</span>` : `<span class="x">${n}：${c==='dns'?'找不到伺服器':'連線逾時'}</span>`;
        const lines = ['<span class="o">學校首頁：成功</span>', x('www.google.com'), x('www.youtube.com')];
        return ok ? { ok: true, head: H, lines: lines.concat(RULENOTE(D.l3.cfg)) } : { ok: false, free: true, head: H, lines, msg: '校外網站還是打不開。點電腦，用 nslookup 看名稱查不查得到，用 tracert 看路通不通。' }
      },
      goals: [['找出校外網站打不開的原因並排除', () => !lvk('t4b').bad()]],
      extra: '先用 nslookup 和 tracert 判斷方向，再到伺服器或校端 L3 處理',
      passMsg: '修好了！校外網站都打得開了。工具 tracert 已經學會。',
      hints: ['學校首頁打得開，代表線路、IP、閘道都正常。問題在 DNS 或存取控制規則。', '點電腦執行 nslookup。查不到名稱，就去校內 DNS 伺服器查看轉送設定，看校外名稱轉送給誰，跟交接筆記比對。', '名稱查得到、tracert 也通，網頁卻打不開，那就是校端 L3 的規則擋住了。查看規則，找出擋掉一般網頁（443）的那一條，只停用它。'],
      learn: ['<strong>只能上部分網站</strong>，代表下面幾層都通，問題在 DNS 或存取控制。', '<strong>nslookup</strong> 分辨是不是名稱查不到；<strong>tracert</strong> 列出沿路每一站，看路通不通。', '名稱查得到、路也通，網頁卻打不開，就往<strong>存取控制規則</strong>查。'],
      tip: '實務經驗：校內查得到、校外查不到，先確認是學校自己的設備，還是上游的問題。ping 教育局的 DNS 不通時，就該打電話給教育網路中心了。',
      see: ['https'],
      home: ['執行 tracert -d 8.8.8.8，看學校對外的路經過哪幾站，第一站是校端 L3，第二站是教育局骨幹。存一份正常時的結果，出事時可以比對。'],
      close() {
        return CLOSE({
          dns: { rc: '校內 DNS 的轉送設定指向一台已經停用的舊主機，校外網址查不到', pv: '舊主機下線前，先檢查 DNS 轉送等設定有沒有指向它，並把變更記錄下來', say: '學校查詢校外網址的設定，還指向一台已經停用的舊主機，已經改成教育局的 DNS' },
          rule: { rc: '校端 L3 的規則 105 擋掉了教學網段對外的加密網頁（443）', pv: '存取控制規則的新增和修改都要記錄原因，改完從教室實際測試常用網站', say: '校端路由器有一條規則誤擋了校外的網站，已經停用' }
        }, this.orig, ['把存取控制規則都改成允許，以後就不會誤擋網站', '請老師遇到打不開的網站，先改用手機查資料', '把教室電腦重灌一次，清掉可能的錯誤設定'], ['教室的網路線接觸不良'])
      }
    },
