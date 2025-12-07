import { App, MarkdownView, Plugin, TFile } from "obsidian";

import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

import { Feature } from "./Feature";
import { getDocumentTitle } from "./zoom-utils/getDocumentTitle";
import { getEditorViewFromEditorState } from "./zoom-utils/getEditorViewFromEditorState";

import { CollectBreadcrumbs } from "../logic/CollectBreadcrumbs";
import { DetectRangeBeforeVisibleRangeChanged } from "../logic/DetectRangeBeforeVisibleRangeChanged";
import {
  MirrorSource,
  RenderNavigationHeader,
} from "../logic/RenderNavigationHeader";
import { LinkedCopiesStore } from "../services/LinkedCopiesStore";
import { Logger } from "../services/Logger";

export interface ZoomIn {
  zoomIn(view: EditorView, pos: number): void;
}

export interface ZoomOut {
  zoomOut(view: EditorView): void;
}

export interface NotifyAfterZoomIn {
  notifyAfterZoomIn(cb: (view: EditorView, pos: number) => void): void;
}

export interface NotifyAfterZoomOut {
  notifyAfterZoomOut(cb: (view: EditorView) => void): void;
}

export interface CalculateHiddenContentRanges {
  calculateHiddenContentRanges(
    state: EditorState,
  ): { from: number; to: number }[] | null;
}

export interface CalculateVisibleContentRange {
  calculateVisibleContentRange(
    state: EditorState,
  ): { from: number; to: number } | null;
}

class ShowHeaderAfterZoomIn implements Feature {
  constructor(
    private notifyAfterZoomIn: NotifyAfterZoomIn,
    private collectBreadcrumbs: CollectBreadcrumbs,
    private renderNavigationHeader: RenderNavigationHeader,
    private linkedCopiesStore: LinkedCopiesStore,
    private app: App,
  ) {}

  async load() {
    this.notifyAfterZoomIn.notifyAfterZoomIn(async (view, pos) => {
      const line = view.state.doc.lineAt(pos);
      const lineNum = line.number;

      console.log(
        "[HeaderNav] Zoom in at line:",
        lineNum,
        "text:",
        line.text.substring(0, 50),
      );

      // Check if zoomed line is a mirror OR is a child of a mirror
      const mirrorInfo = this.findMirrorParent(view, lineNum);
      console.log("[HeaderNav] Mirror info:", mirrorInfo);

      if (mirrorInfo) {
        const { mirrorId, mirrorLineNum, zoomedLineNum } = mirrorInfo;

        // Find the original block
        const original = await this.linkedCopiesStore.findBlockById(mirrorId);
        console.log(
          "[HeaderNav] Original found:",
          original ? original.file.path : "null",
        );
        if (original) {
          // Calculate the offset from mirror root to zoomed line
          const offsetFromMirror = zoomedLineNum - mirrorLineNum;

          // Build breadcrumbs from the original file, offset to the correct child
          const originalBreadcrumbs = await this.buildOriginalBreadcrumbs(
            original.file,
            original.line + offsetFromMirror,
          );

          const mirrorSource: MirrorSource = {
            file: original.file,
            blockId: mirrorId,
            fileName: original.file.basename,
          };

          this.renderNavigationHeader.showHeader(
            view,
            originalBreadcrumbs,
            mirrorSource,
          );
          return;
        }
      }

      // Not a mirror - show normal breadcrumbs
      const breadcrumbs = this.collectBreadcrumbs.collectBreadcrumbs(
        view.state,
        pos,
      );
      this.renderNavigationHeader.showHeader(view, breadcrumbs);
    });
  }

  /**
   * Find if the current line is a mirror or child of a mirror
   * Returns the mirror info if found, null otherwise
   */
  private findMirrorParent(
    view: EditorView,
    lineNum: number,
  ): { mirrorId: string; mirrorLineNum: number; zoomedLineNum: number } | null {
    const doc = view.state.doc;
    const currentLine = doc.line(lineNum);
    const currentIndent = this.getIndentLevel(currentLine.text);

    console.log(
      "[HeaderNav] findMirrorParent - checking line:",
      lineNum,
      "indent:",
      currentIndent,
    );
    console.log("[HeaderNav] Line text:", currentLine.text);

    // First check if current line is a mirror
    const directMirrorId = this.linkedCopiesStore.parseMirrorMarker(
      currentLine.text,
    );
    console.log("[HeaderNav] Direct mirror ID:", directMirrorId);
    if (directMirrorId) {
      return {
        mirrorId: directMirrorId,
        mirrorLineNum: lineNum,
        zoomedLineNum: lineNum,
      };
    }

    // Look backwards for a mirror parent with less indentation
    for (let i = lineNum - 1; i >= 1; i--) {
      const checkLine = doc.line(i);
      const checkText = checkLine.text;
      const checkIndent = this.getIndentLevel(checkText);

      // Skip empty lines
      if (!checkText.trim()) continue;

      // If we find a line with less indent, check if it's a mirror
      if (checkIndent < currentIndent) {
        const mirrorId = this.linkedCopiesStore.parseMirrorMarker(checkText);
        if (mirrorId) {
          return {
            mirrorId,
            mirrorLineNum: i,
            zoomedLineNum: lineNum,
          };
        }
        // Update current indent to find the next parent level
        // But only if this wasn't empty - we need to keep looking for mirror
      }

      // If we hit root level (no indent) without finding mirror, stop
      if (
        checkIndent === 0 &&
        !this.linkedCopiesStore.hasMirrorMarker(checkText)
      ) {
        break;
      }
    }

    return null;
  }

