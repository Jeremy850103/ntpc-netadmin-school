    /* ===== 第六章 智慧網管（新北獨有） ===== */
    {
      key: '6-1', no: 32, id: '6-1', chap: CH6, osi: [1, 2, 3], sh: false,
      name: '一校一卡',
      task: '任務：從六張學校卡決定今天先處理誰',
      min: 0, max: 0, s2: 'first', firstLabel: '一次就全部判對', testLabel: '對答案', goalLast: '按下「對答案」',
      idle: `點一張學校卡，這裡會顯示${NMS}「單位資訊」那一列的內容`,
      intro: `你今天在教育網路中心值班。${NMS}的「單位資訊」頁每校一列：今日告警項次、各類告警、網路設備離線數量、Switch 與 AP 的離線／告警／總數。313 校不可能一校一校看，要先分級：對外離線或整校離線的先處理，單一設備離線列入當日巡檢，正常的不動。`,
      start: '點每一張學校卡，看它的數字，決定「立即處理」「列入今日巡檢」或「正常不處理」。六張都決定好，按「對答案」。',
      devs: { ...RACK4(), e1: WDEV('', ''), e2: WDEV('', ''), e3: WDEV('', ''), e4: WDEV('', ''), e5: WDEV('', ''), e6: WDEV('', '') },
      fixed: SWFIX(),
      lay: {
        wide: { W: 900, H: 540, net: { x: 226, y: 44 }, rack: { x: 40, y: 98, w: 372, h: 424 }, pos: { l3: [60, 108], core: [60, 208], aggr: [60, 308], sw: [60, 408], e1: [450, 110], e2: [600, 110], e3: [750, 110], e4: [450, 290], e5: [600, 290], e6: [750, 290] } },
        narrow: { W: 440, H: 840, net: { x: 220, y: 42 }, rack: { x: 34, y: 98, w: 372, h: 420 }, pos: { l3: [54, 108], core: [54, 208], aggr: [54, 308], sw: [54, 408], e1: [14, 540], e2: [170, 540], e3: [326, 540], e4: [14, 700], e5: [170, 700], e6: [326, 700] } }
      },
      need: [], allow: () => '這一關不用接線。點學校卡。', noCut: '這一關不用動線。',
      // [學校, 對外設備離線, 離線 switch, 離線 AP, 總 switch, 總 AP, 今日告警, 答案(0 立即 1 巡檢 2 正常), 說明]
      POOL: [
        ['大坪國小', 1, 12, 48, 12, 48, 61, 0, '對外設備離線，而且全校 Switch 與 AP 全部離線：整校斷線。先打電話確認是否停電，再查校端 L3 與對外線路。'],
        ['山海國中', 0, 1, 7, 34, 120, 9, 1, '一台 Switch 離線、底下 7 台 AP 跟著離線，是單一教室端或匯聚故障，影響一棟或一間教室。列入今日巡檢，請學校先看燈號。'],
        ['雲海國小', 0, 0, 0, 27, 77, 0, 2, '全部在線、沒有告警。正常，不處理。'],
        ['溪頭高中', 0, 0, 3, 52, 185, 3, 1, '三台 AP 離線，Switch 都在線。可能是三間教室的 AP 被關掉或 PoE 埠問題。列入巡檢，請學校查那三間教室。'],
        ['北港國小', 1, 0, 0, 18, 60, 2, 0, '對外設備離線，但校內 Switch 與 AP 都在線：校內正常、對外不通。校端 L3 或對外線路有問題，立即查校端 L3 並準備通報。'],
        ['中正國中', 0, 2, 0, 41, 150, 2, 1, '兩台 Switch 離線、AP 沒有跟著離線，可能是兩台教室端沒電或被拔線。列入今日巡檢。'],
        ['福和國小', 0, 0, 0, 22, 70, 3, 1, '沒有設備離線，但今日有 3 筆告警（CRC Error）。線路品質問題，列入巡檢追蹤。'],
        ['龍潭國小', 1, 10, 36, 10, 36, 50, 0, '對外與全校設備同時離線。整校斷線，立即處理。']
      ],
      O: ['立即處理', '列入今日巡檢', '正常不處理'],
      init() {
        const pick = shuffle(this.POOL.slice()).slice(0, 6);
        ['e1', 'e2', 'e3', 'e4', 'e5', 'e6'].forEach((id, i) => { const d = this.devs[id], r = pick[i]; d.name = r[0]; d.row = r; d.pick = -1; d.tag = '還沒決定'; d.sub = `Sw ${r[2]}/${r[4]} AP ${r[3]}/${r[5]}`; d.w = 130 });
        return { cables: [], intro: this.intro }
      },
      onDev(id) {
        const d = D[id], r = d.row;
        if (!r) { say('先看學校卡。'); return }
        showTerm(`<span class="d">${NMS} › 連線單位 › 單位資訊</span>\n  名稱 . . . . . . : ${r[0]}\n  今日告警項次 . . : ${r[6]}\n  網路設備離線數量 : 對外設備 ${r[1]}　Switch ${r[2]} / ${r[4]}　AP ${r[3]} / ${r[5]}\n  （格式：離線 / 總數）`);
        showActs(`${r[0]}：怎麼處理？`, this.O.map((o, i) => [o, () => { d.pick = i; d.tag = o }]))
      },
      check() {
        const ids = ['e1', 'e2', 'e3', 'e4', 'e5', 'e6'], H = '六張學校卡的分級';
        if (ids.some(id => D[id].pick < 0)) return { ok: false, free: true, head: H, lines: [], msg: '還有學校沒決定。每一張都點開來看。' };
        const ok = id => D[id].pick === D[id].row[7], lines = ids.map(id => `<span class="${ok(id)?'o':'x'}">${D[id].name}：${this.O[D[id].pick]}${ok(id)?'':'　再想想'}</span>`), bad = ids.find(id => !ok(id));
        return bad ? { ok: false, head: H, lines, msg: `${D[bad].name}：${D[bad].row[8]}` } : { ok: true, head: H, lines }
      },
      goals: [['六張學校卡都決定好', () => ['e1', 'e2', 'e3', 'e4', 'e5', 'e6'].every(id => lvk('6-1').devs[id].pick >= 0)]],
      extra: '先看「對外設備離線」，再看離線數和總數的比例',
      passMsg: '過關！你已經會用一張卡決定先處理誰。',
      hints: ['「對外設備離線」是 1，代表那一校從校端 L3 以上就不通，不管校內怎樣都要立即處理。', '離線數等於總數，是整校斷線（多半停電或對外線路）；離線一台 Switch 加上一串 AP，是一棟或一間教室。', '沒有設備離線但有告警（例如 CRC Error），不用立即處理，列入巡檢追蹤。'],
      learn: [`${NMS}「單位資訊」每校一列，離線欄的格式是<strong>離線數／告警數／總數</strong>。先看對外設備，再看比例。`, '<strong>分級</strong>：對外離線或整校離線立即處理；單一設備或一串 AP 離線列入巡檢；只有告警沒有離線先追蹤。', '值班時把 313 校依這三級排序，電話還沒打來就知道誰最嚴重。'],
      tip: `實務經驗：整校 Switch 與 AP 同時離線，八成是停電或 UPS 沒電。先打電話問學校有沒有電，再派人。`,
      see: ['nmsalarm'],
      home: [`登入${NMS}，到「連線單位 › 單位資訊」找自己學校那一列，看 Switch 與 AP 的總數和盤點表對不對。`]
    },

    {
      key: '6-2', no: 33, id: '6-2', chap: CH6, osi: [1, 2], sh: false,
      name: '看懂拓樸圖',
      task: '任務：從拓樸圖找出斷點與受影響範圍',
      min: 0, max: 0, s2: 'first', firstLabel: '一次就全部判對', testLabel: '對答案', goalLast: '按下「對答案」',
      idle: '點設備，判斷它是斷點、受影響，還是正常',
      intro: `${NMS}的「網路架構」把每校的設備畫成一棵樹，離線的設備用紅框標示，位置標籤跟著設備名稱。學校打電話來說「有教室不能上網」，先開拓樸圖：紅框最上面那一台就是斷點，它底下的全部都會跟著離線。`,
      start: '畫面是雲海國小的拓樸圖，紅框的設備是離線。點每一台設備，判斷它是「斷點」「只是受影響」還是「正常」。全部判斷完，按「對答案」。',
      devs: (() => { const t = TREE(); for (const k in t) t[k].tap = true; t.l3.tap = t.core.tap = true; return t })(),
      fixed: [UPLINK, ...[['l3.s1', 'core.s1'], ['core.s2', 'da.up'], ['core.s3', 'db.up'], ['da.d1', 'a1.up'], ['da.d2', 'a2.up'], ['db.d1', 'b1.up'], ['db.d2', 'b2.up']].map(c => ({ a: c[0], b: c[1], cls: 'fixed', occupy: true, msg: '這一關不用動線，點設備判斷。' }))],
      zones: TREE_ZONES, lay: TREE_LAY, need: [], allow: () => '這一關不用接線。', noCut: '這一關不用動線。',
      O: ['這台是斷點，到現場查它', '只是受影響，上游修好就會恢復', '正常'],
      KIDS: { da: ['a1', 'a2'], db: ['b1', 'b2'], core: ['da', 'db', 'a1', 'a2', 'b1', 'b2'] },
      init() {
        const cause = this.cause = pickOne(['da', 'db', 'a2', 'b1']);
        for (const id in this.devs) { const d = this.devs[id]; d.down = null; d.pick = -1; d.sub0 = d.sub0 || d.sub; d.subfn = () => d.pick < 0 ? d.sub0 : ['斷點', '受影響', '正常'][d.pick] }
        const kids = this.KIDS[cause] || [];
        [cause, ...kids].forEach(id => { this.devs[id].down = 'off' });
        this.ans = id => id === cause ? 0 : kids.includes(id) ? 1 : 2;
        const lab = { da: 'A 棟副控與底下兩間教室', db: 'B 棟副控與底下兩間教室', a2: 'A 棟 2F 教室端', b1: 'B 棟 1F 教室端' }[cause];
        return { cables: [], intro: `雲海國小來電：「有教室不能上網。」你打開${NMS}的網路架構，拓樸分析時間是今天早上，紅框顯示 ${lab} 離線。` }
      },
      onDev(id) {
        const d = D[id];
        showTerm(`<span class="d">${NMS} › 網路架構 › ${d.name}</span>\n  狀態 . . . : ${d.down?'<span class="x">離線（紅框）</span>':'<span class="o">在線</span>'}\n  上游 . . . : ${{l3:'教育網路中心',core:'校端 L3',da:'核心',db:'核心',a1:'A 棟副控',a2:'A 棟副控',b1:'B 棟副控',b2:'B 棟副控'}[id]}\n  位置標籤 . : ${{l3:'主機房 331',core:'主機房 331',da:'A 棟 1F 走廊機櫃',db:'B 棟 1F 走廊機櫃',a1:'A101 教室',a2:'A201 教室',b1:'B101 教室',b2:'B201 教室'}[id]}`);
        showActs(`${d.name}：`, this.O.map((o, i) => [o, () => { d.pick = i }]))
      },
      check() {
        const ids = Object.keys(D), H = '拓樸判讀';
        if (ids.some(id => D[id].pick < 0)) return { ok: false, free: true, head: H, lines: [], msg: '還有設備沒判斷。每一台都要點。' };
        const ok = id => D[id].pick === this.ans(id), lines = ids.map(id => `<span class="${ok(id)?'o':'x'}">${D[id].name}：${['斷點', '受影響', '正常'][D[id].pick]}${ok(id)?'':'　再想想'}</span>`), bad = ids.find(id => !ok(id));
        return bad ? { ok: false, head: H, lines, msg: this.ans(bad) === 0 ? `${D[bad].name}是紅框裡最上游的一台，它底下的設備全部跟著離線。它才是斷點。` : this.ans(bad) === 1 ? `${D[bad].name}是紅框，但它的上游也是紅框。上游修好它就會恢復，不用先去它那裡。` : `${D[bad].name}在線，正常。` } : { ok: true, head: H, lines }
      },
      goals: [['每一台設備都判斷完', () => Object.values(lvk('6-2').devs).every(d => d.pick >= 0)]],
      extra: '先找紅框裡最上游的那一台',
      passMsg: '過關！你會用拓樸圖找斷點了。工具「智慧網管」已經學會。',
      hints: ['紅框是離線。好幾台一起紅，先看它們的上下游關係。', '紅框裡最上游的那一台是斷點；它底下的紅框只是受影響。', '不是紅框的都是正常，包括斷點的上游。'],
      learn: [`${NMS}的拓樸圖由 LLDP 與 SNMP 自動產生，<strong>紅框代表離線</strong>，設備名稱旁有位置標籤。`, '<strong>斷點是紅框裡最上游的那一台</strong>。它底下的設備全部跟著離線，修好它就全部恢復。', '出門前看位置標籤，直接到那個機櫃或教室，不用一間一間找。光纖到班完工後廠商要確認拓樸圖顯示正確（邀標書第十七條）。'],
      tip: '實務經驗：拓樸圖是定時分析的，看「拓樸分析時間」確認是不是最新；急的時候按「網路架構重整」。',
      see: ['nmsalarm', 'snmp'],
      home: [`到${NMS}的「網路架構」打開自己學校，數一數有幾層，找找有沒有位置標籤空白的設備。`]
    },

    {
      key: '6-3', no: 34, id: '6-3', chap: CH6, osi: [2, 3], sh: false,
      name: '告警判讀',
      task: '任務：六筆告警各決定怎麼處理',
      min: 0, max: 0, s2: 'first', firstLabel: '一次就全部判對', testLabel: '對答案', goalLast: '按下「對答案」',
      idle: '點一筆告警，這裡會顯示告警內容',
      intro: `${NMS}會發出十一類告警：IP 衝突、非法 IP（fake ARP）、非法 DHCP、IP 流量偵測、Port 流量偵測、Port Loop、CPU 負載、RAM 負載、CRC Error、離線、未知設備。每一類的處理方式不同，有的自己到現場，有的要請廠商，有的要回報教育網路中心。`,
      start: '點每一筆告警，看內容，決定怎麼處理。六筆都決定好，按「對答案」。',
      devs: { ...RACK4(), e1: WDEV('', ''), e2: WDEV('', ''), e3: WDEV('', ''), e4: WDEV('', ''), e5: WDEV('', ''), e6: WDEV('', '') },
      fixed: SWFIX(),
      lay: {
        wide: { W: 900, H: 540, net: { x: 226, y: 44 }, rack: { x: 40, y: 98, w: 372, h: 424 }, pos: { l3: [60, 108], core: [60, 208], aggr: [60, 308], sw: [60, 408], e1: [450, 110], e2: [600, 110], e3: [750, 110], e4: [450, 290], e5: [600, 290], e6: [750, 290] } },
        narrow: { W: 440, H: 840, net: { x: 220, y: 42 }, rack: { x: 34, y: 98, w: 372, h: 420 }, pos: { l3: [54, 108], core: [54, 208], aggr: [54, 308], sw: [54, 408], e1: [14, 540], e2: [170, 540], e3: [326, 540], e4: [14, 700], e5: [170, 700], e6: [326, 700] } }
      },
      need: [], allow: () => '這一關不用接線。', noCut: '這一關不用動線。',
      O: ['自己到現場處理', '請光纖到班維護廠商', '請既有網路維護廠商', '回報教育網路中心', '先觀察，暫不處理'],
      // [類別, 內容, 答案, 說明]
      POOL: [
        ['IP 衝突', `${NET}.23 由兩個 MAC 輪流回應（教務處電腦與一台新筆電）`, 0, '兩台設備搶同一個固定 IP，自己到現場把其中一台改掉。'],
        ['非法 IP（fake ARP）', `${NET}.254 的 MAC 突然變成 3c-52-82-1a-9f-04，來源 ${SCH.abbr}-E-A201 P3`, 0, '有設備冒充閘道的 IP，可能是私接分享器或中毒電腦。自己到 A201 教室 P3 那一埠查。'],
        ['非法 DHCP', `${SCH.abbr}-E-B203 P5 偵測到非學校的 DHCP 伺服器 192.168.0.1`, 0, '有人私接分享器。自己到 B203 教室拔掉 P5 的設備。'],
        ['Port Loop', `${SCH.abbr}-E-A102 P2、P4 廣播封包暴增`, 0, '教室內有迴圈，自己到 A102 教室找出多接的那條線。'],
        ['CRC Error', `${SCH.abbr}-AGG-B S2（往 B203 教室端）每小時 CRC 1,200 筆`, 1, '副控到教室端的光纖訊號品質不良，在保固內，請光纖到班維護廠商量測光功率與更換跳線。'],
        ['CPU 負載', `${SCH.abbr}-CORE CPU 連續 30 分鐘 95%`, 1, '核心交換器 CPU 異常高，可能是韌體或攻擊流量。核心屬光纖到班案設備，請廠商處理。'],
        ['離線', `${SCH.abbr}-L3 離線，校內 Switch 與 AP 全部在線但對外不通`, 2, '校端 L3 路由器當機或故障。它是既有設備，請既有網路維護廠商處理，同時通知教育網路中心。'],
        ['對外設備離線', `${SCH.abbr}-L3 對外埠連線燈熄滅，鄰近三校同時離線`, 3, '鄰近學校同時斷，問題在教育局骨幹或對外線路，回報教育網路中心。'],
        ['未知設備', `${SCH.abbr}-E-A201 P6 出現未登錄的 MAC（廠牌 Raspberry Pi）`, 4, '新設備接上，不一定是問題。先觀察並請老師確認是不是教學用的開發板，再決定是否登錄。'],
        ['RAM 負載', `${SCH.abbr}-E-B101 RAM 使用 88%，持續一週`, 4, '教室端記憶體使用高但穩定，服務正常。先觀察趨勢，下次例行維護時請廠商看韌體版本。'],
        ['Port 流量偵測', `${SCH.abbr}-E-A201 P1 下行流量連續 10 分鐘 2.3 Gbps`, 4, '單一埠流量滿載，可能是學生在下載或備份。先觀察，確認是不是正常教學用途再處理。'],
        ['IP 流量偵測', `${NET}.77 對外連線數每分鐘 8,000 筆`, 0, '單一電腦大量對外連線，多半是中毒。自己到現場拔線並通知老師掃毒。']
      ],
      init() {
        const pick = shuffle(this.POOL.slice()).slice(0, 6);
        ['e1', 'e2', 'e3', 'e4', 'e5', 'e6'].forEach((id, i) => { const d = this.devs[id], r = pick[i]; d.name = r[0]; d.row = r; d.pick = -1; d.tag = '還沒決定'; d.sub = '告警' });
        return { cables: [], intro: this.intro }
      },
      onDev(id) {
        const d = D[id], r = d.row;
        if (!r) { say('先看告警卡。'); return }
        showTerm(`<span class="d">${NMS} › 告警 › ${r[0]}</span>\n  單位 . . . : ${SCH.name}\n  內容 . . . : ${r[1]}\n  時間 . . . : 今天 09:1${Math.floor(rnd()*9)}`);
        showActs(`${r[0]}：怎麼處理？`, this.O.map((o, i) => [o, () => { d.pick = i; d.tag = o }]))
      },
      check() {
        const ids = ['e1', 'e2', 'e3', 'e4', 'e5', 'e6'], H = '六筆告警的處理';
        if (ids.some(id => D[id].pick < 0)) return { ok: false, free: true, head: H, lines: [], msg: '還有告警沒決定。每一筆都點開來看。' };
        const ok = id => D[id].pick === D[id].row[2], lines = ids.map(id => `<span class="${ok(id)?'o':'x'}">${D[id].name}：${this.O[D[id].pick]}${ok(id)?'':'　再想想'}</span>`), bad = ids.find(id => !ok(id));
        return bad ? { ok: false, head: H, lines, msg: `${D[bad].name}：${D[bad].row[3]}` } : { ok: true, head: H, lines }
      },
      goals: [['六筆告警都決定好', () => ['e1', 'e2', 'e3', 'e4', 'e5', 'e6'].every(id => lvk('6-3').devs[id].pick >= 0)]],
      extra: '先分：人為問題自己處理，設備故障看是誰的設備',
      passMsg: '過關！十一類告警你都知道該找誰了。',
      hints: ['IP 衝突、非法 IP、非法 DHCP、Port Loop、IP 流量偵測多半是教室裡的人為問題，自己到現場。', '設備本身的問題看它是誰的：核心、副控、教室端與光纖找光纖到班維護廠商；校端 L3 與既有設備找既有網路維護廠商。', '鄰近學校同時斷線回報教育網路中心；未知設備與單一埠流量高先觀察。'],
      learn: ['告警先分兩類：<strong>人為</strong>（私接、撞號、迴圈、中毒）自己到現場；<strong>設備</strong>看保固歸屬找對廠商。', '<strong>CRC Error</strong> 是線路品質，光纖段在保固內要請廠商量光功率；<strong>CPU 負載</strong>持續高要查韌體或攻擊流量。', '<strong>未知設備</strong>和<strong>流量偵測</strong>不一定是故障，先觀察、先問人，再決定。'],
      tip: `實務經驗：把${NMS}的告警用 LINE 推播到資訊組長手機（系統 › LINE），人為問題在老師打電話之前就能先處理。`,
      see: ['nmsalarm', 'line'],
      home: [`到${NMS}的「報表 › 告警記錄」查自己學校過去一個月各類告警的次數，最多的那一類就是最該預防的。`]
    },

    {
      key: '6-4', no: 35, id: '6-4', chap: CH6, osi: [2, 3],
      name: '設定備份與比對',
      task: '任務：找出被誤改的設定並還原',
      min: 1, max: 1, s2: 'first', firstLabel: '先比對再還原', testLabel: '測試連線',
      noCut: '線路是好的。問題在副控的設定。',
      idle: '按「測試連線」會從 B 棟教室電腦 ping 閘道與 8.8.8.8',
      intro: '光纖到班案的資產管理平台每週自動備份核心、副控、教室端的設定，預設保留 52 份，可以把「目前設定」和最新備份逐行比對。今天早上 B 棟一間教室突然不能上網，前一晚廠商在副控上做過調整。',
      start: '點 B 棟副控，先選「比對目前設定與最新備份」看哪幾行變了，再決定要還原到哪一版。',
      devs: (() => { const aggr = AGGR('B'); aggr.tap = true; return { l3: L3(), core: CORE(), aggr, sw: EDGE(), e1: DESK('B203 教室電腦', NET + '.60') } })(),
      fixed: SWFIX(),
      lay: {
        wide: { W: 900, H: 540, net: { x: 226, y: 44 }, rack: { x: 40, y: 98, w: 372, h: 424 }, pos: { l3: [60, 108], core: [60, 208], aggr: [60, 308], sw: [60, 408], e1: [600, 150] } },
        narrow: { W: 440, H: 680, net: { x: 220, y: 42 }, rack: { x: 34, y: 98, w: 372, h: 420 }, pos: { l3: [54, 108], core: [54, 208], aggr: [54, 308], sw: [54, 408], e1: [150, 540] } }
      },
      need: [], allow: () => null,
      DIFFS: {
        relay: { line: '/ip dhcp-relay set [find interface=vlan20] dhcp-server=' + GW, now: '/ip dhcp-relay set [find interface=vlan20] disabled=yes', why: 'VLAN 20 的 DHCP Relay 被停用，教室領不到 IP' },
        trunk: { line: '/interface bridge vlan set [find vlan-ids=20] tagged=sfp-sfpplus2', now: '/interface bridge vlan set [find vlan-ids=20] tagged=""', why: '往 B203 教室端（S2）的 Trunk 把 VLAN 20 拿掉了，教室的資料進不了副控' },
        gw: { line: '/ip address add address=' + GW + '/24 interface=vlan20', now: '/ip address add address=' + NET + '.244/24 interface=vlan20', why: 'VLAN 20 的閘道位址被改成 .244，電腦的閘道 .254 沒有人回應' }
      },
      init() {
        this.cause = pickOne(['relay', 'trunk', 'gw']);
        this.state = 'bad'; this.diffed = false; this.early = false;
        return { cables: [{ a: 'e1.p', b: 'sw.p1' }], intro: this.intro }
      },
      s2ok() { return !this.early },
      onDev(id) {
        const L = this, d = D[id], df = L.DIFFS[L.cause];
        if (id === 'e1') return showActs('B203 教室電腦：', [['ipconfig', () => showTerm(IPC(L.cause === 'relay' && L.state === 'bad' ? '169.254.12.9' : NET + '.60', L.cause === 'relay' && L.state === 'bad' ? '255.255.0.0' : '255.255.255.0', L.cause === 'relay' && L.state === 'bad' ? '' : GW))], ['ping 閘道', () => showTerm(`<span class="d">C:\\&gt; ping ${GW}</span>\n` + (L.state === 'bad' ? '<span class="x">要求等候逾時。</span>' : '<span class="o">回覆自 ' + GW + '：時間=1ms</span>'))], ['不處理', () => {}]]);
        showActs('B 棟副控點交換器（資產管理平台）：', [
          ['比對目前設定與最新備份', () => { L.diffed = true; showTerm(`<span class="d">資產管理平台 › ${SCH.abbr}-AGG-B › 設定比對（目前 vs 最新備份 上週日 03:00）</span>\n  共 212 行，差異 ${L.state==='bad'?1:0} 行\n` + (L.state === 'bad' ? `<span class="x">- ${df.line}</span>\n<span class="o">+ ${df.now}</span>` : '  （無差異）')); say(L.state === 'bad' ? `差異只有一行：${df.why}。這一行不在任何變更單上。` : '目前設定和最新備份一致。') }],
          ['還原到最新備份（上週日）', () => { if (!L.diffed) L.early = true; if (L.state === 'bad') { L.state = 'ok'; say('已把最新備份推回副控，差異那一行回復了。B203 教室電腦重新領 IP 後恢復。', 'ok') } else { fails++; say('目前設定和最新備份一致，不需要還原。', 'bad') } }],
          ['還原到上個月的版本', () => { if (!L.diffed) L.early = true; fails++; L.state = 'old'; say('推回上個月的版本之後，這個月新增的三間教室的 VLAN 設定也不見了，三間教室一起斷線。還原要挑「最接近正常」的那一版，不是越舊越好。先再比對一次。', 'bad') }],
          ['重新開機', () => { fails++; say('副控重開，整棟斷線兩分鐘。設定是存起來的，重開之後問題還在。', 'bad') }],
          ['不處理', () => {}]
        ])
      },
      check() {
        const H = '從 B203 教室電腦測試', ok = this.state === 'ok';
        const lines = [ok ? `<span class="o">ping ${GW}：有回應</span>` : `<span class="x">ping ${GW}：要求等候逾時</span>`, ok ? '<span class="o">ping 8.8.8.8：有回應</span>' : '<span class="x">ping 8.8.8.8：要求等候逾時</span>'];
        if (this.state === 'old') return { ok: false, head: H, lines: lines.concat(['<span class="x">B101、B102、B201 教室：領不到 IP</span>']), msg: '還原到太舊的版本，其他教室也斷了。再比對一次，還原到最新備份。' };
        return ok ? { ok: true, head: H, lines } : { ok: false, free: true, head: H, lines, msg: 'B203 還是不通。點副控，先比對目前設定與最新備份。' }
      },
      goals: [['比對過目前設定與備份', () => lvk('6-4').diffed], ['還原到正確的版本', () => lvk('6-4').state === 'ok']],
      extra: '先比對，看清楚差異那一行，再還原',
      passMsg: '過關！一行差異找出來，一鍵還原。工具「設定比對」已經學會。',
      hints: ['點副控，選「比對目前設定與最新備份」，差異只有一行。', '差異那一行不在變更單上，就是誤改。還原到最新備份（上週日），不要選更舊的版本。', '還原後請教室電腦重新領 IP，再按「測試連線」。'],
      learn: ['資產管理平台<strong>每週備份</strong>三層設備的設定，預設保留 52 份，可比對「目前設定（即時抓取）」與任一備份，<strong>差異逐行呈現</strong>。', '還原要挑<strong>最接近正常的版本</strong>，太舊的版本會把後來正確的變更一起抹掉。', '改設定前先備份、改完記錄：設定遭誤改時才找得出改動內容與時間。'],
      tip: '實務經驗：廠商做完調整當天，隔天早上先比對一次設定差異，差異行要對得上變更單。',
      see: ['backup'],
      home: ['問光纖到班維護廠商：資產管理平台的備份排程是哪一天、保留幾份、誰有權限還原。']
    },

    {
      key: '6-5', no: 36, id: '6-5', chap: CH6, osi: [1], sh: false,
      name: '線路測速與雷達',
      task: '任務：從兩種測速結果判斷哪一段退化',
      min: 0, max: 0, s2: 'first', firstLabel: '一次就判對', testLabel: '對答案', goalLast: '按下「對答案」',
      idle: '點每一段線路，判斷它是正常還是退化',
      intro: '本案有兩種測速：核心與副控交換器之間「逐段測速」定時量吞吐、丟包與抖動，與該段自己 7 天的基準線比較；教室端到電腦這一段不納入逐段測速，由教室電腦用瀏覽器連「校內測速主機（雷達）」量。B203 教室說「很慢」，兩種結果都在終端機。',
      start: '看終端機的兩張結果，點畫面上的每一段線路（三個方塊），判斷正常或退化。三段都判斷完，按「對答案」。',
      devs: { s1: WDEV('核心 ↔ B 棟副控', '逐段測速'), s2: WDEV('B 棟副控 ↔ B203 教室端', '逐段測速'), s3: WDEV('B203 教室端 ↔ 教室電腦', '雷達測速') },
      fixed: [],
      lay: {
        wide: { W: 900, H: 360, net: { x: 0, y: 0 }, rack: { x: 0, y: 0, w: 0, h: 0 }, pos: { s1: [100, 120], s2: [400, 120], s3: [700, 120] } },
        narrow: { W: 440, H: 460, net: { x: 0, y: 0 }, rack: { x: 0, y: 0, w: 0, h: 0 }, pos: { s1: [14, 110], s2: [170, 110], s3: [326, 110] } }
      },
      zones: { wide: [[100, 100, '核心'], [320, 100, 'B 棟副控'], [620, 100, 'B203 教室端'], [860, 100, '電腦'], [100, 300, '逐段測速：核心與副控之間；雷達：教室電腦到測速主機']], narrow: [[14, 300, '逐段測速：核心與副控之間'], [14, 322, '雷達：教室電腦到測速主機']] },
      need: [], allow: () => '這一關不用接線。', noCut: '這一關不用動線。',
      init() {
        this.bad = pickOne(['s1', 's2', 's3']);
        ['s1', 's2', 's3'].forEach(id => { const d = this.devs[id]; d.pick = -1; d.tag = '還沒判斷' });
        const seg = (name, base, now) => `  ${name.padEnd(22)}基準 ${base}　今日 ${now}`;
        const r1 = this.bad === 's1' ? ['9.41 Gbps／0.00%／0.2 ms', '<span class="x">2.10 Gbps／3.8%／9.6 ms</span>'] : ['9.41 Gbps／0.00%／0.2 ms', '9.40 Gbps／0.00%／0.2 ms'];
        const r2 = this.bad === 's2' ? ['9.38 Gbps／0.00%／0.3 ms', '<span class="x">0.92 Gbps／6.1%／14 ms</span>'] : ['9.38 Gbps／0.00%／0.3 ms', '9.37 Gbps／0.00%／0.3 ms'];
        const radar = this.bad === 's3' ? '<span class="x">下行 94 Mbps　上行 93 Mbps</span>' : this.bad === 's2' ? '<span class="x">下行 870 Mbps　上行 410 Mbps</span>' : '下行 941 Mbps　上行 938 Mbps';
        this.report = `<span class="d">資產管理平台 › 線路測速（吞吐／丟包／抖動，與 7 天基準線比較）</span>\n${seg('核心 ↔ AGG-B', r1[0], r1[1])}\n${seg('AGG-B ↔ E-B203', r2[0], r2[1])}\n\n<span class="d">雷達 › B203 教室電腦 → 校內測速主機</span>\n  ${radar}　（電腦網卡 1 Gbps）`;
        return { cables: [], intro: this.intro }
      },
      idleHtml() { return this.report },
      onDev(id) { const d = D[id]; showTerm(this.report); showActs(`${d.name}：`, [['正常', () => { d.pick = 0; d.tag = '正常' }], ['退化', () => { d.pick = 1; d.tag = '退化' }]]) },
      check() {
        const ids = ['s1', 's2', 's3'], H = '三段線路的判斷';
        if (ids.some(id => D[id].pick < 0)) return { ok: false, free: true, head: H, lines: [], msg: '還有線段沒判斷。' };
        const ans = id => id === this.bad ? 1 : 0, ok = id => D[id].pick === ans(id), lines = ids.map(id => `<span class="${ok(id)?'o':'x'}">${D[id].name}：${['正常','退化'][D[id].pick]}${ok(id)?'':'　再想想'}</span>`), bad = ids.find(id => !ok(id));
        const M = { s1: '核心到副控這一段今天吞吐掉到基準的兩成、丟包 3.8%，整棟都會慢。這一段是副控的上行光纖，請光纖到班維護廠商量光功率。', s2: '副控到 B203 教室端這一段吞吐只剩 0.92 Gbps、丟包 6.1%，雷達測到的 870 Mbps 也是被它拖累的。問題在教室的皮纜或跳線。', s3: '兩段逐段測速都和基準一致，只有雷達只跑到 94 Mbps，電腦網卡卻是 1 Gbps。問題在教室端到電腦之間：那條網路線或網卡協商。' };
        return bad ? { ok: false, head: H, lines, msg: M[this.bad] } : { ok: true, head: H, lines }
      },
      goals: [['三段線路都判斷完', () => ['s1', 's2', 's3'].every(id => lvk('6-5').devs[id].pick >= 0)]],
      extra: '逐段測速看「今日」和「基準」差多少，雷達看和網卡速度差多少',
      passMsg: '過關！你會用兩種測速把慢的那一段找出來了。',
      hints: ['逐段測速每一段都有基準值。今日吞吐遠低於基準、丟包明顯，那一段就是退化。', '逐段測速只量到教室端為止。教室端到電腦這一段要看雷達。', '雷達的數字和電腦網卡速度比：網卡 1 Gbps 卻只跑 94 Mbps，問題在教室裡；逐段都正常就不是光纖的問題。'],
      learn: ['<strong>逐段測速</strong>由核心與副控交換器內建功能定時量測，與各鏈路自身 7 天基準線比較；退化鏈路可在設備頁看趨勢。教室端不納入，避免占用副控處理器。', '<strong>雷達</strong>是校內測速主機，內建 sp 測速網站，教室電腦用瀏覽器連上就能量測教室、校內骨幹到學校機房的品質，用來分析壅塞是在校內還是校外；測速流量由電腦和雷達產生，不經過交換器處理器。', '兩種結果合起來看：逐段退化在光纖段，請光纖到班維護廠商；逐段正常、雷達慢，問題在教室裡，自己處理。'],
      tip: '實務經驗：老師說「慢」，先看逐段測速有沒有退化，再請老師用雷達測一次。兩個數字一拿到，該找誰就清楚了。',
      see: ['radar', 'speed'],
      home: ['在自己學校的一間教室用瀏覽器連雷達測一次，記下上下行速度和電腦網卡速度。']
    },

    {
      key: '6-6', no: 37, id: '6-6', chap: CH6, osi: [], sh: false,
      name: '盤點計畫填報',
      task: '任務：把兩台設備的盤點資料填對',
      min: 0, max: 0, s2: 'first', firstLabel: '一次就全部填對', testLabel: '檢查盤點表', goalLast: '按下「檢查盤點表」',
      idle: '點設備，填它在盤點計畫裡的欄位',
      intro: `${NMS}的「盤點計畫」由各校自行登錄每一台網路設備：連接層次、廠牌、型號、購置年份、支援 IPv6、支援 SNMP、介面數量、最高頻寬。全市 8,585 筆裡常見的錯誤：購置年份填成安裝位置、層次填錯、支援 IPv6 一律填 N。盤點表是教育局規劃汰換與光纖到班批次的依據，要填對。`,
      start: '點兩台設備，依面板與標籤把欄位填對。畫面上有兩台的實際資料。',
      devs: (() => { const l3 = L3(), sw = EDGE('教室端交換器', `ECS4125-10PL · ${SCH.abbr}-E-B203`); l3.tap = sw.tap = true; return { l3, core: CORE(), aggr: AGGR('B'), sw } })(),
      fixed: [UPLINK, L3CORE('core.s1', '這一關不用動線。'), CORE_AGG('這一關不用動線。'), AGG_SW('這一關不用動線。')],
      lay: {
        wide: { W: 900, H: 540, net: { x: 226, y: 44 }, rack: { x: 40, y: 98, w: 372, h: 424 }, pos: { l3: [60, 108], core: [60, 208], aggr: [60, 308], sw: [60, 408] } },
        narrow: { W: 440, H: 560, net: { x: 220, y: 42 }, rack: { x: 34, y: 98, w: 372, h: 424 }, pos: { l3: [54, 108], core: [54, 208], aggr: [54, 308], sw: [54, 408] } }
      },
      zones: { wide: [[450, 120, '實際資料：'], [450, 146, '校端 L3：Juniper EX3400-24T，113 年購置，24 埠 1G＋4 埠 10G，支援 IPv6 與 SNMP'], [450, 172, '直接接教育局骨幹，是校內第 1 層'], [450, 210, '教室端：Edgecore ECS4125-10PL，115 年光纖到班案購置'], [450, 236, '8 埠 2.5G＋2 埠 10G，支援 IPv6 與 SNMP，接在副控（第 2 層）底下']], narrow: [] },
      need: [], allow: () => '這一關不用接線。', noCut: '這一關不用動線。',
      F: { l3: [{ k: 'lv', label: '連接層次', opts: ['1', '2', '3', '4'] }, { k: 'brand', label: '廠牌', opts: ['Juniper', 'D-Link', 'MikroTik', 'Edgecore'] }, { k: 'model', label: '型號', opts: ['EX3400-24T', 'DGS-1250-52XMP', 'CRS518-16XS-2XQ', 'ECS4125-10PL'] }, { k: 'year', label: '購置年份', opts: ['113', '115', '331 機房', '（空白）'] }, { k: 'v6', label: '支援 IPv6', opts: ['Y', 'N'] }, { k: 'snmp', label: '支援 SNMP', opts: ['Y', 'N'] }, { k: 'bw', label: '介面最高頻寬（Mbps）', opts: ['1000', '2500', '10000'] }],
          sw: [{ k: 'lv', label: '連接層次', opts: ['1', '2', '3', '4'] }, { k: 'brand', label: '廠牌', opts: ['Juniper', 'D-Link', 'MikroTik', 'Edgecore'] }, { k: 'model', label: '型號', opts: ['EX3400-24T', 'DGS-1250-52XMP', 'CRS518-16XS-2XQ', 'ECS4125-10PL'] }, { k: 'year', label: '購置年份', opts: ['113', '115', 'B203 教室', '（空白）'] }, { k: 'v6', label: '支援 IPv6', opts: ['Y', 'N'] }, { k: 'snmp', label: '支援 SNMP', opts: ['Y', 'N'] }, { k: 'bw', label: '介面最高頻寬（Mbps）', opts: ['1000', '2500', '10000'] }] },
      GOOD: { l3: { lv: '1', brand: 'Juniper', model: 'EX3400-24T', year: '113', v6: 'Y', snmp: 'Y', bw: '10000' }, sw: { lv: '3', brand: 'Edgecore', model: 'ECS4125-10PL', year: '115', v6: 'Y', snmp: 'Y', bw: '10000' } },
      init() {
        this.devs.l3.cfg = { lv: '1', brand: 'Juniper', model: 'EX3400-24T', year: '331 機房', v6: 'N', snmp: 'Y', bw: '1000' };
        this.devs.sw.cfg = { lv: '4', brand: 'Edgecore', model: 'ECS4125-10PL', year: 'B203 教室', v6: 'N', snmp: 'Y', bw: '2500' };
        this.changes = 0; this.wrong = 0;
        return { cables: [], intro: this.intro }
      },
      onCfg(id, k) { this.changes++; if (D[id].cfg[k] !== this.GOOD[id][k]) this.wrong++ },
      s2ok() { return this.wrong === 0 },
      onDev(id) { showCfg(id, `${D[id].name}的盤點資料`, this.F[id]) },
      check() {
        const H = '盤點表檢查', bad = [];
        for (const id of ['l3', 'sw']) for (const f of this.F[id]) if (D[id].cfg[f.k] !== this.GOOD[id][f.k]) bad.push([id, f]);
        const lines = ['l3', 'sw'].map(id => `<span class="${bad.some(b=>b[0]===id)?'x':'o'}">${D[id].name}：${this.F[id].map(f => f.label.split('（')[0] + ' ' + D[id].cfg[f.k]).join('、')}</span>`);
        if (!bad.length) return { ok: true, head: H, lines };
        const [id, f] = bad[0], M = { year: '「購置年份」要填年度，不是安裝位置。全市有五百多筆把位置填進這一欄，教育局就算不出設備年齡。', lv: id === 'l3' ? '校端 L3 直接接教育局骨幹，是校內第 1 層。' : '教室端接在副控（第 2 層）底下，是第 3 層。層次填錯，教育局就看不出哪些學校串太多層。', v6: '兩台都支援 IPv6（新北各校已配發 2001:288 開頭的 IPv6 網段）。盤點表裡這一欄全市都填 N，不是事實。', bw: id === 'l3' ? '校端 L3 有 4 埠 10G 上行，最高頻寬填 10000。' : '教室端有 2 埠 10G 上行，最高頻寬填 10000，不是 RJ45 的 2500。', snmp: '兩台都支援 SNMP，智慧網管靠它納管。', brand: '廠牌照面板填。', model: '型號照標籤填。' };
        return { ok: false, head: H, lines, msg: `${D[id].name}的「${f.label}」：${M[f.k]}` }
      },
      goals: [['兩台設備的欄位都填對', () => { const L = lvk('6-6'); return ['l3', 'sw'].every(id => L.F[id].every(f => (L.devs[id].cfg || {})[f.k] === L.GOOD[id][f.k])) }]],
      extra: '每個欄位對照畫面上的實際資料再選',
      passMsg: '過關！兩台設備的盤點資料都正確了。',
      hints: ['先改「購置年份」：年份要填年度，不是位置。', '「連接層次」從教育局骨幹往下數：校端 L3 是 1、核心 2、副控 2 或 3、教室端 3 或 4。這一關畫面省略核心，教室端是第 3 層。', '「支援 IPv6」兩台都是 Y；「介面最高頻寬」看上行埠的速度，不是接電腦的埠。'],
      learn: ['<strong>盤點計畫</strong>是教育局汰換與光纖到班批次規劃的依據，由學校自行登錄，填錯就會被錯誤規劃。', '常見錯誤：<strong>購置年份填成位置</strong>、<strong>層次填錯</strong>、<strong>IPv6 一律填 N</strong>。', '光纖到班完工後，新案設備（核心、副控、教室端）要補登錄，既有設備改接後層次要更新。'],
      tip: `實務經驗：盤點表可以從${NMS}匯出 Excel，先匯出對一次再進系統改，比一台一台點快。`,
      see: ['naming'],
      home: [`到${NMS}的「報表 › 盤點計畫」匯出自己學校的設備，檢查購置年份欄有沒有被填成位置。`]
    },

    {
      key: 't6', no: 38, id: '報修單', chap: CH6, osi: [1, 3],
      name: '整校離線但設備都亮',
      task: '報修單：智慧網管說全校離線，學校說燈都亮著',
      min: 1, max: 1, s2: 'first', firstLabel: '先測試，再回報', testLabel: '送出回報', goalLast: '教育網路中心確認收到',
      noCut: '校內的線路都是好的。',
      idle: '做完測試、填好回報內容，按「送出回報」',
      intro: `${NMS}跳出「對外設備離線」與「Radar 異常」：雲海國小整校離線。學校打來說機房的燈都亮著，校內的校務系統和印表機也都能用，只是連不出去。有些問題不在學校裡面，你修不了，要請教育網路中心處理。回報時講得越清楚，對方處理得越快。`,
      start: '點教室電腦做四項測試，判斷問題在校內還是校外。再點「教育網路中心」，把測試結果填進回報內容。',
      devs: (() => { const l3 = L3(); l3.tap = true; const c = WDEV('教育網路中心', '服務電話'); c.tag = '點我回報'; return { l3, core: CORE(), aggr: AGGR('B'), sw: EDGE(), e1: DESK('教室電腦', NET + '.60'), e2: c } })(),
      fixed: SWFIX(), lay: L5, need: [], allow: swAllow,
      init() {
        this.hop = rnd() < .5 ? 1 : 2;
        this.did = new Set(); this.early = false;
        this.devs.e2.cfg = { scope: '', gw: '', dns: '', hop: '', who: '' };
        this.devs.e2.tag = '點我回報';
        return { cables: [{ a: 'e1.p', b: 'sw.p1' }], intro: this.intro }
      },
      onCfg() { if (this.did.size < 4) this.early = true },
      s2ok() { return !this.early && fails === 0 },
      onDev(id) {
        const L = this;
        if (id === 'l3') return showActs('校端 L3 路由器：', [
          ['查看狀態', () => say('校端 L3 運作正常，對外埠的連線燈也亮著。校內到校端 L3 這一段沒有問題。')],
          ['重新開機', () => { fails++; say('校端 L3 重開，連校務系統都跟著斷了三分鐘。回來之後對外還是不通。', 'bad') }],
          ['不處理', () => {}]
        ]);
        if (id === 'e2') return showCfg('e2', '向教育網路中心回報', [{ k: 'scope', label: '影響範圍', opts: ['只有一台電腦', '只有一間教室', '全校'] }, { k: 'gw', label: 'ping 校端 L3 閘道', opts: ['通', '不通'] }, { k: 'dns', label: 'ping 校外（8.8.8.8 和教育局 DNS）', opts: ['通', '不通'] }, { k: 'hop', label: 'tracert 斷在', opts: ['第 1 站之後', '第 2 站之後', '沒有斷'] }, { k: 'who', label: '通報對象', opts: ['教育網路中心', '光纖到班維護廠商', '既有網路維護廠商'] }]);
        showActs('教室電腦：', [
          [`ping 閘道 ${GW}`, () => { L.did.add('gw'); showTerm(`<span class="d">C:\\&gt; ping ${GW}</span>\n<span class="o">回覆自 ${GW}：時間=1ms</span>`); say('校端 L3 有回應。校內這一段是通的。') }],
          ['ping 8.8.8.8', () => { L.did.add('ext'); showTerm('<span class="d">C:\\&gt; ping 8.8.8.8</span>\n<span class="x">要求等候逾時。\n要求等候逾時。</span>'); say('校外的 8.8.8.8 沒有回應。再 ping 教育局的 DNS 對照看看。') }],
          ['ping 教網 DNS', () => { L.did.add('dns'); showTerm(`<span class="d">C:\\&gt; ping ${DNS1}</span>\n<span class="x">要求等候逾時。\n要求等候逾時。</span>`); say('教育局的 DNS 也沒有回應。有些 DNS 本來就不回 ping，但 8.8.8.8 也不通，可以確定是對外不通：閘道通、外面不通，問題在學校出口之後。') }],
          ['tracert 教網 DNS', () => { L.did.add('tr'); showTerm(`<span class="d">C:\\&gt; tracert -d ${DNS1}</span>\n  1    1 ms   ${GW}\n` + (L.hop === 1 ? '  2    *      要求等候逾時\n  3    *      要求等候逾時' : '  2    3 ms   163.20.250.1\n  3    *      要求等候逾時\n  4    *      要求等候逾時')); say(`第 ${L.hop} 站有回應，下一站開始就沒有了。把這個結果記下來，回報時用得到。`) }],
          ['不處理', () => {}]
        ])
      },
      check() {
        const c = D.e2.cfg, H = '教育網路中心的回覆', w = { scope: '全校', gw: '通', dns: '不通', hop: `第 ${this.hop} 站之後`, who: '教育網路中心' };
        if (Object.keys(w).some(k => !c[k])) return { ok: false, free: true, head: H, lines: [], msg: '回報內容還沒填完。點「教育網路中心」，五項都要填。' };
        const M = { scope: '各處室都連不出去，影響範圍是全校。範圍報小了，對方會以為是你們校內的問題。', gw: '校端 L3 實際上是通的。報成不通，對方會請你先查校內。回報之前先實際 ping 一次。', dns: '8.8.8.8 和教育局 DNS 實際上都不通。報成通，對方會以為對外沒有問題。', hop: 'tracert 斷的位置報錯了。再執行一次，看最後一個有回應的是第幾站。', who: '校端 L3 通、出了學校就不通，問題在教育局骨幹或對外線路，通報對象是教育網路中心，不是廠商。' };
        const bad = Object.keys(w).find(k => c[k] !== w[k]);
        if (bad) return { ok: false, head: H, lines: ['<span class="x">「你們回報的狀況和我們這邊看到的對不起來，請再確認一次。」</span>'], msg: M[bad] };
        return { ok: true, head: H, lines: [`<span class="o">「收到，資料很清楚。全校對外不通、校端 L3 正常、斷在第 ${this.hop} 站之後。\n我們查到${this.hop===1?'貴校對外的光纖被道路施工挖斷':'區域骨幹的設備異常'}，已經派工處理。」</span>`] }
      },
      goals: [['完成四項測試', () => lvk('t6').did && lvk('t6').did.size >= 4], ['填好回報內容', () => { const c = lvk('t6').devs.e2.cfg || {}; return !!(c.scope && c.gw && c.dns && c.hop && c.who) }]],
      extra: '回報的每一項都要有實際測試的依據',
      passMsg: '過關！回報清楚，教育網路中心馬上就能接手。',
      hints: ['點教室電腦，四項測試都做一遍：ping 閘道、ping 8.8.8.8、ping 教網 DNS、tracert。', '閘道通、外面不通，代表問題不在校內。這時不要重開設備，直接回報。', '點「教育網路中心」，照實填：影響範圍、ping 閘道和 ping 校外的結果、tracert 最後有回應的是第幾站、通報對象。'],
      learn: ['<strong>ping 校端 L3 通、ping 外面不通</strong>，問題在學校出口之後，不是你修得了的。', `${NMS}的「對外設備離線」加「Radar 異常」同時出現，而校內 Switch 與 AP 都在線，就是這種情形。`, '回報要講五件事：<strong>影響範圍、閘道通不通、外面通不通、斷在哪一站、通報對象</strong>。校內正常時<strong>不要亂重開設備</strong>。'],
      tip: '實務經驗：把教育網路中心的服務電話貼在機櫃上。打電話前先備好 ping 和 tracert 的結果，對方通常一聽就知道往哪裡查。',
      see: ['speed'],
      home: ['找出教育網路中心的報修電話和方式，貼在機櫃上。順便存一份平常 tracert 的結果。'],
      close() {
        return CLOSE({ out: { rc: '學校對外線路或教育局骨幹異常，校內正常', pv: '機櫃上貼好三個報修窗口，回報前先做四項測試；平常存一份正常的 tracert', say: '學校連到教育局的線路出了問題，校內是正常的。已經通報教育網路中心，他們派工處理中' } }, 'out', ['把校端 L3 重開一次，通常就會恢復', '請老師先用手機熱點上課，等它自己好', '把學校的對外線路改成自己申請的寬頻'], ['核心交換器當機', '校端 L3 設定被改錯'])
      }
    },
