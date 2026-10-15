  /* ===== 關卡資料 ===== */
  const LEVELS = [
    /* ===== 序章 ===== */
    {
      key: 'words', no: 39, id: '詞彙', chap: CH0, osi: [], sh: false,
      name: '十個會聽到的字',
      task: '任務：先認識十個接手後一定會聽到的字',
      min: 0, max: 0, s2: 'first', firstLabel: '一次就全部答對', testLabel: '對答案', goalLast: '按下「對答案」',
      idle: '點一個字，這裡會顯示它的白話解釋，再選它最像什麼',
      intro: '廠商、教育網路中心、智慧網管的告警，都會用這十個字跟你說話。不用背定義，先知道每個字在講哪一層、像生活裡的什麼。之後每一關的文字裡，有底線的字都可以點開看解釋。',
      start: '點每一個字，讀一行解釋，再選「它最像什麼」。十個都選好，按「對答案」。',
      devs: (() => { const o = { l3: L3(), core: CORE(), aggr: AGGR('B'), sw: EDGE() }; for (let i = 1; i <= 10; i++) o['e' + i] = WDEV('', ''); return o })(),
      fixed: SWFIX(),
      lay: {
        wide: { W: 900, H: 560, net: { x: 226, y: 44 }, rack: { x: 40, y: 98, w: 372, h: 424 }, pos: { l3: [60, 108], core: [60, 208], aggr: [60, 308], sw: [60, 408], e1: [440, 100], e2: [555, 100], e3: [670, 100], e4: [785, 100], e5: [440, 240], e6: [555, 240], e7: [670, 240], e8: [785, 240], e9: [497, 380], e10: [727, 380] } },
        narrow: { W: 440, H: 1000, net: { x: 220, y: 42 }, rack: { x: 34, y: 98, w: 372, h: 420 }, pos: { l3: [54, 108], core: [54, 208], aggr: [54, 308], sw: [54, 408], e1: [14, 540], e2: [170, 540], e3: [326, 540], e4: [14, 660], e5: [170, 660], e6: [326, 660], e7: [14, 780], e8: [170, 780], e9: [326, 780], e10: [170, 900] } }
      },
      need: [], allow: () => '這一關不用接線。點右邊的字。', noCut: '這一關不用動線。',
      // [字, 白話解釋, 正解比喻, 兩個錯的比喻]
      W: [
        ['光纖', '用光傳資料的線，不怕遠、不怕干擾。本案教室到副控、副控到核心都是它。', '高速公路', ['門牌', '查號台']],
        ['光模組', '插在交換器黃框插槽裡的小盒子，把電變成光。兩端要同一種（本案都是 LR）。', '高速公路兩端的收費站', ['社區大門', '電話簿']],
        ['PoE', '用網路線順便送電，AP 和攝影機不用另外插電。', '電線和網路線合成一條', ['停車場', '門牌']],
        ['VLAN', '把一台交換器切成幾個互不相通的隔間。', '同一棟樓裡的不同辦公室', ['高速公路', '門牌']],
        ['IP 位址', '設備在網路上的門牌，例如 10.213.250.60。', '門牌', ['查號台', '社區大門']],
        ['閘道', '這個網段通往外面的大門，要送到別的網段就交給它。', '社區大門', ['門牌', '電話簿']],
        ['DHCP', '電腦開機時自動幫它領門牌。', '戶政事務所自動發門牌', ['查號台', '保全']],
        ['DNS', '把網址換成 IP。', '查號台', ['門牌', '高速公路']],
        ['告警', '智慧網管偵測到異常時發的通知：離線、IP 衝突、Port Loop。', '警報器', ['地圖', '門牌']],
        ['拓樸圖', '智慧網管自動畫出來的設備連接圖，離線的標紅框。', '地圖', ['警報器', '查號台']]
      ],
      init() {
        const ord = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
        ord.forEach((w, i) => { const d = this.devs['e' + (i + 1)]; d.w = 105; d.row = this.W[w]; d.name = this.W[w][0]; d.sub = ''; d.pick = ''; d.tag = '還沒選' });
        return { cables: [], intro: this.intro }
      },
      onDev(id) {
        const d = D[id], r = d.row;
        if (!r) { say('點右邊的十個字。'); return }
        showTerm(`<span class="d">${r[0]}</span>\n${r[1]}`);
        const opts = shuffle([r[2], ...r[3]]);
        showActs(`${r[0]}最像生活裡的什麼？`, opts.map(o => [o, () => { d.pick = o; d.tag = o.slice(0, 8) }]))
      },
      check() {
        const ids = Object.keys(D).filter(k => k[0] === 'e'), H = '十個字的比喻';
        if (ids.some(id => !D[id].pick)) return { ok: false, free: true, head: H, lines: [], msg: '還有字沒選。每一個都點開來讀。' };
        const ok = id => D[id].pick === D[id].row[2], lines = ids.map(id => `<span class="${ok(id)?'o':'x'}">${D[id].name}：${D[id].pick}${ok(id)?'':'　再想想'}</span>`), bad = ids.find(id => !ok(id));
        return bad ? { ok: false, head: H, lines, msg: `${D[bad].name}：${D[bad].row[1]}` } : { ok: true, head: H, lines }
      },
      goals: [['十個字都選好', () => Object.keys(lvk('words').devs).filter(k => k[0] === 'e').every(id => lvk('words').devs[id].pick)]],
      extra: '先讀解釋再選',
      passMsg: '過關！這十個字之後每一關都會再看到，有底線的字可以隨時點開。',
      hints: ['線路類（光纖、光模組、PoE）像道路；位址類（IP、閘道、DHCP、DNS）像門牌和查號台。', 'VLAN 是隔間，告警是警報器，拓樸圖是地圖。', '每個字點開都有一行白話解釋，照解釋選。'],
      learn: ['<strong>線路類</strong>：光纖是高速公路，光模組是兩端的收費站，PoE 讓一條線同時送電。', '<strong>位址類</strong>：IP 是門牌，閘道是社區大門，DHCP 自動發門牌，DNS 是查號台。', '<strong>管理類</strong>：VLAN 是隔間，告警是警報器，拓樸圖是地圖。之後文字裡有底線的字都可以點開看解釋。'],
      tip: '實務經驗：跟廠商或教育網路中心講電話時聽到不懂的字，直接問「那是哪一層的東西」，對方通常就會用白話解釋。',
      home: ['把這十個字抄在一張卡上，旁邊寫自己學校對應的東西：閘道是哪一台、DNS 是多少、拓樸圖在智慧網管哪裡。']
    },

    {
      key: 'pro', no: 25, id: '序章', chap: CH0, osi: [],
      name: '先問範圍',
      task: '任務：五通報修電話，先去哪裡查？',
      min: 0, max: 0, s2: 'first', testLabel: '對答案', goalLast: '按下「對答案」',
      idle: '點一通來電，這裡會顯示對方說了什麼',
      intro: `歡迎來到新北網管小學堂。你剛接下${SCH.name}資訊組長的工作，早上電話就響個不停。先別急著衝出去。排除故障的第一步，是問清楚「範圍有多大」：一台、一間教室、一整棟，還是全校？範圍決定你該先去哪裡。`,
      start: '點每一通來電，聽對方怎麼說，再決定先去哪裡查。五通都決定好，按「對答案」。',
      devs: { ...RACK4(), e1: WDEV('', ''), e2: WDEV('', ''), e3: WDEV('', ''), e4: WDEV('', ''), e5: WDEV('', '') },
      fixed: SWFIX(), lay: L5, need: [], allow: swAllow,
      C: [
        ['三年二班導師', '「我的電腦不能上網。隔壁班的老師說他們都正常，學生的平板也可以。」', 0, '只有一台壞，其他都正常。問題在那台電腦、它的線，或它插的那一埠。'],
        ['電腦教室老師', '「整間電腦教室三十台都連不上，可是我回辦公室用自己的電腦是好的。」', 1, '一整間教室同時斷、別的地方正常。問題在這間教室共用的東西：教室端交換器和它往副控的那條光纖。'],
        ['教學大樓的主任', '「教學大樓一到三樓都有老師跑來說不能上網。行政大樓這邊倒是沒事。」', 2, '整棟樓都斷、另一棟正常。問題在這棟樓共用的上游：這一棟的副控點交換器和它往核心的光纖。'],
        ['校長室秘書', '「校長說全校都不能上網，各處室都在問。不過印表機和校務系統還能用。」', 3, '全校對外不通，但校內還能用。問題在全校共用的出口：機房的核心、校端 L3 路由器和對教育局的線路。'],
        ['教務處組長', '「網路都正常，YouTube 也能看，就是成績系統打不開，一直轉圈圈。」', 4, '其他網站都正常，只有一個系統打不開。網路沒有斷，問題在那個系統本身。']
      ],
      O: ['那台電腦和它的線', '那間教室的教室端交換器', '那一棟的副控點交換器', '機房的核心與校端 L3', '那個系統的主機'],
      T: ['查那台電腦', '查教室端交換器', '查該棟副控', '查機房', '查那個系統'],
      init() {
        this.ord = shuffle([0, 1, 2, 3, 4]);
        this.ord.forEach((c, i) => { const d = this.devs['e' + (i + 1)]; d.name = this.C[c][0]; d.sub = '來電'; d.call = c; d.pick = -1; d.tag = '還沒決定' });
        return { cables: [], intro: this.intro }
      },
      onDev(id) {
        const d = D[id], c = this.C[d.call];
        if (!c) { say('機房的設備都正常運轉中。先接電話。'); return }
        showTerm(`<span class="d">${c[0]}來電：</span>\n${c[1]}`);
        showActs(`${c[0]}：先去哪裡查？`, this.O.map((o, i) => [o, () => { d.pick = i; d.tag = this.T[i] }]))
      },
      check() {
        const ids = ['e1', 'e2', 'e3', 'e4', 'e5'], H = '五通來電的判斷';
        if (ids.some(id => D[id].pick < 0)) return { ok: false, free: true, head: H, lines: [], msg: '還有來電沒決定。每一通都點開來聽。' };
        const ok = id => D[id].pick === this.C[D[id].call][2],
          lines = ids.map(id => `<span class="${ok(id)?'o':'x'}">${D[id].name}：${this.T[D[id].pick]}${ok(id)?'':'　再想想'}</span>`),
          bad = ids.find(id => !ok(id));
        return bad ? { ok: false, head: H, lines, msg: `${D[bad].name}那一通：${this.C[D[bad].call][3]}` } : { ok: true, head: H, lines }
      },
      goals: [['五通來電都決定好', () => [1, 2, 3, 4, 5].every(i => lvk('pro').devs['e' + i].pick >= 0)]],
      extra: '聽清楚「誰壞了、誰還正常」再決定',
      passMsg: '過關！你已經會用範圍來決定從哪裡查起。',
      hints: ['每一通都注意兩件事：誰不能用，還有誰是正常的。', '壞的範圍越大，問題就在越上游、越多人共用的地方。光纖到班之後，每間教室一台教室端、每棟一台副控、全校一台核心。', '有一通其實不是網路斷線。其他網站都正常，只有某一個系統打不開。'],
      learn: ['排障第一步是<strong>先問範圍</strong>：一台、一間教室、一整棟，還是全校。', '範圍越大，問題越可能在<strong>大家共用的上游</strong>：教室端、副控、核心、校端 L3，一層比一層影響更多人。', '「網路正常，只有某個系統打不開」不是網路問題，要找<strong>那個系統</strong>的管理者。'],
      tip: '實務經驗：接到報修先問兩句：「只有你這樣，還是旁邊的人也這樣？」「什麼時候開始的？」再到智慧網管看那一校的告警卡，常常電話還沒掛就知道在哪一層。',
      home: ['下次接到報修電話，先問三件事：在哪裡、影響幾台、從什麼時候開始。寫在一張小卡上，放在電話旁邊。']
    },

    {
      key: 'tour', no: 26, id: '導覽', chap: CH0, osi: [1, 2, 3, 4, 5],
      name: '校園網路全貌', sh: false,
      task: '任務：跟著封包走一趟校園網路',
      min: 0, max: 0, s2: 'first', firstLabel: '順著路線走，判斷都正確', testLabel: '送出封包', goalLast: '按下「送出封包」',
      idle: '從教室電腦開始，一站一站點到校外網站，再按「送出封包」',
      intro: '接手的第一件事，是看懂光纖到班之後的校園網路長什麼樣子。B 棟 2 樓教室的電腦要打開校外的網站，封包會經過教室端交換器、該棟副控、核心、校端 L3 路由器，再經教育局教育網路中心出去。沿路每一台屬於哪一層、負責什麼、壞了會怎樣、該找誰修，你都要知道。',
      start: '點「教室電腦」開始。之後順著線往上游走，一站一站點下一台設備，直到校外網站。',
      devs: (() => {
        const t = TREE();
        t.l3.tap = t.core.tap = true;
        const ghost = { dx: 50, dy: 48, label: '', ghost: true };
        return Object.assign(t, {
          e1: DESK('教室電腦', 'B 棟 2F'),
          e4: Object.assign(BOX('對外線路', '學校 ↔ 教育局'), { ports: { i: Object.assign({}, ghost, { dx: 0 }), o: Object.assign({}, ghost, { dx: 100 }) } }),
          e2: Object.assign(BOX('教育網路中心', 'TANet'), { ports: { i: Object.assign({}, ghost, { dx: 0 }), o: Object.assign({}, ghost, { dx: 100 }) } }),
          e3: Object.assign(DEST('校外網站', '別人的伺服器'), { tag: null, ports: { i: Object.assign({}, ghost, { dx: 0 }) } })
        })
      })(),
      fixed: [UPLINK, ...[['l3.s1', 'core.s1'], ['core.s2', 'da.up'], ['core.s3', 'db.up'], ['da.d1', 'a1.up'], ['da.d2', 'a2.up'], ['db.d1', 'b1.up'], ['db.d2', 'b2.up'], ['b2.x', 'e1.p']].map(c => ({ a: c[0], b: c[1], cls: 'fixed', occupy: true, msg: '這一關不用動線。點設備，看它在做什麼。' })),
        { a: 'net', b: 'e4.i', cls: 'wall' }, { a: 'e4.o', b: 'e2.i', cls: 'wall' }, { a: 'e2.o', b: 'e3.i', cls: 'wall' }],
      lay: {
        wide: { W: 900, H: 680, net: { x: 226, y: 44 }, rack: { x: 40, y: 98, w: 372, h: 424 }, pos: { l3: [60, 122], core: [60, 262], da: [450, 120], db: [450, 330], a1: [740, 70], a2: [740, 176], b1: [740, 300], b2: [740, 406], e1: [760, 540], e4: [330, 0], e2: [470, 0], e3: [610, 0] } },
        narrow: { W: 440, H: 870, net: { x: 220, y: 42 }, rack: { x: 34, y: 230, w: 372, h: 214 }, pos: { l3: [54, 240], core: [54, 344], da: [4, 476], db: [226, 476], a1: [6, 608], a2: [114, 608], b1: [226, 608], b2: [334, 608], e1: [318, 740], e4: [6, 100], e2: [214, 100], e3: [334, 100] } }
      },
      zones: { wide: [[450, 250, '副控點：每棟一台'], [740, 56, '教室端：每間教室一台']], narrow: [[4, 760, '副控點：每棟一台'], [4, 784, '教室端：每間教室一台']] },
      need: [], allow: () => '這一關不用接線。點設備，看它在做什麼。', noCut: '這一關不用動線。點設備，看它在做什麼。',
      O: WHO_OPTS,
      // [設備, 層, 負責什麼, 壞了的症狀, 情況, 該找誰（O 的索引）, 說明]
      R: [
        ['e1', 'L1–L7（終端設備）', '封包從這裡出發。應用程式產生資料，一層一層包好，從網路孔送出去。', '只有這一台不能上網，旁邊的電腦都正常。', '這台電腦的 IP 被人手動改錯了。', 0, '電腦的設定、網路線、重開機，資訊組長自己就能處理。'],
        ['b2', 'L2 教室端交換器', '每間教室一台 ECS4125-10PL，8 埠 2.5G PoE 接電腦與 AP，10G 光纖上行回該棟副控。', '同一間教室的電腦和 AP 一起斷線。', '教室端交換器被雨水滲入壁掛箱，整台不亮。', 1, '光纖到班案的設備在 5 年保固內，由光纖到班維護廠商到校更換。'],
        ['db', 'L2／L3 副控點交換器', '每棟一台 CRS326，收容該棟教室端的 10G 光纖，也是這一棟子網路的路由邊界。', '整棟樓都不能上網，其他棟正常。', '副控點交換器兩組電源其中一組跳電，另一組原本就沒接。', 1, '副控點交換器屬光纖到班案設備，電源迴路的接法要請光纖到班維護廠商依施工計畫書改正。'],
        ['core', 'L2／L3 核心光纖交換器', '全校的交通樞紐 CRS518，各棟副控的光纖都集中到這裡，再以 10G 介接校端 L3 路由器。', '全校都有狀況，連校內跨棟的校務系統也打不開。', '核心交換器的 RouterOS 版本被人手動升級到測試通道後異常重開。', 1, '核心交換器的韌體基線由光纖到班維護廠商管理，由他們回復到長期支援版本。'],
        ['l3', 'L3 校端 L3 路由器', '既有的 Juniper EX3400，各網段的閘道、DHCP 與對教育局的路由都在它身上，光纖到班案不更換它。', '校內各網段互連正常，全校連不出去；或 DHCP 領不到。', '校端 L3 路由器當機，所有燈都不亮。', 3, '校端 L3 路由器不在光纖到班案範圍，由教育局既有網路維護廠商處理。'],
        ['e4', 'L1 對外線路', '學校連到教育局教育網路中心的線路，接在校端 L3 路由器的對外埠。', '全校都連不出去，校端 L3 對外埠的連線燈不亮。', '學校對外的光纖被道路施工挖斷，對外埠的燈全暗。', 2, '對外線路由教育局統籌，通報教育網路中心派工。'],
        ['e2', 'L3 教育網路中心', '教育局教育網路中心。各校的對外線路接到這裡，再連上臺灣學術網路（TANet）和網際網路。', 'ping 學校閘道會通，再往外全部不通，鄰近的學校也一樣。', 'tracert 顯示封包離開校端 L3 之後就斷了。', 2, '出了學校就不是學校的設備，打電話給教育網路中心報修，並附上 ping 與 tracert 結果。'],
        ['e3', 'L7 應用層', '封包的目的地。網站的伺服器在別人的機房，由對方管理。', '只有這個網站打不開，其他網站都正常。', '一個線上教學平臺今天整個掛了，新聞也有報。', 4, '不是學校的設備，學校修不了。通知老師先改用別的方式，等對方修好。']
      ],
      init() {
        const w = WHO_OPTS, sp_ = SCHOOL.split;
        this.hints = [this.H[0], this.H[1], `看「情況」決定找誰：電腦設定自己處理；教室端、副控、核心屬光纖到班案設備找光纖到班維護廠商；校端 L3 路由器當機${w[sp_.core]}；學校對外線路斷了${w[sp_.fiber]}；出了學校之後斷線找教育網路中心；別人的網站不是學校的設備。`];
        this.step = 0;
        for (const r of this.R) {
          const d = this.devs[r[0]];
          d.who = -1;
          if (d.sub0 == null) d.sub0 = d.sub;
          d.subfn = () => d.who < 0 ? d.sub0 : r[1].split(/[ （]/)[0] + ' · ' + ['自己修', '找光纖到班廠商', '找教網', '找既有廠商', '不是學校的'][d.who]
        }
        return { cables: [], intro: this.intro }
      },
      onDev(id) {
        const L = this, i = L.R.findIndex(r => r[0] === id), d = D[id];
        if (i < 0) { fails++; say(`${d.name}${id==='b1'?'在 B 棟 1 樓':'在 A 棟'}，封包從 B 棟 2 樓出發，不會經過這裡。順著教室電腦的線往上游走。`, 'bad'); return }
        if (i > L.step) { fails++; say(`封包還沒走到${d.name}。現在它在「${D[L.R[L.step-1]?L.R[L.step-1][0]:'e1'].name}」，順著線找下一站。`, 'bad'); return }
        if (i === L.step) L.step++;
        const r = L.R[i];
        showTerm(`<span class="d">第 ${i+1} 站：${d.name}</span>\n  屬於 . . . : ${r[1]}\n  負責 . . . : ${r[2]}\n  壞了的症狀 : ${r[3]}\n\n<span class="d">情況：</span>${r[4]}`);
        showActs(`${d.name}：這個情況找誰處理？`, L.O.map((o, j) => [o, () => { d.who = j }]))
      },
      check() {
        const H = '封包的路線', R = this.R;
        if (this.step < R.length) return { ok: false, free: true, head: H, lines: [], msg: `封包還沒走到終點，才走了 ${this.step} 站。順著線一站一站點到校外網站。` };
        if (R.some(r => D[r[0]].who < 0)) return { ok: false, free: true, head: H, lines: [], msg: '還有設備沒決定「這個情況找誰處理」。點它再選一次。' };
        const ok = r => D[r[0]].who === this.ans(r),
          lines = R.map((r, i) => `<span class="${ok(r)?'o':'x'}">${i+1}. ${D[r[0]].name}（${r[1].split(/[ （]/)[0]}）：${this.O[D[r[0]].who]}${ok(r)?'':'　再想想'}</span>`),
          bad = R.find(r => !ok(r));
        return bad ? { ok: false, head: H, lines, msg: `${D[bad[0]].name}：${this.ans(bad)===bad[5]?bad[6]:`本班講師設定的分工是「${this.O[this.ans(bad)]}」。${this.E[this.ans(bad)]}`}` } : { ok: true, head: H, lines }
      },
      // 對外線路、新核心、校端 L3 各找誰，依班級的維護分工（SCHOOL.split）；其他站固定
      ans(r) { const k = { e4: 'fiber', core: 'fw', l3: 'core' }[r[0]]; return k ? SCHOOL.split[k] : r[5] },
      E: ['校內的事，資訊組長自己就能處理。', '光纖到班案的設備與線路在保固內，請光纖到班維護廠商處理。', '這由教育局教育網路中心處理。', '校端 L3 路由器與既有設備由教育局既有網路維護廠商處理。', '不是學校的設備，等對方修好。'],
      goals: [['封包走到校外網站', () => lvk('tour').step >= lvk('tour').R.length], ['每一站都決定找誰處理', () => lvk('tour').R.every(r => lvk('tour').devs[r[0]].who >= 0)]],
      extra: '順著線一站一站走，先看「情況」再決定找誰',
      passMsg: '過關！你已經看過整個校園網路，也知道每一段壞了該找誰。',
      H: ['從教室電腦開始，順著它的網路線往上游走：下一站是它插的那台教室端交換器。A 棟的設備不會經過。', '路線是：教室電腦 → B 棟 2F 教室端 → B 棟副控 → 核心 → 校端 L3 → 對外線路 → 教育網路中心 → 校外網站。'],
      hints: [],
      learn: ['光纖到班之後的校園網路：<strong>教室電腦 → 教室端交換器（每間教室）→ 副控點交換器（每棟）→ 核心光纖交換器 → 校端 L3 路由器 → 教育局教育網路中心</strong> → 網際網路。', '越上游的設備，壞了影響的範圍越大。從症狀的<strong>範圍</strong>就猜得出是哪一站。', '新北的分工：教室端、副控、核心與光纖線路找<strong>光纖到班維護廠商</strong>；校端 L3 路由器與既有設備找<strong>既有網路維護廠商</strong>；對外線路與出了學校之後找<strong>教育網路中心</strong>。'],
      tip: '實務經驗：把三個報修窗口的電話和保固到期日貼在機櫃上。光纖到班案設備保固 5 年自總驗收合格日起算，到期前要重新確認窗口。',
      see: ['backup'],
      home: ['畫一張自己學校的簡圖：對外線路接到哪一台、核心交換器在哪個機櫃、每棟的副控點在哪一層樓。畫不出來的地方，到智慧網管的拓樸圖對一次。', '找出光纖到班維護廠商、既有網路維護廠商和教育網路中心的報修電話，貼在機櫃上。']
    },

    {
      key: 'rack', no: 27, id: '機房', chap: CH0, osi: [1],
      name: '認識你的機房', sh: false,
      task: '任務：認出機櫃裡每一台設備的角色',
      min: 0, max: 0, s2: 'first', firstLabel: '一次就全部認對', testLabel: '對答案', goalLast: '按下「對答案」',
      idle: '點機櫃裡的設備，看它的標籤和面板，判斷它的角色',
      intro: `光纖到班完工後，${SCH.name}的主機櫃多了幾台新設備，標籤都貼好了：${SCH.abbr}-L3、${SCH.abbr}-CORE、${SCH.abbr}-L2-01、${SCH.abbr}-RADAR。新北的設備命名是「學校縮寫、角色或層級、流水號」，和智慧網管拓樸圖上的名字一樣。先認出每一台是誰，之後報修才說得清楚。`,
      start: '點機櫃裡的每一台設備，從標籤、面板埠位和品牌判斷它的角色。四台都決定好，按「對答案」。',
      devs: (() => {
        const l3 = L3(), core = CORE(), old = OLDAGG(), radar = RADAR();
        [l3, core, old, radar].forEach(d => { d.tap = true; d.name0 = d.name; d.name = '？'; d.tag = null });
        return { l3, core, old, radar }
      })(),
      fixed: [UPLINK, L3CORE(), { a: 'l3.g1', b: 'old.p1', cls: 'fixed', occupy: true, msg: '既有匯聚交換器的上行，不用動。' }, { a: 'old.p6', b: 'radar.p', cls: 'fixed', occupy: true, msg: '雷達主機接在既有交換器上，不用動。' }],
      lay: {
        wide: { W: 900, H: 560, net: { x: 226, y: 44 }, rack: { x: 40, y: 98, w: 372, h: 440 }, pos: { l3: [60, 112], core: [60, 212], old: [60, 312], radar: [60, 410] } },
        narrow: { W: 440, H: 560, net: { x: 220, y: 42 }, rack: { x: 34, y: 98, w: 372, h: 440 }, pos: { l3: [54, 112], core: [54, 212], old: [54, 312], radar: [54, 410] } }
      },
      zones: { wide: [[460, 120, '判斷依據：'], [460, 146, '標籤 L3 ＝校端路由器、CORE ＝核心、L2-nn ＝既有匯聚'], [460, 172, '面板：SFP28／QSFP28 是新核心；ge 埠加 SFP+ 是 Juniper'], [460, 198, 'RADAR ＝雷達，一校一台']], narrow: [] },
      need: [], allow: () => '這一關不用接線。點設備判斷角色。', noCut: '這一關不用動線。',
      ROLES: ['校端 L3 路由器（既有 Juniper）', '核心光纖交換器（新案 CRS518）', '既有匯聚交換器（D-Link）', '雷達（測速與校內偵測）'],
      ANS: { l3: 0, core: 1, old: 2, radar: 3 },
      init() {
        for (const id in this.devs) { const d = this.devs[id]; d.pick = -1; d.name = '？'; d.subfn = () => d.pick < 0 ? d.sub : this.ROLES[d.pick].split('（')[0] + ' · ' + d.sub.split(' · ')[1] }
        return { cables: [], intro: this.intro }
      },
      onDev(id) {
        const d = D[id];
        showTerm(`<span class="d">設備標籤：</span>${d.sub.split(' · ')[1]}（${d.sub.split(' · ')[0]}）\n<span class="d">面板：</span>${id==='l3'?'1 個對外 SFP+、2 個 SFP+、24 個 RJ45（畫面畫 4 個）':id==='core'?'16 個 SFP28、2 個 QSFP28，雙電源':id==='old'?'48 個 RJ45 PoE、4 個 SFP+（畫面畫 6＋2）':'1 個 RJ45，主機上貼著教育局測速主機標籤'}`);
        showActs(`${d.sub.split(' · ')[1]}：它的角色是？`, this.ROLES.map((o, i) => [o, () => { d.pick = i }]))
      },
      check() {
        const ids = ['l3', 'core', 'old', 'radar'], H = '機櫃設備的角色';
        if (ids.some(id => D[id].pick < 0)) return { ok: false, free: true, head: H, lines: [], msg: '還有設備沒判斷。四台都要點。' };
        const ok = id => D[id].pick === this.ANS[id],
          lines = ids.map(id => `<span class="${ok(id)?'o':'x'}">${D[id].sub.split(' · ')[1]}：${this.ROLES[D[id].pick]}${ok(id)?'':'　再想想'}</span>`),
          bad = ids.find(id => !ok(id));
        if (!bad) { ids.forEach(id => { D[id].name = D[id].name0 }); build() }
        return bad ? { ok: false, head: H, lines, msg: { l3: '標籤 L3 代表校端 L3 路由器，面板是 Juniper 的 ge 埠加 SFP+。它是既有設備，光纖到班案不更換。', core: '標籤 CORE、面板全是 SFP28 與 QSFP28、雙電源，是新案的核心光纖交換器。', old: '標籤 L2-01 是既有匯聚交換器的命名，D-Link 48 埠 PoE。它還在服務未施作的區域。', radar: 'RADAR 是雷達，教室電腦用瀏覽器就能測到它。' }[bad] } : { ok: true, head: H, lines }
      },
      goals: [['四台設備都判斷完', () => ['l3', 'core', 'old', 'radar'].every(id => lvk('rack').devs[id].pick >= 0)]],
      extra: '先看標籤，再看面板埠位',
      passMsg: '過關！機櫃裡每一台設備你都叫得出名字了。',
      hints: ['標籤的第二段就是角色：L3 是校端路由器、CORE 是核心、L2 是既有匯聚、RADAR 是雷達（測速與校內偵測）。', '看面板：新核心全是 SFP28 光纖埠；Juniper 有 ge 開頭的 RJ45 埠；D-Link 是 48 埠 PoE。', '雷達主機只有一個 RJ45，接在既有交換器上。'],
      learn: ['新北的設備命名是<strong>學校縮寫-角色或層級-流水號</strong>，智慧網管拓樸圖、報修單、盤點表都用同一套名字。', '光纖到班完工後機櫃裡會並存<strong>既有設備</strong>（校端 L3、D-Link 匯聚）和<strong>新案設備</strong>（核心、副控、教室端），保固與報修窗口不同。', '雷達是每校一台的<strong>校內測速與偵測主機</strong>，教室電腦可以用瀏覽器連它測速；交換器之間的鏈路由資產管理平台逐段測速。'],
      tip: '實務經驗：報修時先說設備名稱和 IP，例如「YHPS-AGG-B 10.226.250.12 離線」，教育網路中心和廠商一聽就知道在哪一層。',
      see: ['naming'],
      home: ['到機櫃前把每一台設備的標籤抄下來，對照智慧網管「網路架構」裡的名字，不一樣的記下來請維護廠商更正。']
    },
