// Base64 编码/解码工具
function encodeName(name) {
    return btoa(unescape(encodeURIComponent(name)));
}

function decodeName(encoded) {
    return decodeURIComponent(escape(atob(encoded)));
}

// 获取 URL 参数
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    const encoded = urlParams.get(name);
    if (encoded) {
        try {
            return decodeName(encoded);
        } catch (e) {
            return '朋友';
        }
    }
    return null;
}

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let particles = [];
let animationId;
let allTargets = [];
let particlesToAdd = [];
let spawnIndex = 0;
let spawnInterval;
let phase = 'gathering'; // gathering, scattering, complete
let phaseStartTime = 0;
let gatheringCompleteTime = 0;
let dialogZIndex = 100;

// 获取名字参数
const name = getUrlParameter('name');

// 如果没有名字参数，显示生成页面
if (!name) {
    showGeneratorPage();
}

// 设置画布大小
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', () => {
    resizeCanvas();
    init();
});

// 粒子类
class Particle {
    constructor(startX, startY, targetX, targetY) {
        this.x = startX;
        this.y = startY;
        this.targetX = targetX;
        this.targetY = targetY;
        this.size = Math.random() * 2 + 1.5;

        // 随机速度
        this.speedX = (Math.random() - 0.5) * 0.5;
        this.speedY = (Math.random() - 0.5) * 0.5;

        // 拖尾历史
        this.trail = [];
        this.maxTrail = 10;

        // 颜色
        const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#A8E6CF', '#FF8B94', '#DDA0DD'];
        this.color = colors[Math.floor(Math.random() * colors.length)];
    }

    update() {
        // 保存当前位置到拖尾
        this.trail.push({x: this.x, y: this.y});
        if (this.trail.length > this.maxTrail) {
            this.trail.shift();
        }

        if (phase === 'gathering') {
            // 向目标位置移动 - 加快速度
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 1) {
                this.x += dx * 0.1; // 从 0.05 改为 0.1，加快汇聚速度
                this.y += dy * 0.1;
            }
        } else if (phase === 'scattering') {
            // 向四面八方散开
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const dx = this.x - centerX;
            const dy = this.y - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < Math.max(canvas.width, canvas.height)) {
                const angle = Math.atan2(dy, dx);
                const speed = 3;
                this.x += Math.cos(angle) * speed;
                this.y += Math.sin(angle) * speed;
            }
        }
    }

    draw() {
        // 绘制拖尾
        for (let i = 0; i < this.trail.length; i++) {
            const alpha = (i / this.trail.length) * 0.4;
            const size = this.size * (i / this.trail.length);
            ctx.beginPath();
            ctx.arc(this.trail[i].x, this.trail[i].y, size, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.globalAlpha = alpha;
            ctx.fill();
        }

        // 绘制粒子
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
    }
}

// 从文字创建粒子目标位置
function createTextParticles(text, startY, fontSize) {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;

    tempCtx.font = `bold ${fontSize}px "Microsoft YaHei", sans-serif`;
    tempCtx.fillStyle = 'white';
    tempCtx.textAlign = 'center';
    tempCtx.textBaseline = 'middle';
    tempCtx.fillText(text, canvas.width / 2, startY);

    const imageData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    const gap = 6; // 从 4 改为 6，增加采样间隔，减少粒子数量
    const targets = [];

    for (let y = 0; y < canvas.height; y += gap) {
        for (let x = 0; x < canvas.width; x += gap) {
            const index = (y * canvas.width + x) * 4;
            if (data[index + 3] > 128) {
                targets.push({x, y});
            }
        }
    }

    return targets;
}

// 生成随机起始位置
function getRandomStartPosition() {
    const rand = Math.random();
    let startX, startY;

    if (rand < 0.4) {
        // 40% 从边缘
        const side = Math.floor(Math.random() * 4);
        switch(side) {
            case 0: // 上
                startX = Math.random() * canvas.width;
                startY = -Math.random() * 100 - 20;
                break;
            case 1: // 右
                startX = canvas.width + Math.random() * 100 + 20;
                startY = Math.random() * canvas.height;
                break;
            case 2: // 下
                startX = Math.random() * canvas.width;
                startY = canvas.height + Math.random() * 100 + 20;
                break;
            case 3: // 左
                startX = -Math.random() * 100 - 20;
                startY = Math.random() * canvas.height;
                break;
        }
    } else {
        // 60% 从屏幕外围随机位置（更远的距离）
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.max(canvas.width, canvas.height) * 0.8 + Math.random() * 200;
        startX = canvas.width / 2 + Math.cos(angle) * distance;
        startY = canvas.height / 2 + Math.sin(angle) * distance;
    }

    return { startX, startY };
}

