export function SceneCardSkeleton() {
  return (
    <div className="scene-card skeleton-card" aria-hidden="true">
      <div className="skeleton-preview skeleton-pulse" />
      <div className="skeleton-info">
        <div className="skeleton-title skeleton-pulse" />
        <div className="skeleton-meta skeleton-pulse" />
      </div>
    </div>
  )
}

export function SceneCardSkeletonGrid() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <SceneCardSkeleton key={i} />
      ))}
    </>
  )
}
