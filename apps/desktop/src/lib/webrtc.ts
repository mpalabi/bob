import Peer from 'simple-peer'

export function createPeer(opts: { initiator: boolean; stream?: MediaStream; trickle?: boolean }) {
  return new Peer({
    initiator: opts.initiator,
    stream: opts.stream,
    trickle: opts.trickle ?? true,
    config: {
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    }
  })
}
