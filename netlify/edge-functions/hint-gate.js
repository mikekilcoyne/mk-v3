// Password gate for /hint (the Hey! I'm New in Town pitch deck).
// Runs on Netlify's edge, so the deck, its photos and the PDF are all behind it.
const PASSWORD = "HINT";           // case-insensitive
const COOKIE = "hint_ok";

const page = (wrong) => `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>Hey! I'm New in Town</title>
<link rel="icon" type="image/png" sizes="32x32" href="/hint-icon/favicon-32.png"><link rel="icon" type="image/png" sizes="512x512" href="/hint-icon/favicon-512.png"><link rel="apple-touch-icon" href="/hint-icon/apple-touch-icon.png">
<style>
html,body{height:100%;margin:0}
body{display:flex;align-items:center;justify-content:center;background:#5b2a9e;font-family:system-ui,-apple-system,"Helvetica Neue",Arial,sans-serif;color:#fff6e4}
form{background:#fff6e4;color:#140a1c;border:5px solid #140a1c;border-radius:22px;box-shadow:10px 11px 0 #140a1c;padding:34px 34px 30px;width:min(360px,84vw);text-align:center;transform:rotate(-1.5deg)}
h1{margin:0 0 6px;font-size:34px;font-weight:900;letter-spacing:-.01em}
h1 span{background:#b42cb0;color:#ffc83a;padding:0 10px;border-radius:8px}
p{margin:0 0 20px;color:#5a4d68;font-size:16px}
input{width:100%;box-sizing:border-box;font:700 20px/1 inherit;padding:14px 16px;border:4px solid #140a1c;border-radius:12px;text-align:center;letter-spacing:.2em;text-transform:uppercase}
button{margin-top:14px;width:100%;font:900 18px/1 inherit;letter-spacing:.1em;text-transform:uppercase;padding:16px;border-radius:999px;border:4px solid #140a1c;background:#ffc83a;box-shadow:5px 5px 0 #140a1c;cursor:pointer}
.err{color:#c2185b;font-weight:700;margin:12px 0 0;font-size:15px}
</style></head><body>
<form method="POST"><h1><span>HEY!</span> I'm New in Town</h1><p>Enter the password to see the deck.</p>
<input name="pw" type="password" autocomplete="off" autofocus aria-label="Password">
<button type="submit">Let me in</button>${wrong ? '<div class="err">Not quite. Try again.</div>' : ''}</form>
</body></html>`;

export default async (request, context) => {
  const cookie = request.headers.get("cookie") || "";
  if (new RegExp(`(?:^|;\\s*)${COOKIE}=1`).test(cookie)) return context.next();

  if (request.method === "POST") {
    const form = await request.formData().catch(() => null);
    const pw = (form?.get("pw") || "").toString().trim().toUpperCase();
    if (pw === PASSWORD) {
      return new Response(null, { status: 303, headers: {
        Location: "/hint/",
        "Set-Cookie": `${COOKIE}=1; Path=/; Max-Age=2592000; Secure; HttpOnly; SameSite=Lax`,
      }});
    }
    return new Response(page(true), { status: 401, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
  }
  return new Response(page(false), { status: 401, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
};
