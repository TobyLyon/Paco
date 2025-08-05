import React from 'react'
import { motion } from 'framer-motion'

export default function LoadingScreen({ message = "Loading..." }) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-paco-yellow">
      <div className="text-center">
        {/* Animated Chicken */}
        <motion.div
          animate={{ 
            y: [-20, 0, -20],
            rotate: [-5, 5, -5] 
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
          className="w-32 h-32 mx-auto mb-8 relative"
        >
          {/* Placeholder for PACO sprite - will be replaced with actual asset */}
          <div className="w-full h-full bg-paco-yellow rounded-full flex items-center justify-center text-6xl">
            🐔
          </div>
          
          {/* Floating particles */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              animate={{
                y: [-10, -30, -10],
                x: [0, Math.sin(i) * 20, 0],
                opacity: [0, 1, 0]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.3,
                ease: "easeInOut"
              }}
              className="absolute w-2 h-2 bg-paco-orange rounded-full"
              style={{
                top: `${20 + i * 10}%`,
                left: `${40 + i * 5}%`
              }}
            />
          ))}
        </motion.div>

        {/* Loading Text */}
        <motion.h2
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-2xl font-bold text-white mb-4"
        >
          {message}
        </motion.h2>

        {/* Progress Bar */}
        <div className="w-64 h-2 bg-gray-700 rounded-full mx-auto mb-6 overflow-hidden">
          <motion.div
            animate={{ x: [-256, 256] }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="h-full w-16 bg-gradient-to-r from-transparent via-paco-yellow to-transparent"
          />
        </div>

        {/* Flavor Text */}
        <motion.p
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
          className="text-paco-yellow text-sm"
        >
          Feeding the chickens... 🌽
        </motion.p>

        {/* Loading Dots */}
        <div className="flex justify-center space-x-2 mt-4">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              animate={{ 
                scale: [1, 1.5, 1],
                opacity: [0.3, 1, 0.3] 
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2
              }}
              className="w-2 h-2 bg-paco-orange rounded-full"
            />
          ))}
        </div>
      </div>
    </div>
  )
}