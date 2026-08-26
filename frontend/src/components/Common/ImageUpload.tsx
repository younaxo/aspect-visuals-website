import { useRef, useState } from 'react'

type ImageUploadSize = 'small' | 'medium' | 'large'
type ImageUploadVariant = 'avatar' | 'banner'

interface ImageUploadProps {
  currentImage?: string | null
  onUpload: (file: File) => Promise<void> | void
  onRemove?: () => Promise<unknown> | void
  size?: ImageUploadSize
  variant?: ImageUploadVariant
  label?: string
  disabled?: boolean
}

const MAX_FILE_SIZE = 5 * 1024 * 1024

export function ImageUpload({
  currentImage,
  onUpload,
  onRemove,
  size = 'medium',
  variant = 'avatar',
  label,
  disabled = false,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const src = preview ?? currentImage ?? null
  const isBanner = variant === 'banner'

  const openPicker = () => {
    if (disabled || busy) return
    inputRef.current?.click()
  }

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Выберите изображение')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('Файл больше 5 МБ')
      return
    }

    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)
    setError(null)
    setBusy(true)

    try {
      await onUpload(file)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить файл')
      setPreview(null)
    } finally {
      URL.revokeObjectURL(objectUrl)
      setPreview(null)
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleRemove = async () => {
    if (!onRemove || disabled || busy) return
    setBusy(true)
    setError(null)
    try {
      await onRemove()
      setPreview(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить изображение')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`image-upload ${isBanner ? 'banner' : `avatar size-${size}`}`}>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        hidden
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />

      <button
        type="button"
        className="image-upload-surface"
        onClick={openPicker}
        disabled={disabled || busy}
        aria-label={label ?? (isBanner ? 'Загрузить баннер' : 'Загрузить аватар')}
      >
        {src ? (
          <img src={src} alt="" draggable={false} />
        ) : (
          <span className="image-upload-empty">{isBanner ? 'Баннер' : 'Аватар'}</span>
        )}
        <span className="image-upload-overlay">
          <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 7h3l2-2h6l2 2h3v12H4z" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
        </span>
      </button>

      {onRemove && src && (
        <button
          type="button"
          className="image-upload-remove"
          onClick={() => void handleRemove()}
          disabled={disabled || busy}
          aria-label={isBanner ? 'Удалить баннер' : 'Удалить аватар'}
        >
          Удалить
        </button>
      )}

      {error && <p className="image-upload-error">{error}</p>}
    </div>
  )
}
