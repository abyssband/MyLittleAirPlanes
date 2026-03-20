---
name: create-character
description: 新增 2D 精靈動畫角色的完整工法 — 從概念原畫到單張輸出、質心對齊、Atlas 打包
---

# 🎨 Create Character — 2D Sprite Animation Pipeline

將一個角色從「概念原畫」推進到「遊戲中可播放的完整動畫 Atlas」。

> [!IMPORTANT]
> 本 Skill 使用**單張高解析度輸出 + 質心對齊後處理**，不使用 Sprite Sheet。
> 原因：Sprite Sheet 中角色位置不可控，導致中心點飄移。


---

## 一、必備環境

| 項目 | 路徑 |
|------|------|
| 專案根目錄 | `/Users/abyss/Documents/Projects/MyLittleAirPlanes` |
| AI 原稿暫存 | 當前對話的 Brain 目錄 |
| 最終輸出 | `assets/sprites/` |
| 動畫設定 | `assets/data/config.json` |
| 處理腳本 | `process_sprites.py`（含質心對齊） |
| Python 套件 | `Pillow`, `numpy` |


---

## 二、步驟 1 — 概念原畫 (Concept Art)

為角色生成 1 張「定裝照」，作為後續所有圖的唯一參考。

### Prompt 模板

```
A high-resolution watercolor painting of a kawaii chibi [ANIMAL] character.
[DESCRIPTION: helmet, goggles, scarf, etc.]
Standing pose, facing slightly to the right.
Fully colored, soft warm lighting, storybook illustration style.
Crisp clean outer edges. Solid bright green (#00FF00) background.
```

### 呼叫方式

```python
generate_image(
    ImageName="[character]_final_concept",
    Prompt="...",
)
```

> [!IMPORTANT]
> 這張概念原畫是後續所有圖的「唯一參考」。
> 每次 `generate_image` 都必須在 `ImagePaths` 帶入此圖！


---

## 三、步驟 2 — 逐張生成 24 張單圖

### 核心原則

1. **每次只生成 1 張** — 整張 640×640 給單一角色，自然居中
2. **偶數幀** — 每組動畫 6 幀
3. **綠幕** — 純綠 `#00FF00` 背景
4. **帶入概念原畫** — `ImagePaths=[概念原畫路徑]`

### 框架

需要產出 **24 張圖**，分為 4 組：

| 組 | 名稱 | 幀名 | 數量 |
|----|------|------|------|
| A | 平飛 fly | `fly_1` ~ `fly_6` | 6 |
| B | 爬升 ascend | `ascend_1` ~ `ascend_6` | 6 |
| C | 俯衝 descend | `descend_1` ~ `descend_6` | 6 |
| D | 狀態 states | `happy, hit, crash, land_success, land_fail, idle` | 6 |

### Prompt 模板 — 飛行動畫 (A/B/C 組)

```
A single game sprite of a kawaii chibi [ANIMAL] character wearing [ACCESSORIES].
Pose: Flying [DIRECTION] with [PAW_POSITION].
The character MUST be PERFECTLY CENTERED in the image with equal spacing on all sides.
The character should occupy about 70% of the image area.
Watercolor painting style, storybook illustration.
Crisp clean outer edges.
The background MUST be completely solid uniform bright green (#00FF00).
No splatters.
```

#### DIRECTION 對應表

| 組 | DIRECTION |
|----|-----------|
| fly | horizontally like Superman |
| ascend | upward diagonally, body tilted up |
| descend | downward diagonally, body tilted down |

#### PAW_POSITION 6 幀循環

| 幀 | PAW_POSITION |
|----|--------------|
| 1 | paws stretched forward |
| 2 | paws angled slightly up |
| 3 | paws raised high above head |
| 4 | paws at peak height |
| 5 | paws pushing down forcefully |
| 6 | paws tucked low close to body |

### Prompt 模板 — 狀態 (D 組)

```
A single game sprite of a kawaii chibi [ANIMAL] character wearing [ACCESSORIES].
Pose: [STATE_DESCRIPTION].
The character MUST be PERFECTLY CENTERED in the image with equal spacing on all sides.
The character should occupy about 70% of the image area.
Watercolor painting style, storybook illustration.
Crisp clean outer edges.
The background MUST be completely solid uniform bright green (#00FF00).
No splatters.
```

#### STATE_DESCRIPTION 對照表

| 名稱 | STATE_DESCRIPTION |
|------|-------------------|
| `happy` | Cheering with arms raised, big joyful smile |
| `hit` | Recoiling in surprise, eyes wide open |
| `crash` | Sitting dizzy with swirly spiral eyes |
| `land_success` | Standing confident, one paw up thumbs up |
| `land_fail` | Sitting embarrassed, sweat drops |
| `idle` | Standing neutral, slight smile |

### 命名規則

生成後必須重命名：
```
[character]_fly_1.png, [character]_ascend_3.png, [character]_happy.png ...
```

### 重命名腳本

生成後用此腳本批次重命名：

