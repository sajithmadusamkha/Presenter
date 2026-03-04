import type Database from 'better-sqlite3'
import type {
  Song,
  SongSection,
  SongWithSections,
  CreateSongInput,
  UpdateSongInput,
  SectionUpsertInput,
  SongListQuery
} from '../../shared/song-types'

// ── helpers ──────────────────────────────────────────────────────────────────

function parseSong(row: Record<string, unknown>): Song {
  return {
    id: row.id as number,
    title: row.title as string,
    artist: (row.artist as string | null) ?? null,
    tags: JSON.parse((row.tags as string) || '[]') as string[],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  }
}

function parseSection(row: Record<string, unknown>): SongSection {
  return {
    id: row.id as number,
    songId: row.song_id as number,
    type: row.type as SongSection['type'],
    label: row.label as string,
    content: row.content as string,
    sortOrder: row.sort_order as number
  }
}

// ── songs ─────────────────────────────────────────────────────────────────────

export function listSongs(db: Database.Database, query?: SongListQuery): Song[] {
  const { search, tags } = query ?? {}

  let sql = 'SELECT * FROM songs'
  const params: unknown[] = []
  const conditions: string[] = []

  if (search && search.trim()) {
    conditions.push("(title LIKE ? OR artist LIKE ?)")
    const like = `%${search.trim()}%`
    params.push(like, like)
  }

  if (tags && tags.length > 0) {
    // Match songs that contain ALL requested tags
    tags.forEach((tag) => {
      conditions.push("EXISTS (SELECT 1 FROM json_each(songs.tags) WHERE value = ?)")
      params.push(tag)
    })
  }

  if (conditions.length) {
    sql += ' WHERE ' + conditions.join(' AND ')
  }

  sql += ' ORDER BY title COLLATE NOCASE ASC'

  return (db.prepare(sql).all(...params) as Record<string, unknown>[]).map(parseSong)
}

export function getSong(db: Database.Database, id: number): SongWithSections | null {
  const songRow = db.prepare('SELECT * FROM songs WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined
  if (!songRow) return null

  const sectionRows = db
    .prepare('SELECT * FROM song_sections WHERE song_id = ? ORDER BY sort_order ASC')
    .all(id) as Record<string, unknown>[]

  return {
    ...parseSong(songRow),
    sections: sectionRows.map(parseSection)
  }
}

export function createSong(db: Database.Database, input: CreateSongInput): Song {
  const result = db
    .prepare('INSERT INTO songs (title, artist, tags) VALUES (?, ?, ?)')
    .run(input.title, input.artist ?? null, JSON.stringify(input.tags ?? []))

  return parseSong(
    db.prepare('SELECT * FROM songs WHERE id = ?').get(result.lastInsertRowid) as Record<
      string,
      unknown
    >
  )
}

export function updateSong(
  db: Database.Database,
  id: number,
  patch: UpdateSongInput
): Song | null {
  const sets: string[] = ["updated_at = datetime('now')"]
  const params: unknown[] = []

  if (patch.title !== undefined) { sets.push('title = ?'); params.push(patch.title) }
  if (patch.artist !== undefined) { sets.push('artist = ?'); params.push(patch.artist ?? null) }
  if (patch.tags !== undefined) { sets.push('tags = ?'); params.push(JSON.stringify(patch.tags)) }

  if (sets.length === 1) return getSong(db, id) // nothing to update

  params.push(id)
  db.prepare(`UPDATE songs SET ${sets.join(', ')} WHERE id = ?`).run(...params)

  const row = db.prepare('SELECT * FROM songs WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined
  return row ? parseSong(row) : null
}

export function deleteSong(db: Database.Database, id: number): void {
  db.prepare('DELETE FROM songs WHERE id = ?').run(id)
}

// ── sections ──────────────────────────────────────────────────────────────────

export function upsertSection(
  db: Database.Database,
  data: SectionUpsertInput
): SongSection {
  if (data.id !== undefined) {
    db.prepare(
      'UPDATE song_sections SET type=?, label=?, content=?, sort_order=? WHERE id=?'
    ).run(data.type, data.label, data.content, data.sortOrder, data.id)

    return parseSection(
      db.prepare('SELECT * FROM song_sections WHERE id = ?').get(data.id) as Record<
        string,
        unknown
      >
    )
  } else {
    const result = db
      .prepare(
        'INSERT INTO song_sections (song_id, type, label, content, sort_order) VALUES (?,?,?,?,?)'
      )
      .run(data.songId, data.type, data.label, data.content, data.sortOrder)

    return parseSection(
      db
        .prepare('SELECT * FROM song_sections WHERE id = ?')
        .get(result.lastInsertRowid) as Record<string, unknown>
    )
  }
}

export function deleteSection(db: Database.Database, id: number): void {
  db.prepare('DELETE FROM song_sections WHERE id = ?').run(id)
}

export function reorderSections(
  db: Database.Database,
  songId: number,
  orderedIds: number[]
): void {
  const update = db.prepare(
    'UPDATE song_sections SET sort_order = ? WHERE id = ? AND song_id = ?'
  )
  const reorder = db.transaction(() => {
    orderedIds.forEach((id, index) => {
      update.run(index, id, songId)
    })
  })
  reorder()
}
