import { TFile } from "obsidian";

import { StateEffect, StateField } from "@codemirror/state";
import { EditorView, showPanel } from "@codemirror/view";

import { renderHeader } from "./utils/renderHeader";

import { Logger } from "../services/Logger";

export interface Breadcrumb {
  title: string;
  pos: number | null;
}

export interface MirrorSource {
  file: TFile;
  blockId: string;
  fileName: string;
}

export interface ZoomIn {
  zoomIn(view: EditorView, pos: number): void;
}

export interface ZoomOut {
  zoomOut(view: EditorView): void;
}

export interface NavigateToFile {
  navigateToFile(file: TFile, blockId: string, pos?: number | null): void;
}

interface HeaderState {
  breadcrumbs: Breadcrumb[];
  mirrorSource?: MirrorSource;
  onClick: (view: EditorView, pos: number | null) => void;
  onBreadcrumbClick?: (view: EditorView, pos: number | null) => void;
}

const showHeaderEffect = StateEffect.define<HeaderState>();
const hideHeaderEffect = StateEffect.define<void>();

const headerState = StateField.define<HeaderState | null>({
  create: () => null,
  update: (value, tr) => {
    for (const e of tr.effects) {
      if (e.is(showHeaderEffect)) {
        value = e.value;
      }
      if (e.is(hideHeaderEffect)) {
        value = null;
      }
    }
    return value;
  },
  provide: (f) =>
    showPanel.from(f, (state) => {
      if (!state) {
        return null;
      }

      return (view) => ({
        top: true,
        dom: renderHeader(view.dom.ownerDocument, {
          breadcrumbs: state.breadcrumbs,
          mirrorSource: state.mirrorSource,
          onClick: (pos) => {
            // If mirrorSource exists, use onBreadcrumbClick (navigates to original)
            // Otherwise use normal onClick (zoom in current file)
            if (state.mirrorSource && state.onBreadcrumbClick) {
              state.onBreadcrumbClick(view, pos);
            } else {
              state.onClick(view, pos);
            }
          },
        }),
      });
    }),
});

export class RenderNavigationHeader {
  private navigateToFile: NavigateToFile | null = null;

  getExtension() {
    return headerState;
  }

  constructor(
    private logger: Logger,
    private zoomIn: ZoomIn,
    private zoomOut: ZoomOut,
  ) {}

  public setNavigateToFile(navigateToFile: NavigateToFile) {
    this.navigateToFile = navigateToFile;
  }

  public showHeader(
    view: EditorView,
    breadcrumbs: Breadcrumb[],
    mirrorSource?: MirrorSource,
  ) {
    const l = this.logger.bind("ToggleNavigationHeaderLogic:showHeader");
    l("show header", { mirrorSource: mirrorSource?.fileName });

    view.dispatch({
      effects: [
        showHeaderEffect.of({
          breadcrumbs,
          mirrorSource,
          onClick: this.onClick,
          onBreadcrumbClick: mirrorSource
            ? this.onBreadcrumbClickForMirror
            : undefined,
        }),
      ],
    });
  }

  public hideHeader(view: EditorView) {
    const l = this.logger.bind("ToggleNavigationHeaderLogic:hideHeader");
    l("hide header");

    view.dispatch({
      effects: [hideHeaderEffect.of()],
    });
  }

  private onClick = (view: EditorView, pos: number | null) => {
    if (pos === null) {
      this.zoomOut.zoomOut(view);
    } else {
      this.zoomIn.zoomIn(view, pos);
    }
  };

  private onBreadcrumbClickForMirror = (
    view: EditorView,
    pos: number | null,
  ) => {
    const l = this.logger.bind(
      "ToggleNavigationHeaderLogic:onBreadcrumbClickForMirror",
    );
    l("navigating to original", { pos });

    // Get current mirror source from state
    const state = view.state.field(headerState);
    if (state?.mirrorSource && this.navigateToFile) {
      // Navigate to the original file at the specified position
      this.navigateToFile.navigateToFile(
        state.mirrorSource.file,
        state.mirrorSource.blockId,
        pos,
      );
    }
  };
}
