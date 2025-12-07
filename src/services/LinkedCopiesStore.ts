import { App, TFile } from "obsidian";

// Regex patterns for parsing - exported for use in other modules
// Block ID format: ^outliner-XXXXXX (clearly indicates Pro Outliner plugin)
// MUST have space before ^ for Obsidian to recognize it
export const BLOCK_ID_REGEX = /\s\^(outliner-[a-zA-Z0-9]+)$/;
// Also match without space (for detection/repair)
export const BLOCK_ID_REGEX_NO_SPACE = /\^(outliner-[a-zA-Z0-9]+)$/;
// Mirror marker format: <!-- mirror:outliner-XXXXXX -->
export const MIRROR_MARKER_REGEX = /<!--\s*mirror:(outliner-[a-zA-Z0-9]+)\s*-->/;

export interface LinkedBlock {
  id: string;
  file: TFile;
  line: number;
  content: string;
  children: string[];
}

export interface MirrorBlock {
  sourceId: string;
  file: TFile;
  line: number;
  content: string;
  children: string[];
}

export class LinkedCopiesStore {
  constructor(private app: App) {}

  /**
   * Generate a unique linked ID
   */
  generateId(): string {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let result = "outliner-";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Parse a line to extract block ID if present
   * Matches both with and without space (for detection/repair)
   */
  parseBlockId(line: string): string | null {
    // First try with space (correct format)
    const match = line.match(BLOCK_ID_REGEX);
    if (match) return match[1];
    
    // Fallback to without space (broken format, needs repair)
    const matchNoSpace = line.match(BLOCK_ID_REGEX_NO_SPACE);
    return matchNoSpace ? matchNoSpace[1] : null;
  }

  /**
   * Check if line has block ID in broken format (no space before ^)
   */
  hasBlockIdWithoutSpace(line: string): boolean {
    return !BLOCK_ID_REGEX.test(line) && BLOCK_ID_REGEX_NO_SPACE.test(line);
  }

  /**
   * Repair block ID by adding missing space
   */
  repairBlockId(line: string): string {
    if (this.hasBlockIdWithoutSpace(line)) {
      // Add space before ^
      return line.replace(BLOCK_ID_REGEX_NO_SPACE, " ^$1");
    }
    return line;
  }

  /**
   * Parse a line to extract mirror marker if present
   */
  parseMirrorMarker(line: string): string | null {
    const match = line.match(MIRROR_MARKER_REGEX);
    return match ? match[1] : null;
  }

  /**
   * Check if a line has a mirror marker
   */
  hasMirrorMarker(line: string): boolean {
    return MIRROR_MARKER_REGEX.test(line);
  }

  /**
   * Check if a line has a block ID (with or without proper space)
   */
  hasBlockId(line: string): boolean {
    return BLOCK_ID_REGEX.test(line) || BLOCK_ID_REGEX_NO_SPACE.test(line);
  }

  /**
   * Add a block ID to a line
   */
  addBlockId(line: string, id: string): string {
    // Remove trailing whitespace and add block ID
    return `${line.trimEnd()} ^${id}`;
  }

  /**
   * Add a mirror marker to a line
   */
  addMirrorMarker(line: string, sourceId: string): string {
    return `${line.trimEnd()} <!-- mirror:${sourceId} -->`;
  }

  /**
   * Remove mirror marker from a line
   */
  removeMirrorMarker(line: string): string {
    return line.replace(MIRROR_MARKER_REGEX, "").trimEnd();
  }

  /**
   * Remove block ID from a line
   */
  removeBlockId(line: string): string {
    return line.replace(/\s*\^outliner-[a-zA-Z0-9]+$/, "").trimEnd();
  }

  /**
   * Find all blocks with the given ID across the vault
   */
  async findBlockById(id: string): Promise<LinkedBlock | null> {
    const files = this.app.vault.getMarkdownFiles();

    for (const file of files) {
      const cache = this.app.metadataCache.getFileCache(file);
      if (cache?.blocks && cache.blocks[id]) {
        const blockInfo = cache.blocks[id];
        const content = await this.app.vault.cachedRead(file);
        const lines = content.split("\n");

        // Get the block content and children
        const startLine = blockInfo.position.start.line;
        const blockContent = lines[startLine];

        // Parse children (indented lines following the block)
        const children = this.getChildLines(lines, startLine);

        return {
          id,
          file,
          line: startLine,
          content: blockContent,
          children,
        };
      }
    }

    return null;
  }

  /**
   * Find all mirrors that reference a given block ID
   */
  async findMirrorsById(sourceId: string): Promise<MirrorBlock[]> {
    const mirrors: MirrorBlock[] = [];
    const files = this.app.vault.getMarkdownFiles();

    for (const file of files) {
      // Use read() instead of cachedRead() to get fresh content
      const content = await this.app.vault.read(file);
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const mirrorId = this.parseMirrorMarker(lines[i]);
        if (mirrorId === sourceId) {
          const children = this.getChildLines(lines, i);
          mirrors.push({
            sourceId,
            file,
            line: i,
            content: lines[i],
            children,
          });
        }
      }
    }

    return mirrors;
  }

