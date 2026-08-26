/* eslint-disable prettier/prettier */
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
      className="profile-img-nav"
      onClick={onOpen}
      style={{
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        cursor: 'pointer',
        border: '2px solid var(--color-lilas-vif)',
        objectFit: 'cover'
      }}
    />
  )
}
