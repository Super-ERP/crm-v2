"use client"
import { createContext, useContext } from 'react'
const BusinessTimezoneContext=createContext('UTC')
const TablePreferenceIdentityContext=createContext('anonymous')
export function BusinessTimezoneProvider({timezone,identity,children}:{timezone:string;identity:string;children:React.ReactNode}) {
 return <BusinessTimezoneContext value={timezone}><TablePreferenceIdentityContext value={identity}>{children}</TablePreferenceIdentityContext></BusinessTimezoneContext>
}
export function useBusinessTimezone(){return useContext(BusinessTimezoneContext)}

export function useTablePreferenceIdentity(){return useContext(TablePreferenceIdentityContext)}