// 初始化
function init() {
    particles = [];
    allTargets = [];
    particlesToAdd = [];
    spawnIndex = 0;

    // 清除之前的定时器
    if (spawnInterval) {
        clearInterval(spawnInterval);
    }

    const fontSize = Math.min(canvas.width * 0.1, 100);
    const lineHeight = fontSize * 1.8;

    // 创建文字粒子目标位置
    const text1 = `${name}`;
    const text2 = `新年快乐`;

    const targets1 = createTextParticles(text1, canvas.height / 2 - lineHeight / 2, fontSize);
    const targets2 = createTextParticles(text2, canvas.height / 2 + lineHeight / 2, fontSize);

    allTargets = [...targets1, ...targets2];

    // 打乱目标顺序，让粒子随机出现
    for (let i = allTargets.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allTargets[i], allTargets[j]] = [allTargets[j], allTargets[i]];
    }

    // 逐渐添加粒子 - 加快添加速度
    spawnInterval = setInterval(() => {
        if (spawnIndex < allTargets.length) {
            // 每次添加更多粒子，加快整体速度
            const batchSize = Math.max(2, Math.floor(allTargets.length / 30));

            for (let i = 0; i < batchSize && spawnIndex < allTargets.length; i++) {
                const target = allTargets[spawnIndex];
                const { startX, startY } = getRandomStartPosition();
                particles.push(new Particle(startX, startY, target.x, target.y));
                spawnIndex++;
            }
        } else {
            clearInterval(spawnInterval);
            gatheringCompleteTime = Date.now();
        }
    }, 30); // 从 50 改为 30，加快添加频率
}

// 动画循环
function animate() {
    // 使用半透明背景实现整体拖尾效果
    ctx.fillStyle = 'rgba(102, 126, 234, 0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    particles.forEach(particle => {
        particle.update();
        particle.draw();
    });

    // 检查所有粒子是否都已到达目标位置
    if (phase === 'gathering' && spawnIndex >= allTargets.length) {
        let allArrived = true;
        for (let particle of particles) {
            const dx = particle.targetX - particle.x;
            const dy = particle.targetY - particle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > 5) { // 粒子距离目标小于5像素才算到达
                allArrived = false;
                break;
            }
        }

        if (allArrived && gatheringCompleteTime > 0) {
            const elapsed = Date.now() - gatheringCompleteTime;
            if (elapsed > 5000) { // 等待5秒后散开（从3秒改为5秒，显示更长时间）
                phase = 'scattering';
                gatheringCompleteTime = Date.now(); // 重置时间用于散开阶段
            }
        }
    }

    // 检查散开是否完成
    if (phase === 'scattering') {
        const elapsed = Date.now() - gatheringCompleteTime;
        if (elapsed > 4000) { // 4秒后散开完成，开始显示对话框
            phase = 'complete';
            startMorandiDialogs();
        }
    }

    animationId = requestAnimationFrame(animate);
}

// ============ 对话框交互逻辑 ============
const dialogOverlay = document.getElementById('dialogOverlay');
const btnYes = document.getElementById('btnYes');
const btnNo = document.getElementById('btnNo');
const canvasEl = document.getElementById('canvas');
const infoEl = document.querySelector('.info');
const bgMusic = document.getElementById('bgMusic');

// 设置音乐音量
bgMusic.volume = 0.15; // 15% 音量，更轻柔

let isButtonYesHovered = false;
let yesButtonScale = 1;
let noButtonMoving = false;
let noButtonInterval = null;

// 是按钮逐渐变大
btnYes.addEventListener('mouseenter', () => {
    isButtonYesHovered = true;
    growYesButton();
});

btnYes.addEventListener('mouseleave', () => {
    isButtonYesHovered = false;
    shrinkYesButton();
});

function growYesButton() {
    if (isButtonYesHovered && yesButtonScale < 2.5) {
        yesButtonScale += 0.05;
        btnYes.style.transform = `scale(${yesButtonScale})`;
        requestAnimationFrame(growYesButton);
    }
}

function shrinkYesButton() {
    if (!isButtonYesHovered && yesButtonScale > 1) {
        yesButtonScale -= 0.1;
        if (yesButtonScale < 1) yesButtonScale = 1;
        btnYes.style.transform = `scale(${yesButtonScale})`;
        requestAnimationFrame(shrinkYesButton);
    }
}

// 否按钮漂移
btnNo.addEventListener('mouseenter', () => {
    if (!noButtonMoving) {
        noButtonMoving = true;
        btnNo.classList.add('running');
        moveNoButton();
    }
});

function moveNoButton() {
    const maxX = window.innerWidth - btnNo.offsetWidth - 20;
    const maxY = window.innerHeight - btnNo.offsetHeight - 20;

    const newX = Math.random() * maxX;
    const newY = Math.random() * maxY;

    btnNo.style.position = 'fixed';
    btnNo.style.left = newX + 'px';
    btnNo.style.top = newY + 'px';
    btnNo.style.zIndex = '1001';
}

