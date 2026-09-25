import { useUser } from './UserContext'
import { JSX } from 'react'
import { API_URL } from '../services/apiClient'

export function ProfileManager({ onOpen }: { onOpen: () => void }): JSX.Element {
  const { profilePicture } = useUser()

  const currentImg = profilePicture
    ? `${API_URL}/${profilePicture}`
    : `${API_URL}/uploads/profiles/default.png`

  return (
    <img
      title="Edit profile"
      src={currentImg}
      alt="Profile"
      className="w-20 h-20 rounded-full cursor-pointer object-cover border-2 border-lilas transition-transform duration-200 hover:scale-[1.1]"
      onClick={onOpen}
    />
  )
}
