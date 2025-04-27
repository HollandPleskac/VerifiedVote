
export default function Footer() {
    return (
            <footer className="bg-[#0D132D] text-white pt-12 pb-8 px-8">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12">

                    {/* Left navigation */}
                    <div className="flex gap-16">
                        <ul className="space-y-3 text-sm tracking-widest uppercase">
                            <li><a href="#" className="hover:underline">News</a></li>
                            <li><a href="#" className="hover:underline">Administration</a></li>
                            <li><a href="#" className="hover:underline">Issues</a></li>
                            <li><a href="#" className="hover:underline">Contact</a></li>
                            <li><a href="#" className="hover:underline">EOP</a></li>
                        </ul>
                        <ul className="space-y-3 text-sm tracking-widest uppercase">
                            <li><a href="#" className="hover:underline">Visit</a></li>
                            <li><a href="#" className="hover:underline">Gallery</a></li>
                            <li><a href="#" className="hover:underline">Video Library</a></li>
                            <li><a href="#" className="hover:underline">America 250</a></li>
                            <li><a href="#" className="hover:underline">Founding Fathers</a></li>
                        </ul>
                    </div>

                    {/* Middle Logo */}
                    <div className="hidden md:block">
                        <img src="/whitehouse-logo.png" alt="White House" className="h-32 object-contain" />
                    </div>

                    {/* Right contact */}
                    <div className="flex flex-col items-start space-y-4">
                        <div className="text-xl font-serif uppercase">The White House</div>
                        <div className="text-sm leading-6">
                            1600 Pennsylvania Ave NW<br />
                            Washington, DC 20500
                        </div>
                        <div className="flex gap-4 mt-2">
                            {/* social icons (simple placeholders) */}
                            <a href="#"><img src="/x-icon.svg" alt="X" className="h-6 filter invert" /></a>
                            <a href="#"><img src="/instagram-icon.svg" alt="Instagram" className="h-6 filter invert" /></a>
                            <a href="#"><img src="/facebook-icon.svg" alt="Facebook" className="h-6 filter invert" /></a>
                        </div>
                    </div>

                </div>

                {/* Divider */}
                <div className="border-t border-gray-500 mt-12 pt-6">
                    <div className="max-w-7xl mx-auto flex justify-between items-center text-sm">
                        <div className="flex items-center gap-4">
                            <span className="font-serif text-lg">WH.GOV</span>
                            <a href="#" className="hover:underline">Copyright</a>
                            <a href="#" className="hover:underline">Privacy</a>
                        </div>
                        <a href="#top" className="flex items-center gap-1 hover:underline">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                            Back to top
                        </a>
                    </div>
                </div>
            </footer>
    
    )
}
