// Example usage (assuming you saved the class as TrustedShop.mjs)
import TrustedShop from './TrustedShop.mjs';

async function sendTrustedShopData() {
  try {
    const trustedShop = new TrustedShop('d3c45e59bf3222852d4f18f338a6aec8'); // Replace with your actual Web API Key
    trustedShop.setEmail('customer@example.com'); // Replace with the actual customer email
    trustedShop.addProduct('Awesome Product', 'PROD123');
    trustedShop.addProduct('Another Great Item');

    const htmlCode = await trustedShop.prepare();
    console.log('Generated HTML Code:', htmlCode);

    // In a real web application, you would send this HTML code to the client-side
    // for inclusion in their browser.
  } catch (error) {
    console.error('Error:', error.message);
  }
}

sendTrustedShopData();