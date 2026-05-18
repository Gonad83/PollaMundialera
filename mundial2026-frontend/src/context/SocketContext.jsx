import { createContext, useContext, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'

const SocketContext = createContext(null)

export const SocketProvider = ({ children }) => {
  const { user } = useAuth()
  const socketRef = useRef(null)

  useEffect(() => {
    if (!user) return

    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
    socketRef.current = io(backendUrl, { transports: ['websocket'] })

    socketRef.current.on('connect', () => {
      // Unirse al ranking global
      socketRef.current.emit('join:leaderboard', null)
    })

    return () => {
      socketRef.current?.disconnect()
    }
  }, [user])

  return (
    <SocketContext.Provider value={socketRef}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => useContext(SocketContext)