  /**
   * Build breadcrumbs from the original file's content
   */
  private async buildOriginalBreadcrumbs(
    file: TFile,
    lineNumber: number,
  ): Promise<Array<{ title: string; pos: number | null }>> {
    const content = await this.app.vault.cachedRead(file);
    const lines = content.split("\n");

    const breadcrumbs: Array<{ title: string; pos: number | null }> = [
      { title: file.basename, pos: null }, // First item is file name
    ];

    // Find parent items by checking indentation
    const targetLine = lines[lineNumber];
    const targetIndent = this.getIndentLevel(targetLine);

    // Collect all parent lines with less indentation
    const parents: Array<{ line: string; lineNum: number; indent: number }> =
      [];

    for (let i = lineNumber - 1; i >= 0; i--) {
      const line = lines[i];
      if (!line.trim()) continue; // Skip empty lines

      const indent = this.getIndentLevel(line);
      if (indent < targetIndent) {
        // Check if this is a list item
        if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
          parents.unshift({ line, lineNum: i, indent });
          // Update target indent to find next parent
          if (parents.length === 1 || indent < parents[0].indent) {
            // Continue looking for more parents
          }
        }
      }
      // Stop if we reach root level (no indent)
      if (indent === 0 && parents.length > 0) break;
    }

    // Filter to only keep actual hierarchy (each parent should have less indent than next)
    const filteredParents: typeof parents = [];
    let lastIndent = targetIndent;
    for (let i = parents.length - 1; i >= 0; i--) {
      if (parents[i].indent < lastIndent) {
        filteredParents.unshift(parents[i]);
        lastIndent = parents[i].indent;
      }
    }

    // Add parent breadcrumbs
    for (const parent of filteredParents) {
      breadcrumbs.push({
        title: this.cleanTitle(parent.line),
        pos: this.calculatePos(lines, parent.lineNum),
      });
    }

    // Add the target line
    breadcrumbs.push({
      title: this.cleanTitle(targetLine),
      pos: this.calculatePos(lines, lineNumber),
    });

    return breadcrumbs;
  }

  private getIndentLevel(line: string): number {
    const match = line.match(/^(\s*)/);
    return match ? match[1].length : 0;
  }

  private cleanTitle(line: string): string {
    return line
      .trim()
      .replace(/^[-*]\s+/, "")
      .replace(/^\d+\.\s+/, "")
      .replace(/\s*<!--\s*mirror:[a-zA-Z0-9]+\s*-->$/, "")
      .replace(/\s*\^outliner-[a-zA-Z0-9]+$/, "")
      .trim();
  }

  private calculatePos(lines: string[], lineNum: number): number {
    let pos = 0;
    for (let i = 0; i < lineNum; i++) {
      pos += lines[i].length + 1; // +1 for newline
    }
    return pos;
  }

  async unload() {}
}

class HideHeaderAfterZoomOut implements Feature {
  constructor(
    private notifyAfterZoomOut: NotifyAfterZoomOut,
    private renderNavigationHeader: RenderNavigationHeader,
  ) {}

  async load() {
    this.notifyAfterZoomOut.notifyAfterZoomOut((view) => {
      this.renderNavigationHeader.hideHeader(view);
    });
  }

  async unload() {}
}

class UpdateHeaderAfterRangeBeforeVisibleRangeChanged implements Feature {
  private detectRangeBeforeVisibleRangeChanged =
    new DetectRangeBeforeVisibleRangeChanged(
      this.calculateHiddenContentRanges,
      {
        rangeBeforeVisibleRangeChanged: (state) =>
          this.rangeBeforeVisibleRangeChanged(state),
      },
    );

  constructor(
    private plugin: Plugin,
    private calculateHiddenContentRanges: CalculateHiddenContentRanges,
    private calculateVisibleContentRange: CalculateVisibleContentRange,
    private collectBreadcrumbs: CollectBreadcrumbs,
    private renderNavigationHeader: RenderNavigationHeader,
  ) {}

