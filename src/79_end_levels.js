  ];
  /* 關卡用 key 互相參照，用 no 存檔。no 固定不變、不可重複使用 */
  const LVK = {}, BYNO = {};
  LEVELS.forEach(l => { if (LVK[l.key] || BYNO[l.no]) throw new Error('關卡 key 或 no 重複：' + l.key); LVK[l.key] = l; BYNO[l.no] = l });
  function lvk(k) { if (!LVK[k]) throw new Error('沒有這一關：' + k); return LVK[k] }
