// 2048.js
(function() {
    const boardEl = document.getElementById('g2048-board');
    const scoreEl = document.getElementById('g2048-score');
    const bestEl = document.getElementById('g2048-best');
    const statusEl = document.getElementById('g2048-status');
    const newBtn = document.getElementById('g2048-new');
    const overlayEl = document.getElementById('g2048-overlay');
    const overlayTitleEl = document.getElementById('g2048-overlay-title');
    const overlayBodyEl = document.getElementById('g2048-overlay-body');
    const keepBtn = document.getElementById('g2048-keep');
    const restartBtn = document.getElementById('g2048-restart');

    if (!boardEl || !scoreEl || !bestEl || !statusEl || !newBtn || !overlayEl || !overlayTitleEl || !overlayBodyEl || !keepBtn || !restartBtn) return;

    const SIZE = 4;
    const BEST_KEY = 'g2048BestScore';

    let grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    let score = 0;
    let won = false;
    let allowContinueAfterWin = false;

    let touchStart = null;

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

    function readBest() {
        const n = Number(localStorage.getItem(BEST_KEY) || '0');
        return Number.isFinite(n) ? n : 0;
    }

    function writeBest(n) {
        localStorage.setItem(BEST_KEY, String(n));
    }

    function setHud() {
        const lang = getLang();
        const tr = t(lang);
        const best = readBest();
        scoreEl.textContent = format(tr.scoreLabel || (lang === 'zh' ? '得分：{score}' : 'Score: {score}'), { score });
        bestEl.textContent = format(tr.bestLabel || (lang === 'zh' ? '最高分：{score}' : 'Best: {score}'), { score: best });
    }

    function showOverlay(kind) {
        const lang = getLang();
        const tr = t(lang);

        if (kind === 'win') {
            overlayTitleEl.textContent = tr.g2048WinTitle || (lang === 'zh' ? '你达到了 2048！' : 'You reached 2048!');
            overlayBodyEl.textContent = tr.g2048WinBody || (lang === 'zh' ? '继续挑战更高分，或者重新开始。' : 'Keep going for a higher score, or restart.');
            keepBtn.style.display = '';
        } else {
            overlayTitleEl.textContent = tr.g2048GameOverTitle || (lang === 'zh' ? '游戏结束' : 'Game Over');
            overlayBodyEl.textContent = tr.g2048GameOverBody || (lang === 'zh' ? '没有可移动的方向了。' : 'No more moves left.');
            keepBtn.style.display = 'none';
        }

        overlayEl.classList.add('show');
    }

    function hideOverlay() {
        overlayEl.classList.remove('show');
    }

    function emptyCells() {
        const cells = [];
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                if (grid[r][c] === 0) cells.push({ r, c });
            }
        }
        return cells;
    }

    function addRandomTile() {
        const empties = emptyCells();
        if (!empties.length) return false;
        const pick = empties[Math.floor(Math.random() * empties.length)];
        grid[pick.r][pick.c] = Math.random() < 0.9 ? 2 : 4;
        return true;
    }

    function startNewGame() {
        grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
        score = 0;
        won = false;
        allowContinueAfterWin = false;
        addRandomTile();
        addRandomTile();
        hideOverlay();
        render();
        setHud();
        statusEl.textContent = '';
    }

    function lineMove(line) {
        const filtered = line.filter(n => n !== 0);
        const merged = [];
        let gain = 0;
        for (let i = 0; i < filtered.length; i++) {
            if (filtered[i] && filtered[i] === filtered[i + 1]) {
                const v = filtered[i] * 2;
                merged.push(v);
                gain += v;
                i++;
            } else {
                merged.push(filtered[i]);
            }
        }
        while (merged.length < SIZE) merged.push(0);
        return { line: merged, gain };
    }

    function canMove() {
        if (emptyCells().length) return true;
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                const v = grid[r][c];
                if (r + 1 < SIZE && grid[r + 1][c] === v) return true;
                if (c + 1 < SIZE && grid[r][c + 1] === v) return true;
            }
        }
        return false;
    }

    function applyMove(dir) {
        // dir: 'up'|'down'|'left'|'right'
        let moved = false;
        let gained = 0;
        const before = grid.map(row => row.slice());

        const readLine = (i) => {
            if (dir === 'left') return grid[i].slice();
            if (dir === 'right') return grid[i].slice().reverse();
            if (dir === 'up') return grid.map(row => row[i]);
            return grid.map(row => row[i]).reverse(); // down
        };

        const writeLine = (i, line) => {
            if (dir === 'left') grid[i] = line.slice();
            else if (dir === 'right') grid[i] = line.slice().reverse();
            else if (dir === 'up') {
                for (let r = 0; r < SIZE; r++) grid[r][i] = line[r];
            } else {
                const rev = line.slice().reverse();
                for (let r = 0; r < SIZE; r++) grid[r][i] = rev[r];
            }
        };

        for (let i = 0; i < SIZE; i++) {
            const { line, gain } = lineMove(readLine(i));
            gained += gain;
            writeLine(i, line);
        }

        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                if (grid[r][c] !== before[r][c]) moved = true;
                if (grid[r][c] === 2048) won = true;
            }
        }

        if (!moved) return false;

        score += gained;
        const best = readBest();
        if (score > best) writeBest(score);

        addRandomTile();
        render(true);
        setHud();

        if (won && !allowContinueAfterWin) {
            showOverlay('win');
        } else if (!canMove()) {
            showOverlay('lose');
        }

        return true;
    }

    function render(pop) {
        boardEl.querySelectorAll('.g2048-cell').forEach(el => el.remove());
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                const v = grid[r][c];
                const cell = document.createElement('div');
                cell.className = 'g2048-cell';
                if (v === 0) {
                    cell.classList.add('empty');
                    cell.textContent = '';
                } else {
                    const cls = v <= 2048 ? `g2048-${v}` : 'g2048-big';
                    cell.classList.add(cls);
                    cell.textContent = String(v);
                    if (pop) cell.classList.add('pop');
                }
                boardEl.appendChild(cell);
            }
        }
        if (pop) setTimeout(() => boardEl.querySelectorAll('.g2048-cell.pop').forEach(el => el.classList.remove('pop')), 140);
    }

    function onKeyDown(e) {
        const key = e.key;
        if (key === 'ArrowUp' || key === 'w' || key === 'W') {
            e.preventDefault();
            applyMove('up');
        } else if (key === 'ArrowDown' || key === 's' || key === 'S') {
            e.preventDefault();
            applyMove('down');
        } else if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
            e.preventDefault();
            applyMove('left');
        } else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
            e.preventDefault();
            applyMove('right');
        } else if (key === 'r' || key === 'R') {
            startNewGame();
        }
    }

    function onTouchStart(e) {
        const t0 = e.touches && e.touches[0];
        if (!t0) return;
        touchStart = { x: t0.clientX, y: t0.clientY, ts: Date.now() };
    }

    function onTouchEnd(e) {
        if (!touchStart) return;
        const t1 = e.changedTouches && e.changedTouches[0];
        if (!t1) return;
        const dx = t1.clientX - touchStart.x;
        const dy = t1.clientY - touchStart.y;
        touchStart = null;

        const adx = Math.abs(dx);
        const ady = Math.abs(dy);
        if (Math.max(adx, ady) < 28) return;
        if (adx > ady) applyMove(dx > 0 ? 'right' : 'left');
        else applyMove(dy > 0 ? 'down' : 'up');
    }

    newBtn.addEventListener('click', startNewGame);
    restartBtn.addEventListener('click', startNewGame);
    keepBtn.addEventListener('click', () => {
        allowContinueAfterWin = true;
        hideOverlay();
    });

    boardEl.addEventListener('touchstart', onTouchStart, { passive: true });
    boardEl.addEventListener('touchend', onTouchEnd, { passive: true });
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('languageChanged', () => setHud());

    startNewGame();
})();

