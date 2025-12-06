import { EditorState, Transaction } from "@codemirror/state";

import { calculateLimitedSelection } from "./utils/calculateLimitedSelection";

import { Logger } from "../services/Logger";

export interface CalculateVisibleContentRange {
  calculateVisibleContentRange(
    state: EditorState,
  ): { from: number; to: number } | null;
}

export class LimitSelectionWhenZoomedIn {
  constructor(
    private logger: Logger,
    private calculateVisibleContentRange: CalculateVisibleContentRange,
  ) {}

  public getExtension() {
    return EditorState.transactionFilter.of(this.limitSelectionWhenZoomedIn);
  }

  private limitSelectionWhenZoomedIn = (tr: Transaction) => {
    if (!tr.selection || !tr.isUserEvent("select")) {
      return tr;
    }

    const range =
      this.calculateVisibleContentRange.calculateVisibleContentRange(tr.state);

    if (!range) {
      return tr;
    }

    const newSelection = calculateLimitedSelection(
      tr.newSelection,
      range.from,
      range.to,
    );

    if (!newSelection) {
      return tr;
    }

    this.logger.log(
      "LimitSelectionWhenZoomedIn:limitSelectionWhenZoomedIn",
      "limiting selection",
      newSelection.toJSON(),
    );

    return [tr, { selection: newSelection }];
  };
}