btnNo.addEventListener('click', () => {
    moveNoButton();
});

// 点击是按钮开始动画
btnYes.addEventListener('click', () => {
    // 隐藏对话框
    dialogOverlay.classList.add('hidden');

    // 播放背景音乐
    bgMusic.play().catch(err => {
        console.log('音乐播放失败:', err);
        // 某些浏览器需要用户交互才能播放音频
    });

    // 显示画布和信息
    setTimeout(() => {
        canvasEl.classList.add('show');
        infoEl.classList.add('show');

        // 重置阶段并开始粒子动画
        phase = 'gathering';
        phaseStartTime = 0;
        gatheringCompleteTime = 0;
        dialogZIndex = 100; // 重置对话框z-index
        init();
        animate();
    }, 500);
});

// ============ 莫兰迪对话框系统 ============
const morandiGreetings = [
    { title: "温馨提示", content: "好好爱自己，你值得所有的美好 ✨" },
    { title: "温暖提醒", content: "天冷了多穿衣服，注意保暖哦 🧣" },
    { title: "今日运势", content: "保持微笑呀，好运正在路上 😊" },
    { title: "祝福满满", content: "顺顺利利，万事如意 🌟" },
    { title: "心情日记", content: "保持好心情，每天都充满阳光 ☀️" },
    { title: "暖心时刻", content: "你是最棒的，相信自己 💪" },
    { title: "美好生活", content: "慢下来，享受生活中的小确幸 🌸" },
    { title: "元气满满", content: "新的一天，新的开始 🌈" },
    { title: "幸福提醒", content: "记得按时吃饭，照顾好自己 🍜" },
    { title: "温暖寄语", content: "所有的努力都会有回报 💎" },
    { title: "快乐密码", content: "做喜欢的事，见想见的人 💕" },
    { title: "生活贴士", content: "早点休息，不要熬夜哦 🌙" },
    { title: "幸运符", content: "好运连连，心想事成 🍀" },
    { title: "能量加油站", content: "累了就休息，别太勉强自己 ☕" },
    { title: "心灵鸡汤", content: "明天会更好，加油鸭 🎯" },
    { title: "温暖时光", content: "保持热爱，奔赴山海 🏔️" },
    { title: "美好祝愿", content: "平安喜乐，万事胜意 🎊" },
    { title: "快乐源泉", content: "做自己喜欢的事，这就是快乐 🎨" }
];

// 莫兰迪色系
const morandiColors = [
    '#A8B6C6', '#B8A9C9', '#C9B8BD', '#D4C4B7',
    '#B5C9B7', '#C9C5B5', '#D4B5C5', '#B5D4D0',
    '#C9B5A8', '#B8C9D4', '#D0C9B5', '#C5B8D4'
];

function getRandomMorandiColor() {
    return morandiColors[Math.floor(Math.random() * morandiColors.length)];
}

function createMorandiDialog() {
    const greeting = morandiGreetings[Math.floor(Math.random() * morandiGreetings.length)];
    const bgColor = getRandomMorandiColor();

    const dialog = document.createElement('div');
    dialog.className = 'morandi-dialog';
    dialog.style.backgroundColor = bgColor;
    dialog.style.left = (Math.random() * (window.innerWidth - 350)) + 'px';
    dialog.style.top = (Math.random() * (window.innerHeight - 150)) + 'px';
    dialog.style.zIndex = dialogZIndex++; // 确保新对话框永远在旧对话框前面

    dialog.innerHTML = `
        <div class="morandi-dialog-header">
            <div class="morandi-traffic-lights">
                <div class="morandi-traffic-light close"></div>
                <div class="morandi-traffic-light minimize"></div>
                <div class="morandi-traffic-light maximize"></div>
            </div>
            <div class="morandi-dialog-title">${greeting.title}</div>
        </div>
        <div class="morandi-dialog-content">
            <div class="morandi-dialog-text">${greeting.content}</div>
        </div>
    `;

    document.body.appendChild(dialog);

    // 5秒后自动消失
    setTimeout(() => {
        dialog.classList.add('fade-out');
        setTimeout(() => {
            if (dialog.parentNode) {
                dialog.parentNode.removeChild(dialog);
            }
        }, 500);
    }, 5000);
}

