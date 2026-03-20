---
description: 新增 2D 精靈動畫角色的完整工法 — 從概念原畫到單張輸出、質心對齊、Atlas 打包
---

# /create-character

完整的 Skill 文件在 `.agent/skills/create-character/SKILL.md`。

本 workflow 是該 Skill 的快速入口。詳細步驟、提示詞模板、踩坑記錄請參考 Skill 文件。

## 快速流程

1. **生成概念原畫** — 1 張定裝照
2. **逐張生成 24 張圖** — 6 幀 × 4 組（fly/ascend/descend/states）
3. **重命名** — `[character]_fly_1.png` 格式
4. **處理** — `python3 process_sprites.py --character [character] --atlas`
5. **驗證** — `http://localhost:8080/preview.html`
