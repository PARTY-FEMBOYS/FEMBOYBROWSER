# ✿ Femboy Browser (Electron) ✿

Интерфейс — обычные HTML/CSS/JS (стекло, размытие, анимации), страницы рисует Chromium.
H.264 mp4 в фонах и на сайтах работает из коробки.

## Запуск
1. Поставь Node.js LTS: https://nodejs.org
2. В папке проекта:
   ```
   npm install
   npm start
   ```
   (на Windows — двойной клик по `start.bat`)

## Сборка в .exe
```
npm install
npm run dist
```
(или двойной клик по `build_exe.bat`). В папке `dist/` появятся:
* `Femboy Browser Setup 1.0.0.exe` — установщик (ставится в профиль пользователя, без админки);
* `Femboy Browser-1.0.0-win.zip` — портативная папка: распаковал и запустил.
`npm run pack` — только распакованная папка `dist/win-unpacked` (самый быстрый тест сборки).

Папки `themes/` и `backgrounds/` лежат РЯДОМ с exe — их можно менять без пересборки.
Свой значок: положи `build/icon.ico` и добавь в package.json → build → win → `"icon": "build/icon.ico"`.

## Темы
Файлы `themes/*.json` подхватываются на лету. Проще всего: 🎨 → «Редактор тем…» (живой предпросмотр).

| поле | что делает |
|---|---|
| name | название |
| background | имя фона без расширения (`bg1`) → `backgrounds/bg1.mp4`, если нет — `bg1.gif` |
| bg, panel | цвет окна / стеклянных панелей |
| accent, accent2 | акценты (активная вкладка, кнопки, градиенты) |
| text, text_dim | цвета текста |
| radius, blur | скругление и размытие стекла, px |
| panel_opacity, overlay_opacity | прозрачность панелей / затемнение фона, 0..1 |
| font | шрифт интерфейса |
| style_web | красить скроллбары и выделение на сайтах |

## Фоны
`backgrounds/`: `bg.mp4`/`bg.gif`, `bg1.mp4`/`bg1.gif`, ... mp4 приоритетнее gif; видео идёт по кругу без звука.
Заглушки — 5 сгенерированных gif (`python make_backgrounds.py` пересоздаст их). Замени на свои арты.

## Горячие клавиши
Ctrl+T/W вкладка · Ctrl+L адрес · Ctrl+D закладка · Ctrl+F поиск · Ctrl+H/B история/закладки ·
Ctrl+Shift+T темы · Ctrl+Tab переключение · Ctrl +/−/0 масштаб · F11 весь экран · F12 DevTools · Alt+←/→
