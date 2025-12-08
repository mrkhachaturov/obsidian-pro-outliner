# Changelog

## 1.0.6 (2025-12-09)

### Bug Fixes
- Fixed vertical lines click action not working with custom themes
- Fixed double-click issue on vertical lines causing incorrect rendering
- Fixed vertical lines appearing at wrong position on document open
- Exposed zoom API for backward compatibility with internal components

### Known Issues
- Vertical lines may occasionally render incorrectly after fold/unfold operations (click elsewhere to refresh) - fix in progress

## 1.0.5 (2025-12-08)

### Bug Fixes
- Fixed vim O command inserting below instead of above when current item has nested children

## 1.0.4 (2025-12-07)

### Improvements
- **Formatted breadcrumbs** - Wikilinks now display only their display text (e.g., `[[2025-12-05|Dec 5th]]` shows as `Dec 5th`)
- **Clean breadcrumbs** - Removed Creases plugin fold markers (`%% fold %%`) and other Obsidian comments from breadcrumbs
- **Block ID cleanup** - All block IDs (both plugin and native Obsidian format) are now hidden from breadcrumbs

## 1.0.3 (2025-12-07)

### Bug Fixes
- Fixed expand selection to full list items when selecting from parent to child items
- Fixed block IDs visibility in mirrored content when "Show block IDs" option is off
- Fixed debug logs appearing when debug mode is disabled

### Improvements
- Added "Paste as Block Link" command - pastes a wikilink to the original block
- Added setting to toggle visibility of block IDs and mirror markers

## 1.0.2 (2025-12-07)

### Bug Fixes
- Fixed mirror paste indentation when pasting at nested levels
- Fixed sync duplicates issue when original content was updated
- Fixed block ID adjacency issue (now requires space before `^`)

## 1.0.1 (2025-12-06)

### Features
- **Linked Copies (Mirrors)** - Create synchronized copies of list items across documents
- **i18n Support** - Added Russian language translations for all commands and settings
- **Go to Original** command - Navigate from mirror to original block
- **Break Mirror Link** command - Convert mirror to regular copy

### Bug Fixes
- Fixed mirror markers visibility in editor
- Fixed orphaned block ID cleanup when all mirrors are deleted

## 1.0.0 (2025-12-06)

Initial release combining [Outliner](https://github.com/vslinko/obsidian-outliner) and [Zoom](https://github.com/vslinko/obsidian-zoom) into a single unified plugin.

### Features from Obsidian Outliner
- Move lists up/down with keyboard shortcuts
- Indent/outdent lists with Tab/Shift+Tab
- Vertical indentation lines
- Stick cursor to content
- Enhanced Enter key behavior
- Fold/unfold lists
- Enhanced Ctrl+A/Cmd+A selection
- Drag-and-Drop support
- Better list styles

### Features from Obsidian Zoom
- Zoom into headings and lists
- Zoom out to entire document
- Click-to-zoom on bullets
- Breadcrumb navigation

### New Enhancements
- **Auto-expand selection** - When selecting text across multiple bullets, selection automatically expands to cover full list items including children
- **Zoom out one level** - New command (Cmd+Option+. / Ctrl+Alt+.) to step up one level at a time
- **Compact breadcrumbs** - Collapsible breadcrumb with expand/collapse animation
- **Hover breadcrumb expand** - Hover to preview full title, auto-collapse when clicking outside

