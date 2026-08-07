import { useCallback, useEffect, useRef, useState } from 'react'

const READY_HOLD_MS = 300

function formatTime(ms) {
  return (ms / 1000).toFixed(2)
}

export default function Timer() {
  const [status, setStatus] = useState('idle') // idle | holding | ready | running
  const [elapsed, setElapsed] = useState(0)
  const holdTimeoutRef = useRef(null)
  const startRef = useRef(0)
  const rafRef = useRef(null)

  const tick = useCallback(() => {
    setElapsed(performance.now() - startRef.current)
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code !== 'Space' || e.repeat) return
      e.preventDefault()

      if (status === 'running') {
        cancelAnimationFrame(rafRef.current)
        setElapsed(performance.now() - startRef.current)
        setStatus('idle')
        return
      }

      if (status === 'idle') {
        setStatus('holding')
        holdTimeoutRef.current = setTimeout(() => setStatus('ready'), READY_HOLD_MS)
      }
    }

    const handleKeyUp = (e) => {
      if (e.code !== 'Space') return
      e.preventDefault()

      if (status === 'ready') {
        startRef.current = performance.now()
        setElapsed(0)
        setStatus('running')
        rafRef.current = requestAnimationFrame(tick)
      } else if (status === 'holding') {
        clearTimeout(holdTimeoutRef.current)
        setStatus('idle')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      clearTimeout(holdTimeoutRef.current)
      cancelAnimationFrame(rafRef.current)
    }
  }, [status, tick])

  const color =
    status === 'ready' ? 'text-green-400' : status === 'holding' ? 'text-red-500' : 'text-neutral-100'

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <span className={`font-mono text-7xl tabular-nums ${color}`}>{formatTime(elapsed)}</span>
      <span className="text-sm text-neutral-500">
        {status === 'running' ? 'press space to stop' : 'hold space to start'}
      </span>
    </div>
  )
}
