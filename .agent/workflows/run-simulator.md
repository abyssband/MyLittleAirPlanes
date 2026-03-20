---
description: 啟動 MyLittleAirPlanes Web 遊戲開發伺服器
---

# 🚀 Run Simulator — 啟動開發伺服器

## 啟動 HTTP 伺服器

// turbo
```bash
cd /Users/abyss/Documents/Projects/MyLittleAirPlanes
lsof -ti:8080 | xargs kill -9 2>/dev/null; python3 -m http.server 8080
```

## 開啟遊戲

// turbo
```bash
open http://localhost:8080/index.html
```

## 開啟 Sprite 動畫預覽器

// turbo
```bash
open http://localhost:8080/preview.html
```
