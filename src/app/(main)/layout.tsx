import StreamVideoProvider from '@/providers/StreamClientProvider'
import React from 'react'

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <main>
      <StreamVideoProvider>
        {children}
      </StreamVideoProvider>
    </main>
  )
}

export default MainLayout
