"use client"
import { createContext, useContext } from 'react'
const BusinessTimezoneContext=createContext('UTC')
export function BusinessTimezoneProvider({timezone,children}:{timezone:string;children:React.ReactNode}) {
 return <BusinessTimezoneContext value={timezone}>{children}</BusinessTimezoneContext>
}
export function useBusinessTimezone(){return useContext(BusinessTimezoneContext)}
