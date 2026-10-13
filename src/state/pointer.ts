// Pointer lock lives on the WebGL canvas, but it is requested from DOM UI and
// from the store, so the element is registered here once the canvas mounts.

let canvas: HTMLCanvasElement | null = null

export function setCanvas(el: HTMLCanvasElement) {
  canvas = el
}

export function isLocked() {
  return canvas !== null && document.pointerLockElement === canvas
}

export function requestLock() {
  if (!canvas || isLocked()) return
  try {
    // Browsers refuse the lock without a recent gesture, or for about a second
    // after Esc. The game stays playable with keyboard look, so ignore it.
    const result = canvas.requestPointerLock() as unknown
    if (result instanceof Promise) result.catch(() => {})
  } catch {
    // ignored, see above
  }
}

export function releaseLock() {
  if (isLocked()) document.exitPointerLock()
}
