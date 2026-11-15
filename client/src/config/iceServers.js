// Add TURN servers here for reliable connectivity across restrictive networks.
// Keep production TURN credentials out of public source control.
export const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' }
];
