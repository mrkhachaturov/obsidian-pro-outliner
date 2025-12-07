/**
 * Internationalization (i18n) service for Pro Outliner
 * Supports English and Russian languages
 */

type TranslationKey = keyof typeof translations.en;

const translations = {
  en: {
    // ===========================================
    // COMMANDS
    // ===========================================
    "cmd.paste-as-linked-copy": "Paste as linked copy (mirror)",
    "cmd.go-to-original": "Go to original (from mirror)",
    "cmd.break-mirror-link": "Break mirror link (convert to regular text)",
    "cmd.zoom-in": "Zoom in",
    "cmd.zoom-out": "Zoom out the entire document",
    "cmd.zoom-out-one-level": "Zoom out one level",
    "cmd.fold": "Fold the list",
    "cmd.unfold": "Unfold the list",
    "cmd.move-list-up": "Move list and sublists up",
    "cmd.move-list-down": "Move list and sublists down",
    "cmd.indent-list": "Indent the list and sublists",
    "cmd.outdent-list": "Outdent the list and sublists",
    "cmd.show-system-info": "Show System Info",

    // ===========================================
    // NOTICES (Mirror feature)
    // ===========================================
    "notice.feature-disabled": "Linked copies feature is disabled. Enable it in settings.",
    "notice.no-recent-copy": "No recent copy found. Copy a list item first, then use this command to paste as mirror.",
    "notice.cannot-mirror-mirror": "Cannot create mirror of a mirror. Copy the original instead.",
    "notice.source-file-not-found": "Source file no longer exists.",
    "notice.source-line-not-found": "Source line no longer exists.",
    "notice.source-changed": "Source content has changed. Please copy again.",
    "notice.pasted-as-mirror": "Pasted as linked copy (mirror)",
    "notice.not-on-mirror": "Cursor is not on a mirror block",
    "notice.not-on-mirror-line": "Cursor is not on a mirror line",
    "notice.original-not-found": "Original block not found",
    "notice.navigated-to-original": "Navigated to original in {filename}",
    "notice.mirror-link-removed": "Mirror link removed - this is now regular text",

    // ===========================================
    // SETTINGS TAB
    // ===========================================
    "settings.tab-name": "Pro Outliner",
    
    // Outliner settings
    "settings.outliner-title": "Outliner",
    "settings.style-lists": "Improve the style of your lists",
    "settings.style-lists-desc": "Makes the bullets look cleaner with better spacing.",
    "settings.stick-cursor": "Stick the cursor to the content",
    "settings.stick-cursor-desc": "Don't let the cursor move to the bullet position.",
    "settings.stick-cursor-bullet-checkbox": "Stick to bullet and checkbox",
    "settings.stick-cursor-content": "Stick to content",
    "settings.stick-cursor-never": "Never",
    "settings.better-enter": "Enhance the Enter key",
    "settings.better-enter-desc": "Make the Enter key continue lists automatically.",
    "settings.better-tab": "Enhance the Tab key",
    "settings.better-tab-desc": "Make the Tab key indent lists properly.",
    "settings.select-all": "Enhance the Select All behavior",
    "settings.select-all-desc": "Smarter selection when pressing Cmd/Ctrl+A.",
    "settings.vertical-lines": "Draw vertical indentation lines",
    "settings.vertical-lines-desc": "Show vertical lines to visualize list hierarchy.",
    "settings.dnd": "Drag-and-Drop",
    "settings.dnd-desc": "Drag list items by their bullet point.",
    "settings.override-tab": "Override Tab behavior",
    "settings.override-tab-desc": "Let the plugin control Tab key behavior in lists.",

    // Zoom settings
    "settings.zoom-title": "Zoom",
    "settings.zoom-on-click": "Zoom in when clicking on the bullet",
    "settings.zoom-on-click-desc": "Click on a bullet to zoom into that item.",
    "settings.zoom-on-click-desktop": "Desktop",
    "settings.zoom-on-click-mobile": "Mobile",

    // Linked copies settings
    "settings.linked-copies-title": "Linked Copies (Mirrors)",
    "settings.linked-copies": "Enable Linked Copies",
    "settings.linked-copies-desc": "Create linked copies (mirrors) of list items. Copy an item normally, then use the 'Paste as linked copy' command. Changes to the original will sync to mirrors.",

    // Debug
    "settings.debug-title": "Advanced",
    "settings.debug": "Debug mode",
    "settings.debug-desc": "Open DevTools (Command+Option+I or Control+Shift+I) to copy the debug logs.",

    // Additional settings
    "settings.list-behavior-title": "List Behavior",
    "settings.stick-cursor-bullet-only": "Stick cursor out of bullets",
    "settings.vim-mode-o": "Vim-mode o/O inserts bullets",
    "settings.vim-mode-o-desc": "Create a bullet when pressing o or O in Vim mode.",
    "settings.ctrl-a": "Enhance the Ctrl+A or Cmd+A behavior",
    "settings.ctrl-a-desc": "Press the hotkey once to select the current list item. Press the hotkey twice to select the entire list.",
    "settings.auto-expand": "Auto-expand selection to full list items",
    "settings.auto-expand-desc": "When selecting across multiple bullets, automatically expand the selection to include full list items with their children.",
    "settings.appearance-title": "Appearance",
    "settings.style-lists-full-desc": "Styles are only compatible with built-in Obsidian themes and may not be compatible with other themes.",
    "settings.vertical-lines-action": "Vertical indentation line click action",
    "settings.vertical-lines-action-none": "None",
    "settings.vertical-lines-action-zoom": "Zoom In",
    "settings.vertical-lines-action-fold": "Toggle Folding",
    "settings.linked-copies-full-desc": "Create synchronized copies of list items. Copy normally, then use the 'Paste as linked copy' command (set your own hotkey in Settings → Hotkeys). Changes to the original automatically sync to mirrors.",
  },

  ru: {
    // ===========================================
    // COMMANDS
    // ===========================================
    "cmd.paste-as-linked-copy": "Вставить как связанную копию (зеркало)",
    "cmd.go-to-original": "Перейти к оригиналу",
    "cmd.break-mirror-link": "Разорвать связь (преобразовать в обычный текст)",
    "cmd.zoom-in": "Увеличить (зум)",
    "cmd.zoom-out": "Уменьшить (зум) — весь документ",
    "cmd.zoom-out-one-level": "Уменьшить (зум) — на один уровень",
    "cmd.fold": "Свернуть список",
    "cmd.unfold": "Развернуть список",
    "cmd.move-list-up": "Переместить список вверх",
    "cmd.move-list-down": "Переместить список вниз",
    "cmd.indent-list": "Увеличить отступ списка",
    "cmd.outdent-list": "Уменьшить отступ списка",
    "cmd.show-system-info": "Показать системную информацию",

    // ===========================================
    // NOTICES (Mirror feature)
    // ===========================================
    "notice.feature-disabled": "Функция связанных копий отключена. Включите её в настройках.",
    "notice.no-recent-copy": "Нет недавней копии. Сначала скопируйте элемент списка, затем используйте эту команду.",
    "notice.cannot-mirror-mirror": "Нельзя создать зеркало от зеркала. Скопируйте оригинал.",
    "notice.source-file-not-found": "Исходный файл больше не существует.",
    "notice.source-line-not-found": "Исходная строка больше не существует.",
    "notice.source-changed": "Исходный контент изменился. Скопируйте снова.",
    "notice.pasted-as-mirror": "Вставлено как связанная копия (зеркало)",
    "notice.not-on-mirror": "Курсор не на зеркальном блоке",
    "notice.not-on-mirror-line": "Курсор не на строке зеркала",
    "notice.original-not-found": "Оригинальный блок не найден",
    "notice.navigated-to-original": "Переход к оригиналу в {filename}",
    "notice.mirror-link-removed": "Связь удалена — теперь это обычный текст",

    // ===========================================
    // SETTINGS TAB
    // ===========================================
    "settings.tab-name": "Pro Outliner",
    
    // Outliner settings
    "settings.outliner-title": "Аутлайнер",
    "settings.style-lists": "Улучшить стиль списков",
    "settings.style-lists-desc": "Делает маркеры чище с лучшими отступами.",
    "settings.stick-cursor": "Привязать курсор к контенту",
    "settings.stick-cursor-desc": "Не позволять курсору переходить на позицию маркера.",
    "settings.stick-cursor-bullet-checkbox": "К маркеру и чекбоксу",
    "settings.stick-cursor-content": "К контенту",
    "settings.stick-cursor-never": "Никогда",
    "settings.better-enter": "Улучшить клавишу Enter",
    "settings.better-enter-desc": "Enter автоматически продолжает списки.",
    "settings.better-tab": "Улучшить клавишу Tab",
    "settings.better-tab-desc": "Tab правильно отступает списки.",
    "settings.select-all": "Улучшить Выделить всё",
    "settings.select-all-desc": "Умное выделение при нажатии Cmd/Ctrl+A.",
    "settings.vertical-lines": "Рисовать вертикальные линии отступов",
    "settings.vertical-lines-desc": "Показывать вертикальные линии для визуализации иерархии.",
    "settings.dnd": "Перетаскивание",
    "settings.dnd-desc": "Перетаскивайте элементы списка за маркер.",
    "settings.override-tab": "Переопределить поведение Tab",
    "settings.override-tab-desc": "Плагин контролирует поведение Tab в списках.",

    // Zoom settings
    "settings.zoom-title": "Масштабирование",
    "settings.zoom-on-click": "Зум при клике на маркер",
    "settings.zoom-on-click-desc": "Кликните на маркер чтобы увеличить этот элемент.",
    "settings.zoom-on-click-desktop": "Десктоп",
    "settings.zoom-on-click-mobile": "Мобильный",

    // Linked copies settings
    "settings.linked-copies-title": "Связанные копии (Зеркала)",
    "settings.linked-copies": "Включить связанные копии",
    "settings.linked-copies-desc": "Создавайте связанные копии (зеркала) элементов списка. Скопируйте элемент, затем используйте команду 'Вставить как связанную копию'. Изменения в оригинале синхронизируются с зеркалами.",

    // Debug
    "settings.debug-title": "Расширенные",
    "settings.debug": "Режим отладки",
    "settings.debug-desc": "Откройте DevTools (Command+Option+I или Control+Shift+I) чтобы скопировать отладочные логи.",

    // Additional settings
    "settings.list-behavior-title": "Поведение списков",
    "settings.stick-cursor-bullet-only": "Не пускать курсор на маркеры",
    "settings.vim-mode-o": "Vim-режим o/O вставляет маркеры",
    "settings.vim-mode-o-desc": "Создавать маркер при нажатии o или O в режиме Vim.",
    "settings.ctrl-a": "Улучшить поведение Ctrl+A или Cmd+A",
    "settings.ctrl-a-desc": "Первое нажатие выделяет текущий элемент списка. Второе нажатие выделяет весь список.",
    "settings.auto-expand": "Авто-расширение выделения на полные элементы",
    "settings.auto-expand-desc": "При выделении через несколько маркеров автоматически расширять выделение до полных элементов с их детьми.",
    "settings.appearance-title": "Внешний вид",
    "settings.style-lists-full-desc": "Стили совместимы только со встроенными темами Obsidian и могут не работать с другими темами.",
    "settings.vertical-lines-action": "Действие при клике на вертикальную линию",
    "settings.vertical-lines-action-none": "Ничего",
    "settings.vertical-lines-action-zoom": "Увеличить",
    "settings.vertical-lines-action-fold": "Свернуть/развернуть",
    "settings.linked-copies-full-desc": "Создавайте синхронизированные копии элементов списка. Скопируйте обычным способом, затем используйте команду 'Вставить как связанную копию' (назначьте горячую клавишу в Настройки → Горячие клавиши). Изменения в оригинале автоматически синхронизируются с зеркалами.",
  },
} as const;

type Language = keyof typeof translations;

/**
 * Get the current Obsidian language
 */
function getCurrentLanguage(): Language {
  // Obsidian stores language in localStorage
  const lang = window.localStorage.getItem("language");
  
  // Check if we have translations for this language
  if (lang && lang in translations) {
    return lang as Language;
  }
  
  // Fallback to English
  return "en";
}

/**
 * Translate a key to the current language
 * Supports placeholder replacement: t("key", { filename: "test.md" })
 */
export function t(
  key: TranslationKey,
  replacements?: Record<string, string>,
): string {
  const lang = getCurrentLanguage();
  let text: string = translations[lang][key] || translations.en[key] || key;

  // Replace placeholders like {filename}
  if (replacements) {
    for (const [placeholder, value] of Object.entries(replacements)) {
      text = text.replace(`{${placeholder}}`, value);
    }
  }

  return text;
}

/**
 * Get all available languages
 */
export function getAvailableLanguages(): Language[] {
  return Object.keys(translations) as Language[];
}

