export function cleanTitle(title: string) {
  return (
    title
      .trim()
      .replace(/^#+(\s)/, "$1")
      .replace(/^([-+*]|\d+\.)(\s)/, "$2")
      // Remove mirror markers
      .replace(/\s*<!--\s*mirror:[a-zA-Z0-9]+\s*-->\s*/g, "")
      // Remove block IDs
      .replace(/\s*\^outliner-[a-zA-Z0-9]+\s*/g, "")
      .trim()
  );
}
