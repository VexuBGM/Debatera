import StreamVideoProvider from '@/providers/StreamClientProvider'
import TopNav from '@/components/Navbar'
import React from 'react'

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <main>
      <StreamVideoProvider>
        <TopNav />
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
