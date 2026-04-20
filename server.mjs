import http from 'http';
import fetch from 'node-fetch';
import TrustedShop from './TrustedShop.mjs';

const PORT = process.env.PORT || 3000;
const WEB_API_KEY = process.env.WEB_API_KEY;

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

async function fireCompariRequest(htmlCode) {
  const imgMatch = htmlCode.match(/<img src="([^"]+)"/i);

  if (!imgMatch || !imgMatch[1]) {
    throw new Error('Nu am putut extrage URL-ul final Compari din htmlCode.');
  }

  const finalUrl = imgMatch[1];

  const compariResponse = await fetch(finalUrl, {
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 Railway Compari Integration'
    }
  });

  return {
    ok: compariResponse.ok,
    status: compariResponse.status,
    finalUrl
  };
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  if (req.method === 'GET' && req.url === '/') {
    return sendJson(res, 200, { ok: true, message: 'Compari server online' });
  }

  if (req.method === 'POST' && req.url === '/compari/trusted-shop') {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        if (!WEB_API_KEY) {
          return sendJson(res, 500, {
            success: false,
            error: 'Lipseste variabila WEB_API_KEY din Railway.'
          });
        }

        const payload = JSON.parse(body);
        const email = payload?.email;
        const products = Array.isArray(payload?.products) ? payload.products : [];

        if (!email) {
          return sendJson(res, 400, {
            success: false,
            error: 'Lipseste emailul clientului.'
          });
        }

        const trustedShop = new TrustedShop(WEB_API_KEY);
        trustedShop.setEmail(email);

        for (const p of products) {
          const name = p?.name;
          const id = p?.id || null;

          if (name) {
            trustedShop.addProduct(name, id);
          }
        }

        const htmlCode = await trustedShop.prepare();
        const compariResult = await fireCompariRequest(htmlCode);

        return sendJson(res, 200, {
          success: true,
          compariStatus: compariResult.status
        });
      } catch (error) {
        return sendJson(res, 500, {
          success: false,
          error: error.message || 'Eroare interna.'
        });
      }
    });

    return;
  }

  return sendJson(res, 404, { success: false, error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
