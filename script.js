// DOM Elements
const themeToggle = document.querySelector('.theme-toggle');
const filterButtons = document.querySelectorAll('.filter-btn');
const gameCards = document.querySelectorAll('.game-card');
const languageSelector = document.getElementById('language-selector'); // Get language selector
const shareButton = document.querySelector('.share-btn');
const shareStatus = document.getElementById('share-status');

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

if (shareButton) {
    shareButton.addEventListener('click', async () => {
        const lang = getCurrentLanguage();
        const messages = getTranslationsForLang(lang);
        const url = 'https://dengkai666666.github.io/gameverse-mini-hub/';
        try {
            if (navigator.share) {
                await navigator.share({ title: 'GameVerse', text: messages.shareDescription, url });
                if (shareStatus) shareStatus.textContent = '';
            } else {
                await navigator.clipboard.writeText(url);
                if (shareStatus) shareStatus.textContent = messages.linkCopied;
            }
        } catch (error) {
            if (error && error.name === 'AbortError') return;
            if (shareStatus) shareStatus.textContent = messages.shareFailed;
        }
    });
}

function updateThemeControl(isDark) {
    if (!themeToggle) return;
    const icon = themeToggle.querySelector('i');
    if (icon) icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    const isZh = document.documentElement.lang === 'zh';
    themeToggle.setAttribute('aria-label', isDark
        ? (isZh ? '切换到浅色模式' : 'Switch to light theme')
        : (isZh ? '切换到深色模式' : 'Switch to dark theme'));
    themeToggle.setAttribute('aria-pressed', String(isDark));
}

// --- Theme Toggle Logic ---
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        const isDark = document.body.classList.contains('dark-theme');
        updateThemeControl(isDark);
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });
}

// Apply saved theme on load
window.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-theme');
    }
    updateThemeControl(document.body.classList.contains('dark-theme'));
});

// --- Category Filter Logic ---
filterButtons.forEach(button => {
    button.addEventListener('click', () => {
        filterButtons.forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-pressed', 'false');
        });
        button.classList.add('active');
        button.setAttribute('aria-pressed', 'true');
        const filterValue = button.getAttribute('data-filter');

        gameCards.forEach(card => {
            const matches = filterValue === 'all' || card.getAttribute('data-category') === filterValue;
            card.toggleAttribute('hidden', !matches);
        });
    });
});

// --- Smooth Scrolling Logic ---
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        const targetId = this.getAttribute('href');
        if (targetId && targetId !== '#') {
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                window.scrollTo({
                    top: targetElement.offsetTop - 80, // Adjusted offset for sticky header
                    behavior: 'smooth'
                });
            }
        }
    });
});

// --- Animate on Scroll Logic ---
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.games-grid .game-card, .developer-grid .developer-card').forEach((card, index) => {
        card.style.setProperty('--card-index', index);
    });

    const elements = document.querySelectorAll('.section-header, .game-card, .featured-game-card, .developer-card');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
        elements.forEach(element => element.classList.add('animate'));
        return;
    }

    elements.forEach(element => element.classList.add('reveal-pending'));
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('animate');
            observer.unobserve(entry.target);
        });
    }, { rootMargin: '0px 0px -12% 0px' });
    elements.forEach(element => observer.observe(element));
});

// --- Language Switching Logic ---

// Function to get the current language setting
function getCurrentLanguage() {
    let currentLang = localStorage.getItem('language') ||
                     (navigator.language || navigator.userLanguage).split('-')[0];
    if (!['zh', 'en'].includes(currentLang)) {
        currentLang = 'en'; // Default to English if unsupported language
    }
    return currentLang;
}

// Function to get the appropriate translation source
function getTranslationSource() {
    // Only use primary translations. If they fail to load, keep the UI in its default language
    // rather than falling back to pinyin.
    if (typeof translations !== 'undefined' && translations && translations.en) {
        return translations;
    }
    console.error("No translation data found!");
    return { en: {}, zh: {} };
}

// Function to get translations for a specific language
function getTranslationsForLang(lang) {
    const source = getTranslationSource();
    return source[lang] || source['en'] || {}; // Fallback to English if lang not found
}

function readStoredNumber(key) {
    const value = Number(localStorage.getItem(key) || '0');
    return Number.isFinite(value) && value > 0 ? value : 0;
}

