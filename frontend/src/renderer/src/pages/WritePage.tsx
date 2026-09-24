import { JSX } from 'react'
import { useNavigate } from 'react-router-dom'
import { ViewLayout } from '../components/layout/ViewLayout'
import { WriteView } from '../components/WriteView'

export function WritePage(): JSX.Element {
  const navigate = useNavigate()
  return <ViewLayout variant="single" main={<WriteView onBack={() => navigate('/dashboard')} />} />
}
