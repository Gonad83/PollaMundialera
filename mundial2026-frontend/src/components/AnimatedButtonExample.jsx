import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export default function AnimatedButtonExample() {
  return (
    <div className="flex flex-col gap-8 p-8">
      {/* Botón con animación fade-in */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Button
          className="bg-mundial-gold text-mundial-navy hover:bg-mundial-red transition-all duration-300"
        >
          Haz tu Pronóstico
        </Button>
      </motion.div>

      {/* Botón con hover effect */}
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button
          variant="outline"
          className="border-mundial-gold text-mundial-gold hover:bg-mundial-gold/10"
        >
          Ver Resultados
        </Button>
      </motion.div>

      {/* Botón con animación de entrada escalonada */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Button
          variant="secondary"
          className="bg-mundial-red text-white hover:bg-mundial-navy"
        >
          Comenzar Ahora
        </Button>
      </motion.div>

      {/* Grupo de botones animados */}
      <div className="flex gap-4">
        {['Grupos', 'Equipos', 'Predicciones'].map((text, i) => (
          <motion.div
            key={text}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
          >
            <Button
              variant="ghost"
              className="text-mundial-gold hover:bg-mundial-navy/20"
            >
              {text}
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
