// Stripe 支払い検証ゲート。
// Stripe からのリダイレクト "/?session=cs_live_..." を受け、Checkout Session を
// Stripe API に照合する。payment_status === 'paid' のときだけ valid ページを返す。
// 偽セッション・未払い・キー未設定・通信失敗は全て invalid（fail-closed）。
//
// 依存ライブラリ無し（Node18 の global fetch を使用）。STRIPE_SECRET_KEY は
// Netlify の環境変数で渡す（コードに秘密鍵を書かない）。
const fs = require('fs');
const path = require('path');

function loadTemplate(name) {
  // netlify.toml の included_files で同梱した templates/ を読む。
  // 起点は __dirname（この関数ファイルの位置）。Netlify はリポジトリのパス構造を
  // 保持してバンドルするため、process.cwd() 起点だと置き場所とズレて ENOENT になる。
  // templates/ は netlify/functions/ から見て 2 つ上（../../templates）。
  return fs.readFileSync(path.join(__dirname, '..', '..', 'templates', name), 'utf8');
}

function page(file) {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
    body: loadTemplate(file),
  };
}

// client_reference_id は "YYYYMMDD-YYYYMMDD-<base64url(name)>"。
// 日付部は固定17文字なので、18文字目以降を name の base64url とみなして復号する。
function decodeName(ref) {
  if (!ref || ref.length <= 18) return '';
  let b64 = ref.slice(18).replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  try {
    return Buffer.from(b64, 'base64').toString('utf8').trim();
  } catch (e) {
    return '';
  }
}

// 名前を WhatsApp 自動送信文に差し込んで valid ページを返す。
function validPage(ref) {
  const name = decodeName(ref);
  const message = name
    ? "Hi, I'm " + name + ". I've just registered for Weltify — looking forward to getting started!"
    : "Hi, I've just registered for Weltify — looking forward to getting started!";
  const body = loadTemplate('valid.html').replace('{{WA_TEXT}}', encodeURIComponent(message));
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
    body,
  };
}

exports.handler = async (event) => {
  const session =
    (event.queryStringParameters && event.queryStringParameters.session) || '';

  if (!session) return page('invalid.html');

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return page('invalid.html'); // 設定漏れは安全側に倒す

  try {
    const res = await fetch(
      'https://api.stripe.com/v1/checkout/sessions/' + encodeURIComponent(session),
      { headers: { Authorization: 'Bearer ' + key } }
    );
    if (!res.ok) return page('invalid.html'); // 404 等＝存在しないセッション

    const data = await res.json();
    if (data && data.payment_status === 'paid') return validPage(data.client_reference_id);

    return page('invalid.html');
  } catch (e) {
    return page('invalid.html');
  }
};
