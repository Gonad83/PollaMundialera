import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'

/**
 * AnimationWrapper - Componente reutilizable para animar elementos al scroll
 * Soporta múltiples tipos de animación
 */
export function AnimationWrapper({
  children,
  type = 'fadeUp',
  delay = 0,
  duration = 0.6,
  className = '',
  ...props
}) {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
  })

  const variants = {
    fadeUp: {
      hidden: { opacity: 0, y: 30 },
      visible: { opacity: 1, y: 0 }
    },
    fadeIn: {
      hidden: { opacity: 0 },
      visible: { opacity: 1 }
    },
    slideLeft: {
      hidden: { opacity: 0, x: -40 },
      visible: { opacity: 1, x: 0 }
    },
    slideRight: {
      hidden: { opacity: 0, x: 40 },
      visible: { opacity: 1, x: 0 }
    },
    scaleIn: {
      hidden: { opacity: 0, scale: 0.9 },
      visible: { opacity: 1, scale: 1 }
    },
    bounce: {
      hidden: { opacity: 0, y: 40 },
      visible: {
        opacity: 1,
        y: 0,
        transition: {
          type: 'spring',
          stiffness: 100,
          damping: 12
        }
      }
    }
  }

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={variants[type]}
      transition={{
        duration: duration,
        delay: delay,
        ease: 'easeOut'
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

/**
 * HoverScale - Componente para efecto de hover mejorado
 */
export function HoverScale({ children, scale = 1.05, className = '', ...props }) {
  return (
    <motion.div
      whileHover={{ scale }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300 }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

/**
 * StaggerContainer - Contenedor para animar elementos con delay escalonado
 */
export function StaggerContainer({ children, delay = 0.05, ...props }) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: delay
      }
    }
  }

  const childVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: 'easeOut' }
    }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      {...props}
    >
      {Array.isArray(children)
        ? children.map((child, i) => (
            <motion.div key={i} variants={childVariants}>
              {child}
            </motion.div>
          ))
        : children}
    </motion.div>
  )
}

/**
 * FloatingElement - Elemento que flota continuamente
 */
export function FloatingElement({ children, duration = 3, className = '', ...props }) {
  return (
    <motion.div
      animate={{ y: [0, -10, 0] }}
      transition={{
        duration,
        repeat: Infinity,
        ease: 'easeInOut'
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

/**
 * PulseElement - Elemento con efecto de destello
 */
export function PulseElement({ children, className = '', ...props }) {
  return (
    <motion.div
      animate={{ opacity: [1, 0.7, 1] }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut'
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

/**
 * GlowEffect - Elemento con efecto de brillo
 */
export function GlowEffect({ children, color = 'gold', className = '', ...props }) {
  const glowColors = {
    gold: 'rgba(255, 215, 0, 0.5)',
    red: 'rgba(227, 27, 35, 0.5)',
    blue: 'rgba(26, 54, 93, 0.5)'
  }

  return (
    <motion.div
      animate={{
        boxShadow: [
          `0 0 20px ${glowColors[color]}`,
          `0 0 40px ${glowColors[color]}`,
          `0 0 20px ${glowColors[color]}`
        ]
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut'
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

/**
 * CountUp - Contador animado
 */
export function CountUp({ target = 100, duration = 2, className = '', ...props }) {
  return (
    <motion.div
      className={className}
      {...props}
    >
      <motion.span
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration }}
        onAnimationComplete={() => {}}
      >
        {target}
      </motion.span>
    </motion.div>
  )
}

export default AnimationWrapper
