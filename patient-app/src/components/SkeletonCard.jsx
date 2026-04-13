export default function SkeletonCard({ lines = 3, height = 80 }) {
  return (
    <div
      className="mb-3 rounded-2xl p-5"
      style={{ background: "#1A1A24", minHeight: height }}
    >
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="mr-skeleton mb-2.5 rounded-full"
          style={{
            height: 14,
            width: i === 0 ? "60%" : "85%",
          }}
        />
      ))}
    </div>
  )
}
