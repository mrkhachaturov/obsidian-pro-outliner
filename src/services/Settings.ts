import { Platform } from "obsidian";

export type VerticalLinesAction = "none" | "zoom-in" | "toggle-folding";
export type KeepCursorWithinContent =
  | "never"
  | "bullet-only"
  | "bullet-and-checkbox";

interface SettingsObject {
  styleLists: boolean;
  debug: boolean;
  stickCursor: KeepCursorWithinContent | boolean;
  betterEnter: boolean;
  betterVimO: boolean;
  betterTab: boolean;
  selectAll: boolean;
  expandSelection: boolean;
  listLines: boolean;
  listLineAction: VerticalLinesAction;
  dnd: boolean;
  previousRelease: string | null;
  // Zoom settings
  zoomOnClick: boolean;
  zoomOnClickMobile: boolean;
  // Linked copies settings
  linkedCopies: boolean;
  showBlockIds: boolean;
}

const DEFAULT_SETTINGS: SettingsObject = {
  styleLists: true,
  debug: false,
  stickCursor: "bullet-and-checkbox",
  betterEnter: true,
  betterVimO: true,
  betterTab: true,
  selectAll: true,
  expandSelection: true,
  listLines: false,
  listLineAction: "toggle-folding",
  dnd: true,
  previousRelease: null,
  // Zoom settings
  zoomOnClick: true,
  zoomOnClickMobile: false,
  // Linked copies settings
  linkedCopies: true,
  showBlockIds: false,
};

export interface Storage {
  loadData(): Promise<SettingsObject>;
  saveData(settings: SettingsObject): Promise<void>;
}

type Callback = () => void;
type SettingsKey = keyof SettingsObject;
type KeyCallback<K extends SettingsKey> = (value: SettingsObject[K]) => void;

export class Settings {
  private storage: Storage;
  private values: SettingsObject;
  private callbacks: Set<Callback>;
  private keyCallbacks: Map<SettingsKey, Set<KeyCallback<SettingsKey>>>;

  constructor(storage: Storage) {
    this.storage = storage;
    this.callbacks = new Set();
    this.keyCallbacks = new Map();
  }

  get keepCursorWithinContent() {
    // Adaptor for users migrating from older version of the plugin.
    if (this.values.stickCursor === true) {
      return "bullet-and-checkbox";
    } else if (this.values.stickCursor === false) {
      return "never";
    }

    return this.values.stickCursor;
  }

  set keepCursorWithinContent(value: KeepCursorWithinContent) {
    this.set("stickCursor", value);
  }

  get overrideTabBehaviour() {
    return this.values.betterTab;
  }

  set overrideTabBehaviour(value: boolean) {
    this.set("betterTab", value);
  }

  get overrideEnterBehaviour() {
    return this.values.betterEnter;
  }

  set overrideEnterBehaviour(value: boolean) {
    this.set("betterEnter", value);
  }

  get overrideVimOBehaviour() {
    return this.values.betterVimO;
  }

  set overrideVimOBehaviour(value: boolean) {
    this.set("betterVimO", value);
  }

  get overrideSelectAllBehaviour() {
    return this.values.selectAll;
  }

  set overrideSelectAllBehaviour(value: boolean) {
    this.set("selectAll", value);
  }

  get expandSelection() {
    return this.values.expandSelection;
  }

  set expandSelection(value: boolean) {
    this.set("expandSelection", value);
  }

  get betterListsStyles() {
    return this.values.styleLists;
  }

  set betterListsStyles(value: boolean) {
    this.set("styleLists", value);
  }

  get verticalLines() {
    return this.values.listLines;
  }

  set verticalLines(value: boolean) {
    this.set("listLines", value);
  }

  get verticalLinesAction() {
    return this.values.listLineAction;
  }

  set verticalLinesAction(value: VerticalLinesAction) {
    this.set("listLineAction", value);
  }

  get dragAndDrop() {
    return this.values.dnd;
  }

  set dragAndDrop(value: boolean) {
    this.set("dnd", value);
  }

  get debug() {
    return this.values.debug;
  }

  set debug(value: boolean) {
    this.set("debug", value);
  }

  get previousRelease() {
    return this.values.previousRelease;
  }

  set previousRelease(value: string | null) {
    this.set("previousRelease", value);
  }

  get zoomOnClick() {
    return Platform.isDesktop
      ? this.values.zoomOnClick
      : this.values.zoomOnClickMobile;
  }

  set zoomOnClick(value: boolean) {
    if (Platform.isDesktop) {
      this.set("zoomOnClick", value);
    } else {
      this.set("zoomOnClickMobile", value);
    }
  }

  get linkedCopies() {
    return this.values.linkedCopies;
  }

  set linkedCopies(value: boolean) {
    this.set("linkedCopies", value);
  }

  get showBlockIds() {
    return this.values.showBlockIds;
  }

  set showBlockIds(value: boolean) {
    this.set("showBlockIds", value);
  }

  // Simple callback for any change
  onChange(cb: Callback): void;
  // Key-specific callback
  onChange<K extends SettingsKey>(key: K, cb: KeyCallback<K>): void;
  onChange<K extends SettingsKey>(
    keyOrCb: K | Callback,
    cb?: KeyCallback<K>,
  ): void {
    if (typeof keyOrCb === "function") {
      this.callbacks.add(keyOrCb);
    } else {
      if (!this.keyCallbacks.has(keyOrCb)) {
        this.keyCallbacks.set(keyOrCb, new Set());
      }
      this.keyCallbacks.get(keyOrCb)!.add(cb as KeyCallback<SettingsKey>);
    }
  }

  // Remove simple callback
  removeCallback(cb: Callback): void;
  // Remove key-specific callback
  removeCallback<K extends SettingsKey>(key: K, cb: KeyCallback<K>): void;
  removeCallback<K extends SettingsKey>(
    keyOrCb: K | Callback,
    cb?: KeyCallback<K>,
  ): void {
    if (typeof keyOrCb === "function") {
      this.callbacks.delete(keyOrCb);
    } else {
      const handlers = this.keyCallbacks.get(keyOrCb);
      if (handlers) {
        handlers.delete(cb as KeyCallback<SettingsKey>);
      }
    }
  }

  reset() {
    for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) {
      this.set(k as keyof SettingsObject, v);
    }
  }

  async load() {
    this.values = Object.assign(
      {},
      DEFAULT_SETTINGS,
      await this.storage.loadData(),
    );
  }

  async save() {
    await this.storage.saveData(this.values);
  }

  getValues(): SettingsObject {
    return { ...this.values };
  }

  private set<T extends keyof SettingsObject>(
    key: T,
    value: SettingsObject[T],
  ): void {
    this.values[key] = value;

    // Trigger simple callbacks
    for (const cb of this.callbacks) {
      cb();
    }

    // Trigger key-specific callbacks
    const keyHandlers = this.keyCallbacks.get(key);
    if (keyHandlers) {
      for (const cb of keyHandlers) {
        cb(value);
      }
    }
  }
}
