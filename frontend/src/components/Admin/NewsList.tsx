import { useState } from 'react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { newsApi, type NewsPayload } from '../../api'
import { Button } from '../Common/Button'
import { Loader } from '../Common/Loader'
import { CustomSelect } from '../Common/CustomSelect'
import { useToastStore } from '../../store/toastStore'
import type { NewsCard, NewsListResponse } from '../../types'

const PAGE_SIZE = 10

const emptyForm = {
  title: '',
  excerpt: '',
  content: '',
  cover: '',
  status: 'DRAFT',
  pinned: false,
}

function errorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { message?: string } | undefined)?.message
    if (message) return message
  }
  return fallback
}

export function NewsList() {
  const queryClient = useQueryClient()
  const showToast = useToastStore((state) => state.showToast)

  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  const listQuery = useQuery({
    queryKey: ['admin', 'news', { page, search, statusFilter }],
    queryFn: async () => {
      const { data } = await newsApi.adminList({
        page,
        pageSize: PAGE_SIZE,
        search: search || undefined,
        status: statusFilter || undefined,
      })
      return data as NewsListResponse
    },
  })

  const reset = () => {
    setForm(emptyForm)
    setEditingId(null)
  }

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin', 'news'] })
    // Публичный список тоже должен обновиться сразу после публикации
    await queryClient.invalidateQueries({ queryKey: ['news'] })
  }

  const save = useMutation({
    mutationFn: async () => {
      const payload: NewsPayload = {
        title: form.title.trim(),
        content: form.content.trim(),
        excerpt: form.excerpt.trim() || null,
        cover: form.cover.trim() || null,
        status: form.status,
        pinned: form.pinned,
      }
      if (editingId) return newsApi.update(editingId, payload)
      return newsApi.create(payload)
    },
    onSuccess: async () => {
      showToast(editingId ? 'Новость обновлена' : 'Новость создана', 'success')
      reset()
      await invalidate()
    },
    onError: (error) => showToast(errorMessage(error, 'Не удалось сохранить новость'), 'error'),
  })

  const togglePublish = useMutation({
    mutationFn: (item: NewsCard) =>
      newsApi.update(item.id, { status: item.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED' }),
    onSuccess: async () => {
      showToast('Статус публикации изменён', 'success')
      await invalidate()
    },
    onError: (error) => showToast(errorMessage(error, 'Не удалось изменить статус'), 'error'),
  })

  const togglePin = useMutation({
    mutationFn: (item: NewsCard) => newsApi.update(item.id, { pinned: !item.pinned }),
    onSuccess: invalidate,
    onError: (error) => showToast(errorMessage(error, 'Не удалось закрепить'), 'error'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => newsApi.remove(id),
    onSuccess: async () => {
      showToast('Новость удалена', 'info')
      reset()
      await invalidate()
    },
    onError: (error) => showToast(errorMessage(error, 'Не удалось удалить новость'), 'error'),
  })

  const data = listQuery.data
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1
  const canSave = form.title.trim().length >= 3 && form.content.trim().length > 0

  return (
    <div className="admin-grid">
      <article className="admin-card liquid-glass">
        <h2 className="shop-section-title">{editingId ? 'Редактирование новости' : 'Новая новость'}</h2>
        <p className="page-text">Черновик виден только в админке. Опубликованные новости видны на сайте и в лаунчере.</p>
        <div className="admin-form">
          <label className="profile-field">
            <span>Заголовок</span>
            <input
              className="profile-input"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
          </label>
          <label className="profile-field">
            <span>Краткое описание</span>
            <textarea
              className="profile-input"
              value={form.excerpt}
              onChange={(event) => setForm({ ...form, excerpt: event.target.value })}
            />
          </label>
          <label className="profile-field">
            <span>Текст (Markdown)</span>
            <textarea
              className="profile-input admin-textarea-lg"
              value={form.content}
              onChange={(event) => setForm({ ...form, content: event.target.value })}
            />
          </label>
          <label className="profile-field">
            <span>Обложка (URL)</span>
            <input
              className="profile-input"
              value={form.cover}
              placeholder="https://…"
              onChange={(event) => setForm({ ...form, cover: event.target.value })}
            />
          </label>
          <label className="profile-field">
            <span>Статус</span>
            <CustomSelect
              value={form.status}
              onChange={(status) => setForm({ ...form, status })}
              options={[
                { value: 'DRAFT', label: 'Черновик' },
                { value: 'PUBLISHED', label: 'Опубликовано' },
              ]}
            />
          </label>
          <label className="profile-field admin-check">
            <input
              type="checkbox"
              checked={form.pinned}
              onChange={(event) => setForm({ ...form, pinned: event.target.checked })}
            />
            <span>Закрепить сверху</span>
          </label>
          <div className="shop-sub-actions">
            <Button disabled={!canSave || save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? 'Сохраняем…' : editingId ? 'Сохранить' : 'Создать новость'}
            </Button>
            {editingId && (
              <Button variant="ghost" onClick={reset}>
                Отмена
              </Button>
            )}
          </div>
        </div>
      </article>

      <article className="admin-card liquid-glass">
        <h2 className="shop-section-title">Публикации</h2>
        <div className="admin-form-row">
          <input
            className="profile-input"
            placeholder="Поиск по заголовку"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
          />
          <CustomSelect
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value)
              setPage(1)
            }}
            options={[
              { value: '', label: 'Все статусы' },
              { value: 'DRAFT', label: 'Черновики' },
              { value: 'PUBLISHED', label: 'Опубликованные' },
            ]}
          />
        </div>

        {listQuery.isPending && <Loader label="Загружаем публикации…" />}

        {listQuery.isError && (
          <p className="page-text">{errorMessage(listQuery.error, 'Не удалось загрузить публикации')}</p>
        )}

        {data && data.news.length === 0 && <p className="page-text">Публикаций не найдено.</p>}

        <ul className="admin-list">
          {(data?.news ?? []).map((item) => (
            <li key={item.id} className={`admin-list-item ${item.status === 'PUBLISHED' ? '' : 'is-off'}`}>
              <div>
                <strong className="admin-code">{item.title}</strong>
                <p className="page-text">
                  {item.status === 'PUBLISHED' ? 'Опубликовано' : 'Черновик'}
                  {item.pinned && ' · закреплено'}
                  {item.publishedAt && ` · ${format(new Date(item.publishedAt), 'd MMM yyyy', { locale: ru })}`}
                  {item.author && ` · ${item.author.username}`}
                </p>
              </div>
              <div className="shop-sub-actions">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setEditingId(item.id)
                    setForm({
                      title: item.title,
                      excerpt: item.excerpt ?? '',
                      content: '',
                      cover: item.cover ?? '',
                      status: item.status,
                      pinned: item.pinned,
                    })
                    void newsApi.bySlug(item.slug).then(({ data: detail }) => {
                      setForm((current) => ({ ...current, content: (detail as { news: { content: string } }).news.content }))
                    })
                  }}
                >
                  Изменить
                </Button>
                <Button variant="ghost" onClick={() => togglePublish.mutate(item)}>
                  {item.status === 'PUBLISHED' ? 'Снять' : 'Опубликовать'}
                </Button>
                <Button variant="ghost" onClick={() => togglePin.mutate(item)}>
                  {item.pinned ? 'Открепить' : 'Закрепить'}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (!confirm(`Удалить новость «${item.title}»? Это действие необратимо.`)) return
                    remove.mutate(item.id)
                  }}
                >
                  Удалить
                </Button>
              </div>
            </li>
          ))}
        </ul>

        {data && totalPages > 1 && (
          <nav className="news-pager" aria-label="Страницы публикаций">
            <Button variant="ghost" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
              Назад
            </Button>
            <span className="page-text">
              {page} из {totalPages}
            </span>
            <Button variant="ghost" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>
              Вперёд
            </Button>
          </nav>
        )}
      </article>
    </div>
  )
}
