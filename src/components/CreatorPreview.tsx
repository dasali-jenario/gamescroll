import { useEffect, useRef } from 'react'

type Props = {
  title: string
  src: string
}

/** Preview iframe that speaks the Gamescroll host bridge so GS.paused unlocks. */
export function CreatorPreview({ title, src }: Props) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const readyRef = useRef(false)

  useEffect(() => {
    readyRef.current = false
  }, [src])

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow) return
      const type = event.data?.type
      if (type === 'gamescroll:ready') {
        readyRef.current = true
        frameRef.current?.contentWindow?.postMessage(
          { type: 'gamescroll:start', onFail: 'replay' },
          '*',
        )
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  return (
    <iframe
      ref={frameRef}
      title={title}
      src={src}
      sandbox="allow-scripts"
      className="create-preview"
    />
  )
}
