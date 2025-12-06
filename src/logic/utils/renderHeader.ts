export function renderHeader(
  doc: Document,
  ctx: {
    breadcrumbs: Array<{ title: string; pos: number | null }>;
    onClick: (pos: number | null) => void;
  }
) {
  const { breadcrumbs, onClick } = ctx;

  const h = doc.createElement("div");
  h.classList.add("zoom-plugin-header");

  // If 3 or fewer breadcrumbs, show all normally
  // If more than 3, show: root / … / second-to-last / last
  const shouldCollapse = breadcrumbs.length > 3;

  const createDelimiter = (hidden = false) => {
    const d = doc.createElement("span");
    d.classList.add("zoom-plugin-delimiter");
    if (hidden) d.classList.add("zoom-plugin-hidden");
    d.innerText = "/";
    return d;
  };

  const createBreadcrumbLink = (
    breadcrumb: { title: string; pos: number | null },
    options: { hidden?: boolean; isLast?: boolean } = {}
  ) => {
    const { hidden = false, isLast = false } = options;
    const b = doc.createElement("a");
    b.classList.add("zoom-plugin-title");
    if (hidden) b.classList.add("zoom-plugin-hidden");
    if (isLast) b.classList.add("zoom-plugin-title-current");
    b.dataset.pos = String(breadcrumb.pos);
    b.appendChild(doc.createTextNode(breadcrumb.title));
    b.title = breadcrumb.title;
    b.addEventListener("click", (e) => {
      e.preventDefault();
      const t = e.target as HTMLAnchorElement;
      const pos = t.dataset.pos;
      onClick(pos === "null" ? null : Number(pos));
    });
    return b;
  };

  // Hidden breadcrumbs (middle ones)
  const hiddenIndices = shouldCollapse
    ? breadcrumbs
        .map((_, i) => i)
        .filter((i) => i > 0 && i < breadcrumbs.length - 2)
    : [];

  // Track all hideable elements for toggle
  const hideableElements: HTMLElement[] = [];
  let expandBtn: HTMLButtonElement | null = null;
  let collapseBtn: HTMLButtonElement | null = null;
  let expandDelimiter: HTMLElement | null = null;

  const toggleExpand = (expand: boolean) => {
    if (expand) {
      h.classList.add("zoom-plugin-expanded");
      hideableElements.forEach((el) =>
        el.classList.remove("zoom-plugin-hidden")
      );
      if (expandBtn) expandBtn.classList.add("zoom-plugin-hidden");
      if (expandDelimiter) expandDelimiter.classList.add("zoom-plugin-hidden");
      if (collapseBtn) collapseBtn.classList.remove("zoom-plugin-hidden");
    } else {
      h.classList.remove("zoom-plugin-expanded");
      hideableElements.forEach((el) => el.classList.add("zoom-plugin-hidden"));
      if (expandBtn) expandBtn.classList.remove("zoom-plugin-hidden");
      if (expandDelimiter)
        expandDelimiter.classList.remove("zoom-plugin-hidden");
      if (collapseBtn) collapseBtn.classList.add("zoom-plugin-hidden");
    }
  };

  // Build the header
  for (let i = 0; i < breadcrumbs.length; i++) {
    const isHidden = hiddenIndices.includes(i);

    // Add delimiter before each item except the first
    if (i > 0) {
      const delim = createDelimiter(isHidden);
      if (isHidden) hideableElements.push(delim);
      h.append(delim);
    }

    // Add expand button after first element (before hidden items)
    if (shouldCollapse && i === 1) {
      // Delimiter before expand button
      expandDelimiter = createDelimiter();
      h.append(expandDelimiter);

      expandBtn = doc.createElement("button");
      expandBtn.classList.add("zoom-plugin-expand-btn");
      expandBtn.innerText = "···";
      expandBtn.title = hiddenIndices
        .map((idx) => breadcrumbs[idx].title)
        .join(" / ");
      expandBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleExpand(true);
      });
      h.appendChild(expandBtn);
    }

    const isLast = i === breadcrumbs.length - 1;
    const link = createBreadcrumbLink(breadcrumbs[i], {
      hidden: isHidden,
      isLast,
    });
    if (isHidden) hideableElements.push(link);
    h.appendChild(link);
  }

  // Add collapse button at the end (hidden by default)
  if (shouldCollapse) {
    collapseBtn = doc.createElement("button");
    collapseBtn.classList.add("zoom-plugin-collapse-btn", "zoom-plugin-hidden");
    collapseBtn.innerText = "‹";
    collapseBtn.title = "Collapse";
    collapseBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleExpand(false);
    });
    h.appendChild(collapseBtn);

    // Auto-collapse when clicking outside the header
    const handleClickOutside = (e: MouseEvent) => {
      if (
        !h.contains(e.target as Node) &&
        h.classList.contains("zoom-plugin-expanded")
      ) {
        toggleExpand(false);
      }
    };
    doc.addEventListener("click", handleClickOutside);
  }

  return h;
}
