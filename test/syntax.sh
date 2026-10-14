#!/bin/sh
# 抽出成品的 <script> 內容用 node --check 做語法檢查，錯誤會帶行號
cd "$(dirname "$0")/.." && node -e "
const fs=require('fs');const h=fs.readFileSync('出稿/新北網管小學堂.html','utf8');const i=h.indexOf('<script>')+8,j=h.lastIndexOf('</script>');fs.writeFileSync('test/_bundle.js',h.slice(i,j));" && node --check test/_bundle.js && echo "syntax ok"
