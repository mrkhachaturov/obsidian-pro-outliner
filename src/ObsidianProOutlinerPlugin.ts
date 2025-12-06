import { Editor, Plugin } from "obsidian";

// Outliner features
import { ArrowLeftAndCtrlArrowLeftBehaviourOverride } from "./features/ArrowLeftAndCtrlArrowLeftBehaviourOverride";
import { BackspaceBehaviourOverride } from "./features/BackspaceBehaviourOverride";
import { BetterListsStyles } from "./features/BetterListsStyles";
import { CtrlAAndCmdABehaviourOverride } from "./features/CtrlAAndCmdABehaviourOverride";
import { DeleteBehaviourOverride } from "./features/DeleteBehaviourOverride";
import { DragAndDrop } from "./features/DragAndDrop";
import { EditorSelectionsBehaviourOverride } from "./features/EditorSelectionsBehaviourOverride";
import { EnterBehaviourOverride } from "./features/EnterBehaviourOverride";
import { Feature } from "./features/Feature";
import { ListsFoldingCommands } from "./features/ListsFoldingCommands";
import { ListsMovementCommands } from "./features/ListsMovementCommands";
import { MetaBackspaceBehaviourOverride } from "./features/MetaBackspaceBehaviourOverride";
import { SettingsTab } from "./features/SettingsTab";
import { ShiftTabBehaviourOverride } from "./features/ShiftTabBehaviourOverride";
import { SystemInfo } from "./features/SystemInfo";
import { TabBehaviourOverride } from "./features/TabBehaviourOverride";
import { VerticalLines } from "./features/VerticalLines";
import { VimOBehaviourOverride } from "./features/VimOBehaviourOverride";

// Zoom features
import { HeaderNavigationFeature } from "./features/HeaderNavigationFeature";
import { LimitSelectionFeature } from "./features/LimitSelectionFeature";
import { ListsStylesFeature } from "./features/ListsStylesFeature";
import { ResetZoomWhenVisibleContentBoundariesViolatedFeature } from "./features/ResetZoomWhenVisibleContentBoundariesViolatedFeature";
import { ZoomFeature } from "./features/ZoomFeature";
import { ZoomOnClickFeature } from "./features/ZoomOnClickFeature";

// Services
import { ChangesApplicator } from "./services/ChangesApplicator";
import { IMEDetector } from "./services/IMEDetector";
import { Logger } from "./services/Logger";
import { ObsidianSettings } from "./services/ObsidianSettings";
import { OperationPerformer } from "./services/OperationPerformer";
import { Parser } from "./services/Parser";
import { Settings } from "./services/Settings";

// Utils
import { getEditorViewFromEditor } from "./utils/getEditorViewFromEditor";

declare global {
  const PLUGIN_VERSION: string;
  const CHANGELOG_MD: string;
  interface Window {
    ObsidianProOutlinerPlugin?: ObsidianProOutlinerPlugin;
  }
}

export default class ObsidianProOutlinerPlugin extends Plugin {
  private features: Feature[];
  protected settings: Settings;
  private logger: Logger;
  private obsidianSettings: ObsidianSettings;
  private parser: Parser;
  private changesApplicator: ChangesApplicator;
  private operationPerformer: OperationPerformer;
  private imeDetector: IMEDetector;
  protected zoomFeature: ZoomFeature;

