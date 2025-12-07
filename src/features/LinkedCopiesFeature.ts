import { Editor, MarkdownView, Notice, Plugin, TFile } from "obsidian";

import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
} from "@codemirror/view";

import { Feature } from "./Feature";

import {
  BLOCK_ID_REGEX,
  LinkedCopiesStore,
  MIRROR_MARKER_REGEX,
} from "../services/LinkedCopiesStore";
import { Settings } from "../services/Settings";
import { t } from "../services/i18n";

interface CopySource {
  filePath: string;
  line: number;
  content: string;
  children: string[];
  timestamp: number;
}

// Cache entry for mirror lookups
interface MirrorCacheEntry {
  mirrors: { file: TFile; line: number }[];
  timestamp: number;
}

export class LinkedCopiesFeature implements Feature {
  private store: LinkedCopiesStore;
  private lastCopySource: CopySource | null = null;
  private isSyncing = false;
  private syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  // Cache for mirror lookups (invalidated on file changes)
  private mirrorCache: Map<string, MirrorCacheEntry> = new Map();
  private cacheMaxAge = 5000; // 5 seconds cache

  constructor(
    private plugin: Plugin,
    private settings: Settings,
  ) {
    this.store = new LinkedCopiesStore(this.plugin.app);
  }

  /**
   * Debug log - only outputs when debug mode is enabled
   */
  private log(...args: unknown[]) {
    if (this.settings.debug) {
      console.log("[LinkedCopies]", ...args);
    }
  }

  async load() {
    // Register command for pasting as linked copy (no default hotkey - user can set their own)
    this.plugin.addCommand({
      id: "paste-as-linked-copy",
      name: t("cmd.paste-as-linked-copy"),
      icon: "clipboard-paste",
      editorCallback: (editor: Editor, view: MarkdownView) => {
        this.pasteAsLinkedCopy(editor, view);
      },
    });

    // Register command to go to original from mirror
    this.plugin.addCommand({
      id: "go-to-original",
      name: t("cmd.go-to-original"),
      icon: "external-link",
      editorCallback: async (editor: Editor, view: MarkdownView) => {
        await this.goToOriginal(editor, view);
      },
    });

    // Register command to break mirror link
    this.plugin.addCommand({
      id: "break-mirror-link",
      name: t("cmd.break-mirror-link"),
      icon: "unlink",
      editorCallback: (editor: Editor, view: MarkdownView) => {
        this.breakMirrorLink(editor, view);
      },
    });

    // Listen for copy events to track the source
    this.plugin.registerDomEvent(document, "copy", (evt: ClipboardEvent) => {
      this.handleCopyEvent(evt);
    });

    // Register CodeMirror extension for visual decorations
    this.plugin.registerEditorExtension(this.createMirrorDecorations());

    // One-way sync: original → mirror (mirrors are read-only copies)
    this.plugin.registerEvent(
      this.plugin.app.vault.on("modify", (file) => {
        if (file instanceof TFile && file.extension === "md") {
          this.invalidateCache(); // Invalidate cache on any file change
          this.debouncedSync(file);
        }
      }),
    );

    // Listen for file deletions to cascade delete mirrors
    this.plugin.registerEvent(
      this.plugin.app.vault.on("delete", (file) => {
        if (file instanceof TFile && file.extension === "md") {
          this.invalidateCache();
          this.handleFileDeleted(file);
        }
      }),
    );
  }

