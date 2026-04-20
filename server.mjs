import http from 'http';
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

const server = http.createServer(async (req, res) => {

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  if (req.method === 'POST' && req.url === '/compari/trusted-shop') {

    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {

      try {

        const payload = JSON.parse(body);

        const email = payload.email;
        const products = payload.products || [];

        const trustedShop = new TrustedShop(WEB_API_KEY);

        trustedShop.setEmail(email);

        for (const p of products) {
          trustedShop.addProduct(
            p.name,
            p.id || null
          );
        }

        const htmlCode = await trustedShop.prepare();

        sendJson(res, 200, {
          htmlCode
        });

      } catch(error) {

        sendJson(res, 500, {
          error: error.message
        });

      }

    });

    return;
  }

  sendJson(res,404,{
    error:'Not found'
  });

});

server.listen(PORT, () => {
  console.log(
    'Server running on port ' + PORT
  );
});
