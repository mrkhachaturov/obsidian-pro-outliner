export function cleanTitle(title: string) {
  return (
    title
      .trim()
      .replace(/^#+(\s)/, "$1")
      .replace(/^([-+*]|\d+\.)(\s)/, "$2")
      // Remove mirror markers
      .replace(/\s*<!--\s*mirror:[a-zA-Z0-9]+\s*-->\s*/g, "")
      // Remove block IDs (both outliner- and native Obsidian format)
      .replace(/\s*\^[a-zA-Z0-9-]+\s*/g, "")
      // Extract display text from wikilinks: [[link|display]] -> display, [[link]] -> link
      .replace(/\[\[([^\]]+)\]\]/g, (_match, content: string) => {
        const parts = content.split("|");
        // If there's a pipe, use the part after it (display text)
        // Otherwise use the link itself (remove path if present)
        if (parts.length > 1) {
          return parts[parts.length - 1];
        }
        // For [[link]], extract just the note name (remove path)
        const linkPart = parts[0];
        const lastSlash = linkPart.lastIndexOf("/");
        return lastSlash >= 0 ? linkPart.substring(lastSlash + 1) : linkPart;
      })
      // Remove Creases plugin fold markers: %% fold %%, %% fold:... %%, etc.
      .replace(/\s*%%\s*fold[^%]*%%\s*/gi, "")
      // Remove other common markers: %% ... %%
      .replace(/\s*%%[^%]*%%\s*/g, "")
      .trim()
  );
}
