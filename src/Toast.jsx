import { useEffect } from 'react'
import './Toast.css'

function Toast({ message, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 1000)

    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className="toast">
      {message}
    </div>
  )
}

export default Toast

