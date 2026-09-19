import { AspectIcon } from './FigmaIcons'

interface LogoProps {
  className?: string
}

/*
 * Знак берётся из макета (UI Kit → Aspect Icons → Logotype), а не рисуется
 * полигонами вручную: прежняя версия была приблизительной и расходилась
 * с тем, что показывает клиент.
 */
export function Logo({ className = 'h-7 w-7' }: LogoProps) {
  return <AspectIcon name="logotype" size={28} className={className} />
}
