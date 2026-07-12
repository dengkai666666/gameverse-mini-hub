# Contributing to GameVerse

Thanks for helping make GameVerse better.

## Project principles

- Keep the site fully static: HTML, CSS, JavaScript and browser APIs only.
- Do not require a backend, database, build service or paid dependency.
- Preserve mobile touch controls, keyboard access, bilingual UI and dark mode.
- Prefer small, focused changes that can be tested directly in a browser.

## Local development

```bash
python -m http.server 8000
```

Open `http://localhost:8000/`, test the affected game on desktop and mobile widths, then run:

```bash
node --check script.js
```

Run the same syntax check for every JavaScript file you changed.

## Adding a game

1. Create a standalone HTML page and its minimal CSS/JavaScript files.
2. Add the game card to `index.html`.
3. Add Chinese and English strings to `translations.js`.
4. Support touch and keyboard input where appropriate.
5. Verify light/dark themes and a 390px-wide viewport.

Please avoid committing secrets, generated caches, dependencies or user data.
