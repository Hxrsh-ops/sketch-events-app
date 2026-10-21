const { spawn } = require('child_process');
const fs = require('fs');

async function capture() {
  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--window-size=1440,900',
    'http://localhost:3000/login'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  const targets = await fetch('http://127.0.0.1:9222/json').then(r => r.json());
  const pageTarget = targets.find(t => t.type === 'page' && t.url.includes('3000/login'));
  console.log('Page target WS:', pageTarget?.webSocketDebuggerUrl);

  if (!pageTarget) {
    edge.kill();
    return;
  }

  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  let id = 1;
  const send = (method, params = {}) => {
    return new Promise((resolve) => {
      const msgId = id++;
      const handler = (evt) => {
        const msg = JSON.parse(evt.data);
        if (msg.id === msgId) {
          ws.removeEventListener('message', handler);
          resolve(msg.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  };

  ws.addEventListener('open', async () => {
    console.log('WS connected to page');
    await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });
    // Wait for hydration & animations
    await new Promise(r => setTimeout(r, 1500));

    const evalRes = await send('Runtime.evaluate', {
      expression: `(() => {
        const emailSvg = document.querySelector('#email-input')?.parentElement?.querySelector('svg');
        const passSvg = document.querySelector('#password-input')?.parentElement?.querySelector('svg');
        const emailInput = document.querySelector('#email-input');
        return JSON.stringify({
          hasEmailSvg: !!emailSvg,
          emailSvgBox: emailSvg ? emailSvg.getBoundingClientRect() : null,
          emailParentHTML: emailSvg?.parentElement?.outerHTML,
          emailInputBox: emailInput ? emailInput.getBoundingClientRect() : null,
          emailInputZIndex: emailInput ? window.getComputedStyle(emailInput).zIndex : null,
          emailSvgZIndex: emailSvg ? window.getComputedStyle(emailSvg).zIndex : null
        });
      })()`,
      returnByValue: true
    });
    console.log('DOM Evaluation:', evalRes.result.value);

    const shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('public/assets/current-browser-login-capture.png', Buffer.from(shot.data, 'base64'));
    console.log('Captured screenshot saved to public/assets/current-browser-login-capture.png!');

    ws.close();
    edge.kill();
  });
}

capture();
