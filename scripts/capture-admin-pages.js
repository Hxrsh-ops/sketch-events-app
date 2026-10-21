const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const ssr = require('@supabase/ssr');

const envFile = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf-8');
const url = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const k = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const anonKey = envFile.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, k);

const outDir = 'C:\\Users\\kmhar\\.gemini\\antigravity\\brain\\3f03abc8-3241-433d-84c1-865e513b7209';
const tempDir = path.join(outDir, 'scratch', 'edge_profile_capture');

async function main() {
  const pageToCapture = process.argv[2] || '/';
  const outFileName = process.argv[3] || 'dashboard-current.png';

  console.log(`Generating auth link for page: ${pageToCapture}...`);
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: 'kmharshanth6@gmail.com'
  });
  if (error || !data?.properties?.hashed_token) {
    console.error('Failed to generate magic link:', error);
    process.exit(1);
  }

  const token = data.properties.hashed_token;
  const verifyRes = await fetch(`${url}/auth/v1/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey
    },
    body: JSON.stringify({ token_hash: token, type: 'magiclink' })
  }).then(r => r.json());

  if (!verifyRes.access_token) {
    console.error('Failed to verify token:', verifyRes);
    process.exit(1);
  }

  console.log('Session acquired. Starting headless Edge...');
  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless',
    '--remote-debugging-port=9222',
    `--user-data-dir=${tempDir}`,
    '--disable-gpu',
    '--window-size=1440,900',
    'http://localhost:3000/login'
  ]);

  await new Promise(r => setTimeout(r, 2000));
  const targets = await fetch('http://127.0.0.1:9222/json').then(r => r.json());
  const pageTarget = targets.find(t => t.type === 'page');
  if (!pageTarget) {
    console.error('No page target found');
    edge.kill();
    process.exit(1);
  }

  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  let id = 1;
  const send = (method, params = {}) => new Promise(res => {
    const msgId = id++;
    const handler = (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.id === msgId) {
        ws.removeEventListener('message', handler);
        res(msg.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });

  ws.addEventListener('open', async () => {
    const isDark = outFileName.includes('dark');
    await send('Network.enable');
    await send('Page.enable');
    await send('Emulation.setEmulatedMedia', {
      media: 'screen',
      features: [{ name: 'prefers-color-scheme', value: isDark ? 'dark' : 'light' }]
    });

    let storedCookies = [];
    const serverClient = ssr.createServerClient(url, anonKey, {
      cookies: {
        getAll() { return storedCookies; },
        setAll(cookies) { storedCookies = cookies; }
      }
    });
    await serverClient.auth.setSession({
      access_token: verifyRes.access_token,
      refresh_token: verifyRes.refresh_token
    });

    for (const cookie of storedCookies) {
      await send('Network.setCookie', {
        name: cookie.name,
        value: cookie.value,
        url: 'http://localhost:3000',
        path: '/',
        httpOnly: false,
        sameSite: 'Lax'
      });
    }

    const targetUrl = `http://localhost:3000${pageToCapture}`;
    console.log(`Navigating to ${targetUrl}...`);
    await send('Page.navigate', { url: targetUrl });

    // Wait for hydration and data load
    await new Promise(r => setTimeout(r, 2000));

    if (isDark) {
      await send('Runtime.evaluate', {
        expression: `(() => {
          localStorage.setItem('sketch-theme', 'dark');
          document.documentElement.classList.add('dark');
          document.documentElement.style.colorScheme = 'dark';
        })()`
      });
      await new Promise(r => setTimeout(r, 500));
    } else {
      await send('Runtime.evaluate', {
        expression: `(() => {
          localStorage.setItem('sketch-theme', 'light');
          document.documentElement.classList.remove('dark');
          document.documentElement.style.colorScheme = 'light';
        })()`
      });
      await new Promise(r => setTimeout(r, 500));
    }

    const evalRes = await send('Runtime.evaluate', {
      expression: 'document.title + " | " + window.location.href'
    });
    console.log('Location:', evalRes.result.value);

    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const outPath = path.join(outDir, outFileName);
    fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
    console.log(`Screenshot saved to: ${outPath}`);

    ws.close();
    edge.kill();
    process.exit(0);
  });
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
