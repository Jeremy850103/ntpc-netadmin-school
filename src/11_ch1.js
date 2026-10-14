    /* ===== 第一章 光纖到班（L1） ===== */
    {
      key: '1-1', no: 0, id: '1-1', chap: CH1,
      name: '第一條線',
      task: '任務：讓教室電腦上網',
      min: 2, max: 3,
      intro: `${SCH.name}B 棟 2 樓教室今天完工，壁掛箱裡裝好一台教室端交換器，走廊機櫃有這一棟的副控點交換器。設備都開機了，但還沒有人接線，導師說教室電腦不能上網。`,
      start: '從任一個連接埠按住拖到另一個連接埠，就能拉線。先在選單選線材：電腦用網路線，教室端往副控用光纖。點一下線，再按「拔掉這條線」可以拔掉。',
      kinds: FIBER_UTP_KINDS,
      devs: { aggr: AGGR('B'), sw: EDGE(), pc: PC() },
      fixed: [{ a: 'net', b: 'aggr.s1', cls: 'fiber', occupy: true, msg: '這條是副控往核心、再回校端 L3 與教育局的上行光纖，已經接好了，別動它！' }],
      need: ['sw'],
      zones: { wide: [[40, 236, 'B 棟 2F 教室壁掛箱'], [40, 390, '教室']], narrow: [[14, 236, 'B 棟 2F 教室壁掛箱'], [14, 400, '教室']] },
      lay: {
        wide: { W: 900, H: 540, net: { x: 610, y: 44 }, rack: { x: 470, y: 98, w: 372, h: 200 }, pos: { aggr: [490, 150], sw: [40, 246], pc: [110, 400] } },
        narrow: { W: 440, H: 700, net: { x: 220, y: 42 }, rack: { x: 34, y: 98, w: 372, h: 130 }, pos: { aggr: [54, 118], sw: [54, 250], pc: [145, 520] } }
      },
      goals: [['電腦接上教室端交換器', s => s.link('pc', 'sw')], ['教室端交換器往上接到副控', s => s.link('sw', 'aggr')]],
      allow: () => null,
      almost: '通了，不過電腦沒有經過教室端交換器。教室還有 AP 和其他設備要接，請改成透過教室端交換器。',
      diagnose: s => !s.cabled('pc') ? '電腦的網路孔是空的，連線燈沒亮。封包連電腦都出不去。' : !s.link('pc', 'sw') ? '電腦的線沒有接到教室端交換器。' : '電腦有連到教室端交換器（燈有亮），但教室端沒有光纖往上接到副控，封包走到教室端就沒路了。',
      hints: ['先看教室電腦：它下方有一個「網路孔」，選「Cat6 網路線」，拉到教室端交換器任一個 P 埠。', '教室端交換器只是把教室的設備接在一起，自己不會上網。選「OS2 單模光纖」，從它黃框的 S1 拉到副控的任一個空 S 埠。', '副控的 S1 是往核心的上行，已經接好了。教室端的光纖接在 S2 到 S6 任一個。'],
      learn: ['<strong>教室端交換器</strong>把同一間教室的設備接在一起，8 個 2.5G PoE 埠不分順序，插哪一埠都可以。', '<strong>副控點交換器</strong>收容該棟每一間教室的 10G 光纖，再往上接核心。', '<strong>連線燈</strong>亮了只代表這條線兩端有通，不代表能上網。'],
      tip: '實務經驗：有人報修「不能上網」，先看電腦網路孔和教室端那一埠的燈，再看教室端 S1 的光纖燈，一層一層往上查。',
      home: ['找一間完工的教室，看壁掛箱裡教室端交換器的 P 埠燈和 S1 光纖燈。兩邊都亮、有在閃，代表線是通的、有資料在跑。'],
      extra: '多接的線沒有用處，還可能造成迴圈'
    },

    {
      key: '1-2', no: 1, id: '1-2', chap: CH1,
      name: '跟著點位編號走',
      task: '任務：接通 B2-03 教室',
      min: 3, max: 4,
      intro: '真實的教室裡，光纖不是直接從教室端交換器拉到副控。每間教室有一條 4 芯皮纜埋在管路裡，教室這頭收在壁掛收容盒，走廊那頭收在副控機櫃的光纖終端箱，兩頭貼著同一個點位編號。B2-03 教室今天要開通。',
      start: '教室在左邊，副控機櫃在右邊。收容盒貼著黃色標籤 B2-03，到終端箱找同一個編號。光纖跳線兩端的 LR 模組都已經裝好。',
      kinds: { utp: { name: 'Cat6 網路線', max: 100, far: '100 公尺', cost: '$', media: 'rj' }, jump: { name: 'LC 光纖跳線', note: 'LR 模組已裝', far: '盒到機櫃', max: 10000, cost: '', media: 'sfp', direct: true, sw: 'lr' } },
      devs: {
        aggr: AGGR('B'),
        term: {
          name: '光纖終端箱', sub: '每一埠通往一間教室的壁掛收容盒', kind: 'rack', passive: true, w: 332, h: 76,
          ports: (() => { const o = {}; for (let i = 1; i <= 8; i++) { const n = 'B2-0' + i; o['b20' + i] = { dx: 34 + (i - 1) * 36, dy: 44, label: n, sticker: true, media: 'sfp' } } return o })()
        },
        box: { name: '壁掛收容盒', kind: 'jack', passive: true, still: true, w: 110, h: 100, ports: { p: { dx: 55, dy: 46, label: 'B2-03', sticker: true, media: 'sfp' } } },
        sw: EDGE(),
        pc: PC()
      },
      fixed: [{ a: 'net', b: 'aggr.s1', cls: 'fiber', occupy: true, msg: '這條是副控往核心的上行光纖，已經接好了，不用動它。' }, { a: 'box.p', b: 'term.b203', cls: 'wall', hidden: true }],
      need: ['box', 'term', 'sw'],
      zones: { wide: [[40, 112, 'B 棟 2F 教室 B2-03'], [40, 276, '管路內 4 芯皮纜（2 芯在線、2 芯備援），通往副控機櫃終端箱']], narrow: [[14, 446, '教室 B2-03'], [14, 586, '管路內 4 芯皮纜，通往終端箱']] },
      lay: {
        wide: { W: 900, H: 560, net: { x: 610, y: 44 }, rack: { x: 470, y: 98, w: 372, h: 320 }, pos: { aggr: [490, 112], term: [490, 226], box: [60, 150], sw: [40, 300], pc: [190, 430] } },
        narrow: { W: 440, H: 760, net: { x: 220, y: 42 }, rack: { x: 34, y: 98, w: 372, h: 230 }, pos: { aggr: [54, 110], term: [54, 226], box: [40, 466], sw: [54, 350], pc: [250, 600] } }
      },
      goals: [['電腦接上教室端交換器', s => s.link('pc', 'sw')], ['教室端 S1 跳線到收容盒 B2-03', s => s.link('sw', 'box')], ['終端箱 B2-03 跳線到副控', s => s.plink('term.b203', 'aggr')]],
      allow: (a, b) => {
        const d = [a.split('.')[0], b.split('.')[0]], room = x => x === 'pc' || x === 'box' || x === 'sw';
        if (room(d[0]) !== room(d[1])) return '教室和副控機櫃隔著走廊與管路，跳線拉不過去。教室端交換器要接牆上的壁掛收容盒。';
        return null
      },
      almost: '通了，不過沒有經過教室端交換器。',
      diagnose: s => {
        if (!s.link('pc', 'sw')) return '電腦還沒接上教室端交換器。';
        if (!s.link('sw', 'box')) return '教室端交換器的 S1 還沒用跳線接到壁掛收容盒。';
        const wrong = s.cables.map(c => [c.a, c.b]).flat().find(k => k.startsWith('term.') && k !== 'term.b203');
        if (!s.used('term.b203')) return wrong ? `光訊號順著皮纜到了終端箱 B2-03，但那一埠是空的。你把跳線插在 ${wrong.slice(5).toUpperCase().replace('B20','B2-0')}，那是通往另一間教室的芯。` : '光訊號到了終端箱 B2-03，但那一埠沒有跳線接到副控。';
        return '終端箱 B2-03 的跳線沒有接到副控，封包走不到核心。'
      },
      hints: ['先用 Cat6 網路線把電腦接到教室端交換器任一個 P 埠。', '選「LC 光纖跳線」，從教室端的 S1 拉到壁掛收容盒的 B2-03。皮纜另一頭在終端箱上，貼著一樣的編號。', '終端箱本身不會傳資料，它只是皮纜的出口。從終端箱 B2-03 拉一條跳線到副控任一個空的 S 埠。'],
      learn: ['<strong>壁掛收容盒</strong>和<strong>光纖終端箱</strong>是同一條 4 芯皮纜的兩頭，靠相同的點位編號對應。', '每間教室 <strong>2 芯在線、2 芯備援</strong>；在線芯斷了，把兩頭的跳線改插備援芯就能恢復。', '<strong>點位編號與跳線資料表</strong>是光纖到班的地圖。廠商施工後會交付各校的機櫃跳線資料表與點位編號表，要收好。'],
      tip: '實務經驗：接手時先確認終端箱標籤和教室收容盒對不對得上，並和竣工檔的點位編號表核對。日後報修，一看編號就知道去哪一埠查。',
      home: ['挑一間完工教室，記下壁掛收容盒的點位編號，到副控機櫃的終端箱找同一個編號，確認對得上。只看不拔。'],
      extra: '多出來的跳線會占用副控的埠，日後也難追查'
    },

    {
      key: '1-3', no: 2, id: '1-3', chap: CH1,
      name: '選對模組',
      task: '任務：把新核心接回校端 L3 和兩棟副控',
      min: 3, max: 4,
      intro: '主機房換上新的核心光纖交換器。它要接三個對象：同一個機櫃裡的校端 L3 路由器、180 公尺外教學大樓的副控、650 公尺外活動中心的副控。同機櫃用 DAC 直連線最省；跨棟一律走 OS2 單模光纖配 10GBASE-LR 模組，這是本案的規格。多模光纖雖然 300 公尺內也會通，但本案不佈多模。',
      start: '先在選單選線材或模組。DAC 自帶接頭，直接插兩端空的 SFP+ 插槽；光纖要先在兩端插槽裝模組再拉線，模組要和光纖同一種。',
      kinds: {
        dac: { name: '10G DAC 直連線', max: 3, far: '3 公尺', cost: '$', media: 'sfp', direct: true },
        smf: { name: 'OS2 單模光纖', max: 10000, far: '10 公里', cost: '$$', media: 'sfp' },
        mmf: { name: 'OM3 多模光纖', max: 300, far: '300 公尺', cost: '$$', media: 'sfp' },
        lr: { name: '10GBASE-LR 單模模組', mod: 'smf', sw: 'lr', note: '裝在 SFP+ 插槽', cost: '$$' },
        sr: { name: '10GBASE-SR 多模模組', mod: 'mmf', sw: 'sr', note: '裝在 SFP+ 插槽', cost: '$' }
      },
      devs: (() => {
        const l3 = L3(); l3.dist = 1;
        const agg = (n, sub, dist) => ({ name: n, sub, dist, kind: 'box', bridge: true, still: true, w: 200, h: 100, ports: { sfp: { dx: 100, dy: 64, label: '上行 SFP+', media: 'sfp' } } });
        return { l3, core: CORE(), b1: agg('教學大樓副控', '距離主機房 180 公尺', 180), b2: agg('活動中心副控', '距離主機房 650 公尺', 650) }
      })(),
      fixed: [UPLINK],
      sources: ['b1', 'b2'],
      testHead: '從兩棟副控各 ping 8.8.8.8', idle: '按「測試連線」會從兩棟副控各 ping 8.8.8.8',
      need: [],
      zones: { wide: [[40, 86, '主機房機櫃：校端 L3 和新核心在同一櫃，相距 1 公尺']], narrow: [[14, 86, '主機房機櫃：L3 與核心相距 1 公尺']] },
      lay: {
        wide: { W: 900, H: 540, net: { x: 226, y: 44 }, rack: { x: 40, y: 98, w: 372, h: 424 }, pos: { l3: [60, 122], core: [60, 262], b1: [650, 160], b2: [650, 320] } },
        narrow: { W: 440, H: 690, net: { x: 220, y: 42 }, rack: { x: 34, y: 98, w: 372, h: 214 }, pos: { l3: [54, 108], core: [54, 212], b1: [120, 380], b2: [120, 520] } }
      },
      goals: [['新核心接回校端 L3 路由器', s => s.link('core', 'l3')], ['教學大樓副控接回核心', s => s.link('b1', 'core')], ['活動中心副控接回核心', s => s.link('b2', 'core')]],
      allow: (a, b) => {
        const d = [a.split('.')[0], b.split('.')[0]];
        if (d.includes('l3') && d.includes('core')) return null;
        return d.includes('core') && d.some(x => x[0] === 'b') ? null : '每一棟副控都要各自接回主機房的核心，核心再接校端 L3。副控之間、副控直接接 L3 都不是本案的架構。'
      },
      thrifty: cs => cs.every(c => { const d = D[dv(c.a)].dist || D[dv(c.b)].dist || 0; return c.type === (d <= 3 ? 'dac' : 'smf') }),
      s2label: '同機櫃用 DAC、跨棟用單模，沒有大材小用也沒有用到多模',
      extra: '同機櫃用單模光纖也會通，只是多花兩顆模組；跨棟用多模不符本案規格',
      passMsg: '過關！新核心接好校端 L3 和兩棟副控了。',
      failMsg: '還有副控沒通到校端 L3。先確認核心和 L3 之間有接，再看各棟的光纖和模組。',
      hints: ['校端 L3 和核心在同一個機櫃，相距 1 公尺。選「10G DAC 直連線」，直接從 L3 的 SFP+1 拉到核心任一個 S 埠，不用裝模組。', '跨棟要用光纖。先選「10GBASE-LR 單模模組」，點核心和那棟副控的 SFP+ 插槽各裝一顆，再選「OS2 單模光纖」拉線。裝錯的模組再點一次可以拔掉。', '教學大樓 180 公尺雖然多模也到得了，但本案規格是全校 OS2 單模配 LR 模組。活動中心 650 公尺更只能用單模。'],
      learn: ['<strong>DAC 直連線</strong>自帶接頭、不用模組，適合同一機櫃 3 公尺內的 10G 介接。邀標書第 30 條允許核心與校端 L3 用 SFP+ 光纖模組或 DAC 介接。', '<strong>OS2 單模光纖＋10GBASE-LR 模組</strong>（1310 nm、10 公里）是本案三層共用的規格，核心、副控、教室端都用同一型號模組。', '<strong>兩端的模組和中間的光纖，三個要同一種</strong>。單模配 LR、多模配 SR，混用連線燈不會亮。'],
      tip: '實務經驗：跨棟線路不通時，先確認兩端模組型號是不是同一種（本案都應該是 LR），再看光纖有沒有被折到或被施工挖斷。模組上的標籤 LR 是單模、SR 是多模。',
      home: ['到主機房看新核心，數數有幾條光纖、幾條 DAC，各自通往哪一棟。看得到光模組的話，記下上面的型號。']
    },

    {
      key: '1-4', no: 3, id: '1-4', chap: CH1,
      name: 'PoE 預算 120 瓦',
      task: '任務：用教室端交換器的 PoE 幫設備送電',
      min: 6, max: 7, s2: 'first',
      intro: '一間專科教室的天花板要裝兩台 Wi-Fi 6 無線 AP，走廊要裝可轉動的攝影機，講台要裝 IP 電話，牆上要掛 86 吋數位看板。教室端交換器 ECS4125-10PL 的 8 個埠都能供電，但每一埠最多 {P} W（802.3at），整台的 PoE 總預算是 {W} W。設備加起來超過了，你得決定怎麼分配。',
      start: '橘框的 P1 到 P6 都是 PoE 供電埠。設備右上角的電源燈亮起，代表有拿到電。點一下設備可以看附近有沒有插座。',
      budget: 120, perPort: 30,
      testHead: '從六台設備各 ping 8.8.8.8', idle: '按「測試連線」會從六台設備各 ping 8.8.8.8',
      devs: {
        aggr: AGGR('B'),
        sw: EDGE('教室端交換器', 'ECS4125-10PL · 120 W'),
        ap1: { name: 'Wi-Fi 6 AP 甲', sub: '天花板，需要 26 W（802.3at）', need: 26, kind: 'ap', still: true, w: 200, h: 96, ports: { p: { dx: 156, dy: 60, label: 'PoE 入' } } },
        ap2: { name: 'Wi-Fi 6 AP 乙', sub: '天花板，需要 26 W（802.3at）', need: 26, kind: 'ap', still: true, w: 200, h: 96, ports: { p: { dx: 156, dy: 60, label: 'PoE 入' } } },
        cam: { name: '走廊攝影機', sub: '可轉動，需要 30 W', need: 30, kind: 'box', still: true, w: 200, h: 96, ports: { p: { dx: 156, dy: 60, label: 'PoE 入' } } },
        phone: { name: 'IP 電話', sub: '講台，需要 7 W', need: 7, kind: 'box', still: true, w: 200, h: 96, ports: { p: { dx: 156, dy: 60, label: 'PoE 入' } } },
        sign: { name: '86 吋數位看板', sub: '牆上，需要 60 W', need: 60, kind: 'box', still: true, w: 200, h: 96, ports: { p: { dx: 156, dy: 60, label: 'PoE 入' } } },
        pc: PC()
      },
      fixed: [{ a: 'net', b: 'aggr.s1', cls: 'fiber', occupy: true, msg: '這條是副控往核心的上行光纖，不用動它。' }, { a: 'aggr.s2', b: 'sw.s1', cls: 'fixed', occupy: true, msg: '這條是教室端往副控的 10G 上行光纖，已經接好了，不用動它。' }],
      sources: ['ap1', 'ap2', 'cam', 'phone', 'sign', 'pc'],
      need: [],
      // 看板一定要插座（60 W 超過單埠上限）；攝影機或電話其中一台旁邊也有插座，總預算剛好夠其他三台
      init() {
        const D0 = this.devs, o = this.outlet = ['cam', 'phone'][Math.floor(rnd() * 2)], base = 89 - D0[o].need;
        this.budget = Math.ceil(base / 5) * 5;
        this.hints = ['電腦自己有插電，不需要 PoE。看板需要 60 W，超過單埠 30 W 的上限，不管插哪一埠都供不了電，點它改用自己的插座。', `看線材列旁邊的供電瓦數。兩台 AP、攝影機、電話加起來要 89 W，交換器只能供 ${this.budget} W，一定還有一台要改用別的電源。`, '點一下攝影機和電話，看誰旁邊有插座。有插座的那一台改用變壓器，網路線照插就好。'];
        this.passMsg = `過關！三台設備靠 PoE 供電，看板和${D0[o].name}改用變壓器，總供電沒有超過上限。`;
        return { cables: [], intro: this.intro.replace('{W}', this.budget).replace('{P}', 30) }
      },
      sh: false,
      onDev(id) {
        const d = D[id];
        if (id !== this.outlet && id !== 'sign') { say(`${d.name}附近沒有插座，只能靠 PoE 供電。`); return }
        d.adapter = !d.adapter; unwin(); place();
        say(d.adapter ? `${d.name}旁邊有插座。接上變壓器後它自己有電，不再占用 PoE 的瓦數。網路線還是要接。` : `拔掉變壓器，${d.name}又要靠 PoE 供電了。`, d.adapter ? 'ok' : '')
      },
      lay: {
        wide: { W: 900, H: 600, net: { x: 226, y: 44 }, rack: { x: 40, y: 98, w: 372, h: 424 }, pos: { aggr: [60, 122], sw: [60, 262], ap1: [440, 90], ap2: [670, 90], cam: [440, 200], phone: [670, 200], sign: [440, 310], pc: [700, 330] } },
        narrow: { W: 440, H: 800, net: { x: 220, y: 42 }, rack: { x: 34, y: 98, w: 372, h: 214 }, pos: { aggr: [54, 108], sw: [54, 212], ap1: [14, 340], ap2: [226, 340], cam: [14, 446], phone: [226, 446], sign: [14, 552], pc: [250, 560] } }
      },
      goals: [['AP 甲有電', s => s.pow('ap1')], ['AP 乙有電', s => s.pow('ap2')], ['走廊攝影機有電', s => s.pow('cam')], ['IP 電話有電', s => s.pow('phone')], ['數位看板有電', s => s.pow('sign')], ['電腦接上教室端交換器', s => s.link('pc', 'sw')]],
      allow: (a, b) => { const d = [a.split('.')[0], b.split('.')[0]]; return d.includes('sw') && !d.includes('aggr') ? null : '這一關每台設備都各自接到教室端交換器。' },
      extra: '先看設備的電源燈有沒有亮，再按測試',
      hints: [],
      learn: ['<strong>PoE</strong> 用一條網路線同時送資料和電力，AP 和攝影機不必另外找插座。ECS4125-10PL 的 8 個 2.5G 埠都支援 802.3af／at。', '兩個上限：<strong>單埠 30 W</strong>（802.3at）和<strong>整台 120 W</strong>總預算。超過單埠上限的設備怎麼插都沒電；總預算超過時，後接的設備拿不到電。', '耗電大、旁邊有插座的設備，改用變壓器最省事。'],
      tip: '實務經驗：AP 整排沒反應，先到智慧網管看那台教室端的 PoE 用量，再看總預算有沒有超過。只有一台不亮，換一個埠或換一條線試試。光纖到班案的教室端支援依 ping 或 SNMP 自動重新供電，AP 當機時會自動斷電重啟。',
      home: ['到智慧網管找一台教室端交換器，看它各埠的 PoE 供電瓦數，加總和 120 W 比一比。']
    },

    {
      key: '1-5', no: 4, id: '1-5', chap: CH1,
      name: '蓋一棟樓',
      task: '任務：接出核心、副控、教室端三層',
      min: 6, max: 7, s2: 'first',
      intro: '學校有 A、B 兩棟樓，每棟兩間教室要開通。如果每間教室都直接拉光纖回主機房，核心的 16 個埠很快就不夠用。邀標書的佈纜方案四：多棟校舍由各棟副控收容該棟教室，副控再以骨幹光纖回核心。',
      start: '由上往下接：核心接到每棟的副控「上行 1」，副控的 D 埠再接到各教室端的「上行」。模組都裝好了，選「OS2 單模光纖」拉線就好。',
      kinds: FIBER_KIND,
      testHead: '從四間教室各 ping 8.8.8.8', idle: '按「測試連線」會從四間教室各 ping 8.8.8.8',
      devs: TREE(), fixed: TREE_FIXED(), zones: TREE_ZONES, lay: TREE_LAY,
      sources: ['a1', 'a2', 'b1', 'b2'], need: [], allow: treeAllow,
      goals: [['核心接到 A 棟副控', s => s.link('core', 'da')], ['核心接到 B 棟副控', s => s.link('core', 'db')], ['A 棟兩間教室接到 A 棟副控', s => s.link('da', 'a1') && s.link('da', 'a2')], ['B 棟兩間教室接到 B 棟副控', s => s.link('db', 'b1') && s.link('db', 'b2')]],
      extra: '接完先看每個上行埠的連線燈，再按測試',
      passMsg: '過關！核心、副控、教室端三層都接起來了。',
      hints: ['先接最上面：從核心交換器拉兩條光纖，分別到 A 棟和 B 棟副控的「上行 1」埠。', '再接下面：每間教室的教室端交換器，接到自己那一棟副控的 D 埠。', '總共六條光纖。被擋下來的接法，訊息會告訴你為什麼不這樣接。'],
      learn: ['<strong>核心</strong>是全校的交通樞紐，<strong>副控</strong>每棟一台（大棟依樓層分設），<strong>教室端</strong>每間教室一台。', '分層之後，核心只要幾個埠就能服務全校；單棟 6 間以下的小校則由核心直達教室（方案一）。', '分層也讓故障範圍一眼看得出來：壞在哪一層，就斷那一層以下。'],
      tip: '實務經驗：整棟樓斷線，先查那一棟的副控和它往核心的上行光纖。只有一間教室斷線，就查那間的教室端交換器和它的皮纜。',
      see: ['snmp', 'schemes'],
      home: ['到智慧網管的「網路架構」看自己學校的拓樸圖，數一數有幾台副控、每台底下掛幾台教室端。']
    },

    {
      key: '1-6', no: 28, id: '1-6', chap: CH1,
      name: '雙電源與雙上行',
      task: '任務：讓一路跳電、一條光纖斷掉都不影響上課',
      min: 4, max: 4, s2: 'first', firstLabel: '第一次模擬就全部撐住', testLabel: '模擬跳電與斷線', goalLast: '模擬通過',
      idle: '按「模擬跳電與斷線」，輪流讓迴路 1、迴路 2 跳電、拔掉一條上行光纖，看哪一棟會斷',
      intro: '核心和副控都有兩組電源，副控往核心也可以接兩條光纖。施工時如果兩組電源插在同一條迴路，或只接一條光纖，備援就等於沒有。這一關先把兩棟副控的雙上行接好，再點每一台設備，把兩組電源分到不同迴路。',
      start: '每台副控從「上行 1」「上行 2」各拉一條光纖到核心不同的 S 埠。點設備可以設定兩組電源接哪一條迴路。',
      kinds: FIBER_KIND, noInv: false,
      devs: (() => { const t = { core: CORE(), da: AGG('A'), db: AGG('B') }; t.core.tap = true; return t })(),
      fixed: [{ a: 'net', b: 'core.q1', cls: 'fiber', occupy: true, msg: '核心往校端 L3 的介接線，已經接好。' }],
      lay: {
        wide: { W: 900, H: 500, net: { x: 226, y: 44 }, rack: { x: 40, y: 98, w: 372, h: 200 }, pos: { core: [60, 150], da: [520, 110], db: [520, 290] } },
        narrow: { W: 440, H: 560, net: { x: 220, y: 42 }, rack: { x: 34, y: 98, w: 372, h: 130 }, pos: { core: [54, 118], da: [4, 290], db: [226, 290] } }
      },
      zones: { wide: [[520, 90, '機房迴路 1 接 UPS，迴路 2 接市電'], [520, 460, '核心與副控都是雙電源，每組可接不同迴路']], narrow: [[14, 270, '迴路 1 接 UPS、迴路 2 接市電']] },
      need: [],
      CIRC: ['迴路 1（UPS）', '迴路 2（市電）', '未接'],
      init() {
        const faults = shuffle([['迴路 1（UPS）', '迴路 1（UPS）'], ['迴路 2（市電）', '未接'], ['迴路 1（UPS）', '未接']]);
        ['core', 'da', 'db'].forEach((id, i) => { const d = this.devs[id]; d.cfg = { psu1: faults[i][0], psu2: faults[i][1] } });
        this.did = 0;
        return { cables: [], intro: this.intro }
      },
      onLoad() { this.leds() },
      leds() { for (const id of ['core', 'da', 'db']) { const g = gDev[id], c = D[id].cfg; if (!g) continue; g.classList.toggle('psu1off', c.psu1 === '未接'); g.classList.toggle('psu2off', c.psu2 === '未接') } },
      onCfg() { this.leds() },
      onDev(id) { showCfg(id, `${D[id].name}的兩組電源`, [{ k: 'psu1', label: '電源 1 接', opts: this.CIRC }, { k: 'psu2', label: '電源 2 接', opts: this.CIRC }]) },
      alive(id, dead) { const c = D[id].cfg; return [c.psu1, c.psu2].some(x => x !== '未接' && x !== dead) },
      links(id) { return cables.filter(c => [dv(c.a), dv(c.b)].includes(id) && [dv(c.a), dv(c.b)].includes('core')).length },
      check() {
        const H = '模擬結果', ids = ['core', 'da', 'db'], lines = [];
        let bad = null;
        for (const dead of ['迴路 1（UPS）', '迴路 2（市電）']) {
          const down = ids.filter(id => !this.alive(id, dead));
          lines.push(`<span class="${down.length?'x':'o'}">${dead}跳電：${down.length?down.map(id=>D[id].name).join('、')+' 斷電':'全部設備維持運作'}</span>`);
          if (down.length && !bad) bad = `${dead}跳電時${D[down[0]].name}會斷電，它的兩組電源沒有分到不同迴路（或有一組沒接）。點它重新設定。`
        }
        for (const id of ['da', 'db']) {
          const n = this.links(id);
          lines.push(`<span class="${n>=2?'o':'x'}">拔掉${D[id].name}一條上行：${n>=2?'另一條以 ECMP 繼續轉送，教室不受影響':n===1?'整棟斷線':'還沒接上行'}</span>`);
          if (n < 2 && !bad) bad = `${D[id].name}只有 ${n} 條上行。從「上行 1」「上行 2」各拉一條到核心不同的埠。`
        }
        return bad ? { ok: false, head: H, lines, msg: bad } : { ok: true, head: H, lines }
      },
      goals: [['兩棟副控各有兩條上行到核心', () => ['da', 'db'].every(id => lvk('1-6').links(id) >= 2)], ['三台設備的兩組電源都分到不同迴路', () => ['core', 'da', 'db'].every(id => { const c = lvk('1-6').devs[id].cfg || {}; return c.psu1 !== '未接' && c.psu2 !== '未接' && c.psu1 !== c.psu2 })]],
      allow: (a, b) => { const d = [a.split('.')[0], b.split('.')[0]]; return d.includes('core') && d.some(x => x[0] === 'd') ? null : '這一關只接副控到核心的上行。' },
      extra: '設定完先想一遍：哪一條迴路跳電時，誰會斷',
      passMsg: '過關！一路跳電或一條光纖斷掉，兩棟都不會斷線。',
      hints: ['每台副控拉兩條光纖到核心，分別從「上行 1」和「上行 2」出發，接核心不同的 S 埠。', '點每一台設備看兩組電源。兩組都接同一條迴路，那條迴路跳電就全暗；有一組「未接」等於沒有備援。', '正確的接法：電源 1 接迴路 1（UPS）、電源 2 接迴路 2（市電），三台都一樣。'],
      learn: ['核心與副控<strong>雙冗餘電源</strong>是本案優於規格的配置，但要接在<strong>不同迴路</strong>才有意義。', '副控雙上行以 <strong>ECMP</strong> 同時轉送，一條斷了由路由收斂切換，不依賴 STP 重算。', '施工驗收時要實際拔一條電源、拔一條光纖測試，不能只看燈亮。'],
      tip: '實務經驗：停電復電後巡一次機櫃，看每台設備的 PSU1、PSU2 燈是不是都亮。只亮一顆，代表有一組電源沒接或那條迴路沒電。',
      see: ['psu', 'ecmp'],
      home: ['到主機房看核心交換器背面，兩組電源各插在哪一條迴路，是不是一組 UPS、一組市電。']
    },

    {
      key: 't1', no: 5, id: '報修單', chap: CH1,
      name: '整棟大樓斷線',
      task: '報修單：整棟樓不能上網',
      min: 6, max: 6, s2: 'first', firstLabel: '沒有動到正常的線和設備', freeTest: true, inspect: true,
      intro: '',
      start: '先按「測試連線」看哪些教室不通，再看燈號找原因。點設備可以檢查它，點線再按「拔掉這條線」可以拔下來看。',
      testHead: '從四間教室各 ping 8.8.8.8', idle: '按「測試連線」會從四間教室各 ping 8.8.8.8',
      kinds: FIBER_KIND,
      devs: TREE(), fixed: TREE_FIXED(), zones: TREE_ZONES, lay: TREE_LAY,
      sources: ['a1', 'a2', 'b1', 'b2'], need: [], allow: treeAllow,
      powerMsg: d => `${d.name}兩組電源只接了迴路 1，昨晚迴路 1 跳電後它就沒電了。先把電源 2 接到迴路 2，電源燈亮起，各埠燈號陸續恢復。`,
      hangMsg: d => `${d.name}重新開機後，各埠燈號恢復了。它有電但所有埠都不亮，是設備當機。記下時間，請光纖到班維護廠商查韌體與散熱。`,
      init() {
        const B = rnd() < .5 ? 'a' : 'b', f = this.cause = ['cut', 'nopower', 'hang'][Math.floor(rnd() * 3)], N = this.bld = B.toUpperCase();
        for (const id in this.devs) this.devs[id].down = null;
        const cs = [{ a: 'core.s2', b: 'da.up' }, { a: 'core.s3', b: 'db.up' }, { a: 'da.d1', b: 'a1.up' }, { a: 'da.d2', b: 'a2.up' }, { a: 'db.d1', b: 'b1.up' }, { a: 'db.d2', b: 'b2.up' }].map(c => Object.assign(c, { type: 'fiber' }));
        if (f === 'cut') cs[B === 'a' ? 0 : 1].broken = true;
        else this.devs['d' + B].down = f;
        this.bad = () => cables.some(c => c.broken) || !!this.devs['d' + B].down || !cables.some(c => [c.a, c.b].join().includes('core.') && [c.a, c.b].join().includes('d' + B + '.'));
        return { cables: cs, intro: `早上第一節課，${N} 棟好幾位老師同時打電話來：「我們班不能上網！」另一棟一切正常。昨天 ${N} 棟旁邊有工程在施工，晚上機房還跳過一次電。智慧網管的告警卡顯示 ${N} 棟兩台教室端離線。你到了現場，該從哪裡查起？` }
      },
      goals: [['找出故障點並排除', () => !lvk('t1').bad()]],
      failMsg: '還有教室不通。兩間教室同時斷，問題在它們共同的上游。看那一棟副控的電源燈，還有上行埠兩端的連線燈。',
      extra: '拔線或重開機之前，先看燈號判斷',
      passMsg: '修好了！整棟樓恢復上網。',
      hints: ['斷線的是一整棟，不是一間教室。兩間教室共用的設備是那一棟的副控，從它查起。', '看副控右上角的 PSU 電源燈。不亮就是沒電，點它檢查電源。', '電源燈亮著：如果只有上行埠的燈不亮，是上行光纖斷了，把那條線拔掉換新的。如果所有埠的燈都不亮，是設備當機，點它重新開機。'],
      learn: ['<strong>先問範圍</strong>：整棟斷線代表問題在共同的上游，不必一間一間教室查。', '實體層三大元兇：<strong>光纖斷了、電源沒了、設備當機</strong>。看電源燈和連線燈就能分辨。', '<strong>由下往上查</strong>：先確認最簡單的硬體問題，再懷疑設定。工具「看燈號」已經學會，之後每一章都用得到。'],
      tip: '實務經驗：不要一開始就懷疑校端 L3 或教育局，先蹲下去看看電源與光纖。八成的日常故障都發生在最底下三層。光纖到班案設備在保固內，確認是硬體故障就通報光纖到班維護廠商。',
      see: ['backup', 'psu'],
      home: ['到每棟樓的副控機櫃看一次：兩組電源是不是接不同迴路、有沒有接 UPS。列一張「停電後要巡的機櫃」清單。'],
      close() {
        const N = this.bld;
        return CLOSE({
          cut: { rc: '副控往核心的上行光纖被施工弄斷', pv: '跨棟光纖路徑標示清楚，施工前先確認管線位置；啟用副控雙上行', say: `旁邊的工程把 ${N} 棟往機房的光纖弄斷了，已經換新` },
          nopower: { rc: '副控兩組電源都接在同一條迴路，跳電後沒有備援', pv: '雙電源分接 UPS 與市電兩條迴路；停電後巡一次各棟機櫃的電源燈', say: `昨晚跳電後，${N} 棟機櫃的交換器沒電了，已經把第二組電源接到另一條迴路` },
          hang: { rc: '副控當機，有電但所有埠都不亮', pv: '記錄當機時間，請光纖到班維護廠商檢查韌體版本和散熱；同一台常當機就要求更換', say: `${N} 棟的網路設備當機了，已經重新開機` }
        }, this.cause, ['每天早上把全校的交換器重開一次，讓設備保持在剛開機的狀態', '把整棟樓的光纖全部換成新的，以後就不會再斷線', '把副控搬到教室裡，壞了比較容易看到'], ['校端 L3 的設定被改錯'])
      }
    },
