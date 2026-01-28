import React from 'react'

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <main>
      <section className='flex min-h-screen flex-1 flex-col'>
        <div className='w-full'>
          {children}
        </div>
      </section>
    </main>
  )
}

export default MainLayout
