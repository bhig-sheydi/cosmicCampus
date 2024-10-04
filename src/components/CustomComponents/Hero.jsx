import React from 'react'
import H1 from '../Typography/H1'
import { Button } from '../ui/button'
import H4 from '../Typography/H4'
import Logo from "../../assets/cosmic.png"
import { Link } from 'react-router-dom'

const Hero = () => {
  return (
    <div className='w-full flex items-center justify-center shadow-md h-[87vh] relative mt-24 dark:bg-black'>
      <div className='flex flex-col items-center justify-center gap-7'>
        <div className="relative">
          {/* Rotating Logo */}
          <img src={Logo} className='w-32 rounded-full animate-rotate-3d relative z-10' alt="Logo" />

          {/* Moving Shadow */}
          <div className="w-32 h-8 absolute top-full left-1/2 transform -translate-x-1/2 -translate-y-2 rounded-full bg-black/30 dark:bg-purple-500/50 blur-md opacity-75 animate-shadow-rotate"></div>
        </div>
        <H1 className="text-transparent text-center bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 dark:from-blue-500 dark:via-purple-500 dark:to-pink-500 animate-gradient-move">
          Welcome To Cosmic Campus
        </H1>
        <div className='w-full flex flex-col justify-center items-center gap-7'>
          <H4 className='text-center'>Join Our Cosmic Journey</H4>
         <Link to={"/signup"}><Button className="bg-black bg-gradient-to-l dark:from-blue-500 dark:via-purple-500 dark:to-pink-500 animate-gradient-move">Get Started</Button></Link> 
        </div>
      </div>
    </div>
  )
}

export default Hero
