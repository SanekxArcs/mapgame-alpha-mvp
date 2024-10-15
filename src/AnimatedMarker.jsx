import { motion } from "framer-motion";

const AnimatedMarker = ({ position, isWalking }) => {
  return (
    <motion.div
      style={{
        position: "absolute",
        width: "30px",
        height: "30px",
        borderRadius: "50%",
        backgroundImage: `url(${
          isWalking ? personIconWalking : personIconStanding
        })`,
        backgroundSize: "cover",
      }}
      initial={{ x: position[0], y: position[1] }}
      animate={{ x: position[0], y: position[1] }}
      transition={{ duration: 1.5 }} // Плавний перехід з тривалістю 1.5 секунди
    />
  );
};