```bash
BRAIN="[brain_dir_path]"
CHAR="[character]"

# 飛行組
for i in 1 2 3 4 5 6; do
  src=$(ls -t ${BRAIN}/${CHAR}_s_fly${i}_*.png 2>/dev/null | head -1)
  [ -n "$src" ] && mv -f "$src" "${BRAIN}/${CHAR}_fly_${i}.png"
done

# 爬升/俯衝 同理
for group in ascend descend; do
  for i in 1 2 3 4 5 6; do
    src=$(ls -t ${BRAIN}/${CHAR}_s_${group}${i}_*.png 2>/dev/null | head -1)
    [ -n "$src" ] && mv -f "$src" "${BRAIN}/${CHAR}_${group}_${i}.png"
  done
done

# 狀態組
for state in happy hit crash land_success land_fail idle; do
  src=$(ls -t ${BRAIN}/${CHAR}_s_${state}_*.png 2>/dev/null | head -1)
  [ -n "$src" ] && mv -f "$src" "${BRAIN}/${CHAR}_${state}.png"
done
```


---

## 四、步驟 3 — 質心對齊 + 去背 + Atlas 打包

// turbo
```bash
cd /Users/abyss/Documents/Projects/MyLittleAirPlanes
python3 -u process_sprites.py --character [character] --atlas
```

> [!TIP]
> **不要加 `--no-align`！** 新的 `align_images_centroid` 是 O(1) 瞬間完成。

### 腳本做的事

1. 從 Brain 目錄讀取 24 張 `[character]_*.png`
2. 移除綠幕背景（含 green spill suppression）
3. **質心對齊**：計算 alpha 通道質心 → 平移到統一位置
4. 統一裁切框
5. 輸出 24 張 PNG 到 `assets/sprites/`
6. 打包 `[character]_atlas.png` + `[character]_atlas.json`

### 質心對齊演算法簡述

```
對每張圖的 alpha 通道：
  centroid_x = Σ(x × alpha) / Σ(alpha)
  centroid_y = Σ(y × alpha) / Σ(alpha)

target = 所有圖的 centroid 平均值
shift = target - each_centroid  → Image.AFFINE 平移
```


---

## 五、步驟 4 — 更新 config.json

確保動畫序列使用 **6 幀 ping-pong**：

```json
{
  "animations": {
    "fly":     { "frames": ["fly_1","fly_2","fly_3","fly_4","fly_5","fly_6","fly_5","fly_4","fly_3","fly_2"], "speed": 0.10 },
    "ascend":  { "frames": ["ascend_1","ascend_2","ascend_3","ascend_4","ascend_5","ascend_6","ascend_5","ascend_4","ascend_3","ascend_2"], "speed": 0.12 },
    "descend": { "frames": ["descend_1","descend_2","descend_3","descend_4","descend_5","descend_6","descend_5","descend_4","descend_3","descend_2"], "speed": 0.14 },
    "happy":   { "frames": ["happy"], "speed": 0.3 },
    "hit":     { "frames": ["hit"], "speed": 0.5 },
    "crash":   { "frames": ["crash"], "speed": 0.5 },
    "land_success": { "frames": ["land_success"], "speed": 0.5 },
    "land_fail":    { "frames": ["land_fail"], "speed": 0.5 },
    "idle":         { "frames": ["idle"], "speed": 0.5 }
  }
}
```


---

## 六、步驟 5 — 預覽驗證

// turbo
```bash
open http://localhost:8080/preview.html
```

### 品管 Checklist

- ✅ 角色中心點穩定不跳動
- ✅ 動作流暢連續
- ✅ 邊緣乾淨無綠色殘留
- ✅ 水彩風格一致
- ✅ 各動畫狀態切換正常


---

## 七、現有角色清單

| key | 中文 | 英文 | emoji | 配件 |
|-----|------|------|-------|------|
| `cat` | 小橘 | Ginger Cat | 🐱 | brown aviator helmet with goggles and red scarf |
| `panda` | 胖達 | Panda | 🐼 | brown aviator helmet with goggles and red scarf |
| `labrador` | 旺財 | Labrador | 🐕 | brown aviator helmet with goggles and red scarf |
| `rabbit` | 棉花 | Rabbit | 🐰 | brown aviator helmet with goggles and red scarf |


---

## 八、流程圖

```
概念原畫 → 逐張生成 24 張 → 重命名 → process_sprites.py → config.json → 預覽驗證
   ↑                                        (質心對齊+去背+Atlas)
   └── 所有生成都帶入此圖作為參考
```


---

## 九、踩坑記錄 & 經驗法則

| 問題 | 原因 | 解法 |
|------|------|------|
| 角色中心點跳動 | Sprite Sheet 每格位置不同 | 改用單張輸出 + 質心對齊 |
| 動畫沸騰（忽大忽小） | 每張圖獨立生成 | 帶入概念原畫參考 + 質心對齊補償 |
| 綠色殘留邊緣 | 去背不夠乾淨 | `process_sprites.py` 內建 spill suppression |
| 風格混用 | 提示詞缺少水彩關鍵字 | 統一使用「watercolor + crisp edges」模板 |
| AI 產格數錯誤 | 要求 Sprite Sheet | 改用單張輸出，完全避開 |
| 生成額度用完 | 一次生成太多 | 分批生成，每批 5 張並行 |

> [!WARNING]
> `generate_image` API 有每日額度限制。24 張圖會消耗大量額度。
> 建議：一次最多並行 5 張，分 5 批完成一隻角色。
> 如果額度用完，等待重置後在下次對話中繼續（用此 Skill 就能無縫接續）。
