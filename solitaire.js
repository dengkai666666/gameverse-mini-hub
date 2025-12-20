// solitaire.js (Klondike-lite, click-to-move)
(function() {
    const stockEl = document.getElementById('sol-stock');
    const wasteEl = document.getElementById('sol-waste');
    const tableauEl = document.getElementById('sol-tableau');
    const statusEl = document.getElementById('sol-status');
    const newBtn = document.getElementById('sol-new');
    const undoBtn = document.getElementById('sol-undo');
    const hintBtn = document.getElementById('sol-hint');
    const autoBtn = document.getElementById('sol-auto');
    const guideBtn = document.getElementById('sol-guide');
    const scoreEl = document.getElementById('sol-score');
    const movesEl = document.getElementById('sol-moves');
    const foundationEls = [
        document.getElementById('sol-foundation-0'),
        document.getElementById('sol-foundation-1'),
        document.getElementById('sol-foundation-2'),
        document.getElementById('sol-foundation-3')
    ];

    if (!stockEl || !wasteEl || !tableauEl || !statusEl || !newBtn || !undoBtn || !hintBtn || !autoBtn || !guideBtn || !scoreEl || !movesEl || foundationEls.some(el => !el)) return;

    const TUTORIAL_SEEN_KEY = 'solitaireTutorialSeen';
    const tutorialEl = document.getElementById('sol-tutorial');
    const tutorialPopoverEl = document.getElementById('sol-tutorial-popover');
    const tutorialStepEl = document.getElementById('sol-tutorial-step');
    const tutorialDontShowEl = document.getElementById('sol-tutorial-dontshow');
    const tutorialSkipBtn = document.getElementById('sol-tutorial-skip');
    const tutorialBackBtn = document.getElementById('sol-tutorial-back');
    const tutorialNextBtn = document.getElementById('sol-tutorial-next');

    const tutorial = {
        open: false,
        step: 0,
        steps: [
            { key: 'solTutWelcome', target: null },
            { key: 'solTutStock', target: '#sol-stock' },
            { key: 'solTutWaste', target: '#sol-waste' },
            { key: 'solTutFoundations', target: '#sol-foundation-0' },
            { key: 'solTutTableau', target: '#sol-tableau' },
            { key: 'solTutTip', target: '#sol-hint' }
        ]
    };
    let tutorialRepositionRaf = null;

    const SUITS = ['♠', '♥', '♦', '♣'];
    const SUIT_COLOR = {
        '♠': 'black',
        '♣': 'black',
        '♥': 'red',
        '♦': 'red'
    };

    let stock = [];
    let waste = [];
    let foundations = [[], [], [], []];
    let tableau = Array.from({ length: 7 }, () => []);

    // selection: { from: 'waste' } or { from:'tableau', col, index }
    let selection = null;
    let score = 0;
    let moves = 0;
    let history = [];
    const HISTORY_LIMIT = 80;
    let hint = null; // { sourceId, target: {type, index} }
    let lastMovedCardId = null;
    let suppressClickUntil = 0;

    const dragState = {
        pending: null, // {source:'waste'|'tableau', col?, index?, pointerId, startX, startY, originRect}
        active: false,
        pointerId: null,
        offsetX: 0,
        offsetY: 0,
        target: null, // {type:'tableau'|'foundation', index}
        layer: null,
        cards: [] // { card, el, dx, dy }
    };

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

    function tt(key, fallback) {
        const lang = getLang();
        const tr = t(lang);
        return tr[key] || fallback || key;
    }

    function setStatus(text) {
        statusEl.textContent = text || '';
    }

    function setHud() {
        const lang = getLang();
        const tr = t(lang);
        scoreEl.textContent = format(tr.scoreLabel || (lang === 'zh' ? '得分：{score}' : 'Score: {score}'), { score });
        movesEl.textContent = format(tr.movesLabel || (lang === 'zh' ? '步数：{moves}' : 'Moves: {moves}'), { moves });
    }

    function clearTutorialHighlight() {
        document.querySelectorAll('.sol-tut-highlight').forEach(el => el.classList.remove('sol-tut-highlight'));
    }

    function showTutorial(open, force) {
        if (!tutorialEl || !tutorialPopoverEl || !tutorialStepEl || !tutorialDontShowEl || !tutorialSkipBtn || !tutorialBackBtn || !tutorialNextBtn) {
            return;
        }
        if (!force && localStorage.getItem(TUTORIAL_SEEN_KEY) === '1') return;

        tutorial.open = open;
        if (!open) {
            tutorialEl.hidden = true;
            tutorialEl.setAttribute('aria-hidden', 'true');
            clearTutorialHighlight();
            if (tutorialRepositionRaf) {
                cancelAnimationFrame(tutorialRepositionRaf);
                tutorialRepositionRaf = null;
            }
            return;
        }

        tutorialEl.hidden = false;
        tutorialEl.setAttribute('aria-hidden', 'false');
        tutorial.step = 0;
        tutorialDontShowEl.checked = localStorage.getItem(TUTORIAL_SEEN_KEY) === '1';
        renderTutorialStep();
    }

    function closeTutorial(markSeen) {
        if (markSeen) localStorage.setItem(TUTORIAL_SEEN_KEY, '1');
        if (tutorialDontShowEl && tutorialDontShowEl.checked) localStorage.setItem(TUTORIAL_SEEN_KEY, '1');
        showTutorial(false, true);
    }

    function clamp(n, min, max) {
        return Math.max(min, Math.min(max, n));
    }

    function positionTutorialPopover(targetEl) {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const margin = 12;

        const pop = tutorialPopoverEl;
        pop.style.left = '0px';
        pop.style.top = '0px';
        pop.style.setProperty('--arrow-left', '50%');

        const popRect = pop.getBoundingClientRect();
        let x = vw / 2 - popRect.width / 2;
        let y = vh / 2 - popRect.height / 2;
        let pos = 'bottom';
        let arrowLeft = popRect.width / 2;

        if (targetEl) {
            const r = targetEl.getBoundingClientRect();
            const preferBottom = r.top < vh * 0.52;
            pos = preferBottom ? 'bottom' : 'top';
            const cx = r.left + r.width / 2;
            x = cx - popRect.width / 2;
            if (pos === 'bottom') y = r.bottom + 12;
            else y = r.top - popRect.height - 12;

            x = clamp(x, margin, vw - popRect.width - margin);
            y = clamp(y, margin, vh - popRect.height - margin);
            arrowLeft = clamp(cx - x, 18, popRect.width - 18);
        }

        pop.dataset.pos = pos;
        pop.style.left = `${x}px`;
        pop.style.top = `${y}px`;
        pop.style.setProperty('--arrow-left', `${arrowLeft}px`);
    }

    function scheduleTutorialReposition() {
        if (!tutorial.open) return;
        if (!tutorialPopoverEl) return;
        if (tutorialRepositionRaf) return;
        tutorialRepositionRaf = requestAnimationFrame(() => {
            tutorialRepositionRaf = null;
            const s = tutorial.steps[tutorial.step];
            const targetEl = s.target ? document.querySelector(s.target) : null;
            positionTutorialPopover(targetEl);
        });
    }

    function renderTutorialStep() {
        if (!tutorial.open) return;
        const s = tutorial.steps[tutorial.step];
        tutorialStepEl.textContent = tt(s.key, '');

        clearTutorialHighlight();
        const targetEl = s.target ? document.querySelector(s.target) : null;
        if (targetEl) targetEl.classList.add('sol-tut-highlight');

        tutorialBackBtn.disabled = tutorial.step === 0;
        const isLast = tutorial.step === tutorial.steps.length - 1;
        tutorialNextBtn.textContent = tt(isLast ? 'done' : 'next', isLast ? 'Done' : 'Next');
        if (isLast) {
            tutorialNextBtn.dataset.key = 'done';
        } else {
            tutorialNextBtn.dataset.key = 'next';
        }

        // mark seen after the first time it pops automatically
        if (localStorage.getItem(TUTORIAL_SEEN_KEY) !== '1') {
            localStorage.setItem(TUTORIAL_SEEN_KEY, '1');
        }

        // position after layout
        scheduleTutorialReposition();
    }

    function isSuppressedClick() {
        return Date.now() < suppressClickUntil;
    }

    function format(str, vars) {
        return String(str).replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] != null ? String(vars[k]) : `{${k}}`));
    }

    function pushHistory() {
        const snap = {
            stock: stock.map(c => ({ ...c })),
            waste: waste.map(c => ({ ...c })),
            foundations: foundations.map(p => p.map(c => ({ ...c }))),
            tableau: tableau.map(p => p.map(c => ({ ...c }))),
            score,
            moves
        };
        history.push(snap);
        if (history.length > HISTORY_LIMIT) history.shift();
        undoBtn.disabled = history.length === 0;
    }

    function restore(snap) {
        stock = snap.stock.map(c => ({ ...c }));
        waste = snap.waste.map(c => ({ ...c }));
        foundations = snap.foundations.map(p => p.map(c => ({ ...c })));
        tableau = snap.tableau.map(p => p.map(c => ({ ...c })));
        score = snap.score;
        moves = snap.moves;
        selection = null;
        hint = null;
        lastMovedCardId = null;
        undoBtn.disabled = history.length === 0;
        setHud();
        setStatus('');
        render();
    }

    function undo() {
        if (!history.length) return;
        const snap = history.pop();
        restore(snap);
    }

    function autoMoveToFoundations() {
        const lang = getLang();
        const tr = t(lang);

        let movedAny = false;

        // compute a single snapshot so Undo returns to pre-auto state
        const tryMoveOnce = () => {
            const w = top(waste);
            if (w) {
                for (let i = 0; i < 4; i++) {
                    if (canMoveToFoundation(w, i) && safeToAutoMoveToFoundation(w)) {
                        foundations[i].push(waste.pop());
                        score = Math.max(0, score + 10);
                        moves += 1;
                        lastMovedCardId = w.id;
                        return true;
                    }
                }
            }
            for (let col = 0; col < 7; col++) {
                const c = top(tableau[col]);
                if (!c || !c.faceUp) continue;
                for (let i = 0; i < 4; i++) {
                    if (canMoveToFoundation(c, i) && safeToAutoMoveToFoundation(c)) {
                        foundations[i].push(tableau[col].pop());
                        revealIfNeeded(col);
                        score = Math.max(0, score + 10);
                        moves += 1;
                        lastMovedCardId = c.id;
                        return true;
                    }
                }
            }
            return false;
        };

        // run auto loop
        const before = snapshotState();
        while (tryMoveOnce()) movedAny = true;

        if (!movedAny) {
            setStatus(tr.hintNoMoves || (lang === 'zh' ? '提示：暂无可用操作' : 'Hint: no moves'));
            return;
        }

        history.push(before);
        if (history.length > HISTORY_LIMIT) history.shift();
        undoBtn.disabled = history.length === 0;

        selection = null;
        hint = null;
        setHud();
        setStatus(tr.solitaireAutoMoved || (lang === 'zh' ? '已自动上基础堆' : 'Auto-moved'));
        render();
    }

    function snapshotState() {
        return {
            stock: stock.map(c => ({ ...c })),
            waste: waste.map(c => ({ ...c })),
            foundations: foundations.map(p => p.map(c => ({ ...c }))),
            tableau: tableau.map(p => p.map(c => ({ ...c }))),
            score,
            moves
        };
    }

    function rankLabel(rank) {
        if (rank === 1) return 'A';
        if (rank === 11) return 'J';
        if (rank === 12) return 'Q';
        if (rank === 13) return 'K';
        return String(rank);
    }

    function makeDeck() {
        const deck = [];
        let id = 0;
        for (const suit of SUITS) {
            for (let rank = 1; rank <= 13; rank++) {
                deck.push({ id: id++, suit, rank, faceUp: false });
            }
        }
        return deck;
    }

    function shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    function top(arr) {
        return arr.length ? arr[arr.length - 1] : null;
    }

    function isValidTableauStack(stack) {
        if (!stack.length) return false;
        for (let i = 0; i < stack.length; i++) {
            if (!stack[i].faceUp) return false;
            if (i === 0) continue;
            const prev = stack[i - 1];
            const cur = stack[i];
            const colorOk = SUIT_COLOR[prev.suit] !== SUIT_COLOR[cur.suit];
            const rankOk = cur.rank === prev.rank - 1;
            if (!colorOk || !rankOk) return false;
        }
        return true;
    }

    function canMoveToFoundation(card, fIndex) {
        const pile = foundations[fIndex];
        const t = top(pile);
        if (!t) return card.rank === 1;
        return t.suit === card.suit && card.rank === t.rank + 1;
    }

    function foundationTopRankBySuit(suit) {
        for (let i = 0; i < 4; i++) {
            const t0 = top(foundations[i]);
            if (t0 && t0.suit === suit) return t0.rank;
        }
        return 0;
    }

    function safeToAutoMoveToFoundation(card) {
        // Conservative “safe auto” rule to avoid moving cards too early.
        // A/2 are always safe. Otherwise, only auto-move if opposite-color foundations are not far behind.
        if (card.rank <= 2) return true;
        const color = SUIT_COLOR[card.suit];
        const blackMin = Math.min(foundationTopRankBySuit('♠'), foundationTopRankBySuit('♣'));
        const redMin = Math.min(foundationTopRankBySuit('♥'), foundationTopRankBySuit('♦'));
        const oppMin = color === 'red' ? blackMin : redMin;
        return card.rank <= oppMin + 1;
    }

    function canMoveToTableau(card, col) {
        const pile = tableau[col];
        const t = top(pile);
        if (!t) return card.rank === 13;
        if (!t.faceUp) return false;
        const colorOk = SUIT_COLOR[t.suit] !== SUIT_COLOR[card.suit];
        const rankOk = card.rank === t.rank - 1;
        return colorOk && rankOk;
    }

    function revealIfNeeded(col) {
        const pile = tableau[col];
        const t = top(pile);
        if (t && !t.faceUp) t.faceUp = true;
    }

    function clearSelection() {
        selection = null;
        hint = null;
        render();
    }

    function selectWaste() {
        if (!waste.length) return;
        selection = { from: 'waste' };
        render();
    }

    function selectTableau(col, index) {
        const pile = tableau[col];
        const card = pile[index];
        if (!card || !card.faceUp) return;
        selection = { from: 'tableau', col, index };
        render();
    }

    function selectedCards() {
        if (!selection) return null;
        if (selection.from === 'waste') {
            const c = top(waste);
            if (!c) return null;
            return [c];
        }
        const pile = tableau[selection.col];
        const stack = pile.slice(selection.index);
        if (!stack.length || !stack[0].faceUp) return null;
        if (!isValidTableauStack(stack)) return null;
        return stack;
    }

    function removeSelectedFromSource() {
        if (!selection) return [];
        if (selection.from === 'waste') {
            const c = waste.pop();
            return c ? [c] : [];
        }
        const pile = tableau[selection.col];
        const moved = pile.splice(selection.index);
        revealIfNeeded(selection.col);
        return moved;
    }

    function popWasteCard() {
        const c = waste.pop();
        return c ? [c] : [];
    }

    function moveSelectionToFoundation(fIndex) {
        const lang = getLang();
        const tr = t(lang);
        if (!selection) return false;
        if (selection.from === 'tableau') {
            const stack = selectedCards();
            if (!stack || stack.length !== 1) {
                setStatus(tr.solitaireInvalidMove || (lang === 'zh' ? '这步不合法' : 'Invalid move'));
                return false;
            }
            if (selection.index !== tableau[selection.col].length - 1) {
                setStatus(tr.solitaireInvalidMove || (lang === 'zh' ? '这步不合法' : 'Invalid move'));
                return false;
            }
            const card = stack[0];
            if (!canMoveToFoundation(card, fIndex)) {
                setStatus(tr.solitaireInvalidMove || (lang === 'zh' ? '这步不合法' : 'Invalid move'));
                return false;
            }
            pushHistory();
            tableau[selection.col].pop();
            foundations[fIndex].push(card);
            revealIfNeeded(selection.col);
            score = Math.max(0, score + 10);
            moves += 1;
            lastMovedCardId = card.id;
            clearSelection();
            setStatus('');
            setHud();
            return true;
        }

        const card = top(waste);
        if (!card) return false;
        if (!canMoveToFoundation(card, fIndex)) {
            setStatus(tr.solitaireInvalidMove || (lang === 'zh' ? '这步不合法' : 'Invalid move'));
            return false;
        }
        pushHistory();
        foundations[fIndex].push(waste.pop());
        score = Math.max(0, score + 10);
        moves += 1;
        lastMovedCardId = card.id;
        clearSelection();
        setStatus('');
        setHud();
        return true;
    }

    function moveSelectionToTableau(col) {
        const lang = getLang();
        const tr = t(lang);
        const stack = selectedCards();
        if (!stack || !stack.length) return false;
        const card = stack[0];
        if (!canMoveToTableau(card, col)) {
            setStatus(tr.solitaireInvalidMove || (lang === 'zh' ? '这步不合法' : 'Invalid move'));
            return false;
        }

        pushHistory();
        if (selection.from === 'waste') {
            const movedCard = waste.pop();
            tableau[col].push(movedCard);
            score = Math.max(0, score + 5);
            lastMovedCardId = movedCard.id;
        } else {
            const moved = tableau[selection.col].splice(selection.index);
            tableau[col].push(...moved);
            revealIfNeeded(selection.col);
            score = Math.max(0, score + 3);
            lastMovedCardId = moved[0] ? moved[0].id : null;
        }
        moves += 1;
        clearSelection();
        setStatus('');
        setHud();
        return true;
    }

    function autoToFoundationFromSelection() {
        if (!selection) return false;
        const stack = selectedCards();
        if (!stack || stack.length !== 1) return false;
        const card = stack[0];
        for (let i = 0; i < 4; i++) {
            if (canMoveToFoundation(card, i)) {
                moveSelectionToFoundation(i);
                return true;
            }
        }
        return false;
    }

    function checkWin() {
        return foundations.every(p => p.length === 13);
    }

    function dealNewGame() {
        const lang = getLang();
        const tr = t(lang);

        selection = null;
        hint = null;
        lastMovedCardId = null;
        foundations = [[], [], [], []];
        tableau = Array.from({ length: 7 }, () => []);
        waste = [];
        stock = shuffle(makeDeck());
        score = 0;
        moves = 0;
        history = [];
        undoBtn.disabled = true;

        for (let col = 0; col < 7; col++) {
            for (let i = 0; i <= col; i++) {
                const card = stock.pop();
                if (!card) continue;
                card.faceUp = i === col;
                tableau[col].push(card);
            }
        }

        setStatus(tr.solitaireReady || (lang === 'zh' ? '准备就绪' : 'Ready'));
        setHud();
        render();
    }

    function drawFromStock() {
        const lang = getLang();
        const tr = t(lang);

        clearSelection();
        if (stock.length) {
            pushHistory();
            const card = stock.pop();
            card.faceUp = true;
            waste.push(card);
            moves += 1;
            setHud();
            setStatus('');
            render();
            return;
        }
        // recycle waste to stock
        if (!waste.length) return;
        pushHistory();
        while (waste.length) {
            const c = waste.pop();
            c.faceUp = false;
            stock.push(c);
        }
        moves += 1;
        setHud();
        setStatus(tr.solitaireRecycled || (lang === 'zh' ? '已翻回牌堆' : 'Recycled'));
        render();
    }

    function renderCard(card, opts) {
        const el = document.createElement('div');
        el.className = 'sol-card';
        el.dataset.cardId = String(card.id);
        if (!card.faceUp) el.classList.add('face-down');

        const color = SUIT_COLOR[card.suit];
        el.classList.add(color === 'red' ? 'sol-red' : 'sol-black');

        if (opts && opts.selected) el.classList.add('selected');
        if (opts && opts.hinted) el.classList.add('hint');
        if (opts && opts.moved) el.classList.add('moved');

        el.innerHTML = `
            <div class="sol-corner">
                <div class="sol-rank">${rankLabel(card.rank)}</div>
                <div class="sol-suit">${card.suit}</div>
            </div>
            <div class="sol-center">${card.suit}</div>
            <div class="sol-corner" style="transform: rotate(180deg);">
                <div class="sol-rank">${rankLabel(card.rank)}</div>
                <div class="sol-suit">${card.suit}</div>
            </div>
        `;
        return el;
    }

    function render() {
        // stock
        stockEl.innerHTML = '';
        stockEl.classList.toggle('hint-target', hint && hint.target && hint.target.type === 'stock');
        if (stock.length) {
            const dummy = { id: -1, suit: '♠', rank: 13, faceUp: false };
            const el = renderCard(dummy, {});
            el.style.position = 'absolute';
            stockEl.appendChild(el);
        }

        // waste
        wasteEl.innerHTML = '';
        wasteEl.classList.toggle('hint-target', hint && hint.target && hint.target.type === 'waste');
        const w = top(waste);
        if (w) {
            const selected = selection && selection.from === 'waste';
            const hinted = hint && hint.sourceId === w.id;
            const moved = lastMovedCardId === w.id;
            const el = renderCard(w, { selected, hinted, moved });
            el.style.position = 'absolute';
            wasteEl.appendChild(el);
        }

        // foundations
        for (let i = 0; i < 4; i++) {
            const fEl = foundationEls[i];
            fEl.innerHTML = '';
            fEl.dataset.foundationIndex = String(i);
            fEl.classList.toggle('hint-target', hint && hint.target && hint.target.type === 'foundation' && hint.target.index === i);
            const c = top(foundations[i]);
            if (c) {
                const el = renderCard(c, {});
                el.style.position = 'absolute';
                fEl.appendChild(el);
            }
        }

        // tableau
        tableauEl.innerHTML = '';
        for (let col = 0; col < 7; col++) {
            const colEl = document.createElement('div');
            colEl.className = 'sol-col';
            colEl.dataset.col = String(col);

            const slot = document.createElement('div');
            slot.className = 'sol-slot';
            slot.dataset.col = String(col);
            slot.classList.toggle('hint-target', hint && hint.target && hint.target.type === 'tableau' && hint.target.index === col);
            colEl.appendChild(slot);

            const pile = tableau[col];
            for (let i = 0; i < pile.length; i++) {
                const card = pile[i];
                const selected =
                    selection &&
                    selection.from === 'tableau' &&
                    selection.col === col &&
                    selection.index === i;
                const hinted = hint && hint.sourceId === card.id;
                const moved = lastMovedCardId === card.id;
                const el = renderCard(card, { selected, hinted, moved });
                el.style.top = `${i * 22}px`;
                el.dataset.col = String(col);
                el.dataset.index = String(i);
                colEl.appendChild(el);
            }

            tableauEl.appendChild(colEl);
        }

        if (checkWin()) {
            const lang = getLang();
            const tr = t(lang);
            setStatus(tr.solitaireWin || (lang === 'zh' ? '恭喜通关！' : 'You win!'));
        }

        // ensure move animation doesn't re-trigger on the next render
        lastMovedCardId = null;
    }

    function clearDropHighlights() {
        document.querySelectorAll('.sol-slot.drop-target').forEach(el => el.classList.remove('drop-target'));
        document.querySelectorAll('.sol-card.drop-target').forEach(el => el.classList.remove('drop-target'));
    }

    function setDropTarget(target) {
        clearDropHighlights();
        dragState.target = target;
        if (!target) return;
        if (target.type === 'foundation') {
            const el = foundationEls[target.index];
            if (el) el.classList.add('drop-target');
            return;
        }
        if (target.type === 'tableau') {
            const slot = tableauEl.querySelector(`.sol-slot[data-col="${target.index}"]`);
            if (slot) slot.classList.add('drop-target');
        }
    }

    function dragCleanup() {
        if (dragState.layer) {
            dragState.layer.remove();
        }
        dragState.pending = null;
        dragState.active = false;
        dragState.pointerId = null;
        dragState.offsetX = 0;
        dragState.offsetY = 0;
        dragState.target = null;
        dragState.layer = null;
        dragState.cards = [];
        clearDropHighlights();
    }

    function startDrag(pending) {
        const lang = getLang();
        const tr = t(lang);
        const source = pending.source;

        hint = null;
        setStatus('');

        let stack = null;
        if (source === 'waste') {
            const w = top(waste);
            if (!w) return false;
            selection = { from: 'waste' };
            stack = [w];
        } else {
            const pile = tableau[pending.col];
            const card = pile[pending.index];
            if (!card || !card.faceUp) return false;
            selection = { from: 'tableau', col: pending.col, index: pending.index };
            stack = selectedCards();
            if (!stack) {
                selection = null;
                setStatus(tr.solitaireInvalidMove || (lang === 'zh' ? '这步不合法' : 'Invalid move'));
                return false;
            }
        }

        const layer = document.createElement('div');
        layer.className = 'sol-drag-layer';
        document.body.appendChild(layer);

        const originRect = pending.originRect;
        dragState.offsetX = pending.startX - originRect.left;
        dragState.offsetY = pending.startY - originRect.top;
        dragState.layer = layer;
        dragState.active = true;
        dragState.pointerId = pending.pointerId;

        // create visual clones
        dragState.cards = [];
        for (let i = 0; i < stack.length; i++) {
            const c = stack[i];
            const el = renderCard(c, { selected: i === 0 });
            el.classList.add('dragging');
            el.style.position = 'fixed';
            el.style.left = `${originRect.left}px`;
            el.style.top = `${originRect.top + i * 22}px`;
            el.style.transform = 'none';
            el.style.zIndex = String(10000 + i);
            layer.appendChild(el);
            dragState.cards.push({ card: c, el, dy: i * 22 });
        }

        moveDrag(pending.startX, pending.startY);
        return true;
    }

    function moveDrag(clientX, clientY) {
        if (!dragState.active || !dragState.layer) return;
        const x = clientX - dragState.offsetX;
        const y = clientY - dragState.offsetY;
        for (const item of dragState.cards) {
            item.el.style.left = `${x}px`;
            item.el.style.top = `${y + item.dy}px`;
        }

        // detect drop target under pointer
        const el = document.elementFromPoint(clientX, clientY);
        if (!el) {
            setDropTarget(null);
            return;
        }
        const f = el.closest('[data-foundation-index]');
        if (f) {
            const idx = Number(f.dataset.foundationIndex);
            if (Number.isFinite(idx)) setDropTarget({ type: 'foundation', index: idx });
            else setDropTarget(null);
            return;
        }
        const colEl = el.closest('.sol-col');
        if (colEl && colEl.dataset.col != null) {
            const col = Number(colEl.dataset.col);
            if (Number.isFinite(col)) setDropTarget({ type: 'tableau', index: col });
            else setDropTarget(null);
            return;
        }
        setDropTarget(null);
    }

    function finishDrag() {
        const target = dragState.target;
        const wasActive = dragState.active;
        dragCleanup();

        if (!wasActive) return;

        let ok = false;
        if (target) {
            if (target.type === 'foundation') ok = moveSelectionToFoundation(target.index);
            else if (target.type === 'tableau') ok = moveSelectionToTableau(target.index);
        }

        // If the move failed, just clear selection and re-render.
        if (!ok) {
            clearSelection();
        }

        suppressClickUntil = Date.now() + 350;
    }

    function onWasteClick(e) {
        if (isSuppressedClick()) return;
        const w = top(waste);
        if (!w) return;
        const isSelected = selection && selection.from === 'waste';
        if (isSelected) clearSelection();
        else selectWaste();
    }

    function onFoundationClick(index) {
        if (!selection) return;
        moveSelectionToFoundation(index);
    }

    function onTableauClick(e) {
        if (isSuppressedClick()) return;
        const cardEl = e.target.closest('.sol-card');
        const colEl = e.target.closest('.sol-col');
        if (!colEl) return;
        const col = Number(colEl.dataset.col);
        if (!Number.isFinite(col)) return;

        if (cardEl && cardEl.dataset.index != null) {
            const idx = Number(cardEl.dataset.index);
            const card = tableau[col][idx];
            if (!card) return;

            if (!card.faceUp) {
                // flip only if it's the top
                if (idx === tableau[col].length - 1) {
                    pushHistory();
                    card.faceUp = true;
                    score = Math.max(0, score + 5);
                    moves += 1;
                    lastMovedCardId = card.id;
                    clearSelection();
                    setStatus('');
                    setHud();
                    return;
                }
                return;
            }

            // same card toggles selection
            if (selection && selection.from === 'tableau' && selection.col === col && selection.index === idx) {
                clearSelection();
                return;
            }

            // if we already selected something, try move to this column
            if (selection) {
                moveSelectionToTableau(col);
                return;
            }

            selectTableau(col, idx);
            return;
        }

        // click empty column area: attempt move selection here
        if (selection) moveSelectionToTableau(col);
    }

    function onDoubleClick(e) {
        const cardEl = e.target.closest('.sol-card');
        if (!cardEl) return;
        const wasteParent = cardEl.parentElement === wasteEl;
        if (wasteParent) {
            selectWaste();
            autoToFoundationFromSelection();
            return;
        }
        const colEl = e.target.closest('.sol-col');
        if (!colEl) return;
        const col = Number(colEl.dataset.col);
        const idx = Number(cardEl.dataset.index);
        selectTableau(col, idx);
        autoToFoundationFromSelection();
    }

    stockEl.addEventListener('click', drawFromStock);
    wasteEl.addEventListener('click', onWasteClick);
    tableauEl.addEventListener('click', onTableauClick);
    tableauEl.addEventListener('dblclick', onDoubleClick);
    for (let i = 0; i < 4; i++) {
        foundationEls[i].addEventListener('click', () => onFoundationClick(i));
    }
    newBtn.addEventListener('click', dealNewGame);
    undoBtn.addEventListener('click', undo);
    autoBtn.addEventListener('click', autoMoveToFoundations);
    guideBtn.addEventListener('click', () => showTutorial(true, true));

    function computeHint() {
        const lang = getLang();
        const tr = t(lang);
        hint = null;

        const candidates = [];
        const add = (weight, sourceId, target, message) => candidates.push({ weight, sourceId, target, message });

        const revealBonusIfMoveFrom = (fromCol, fromIndex) => {
            if (fromCol == null || fromIndex == null) return 0;
            const pile = tableau[fromCol];
            if (!pile.length) return 0;
            let firstFaceUp = -1;
            for (let i = 0; i < pile.length; i++) {
                if (pile[i].faceUp) { firstFaceUp = i; break; }
            }
            if (firstFaceUp !== -1 && fromIndex === firstFaceUp && firstFaceUp > 0) return 12;
            return 0;
        };

        const w = top(waste);
        if (w) {
            for (let i = 0; i < 4; i++) {
                if (canMoveToFoundation(w, i) && safeToAutoMoveToFoundation(w)) {
                    add(100, w.id, { type: 'foundation', index: i }, tr.hintMoveToFoundation || (lang === 'zh' ? '提示：可将牌移到基础堆' : 'Hint: move to foundation'));
                }
            }
        }

        for (let col = 0; col < 7; col++) {
            const c = top(tableau[col]);
            if (c && c.faceUp) {
                for (let i = 0; i < 4; i++) {
                    if (canMoveToFoundation(c, i) && safeToAutoMoveToFoundation(c)) {
                        const bonus = revealBonusIfMoveFrom(col, tableau[col].length - 1);
                        add(95 + bonus, c.id, { type: 'foundation', index: i }, tr.hintMoveToFoundation || (lang === 'zh' ? '提示：可将牌移到基础堆' : 'Hint: move to foundation'));
                    }
                }
            }
        }

        if (w) {
            for (let col = 0; col < 7; col++) {
                if (canMoveToTableau(w, col)) {
                    add(70, w.id, { type: 'tableau', index: col }, tr.hintMoveToTableau || (lang === 'zh' ? '提示：可将牌移到牌列' : 'Hint: move to tableau'));
                }
            }
        }

        for (let from = 0; from < 7; from++) {
            const pile = tableau[from];
            for (let idx = pile.length - 1; idx >= 0; idx--) {
                const card = pile[idx];
                if (!card.faceUp) break;
                const stack = pile.slice(idx);
                if (!isValidTableauStack(stack)) continue;
                for (let to = 0; to < 7; to++) {
                    if (to === from) continue;
                    if (canMoveToTableau(stack[0], to)) {
                        const bonus = revealBonusIfMoveFrom(from, idx);
                        add(60 + bonus, stack[0].id, { type: 'tableau', index: to }, tr.hintMoveToTableau || (lang === 'zh' ? '提示：可将牌移到牌列' : 'Hint: move to tableau'));
                    }
                }
            }
        }

        if (stock.length) {
            add(30, null, { type: 'stock' }, tr.hintDraw || (lang === 'zh' ? '提示：从牌堆抽一张' : 'Hint: draw a card'));
        } else if (waste.length) {
            add(25, null, { type: 'stock' }, tr.hintRecycle || (lang === 'zh' ? '提示：把废牌翻回牌堆' : 'Hint: recycle waste'));
        }

        if (!candidates.length) {
            return { sourceId: null, target: null, message: tr.hintNoMoves || (lang === 'zh' ? '提示：暂无可用操作' : 'Hint: no moves') };
        }

        candidates.sort((a, b) => b.weight - a.weight);
        const best = candidates[0];
        return { sourceId: best.sourceId, target: best.target, message: best.message };
    }

    hintBtn.addEventListener('click', () => {
        const h = computeHint();
        hint = h && h.target ? { sourceId: h.sourceId, target: h.target } : null;
        setStatus(h ? h.message : '');
        render();
    });

    document.addEventListener('languageChanged', () => {
        const lang = getLang();
        const tr = t(lang);
        if (!checkWin()) setStatus(tr.solitaireReady || (lang === 'zh' ? '准备就绪' : 'Ready'));
        setHud();
        render();
    });

    if (tutorialEl && tutorialSkipBtn && tutorialBackBtn && tutorialNextBtn) {
        tutorialSkipBtn.addEventListener('click', () => closeTutorial(true));
        tutorialBackBtn.addEventListener('click', () => {
            tutorial.step = Math.max(0, tutorial.step - 1);
            renderTutorialStep();
        });
        tutorialNextBtn.addEventListener('click', () => {
            const isLast = tutorial.step === tutorial.steps.length - 1;
            if (isLast) {
                closeTutorial(true);
                return;
            }
            tutorial.step = Math.min(tutorial.steps.length - 1, tutorial.step + 1);
            renderTutorialStep();
        });
        tutorialEl.addEventListener('click', (e) => {
            if (e.target && e.target.classList.contains('sol-tutorial-backdrop')) closeTutorial(true);
        });
        window.addEventListener('resize', scheduleTutorialReposition);
        // Capture scroll events from window and any scrollable containers
        document.addEventListener('scroll', scheduleTutorialReposition, true);
    }

    document.addEventListener('keydown', (e) => {
        const key = e.key;
        if (key === 'Escape') {
            clearSelection();
            return;
        }
        if (key === 'd' || key === 'D') {
            drawFromStock();
            return;
        }
        if (key === 'u' || key === 'U') {
            undo();
            return;
        }
        if (key === 'h' || key === 'H') {
            hintBtn.click();
            return;
        }
        if (key === 'a' || key === 'A') {
            autoMoveToFoundations();
        }
    });

    function onPointerDownOnCard(e, source) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if (dragState.pending || dragState.active) return;

        const cardEl = e.target.closest('.sol-card');
        if (!cardEl) return;

        if (source === 'waste') {
            // only top waste card
            if (cardEl.parentElement !== wasteEl) return;
            if (!waste.length) return;
        } else {
            const col = Number(cardEl.dataset.col);
            const idx = Number(cardEl.dataset.index);
            if (!Number.isFinite(col) || !Number.isFinite(idx)) return;
            const card = tableau[col] && tableau[col][idx];
            if (!card || !card.faceUp) return;
        }

        const rect = cardEl.getBoundingClientRect();
        dragState.pending = {
            source,
            col: source === 'tableau' ? Number(cardEl.dataset.col) : null,
            index: source === 'tableau' ? Number(cardEl.dataset.index) : null,
            pointerId: e.pointerId,
            startX: e.clientX,
            startY: e.clientY,
            originRect: rect
        };

        document.addEventListener('pointermove', onPointerMove, { passive: false });
        document.addEventListener('pointerup', onPointerUp, { passive: false });
        document.addEventListener('pointercancel', onPointerUp, { passive: false });
    }

    function onPointerMove(e) {
        if (!dragState.pending && !dragState.active) return;
        if (dragState.pending && e.pointerId !== dragState.pending.pointerId) return;
        if (dragState.active && e.pointerId !== dragState.pointerId) return;

        if (dragState.pending && !dragState.active) {
            const dx = e.clientX - dragState.pending.startX;
            const dy = e.clientY - dragState.pending.startY;
            const dist = Math.hypot(dx, dy);
            if (dist < 8) return;
            e.preventDefault();
            const ok = startDrag(dragState.pending);
            dragState.pending = null;
            if (!ok) {
                document.removeEventListener('pointermove', onPointerMove);
                document.removeEventListener('pointerup', onPointerUp);
                document.removeEventListener('pointercancel', onPointerUp);
            }
            return;
        }

        if (dragState.active) {
            e.preventDefault();
            moveDrag(e.clientX, e.clientY);
        }
    }

    function onPointerUp(e) {
        if (dragState.pending && e.pointerId === dragState.pending.pointerId) {
            dragState.pending = null;
        }
        if (dragState.active && e.pointerId === dragState.pointerId) {
            e.preventDefault();
            finishDrag();
        }
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);
        document.removeEventListener('pointercancel', onPointerUp);
    }

    wasteEl.addEventListener('pointerdown', (e) => onPointerDownOnCard(e, 'waste'));
    tableauEl.addEventListener('pointerdown', (e) => onPointerDownOnCard(e, 'tableau'));

    dealNewGame();
    // auto-show tutorial on first visit
    setTimeout(() => showTutorial(true, false), 300);
})();
