import { motion, AnimatePresence, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * Componentes de Transição e Animação
 * 
 * Page transitions, modals, e animações de entrada/saída
 */

// ============================================
// PAGE TRANSITION
// ============================================

interface PageTransitionProps {
    children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
            {children}
        </motion.div>
    );
}

// ============================================
// FADE IN
// ============================================

interface FadeInProps {
    children: ReactNode;
    delay?: number;
    duration?: number;
}

export function FadeIn({ children, delay = 0, duration = 0.5 }: FadeInProps) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration, delay }}
        >
            {children}
        </motion.div>
    );
}

// ============================================
// SLIDE IN
// ============================================

interface SlideInProps {
    children: ReactNode;
    direction?: 'left' | 'right' | 'up' | 'down';
    delay?: number;
}

export function SlideIn({ children, direction = 'up', delay = 0 }: SlideInProps) {
    const directions = {
        left: { x: -50, y: 0 },
        right: { x: 50, y: 0 },
        up: { x: 0, y: 50 },
        down: { x: 0, y: -50 },
    };

    return (
        <motion.div
            initial={{ opacity: 0, ...directions[direction] }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, ...directions[direction] }}
            transition={{ duration: 0.4, delay }}
        >
            {children}
        </motion.div>
    );
}

// ============================================
// SCALE IN
// ============================================

interface ScaleInProps {
    children: ReactNode;
    delay?: number;
}

export function ScaleIn({ children, delay = 0 }: ScaleInProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3, delay }}
        >
            {children}
        </motion.div>
    );
}

// ============================================
// STAGGER CHILDREN
// ============================================

interface StaggerChildrenProps {
    children: ReactNode;
}

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
        },
    },
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

export function StaggerChildren({ children }: StaggerChildrenProps) {
    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {children}
        </motion.div>
    );
}

export function StaggerItem({ children }: { children: ReactNode }) {
    return (
        <motion.div variants={itemVariants}>
            {children}
        </motion.div>
    );
}

// ============================================
// MODAL TRANSITION
// ============================================

interface ModalTransitionProps {
    isOpen: boolean;
    children: ReactNode;
}

export function ModalTransition({ isOpen, children }: ModalTransitionProps) {
    return (
        <AnimatePresence mode="wait">
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 flex items-center justify-center z-50 p-4"
                    >
                        {children}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// ============================================
// HOVER CARD
// ============================================

interface HoverCardProps {
    children: ReactNode;
    className?: string;
}

export function HoverCard({ children, className = '' }: HoverCardProps) {
    return (
        <motion.div
            whileHover={{
                y: -8,
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
            }}
            transition={{ duration: 0.2 }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

// ============================================
// PULSE
// ============================================

interface PulseProps {
    children: ReactNode;
    scale?: number;
}

export function Pulse({ children, scale = 1.05 }: PulseProps) {
    return (
        <motion.div
            animate={{
                scale: [1, scale, 1],
            }}
            transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
            }}
        >
            {children}
        </motion.div>
    );
}

// ============================================
// BOUNCE
// ============================================

interface BounceProps {
    children: ReactNode;
}

export function Bounce({ children }: BounceProps) {
    return (
        <motion.div
            animate={{
                y: [0, -10, 0],
            }}
            transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
            }}
        >
            {children}
        </motion.div>
    );
}

// ============================================
// ROTATE
// ============================================

interface RotateProps {
    children: ReactNode;
    duration?: number;
}

export function Rotate({ children, duration = 2 }: RotateProps) {
    return (
        <motion.div
            animate={{ rotate: 360 }}
            transition={{
                duration,
                repeat: Infinity,
                ease: 'linear',
            }}
        >
            {children}
        </motion.div>
    );
}

// ============================================
// SHAKE
// ============================================

interface ShakeProps {
    children: ReactNode;
    trigger?: boolean;
}

export function Shake({ children, trigger = false }: ShakeProps) {
    return (
        <motion.div
            animate={trigger ? {
                x: [0, -10, 10, -10, 10, 0],
            } : {}}
            transition={{ duration: 0.5 }}
        >
            {children}
        </motion.div>
    );
}

// ============================================
// REVEAL ON SCROLL
// ============================================

interface RevealOnScrollProps {
    children: ReactNode;
}

export function RevealOnScroll({ children }: RevealOnScrollProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
        >
            {children}
        </motion.div>
    );
}
