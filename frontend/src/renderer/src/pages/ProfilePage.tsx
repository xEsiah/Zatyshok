import { JSX } from 'react'
import { useNavigate } from 'react-router-dom'
import { ViewLayout } from '../components/layout/ViewLayout'
import { ProfileView } from '../components/ProfileView'

export function ProfilePage(): JSX.Element {
  const navigate = useNavigate()
  return (
    <ViewLayout variant="single" main={<ProfileView onBack={() => navigate('/dashboard')} />} />
  )
}