function updateLocalProgress() {
    const lang = getCurrentLanguage();
    const stats = {
        memory: readStoredNumber('memoryWins'),
        snake: readStoredNumber('snakeHighScore'),
        g2048: readStoredNumber('g2048BestScore'),
        flappy: readStoredNumber('flappyBestScore'),
        ttt: readStoredNumber('tttGamesPlayed'),
        solitaire: readStoredNumber('solitaireWins')
    };
    const values = {
        snake: String(stats.snake),
        g2048: String(stats.g2048),
        flappy: String(stats.flappy),
        ttt: String(stats.ttt),
        solitaire: String(stats.solitaire)
    };
    const memoryMoves = readStoredNumber('memoryBestMoves');
    const memoryTime = readStoredNumber('memoryBestTime');
    values.memory = memoryMoves
        ? (lang === 'zh' ? `${memoryMoves} 步 · ${memoryTime} 秒` : `${memoryMoves} moves · ${memoryTime}s`)
        : '—';

    document.querySelectorAll('[data-stat]').forEach(element => {
        element.textContent = values[element.dataset.stat] ?? '0';
    });

    const goals = { memory: 1, snake: 10, g2048: 2048, flappy: 5, ttt: 5, solitaire: 1 };
    const labels = translations[lang] || translations.en;
    document.querySelectorAll('[data-achievement]').forEach(element => {
        const game = element.dataset.achievement;
        const unlocked = stats[game] >= goals[game];
        element.textContent = unlocked ? `✓ ${labels.achievementUnlocked}` : `${labels.achievementGoal}: ${labels[`goal${game[0].toUpperCase()}${game.slice(1)}`]}`;
        element.classList.toggle('unlocked', unlocked);
    });
}

window.addEventListener('pageshow', updateLocalProgress);
document.addEventListener('gameverseStatsUpdated', updateLocalProgress);

function startTypewriterEffect(element, text) {
    element.textContent = text;
}

// Update page language based on selected language
function updatePageLanguage(lang) {
    document.documentElement.lang = lang;
    updateThemeControl(document.body.classList.contains('dark-theme'));

    const translationData = getTranslationsForLang(lang);

    // Select all elements with a data-key attribute
    document.querySelectorAll('[data-key]').forEach(element => {
        const key = element.dataset.key;
        if (translationData[key]) {
            // Special handling for typewriter effect
            if (element.classList.contains('typewriter-text')) {
                startTypewriterEffect(element, translationData[key]);
            } else if (element.tagName === 'OPTION') {
                element.textContent = translationData[key];
            } else if (element.tagName === 'LABEL' && element.classList.contains('sr-only')) {
                element.textContent = translationData[key];
                const select = document.getElementById(element.getAttribute('for'));
                if (select) select.setAttribute('aria-label', translationData[key]);
            } else {
                element.textContent = translationData[key];
            }
        } else {
            console.warn(`Translation key "${key}" not found for language "${lang}".`);
        }
    });

    document.querySelectorAll('[data-key-aria-label]').forEach(element => {
        const label = translationData[element.dataset.keyAriaLabel];
        if (label) element.setAttribute('aria-label', label);
    });

    // --- Specific handling for Game Cards (using data-key-* attributes) ---
    document.querySelectorAll('.game-card').forEach(card => {
        // Translate Title
        const titleElement = card.querySelector('.game-info h3[data-key-title]');
        if (titleElement) {
            const titleKey = titleElement.dataset.keyTitle;
            if (translationData[titleKey]) {
                titleElement.textContent = translationData[titleKey];
            } else {
                 console.warn(`Translation key "${titleKey}" (title) not found for language "${lang}".`);
            }
        }

        // Translate Category
        const categoryElement = card.querySelector('.game-meta .category[data-key-category]');
         if (categoryElement) {
            const categoryKey = categoryElement.dataset.keyCategory;
            if (translationData[categoryKey]) {
                categoryElement.textContent = translationData[categoryKey];
            } else {
                 console.warn(`Translation key "${categoryKey}" (category) not found for language "${lang}".`);
            }
        }

        // Translate Difficulty
        const difficultyElement = card.querySelector('.game-meta .difficulty[data-key-difficulty]');
         if (difficultyElement) {
            const difficultyKey = difficultyElement.dataset.keyDifficulty;
            if (translationData[difficultyKey]) {
                difficultyElement.textContent = translationData[difficultyKey];
            } else {
                 console.warn(`Translation key "${difficultyKey}" (difficulty) not found for language "${lang}".`);
            }
        }
    });


    // --- Specific handling for Copyright ---
    const copyrightElement = document.querySelector('.footer-bottom p');
    if (copyrightElement) {
        const year = new Date().getFullYear();
        const copyrightText = translationData.allRightsReserved || 'All Rights Reserved.'; // Fallback text
        copyrightElement.textContent = `\u00A9 ${year} GameVerse. ${copyrightText}`;
    }

    updateLocalProgress();

    // --- Dispatch event for other scripts (like memory game) ---
    const event = new CustomEvent('languageChanged', { detail: { language: lang } });
    document.dispatchEvent(event);
}


// Initialize language on page load
document.addEventListener('DOMContentLoaded', function() {
    const initialLang = getCurrentLanguage();
    
    // 设置下拉菜单语言
    if (languageSelector) {
        languageSelector.value = initialLang; // Set dropdown to current language
    }
    
    // 应用翻译
    updatePageLanguage(initialLang); // Apply translations

    // Add event listener for language change
    if (languageSelector) {
        languageSelector.addEventListener('change', function() {
            const selectedLang = this.value;
            localStorage.setItem('language', selectedLang); // Save preference
            updatePageLanguage(selectedLang); // Update UI
        });
    }
});
