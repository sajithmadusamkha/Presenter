"use strict";
const electron = require("electron");
const path = require("path");
const utils = require("@electron-toolkit/utils");
const Database = require("better-sqlite3");
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
let db;
function initDb() {
  db = new Database(path.join(electron.app.getPath("userData"), "presenter.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS songs (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      title      TEXT    NOT NULL,
      artist     TEXT,
      tags       TEXT    NOT NULL DEFAULT '[]',
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS song_sections (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      song_id    INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
      type       TEXT    NOT NULL DEFAULT 'verse',
      label      TEXT    NOT NULL,
      content    TEXT    NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0
    );
  `);
}
function getDb() {
  return db;
}
function parseSong(row) {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist ?? null,
    tags: JSON.parse(row.tags || "[]"),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
function parseSection(row) {
  return {
    id: row.id,
    songId: row.song_id,
    type: row.type,
    label: row.label,
    content: row.content,
    sortOrder: row.sort_order
  };
}
function listSongs(db2, query) {
  const { search, tags } = query ?? {};
  let sql = "SELECT * FROM songs";
  const params = [];
  const conditions = [];
  if (search && search.trim()) {
    conditions.push("(title LIKE ? OR artist LIKE ?)");
    const like = `%${search.trim()}%`;
    params.push(like, like);
  }
  if (tags && tags.length > 0) {
    tags.forEach((tag) => {
      conditions.push("EXISTS (SELECT 1 FROM json_each(songs.tags) WHERE value = ?)");
      params.push(tag);
    });
  }
  if (conditions.length) {
    sql += " WHERE " + conditions.join(" AND ");
  }
  sql += " ORDER BY title COLLATE NOCASE ASC";
  return db2.prepare(sql).all(...params).map(parseSong);
}
function getSong(db2, id) {
  const songRow = db2.prepare("SELECT * FROM songs WHERE id = ?").get(id);
  if (!songRow) return null;
  const sectionRows = db2.prepare("SELECT * FROM song_sections WHERE song_id = ? ORDER BY sort_order ASC").all(id);
  return {
    ...parseSong(songRow),
    sections: sectionRows.map(parseSection)
  };
}
function createSong(db2, input) {
  const result = db2.prepare("INSERT INTO songs (title, artist, tags) VALUES (?, ?, ?)").run(input.title, input.artist ?? null, JSON.stringify(input.tags ?? []));
  return parseSong(
    db2.prepare("SELECT * FROM songs WHERE id = ?").get(result.lastInsertRowid)
  );
}
function updateSong(db2, id, patch) {
  const sets = ["updated_at = datetime('now')"];
  const params = [];
  if (patch.title !== void 0) {
    sets.push("title = ?");
    params.push(patch.title);
  }
  if (patch.artist !== void 0) {
    sets.push("artist = ?");
    params.push(patch.artist ?? null);
  }
  if (patch.tags !== void 0) {
    sets.push("tags = ?");
    params.push(JSON.stringify(patch.tags));
  }
  if (sets.length === 1) return getSong(db2, id);
  params.push(id);
  db2.prepare(`UPDATE songs SET ${sets.join(", ")} WHERE id = ?`).run(...params);
  const row = db2.prepare("SELECT * FROM songs WHERE id = ?").get(id);
  return row ? parseSong(row) : null;
}
function deleteSong(db2, id) {
  db2.prepare("DELETE FROM songs WHERE id = ?").run(id);
}
function upsertSection(db2, data) {
  if (data.id !== void 0) {
    db2.prepare(
      "UPDATE song_sections SET type=?, label=?, content=?, sort_order=? WHERE id=?"
    ).run(data.type, data.label, data.content, data.sortOrder, data.id);
    return parseSection(
      db2.prepare("SELECT * FROM song_sections WHERE id = ?").get(data.id)
    );
  } else {
    const result = db2.prepare(
      "INSERT INTO song_sections (song_id, type, label, content, sort_order) VALUES (?,?,?,?,?)"
    ).run(data.songId, data.type, data.label, data.content, data.sortOrder);
    return parseSection(
      db2.prepare("SELECT * FROM song_sections WHERE id = ?").get(result.lastInsertRowid)
    );
  }
}
function deleteSection(db2, id) {
  db2.prepare("DELETE FROM song_sections WHERE id = ?").run(id);
}
function reorderSections(db2, songId, orderedIds) {
  const update = db2.prepare(
    "UPDATE song_sections SET sort_order = ? WHERE id = ? AND song_id = ?"
  );
  const reorder = db2.transaction(() => {
    orderedIds.forEach((id, index) => {
      update.run(index, id, songId);
    });
  });
  reorder();
}
let controlWindow = null;
let outputWindow = null;
function createControlWindow() {
  controlWindow = new electron.BrowserWindow({
    width: 1400,
    height: 900,
    title: "Presenter — Control",
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "../preload/control.js"),
      sandbox: false
    }
  });
  controlWindow.on("ready-to-show", () => {
    controlWindow.show();
  });
  controlWindow.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (utils.is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    controlWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    controlWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}
function getExternalDisplay() {
  const displays = electron.screen.getAllDisplays();
  return displays.find((d) => d.id !== electron.screen.getPrimaryDisplay().id) ?? null;
}
function createOutputWindow(initialPayload) {
  const external = getExternalDisplay();
  const { x, y, width, height } = external.bounds;
  outputWindow = new electron.BrowserWindow({
    x,
    y,
    width,
    height,
    title: "Presenter — Output",
    show: false,
    frame: false,
    backgroundColor: "#000000",
    webPreferences: {
      preload: path.join(__dirname, "../preload/output.js"),
      sandbox: false
    }
  });
  outputWindow.webContents.once("did-finish-load", () => {
    outputWindow.show();
    outputWindow.setFullScreen(true);
    setTimeout(() => {
      outputWindow?.webContents.send(IPC.GO_LIVE, initialPayload);
    }, 100);
  });
  outputWindow.on("closed", () => {
    outputWindow = null;
  });
  if (utils.is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    outputWindow.loadURL(process.env["ELECTRON_RENDERER_URL"] + "/output.html");
  } else {
    outputWindow.loadFile(path.join(__dirname, "../renderer/output.html"));
  }
}
electron.ipcMain.handle(IPC.GO_LIVE, (_event, payload) => {
  if (!getExternalDisplay()) {
    return { success: false, reason: "no-external-display" };
  }
  if (!outputWindow || outputWindow.isDestroyed()) {
    createOutputWindow(payload);
  } else {
    outputWindow.webContents.send(IPC.GO_LIVE, payload);
  }
  return { success: true };
});
electron.ipcMain.handle(IPC.BLANK, () => {
  outputWindow?.webContents.send(IPC.BLANK);
});
electron.ipcMain.handle(IPC.CLEAR, () => {
  if (outputWindow && !outputWindow.isDestroyed()) {
    outputWindow.destroy();
    outputWindow = null;
  }
});
electron.ipcMain.handle(
  IPC.SONG_LIST,
  (_event, query) => listSongs(getDb(), query)
);
electron.ipcMain.handle(
  IPC.SONG_GET,
  (_event, id) => getSong(getDb(), id)
);
electron.ipcMain.handle(
  IPC.SONG_CREATE,
  (_event, input) => createSong(getDb(), input)
);
electron.ipcMain.handle(
  IPC.SONG_UPDATE,
  (_event, id, patch) => updateSong(getDb(), id, patch)
);
electron.ipcMain.handle(
  IPC.SONG_DELETE,
  (_event, id) => deleteSong(getDb(), id)
);
electron.ipcMain.handle(
  IPC.SECTION_UPSERT,
  (_event, data) => upsertSection(getDb(), data)
);
electron.ipcMain.handle(
  IPC.SECTION_DELETE,
  (_event, id) => deleteSection(getDb(), id)
);
electron.ipcMain.handle(
  IPC.SECTION_REORDER,
  (_event, songId, orderedIds) => reorderSections(getDb(), songId, orderedIds)
);
electron.app.whenReady().then(() => {
  initDb();
  utils.electronApp.setAppUserModelId("com.presenter");
  electron.app.on("browser-window-created", (_, window) => {
    utils.optimizer.watchWindowShortcuts(window);
  });
  createControlWindow();
  electron.app.on("activate", function() {
    if (electron.BrowserWindow.getAllWindows().length === 0) {
      createControlWindow();
    }
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
