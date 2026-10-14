  const NS = 'http://www.w3.org/2000/svg',
    svg = document.getElementById('board');
  const $ = id => document.getElementById(id);
  /* ---------- 學校參數：關卡的邏輯一律用預設學校（10.213.250.0/24、DNS 163.20.1.1…）計算，
     畫面上顯示的文字再經過 tr() 換成班級或學員自己學校的值。所以存檔、重播、答案判斷都不受參數影響 ---------- */
  /* 新北版位址基底（虛構學校「雲海國小」，校編號 250；第二段依新北慣例代表網段用途，第三段代表學校）：
     教學 10.213.X、行政 10.215.X、伺服器 10.217.X、無線 10.231／10.233／10.235.X、交換器管理 10.226.X、AP 管理 10.228.X */
  const SEG = { user: '10.213', adm: '10.215', srv: '10.217', wl1: '10.231', wl2: '10.233', wl3: '10.235', mgmt: '10.226', ap: '10.228' };
  const SCH_NO = '250';
  const NET = SEG.user + '.' + SCH_NO;            // 關卡內部一律用這個教學網段計算
  const GW = NET + '.254', DNS1 = '163.20.1.1', DNS2 = '8.8.8.8';
  const MGMT = SEG.mgmt + '.' + SCH_NO, APNET = SEG.ap + '.' + SCH_NO, SRV = SEG.srv + '.' + SCH_NO, ADM = SEG.adm + '.' + SCH_NO;
  const DEFAULT_SCHOOL = {
    net: NET,
    gw: 254,
    dhcp: [101, 200],
    dns: DNS1,
    domain: 'yhps.ntpc.edu.tw',
    up: '',
    upShort: '',
    tel: '',
    ssid: {
      t: 'YHPS-Teacher',
      s: 'YHPS-Student',
      g: 'YHPS-Guest',
      i: 'YHPS-IoT'
    },
    split: {
      fiber: 2,
      fw: 1,
      core: 3
    },
    school: '',
    blds: ''
  };
  // 預設學校用到的主機號碼：DHCP 範圍裡的、範圍外的固定 IP
  const IN_RANGE = [
      [101, 0],
      [102, 1],
      [103, 2],
      [119, 18],
      [120, 19],
      [130, 20],
      [131, 21]
    ],
    FIXED = [1, 23, 31, 50, 60, 61, 62, 63, 64, 77, 99, 245];
  const isIP = t => /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.test(t) && t.split('.').every(x => +x <= 255);
  // 檢查學校參數合不合理，不合理就回傳原因（講師開班、學員填表、伺服器都用同一套規則）
  function badSchool(c) {
    const n = String(c.net || '').split('.');
    if (n.length !== 3 || !n.every(x => /^\d{1,3}$/.test(x) && +x <= 255) || +n[0] < 1 || +n[0] > 223) return '校內網段要寫前三段，例如 10.213.87';
    const g = +c.gw,
      [a, b] = c.dhcp.map(Number);
    if (!(g >= 1 && g <= 254)) return '閘道的最後一段要在 1 到 254 之間';
    if (!(a >= 1 && b <= 254 && b - a + 1 >= 30)) return 'DHCP 範圍至少要有 30 個位址，最後一段在 1 到 254 之間';
    if (g >= a && g <= b) return '閘道不能在 DHCP 發放範圍裡';
    if (254 - (b - a + 1) - 1 < FIXED.length) return 'DHCP 範圍外至少要留 ' + FIXED.length + ' 個位址給固定 IP';
    if (!isIP(c.dns)) return 'DNS 要寫完整的 IP，例如 163.20.1.1';
    if (c.dns.startsWith(c.net + '.')) return 'DNS 不能在校內網段裡（這個遊戲裡學校 DNS 由上游提供）';
    if (['8.8.8.8', '10.0.0.53', '1.2.3.4', '10.217.250.53'].includes(c.dns)) return '這個 DNS 在遊戲裡被當成別的用途，請換一個';
    const ss = Object.values(c.ssid);
    if (ss.some(x => !/^[\x21-\x7e]{1,24}$/.test(x)) || new Set(ss).size < 4) return '四個 SSID 都要填，彼此不同，只能用英數字和符號，最多 24 字';
    if (!/^[a-z0-9.-]{3,40}$/i.test(c.domain)) return '學校網域只能用英數字、點和減號，例如 abc.ntpc.edu.tw';
    if (Object.values(c.split).some(x => ![0, 1, 2, 3].includes(+x))) return '維護分工的選項不對';
    return ''
  }
  let XL = null; // 換字表；用預設學校時是 null，tr() 原樣傳回
  // 參數可能來自分享連結（別人做的），格式不對就退回預設學校
  function setSchool(o) {
    try {
      return setSchool0(o)
    } catch (e) {
      SCHOOL = JSON.parse(JSON.stringify(DEFAULT_SCHOOL));
      XL = null;
      return false
    }
  }

  function setSchool0(o) {
    const c = JSON.parse(JSON.stringify(DEFAULT_SCHOOL));
    for (const k in o || {})
      if (o[k] != null && o[k] !== '' && k in c) c[k] = typeof c[k] === 'object' && !Array.isArray(c[k]) ? Object.assign(c[k], o[k]) : o[k];
    c.gw = +c.gw;
    c.dhcp = c.dhcp.map(Number);
    for (const k in c.split) c.split[k] = +c.split[k];
    if (!Array.isArray(c.dhcp) || c.dhcp.length !== 2 || typeof c.ssid !== 'object' || badSchool(c)) {
      SCHOOL = JSON.parse(JSON.stringify(DEFAULT_SCHOOL));
      XL = null;
      return false
    }
    SCHOOL = c;
    const D0 = DEFAULT_SCHOOL,
      same = JSON.stringify(c) === JSON.stringify(D0);
    if (same) {
      XL = null;
      return true
    }
    // 主機號碼：0→0、255→255、254→閘道，DHCP 範圍裡的照位置對應，固定 IP 能不動就不動，其他補成一對一
    const [s0, e0] = c.dhcp, f = {
      0: 0,
      255: 255,
      254: c.gw,
      200: e0
    }, taken = new Set(Object.values(f));
    IN_RANGE.forEach(([h, o]) => {
      f[h] = s0 + o;
      taken.add(s0 + o)
    });
    const free = h => h >= 1 && h <= 254 && !(h >= s0 && h <= e0) && !taken.has(h);
    FIXED.forEach(h => {
      let v = free(h) ? h : null;
      for (let x = 1; v == null; x++)
        if (free(x)) v = x;
      f[h] = v;
      taken.add(v)
    });
    const left = [...Array(256).keys()].filter(h => !taken.has(h));
    for (let h = 0; h < 256; h++)
      if (f[h] == null) f[h] = left.includes(h) ? h : null;
    const rest = left.filter(h => !Object.values(f).includes(h));
    for (let h = 0; h < 256; h++)
      if (f[h] == null) f[h] = rest.shift();
    // 新北慣例：第二段是用途、第三段是學校。講師填的 net 當教學網段；其餘用途網段把第三段換成同一個校編號
    const X = c.net.split('.')[2], P = {}, tk = new Set([c.net]);
    P[NET] = c.net;
    for (const k in SEG) {
      if (k === 'user') continue;
      let v = SEG[k] + '.' + X, n = +X;
      while (tk.has(v)) { n = (n + 1) % 256; v = SEG[k] + '.' + n }
      tk.add(v);
      P[SEG[k] + '.' + SCH_NO] = v
    }
    const W = {},
      dn = c.dns.split('.');
    if (c.dns !== D0.dns) {
      W[DNS1] = c.dns;
      W['163.20.1.254'] = dn.slice(0, 3).join('.') + '.' + (dn[3] === '254' ? '253' : '254')
    }
    if (c.domain !== D0.domain) W['yhps.ntpc.edu.tw'] = c.domain;
    for (const k in c.ssid)
      if (c.ssid[k] !== D0.ssid[k]) W[D0.ssid[k]] = c.ssid[k];
    if (c.up) {
      ['教育局教育網路中心', '教育網路中心', '教網中心'].forEach(k => W[k] = c.up);
      W['教網'] = c.upShort || c.up
    }
    const keys = Object.keys(W).sort((x, y) => y.length - x.length).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const inv = {},
      ip4 = {};
    for (const k in P) inv[P[k]] = k;
    XL = {
      f,
      fi: Object.fromEntries(Object.entries(f).map(([k, v]) => [v, +k])),
      P,
      inv,
      W,
      Wi: Object.fromEntries(Object.entries(W).map(([k, v]) => [v, k])),
      re: new RegExp('\\b\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}(?:\\.\\d{1,3})?\\b' + (keys.length ? '|' + keys.join('|') : ''), 'g')
    };
    return true
  }
  let SCHOOL = JSON.parse(JSON.stringify(DEFAULT_SCHOOL));
  // 預設學校的 IP 換成目前學校的
  function trIP(t) {
    const x = t.split('.'),
      p = x.slice(0, 3).join('.');
    if (XL.W[t]) return XL.W[t];
    if (x.length === 3) return XL.P[p] || t;
    const q = XL.P[p];
    if (!q) return t;
    return q + '.' + (p === NET ? XL.f[+x[3]] : x[3])
  }
  const tr = t => {
    t = String(t);
    return XL && !(LV && LV.noTr) ? t.replace(XL.re, m => /^\d/.test(m) ? trIP(m) : XL.W[m]) : t
  };
  // 反過來：學員在終端機打的（目前學校的）位址換回預設學校，才能對到關卡的選單。對不到的預設位址故意弄壞，免得打錯的位址剛好通過
  function untr(t) {
    if (!XL) return t;
    return String(t).replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, m => {
        const x = m.split('.'),
          p = x.slice(0, 3).join('.');
        if (XL.Wi[m]) return XL.Wi[m];
        if (XL.inv[p]) return XL.inv[p] + '.' + (XL.inv[p] === NET ? XL.fi[+x[3]] : x[3]);
        return trIP(m) !== m ? '0.0.0.' + x[3] : m
      })
      .replace(new RegExp(Object.keys(XL.Wi).filter(k => !isIP(k)).sort((x, y) => y.length - x.length).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') || '$^', 'g'), m => XL.Wi[m])
  }
  const host = h => XL ? XL.f[h] : h;
  const sp = t => tr(t).replace(/([\u3400-\u9fff])([A-Za-z0-9])/g, '$1 $2').replace(/([A-Za-z0-9])([\u3400-\u9fff])/g, '$1 $2');
  const el = (t, a, p, txt) => {
    const e = document.createElementNS(NS, t);
    for (const k in a) e.setAttribute(k, a[k]);
    if (txt != null) e.textContent = sp(txt);
    if (p) p.appendChild(e);
    return e
  };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

