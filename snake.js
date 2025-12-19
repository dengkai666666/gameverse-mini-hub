// snake.js
(function() {
    const canvas = document.getElementById('snake-canvas');
    const statusEl = document.getElementById('snake-status');
    const startBtn = document.getElementById('snake-start');
    const newBtn = document.getElementById('snake-new');
    const scoreEl = document.getElementById('snake-score');
    const highScoreEl = document.getElementById('snake-high-score');

    if (!canvas || !statusEl || !startBtn || !newBtn || !scoreEl || !highScoreEl) return;
    const ctx = canvas.getContext('2d');

    const GRID = 20;
    const CELL = Math.floor(canvas.width / GRID);
    const KEY = 'snakeHighScore';

    let running = false;
    let paused = false;
    let gameOver = false;
    let dir = { x: 1, y: 0 };
    let nextDir = { x: 1, y: 0 };
    let snake = [];
    let food = { x: 10, y: 10 };
    let score = 0;
    let lastTick = 0;
    let tickMs = 110;

    function getLang() {
        const stored = localStorage.getItem('language');
        const nav = (navigator.language || navigator.userLanguage || 'en').split('-')[0];
        const lang = stored || nav;
        return ['zh', 'en'].includes(lang) ? lang : 'en';
    }

    function t(lang) {
        if (typeof getTranslationsForLang === 'function') return getTranslationsForLang(lang);
        return {};
    }

    function format(str, vars) {
        return String(str).replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] != null ? String(vars[k]) : `{${k}}`));
    }

    function cssVar(name, fallback) {
        const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
        return v || fallback;
    }

    function readHighScore() {
        const n = Number(localStorage.getItem(KEY) || '0');
        return Number.isFinite(n) ? n : 0;
    }

    function writeHighScore(n) {
        localStorage.setItem(KEY, String(n));
    }

    function setHud() {
        const lang = getLang();
        const tr = t(lang);
        const hi = readHighScore();

        scoreEl.textContent = format(tr.snakeScore || (lang === 'zh' ? '得分：{score}' : 'Score: {score}'), { score });
        highScoreEl.textContent = format(tr.snakeHighScore || (lang === 'zh' ? '最高分：{score}' : 'High Score: {score}'), { score: hi });
    }

    function setStatus(text) {
        statusEl.textContent = text;
    }

    function randCell() {
        return Math.floor(Math.random() * GRID);
    }

    function spawnFood() {
        let x = randCell();
        let y = randCell();
        const occupied = new Set(snake.map(p => `${p.x},${p.y}`));
        while (occupied.has(`${x},${y}`)) {
            x = randCell();
            y = randCell();
        }
        food = { x, y };
    }

    function reset() {
        running = false;
        paused = false;
        gameOver = false;
        dir = { x: 1, y: 0 };
        nextDir = { x: 1, y: 0 };
        snake = [
            { x: 6, y: 10 },
            { x: 5, y: 10 },
            { x: 4, y: 10 }
        ];
        score = 0;
        spawnFood();
        setHud();
        updateButtons();
        draw();
        const lang = getLang();
        const tr = t(lang);
        setStatus(tr.snakeReady || (lang === 'zh' ? '准备就绪' : 'Ready'));
    }

    function updateButtons() {
        const lang = getLang();
        const tr = t(lang);
        if (!running) {
            startBtn.textContent = tr.start || (lang === 'zh' ? '开始' : 'Start');
            return;
        }
        if (paused) {
            startBtn.textContent = tr.resume || (lang === 'zh' ? '继续' : 'Resume');
        } else {
            startBtn.textContent = tr.pause || (lang === 'zh' ? '暂停' : 'Pause');
        }
    }

    function colors() {
        const isDark = document.body.classList.contains('dark-theme');
        return {
            bg: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
            grid: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
            snake: cssVar('--primary-color', '#6c5ce7'),
            head: cssVar('--secondary-color', '#00cec9'),
            food: cssVar('--accent-color', '#fd79a8'),
            text: isDark ? cssVar('--dark-text', '#dfe6e9') : cssVar('--light-text', '#2d3436')
        };
    }

    function draw() {
        const c = colors();
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // background
        ctx.fillStyle = c.bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // grid
        ctx.strokeStyle = c.grid;
        ctx.lineWidth = 1;
        for (let i = 0; i <= GRID; i++) {
            const p = i * CELL;
            ctx.beginPath();
            ctx.moveTo(p, 0);
            ctx.lineTo(p, GRID * CELL);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, p);
            ctx.lineTo(GRID * CELL, p);
            ctx.stroke();
        }

        // food
        ctx.fillStyle = c.food;
        ctx.fillRect(food.x * CELL + 3, food.y * CELL + 3, CELL - 6, CELL - 6);

        // snake
        for (let i = 0; i < snake.length; i++) {
            const p = snake[i];
            ctx.fillStyle = i === 0 ? c.head : c.snake;
            ctx.fillRect(p.x * CELL + 2, p.y * CELL + 2, CELL - 4, CELL - 4);
        }

        if (gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.35)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = c.text;
            ctx.font = '700 28px Poppins, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const lang = getLang();
            const tr = t(lang);
            ctx.fillText(tr.gameOver || (lang === 'zh' ? '游戏结束' : 'Game Over'), canvas.width / 2, canvas.height / 2);
        }
    }

    function tick() {
        if (!running || paused || gameOver) return;
        dir = nextDir;
        const head = snake[0];
        const nx = (head.x + dir.x + GRID) % GRID;
        const ny = (head.y + dir.y + GRID) % GRID;

        // self collision
        for (const p of snake) {
            if (p.x === nx && p.y === ny) {
                gameOver = true;
                running = false;
                const hi = readHighScore();
                if (score > hi) writeHighScore(score);
                setHud();
                updateButtons();
                const lang = getLang();
                const tr = t(lang);
                setStatus(tr.gameOver || (lang === 'zh' ? '游戏结束' : 'Game Over'));
                draw();
                return;
            }
        }

        snake.unshift({ x: nx, y: ny });

        if (nx === food.x && ny === food.y) {
            score += 1;
            spawnFood();
            const hi = readHighScore();
            if (score > hi) writeHighScore(score);
            setHud();
        } else {
            snake.pop();
        }

        draw();
    }

    function loop(ts) {
        if (!lastTick) lastTick = ts;
        const delta = ts - lastTick;
        if (delta >= tickMs) {
            lastTick = ts;
            tick();
        }
        requestAnimationFrame(loop);
    }

    function setDirection(dx, dy) {
        // prevent reversing
        if (dx === -dir.x && dy === -dir.y) return;
        nextDir = { x: dx, y: dy };
    }

    function toggleStartPause() {
        const lang = getLang();
        const tr = t(lang);

        if (gameOver) {
            reset();
        }

        if (!running) {
            running = true;
            paused = false;
            updateButtons();
            setStatus(tr.snakeRunning || (lang === 'zh' ? '进行中' : 'Running'));
            return;
        }

        paused = !paused;
        updateButtons();
        setStatus(paused ? (tr.pause || (lang === 'zh' ? '暂停' : 'Pause')) : (tr.resume || (lang === 'zh' ? '继续' : 'Resume')));
    }

    function bindControls() {
        document.addEventListener('keydown', (e) => {
            const key = e.key;
            if (key === 'ArrowUp') setDirection(0, -1);
            else if (key === 'ArrowDown') setDirection(0, 1);
            else if (key === 'ArrowLeft') setDirection(-1, 0);
            else if (key === 'ArrowRight') setDirection(1, 0);
            else if (key === ' ') {
                e.preventDefault();
                toggleStartPause();
            }
        });

        const up = document.querySelector('.snake-dpad .up');
        const down = document.querySelector('.snake-dpad .down');
        const left = document.querySelector('.snake-dpad .left');
        const right = document.querySelector('.snake-dpad .right');

        const tap = (el, dx, dy) => {
            if (!el) return;
            el.addEventListener('click', () => setDirection(dx, dy));
        };

        tap(up, 0, -1);
        tap(down, 0, 1);
        tap(left, -1, 0);
        tap(right, 1, 0);
    }

    startBtn.addEventListener('click', toggleStartPause);
    newBtn.addEventListener('click', reset);
    document.addEventListener('languageChanged', () => {
        setHud();
        updateButtons();
        // Keep status concise; don't override game over text
        if (gameOver) return;
        const lang = getLang();
        const tr = t(lang);
        if (!running) setStatus(tr.snakeReady || (lang === 'zh' ? '准备就绪' : 'Ready'));
    });

    bindControls();
    reset();
    requestAnimationFrame(loop);
})();

