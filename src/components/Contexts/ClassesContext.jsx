import { useContext, createContext, useEffect, useState } from "react";
const UserContext = createContext()

export const Userprovider = ({chil}) => {
    const [user, setuser] = useState([])
    const [loading, setloading] = useState(false)
    useEffect(() => {
        fetch("https://randomuser.me/api/?results=5")
            .then((res) => res.json())
            .then((data) => {
                setuser(data.results)
                setloading(false)
            })
    }, [])
    return (
        <UserContext.Provider>
            value = {{
                loading,
                user
            }}
        </UserContext.Provider>
    )
}
export const useUser = () => useContext(UserContext)