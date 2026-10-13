import { useGame } from '../state/store'

export function Crosshair() {
  const active = useGame((s) => s.nearbyConsoleId !== null)
  return <div className="crosshair" data-active={active} aria-hidden="true" />
}
