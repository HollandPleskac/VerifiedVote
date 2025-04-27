// components/Header.tsx
'use client'
import Image from 'next/image'

export default function Header() {
    return (
        <header className="bg-[#0D132D] text-white border-b border-gray-600 h-24 flex items-center justify-between px-8">
            {/* Left - Hamburger and Text */}
            <div className="flex items-center gap-4">
                <button className="text-3xl font-bold">☰</button>
                <p className="uppercase text-sm tracking-widest font-semibold">United States Elections</p>
            </div>

            {/* Center - White House Text */}
            <div className="flex items-center justify-center gap-2">
                <em className="text-xl italic">The</em>
                <span className="text-4xl font-bold">WHITE HOUSE</span>
            </div>

            {/* Right - Search and Logo */}
            <div className="flex items-center gap-6">
                <button className="text-2xl">🔍</button>
                <Image
                    src="/whitehouse-logo.png"
                    alt="White House Logo"
                    width={60}
                    height={60}
                    className="object-contain"
                />
            </div>
        </header>
    )
}
