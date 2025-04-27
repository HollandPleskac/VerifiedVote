'use client'

import { useState, useEffect } from 'react'
import Header from '@/app/_components/Header'
import Footer from '@/app/_components/Footer'

export default function Home() {
    return (
      <div className="flex flex-col min-h-screen bg-[#0D132D] text-white">
        <Header />
  
        <main className="flex-1 flex flex-col items-center justify-center min-h-[calc(100vh-96px)] px-4 py-12">


          <h1 className="text-sm tracking-widest mb-6 text-gray-400 uppercase">
            United States Election Portal
          </h1>
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg">
            Connect Wallet
          </button>
        </main>
  
        <Footer />
      </div>
    )
  }