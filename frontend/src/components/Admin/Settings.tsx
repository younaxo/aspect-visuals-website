import { useEffect, useState } from 'react'
import api from '../../api'
import { Button } from '../Common/Button'
import { useToastStore } from '../../store/toastStore'

interface Setting {
  key: string
  value: unknown
  description: string
}

export function AdminSettings() {
  const showToast = useToastStore((s) => s.showToast)
  const [settings, setSettings] = useState<Setting[]>([])

  const load = async () => {
    const { data } = await api.get('/api/admin/settings')
    setSettings((data as { settings: Setting[] }).settings)
  }

  useEffect(() => {
    void load()
  }, [])

  const save = async () => {
    const payload: Record<string, unknown> = {}
    for (const item of settings) payload[item.key] = item.value
    await api.put('/api/admin/settings', { settings: payload })
    showToast('Настройки сохранены', 'success')
    await load()
  }

  const update = (key: string, value: unknown) => {
    setSettings((prev) => prev.map((item) => (item.key === key ? { ...item, value } : item)))
  }

  return (
    <article className="admin-card liquid-glass">
      <h2 className="shop-section-title">Системные настройки</h2>
      <div className="admin-form">
        {settings.map((item) => (
          <label key={item.key} className="profile-field">
            <span>{item.description}</span>
            {typeof item.value === 'boolean' ? (
              <input type="checkbox" checked={Boolean(item.value)} onChange={(e) => update(item.key, e.target.checked)} />
            ) : (
              <input
                className="profile-input"
                value={String(item.value ?? '')}
                onChange={(e) => {
                  const raw = e.target.value
                  update(item.key, typeof item.value === 'number' ? Number(raw) : raw)
                }}
              />
            )}
          </label>
        ))}
        <Button onClick={() => void save()}>Сохранить настройки</Button>
      </div>
    </article>
  )
}