function startMorandiDialogs() {
    // 初始创建5个对话框，确保不少于5个
    for (let i = 0; i < 5; i++) {
        setTimeout(() => createMorandiDialog(), i * 600);
    }

    // 持续创建新对话框，保持至少5个
    setInterval(() => {
        const currentCount = document.querySelectorAll('.morandi-dialog').length;
        if (currentCount < 5) {
            // 如果少于5个，立即补充到5个
            for (let i = 0; i < (5 - currentCount); i++) {
                setTimeout(() => createMorandiDialog(), i * 300);
            }
        } else if (currentCount < 10) {
            // 如果在5-10个之间，偶尔添加新的
            createMorandiDialog();
        }
    }, 1500);
}

// ============ 原有粒子代码 ============
// 开始（先不自动启动，等待用户点击）
// init();
// animate();

// ============ 生成页面 ============
function showGeneratorPage() {
    // 隐藏画布
    canvas.style.display = 'none';
    document.querySelector('.info').style.display = 'none';
    document.getElementById('dialogOverlay').style.display = 'none';

    // 创建生成页面
    const generatorHTML = `
        <div class="generator-container">
            <div class="generator-box">
                <h1 class="generator-title">🎊 新年祝福生成器 🎊</h1>
                <p class="generator-subtitle">为你的朋友生成专属的新年祝福</p>
                <input type="text" id="nameInput" class="name-input" placeholder="请输入你要祝福的姓名" maxlength="20">
                <button id="generateBtn" class="generate-btn">生成祝福链接</button>
                <div id="resultContainer" class="result-container" style="display: none;">
                    <p class="result-text">✨ 链接已生成！点击复制</p>
                    <div class="link-box">
                        <input type="text" id="linkInput" class="link-input" readonly>
                        <button id="copyBtn" class="copy-btn">复制</button>
                    </div>
                    <p id="copySuccess" class="copy-success" style="display: none;">✅ 已复制到剪贴板！</p>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', generatorHTML);

    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
        .generator-container {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .generator-box {
            background: white;
            padding: 50px 60px;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            text-align: center;
            max-width: 500px;
            width: 90%;
            animation: generatorAppear 0.5s ease;
        }

        @keyframes generatorAppear {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .generator-title {
            font-size: 32px;
            color: #667eea;
            margin-bottom: 10px;
            font-weight: bold;
        }

        .generator-subtitle {
            font-size: 16px;
            color: #666;
            margin-bottom: 30px;
        }

        .name-input {
            width: 100%;
            padding: 15px 20px;
            font-size: 18px;
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            margin-bottom: 20px;
            outline: none;
            transition: border-color 0.3s;
            font-family: 'Microsoft YaHei', sans-serif;
        }

        .name-input:focus {
            border-color: #667eea;
        }

        .generate-btn {
            width: 100%;
            padding: 15px;
            font-size: 18px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            font-weight: bold;
            transition: transform 0.2s, box-shadow 0.2s;
            font-family: 'Microsoft YaHei', sans-serif;
        }

        .generate-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
        }

        .generate-btn:active {
            transform: translateY(0);
        }

        .result-container {
            margin-top: 30px;
            padding-top: 30px;
            border-top: 2px solid #f0f0f0;
        }

        .result-text {
            font-size: 16px;
            color: #333;
            margin-bottom: 15px;
        }

        .link-box {
            display: flex;
            gap: 10px;
            margin-bottom: 10px;
        }

        .link-input {
            flex: 1;
            padding: 12px 15px;
            font-size: 14px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            outline: none;
            background: #f9f9f9;
            font-family: 'Microsoft YaHei', sans-serif;
        }

        .copy-btn {
            padding: 12px 25px;
            font-size: 16px;
            background: #4ECDC4;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
            transition: background 0.3s;
            font-family: 'Microsoft YaHei', sans-serif;
        }

        .copy-btn:hover {
            background: #3db8b0;
        }

        .copy-success {
            color: #4ECDC4;
            font-weight: bold;
            margin-top: 10px;
        }
    `;
    document.head.appendChild(style);

    // 绑定事件
    document.getElementById('generateBtn').addEventListener('click', generateLink);
    document.getElementById('copyBtn').addEventListener('click', copyLink);
    document.getElementById('nameInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') generateLink();
    });
}

function generateLink() {
    const nameInput = document.getElementById('nameInput');
    const name = nameInput.value.trim();

    if (!name) {
        alert('请输入姓名！');
        return;
    }

    const encoded = encodeName(name);
    // 生成当前页面的URL，去掉已有的查询参数
    const baseUrl = window.location.href.split('?')[0];
    const link = `${baseUrl}?name=${encoded}`;

    document.getElementById('linkInput').value = link;
    document.getElementById('resultContainer').style.display = 'block';
}

function copyLink() {
    const linkInput = document.getElementById('linkInput');
    linkInput.select();
    document.execCommand('copy');

    const successMsg = document.getElementById('copySuccess');
    successMsg.style.display = 'block';

    setTimeout(() => {
        successMsg.style.display = 'none';
    }, 2000);
}

