interface LogoProps {
  className?: string
}

export function Logo({ className = 'h-7 w-7' }: LogoProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" className={className} fill="none" aria-hidden="true">
      <g fill="currentColor">
        <polygon points="238,50 60,420 145,420 238,225" />
        <polygon points="262,50 262,225 355,420 440,420" />
        <polygon points="250,380 180,240 320,240" />
        <polygon points="175,445 325,445 345,465 155,465" />
      </g>
    </svg>
  )
}
