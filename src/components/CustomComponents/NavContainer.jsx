import React, { useState, useEffect } from 'react'
import Hero from './Hero'
import HeroSkeleton from './Hero.Skeleton'
import { NavbarSkeleton } from './NavbarSkeleton'
import { Navbar } from '../NavBar'

const NavContainer = () => {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate a loading delay (e.g., fetching data or images)
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 2000) // Adjust the delay as needed

    return () => clearTimeout(timer)
  }, [])

  return (
    <>
      {isLoading ? <NavbarSkeleton /> : 
        <Navbar
          brandName="Walking Universe Enterprise" 
          additionalClassNames="bg-blue-700 dark:bg-gray-900"
          links={[
            { name: 'Home', path: '/' },
            { name: 'About', path: '/about' },
            { name: 'Services', path: '/services' },
            { name: 'Contact', path: '/contact' }
          ]}
        />}
    </>
  )
}

export default NavContainer