  async load() {
    this.plugin.registerEditorExtension(
      this.detectRangeBeforeVisibleRangeChanged.getExtension(),
    );
  }

  async unload() {}

  private rangeBeforeVisibleRangeChanged(state: EditorState) {
    const view = getEditorViewFromEditorState(state);

    const pos =
      this.calculateVisibleContentRange.calculateVisibleContentRange(
        state,
      ).from;

    const breadcrumbs = this.collectBreadcrumbs.collectBreadcrumbs(state, pos);

    this.renderNavigationHeader.showHeader(view, breadcrumbs);
  }
}

export class HeaderNavigationFeature implements Feature {
  private linkedCopiesStore: LinkedCopiesStore;

  private collectBreadcrumbs = new CollectBreadcrumbs({
    getDocumentTitle: getDocumentTitle,
  });

  private renderNavigationHeader: RenderNavigationHeader;
  private showHeaderAfterZoomIn: ShowHeaderAfterZoomIn;
  private hideHeaderAfterZoomOut: HideHeaderAfterZoomOut;
  private updateHeaderAfterRangeBeforeVisibleRangeChanged: UpdateHeaderAfterRangeBeforeVisibleRangeChanged;

  constructor(
    private plugin: Plugin,
    private logger: Logger,
    private calculateHiddenContentRanges: CalculateHiddenContentRanges,
    private calculateVisibleContentRange: CalculateVisibleContentRange,
    private zoomIn: ZoomIn,
    private zoomOut: ZoomOut,
    private notifyAfterZoomIn: NotifyAfterZoomIn,
    private notifyAfterZoomOut: NotifyAfterZoomOut,
    private app: App,
  ) {
    this.linkedCopiesStore = new LinkedCopiesStore(app);

    this.renderNavigationHeader = new RenderNavigationHeader(
      this.logger,
      this.zoomIn,
      this.zoomOut,
    );

    // Set up file navigation handler
    this.renderNavigationHeader.setNavigateToFile({
      navigateToFile: (file: TFile, blockId: string, pos?: number | null) => {
        this.navigateToOriginal(file, blockId, pos);
      },
    });

    this.showHeaderAfterZoomIn = new ShowHeaderAfterZoomIn(
      this.notifyAfterZoomIn,
      this.collectBreadcrumbs,
      this.renderNavigationHeader,
      this.linkedCopiesStore,
      this.app,
    );

    this.hideHeaderAfterZoomOut = new HideHeaderAfterZoomOut(
      this.notifyAfterZoomOut,
      this.renderNavigationHeader,
    );

    this.updateHeaderAfterRangeBeforeVisibleRangeChanged =
      new UpdateHeaderAfterRangeBeforeVisibleRangeChanged(
        this.plugin,
        this.calculateHiddenContentRanges,
        this.calculateVisibleContentRange,
        this.collectBreadcrumbs,
        this.renderNavigationHeader,
      );
  }

  private async navigateToOriginal(
    file: TFile,
    blockId: string,
    pos?: number | null,
  ) {
    // Open the file
    const leaf = this.app.workspace.getLeaf();
    await leaf.openFile(file);

    // Wait a bit for the file to load, then zoom
    setTimeout(() => {
      const view = this.app.workspace.getActiveViewOfType(MarkdownView);
      if (view) {
        // @ts-expect-error - accessing internal CM view
        const cmView = (view.editor as { cm?: EditorView }).cm;
        if (!cmView) return;

        if (pos === null) {
          // pos === null means zoom out (clicked on file name)
          this.zoomOut.zoomOut(cmView);
        } else if (pos !== undefined) {
          // Zoom to specific position
          this.zoomIn.zoomIn(cmView, pos);
        } else {
          // No pos specified, find the block by ID and zoom there
          const editor = view.editor;
          const content = editor.getValue();
          const lines = content.split("\n");

          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(`^${blockId}`)) {
              const calcPos = editor.posToOffset({ line: i, ch: 0 });
              this.zoomIn.zoomIn(cmView, calcPos);
              break;
            }
          }
        }
      }
    }, 100);
  }

  async load() {
    this.plugin.registerEditorExtension(
      this.renderNavigationHeader.getExtension(),
    );

    this.showHeaderAfterZoomIn.load();
    this.hideHeaderAfterZoomOut.load();
    this.updateHeaderAfterRangeBeforeVisibleRangeChanged.load();
  }

  async unload() {
    this.showHeaderAfterZoomIn.unload();
    this.hideHeaderAfterZoomOut.unload();
    this.updateHeaderAfterRangeBeforeVisibleRangeChanged.unload();
  }
}
