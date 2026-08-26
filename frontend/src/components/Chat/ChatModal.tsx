import { Chat } from './Chat'
import { Modal } from '../Common/Modal'
import { useUiStore } from '../../store/uiStore'

export function ChatModal() {
  const open = useUiStore((state) => state.chatOpen)
  const setChatOpen = useUiStore((state) => state.setChatOpen)

  if (!open) return null

  return (
    <Modal title="Сообщество" size="xl" className="chat-modal" onClose={() => setChatOpen(false)}>
      <Chat embedded />
    </Modal>
  )
}
