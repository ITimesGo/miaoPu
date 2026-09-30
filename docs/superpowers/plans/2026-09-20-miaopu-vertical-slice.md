# 喵圃竖切片 Implementation Plan

> **For agentic workers:** 按任务顺序实现。用户要求本地跑通、不考虑 git 提交，跳过所有 commit 步骤。

**Goal:** 桌面浏览器可运行的斜俯视单岛场景：区域占位 + 日夜/种田/港口贸易/猫 AI/四季的竖切片骨架先从「能看见岛」开始。

**Architecture:** Game Core（Zustand）与 R3F Presentation / React UI 分离；唯一 `WorldScene` 含多区域。

**Tech Stack:** Vite, React, TypeScript, three, @react-three/fiber, @react-three/drei, zustand

---

### Task 0: 脚手架可运行

- Create: `package.json`, `vite.config.ts`, `tsconfig*.json`, `index.html`, `src/main.tsx`, `src/App.tsx`
- [ ] 安装依赖并 `npm run dev` 看到 Canvas

### Task 1: 岛底板 + 斜俯视相机

- Create: `src/scenes/shared/Camera.tsx`, `src/scenes/shared/Lights.tsx`, `src/scenes/WorldScene.tsx`
- [ ] 可平移缩放看岛

### Task 2: 区域占位

- Create: `src/scenes/zones/*`（Cottage, Farm, Path, Harbor, Nature）
- [ ] 一眼能认出小屋/田/路/港/山树

### 后续（本会话可继续）

- Task 3+: store 日夜、农田、商店、猫 AI、季节、localStorage（见设计文档 §6）
