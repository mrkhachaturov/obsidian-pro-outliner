import { LinkedCopiesStore } from "../LinkedCopiesStore";

// Mock the Obsidian App
const mockApp = {
  vault: {
    getMarkdownFiles: jest.fn((): never[] => []),
    cachedRead: jest.fn(),
  },
  metadataCache: {
    getFileCache: jest.fn(),
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

describe("LinkedCopiesStore", () => {
  let store: LinkedCopiesStore;

  beforeEach(() => {
    store = new LinkedCopiesStore(mockApp);
    jest.clearAllMocks();
  });

  describe("generateId", () => {
    test("should generate an ID starting with 'outliner-'", () => {
      const id = store.generateId();
      expect(id).toMatch(/^outliner-[a-z0-9]{6}$/);
    });

    test("should generate unique IDs", () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(store.generateId());
      }
      expect(ids.size).toBe(100);
    });
  });

  describe("parseBlockId", () => {
    test("should extract block ID from line", () => {
      expect(store.parseBlockId("- item text ^outliner-abc123")).toBe(
        "outliner-abc123",
      );
    });

    test("should return null if no block ID", () => {
      expect(store.parseBlockId("- item text")).toBeNull();
    });

    test("should only match outliner-prefixed IDs", () => {
      expect(store.parseBlockId("- item ^otherblock")).toBeNull();
      expect(store.parseBlockId("- item ^outliner-test")).toBe("outliner-test");
    });
  });

  describe("parseMirrorMarker", () => {
    test("should extract mirror ID from line", () => {
      expect(
        store.parseMirrorMarker("- item <!-- mirror:outliner-abc123 -->"),
      ).toBe("outliner-abc123");
    });

    test("should handle spaces in marker", () => {
      expect(
        store.parseMirrorMarker("- item <!--mirror:outliner-abc123-->"),
      ).toBe("outliner-abc123");
      expect(
        store.parseMirrorMarker("- item <!--  mirror:outliner-abc123  -->"),
      ).toBe("outliner-abc123");
    });

    test("should return null if no mirror marker", () => {
      expect(store.parseMirrorMarker("- item text")).toBeNull();
    });
  });

  describe("hasMirrorMarker", () => {
    test("should return true if line has mirror marker", () => {
      expect(
        store.hasMirrorMarker("- item <!-- mirror:outliner-abc123 -->"),
      ).toBe(true);
    });

    test("should return false if no mirror marker", () => {
      expect(store.hasMirrorMarker("- item text")).toBe(false);
    });
  });

  describe("hasBlockId", () => {
    test("should return true if line has block ID", () => {
      expect(store.hasBlockId("- item ^outliner-abc123")).toBe(true);
    });

    test("should return false if no block ID", () => {
      expect(store.hasBlockId("- item text")).toBe(false);
    });
  });

  describe("addBlockId", () => {
    test("should add block ID to line", () => {
      expect(store.addBlockId("- item text", "outliner-abc123")).toBe(
        "- item text ^outliner-abc123",
      );
    });

    test("should trim trailing whitespace before adding", () => {
      expect(store.addBlockId("- item text  ", "outliner-abc123")).toBe(
        "- item text ^outliner-abc123",
      );
    });
  });

  describe("addMirrorMarker", () => {
    test("should add mirror marker to line", () => {
      expect(store.addMirrorMarker("- item text", "outliner-abc123")).toBe(
        "- item text <!-- mirror:outliner-abc123 -->",
      );
    });

    test("should trim trailing whitespace before adding", () => {
      expect(store.addMirrorMarker("- item text  ", "outliner-abc123")).toBe(
        "- item text <!-- mirror:outliner-abc123 -->",
      );
    });
  });

  describe("removeMirrorMarker", () => {
    test("should remove mirror marker from line", () => {
      expect(
        store.removeMirrorMarker("- item <!-- mirror:outliner-abc123 -->"),
      ).toBe("- item");
    });

    test("should return same line if no marker", () => {
      expect(store.removeMirrorMarker("- item text")).toBe("- item text");
    });
  });

  describe("removeBlockId", () => {
    test("should remove block ID from line", () => {
      expect(store.removeBlockId("- item ^outliner-abc123")).toBe("- item");
    });

    test("should return same line if no block ID", () => {
      expect(store.removeBlockId("- item text")).toBe("- item text");
    });
  });

  describe("extractListContent", () => {
    test("should extract content from simple list item", () => {
      expect(store.extractListContent("- item text")).toBe("item text");
    });

    test("should extract content from indented list item", () => {
      expect(store.extractListContent("  - item text")).toBe("item text");
    });

    test("should extract content from numbered list", () => {
      expect(store.extractListContent("1. item text")).toBe("item text");
    });

    test("should extract content from checkbox", () => {
      expect(store.extractListContent("- [x] done task")).toBe("done task");
      expect(store.extractListContent("- [ ] pending task")).toBe(
        "pending task",
      );
    });

    test("should remove block ID from content", () => {
      expect(store.extractListContent("- item text ^outliner-abc123")).toBe(
        "item text",
      );
    });

    test("should remove mirror marker from content", () => {
      expect(
        store.extractListContent("- item <!-- mirror:outliner-abc123 -->"),
      ).toBe("item");
    });
  });

  describe("getLinePrefix", () => {
    test("should get prefix for simple list item", () => {
      expect(store.getLinePrefix("- item text")).toBe("- ");
    });

    test("should get prefix for indented list item", () => {
      expect(store.getLinePrefix("  - item text")).toBe("  - ");
    });

    test("should get prefix for numbered list", () => {
      expect(store.getLinePrefix("1. item text")).toBe("1. ");
    });

    test("should get prefix with checkbox", () => {
      expect(store.getLinePrefix("- [x] done task")).toBe("- [x] ");
      expect(store.getLinePrefix("  - [ ] pending task")).toBe("  - [ ] ");
    });
  });

  describe("createMirrorContent", () => {
    test("should create mirror content without children", () => {
      const result = store.createMirrorContent(
        "- item text ^outliner-abc",
        [],
        "outliner-abc",
      );
      expect(result).toBe("- item text <!-- mirror:outliner-abc -->");
    });

    test("should create mirror content with children", () => {
      const result = store.createMirrorContent(
        "- parent ^outliner-abc",
        ["  - child 1", "  - child 2"],
        "outliner-abc",
      );
      expect(result).toBe(
        "- parent <!-- mirror:outliner-abc -->\n  - child 1\n  - child 2",
      );
    });

    test("should preserve checkbox in mirror", () => {
      const result = store.createMirrorContent(
        "- [x] task ^outliner-abc",
        [],
        "outliner-abc",
      );
      expect(result).toBe("- [x] task <!-- mirror:outliner-abc -->");
    });
  });
});
