// 守門用：每關的解法（回傳 apply() 事件序列），只在測試時注入，不進成品
window.__sol = {
  'words': (L, D) => Object.keys(D).filter(k => k[0] === 'e').flatMap(id => [['d', id], ['b', D[id].row[2]]]).concat([['t']]),
  'pro': (L, D) => ['e1','e2','e3','e4','e5'].flatMap(id => [['d', id], ['b', L.O[L.C[D[id].call][2]]]]).concat([['t']]),
  'tour': (L, D) => L.R.flatMap(r => [['d', r[0]], ['b', L.O[L.ans(r)]]]).concat([['t']]),
  'rack': (L, D) => ['l3','core','old','radar'].flatMap(id => [['d', id], ['b', L.ROLES[L.ANS[id]]]]).concat([['t']]),
  '1-1': () => [['k','utp'],['c','pc.nic','sw.p1'],['k','fiber'],['c','sw.s1','aggr.s2'],['t']],
  '1-2': () => [['k','utp'],['c','pc.nic','sw.p1'],['k','jump'],['c','sw.s1','box.p'],['c','term.b203','aggr.s2'],['t']],
  '1-3': () => [['k','dac'],['c','l3.s1','core.s1'],['k','lr'],['m','core.s2'],['m','b1.sfp'],['m','core.s3'],['m','b2.sfp'],['k','smf'],['c','core.s2','b1.sfp'],['c','core.s3','b2.sfp'],['t']],
  '1-4': (L) => [['d','sign'],['d',L.outlet],['c','ap1.p','sw.p1'],['c','ap2.p','sw.p2'],['c','cam.p','sw.p3'],['c','phone.p','sw.p4'],['c','sign.p','sw.p5'],['c','pc.nic','sw.p6'],['t']],
  '1-5': () => [['c','core.s2','da.up'],['c','core.s3','db.up'],['c','da.d1','a1.up'],['c','da.d2','a2.up'],['c','db.d1','b1.up'],['c','db.d2','b2.up'],['t']],
  '1-6': () => ['core','da','db'].flatMap(id => [['d', id], ['f','psu1','迴路 1（UPS）'], ['f','psu2','迴路 2（市電）'], ['b','關閉']]).concat([['c','da.up','core.s2'],['c','da.up2','core.s3'],['c','db.up','core.s4'],['c','db.up2','core.s5'],['t']]),
  't1': (L, D, cables) => {
    const B = L.bld.toLowerCase(), ev = [];
    if (L.cause === 'cut') { const i = cables.findIndex(c => c.broken); const c = cables[i]; ev.push(['s', i], ['b', '拔掉這條線'], ['c', c.a, c.b]) }
    else ev.push(['d', 'd' + B], ['b', L.cause === 'nopower' ? '檢查電源線與插座' : '重新開機']);
    ev.push(['t']); return ev
  }
};
Object.assign(window.__sol, {
  '2-1': (L, D, cables) => { const i = cables.findIndex(c => c.a.startsWith(L.t + '.') || c.b.startsWith(L.t + '.')); return [['s', i], ['b', '拔掉這條線'], ['t']] },
  '2-2': (L) => ['e1','e2','e3','e4','e5'].flatMap(id => [['k', 'v' + L.want[id]], ['v', 'sw.p' + L.port[id]]]).concat([['t']]),
  '2-3': (L, D, cables) => { const f = ['e1','e2','e3'].find(id => D[id].forced); if (f) return [['d', f], ['b', '改成自動協商'], ['t']]; const i = cables.findIndex(c => c.slow); const c = cables[i]; return [['s', i], ['b', '拔掉這條線'], ['c', c.a, c.b], ['t']] },
  '2-4': () => [['s', 2], ['b', '拔掉這條線'], ['s', 1], ['b', '拔掉這條線'], ['s', 0], ['b', '拔掉這條線'], ['c', 'ap.p', 'sw.p1'], ['c', 'pc.nic', 'sw.p2'], ['t']],
  't2': (L, D, cables) => { const i = cables.findIndex(c => c.rogue); return [['s', i], ['b', '拔掉這條線'], ['t']] },
  '3-1': (L) => [['d', 'e1'], ['f', 'ip', L.devs.e2.sub.replace(/\.\d+$/, '.60')], ['f', 'mask', '255.255.255.0'], ['f', 'gw', L.devs.e2.sub.replace(/\.\d+$/, '.254')], ['b', '關閉'], ['t']],
  '3-2': (L, D) => ['e1','e2','e3','e4','e5'].flatMap(id => [['d', id], ['b', L.local(D[id].ip) ? '直接送（同一個網段）' : '交給閘道（不同網段）']]).concat([['t']]),
  '3-3': (L, D, cables) => {
    const ev = [], gw = L.devs.e1.ipv ? L.devs.e1.ipv.replace(/\.\d+$/, '.254') : null;
    if (L.cause === 'loose') { const i = cables.findIndex(c => c.broken); const c = cables[i]; ev.push(['s', i], ['b', '拔掉這條線'], ['c', c.a, c.b]) }
    if (L.cause === 'pool') ev.push(['d', 'l3'], ['b', '擴大可發放範圍']);
    if (L.cause === 'vlan') ev.push(['d', 'sw'], ['b', '把所有埠改回 VLAN 20']);
    if (L.cause === 'relay') ev.push(['d', 'aggr'], ['b', '把 DHCP Relay 指向校端 L3（' + (D.e1.ipv || D.e2.ipv || D.e3.ipv || '10.213.250.101').replace(/\.\d+$/, '.254') + '）']);
    for (const id of ['e1','e2','e3']) if (D[id].noip) ev.push(['d', id], ['b', '重新領 IP（ipconfig /renew）']);
    ev.push(['t']); return ev
  },
  '3-4': (L, D, cables) => { const i = cables.findIndex(c => c.a.startsWith(L.rogue + '.') || c.b.startsWith(L.rogue + '.')); const ev = [['s', i], ['b', '拔掉這條線']]; for (const id of ['e1','e2','e3']) if (D[id].bad) ev.push(['d', id], ['b', '重新領 IP（ipconfig /renew）']); ev.push(['t']); return ev },
  '3-5': () => [['d', 'aggr'], ['b', '備份目前設定'], ['d', 'l3'], ['b', '備份目前設定'], ['d', 'l3'], ['b', '修改 VLAN 20 介面'], ['f', 'vl20', '停用'], ['b', '關閉'], ['t']],
  't3': (L, D) => { const ids = ['e1','e2','e3','e4']; const gw = D.e1.cfg.gw === D.e2.cfg.gw ? D.e1.cfg.gw : D.e3.cfg.gw; const net = gw.replace(/\.\d+$/, ''); const i = ids.findIndex((id, n) => { const c = D[id].cfg; return c.gw !== gw || c.mask !== '255.255.255.0' || c.ip !== net + '.6' + (n + 1) }); const id = ids[i], c = D[id].cfg, k = c.gw !== gw ? ['gw', gw] : c.mask !== '255.255.255.0' ? ['mask', '255.255.255.0'] : ['ip', net + '.6' + (i + 1)]; return [['d', id], ['f', k[0], k[1]], ['b', '關閉'], ['t']] }
});
Object.assign(window.__sol, {
  '4-1': (L, D) => { const good = L.devs.e1.cfg.dns === '1.2.3.4' ? '163.20.1.1' : '163.20.1.1'; return [['d','e1'],['b','nslookup www.google.com'],['d','e1'],['b','修改 DNS 設定'],['f','dns',good],['b','關閉'],['t']] },
  '4-2': (L) => { const sc = L.sc, V = '只允許廠商的 IP', w = sc.web ? '允許' : '拒絕'; return [['d','l3'],['f','p80',w],['f','p443',w],['f','p22',sc.ssh?V:'拒絕'],['f','p23','拒絕'],['f','p3389',sc.rdp?V:'拒絕'],['f','other','拒絕'],['b','關閉'],['t']] },
  't4a': (L, D) => { const net = D.l3.cfg.end.replace(/\.\d+$/, ''); if (L.cause === 'pool') return [['d','l3'],['b','修改 DHCP 設定'],['f','end',net+'.200'],['b','關閉'],['d','e2'],['b','重新領 IP'],['t']]; if (L.cause === 'dhcpdns') return [['d','l3'],['b','修改 DHCP 設定'],['f','dns','163.20.1.1'],['b','關閉'],['d','e2'],['b','重新領 IP'],['t']]; return [['d','e2'],['b','網路介面卡設定'],['f','mode','自動取得'],['b','關閉'],['t']] },
  't4b': (L) => L.orig === 'dns' ? [['d','e2'],['b','修改 DNS 轉送'],['f','fwd','163.20.1.1'],['b','關閉'],['t']] : [['d','l3'],['b','修改存取控制規則'],['f','r105','停用'],['b','關閉'],['t']],
  '5-1': (L) => ['e1','e2','e3','e4','e5'].flatMap(id => [['d', id], ['f','ssid',L.want[id][0]], ['f','band',L.want[id][1] || '5 GHz'], ['b','關閉']]).concat([['t']]),
  '5-2': () => [['e1','1'],['e2','6'],['e3','11']].flatMap(([id, ch]) => [['d', id], ['f','ch',ch], ['f','pos','天花板中央'], ['b','關閉']]).concat([['t']]),
  '5-3': () => [['s',0],['b','拔掉這條線'],['c','ap.p','sw.p1'],['d','sw'],['f','p1','Trunk（放行 30、100、200）'],['b','關閉'],['t']],
  't5': (L) => L.cause === 'guest' ? [['d','e2'],['b','改連 YHPS-Teacher'],['t']] : L.cause === 'auth' ? [['d','e2'],['b','在登入頁輸入學校帳號'],['t']] : [['d','sw'],['b','把 VLAN 200 加進 Trunk'],['d','e2'],['b','重新領 IP'],['t']]
});
Object.assign(window.__sol, {
  '6-1': (L, D) => ['e1','e2','e3','e4','e5','e6'].flatMap(id => [['d', id], ['b', L.O[D[id].row[7]]]]).concat([['t']]),
  '6-2': (L, D) => Object.keys(D).flatMap(id => [['d', id], ['b', L.O[L.ans(id)]]]).concat([['t']]),
  '6-3': (L, D) => ['e1','e2','e3','e4','e5','e6'].flatMap(id => [['d', id], ['b', L.O[D[id].row[2]]]]).concat([['t']]),
  '6-4': () => [['d','aggr'],['b','比對目前設定與最新備份'],['d','aggr'],['b','還原到最新備份（上週日）'],['t']],
  '6-5': (L) => ['s1','s2','s3'].flatMap(id => [['d', id], ['b', id === L.bad ? '退化' : '正常']]).concat([['t']]),
  '6-6': (L) => ['l3','sw'].flatMap(id => [['d', id], ...Object.entries(L.GOOD[id]).map(([k, v]) => ['f', k, v]), ['b','關閉']]).concat([['t']]),
  't6': (L, D) => { const gw = D.e1.sub.replace(/\.\d+$/, '.254'); return [['d','e1'],['b','ping 閘道 ' + gw],['d','e1'],['b','ping 8.8.8.8'],['d','e1'],['b','ping 教網 DNS'],['d','e1'],['b','tracert 教網 DNS'],['d','e2'],['f','scope','全校'],['f','gw','通'],['f','dns','不通'],['f','hop','第 ' + L.hop + ' 站之後'],['f','who','教育網路中心'],['b','關閉'],['t']] }
});
Object.assign(window.__sol, {
  '7-1': (L, D, cables) => {
    const ev = [], net = D.e2.sub.replace(/\.\d+$/, '');
    if (L.cause === 'loose') { const c = cables[0]; ev.push(['s', 0], ['b', '拔掉這條線'], ['c', c.a, c.b], ['d', 'e1'], ['b', '重新領 IP']) }
    if (L.cause === 'vlan') ev.push(['d', 'sw'], ['b', '修改埠的 VLAN'], ['f', 'p1', 'VLAN 20'], ['b', '關閉'], ['d', 'e1'], ['b', '重新領 IP']);
    if (L.cause === 'pool') ev.push(['d', 'l3'], ['b', '修改 DHCP 設定'], ['f', 'end', net + '.200'], ['b', '關閉'], ['d', 'e1'], ['b', '重新領 IP']);
    if (L.cause === 'dns') ev.push(['d', 'l3'], ['b', '修改 DHCP 設定'], ['f', 'dns', '163.20.1.1'], ['b', '關閉'], ['d', 'e1'], ['b', '重新領 IP']);
    if (L.cause === 'rule') ev.push(['d', 'l3'], ['b', '修改存取控制規則'], ['f', 'r105', '停用'], ['b', '關閉']);
    ev.push(['t']); return ev
  },
  '7-2': (L, D) => { const C = L.CASES[L.k], gw = D.e1.sub.replace(/\.\d+$/, '.254'); return [['d','e1'],['b','ping 閘道 ' + gw],['d','e1'],['b','ping 8.8.8.8'],['d','e1'],['b','tracert 教網 DNS'],['d','e1'],['b','看教室端的燈'],['d','l3'],['b','查看智慧網管系統告警'],['d','e2'],['f','scope','全校'],['f','gw',C.gw?'通':'不通'],['f','ext','不通'],['f','hop',C.hop],['f','who',C.who],['b','關閉'],['t']] },
  '7-3': () => null
});
