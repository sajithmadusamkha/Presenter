export const IPC = {
  // Output control
  GO_LIVE: "go-live",
  BLANK: "blank",
  CLEAR: "clear",
  // Song CRUD
  SONG_LIST: "song:list",
  SONG_GET: "song:get",
  SONG_CREATE: "song:create",
  SONG_UPDATE: "song:update",
  SONG_DELETE: "song:delete",
  // Section CRUD
  SECTION_UPSERT: "song:section:upsert",
  SECTION_DELETE: "song:section:delete",
  SECTION_REORDER: "song:section:reorder",
  // Editor window
  SONG_OPEN_EDITOR: "song:open-editor",
  EDITOR_CLOSE: "editor:close",
} as const;

export interface SlidePayload {
  id: string;
  title: string;
  body: string;
  imagePath?: string;
}

export interface SlideMessage {
  type: "slide" | "blank" | "clear";
  payload?: SlidePayload;
}