  /**
   * Find all mirrors in a specific file
   */
  async findMirrorsInFile(file: TFile): Promise<MirrorBlock[]> {
    const mirrors: MirrorBlock[] = [];
    const content = await this.app.vault.cachedRead(file);
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const mirrorId = this.parseMirrorMarker(lines[i]);
      if (mirrorId) {
        const children = this.getChildLines(lines, i);
        mirrors.push({
          sourceId: mirrorId,
          file,
          line: i,
          content: lines[i],
          children,
        });
      }
    }

    return mirrors;
  }

  /**
   * Get child lines (indented lines following a parent)
   */
  private getChildLines(lines: string[], parentLine: number): string[] {
    const children: string[] = [];
    const parentIndent = this.getIndentLevel(lines[parentLine]);

    for (let i = parentLine + 1; i < lines.length; i++) {
      const line = lines[i];
      const indent = this.getIndentLevel(line);

      // Stop if we hit a line with same or less indent (sibling or parent)
      if (line.trim() && indent <= parentIndent) {
        break;
      }

      // Add child lines (including empty lines within the block)
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
   * Get the indentation level of a line
   */
  private getIndentLevel(line: string): number {
    const match = line.match(/^(\s*)/);
    return match ? match[1].length : 0;
  }

  /**
   * Extract the list content without bullet, checkbox, block ID, or mirror marker
   */
  extractListContent(line: string): string {
    // Remove bullet (-, *, or number.)
    let content = line.replace(/^\s*[-*]\s+|^\s*\d+\.\s+/, "");
    // Remove checkbox
    content = content.replace(/^\[.\]\s*/, "");
    // Remove block ID
    content = content.replace(/\s*\^outliner-[a-zA-Z0-9]+$/, "");
    // Remove mirror marker
    content = content.replace(/\s*<!--\s*mirror:outliner-[a-zA-Z0-9]+\s*-->$/, "");
    return content.trim();
  }

  /**
   * Get the bullet and indent prefix from a line
   */
  getLinePrefix(line: string): string {
    const match = line.match(/^(\s*[-*]\s+|\s*\d+\.\s+)(\[.\]\s*)?/);
    return match ? match[0] : "";
  }

  /**
   * Create a copy of content with mirror marker
   */
  createMirrorContent(
    originalLine: string,
    children: string[],
    sourceId: string,
  ): string {
    console.log("[LinkedCopiesStore] createMirrorContent called with:");
    console.log("  originalLine:", JSON.stringify(originalLine));
    console.log("  children:", children);
    console.log("  sourceId:", sourceId);

    const prefix = this.getLinePrefix(originalLine);
    console.log("  extracted prefix:", JSON.stringify(prefix));

    const content = this.extractListContent(originalLine);
    console.log("  extracted content:", JSON.stringify(content));

    const reconstructed = `${prefix}${content}`;
    console.log("  reconstructed line:", JSON.stringify(reconstructed));

    const mirrorLine = this.addMirrorMarker(reconstructed, sourceId);
    console.log("  mirrorLine with marker:", JSON.stringify(mirrorLine));

    if (children.length === 0) {
      return mirrorLine;
    }

    const result = [mirrorLine, ...children].join("\n");
    console.log("  final result:", JSON.stringify(result));
    return result;
  }
}

