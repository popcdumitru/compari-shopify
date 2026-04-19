import fetch from 'node-fetch';
import crypto from 'crypto'; // For md5 hashing

/**
 * Trusted Shop engine class, which provides purchase data sending.
 * Requires Node.js 18 or higher.
 * @version 2.0
 * @author Arukereso 2025
 */
class TrustedShop {
  static VERSION = '2.0/NodeJS';

  static SERVICE_URL_SEND = 'https://www.compari.ro/';
  static SERVICE_URL_AKU = 'https://assets.arukereso.com/aku.min.js';
  static SERVICE_TOKEN_REQUEST = 't2/TokenRequest.php';
  static SERVICE_TOKEN_PROCESS = 't2/TrustedShop.php';

  static ERROR_EMPTY_EMAIL = 'Customer e-mail address is empty.';
  static ERROR_EMPTY_WEBAPIKEY = 'Partner WebApiKey is empty.';
  static ERROR_EXAMPLE_EMAIL = 'Customer e-mail address has been not changed yet.';
  static ERROR_EXAMPLE_PRODUCT = 'Product name has been not changed yet.';
  static ERROR_TOKEN_REQUEST_TIMED_OUT = 'Token request timed out.';
  static ERROR_TOKEN_REQUEST_FAILED = 'Token request failed.';
  static ERROR_TOKEN_BAD_REQUEST = 'Bad request: ';

  #WebApiKey;
  #Email;
  #Products = [];

  /**
   * Instantiates a new Trusted Shop engine with the specified WebApi key.
   * @param {string} WebApiKey - Your unique WebApi key.
   */
  constructor(WebApiKey) {
    this.#WebApiKey = WebApiKey;
  }

  /**
   * Sets the customer's e-mail address.
   * @param {string} Email - Current customer's e-mail address.
   */
  setEmail(Email) {
    this.#Email = Email;
  }

  /**
   * Adds a product to send. Callable multiple times.
   * @param {string} ProductName - A product name from the customer's cart.
   * @param {string} [ProductId=null] - A product id, it must be same as in the feed.
   */
  addProduct(ProductName, ProductId = null) {
    const content = {
      Name: ProductName
    };
    if (ProductId) {
      content.Id = ProductId;
    }
    this.#Products.push(content);
  }

  /**
   * Prepares the Trusted code, which provides data sending from the customer's browser to us.
   * @returns {Promise<string>} - Prepared Trusted code (HTML).
   * @throws {Error} If validation fails or token request fails.
   */
  async prepare() {
    if (!this.#WebApiKey) {
      throw new Error(TrustedShop.ERROR_EMPTY_WEBAPIKEY);
    }
    if (!this.#Email) {
      throw new Error(TrustedShop.ERROR_EMPTY_EMAIL);
    }
    if (this.#Email === 'somebody@example.com') {
      throw new Error(TrustedShop.ERROR_EXAMPLE_EMAIL);
    }

    const examples = ['Name of first purchased product', 'Name of second purchased product'];
    for (const example of examples) {
      for (const product of this.#Products) {
        if (product.Name === example) {
          throw new Error(TrustedShop.ERROR_EXAMPLE_PRODUCT);
        }
      }
    }

    const params = {};
    params.Version = TrustedShop.VERSION;
    params.WebApiKey = this.#WebApiKey;
    params.Email = this.#Email;
    params.Products = JSON.stringify(this.#Products);

    const random = crypto.createHash('md5').update(this.#WebApiKey + Date.now()).digest('hex');
    const query = await this.#getQuery(params);

    // Sending:
    let output = '<script type="text/javascript">window.aku_request_done = function(w, c) {';
    output += `var I = new Image(); I.src="${TrustedShop.SERVICE_URL_SEND}${TrustedShop.SERVICE_TOKEN_PROCESS}${query}" + c;`;
    output += '};</script>';
    // Include:
    output += '<script type="text/javascript"> (function() {';
    output += `var a=document.createElement("script"); a.type="text/javascript"; a.src="${TrustedShop.SERVICE_URL_AKU}"; a.async=true;`;
    output += '(document.getElementsByTagName("head")[0]||document.getElementsByTagName("body")[0]).appendChild(a);';
    output += '})();</script>';
    // Fallback:
    output += '<noscript>';
    output += `<img src="${TrustedShop.SERVICE_URL_SEND}${TrustedShop.SERVICE_TOKEN_PROCESS}${query}${random}" />`;
    output += '</noscript>';

    return output;
  }

  /**
   * Performs a request on our servers to get a token and assembles query params with it.
   * @param {Object} Params - Parameters to send with token request.
   * @returns {Promise<string>} - Query string to assemble sending code snippet on client's side with it.
   * @throws {Error} If the token request fails or returns an error.
   */
  async #getQuery(Params) {
    const url = TrustedShop.SERVICE_URL_SEND + TrustedShop.SERVICE_TOKEN_REQUEST;
    const body = new URLSearchParams(Params).toString();

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body,
        timeout: 500, // This is a non-standard option for `node-fetch`, not all versions support it.
                      // A more robust solution involves AbortController, implement if needed
      });

      const jsonBody = await response.json();

      if (response.ok) { // http_code 200-299
        if (jsonBody && jsonBody.Token) {
          const query = [];
          query.push('Token=' + jsonBody.Token);
          query.push('WebApiKey=' + this.#WebApiKey);
          query.push('C=');
          return '?' + query.join('&');
        } else {
          throw new Error(TrustedShop.ERROR_TOKEN_REQUEST_FAILED + ' (Invalid JSON response)');
        }
      } else if (response.status === 400) {
        throw new Error(TrustedShop.ERROR_TOKEN_BAD_REQUEST + jsonBody.ErrorCode + ' - ' + jsonBody.ErrorMessage);
      } else {
        throw new Error(TrustedShop.ERROR_TOKEN_REQUEST_FAILED + ` (Status: ${response.status})`);
      }
    } catch (error) {
      if (error.name === 'AbortError' || error.code === 'ETIMEDOUT') { // Check for timeout errors
        throw new Error(TrustedShop.ERROR_TOKEN_REQUEST_TIMED_OUT);
      }
      throw new Error(TrustedShop.ERROR_TOKEN_REQUEST_FAILED + ` (${error.message})`);
    }
  }
}

export default TrustedShop;