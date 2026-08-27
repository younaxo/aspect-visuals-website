import { useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { newsApi } from '../api'
import { Button } from '../components/Common/Button'
import { Loader } from '../components/Common/Loader'
import type { NewsListResponse } from '../types'

const PAGE_SIZE = 10

function errorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { message?: string } | undefined)?.message
    if (message) return message
  }
  return fallback
}

export function NewsPage() {
  const [page, setPage] = useState(1)

  const newsQuery = useQuery({
    queryKey: ['news', 'list', page],
    queryFn: async () => {
      const { data } = await newsApi.list(page, PAGE_SIZE)
      return data as NewsListResponse
    },
  })

  const data = newsQuery.data
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1

  return (
    <section className="content-panel" aria-label="Новости">
      <p className="eyebrow">Aspect Visuals</p>
      <h1 className="page-title">Новости</h1>

      {newsQuery.isPending && <Loader label="Загружаем новости…" />}

      {newsQuery.isError && (
        <article className="lib-card">
          <p className="page-text">{errorMessage(newsQuery.error, 'Не удалось загрузить новости')}</p>
          <Button variant="ghost" onClick={() => void newsQuery.refetch()}>
            Повторить
          </Button>
        </article>
      )}

      {data && data.news.length === 0 && <p className="page-text">Публикаций пока нет.</p>}

      {data && data.news.length > 0 && (
        <ul className="news-list">
          {data.news.map((item) => (
            <li key={item.id} className="news-item lib-card">
              {item.cover && <img className="news-cover" src={item.cover} alt="" loading="lazy" />}
              <div className="news-body">
                <p className="page-text news-meta">
                  {item.pinned && <span className="news-pin">Закреплено</span>}
                  {item.publishedAt && format(new Date(item.publishedAt), 'd MMMM yyyy', { locale: ru })}
                  {item.author && ` · ${item.author.username}`}
                </p>
                <h2 className="shop-section-title">
                  <Link to={`/news/${item.slug}`}>{item.title}</Link>
                </h2>
                {item.excerpt && <p className="page-text">{item.excerpt}</p>}
                <Link className="news-more" to={`/news/${item.slug}`}>
                  Читать полностью
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      {data && totalPages > 1 && (
        <nav className="news-pager" aria-label="Страницы новостей">
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
    </section>
  )
}
