import { motion } from "framer-motion"

export default function BottomSheet({ children, height = 220 }) {
  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="absolute bottom-0 left-0 right-0 rounded-t-[24px] border border-[var(--border)] bg-[var(--bg-secondary)] px-4 pt-3"
      style={{
        minHeight: height,
        paddingBottom: "max(16px, env(safe-area-inset-bottom))",
        boxShadow: "var(--shadow-soft)",
      }}
    >
      <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--text-tertiary)] opacity-40" />
      {children}
    </motion.div>
  )
}
