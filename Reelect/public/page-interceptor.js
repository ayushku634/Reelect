(function () {
  if (window.__reelFinderInterceptor) return;
  window.__reelFinderInterceptor = true;

  console.log('[Reel Finder] page interceptor injected');

  // Intercept fetch calls
  const originalFetch = window.fetch;
  window.fetch = async function (input, init) {
    const resp = await originalFetch.apply(this, arguments);
    try {
      const url = typeof input === 'string' ? input : input.url || '';
      // Intercept GraphQL and API calls that might contain reel data
      if (url.includes('/graphql') || url.includes('/api/v1/')) {
        const cloned = resp.clone();
        const text = await cloned.text();
        console.log('[Reel Finder] intercepted fetch:', url, resp.status, 'response length:', text.length);
        window.dispatchEvent(new CustomEvent('reelFinderApi', {
          detail: {
            url,
            body: text,
            status: resp.status,
            method: init?.method || 'GET',
            type: 'fetch'
          }
        }));
      }
    } catch (err) {
      console.error('[Reel Finder] fetch interception error:', err);
    }
    return resp;
  };

  // Intercept XMLHttpRequest calls
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url) {
    this._method = method;
    this._url = url;
    return originalXHROpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function (body) {
    this.addEventListener('load', function () {
      if (this._url && (this._url.includes('/graphql') || this._url.includes('/api/v1/'))) {
        console.log('[Reel Finder] intercepted XHR:', this._url, this.status, 'response length:', this.responseText.length);
        window.dispatchEvent(new CustomEvent('reelFinderApi', {
          detail: {
            url: this._url,
            body: this.responseText,
            status: this.status,
            method: this._method,
            type: 'xhr'
          }
        }));
      }
    });
    return originalXHRSend.apply(this, arguments);
  };

  console.log('[Reel Finder] network interception active');
})();