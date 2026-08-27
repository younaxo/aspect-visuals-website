import type { Request, Response } from 'express'

/**
 * Страница капчи для Electron-лаунчера.
 *
 * Виджет Turnstile привязан к домену, а интерфейс лаунчера грузится с file://
 * и получить токен не может. Поэтому лаунчер открывает эту страницу в отдельном
 * окне: она отдаётся с нашего домена, виджет работает штатно, а полученный токен
 * возвращается в лаунчер через переход на /auth/captcha/done.
 */
export function captchaPage(_req: Request, res: Response) {
  const siteKey = (process.env.TURNSTILE_SITE_KEY || '').trim()

  if (!siteKey) {
    res.status(503).type('html').send(page('', 'Капча не настроена'))
    return
  }

  res.type('html').send(page(siteKey, ''))
}

function page(siteKey: string, error: string): string {
  if (error) {
    return `<!doctype html><html lang="ru"><head><meta charset="utf-8" />
<style>html,body{height:100%;margin:0;background:transparent}
body{display:flex;align-items:center;justify-content:center;
font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:12px;color:#f87171}</style>
</head><body>${error}</body></html>`
  }

  // Фон прозрачный: слой лежит поверх формы лаунчера и должен сливаться с ней.
  // Виджет центрируется, лишних подписей на странице нет.
  return `<!doctype html>
<html lang="ru"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Проверка</title>
<style>
  html,body{height:100%;margin:0;background:transparent;overflow:hidden}
  body{display:flex;align-items:center;justify-content:center}
  #widget{transform-origin:center center}
  .msg{font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:12px;color:#f87171;text-align:center}
</style></head>
<body>
  <div id="widget"></div>
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer></script>
  <script>
    function done(token) {
      location.replace('/auth/captcha/done#token=' + encodeURIComponent(token));
    }
    function fail(text) {
      var w = document.getElementById('widget');
      if (w) { w.className = 'msg'; w.textContent = text; }
    }
    function mount() {
      window.turnstile.render('#widget', {
        sitekey: ${JSON.stringify(siteKey)},
        theme: 'dark',
        size: 'flexible',
        callback: done,
        'error-callback': function () { fail('Проверка не пройдена'); },
        'expired-callback': function () { fail('Проверка истекла'); }
      });
    }
    var t = setInterval(function () {
      if (window.turnstile) { clearInterval(t); mount(); }
    }, 80);
  </script>
</body></html>`
}
