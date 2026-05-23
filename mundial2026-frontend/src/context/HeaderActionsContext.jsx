import { createContext, useContext, useState } from 'react'

const HeaderActionsContext = createContext({ actions: [], setActions: () => {} })

export function HeaderActionsProvider({ children }) {
  const [actions, setActions] = useState([])
  return (
    <HeaderActionsContext.Provider value={{ actions, setActions }}>
      {children}
    </HeaderActionsContext.Provider>
  )
}

export const useHeaderActions = () => useContext(HeaderActionsContext)
