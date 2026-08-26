import { useEffect, useState } from 'react'
import api from '../../api'
import { Button } from '../Common/Button'
import { CustomSelect } from '../Common/CustomSelect'

export interface CodeFolder {
  id: string
  name: string
  kind: string
}

export function FolderField({
  kind,
  value,
  onChange,
}: {
  kind: 'PROMO' | 'BONUS' | 'KEY'
  value: string
  onChange: (id: string) => void
}) {
  const [folders, setFolders] = useState<CodeFolder[]>([])
  const [name, setName] = useState('')

  const load = async () => {
    const { data } = await api.get('/api/admin/folders', { params: { kind } })
    setFolders((data as { folders: CodeFolder[] }).folders)
  }

  useEffect(() => {
    void load()
  }, [kind])

  const create = async () => {
    if (!name.trim()) return
    const { data } = await api.post('/api/admin/folders', { name: name.trim(), kind })
    setName('')
    await load()
    onChange((data as { folder: CodeFolder }).folder.id)
  }

  return (
    <label className="profile-field">
      <span>Папка</span>
      <div className="admin-form-row">
        <CustomSelect
          value={value}
          onChange={onChange}
          placeholder="Без папки"
          options={[
            { value: '', label: 'Без папки' },
            ...folders.map((folder) => ({ value: folder.id, label: folder.name })),
          ]}
        />
        <input
          className="profile-input"
          placeholder="Новая папка"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <Button variant="ghost" type="button" onClick={() => void create()}>
          Добавить
        </Button>
      </div>
    </label>
  )
}
