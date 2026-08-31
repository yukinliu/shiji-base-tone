# 识己 · 神话原型

一款免费、公开的自我探索 H5。用户通过 18 个现实选择看见与自己最接近的神话原型，再以出生时空绘制生命底色，得到四维原型轮廓、核心价值链、核心命题与行动启示。


## 隐私说明

全部计算在浏览器内完成，不上传出生信息、答案或报告，也不要求注册。正常完成或重新开始后会清除本次填写。


## 本地开发

```bash
npm ci
cp .env.example .env.local
npm run dev
```

## 构建与发布

```bash
npm run build:github
```

静态站输出到 `out/`。GitHub Actions 构建时会自动使用 `/shiji-base-tone` 路径前缀；绑定独立域名时应在非 Actions 环境构建，或将 `next.config.ts` 中的路径逻辑改为域名根路径。
