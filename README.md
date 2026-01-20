# 定制新年祝福页面
这是一个新年祝福页面，输入朋友的名字之后即可生成对应的自定义祝福页面，并支持分享功能。
支持部署在阿里云ESA Page上，完全免费即可生成专属的祝福页面哦~

Demo：https://celebrate.7tianjiao.cn/
![](https://img.alicdn.com/imgextra/i3/O1CN01H1UU3i1Cti9lYtFrs_!!6000000000139-2-tps-7534-844.png)



# 1.如何使用：
1. 访问根目录，输入朋友名字：
![img.png](images/img.png)
2. 点击生成，复制链接，比如：http://celebrate.7tianjiao.cn/?name=5byg5LiJ
3. 让朋友访问该链接，即可看到自定义的祝福页面


# 2.想要自定义？
1. 克隆此项目
```bash
git clone https://github.com/7tianjiao/celebrate.git
```

2. 安装依赖
```bash
cd celebrate
npm install
```

3. 修改BGM：替换public/bgm.mp3

4. 本地运行
```bash
npm start
```
访问 http://localhost:3000 即可查看效果

5. 自定义名字祝福
访问 http://localhost:3000/greet/你的名字 即可生成专属祝福页面


# 3.项目命令
```bash
# 安装依赖
npm install

# 开发模式运行
npm run dev

# 启动生产服务器
npm start


```


# 4.部署到阿里云 ESA Page
1. Fork 本项目到你的 GitHub 账号

2. 在阿里云 ESA Page 创建新应用，导入你的 GitHub 仓库

3. 配置构建信息：
   - 构建命令：`npm run build`（或留空）
   - 输出目录：`./public`

4. 部署完成后，即可访问你的专属祝福页面


# 5.项目结构
```
.
├── public/              # 静态资源目录
│   ├── index.html      # 主页面
│   ├── script.js       # 粒子特效脚本
│   └── bgm.mp3         # 背景音乐
├── images/             # 图片资源
├── server.js           # Express 服务器
├── package.json        # 项目配置
└── README.md           # 项目说明
```


# 6.技术栈
- 前端：HTML5 + Canvas + JavaScript
- 后端：Node.js + Express
- 部署：阿里云 ESA Page
- 特效：粒子动画系统
