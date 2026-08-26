import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api'
import { Button } from '../Common/Button'

interface DashboardData {
  stats: {
    totalUsers: number
    newUsers: number
    activeSubscriptions: number
    revenueMonth: number
    revenueAll: number
    purchasesMonth: number
    purchasesAll: number
  }
  salesByDay: Array<{ date: string; amount: number; count: number }>
  subscriptionSplit: Array<{ name: string; value: number }>
  popularProducts: Array<{ name: string; value: number }>
  recentLogs: Array<{
    id: string
    action: string
    targetType: string
    createdAt: string
    admin: { username: string }
  }>
}

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)

  useEffect(() => {
    void api.get('/api/admin/dashboard').then((res) => setData(res.data as DashboardData))
  }, [])

  if (!data) {
    return <p className="page-text">Загружаем статистику…</p>
  }

  const { stats } = data
  const maxSale = Math.max(1, ...data.salesByDay.map((item) => item.amount))
  const maxSub = Math.max(1, ...data.subscriptionSplit.map((item) => item.value))

  return (
    <div className="admin-grid">
      <div className="admin-stat-grid">
        <article className="admin-card liquid-glass"><p>Всего пользователей</p><strong>{stats.totalUsers}</strong></article>
        <article className="admin-card liquid-glass"><p>Новых за 30 дней</p><strong>{stats.newUsers}</strong></article>
        <article className="admin-card liquid-glass"><p>Активных подписок</p><strong>{stats.activeSubscriptions}</strong></article>
        <article className="admin-card liquid-glass"><p>Доход за месяц</p><strong>{stats.revenueMonth} ₽</strong></article>
        <article className="admin-card liquid-glass"><p>Доход всего</p><strong>{stats.revenueAll} ₽</strong></article>
        <article className="admin-card liquid-glass"><p>Покупок за месяц</p><strong>{stats.purchasesMonth}</strong></article>
      </div>

      <article className="admin-card liquid-glass">
        <h2 className="shop-section-title">Продажи за 30 дней</h2>
        <div className="admin-bars">
          {data.salesByDay.map((item) => (
            <div key={item.date} className="admin-bar-col" title={`${item.date}: ${item.amount} ₽`}>
              <span style={{ height: `${(item.amount / maxSale) * 100}%` }} />
            </div>
          ))}
        </div>
      </article>

      <div className="admin-form-row">
        <article className="admin-card liquid-glass">
          <h2 className="shop-section-title">Подписки</h2>
          <ul className="admin-list">
            {data.subscriptionSplit.map((item) => (
              <li key={item.name} className="admin-list-item">
                <span>{item.name}</span>
                <div className="admin-inline-bar">
                  <i style={{ width: `${(item.value / maxSub) * 100}%` }} />
                </div>
                <strong>{item.value}</strong>
              </li>
            ))}
          </ul>
        </article>
        <article className="admin-card liquid-glass">
          <h2 className="shop-section-title">Популярные товары</h2>
          <ul className="admin-list">
            {data.popularProducts.map((item) => (
              <li key={item.name} className="admin-list-item">
                <span>{item.name}</span>
                <strong>{item.value}</strong>
              </li>
            ))}
          </ul>
        </article>
      </div>

      <article className="admin-card liquid-glass">
        <h2 className="shop-section-title">Последние действия</h2>
        <ul className="admin-list">
          {data.recentLogs.map((item) => (
            <li key={item.id} className="admin-list-item">
              <span>
                {item.admin.username}: {item.action} {item.targetType}
              </span>
              <span className="page-text">{new Date(item.createdAt).toLocaleString('ru')}</span>
            </li>
          ))}
        </ul>
      </article>

      <div className="shop-sub-actions">
        <Link to="/admin/subscriptions"><Button>Создать подписку</Button></Link>
        <Link to="/admin/keys"><Button variant="ghost">Сгенерировать ключи</Button></Link>
      </div>
    </div>
  )
}
