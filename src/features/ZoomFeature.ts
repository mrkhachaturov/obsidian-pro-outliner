import { Notice, Plugin } from "obsidian";

import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

import { Feature } from "./Feature";
import { getDocumentTitle } from "./zoom-utils/getDocumentTitle";
import { isFoldingEnabled } from "./zoom-utils/isFoldingEnabled";

import { CalculateRangeForZooming } from "../logic/CalculateRangeForZooming";
import { CollectBreadcrumbs } from "../logic/CollectBreadcrumbs";
import { KeepOnlyZoomedContentVisible } from "../logic/KeepOnlyZoomedContentVisible";
import { Logger } from "../services/Logger";
import { t } from "../services/i18n";
import { getEditorViewFromEditor } from "../utils/getEditorViewFromEditor";

export type ZoomInCallback = (view: EditorView, pos: number) => void;
export type ZoomOutCallback = (view: EditorView) => void;

export class ZoomFeature implements Feature {
  private zoomInCallbacks: ZoomInCallback[] = [];
  private zoomOutCallbacks: ZoomOutCallback[] = [];

  private keepOnlyZoomedContentVisible = new KeepOnlyZoomedContentVisible(
    this.logger,
  );

  private calculateRangeForZooming = new CalculateRangeForZooming();

  private collectBreadcrumbs = new CollectBreadcrumbs({
    getDocumentTitle: getDocumentTitle,
  });

  constructor(
    private plugin: Plugin,
    private logger: Logger,
  ) {}

  public calculateVisibleContentRange(state: EditorState) {
    return this.keepOnlyZoomedContentVisible.calculateVisibleContentRange(
      state,
    );
  }

  public calculateHiddenContentRanges(state: EditorState) {
    return this.keepOnlyZoomedContentVisible.calculateHiddenContentRanges(
      state,
    );
  }

  public notifyAfterZoomIn(cb: ZoomInCallback) {
    this.zoomInCallbacks.push(cb);
  }

  public notifyAfterZoomOut(cb: ZoomOutCallback) {
    this.zoomOutCallbacks.push(cb);
  }

  public refreshZoom(view: EditorView) {
    const prevRange =
      this.keepOnlyZoomedContentVisible.calculateVisibleContentRange(
        view.state,
      );

    if (!prevRange) {
      return;
    }

    const newRange = this.calculateRangeForZooming.calculateRangeForZooming(
      view.state,
      prevRange.from,
    );

    if (!newRange) {
      return;
    }

    this.keepOnlyZoomedContentVisible.keepOnlyZoomedContentVisible(
      view,
      newRange.from,
      newRange.to,
      { scrollIntoView: false },
    );
  }

  public zoomIn(view: EditorView, pos: number) {
    const l = this.logger.bind("ZoomFeature:zoomIn");
    l("zooming in");

    if (!isFoldingEnabled(this.plugin.app)) {
      new Notice(
        `In order to zoom, you must first enable "Fold heading" and "Fold indent" under Settings -> Editor`,
      );
      return;
    }

    const range = this.calculateRangeForZooming.calculateRangeForZooming(
      view.state,
      pos,
    );

    if (!range) {
      l("unable to calculate range for zooming");
      return;
    }

    this.keepOnlyZoomedContentVisible.keepOnlyZoomedContentVisible(
      view,
      range.from,
      range.to,
    );

    for (const cb of this.zoomInCallbacks) {
      cb(view, pos);
    }
  }

  public zoomOut(view: EditorView) {
    const l = this.logger.bind("ZoomFeature:zoomOut");
    l("zooming out");

    this.keepOnlyZoomedContentVisible.showAllContent(view);

    for (const cb of this.zoomOutCallbacks) {
      cb(view);
    }
  }

  public zoomOutOneLevel(view: EditorView) {
    const l = this.logger.bind("ZoomFeature:zoomOutOneLevel");
    l("zooming out one level");

    const currentRange =
      this.keepOnlyZoomedContentVisible.calculateVisibleContentRange(
        view.state,
      );

    if (!currentRange) {
      // Either not zoomed in, or zoomed into content spanning entire document
      // In either case, zoom out to ensure we're fully zoomed out
      l("no hidden content, zooming out completely");
      this.zoomOut(view);
      return;
    }

    const breadcrumbs = this.collectBreadcrumbs.collectBreadcrumbs(
      view.state,
      currentRange.from,
    );

    // breadcrumbs: [document title (pos: null), ...ancestors, current item]
    // To go up one level, we need the second-to-last item
    if (breadcrumbs.length <= 2) {
      // Only document title and current item, zoom out completely
      l("at top level, zooming out completely");
      this.zoomOut(view);
      return;
    }

    const parentBreadcrumb = breadcrumbs[breadcrumbs.length - 2];

    if (parentBreadcrumb.pos === null) {
      // Parent is the document root, zoom out completely
      l("parent is document root, zooming out completely");
      this.zoomOut(view);
      return;
    }

    l("zooming to parent at pos", parentBreadcrumb.pos);
    this.zoomIn(view, parentBreadcrumb.pos);
  }

  async load() {
    this.plugin.registerEditorExtension(
      this.keepOnlyZoomedContentVisible.getExtension(),
    );

    this.plugin.addCommand({
      id: "zoom-in",
      name: t("cmd.zoom-in"),
      icon: "zoom-in",
      editorCallback: (editor) => {
        const view = getEditorViewFromEditor(editor);
        this.zoomIn(view, view.state.selection.main.head);
      },
      hotkeys: [
        {
          modifiers: ["Mod"],
          key: ".",
        },
      ],
    });

    this.plugin.addCommand({
      id: "zoom-out",
      name: t("cmd.zoom-out"),
      icon: "zoom-out",
      editorCallback: (editor) => this.zoomOut(getEditorViewFromEditor(editor)),
      hotkeys: [
        {
          modifiers: ["Mod", "Shift"],
          key: ".",
        },
      ],
    });

    this.plugin.addCommand({
      id: "zoom-out-one-level",
      name: t("cmd.zoom-out-one-level"),
      icon: "chevron-up",
      editorCallback: (editor) =>
        this.zoomOutOneLevel(getEditorViewFromEditor(editor)),
      hotkeys: [
        {
          modifiers: ["Mod", "Alt"],
          key: ".",
        },
      ],
    });
  }

  async unload() {}
}
