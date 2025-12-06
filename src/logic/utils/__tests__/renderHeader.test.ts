/**
 * @jest-environment jsdom
 */
import { renderHeader } from "../renderHeader";

test("should render html with 2 breadcrumbs (no collapse)", () => {
  const h = renderHeader(document, {
    breadcrumbs: [
      { title: "Document", pos: null },
      { title: "header 1", pos: 10 },
    ],
    onClick: () => {},
  });

  const titles = h.querySelectorAll(".zoom-plugin-title");
  expect(titles.length).toBe(2);
  expect(titles[0].textContent).toBe("Document");
  expect(titles[1].textContent).toBe("header 1");
  expect(h.querySelector(".zoom-plugin-expand-btn")).toBeNull();
});

test("should render html with 3 breadcrumbs (no collapse)", () => {
  const h = renderHeader(document, {
    breadcrumbs: [
      { title: "Document", pos: null },
      { title: "header 1", pos: 10 },
      { title: "header 2", pos: 20 },
    ],
    onClick: () => {},
  });

  const titles = h.querySelectorAll(".zoom-plugin-title");
  expect(titles.length).toBe(3);
  expect(h.querySelector(".zoom-plugin-expand-btn")).toBeNull();
});

test("should render collapsed breadcrumbs with 4+ items", () => {
  const h = renderHeader(document, {
    breadcrumbs: [
      { title: "Document", pos: null },
      { title: "header 1", pos: 10 },
      { title: "header 2", pos: 20 },
      { title: "header 3", pos: 30 },
    ],
    onClick: () => {},
  });

  const titles = h.querySelectorAll(
    ".zoom-plugin-title:not(.zoom-plugin-hidden)"
  );
  // Collapsed: root / ··· / second-to-last / last = 3 visible titles
  expect(titles.length).toBe(3);
  expect(titles[0].textContent).toBe("Document");
  expect(titles[1].textContent).toBe("header 2");
  expect(titles[2].textContent).toBe("header 3");

  const expandBtn = h.querySelector(".zoom-plugin-expand-btn");
  expect(expandBtn).not.toBeNull();
  expect(expandBtn?.textContent).toBe("···");
});

test("should expand breadcrumbs when clicking expand button", () => {
  const h = renderHeader(document, {
    breadcrumbs: [
      { title: "Document", pos: null },
      { title: "header 1", pos: 10 },
      { title: "header 2", pos: 20 },
      { title: "header 3", pos: 30 },
      { title: "header 4", pos: 40 },
    ],
    onClick: () => {},
  });

  // Before expand: root, …, second-to-last, last = 3 visible titles
  expect(
    h.querySelectorAll(".zoom-plugin-title:not(.zoom-plugin-hidden)").length
  ).toBe(3);
  expect(
    h.querySelector(".zoom-plugin-expand-btn:not(.zoom-plugin-hidden)")
  ).not.toBeNull();

  // Click expand
  const expandBtn = h.querySelector<HTMLButtonElement>(
    ".zoom-plugin-expand-btn"
  );
  expandBtn?.click();

  // After expand: all 5 titles visible
  expect(
    h.querySelectorAll(".zoom-plugin-title:not(.zoom-plugin-hidden)").length
  ).toBe(5);
  expect(
    h.querySelector(".zoom-plugin-expand-btn:not(.zoom-plugin-hidden)")
  ).toBeNull();
  expect(
    h.querySelector(".zoom-plugin-collapse-btn:not(.zoom-plugin-hidden)")
  ).not.toBeNull();
});

test("should collapse breadcrumbs when clicking collapse button", () => {
  const h = renderHeader(document, {
    breadcrumbs: [
      { title: "Document", pos: null },
      { title: "header 1", pos: 10 },
      { title: "header 2", pos: 20 },
      { title: "header 3", pos: 30 },
    ],
    onClick: () => {},
  });

  // Expand first
  const expandBtn = h.querySelector<HTMLButtonElement>(
    ".zoom-plugin-expand-btn"
  );
  expandBtn?.click();

  expect(
    h.querySelectorAll(".zoom-plugin-title:not(.zoom-plugin-hidden)").length
  ).toBe(4);

  // Now collapse
  const collapseBtn = h.querySelector<HTMLButtonElement>(
    ".zoom-plugin-collapse-btn:not(.zoom-plugin-hidden)"
  );
  collapseBtn?.click();

  expect(
    h.querySelectorAll(".zoom-plugin-title:not(.zoom-plugin-hidden)").length
  ).toBe(3);
  expect(
    h.querySelector(".zoom-plugin-expand-btn:not(.zoom-plugin-hidden)")
  ).not.toBeNull();
});

test("should handle click on document link", () => {
  const onClick = jest.fn();
  const h = renderHeader(document, {
    breadcrumbs: [
      { title: "Document", pos: null },
      { title: "header 1", pos: 10 },
    ],
    onClick,
  });

  h.querySelectorAll<HTMLSpanElement>(".zoom-plugin-title")[0].click();

  expect(onClick).toHaveBeenCalledWith(null);
});

test("should handle click on header link", () => {
  const onClick = jest.fn();
  const h = renderHeader(document, {
    breadcrumbs: [
      { title: "Document", pos: null },
      { title: "header 1", pos: 10 },
    ],
    onClick,
  });

  h.querySelectorAll<HTMLSpanElement>(".zoom-plugin-title")[1].click();

  expect(onClick).toHaveBeenCalledWith(10);
});

test("should set title attribute for tooltips", () => {
  const h = renderHeader(document, {
    breadcrumbs: [
      { title: "Document", pos: null },
      { title: "A very long header title", pos: 10 },
    ],
    onClick: () => {},
  });

  const titles = h.querySelectorAll<HTMLAnchorElement>(".zoom-plugin-title");
  expect(titles[0].title).toBe("Document");
  expect(titles[1].title).toBe("A very long header title");
});
