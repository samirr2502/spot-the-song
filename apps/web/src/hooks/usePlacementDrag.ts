import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

export type PlacementDragSource = 'hero' | 'timeline'
export type DropZone = 'timeline' | 'deck' | 'discard'

function pointInElement(
  clientX: number,
  clientY: number,
  element: Element | null,
  padding = 12,
): boolean {
  if (!element) return false
  const rect = element.getBoundingClientRect()
  return (
    clientX >= rect.left - padding &&
    clientX <= rect.right + padding &&
    clientY >= rect.top - padding &&
    clientY <= rect.bottom + padding
  )
}

function findInsertIndex(clientX: number, clientY: number): number | null {
  const row = document.querySelector('.timeline-row--interactive')
  if (!row) return null

  const rowRect = row.getBoundingClientRect()
  if (
    clientY < rowRect.top - 24 ||
    clientY > rowRect.bottom + 24 ||
    clientX < rowRect.left - 24 ||
    clientX > rowRect.right + 24
  ) {
    return null
  }

  const slots = Array.from(
    document.querySelectorAll<HTMLElement>('.timeline-row--interactive [data-insert-index]'),
  )

  for (const slot of slots) {
    const rect = slot.getBoundingClientRect()
    if (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    ) {
      const index = Number(slot.dataset.insertIndex)
      return Number.isFinite(index) ? index : null
    }
  }

  let nearest: { index: number; distance: number } | null = null
  for (const slot of slots) {
    const rect = slot.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const distance = Math.abs(clientX - centerX)
    const index = Number(slot.dataset.insertIndex)
    if (!Number.isFinite(index)) continue
    if (!nearest || distance < nearest.distance) {
      nearest = { index, distance }
    }
  }

  return nearest && nearest.distance < 96 ? nearest.index : null
}

function findDropZone(clientX: number, clientY: number): DropZone | null {
  const timelineZone = document.querySelector('[data-drop-zone="timeline"]')
  if (pointInElement(clientX, clientY, timelineZone, 8) || findInsertIndex(clientX, clientY) !== null) {
    return 'timeline'
  }

  const deckZone = document.querySelector('[data-drop-zone="deck"]')
  if (pointInElement(clientX, clientY, deckZone, 8)) {
    return 'deck'
  }

  const discardZone = document.querySelector('[data-drop-zone="discard"]')
  if (pointInElement(clientX, clientY, discardZone, 8)) {
    return 'discard'
  }

  const activeZone = document.querySelector('[data-drop-zone="active"]')
  if (pointInElement(clientX, clientY, activeZone, 8)) {
    return 'deck'
  }

  return null
}

export function usePlacementDrag(onDrop: (insertIndex: number) => void) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragSource, setDragSource] = useState<PlacementDragSource | null>(null)
  const [pointer, setPointer] = useState({ x: 0, y: 0 })
  const [hoverInsertIndex, setHoverInsertIndex] = useState<number | null>(null)
  const [hoverDropZone, setHoverDropZone] = useState<DropZone | null>(null)
  const dragStartIndexRef = useRef<number | null>(null)

  const startDrag = useCallback(
    (source: PlacementDragSource, event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return
      event.preventDefault()
      setDragSource(source)
      setIsDragging(true)
      setPointer({ x: event.clientX, y: event.clientY })
      setHoverInsertIndex(null)
      setHoverDropZone(null)
      dragStartIndexRef.current =
        source === 'timeline'
          ? Number(
              (event.currentTarget.closest('[data-insert-index]') as HTMLElement | null)?.dataset
                .insertIndex,
            )
          : null
      if (Number.isNaN(dragStartIndexRef.current)) {
        dragStartIndexRef.current = null
      }
    },
    [],
  )

  const startHeroDrag = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => startDrag('hero', event),
    [startDrag],
  )

  const startTimelineDrag = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => startDrag('timeline', event),
    [startDrag],
  )

  useEffect(() => {
    if (!isDragging) return

    function handleMove(event: PointerEvent) {
      setPointer({ x: event.clientX, y: event.clientY })
      setHoverInsertIndex(findInsertIndex(event.clientX, event.clientY))
      setHoverDropZone(findDropZone(event.clientX, event.clientY))
    }

    function handleUp(event: PointerEvent) {
      const insertIndex = findInsertIndex(event.clientX, event.clientY)
      if (insertIndex !== null) {
        onDrop(insertIndex)
      } else if (dragSource === 'timeline' && dragStartIndexRef.current !== null) {
        onDrop(dragStartIndexRef.current)
      }
      setIsDragging(false)
      setDragSource(null)
      setHoverInsertIndex(null)
      setHoverDropZone(null)
      dragStartIndexRef.current = null
    }

    function handleCancel() {
      if (dragSource === 'timeline' && dragStartIndexRef.current !== null) {
        onDrop(dragStartIndexRef.current)
      }
      setIsDragging(false)
      setDragSource(null)
      setHoverInsertIndex(null)
      setHoverDropZone(null)
      dragStartIndexRef.current = null
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleCancel)

    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleCancel)
    }
  }, [dragSource, isDragging, onDrop])

  return {
    isDragging,
    dragSource,
    pointer,
    hoverInsertIndex,
    hoverDropZone,
    startHeroDrag,
    startTimelineDrag,
  }
}
