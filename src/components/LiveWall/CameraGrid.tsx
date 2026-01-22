import { ReactNode } from 'react'

interface CameraGridProps {
  children: ReactNode
}

export const CameraGrid = ({ children }: CameraGridProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {children}
    </div>
  )
}
