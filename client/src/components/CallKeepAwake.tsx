import { useCallContext } from '../contexts/CallContext'
import { useGroupCallContext } from '../contexts/GroupCallContext'
import { useKeepAwake } from '../hooks/useKeepAwake'

/** Coordinates browser screen wake state across direct and group calls. */
export default function CallKeepAwake() {
  const { callState } = useCallContext()
  const { status: groupCallStatus } = useGroupCallContext()
  const isCallActive = (callState !== 'idle' && callState !== 'error') || groupCallStatus !== 'idle'

  useKeepAwake(isCallActive)
  return null
}
