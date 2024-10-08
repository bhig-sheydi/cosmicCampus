import { CircleUser } from 'lucide-react'
import React from 'react'
import { Button } from '../ui/button'
import { useUser } from '../Contexts/userContext'
import Logo from "../../assets/cosmic.png";
import {PlusCircle} from "lucide-react"
const Profile = () => {

    const { setShowNav, roles, userData } = useUser();
  return (
    <div>
        <div className="flex-1 rounded-lg  p-3 text-center bg-white dark:bg-black">
            
           <div className='w-full h-[300px] overflow-hidden bg-black '> 
                <img src={Logo} className='w-full h-[600px] opacity-80' />
            </div> 
            <div className=' w-full top-80 rounded-full text-muted-foreground absolute '>
              <CircleUser className="h-48 w-48" />
              </div>
            <div className=" flex max-w-[58rem] flex-col  mt-6">
              <h2 className="mt-6 text-xl font-semibold text-gray-800 dark:text-white">
                {userData?.name || "User Name"}
              </h2>
              <p className="mt-2 mb-6 text-muted-foreground">
                {userData?.email || "user@example.com"}
              </p>
              <Button
                size="sm"
                className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
              >
                Edit Profile 
              </Button>
            </div>
          </div>

          <div>
  {userData?.role_id == 1 ? (
    <div className="flex items-center justify-center w-full mt-8">
      <div className="flex flex-col items-center justify-center w-full gap-2">
        <PlusCircle />
        <Button
          size="sm"
          className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
        >
          <h3 className="text-white text-center">Create School</h3>
        </Button>
      </div>
    </div>
  ) : (
    <div className="flex items-center justify-center w-full">
      <div className="flex flex-col items-center justify-center w-full gap-2">
        <PlusCircle />
        <Button
          size="sm"
          className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
        >
          <h3 className="text-white text-center">Join School</h3>
        </Button>
      </div>
    </div>
  )}
</div>
          </div>
    
  )
}

export default Profile