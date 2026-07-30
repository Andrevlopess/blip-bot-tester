export interface PauseController {
  pause(): void
  resume(): void
  waitIfPaused(): Promise<void>
}

export function createPauseController(): PauseController {
  let paused = false
  let pendingResolve: (() => void) | null = null
  let pendingPromise: Promise<void> | null = null

  return {
    pause() {
      if (paused) return
      paused = true
      pendingPromise = new Promise((resolve) => {
        pendingResolve = resolve
      })
    },

    resume() {
      paused = false
      pendingResolve?.()
      pendingResolve = null
      pendingPromise = null
    },

    async waitIfPaused() {
      if (!paused || !pendingPromise) return
      await pendingPromise
    },
  }
}
