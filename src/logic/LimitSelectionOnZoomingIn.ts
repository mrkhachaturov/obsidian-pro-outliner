import { EditorState, Transaction } from "@codemirror/state";

import { calculateLimitedSelection } from "./utils/calculateLimitedSelection";
import { ZoomInStateEffect, isZoomInEffect } from "./utils/effects";

import { Logger } from "../services/Logger";

export class LimitSelectionOnZoomingIn {
  constructor(private logger: Logger) {}

  getExtension() {
    return EditorState.transactionFilter.of(this.limitSelectionOnZoomingIn);
  }

  private limitSelectionOnZoomingIn = (tr: Transaction) => {
    const e = tr.effects.find<ZoomInStateEffect>(isZoomInEffect);

    if (!e) {
      return tr;
    }

    const newSelection = calculateLimitedSelection(
      tr.newSelection,
      e.value.from,
      e.value.to
    );

    if (!newSelection) {
      return tr;
    }

    this.logger.log(
      "LimitSelectionOnZoomingIn:limitSelectionOnZoomingIn",
      "limiting selection",
      newSelection.toJSON()
    );

    return [tr, { selection: newSelection }];
  };
}
