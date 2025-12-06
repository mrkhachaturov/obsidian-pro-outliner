import { editorViewField } from "obsidian";

import { EditorState } from "@codemirror/state";

export function getDocumentTitle(state: EditorState) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (state.field(editorViewField) as any).getDisplayText();
}
