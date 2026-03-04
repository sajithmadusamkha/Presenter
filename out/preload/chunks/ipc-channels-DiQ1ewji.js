"use strict";
const IPC = {
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
  SECTION_REORDER: "song:section:reorder"
};
exports.IPC = IPC;
