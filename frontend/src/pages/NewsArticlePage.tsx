import { Link, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { newsApi } from '../api'
import { Button } from '../components/Common/Button'
import { Loader } from '../components/Common/Loader'
import { MarkdownRenderer } from '../components/Chat/MarkdownRenderer'
import type { NewsItem } from '../types'

function errorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 404) return 'Новость не найдена'
    const message = (error.response?.data as { message?: string } | undefined)?.message
    if (message) return message
  }
  return fallback
}

export function NewsArticlePage() {
  const { slug = '' } = useParams<{ slug: string }>()

  const newsQuery = useQuery({
    queryKey: ['news', 'item', slug],
    queryFn: async () => {
      const { data } = await newsApi.bySlug(slug)
      return (data as { news: NewsItem }).news
    },
    enabled: Boolean(slug),
  })

  const item = newsQuery.data

  return (
    <article className="content-panel" aria-label="Новость">
      <p className="activate-crumb">
        <Link to="/news">Новости</Link>
      </p>

      {newsQuery.isPending && <Loader label="Загружаем новость…" />}

      {newsQuery.isError && (
        <div className="lib-card">
          <p className="page-text">{errorMessage(newsQuery.error, 'Не удалось загрузить новость')}</p>
          <Link to="/news">
            <Button variant="ghost">Ко всем новостям</Button>
          </Link>
        </div>
      )}

      {item && (
        <>
          <h1 className="page-title">{item.title}</h1>
          <p className="page-text news-meta">
            {item.publishedAt && format(new Date(item.publishedAt), 'd MMMM yyyy', { locale: ru })}
            {item.author && ` · ${item.author.username}`}
          </p>
          {item.cover && <img className="news-cover news-cover-full" src={item.cover} alt="" />}
          <MarkdownRenderer content={item.content} />
        </>
      )}
    </article>
  )
}