  async unload() {
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
    }
    this.mirrorCache.clear();
  }

  /**
   * Invalidate the mirror cache
   */
  private invalidateCache() {
    this.mirrorCache.clear();
  }

  /**
   * Get cached mirrors or fetch fresh
   */
  private async getCachedMirrors(
    sourceId: string,
  ): Promise<{ file: TFile; line: number }[]> {
    const cached = this.mirrorCache.get(sourceId);
    if (cached && Date.now() - cached.timestamp < this.cacheMaxAge) {
      return cached.mirrors;
    }

    const mirrors = await this.store.findMirrorsById(sourceId);
    this.mirrorCache.set(sourceId, {
      mirrors: mirrors.map((m) => ({ file: m.file, line: m.line })),
      timestamp: Date.now(),
    });

    return mirrors.map((m) => ({ file: m.file, line: m.line }));
  }

  /**
   * Go to the original block from a mirror
   */
  private async goToOriginal(editor: Editor, view: MarkdownView) {
    if (!view.file) return;

    const cursor = editor.getCursor();
    const line = editor.getLine(cursor.line);

    // Check if current line is a mirror
    const mirrorId = this.store.parseMirrorMarker(line);
    if (!mirrorId) {
      // Check if we're in a child of a mirror
      const mirrorInfo = this.findMirrorParentInEditor(editor, cursor.line);
      if (!mirrorInfo) {
        new Notice(t("notice.not-on-mirror"));
        return;
      }
      // Navigate to original
      await this.navigateToOriginal(mirrorInfo.mirrorId);
      return;
    }

    await this.navigateToOriginal(mirrorId);
  }

  /**
   * Navigate to original block by ID
   */
  private async navigateToOriginal(sourceId: string) {
    const original = await this.store.findBlockById(sourceId);
    if (!original) {
      new Notice(t("notice.original-not-found"));
      return;
    }

    // Open the file
    const leaf = this.plugin.app.workspace.getLeaf();
    await leaf.openFile(original.file);

    // Scroll to the line
    setTimeout(() => {
      const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
      if (view) {
        view.editor.setCursor({ line: original.line, ch: 0 });
        view.editor.scrollIntoView(
          {
            from: { line: original.line, ch: 0 },
            to: { line: original.line, ch: 0 },
          },
          true,
        );
      }
    }, 100);

    new Notice(
      t("notice.navigated-to-original", { filename: original.file.basename }),
    );
  }

  /**
   * Find mirror parent in editor
   */
  private findMirrorParentInEditor(
    editor: Editor,
    lineNum: number,
  ): { mirrorId: string; mirrorLineNum: number } | null {
    const currentLine = editor.getLine(lineNum);
    const currentIndent = this.getIndentLevel(currentLine);

    // Check current line first
    const directMirrorId = this.store.parseMirrorMarker(currentLine);
    if (directMirrorId) {
      return { mirrorId: directMirrorId, mirrorLineNum: lineNum };
    }

    // Look backwards for mirror parent
    for (let i = lineNum - 1; i >= 0; i--) {
      const checkLine = editor.getLine(i);
      const checkIndent = this.getIndentLevel(checkLine);

      if (!checkLine.trim()) continue;

      if (checkIndent < currentIndent) {
        const mirrorId = this.store.parseMirrorMarker(checkLine);
        if (mirrorId) {
          return { mirrorId, mirrorLineNum: i };
        }
      }

      if (checkIndent === 0 && !this.store.hasMirrorMarker(checkLine)) {
        break;
      }
    }

    return null;
  }

  /**
   * Break mirror link - convert mirror to regular text
   */
  private async breakMirrorLink(editor: Editor, view: MarkdownView) {
    if (!view.file) return;

    const cursor = editor.getCursor();
    const line = editor.getLine(cursor.line);

    // Check if current line is a mirror
    const mirrorId = this.store.parseMirrorMarker(line);
    if (!mirrorId) {
      new Notice(t("notice.not-on-mirror-line"));
      return;
    }

    const lineToModify = cursor.line;
    const file = view.file;

    // Use vault.process() for atomic file modification
    await this.plugin.app.vault.process(file, (content) => {
      const lines = content.split("\n");
      if (lineToModify < lines.length) {
        const cleanLine = this.store.removeMirrorMarker(lines[lineToModify]);
        lines[lineToModify] = cleanLine;
        console.log(
          "[LinkedCopies] breakMirrorLink: modified line",
          lineToModify,
        );
        console.log("[LinkedCopies] breakMirrorLink: before:", line);
        console.log("[LinkedCopies] breakMirrorLink: after:", cleanLine);
      }
      return lines.join("\n");
    });

    this.log("Broke mirror link on line", lineToModify);
    new Notice(t("notice.mirror-link-removed"));

    // Now the file is saved, check if original still has mirrors
    await this.cleanupOrphanedBlockId(mirrorId);
  }

  /**
   * Remove block ID from original if no mirrors remain
   */
  private async cleanupOrphanedBlockId(sourceId: string) {
    console.log("[LinkedCopies] cleanupOrphanedBlockId called for:", sourceId);

    // Find remaining mirrors
    const mirrors = await this.store.findMirrorsById(sourceId);
    console.log("[LinkedCopies] Found mirrors:", mirrors.length);

    if (mirrors.length === 0) {
      console.log(
        "[LinkedCopies] No mirrors remaining - removing block ID from original",
      );

      // Find and clean up the original
      const original = await this.store.findBlockById(sourceId);
      console.log(
        "[LinkedCopies] Original found:",
        original ? original.file.path : "null",
      );

      if (original) {
        const content = await this.plugin.app.vault.read(original.file);
        const lines = content.split("\n");

        console.log(
          "[LinkedCopies] Original line before:",
          lines[original.line],
        );

        // Remove block ID from the original line
        const cleanedLine = this.store.removeBlockId(lines[original.line]);
        lines[original.line] = cleanedLine;

        console.log("[LinkedCopies] Original line after:", cleanedLine);

        await this.plugin.app.vault.modify(original.file, lines.join("\n"));
        console.log("[LinkedCopies] File modified successfully");
      }
    } else {
      console.log(
        "[LinkedCopies] Still",
        mirrors.length,
        "mirrors remaining for",
        sourceId,
      );
      mirrors.forEach((m, i) =>
        console.log(
          `[LinkedCopies]   Mirror ${i}:`,
          m.file.path,
          "line",
          m.line,
        ),
      );
    }
  }

  /**
   * Handle copy event to track the source location
   */
  private handleCopyEvent(_evt: ClipboardEvent) {
    this.log("Copy event triggered");

    if (!this.settings.linkedCopies) {
      this.log("Feature disabled, skipping");
      return;
    }

    const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view || !view.file) {
      this.log("No active markdown view or file");
      return;
    }

    const editor = view.editor;

    // Get the START of selection (not just cursor which could be at end)
    const fromPos = editor.getCursor("from");
    const toPos = editor.getCursor("to");

    this.log("Selection from line:", fromPos.line, "to line:", toPos.line);

    // Use the first line of the selection
    const startLine = fromPos.line;
    const line = editor.getLine(startLine);

    this.log("First selected line:", startLine);
    this.log("Line content:", JSON.stringify(line));

    // Only track if it's a list item
    if (!this.isListItem(line)) {
      this.log("Not a list item, skipping");
      return;
    }

    // Get children - either from selection or from indentation
    let children: string[] = [];

    if (toPos.line > fromPos.line) {
      // Multi-line selection - use selected lines as children
      for (let i = startLine + 1; i <= toPos.line; i++) {
        children.push(editor.getLine(i));
      }
      this.log("Using selected lines as children:", children.length);
    } else {
      // Single line - get indented children
      children = this.getChildLinesFromEditor(editor, startLine);
      this.log("Using indented children:", children.length);
    }

    // Store the copy source info
    this.lastCopySource = {
      filePath: view.file.path,
      line: startLine,
      content: line,
      children,
      timestamp: Date.now(),
    };

    this.log("Stored copy source:", {
      filePath: this.lastCopySource.filePath,
      line: this.lastCopySource.line,
      content: this.lastCopySource.content,
      childrenCount: children.length,
    });
  }

  /**
   * Paste clipboard content as a linked copy (mirror)
   */
  private async pasteAsLinkedCopy(editor: Editor, _view: MarkdownView) {
    this.log("Paste as linked copy triggered");

    if (!this.settings.linkedCopies) {
      this.log("Feature disabled");
      new Notice(t("notice.feature-disabled"));
      return;
    }

    // Check if we have a recent copy source (within 5 minutes)
    const maxAge = 5 * 60 * 1000; // 5 minutes
    this.log(
      "Last copy source:",
      this.lastCopySource
        ? {
            filePath: this.lastCopySource.filePath,
            line: this.lastCopySource.line,
            content: this.lastCopySource.content,
            age: Date.now() - this.lastCopySource.timestamp,
          }
        : "none",
    );

    if (
      !this.lastCopySource ||
      Date.now() - this.lastCopySource.timestamp > maxAge
    ) {
      this.log("No recent copy source found");
      new Notice(t("notice.no-recent-copy"));
      return;
    }

    // PROTECTION: Check if source is already a mirror (prevent mirror-of-mirror)
    if (this.store.hasMirrorMarker(this.lastCopySource.content)) {
      this.log("Source is already a mirror - cannot create mirror of mirror");
      new Notice(t("notice.cannot-mirror-mirror"));
      return;
    }

    // Find the source file and update it with block ID if needed
    const sourceFile = this.plugin.app.vault.getAbstractFileByPath(
      this.lastCopySource.filePath,
    );
    this.log(
      "Source file lookup:",
      this.lastCopySource.filePath,
      "found:",
      !!sourceFile,
    );

    if (!sourceFile || !(sourceFile instanceof TFile)) {
      this.log("Source file not found or not a TFile");
      new Notice(t("notice.source-file-not-found"));
      return;
    }

    // Read the source file to get current content
    const sourceContent = await this.plugin.app.vault.read(sourceFile);
    const sourceLines = sourceContent.split("\n");
    const sourceLine = sourceLines[this.lastCopySource.line];

    this.log(
      "Source line at index",
      this.lastCopySource.line,
      ":",
      JSON.stringify(sourceLine),
    );

    if (!sourceLine) {
      this.log("Source line is empty/undefined");
      new Notice(t("notice.source-line-not-found"));
      return;
    }

    // Check if source line still matches what we copied
    const sourceLineClean = this.store.removeBlockId(sourceLine);
    const copiedLineClean = this.store.removeBlockId(
      this.lastCopySource.content,
    );

    this.log("Comparing lines:");
    console.log("  Source (clean):", JSON.stringify(sourceLineClean));
    console.log("  Copied (clean):", JSON.stringify(copiedLineClean));

    if (sourceLineClean !== copiedLineClean) {
      this.log("Source content has changed");
      new Notice(t("notice.source-changed"));
      return;
    }

    // Get or create block ID for the source
    let sourceId = this.store.parseBlockId(sourceLine);
    this.log("Existing block ID:", sourceId);

    // Check if block ID needs repair (missing space before ^)
    if (sourceId && this.store.hasBlockIdWithoutSpace(sourceLine)) {
      this.log("Block ID needs repair - missing space before ^");
      const repairedLine = this.store.repairBlockId(sourceLine);
      this.log("Repaired line:", JSON.stringify(repairedLine));
      sourceLines[this.lastCopySource.line] = repairedLine;
      await this.plugin.app.vault.modify(sourceFile, sourceLines.join("\n"));
      this.log("Source file repaired");
    } else if (!sourceId) {
      // Generate new ID and update the source file
      sourceId = this.store.generateId();
      this.log("Generated new ID:", sourceId);
      const updatedSourceLine = this.store.addBlockId(sourceLine, sourceId);
      this.log("Updated source line:", JSON.stringify(updatedSourceLine));
      sourceLines[this.lastCopySource.line] = updatedSourceLine;
      await this.plugin.app.vault.modify(sourceFile, sourceLines.join("\n"));
      this.log("Source file updated with block ID");
    }

    // Create mirror content
    this.log("Creating mirror content with:");
    console.log("  sourceLine:", JSON.stringify(sourceLine));
    console.log("  children:", this.lastCopySource.children);
    console.log("  sourceId:", sourceId);

    const mirrorContent = this.store.createMirrorContent(
      sourceLine,
      this.lastCopySource.children,
      sourceId,
    );

    this.log("Mirror content created:", JSON.stringify(mirrorContent));

    // Insert at cursor position
    const cursor = editor.getCursor();
    const currentLineContent = editor.getLine(cursor.line);

    this.log(
      "Insert position - cursor line:",
      cursor.line,
      "content:",
      JSON.stringify(currentLineContent),
    );

    // Get the indentation to use for insertion
    let baseIndent = "";
    if (currentLineContent.trim()) {
      // Get indentation from current line (for inserting as sibling)
      const indentMatch = currentLineContent.match(/^(\s*)/);
      baseIndent = indentMatch ? indentMatch[1] : "";
    } else {
      // Empty line - check previous lines for context
      for (let i = cursor.line - 1; i >= 0; i--) {
        const prevLine = editor.getLine(i);
        if (prevLine.trim()) {
          const indentMatch = prevLine.match(/^(\s*)/);
          baseIndent = indentMatch ? indentMatch[1] : "";
          // If previous line is a list item, add one level of indentation (as child)
          if (this.isListItem(prevLine)) {
            baseIndent += "\t";
          }
          break;
        }
      }
    }

    this.log("Base indent:", JSON.stringify(baseIndent));

    // Add indentation to mirror content
    const indentedMirrorContent = mirrorContent
      .split("\n")
      .map((line) => (line.trim() ? baseIndent + line : line))
      .join("\n");

    this.log("Indented mirror content:", JSON.stringify(indentedMirrorContent));

    if (currentLineContent.trim()) {
      // Insert on next line
      const insertPos = { line: cursor.line + 1, ch: 0 };
      this.log("Inserting on next line at:", insertPos);
      editor.replaceRange("\n" + indentedMirrorContent, insertPos);
    } else {
      // Replace empty line
      this.log("Replacing empty line");
      editor.replaceRange(
        indentedMirrorContent,
        { line: cursor.line, ch: 0 },
        { line: cursor.line, ch: currentLineContent.length },
      );
    }

    this.log("Paste complete!");
    new Notice(t("notice.pasted-as-mirror"));
  }

  /**
   * Check if a line is a list item
   */
  private isListItem(line: string): boolean {
    return /^\s*[-*]\s+|^\s*\d+\.\s+/.test(line);
  }

  /**
   * Get child lines from editor
   */
  private getChildLinesFromEditor(
    editor: Editor,
    parentLine: number,
  ): string[] {
    const children: string[] = [];
    const parentIndent = this.getIndentLevel(editor.getLine(parentLine));
    const lineCount = editor.lineCount();

    for (let i = parentLine + 1; i < lineCount; i++) {
      const line = editor.getLine(i);
      const indent = this.getIndentLevel(line);

      if (line.trim() && indent <= parentIndent) {
        break;
      }

      if (indent > parentIndent || !line.trim()) {
        children.push(line);
      }
    }

    // Remove trailing empty lines
    while (children.length > 0 && !children[children.length - 1].trim()) {
      children.pop();
    }

    return children;
  }

  /**
   * Get indentation level of a line
   */
  private getIndentLevel(line: string): number {
    const match = line.match(/^(\s*)/);
    return match ? match[1].length : 0;
  }

  /**
   * Debounced sync to prevent rapid-fire updates
   */
  private debouncedSync(file: TFile) {
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
    }

    this.syncDebounceTimer = setTimeout(() => {
      this.syncMirrors(file);
    }, 300);
  }

  /**
   * Sync mirrors when content changes (one-way: original → mirror)
   */
  private async syncMirrors(file: TFile) {
    if (this.isSyncing || !this.settings.linkedCopies) {
      return;
    }

    this.log("Sync triggered for file:", file.path);

    try {
      this.isSyncing = true;

      const content = await this.plugin.app.vault.cachedRead(file);
      const lines = content.split("\n");
      let fileModified = false;

      // Step 0: Repair any broken block IDs (missing space before ^)
      for (let i = 0; i < lines.length; i++) {
        if (this.store.hasBlockIdWithoutSpace(lines[i])) {
          this.log("Repairing broken block ID on line", i);
          lines[i] = this.store.repairBlockId(lines[i]);
          fileModified = true;
        }
      }

      // Save repairs if needed
      if (fileModified) {
        this.log("Saving repaired block IDs");
        await this.plugin.app.vault.modify(file, lines.join("\n"));
      }

      // Step 1: Find all originals (^outliner- blocks) in this file that were modified
      const originalsInFile: {
        id: string;
        line: number;
        content: string;
        children: string[];
      }[] = [];

      for (let i = 0; i < lines.length; i++) {
        const blockId = this.store.parseBlockId(lines[i]);
        if (blockId) {
          const children = this.getChildLinesFromArray(lines, i);
          originalsInFile.push({
            id: blockId,
            line: i,
            content: lines[i],
            children,
          });
        }
      }

      this.log(
        "Found originals in modified file:",
        originalsInFile.map((o) => o.id),
      );

      // Step 2: For each original, find and update all mirrors across the vault (using cache)
      for (const original of originalsInFile) {
        const mirrors = await this.store.findMirrorsById(original.id);
        // Update cache
        this.mirrorCache.set(original.id, {
          mirrors: mirrors.map((m) => ({ file: m.file, line: m.line })),
          timestamp: Date.now(),
        });
        this.log("Found mirrors for", original.id, ":", mirrors.length);

        for (const mirror of mirrors) {
          await this.updateMirrorFromOriginal(mirror, original);
        }
      }

      // Step 3: Also update mirrors in this file (in case original is elsewhere)
      await this.updateMirrorsInFile(file);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Update a single mirror to match its original
   */
  private async updateMirrorFromOriginal(
    mirror: { file: TFile; line: number; content: string; children: string[] },
    original: { id: string; content: string; children: string[] },
  ) {
    const fileContent = await this.plugin.app.vault.read(mirror.file);
    const lines = fileContent.split("\n");

    // Get the original content without the block ID
    const originalContent = this.store.extractListContent(original.content);
    const mirrorPrefix = this.store.getLinePrefix(lines[mirror.line]);
    const newMirrorLine = this.store.addMirrorMarker(
      `${mirrorPrefix}${originalContent}`,
      original.id,
    );

    this.log("Updating mirror at line", mirror.line);
    console.log("  Current:", JSON.stringify(lines[mirror.line]));
    console.log("  New:", JSON.stringify(newMirrorLine));

    let modified = false;

    // Update mirror line if different
    if (lines[mirror.line] !== newMirrorLine) {
      lines[mirror.line] = newMirrorLine;
      modified = true;
    }

    // Update children if different
    const currentChildren = this.getMirrorChildren(lines, mirror.line);
    
    // Get the base indentation of the mirror line
    const mirrorLineText = lines[mirror.line];
    const mirrorIndentMatch = mirrorLineText.match(/^(\s*)/);
    const mirrorBaseIndent = mirrorIndentMatch ? mirrorIndentMatch[1] : "";
    
    // Adjust original children to match mirror's indentation level
    const adjustedChildren = original.children.map((child) => {
      // Each child should have mirror's base indent added
      return mirrorBaseIndent + child;
    });
    
    console.log("  Current children:", currentChildren);
    console.log("  New children (adjusted):", adjustedChildren);
    
    if (JSON.stringify(currentChildren) !== JSON.stringify(adjustedChildren)) {
      this.log("Updating children");

      // Remove old children and insert new ones with adjusted indentation
      lines.splice(
        mirror.line + 1,
        currentChildren.length,
        ...adjustedChildren,
      );
      modified = true;
    }

    if (modified) {
      await this.plugin.app.vault.modify(mirror.file, lines.join("\n"));
      this.log("Mirror updated in file:", mirror.file.path);
    }
  }

  /**
   * Update all mirrors in a specific file
   */
  private async updateMirrorsInFile(file: TFile) {
    const content = await this.plugin.app.vault.cachedRead(file);
    const lines = content.split("\n");
    let modified = false;
    const newLines = [...lines];

    for (let i = 0; i < lines.length; i++) {
      const mirrorId = this.store.parseMirrorMarker(lines[i]);
      if (mirrorId) {
        const original = await this.store.findBlockById(mirrorId);
        if (original) {
          const originalContent = this.store.extractListContent(
            original.content,
          );
          const mirrorPrefix = this.store.getLinePrefix(lines[i]);
          const newMirrorLine = this.store.addMirrorMarker(
            `${mirrorPrefix}${originalContent}`,
            mirrorId,
          );

          if (newLines[i] !== newMirrorLine) {
            newLines[i] = newMirrorLine;
            modified = true;
          }
        }
      }
    }

    if (modified) {
      await this.plugin.app.vault.modify(file, newLines.join("\n"));
    }
  }

  /**
   * Get child lines from an array of lines
   */
  private getChildLinesFromArray(
    lines: string[],
    parentLine: number,
  ): string[] {
    const children: string[] = [];
    const parentIndent = this.getIndentLevel(lines[parentLine]);

    for (let i = parentLine + 1; i < lines.length; i++) {
      const line = lines[i];
      const indent = this.getIndentLevel(line);

      if (line.trim() && indent <= parentIndent) {
        break;
      }

      if (indent > parentIndent || !line.trim()) {
        children.push(line);
      }
    }

    while (children.length > 0 && !children[children.length - 1].trim()) {
      children.pop();
    }

    return children;
  }

  /**
   * Get children of a mirror block
   */
  private getMirrorChildren(lines: string[], mirrorLine: number): string[] {
    const children: string[] = [];
    const parentIndent = this.getIndentLevel(lines[mirrorLine]);

    for (let i = mirrorLine + 1; i < lines.length; i++) {
      const line = lines[i];
      const indent = this.getIndentLevel(line);

      if (line.trim() && indent <= parentIndent) {
        break;
      }

      if (indent > parentIndent || !line.trim()) {
        children.push(line);
      }
    }

    while (children.length > 0 && !children[children.length - 1].trim()) {
      children.pop();
    }

    return children;
  }

  /**
   * Handle file deletion - cascade delete mirrors if original is deleted
   * Also clean up orphaned block IDs
   */
  private async handleFileDeleted(deletedFile: TFile) {
    if (!this.settings.linkedCopies) return;

    // Track which source IDs had mirrors removed
    const removedMirrorIds: Set<string> = new Set();

    // This will be called after the file is already deleted
    // We need to check all other files for mirrors that referenced blocks in the deleted file
    const files = this.plugin.app.vault.getMarkdownFiles();

    for (const file of files) {
      if (file.path === deletedFile.path) continue;

      const content = await this.plugin.app.vault.cachedRead(file);
      const lines = content.split("\n");
      const newLines: string[] = [];
      let modified = false;
      let skipUntilIndent = -1;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const indent = this.getIndentLevel(line);

        // Skip children of deleted mirror
        if (skipUntilIndent >= 0) {
          if (line.trim() && indent <= skipUntilIndent) {
            skipUntilIndent = -1;
          } else {
            modified = true;
            continue;
          }
        }

        const mirrorId = this.store.parseMirrorMarker(line);
        if (mirrorId) {
          // Check if the original still exists
          const original = await this.store.findBlockById(mirrorId);
          if (!original) {
            // Original is gone, delete this mirror and its children
            skipUntilIndent = indent;
            modified = true;
            removedMirrorIds.add(mirrorId);
            continue;
          }
        }

        newLines.push(line);
      }

      if (modified) {
        await this.plugin.app.vault.modify(file, newLines.join("\n"));
      }
    }

    // Clean up orphaned block IDs for sources that lost all mirrors
    for (const sourceId of removedMirrorIds) {
      await this.cleanupOrphanedBlockId(sourceId);
    }
  }

  /**
   * Create CodeMirror decorations for mirror lines
   */
  private createMirrorDecorations() {
    const mirrorLineDeco = Decoration.line({
      class: "outliner-plugin-mirror-line",
    });

    const linkedOriginalDeco = Decoration.line({
      class: "outliner-plugin-linked-original",
    });

    // Mark decoration to add class (hidden via CSS)
    const mirrorMarkerDeco = Decoration.mark({
      class: "outliner-plugin-mirror-marker",
    });

    const blockIdDeco = Decoration.mark({
      class: "outliner-plugin-block-id",
    });

    return ViewPlugin.fromClass(
      class {
        decorations: DecorationSet;

        constructor(view: EditorView) {
          this.decorations = this.buildDecorations(view);
        }

        update(update: ViewUpdate) {
          // Rebuild decorations only when document content changes
          if (update.docChanged || update.viewportChanged) {
            this.decorations = this.buildDecorations(update.view);
          }
        }

        buildDecorations(view: EditorView): DecorationSet {
          const builder: { from: number; to?: number; deco: Decoration }[] = [];
          const doc = view.state.doc;

          let activeMirrorIndent: number | null = null;

          for (let lineNum = 1; lineNum <= doc.lines; lineNum++) {
            const line = doc.line(lineNum);
            const lineText = line.text;
            const trimmed = lineText.trim();

            if (!trimmed) continue;

            const indent = lineText.match(/^(\s*)/)?.[1].length || 0;

            if (activeMirrorIndent !== null && indent <= activeMirrorIndent) {
              activeMirrorIndent = null;
            }

            // Check for mirror marker
            const mirrorMatch = lineText.match(MIRROR_MARKER_REGEX);
            if (mirrorMatch) {
              builder.push({ from: line.from, deco: mirrorLineDeco });
              activeMirrorIndent = indent;

              // Add class to marker text for hiding via CSS
              const markerIndex = lineText.indexOf(mirrorMatch[0]);
              if (markerIndex !== -1) {
                builder.push({
                  from: line.from + markerIndex,
                  to: line.from + markerIndex + mirrorMatch[0].length,
                  deco: mirrorMarkerDeco,
                });
              }
            } else if (
              activeMirrorIndent !== null &&
              indent > activeMirrorIndent
            ) {
              builder.push({ from: line.from, deco: mirrorLineDeco });
            } else {
              // Check for block ID
              const blockIdMatch = lineText.match(BLOCK_ID_REGEX);
              if (blockIdMatch) {
                builder.push({ from: line.from, deco: linkedOriginalDeco });

                // Add class to block ID for hiding via CSS
                const idIndex = lineText.lastIndexOf("^" + blockIdMatch[1]);
                if (idIndex !== -1) {
                  builder.push({
                    from: line.from + idIndex,
                    to: line.from + idIndex + 1 + blockIdMatch[1].length,
                    deco: blockIdDeco,
                  });
                }
              }
            }
          }

          // Sort by position and create ranges
          builder.sort((a, b) => a.from - b.from);
          return Decoration.set(
            builder.map((item) =>
              item.to !== undefined
                ? item.deco.range(item.from, item.to)
                : item.deco.range(item.from),
            ),
            true,
          );
        }
      },
      {
        decorations: (v) => v.decorations,
      },
    );
  }
}