  async onload() {
    console.log(`Loading obsidian-pro-outliner`);

    // Make plugin available globally for API access
    window.ObsidianProOutlinerPlugin = this;

    await this.prepareSettings();

    this.obsidianSettings = new ObsidianSettings(this.app);
    this.logger = new Logger(this.settings);
    this.parser = new Parser(this.logger, this.settings);
    this.changesApplicator = new ChangesApplicator();
    this.operationPerformer = new OperationPerformer(
      this.parser,
      this.changesApplicator,
    );

    this.imeDetector = new IMEDetector();
    await this.imeDetector.load();

    // Initialize zoom feature first (needed by other zoom features)
    this.zoomFeature = new ZoomFeature(this, this.logger);

    this.features = [
      // ============================================
      // SERVICE FEATURES
      // ============================================
      new SettingsTab(this, this.settings),
      new SystemInfo(this, this.settings),

      // ============================================
      // OUTLINER FEATURES
      // ============================================

      // General features
      new ListsMovementCommands(
        this,
        this.obsidianSettings,
        this.operationPerformer,
      ),
      new ListsFoldingCommands(this, this.obsidianSettings),

      // Features based on settings.keepCursorWithinContent
      new EditorSelectionsBehaviourOverride(
        this,
        this.settings,
        this.parser,
        this.operationPerformer,
      ),
      new ArrowLeftAndCtrlArrowLeftBehaviourOverride(
        this,
        this.settings,
        this.imeDetector,
        this.operationPerformer,
      ),
      new BackspaceBehaviourOverride(
        this,
        this.settings,
        this.imeDetector,
        this.operationPerformer,
      ),
      new MetaBackspaceBehaviourOverride(
        this,
        this.settings,
        this.imeDetector,
        this.operationPerformer,
      ),
      new DeleteBehaviourOverride(
        this,
        this.settings,
        this.imeDetector,
        this.operationPerformer,
      ),

      // Features based on settings.overrideTabBehaviour
      new TabBehaviourOverride(
        this,
        this.imeDetector,
        this.obsidianSettings,
        this.settings,
        this.operationPerformer,
      ),
      new ShiftTabBehaviourOverride(
        this,
        this.imeDetector,
        this.settings,
        this.operationPerformer,
      ),

      // Features based on settings.overrideEnterBehaviour
      new EnterBehaviourOverride(
        this,
        this.settings,
        this.imeDetector,
        this.obsidianSettings,
        this.parser,
        this.operationPerformer,
      ),

      // Features based on settings.overrideVimOBehaviour
      new VimOBehaviourOverride(
        this,
        this.settings,
        this.obsidianSettings,
        this.parser,
        this.operationPerformer,
      ),

      // Features based on settings.overrideSelectAllBehaviour
      new CtrlAAndCmdABehaviourOverride(
        this,
        this.settings,
        this.imeDetector,
        this.operationPerformer,
      ),

      // Features based on settings.betterListsStyles
      new BetterListsStyles(this.settings, this.obsidianSettings),

      // Features based on settings.verticalLines
      new VerticalLines(
        this,
        this.settings,
        this.obsidianSettings,
        this.parser,
      ),

      // Features based on settings.dragAndDrop
      new DragAndDrop(
        this,
        this.settings,
        this.obsidianSettings,
        this.parser,
        this.operationPerformer,
      ),

      // ============================================
      // ZOOM FEATURES
      // ============================================

      // Core zoom feature
      this.zoomFeature,

      // Limit selection when zoomed
      new LimitSelectionFeature(this, this.logger, this.zoomFeature),

      // Reset zoom when boundaries violated
      new ResetZoomWhenVisibleContentBoundariesViolatedFeature(
        this,
        this.logger,
        this.zoomFeature,
        this.zoomFeature,
      ),

      // Breadcrumb navigation header
      new HeaderNavigationFeature(
        this,
        this.logger,
        this.zoomFeature,
        this.zoomFeature,
        this.zoomFeature,
        this.zoomFeature,
        this.zoomFeature,
        this.zoomFeature,
      ),

      // Click on bullet to zoom
      new ZoomOnClickFeature(this, this.settings, this.zoomFeature),

      // Zoom-related list styles
      new ListsStylesFeature(this.settings),
    ];

    for (const feature of this.features) {
      await feature.load();
    }
  }

  async onunload() {
    console.log(`Unloading obsidian-pro-outliner`);

    delete window.ObsidianProOutlinerPlugin;

    await this.imeDetector.unload();

    for (const feature of this.features) {
      await feature.unload();
    }
  }

  protected async prepareSettings() {
    this.settings = new Settings(this);
    await this.settings.load();
  }

  // ============================================
  // PUBLIC API - Zoom functionality
  // ============================================

  public getZoomRange(editor: Editor) {
    const cm = getEditorViewFromEditor(editor);
    const range = this.zoomFeature.calculateVisibleContentRange(cm.state);

    if (!range) {
      return null;
    }

    const from = cm.state.doc.lineAt(range.from);
    const to = cm.state.doc.lineAt(range.to);

    return {
      from: {
        line: from.number - 1,
        ch: range.from - from.from,
      },
      to: {
        line: to.number - 1,
        ch: range.to - to.from,
      },
    };
  }

  public zoomOut(editor: Editor) {
    this.zoomFeature.zoomOut(getEditorViewFromEditor(editor));
  }

  public zoomOutOneLevel(editor: Editor) {
    this.zoomFeature.zoomOutOneLevel(getEditorViewFromEditor(editor));
  }

  public zoomIn(editor: Editor, line: number) {
    const cm = getEditorViewFromEditor(editor);
    const pos = cm.state.doc.line(line + 1).from;
    this.zoomFeature.zoomIn(cm, pos);
  }

  public refreshZoom(editor: Editor) {
    this.zoomFeature.refreshZoom(getEditorViewFromEditor(editor));
  }
}

