import { useEffect, useRef } from 'react'
import { usePlayableFrameSrc } from '../lib/usePlayableFrameSrc'

type Props = {
  title: string
  src: string
}

/** Preview iframe that speaks the Gamescroll host bridge so GS.paused unlocks. */
export function CreatorPreview({ title, src }: Props) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const frameSrc = usePlayableFrameSrc(src, true)

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow) return
      const type = event.data?.type
      if (type === 'gamescroll:ready') {
        frameRef.current?.contentWindow?.postMessage(
          { type: 'gamescroll:start', onFail: 'replay' },
          '*',
        )
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [frameSrc])

  if (!frameSrc) {
    return <div className="create-preview-empty">Loading preview…</div>
  }

  return (
    <iframe
      ref={frameRef}
      key={frameSrc}
      title={title}
      src={frameSrc}
      sandbox="allow-scripts"
      className="create-preview"
    />
  )
}
