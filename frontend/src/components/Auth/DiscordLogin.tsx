import { Button } from '../Common/Button'
import { useDiscord } from '../../hooks/useDiscord'

interface DiscordLoginProps {
  label?: string
}

export function DiscordLogin({ label = 'Войти через Discord' }: DiscordLoginProps) {
  const { login } = useDiscord()

  return (
    <Button variant="primary" onClick={login} className="w-full min-w-0">
      {label}
    </Button>
  )
}
