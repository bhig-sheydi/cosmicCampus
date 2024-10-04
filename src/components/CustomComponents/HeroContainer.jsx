import React, { useState, useEffect } from 'react'
import Hero from './Hero'
import HeroSkeleton from './Hero.Skeleton'

const HeroContainer = () => {
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
      {isLoading ? <HeroSkeleton /> : <Hero />}
    </>
  )
}

export default HeroContainer
