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
  const body = error
    ? `<p class="err">${error}</p>`
    : `<div id="widget"></div><p class="hint" id="hint">Подтвердите, что вы не робот</p>`

  const script = error
    ? ''
    : `<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer></script>
<script>
  function done(token) {
    // Переход перехватывает лаунчер и забирает токен из фрагмента
    location.replace('/auth/captcha/done#token=' + encodeURIComponent(token));
  }
  function fail(text) {
    var hint = document.getElementById('hint');
    if (hint) { hint.textContent = text; hint.className = 'hint err'; }
  }
  window.onloadTurnstileCallback = function () {
    window.turnstile.render('#widget', {
      sitekey: ${JSON.stringify(siteKey)},
      theme: 'dark',
      callback: done,
      'error-callback': function () { fail('Не удалось пройти проверку. Закройте окно и попробуйте снова.'); },
      'expired-callback': function () { fail('Проверка истекла. Закройте окно и попробуйте снова.'); }
    });
  };
  var t = setInterval(function () {
    if (window.turnstile) { clearInterval(t); window.onloadTurnstileCallback(); }
  }, 100);
</script>`

  return `<!doctype html>
<html lang="ru"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Проверка — Aspect Visuals</title>
<style>
  html,body{height:100%;margin:0}
  body{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;
    background:#09090b;color:#fafafa;font-family:-apple-system,Segoe UI,Roboto,sans-serif}
  .brand{font-size:11px;letter-spacing:.28em;text-transform:uppercase;color:#71717a}
  .hint{font-size:13px;color:#a1a1aa;margin:0}
  .err{color:#f87171}
</style></head>
<body>
  <div class="brand">Aspect Visuals</div>
  ${body}
  ${script}
</body></html>`
}
