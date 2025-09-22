'use client'
// import Image from "next/image";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 h-20 bg-black/20 backdrop-blur-sm z-20">
        <div className="flex items-center h-full px-8">
          <button 
            onClick={() => router.push('/')}
            className="text-3xl font-bold text-white hover:text-gray-200 transition-colors duration-200 cursor-pointer"
          >
            Rouleat
          </button>
        </div>
      </div>

      {/* Background video */}
      <video 
        autoPlay 
        loop 
        muted 
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src="/Food.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      
      <div className="absolute inset-0 bg-black/40 z-5"></div>
      
      {/* Content */}
      <div className="relative z-10 flex flex-col justify-center h-screen ml-24 pt-20">
        <h1 className="text-6xl font-bold leading-none text-white mb-2 font-sans">
          Trouble deciding <br /> where to eat?
        </h1>
        
        <p className="text-lg md:text-xl lg:text-2xl mb-8 max-w-2xl leading-tight text-gray-300 ml-2">
          Let us help you discover amazing restaurants
          <br />
          with our smart filtering and random selection
        </p>
        
        <button 
          onClick={() => router.push('/restaurant-filter')}
          className="bg-teal-500 hover:bg-teal-600 text-white text-xl md:text-2xl font-bold py-6 px-12 rounded-2xl shadow-2xl transform transition-all duration-300 hover:scale-110 hover:shadow-teal-500/50 w-fit mt-8"
        >
          Start Picking
        </button>
      </div>
    </div>
  );
}