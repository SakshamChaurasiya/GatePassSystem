import { motion } from 'framer-motion';

export default function StatCard({ icon: Icon, label, value, color = 'blue', onClick }) {
  return (
    <motion.div
      className="stat-card"
      onClick={onClick}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
    >
      <div className={`stat-icon ${color}`}>
        <Icon size={22} />
      </div>
      <div className="stat-value">{value ?? '—'}</div>
      <div className="stat-label">{label}</div>
    </motion.div>
  );
}
