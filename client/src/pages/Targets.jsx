import { motion } from "framer-motion";
import TargetEditor from "../components/TargetEditor.jsx";

export default function Targets() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="page-head">
        <div>
          <p className="eyebrow">Raw targets</p>
          <h1>TARGETS</h1>
        </div>
      </div>
      <TargetEditor title="Team targets" showMission />
    </motion.div>
  );
}
