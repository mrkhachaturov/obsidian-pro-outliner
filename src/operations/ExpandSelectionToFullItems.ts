import { Operation } from "./Operation";

import { List, Root, cmpPos, maxPos, minPos } from "../root";

export class ExpandSelectionToFullItems implements Operation {
  private stopPropagation = false;
  private updated = false;

  constructor(private root: Root) {}

  shouldStopPropagation() {
    return this.stopPropagation;
  }

  shouldUpdate() {
    return this.updated;
  }

  /**
   * Check if listA is an ancestor of listB
   */
  private isAncestor(listA: List, listB: List): boolean {
    let current = listB.getParent();
    while (current) {
      if (current === listA) {
        return true;
      }
      current = current.getParent();
    }
    return false;
  }

  perform() {
    const { root } = this;

    if (!root.hasSingleSelection()) {
      return;
    }

    const selection = root.getSelections()[0];
    const { anchor, head } = selection;

    // Only expand if selection spans multiple lines
    if (anchor.line === head.line) {
      return;
    }

    const [rootStart, rootEnd] = root.getContentRange();

    const selectionFrom = minPos(anchor, head);
    const selectionTo = maxPos(anchor, head);

    // Check if selection is within the list bounds
    if (
      selectionFrom.line < rootStart.line ||
      selectionTo.line > rootEnd.line
    ) {
      return;
    }

    const listAtFrom = root.getListUnderLine(selectionFrom.line);
    const listAtTo = root.getListUnderLine(selectionTo.line);

    if (!listAtFrom || !listAtTo) {
      return;
    }

    // Calculate the expanded range
    const expandedStart = listAtFrom.getFirstLineContentStartAfterCheckbox();

    // If listAtFrom is an ancestor of listAtTo, expand to include ALL children of listAtFrom
    // This handles the case: selecting from parent down to any child should select all children
    let expandedEnd;
    if (this.isAncestor(listAtFrom, listAtTo)) {
      // Expand to include all descendants of the parent
      expandedEnd = listAtFrom.getContentEndIncludingChildren();
    } else {
      expandedEnd = listAtTo.getContentEndIncludingChildren();
    }

    // Check if selection is already expanded (to avoid infinite loops)
    if (
      cmpPos(selectionFrom, expandedStart) === 0 &&
      cmpPos(selectionTo, expandedEnd) === 0
    ) {
      return;
    }

    // Preserve selection direction (anchor/head order)
    const isForward = cmpPos(anchor, head) <= 0;

    this.stopPropagation = true;
    this.updated = true;

    if (isForward) {
      root.replaceSelections([{ anchor: expandedStart, head: expandedEnd }]);
    } else {
      root.replaceSelections([{ anchor: expandedEnd, head: expandedStart }]);
    }
  }
}
