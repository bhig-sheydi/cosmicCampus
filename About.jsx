import React from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../ui/button'
import Graphic from '../../assets/graphics.png'

function Features() {
  return (
    <section className="w-full bg-slate-900 text-white py-20">
      <div className="container mx-auto px-6 lg:px-12">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          {/* Left column: headline + copy + ctas */}
          <div className="max-w-xl">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-700 mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z" />
              </svg>
            </div>

            <h2 className="text-4xl md:text-5xl lg:text-6xl font-heading leading-tight mb-6">
              Explore Our
              <span className="block">Exceptional Academic</span>
              <span className="block">Programs</span>
            </h2>

            <p className="text-slate-300 mb-6">
              At Cosmic Campus, we offer a wide range of academic programs designed to cater to diverse interests
              and learning styles. Our commitment to excellence ensures that every student receives a top-notch
              education that prepares them for future success.
            </p>

            <div className="flex items-center gap-4">
              <Link to="/about">
                <Button variant="default">Learn More</Button>
              </Link>
              <Link to="/signup">
                <Button variant="ghost">Sign Up</Button>
              </Link>
            </div>
          </div>

          {/* Right column: blurred card / image */}
          <div className="flex justify-end">
            <div className="w-full max-w-md h-80 md:h-96 rounded-xl overflow-hidden shadow-lg bg-gradient-to-br from-slate-700/40 to-slate-600/30">
              {/* background image with blur to match the design */}
              <img
                src={Graphic}
                alt="Campus preview"
                className="w-full h-full object-cover filter blur-sm scale-105 brightness-90"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Features
