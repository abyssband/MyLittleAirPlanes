---
description: 新增 2D 精靈動畫角色的完整工法
---

# 新增角色工法

## 1. 生成基準圖（fly_1）
- 使用 `generate_image` 生成第一張飛行姿態精靈圖
- 綠幕背景 `#00FF00`，kawaii chibi 風格
- **此圖為所有後續幀的造型基準**（服裝、配件、比例必須鎖定）

## 2. 以基準圖為參考，生成 20 張精靈圖
每張都必須傳入 fly_1 作為 `ImagePaths` 參考，並在 prompt 中強調 **SAME CHARACTER / EXACT same art style**

| 動畫狀態 | 幀數 | 說明 |
|---------|------|------|
| `fly_1` ~ `fly_5` | 5 | 飛行翅膀拍動循環 |
| `ascend_1` ~ `ascend_5` | 5 | 往上爬升，身體傾斜向上 |
| `descend_1` ~ `descend_5` | 5 | 下降俯衝，身體傾斜向下 |
| `happy` | 1 | 吃到金幣歡呼表情 |
| `hit` | 1 | 被撞到痛苦表情 |
| `crash` | 1 | HP 歸零墜毀暈眩 |
| `land_success` | 1 | 著陸成功歡呼 |
| `land_fail` | 1 | 落地失敗狼狽 |

### ⚠️ 關鍵注意事項
- **每一幀都必須傳入 fly_1 當參考圖**，否則角色造型會不一致（例如帽子消失）
- Prompt 中必須列出角色的所有固定辨識特徵（帽子、護目鏡、圍巾等）
- 只改變姿態和表情，不改變角色的穿著和配件

## 3. Python 去背 + 統一裁切
// turbo
```bash
python3 /tmp/process_[character]_sprites.py
```

處理腳本要做的事：
1. 縮放到 1024×1024
2. 綠幕去背（`remove_green_pixels`，閾值 100）
3. 計算 20 張的 **統一邊界框（union bounding box）**
4. 以統一中心點裁切，加 8% padding
5. 強制為正方形
6. 縮放到 512×512 輸出至 `assets/sprites/`

### ⚠️ 統一邊界框很重要
- 所有幀共用同一個裁切框，角色才不會在動畫中抖動位移
- 不能每張單獨 getbbox 裁切

## 4. 更新程式碼
1. **`SpriteModel2D.js`** — prefix 直接用 characterType（已支持任意名稱）
2. **`Plane.js`** — characterType 直接傳入 SpriteModel2D
3. **`WorldMapScene.js`** — 新增角色卡片：
   - `_loadCharacterImages()` 加入 card/idle 圖片
   - `chars` 陣列加入新角色資料
   - 調整卡片佈局（2 卡 → 3 卡時修改 cardW/gap/totalW）
   - 新增 click 偵測區域

## 5. 驗證
- 瀏覽器檢查：角色選擇、飛行動畫、上升/下降、撞擊/著陸
- 確認動畫連續性（不閃爍、不跳動）
- 確認 console 無 JS 錯誤
// turbo
```bash
cd /Users/abyss/Documents/Projects/MyLittleAirPlanes && git add -A && git commit -m "message" && git push
```
