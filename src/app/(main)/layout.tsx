import StreamVideoProvider from '@/providers/StreamClientProvider'
import React from 'react'

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <main>
      <StreamVideoProvider>
        <section className='flex min-h-screen flex-1 flex-col'>
          <div className='w-full'>
            {children}
          </div>
        </section>
      </StreamVideoProvider>
    </main>
  )
}

export default MainLayout
