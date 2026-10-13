// The player pose changes every frame, so it is kept out of the store and read
// directly by the camera and the minimap.
// yaw 0 faces north (-z); positive yaw turns left (towards west).

export const pose = {
  x: 0,
  z: 0,
  yaw: Math.PI / 2,
  pitch: 0,
}

export function resetPose() {
  pose.x = 0
  pose.z = 0
  pose.yaw = Math.PI / 2
  pose.pitch = 0
}
