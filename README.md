# Obsidian Pro Outliner

**Work with your lists like in Workflowy, RoamResearch, or Tana, with powerful zoom functionality**

This plugin combines the features of [Obsidian Outliner](https://github.com/vslinko/obsidian-outliner) and [Obsidian Zoom](https://github.com/vslinko/obsidian-zoom) into a single, unified plugin with additional enhancements.

## Credits

This plugin is built upon the excellent work by **Viacheslav Slinko** ([@vslinko](https://github.com/vslinko)):

- [Obsidian Outliner](https://github.com/vslinko/obsidian-outliner) - List manipulation features
- [Obsidian Zoom](https://github.com/vslinko/obsidian-zoom) - Zoom functionality

Both original plugins are licensed under the MIT License.

## Demo

![Demo](demos/demo1.gif)

## Installation

Until this plugin is made available in the official Community Plugins, it can be installed via [BRAT](https://github.com/TfTHacker/obsidian42-brat):

1. Install the **BRAT** plugin from the Community Plugins page
2. Go to BRAT settings
3. Click **"Add Beta Plugin"** button
4. Paste the following URL: `https://github.com/mrkhachaturov/obsidian-pro-outliner`
5. Select the latest release
6. Make sure **"Enable after installing the plugin"** is checked
7. Click **"Add Plugin"** button

### Manual Installation

Download `main.js`, `manifest.json`, `styles.css` from the [latest release](https://github.com/mrkhachaturov/obsidian-pro-outliner/releases/latest) and put them into `<vault>/.obsidian/plugins/obsidian-pro-outliner` folder.

## Features

### Outliner Features

#### Move Lists Back and Forth

Move lists with children wherever you want without breaking the structure.

| Command                       | Windows/Linux                              | MacOS                                         |
|-------------------------------|:------------------------------------------:|:---------------------------------------------:|
| Move list and sublists up     | <kbd>Ctrl</kbd><kbd>Shift</kbd><kbd>↑</kbd> | <kbd>Command</kbd><kbd>Shift</kbd><kbd>↑</kbd> |
| Move list and sublists down   | <kbd>Ctrl</kbd><kbd>Shift</kbd><kbd>↓</kbd> | <kbd>Command</kbd><kbd>Shift</kbd><kbd>↓</kbd> |
| Indent the list and sublists  | <kbd>Tab</kbd>                              | <kbd>Tab</kbd>                                 |
| Outdent the list and sublists | <kbd>Shift</kbd><kbd>Tab</kbd>              | <kbd>Shift</kbd><kbd>Tab</kbd>                 |

#### Fold and Unfold Lists

| Command         | Windows/Linux                  | MacOS                          |
|-----------------|:------------------------------:|:------------------------------:|
| Fold the list   | <kbd>Ctrl</kbd><kbd>↑</kbd>    | <kbd>Command</kbd><kbd>↑</kbd> |
| Unfold the list | <kbd>Ctrl</kbd><kbd>↓</kbd>    | <kbd>Command</kbd><kbd>↓</kbd> |

#### Stick the Cursor to the Content

Don't let the cursor move to the bullet position. Affects cursor movement, text deletion, text selection.

#### Enhance the Enter Key

Make the Enter key behave the same as other outliners:
- Enter outdents list item if it's empty
- Enter creates new line on children level if there are any children
- Shift-Enter creates a new note line

#### Enhance the Ctrl+A or Cmd+A Behavior

Press the hotkey once to select the current list item. Press the hotkey twice to select the entire list.

#### Vim-mode o/O Inserts Bullets

When using Obsidian's built-in vim mode:
- **o** (lowercase) — Creates a new bullet below the current item. If the current item has children, inserts as the first child.
- **O** (uppercase) — Creates a new bullet above the current item.

Both commands automatically add the bullet prefix and enter insert mode, matching the behavior of other outliners.

#### Drag-and-Drop

Drag list items by their bullets to reorder them.

#### Draw Vertical Indentation Lines

Visual guides showing list indentation levels.

**Style Settings Integration:** If you have the [Style Settings](https://github.com/mgmeyers/obsidian-style-settings) plugin installed, you can customize the appearance of vertical lines:
- Line color
- Line width
- Hover color
- Horizontal offset
- Top offset
- Click area width
- Rounded line ends with adjustable border radius

### Zoom Features

#### Zoom In/Out

Hide everything except the list/heading and its content.

| Command                      | Windows/Linux                              | MacOS                                          |
|------------------------------|:------------------------------------------:|:----------------------------------------------:|
| Zoom in                      | <kbd>Ctrl</kbd><kbd>.</kbd>                | <kbd>Command</kbd><kbd>.</kbd>                 |
| Zoom out the entire document | <kbd>Ctrl</kbd><kbd>Shift</kbd><kbd>.</kbd>| <kbd>Command</kbd><kbd>Shift</kbd><kbd>.</kbd> |
| Zoom out one level           | <kbd>Ctrl</kbd><kbd>Alt</kbd><kbd>.</kbd>  | <kbd>Command</kbd><kbd>Option</kbd><kbd>.</kbd>|

#### Click to Zoom

Click on any bullet point to zoom into that list item.

#### Breadcrumb Navigation

When zoomed in, a breadcrumb header shows your location in the document hierarchy. Click any breadcrumb to navigate.

### Linked Copies (Mirrors)

Create synchronized copies of outline blocks that stay in sync with the original — similar to Tana's mirror feature.

| Command                        | Description                                              |
|--------------------------------|----------------------------------------------------------|
| Paste as linked copy (mirror)  | Paste copied outline as a mirror that syncs with original |
| Paste as block link            | Paste a wikilink to the copied block (no sync, just navigation) |
| Go to original                 | Navigate from mirror to its source block                  |
| Break mirror link              | Convert mirror to regular text (stops syncing)            |

**Features:**
- **One-way sync:** Changes in the original automatically update all mirrors
- **Cross-note support:** Mirrors can be in different files
- **Visual indicator:** Mirrors show a dashed bullet outline
- **Cascade delete:** When original is deleted, mirrors are removed
- **Auto-repair:** Block IDs are automatically repaired if corrupted
- **Root-level only:** Only top-level list items can be mirrored (nested items use block links)

**Setting:** Linked Copies (Mirrors) — On by default

## Enhancements Over Original Plugins

This combined plugin includes the following enhancements:

### 1. Auto-Expand Selection to Full List Items

When selecting text across multiple bullets, the selection automatically expands to cover full list items including their children. This mimics the behavior of Dynalist and WorkFlowy.

**Setting:** Auto-expand selection to full list items (on by default)

### 2. Zoom Out One Level

A new command that lets you step up one level at a time instead of zooming out to the entire document at once. Useful when you're deep in a nested list and want to gradually navigate back up.

- **Hotkey:** <kbd>Cmd</kbd><kbd>Option</kbd><kbd>.</kbd> (Mac) / <kbd>Ctrl</kbd><kbd>Alt</kbd><kbd>.</kbd> (Windows/Linux)
- Falls back to full zoom out when already at the top level

### 3. Compact Breadcrumbs with Expand/Collapse Animation

When zoomed deep into nested content, the breadcrumb header automatically collapses to show only:
- The root (document title)
- An "..." button
- The last two levels

Click "..." to expand and see the full path. Each breadcrumb shows a tooltip with its full title on hover.

### 4. Hover to Expand Breadcrumbs

Hover over a truncated breadcrumb to smoothly expand and reveal its full title. The current level (last breadcrumb) always shows its full title.

### 5. Linked Copies (Mirrors)

Create linked copies of outline blocks that automatically sync with the original. Inspired by Tana's mirror feature. Mirrors are visually distinguished with a dashed bullet outline.

### 6. Internationalization (i18n)

Full support for multiple languages. Currently supports:
- English
- Russian

## Settings

### List Behavior

| Setting                                   | Default                    |
|-------------------------------------------|:--------------------------:|
| Stick the cursor to the content           | Bullets and checkboxes     |
| Enhance the Tab key                       | On                         |
| Enhance the Enter key                     | On                         |
| Vim-mode o/O inserts bullets              | On                         |
| Enhance the Ctrl+A or Cmd+A behavior      | On                         |
| Auto-expand selection to full list items  | On                         |

### Appearance

| Setting                                 | Default        |
|-----------------------------------------|:--------------:|
| Improve the style of your lists         | On             |
| Draw vertical indentation lines         | Off            |
| Vertical indentation line click action  | Toggle Folding |
| Drag-and-Drop                           | On             |

### Zoom

| Setting                                | Default |
|----------------------------------------|:-------:|
| Zoom in when clicking on the bullet    | On      |

### Linked Copies

| Setting                                | Default |
|----------------------------------------|:-------:|
| Enable Linked Copies (Mirrors)         | On      |
| Show block IDs and mirror markers      | Off     |

### Debug

| Setting    | Default |
|------------|:-------:|
| Debug mode | Off     |

## License

MIT License - See [LICENSE](LICENSE) for details.

This plugin is based on code originally created by Viacheslav Slinko, used under the MIT License.

## Author

**Ruben Khachaturov** ([@mrkhachaturov](https://github.com/mrkhachaturov))

Combining and enhancing the original plugins by Viacheslav Slinko.

