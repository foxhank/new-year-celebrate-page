# 新年祝福粒子特效网页

一个炫酷的新年祝福网页，粒子从四面八方汇聚形成文字。

## 功能特点

- 通过 URL 传入名字参数显示个性化祝福
- 粒子从屏幕边缘汇聚形成文字
- 简洁的拖尾效果
- 渐变紫色背景

## 安装和运行

1. ��装依赖：
```bash
npm install
```

2. 启动服务器：
```bash
npm start
```

3. 访问网页：
   - 默认页面：http://localhost:3000
   - 个性化祝福：http://localhost:3000/greet/你的名字

例如：
- http://localhost:3000/greet/张三
- http://localhost:3000/greet/小明

## 项目结构

```
网页/
├── server.js           # Express 服务器
├── package.json        # 项目配置
├── public/
│   ├── index.html      # 主页面
│   └── script.js       # 粒子动画逻辑
└── README.md          # 说明文档
```

## 技术栈

- Node.js + Express
- HTML5 Canvas
- 原生 JavaScript
