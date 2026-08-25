import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'ghost' | 'logout'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  children: ReactNode
}

const variantClass: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  ghost: 'btn-ghost',
  logout: 'logout-btn',
}

export function Button({ variant = 'primary', className = '', children, type = 'button', ...props }: ButtonProps) {
  return (
    <button type={type} className={`${variantClass[variant]} ${className}`.trim()} {...props}>
      {children}
    </button>
  )
}
