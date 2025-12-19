// solitaire.js (Klondike-lite, click-to-move)
(function() {
    const stockEl = document.getElementById('sol-stock');
    const wasteEl = document.getElementById('sol-waste');
    const tableauEl = document.getElementById('sol-tableau');
    const statusEl = document.getElementById('sol-status');
    const newBtn = document.getElementById('sol-new');
    const undoBtn = document.getElementById('sol-undo');
    const hintBtn = document.getElementById('sol-hint');
    const scoreEl = document.getElementById('sol-score');
    const movesEl = document.getElementById('sol-moves');
    const foundationEls = [
        document.getElementById('sol-foundation-0'),
        document.getElementById('sol-foundation-1'),
        document.getElementById('sol-foundation-2'),
        document.getElementById('sol-foundation-3')
    ];

    if (!stockEl || !wasteEl || !tableauEl || !statusEl || !newBtn || !undoBtn || !hintBtn || !scoreEl || !movesEl || foundationEls.some(el => !el)) return;

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

    function setStatus(text) {
        statusEl.textContent = text || '';
    }

    function setHud() {
        const lang = getLang();
        const tr = t(lang);
        scoreEl.textContent = format(tr.scoreLabel || (lang === 'zh' ? '得分：{score}' : 'Score: {score}'), { score });
        movesEl.textContent = format(tr.movesLabel || (lang === 'zh' ? '步数：{moves}' : 'Moves: {moves}'), { moves });
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

    function onWasteClick(e) {
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

    function computeHint() {
        const lang = getLang();
        const tr = t(lang);
        hint = null;

        const w = top(waste);
        if (w) {
            for (let i = 0; i < 4; i++) {
                if (canMoveToFoundation(w, i)) return { sourceId: w.id, target: { type: 'foundation', index: i }, message: tr.hintMoveToFoundation || (lang === 'zh' ? '提示：可将牌移到基础堆' : 'Hint: move to foundation') };
            }
        }

        for (let col = 0; col < 7; col++) {
            const c = top(tableau[col]);
            if (c && c.faceUp) {
                for (let i = 0; i < 4; i++) {
                    if (canMoveToFoundation(c, i)) return { sourceId: c.id, target: { type: 'foundation', index: i }, message: tr.hintMoveToFoundation || (lang === 'zh' ? '提示：可将牌移到基础堆' : 'Hint: move to foundation') };
                }
            }
        }

        if (w) {
            for (let col = 0; col < 7; col++) {
                if (canMoveToTableau(w, col)) return { sourceId: w.id, target: { type: 'tableau', index: col }, message: tr.hintMoveToTableau || (lang === 'zh' ? '提示：可将牌移到牌列' : 'Hint: move to tableau') };
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
                        return { sourceId: stack[0].id, target: { type: 'tableau', index: to }, message: tr.hintMoveToTableau || (lang === 'zh' ? '提示：可将牌移到牌列' : 'Hint: move to tableau') };
                    }
                }
            }
        }

        if (stock.length) {
            return { sourceId: null, target: { type: 'stock' }, message: tr.hintDraw || (lang === 'zh' ? '提示：从牌堆抽一张' : 'Hint: draw a card') };
        }
        if (waste.length) {
            return { sourceId: null, target: { type: 'stock' }, message: tr.hintRecycle || (lang === 'zh' ? '提示：把废牌翻回牌堆' : 'Hint: recycle waste') };
        }

        return { sourceId: null, target: null, message: tr.hintNoMoves || (lang === 'zh' ? '提示：暂无可用操作' : 'Hint: no moves') };
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

    dealNewGame();
})();
