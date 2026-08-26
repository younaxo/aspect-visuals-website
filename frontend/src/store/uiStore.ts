import { create } from 'zustand'

interface UiState {
  chatOpen: boolean
  forgotOpen: boolean
  setChatOpen: (open: boolean) => void
  setForgotOpen: (open: boolean) => void
}

export const useUiStore = create<UiState>((set) => ({
  chatOpen: false,
  forgotOpen: false,
  setChatOpen: (chatOpen) => set({ chatOpen }),
  setForgotOpen: (forgotOpen) => set({ forgotOpen }),
}))
