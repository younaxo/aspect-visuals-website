import { Link, useNavigate } from 'react-router-dom'
import { ForgotPasswordModal } from './ForgotPasswordModal'

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  return (
    <div className="auth-gate">
      <ForgotPasswordModal onClose={() => navigate('/login')} />
      <Link to="/login" className="auth-forgot" style={{ position: 'relative', zIndex: 90 }}>
        Назад ко входу
      </Link>
    </div>
  )
}
