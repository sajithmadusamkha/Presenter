/// <reference types="vite/client" />

import type { SlidePayload } from '../../../shared/ipc-channels'

declare global {
  interface Window {
    presenterOutput: {
      onSlideUpdate: (callback: (payload: SlidePayload) => void) => () => void
      onBlank: (callback: () => void) => () => void
      onClear: (callback: () => void) => () => void
    }
  }
}
