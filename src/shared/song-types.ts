export type SectionType =
  | 'verse'
  | 'chorus'
  | 'pre-chorus'
  | 'bridge'
  | 'tag'
  | 'intro'
  | 'outro'
  | 'interlude'

export const SECTION_TYPE_LABELS: Record<SectionType, string> = {
  verse: 'Verse',
  chorus: 'Chorus',
  'pre-chorus': 'Pre-Chorus',
  bridge: 'Bridge',
  tag: 'Tag',
  intro: 'Intro',
  outro: 'Outro',
  interlude: 'Interlude'
}

export interface Song {
  id: number
  title: string
  artist: string | null
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface SongSection {
  id: number
  songId: number
  type: SectionType
  label: string
  content: string
  sortOrder: number
}

export type SongWithSections = Song & { sections: SongSection[] }

export interface CreateSongInput {
  title: string
  artist?: string
  tags?: string[]
}

export interface UpdateSongInput {
  title?: string
  artist?: string
  tags?: string[]
}

export interface SectionUpsertInput {
  id?: number
  songId: number
  type: SectionType
  label: string
  content: string
  sortOrder: number
}

export interface SongListQuery {
  search?: string
  tags?: string[]
}
