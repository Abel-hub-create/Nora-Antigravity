const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ApiClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;

    // Timeout par défaut de 30s, mais peut être surchargé via options.timeout
    const timeout = options.timeout || 30000;

    const config = {
      ...options,
      credentials: 'include', // Important for cookies
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    // Add access token if available
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    // Ajouter AbortController pour le timeout
    const controller = new AbortController();
    config.signal = controller.signal;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, config);
      clearTimeout(timeoutId);

      // Handle 401 - try to refresh token (but not for auth endpoints)
      const isAuthEndpoint = endpoint.startsWith('/auth/');

      if (response.status === 401 && !options._retry && !isAuthEndpoint) {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          // Retry the original request
          return this.request(endpoint, { ...options, _retry: true });
        }
        // Refresh failed, redirect to login
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
        throw new Error('Session expired');
      }

      const data = await response.json();

      if (!response.ok) {
        throw { response: { status: response.status, data } };
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw { response: { status: 408, data: { error: 'La requête a pris trop de temps. Veuillez réessayer.' } } };
      }
      if (error.response) {
        throw error;
      }
      throw { response: { status: 500, data: { error: 'Erreur de connexion au serveur' } } };
    }
  }

  async refreshToken() {
    try {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      localStorage.setItem('accessToken', data.accessToken);
      return true;
    } catch {
      return false;
    }
  }

  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  post(endpoint, body, options = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
      ...options,
    });
  }

  put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  patch(endpoint, body) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // Upload avec FormData (pour audio, images, etc.)
  async upload(endpoint, formData) {
    const url = `${this.baseURL}${endpoint}`;

    const config = {
      method: 'POST',
      credentials: 'include',
      body: formData,
      // Pas de Content-Type header pour FormData (le navigateur le gère)
    };

    // Add access token if available
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      config.headers = { Authorization: `Bearer ${accessToken}` };
    }

    try {
      console.log('[API Upload] Sending to:', url);
      const response = await fetch(url, config);
      console.log('[API Upload] Response status:', response.status);

      // Handle 401 - try to refresh token
      if (response.status === 401) {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          // Update token in headers and retry
          config.headers = { Authorization: `Bearer ${localStorage.getItem('accessToken')}` };
          const retryResponse = await fetch(url, config);
          const data = await retryResponse.json();
          if (!retryResponse.ok) {
            throw { response: { status: retryResponse.status, data } };
          }
          return data;
        }
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
        throw new Error('Session expired');
      }

      // Try to parse response as JSON
      const text = await response.text();
      console.log('[API Upload] Response text:', text.substring(0, 200));

      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('[API Upload] JSON parse error:', parseError);
        throw { response: { status: response.status, data: { error: 'Réponse invalide du serveur' } } };
      }

      if (!response.ok) {
        throw { response: { status: response.status, data } };
      }

      return data;
    } catch (error) {
      console.error('[API Upload] Error:', error);
      if (error.response) {
        throw error;
      }
      throw { response: { status: 500, data: { error: 'Erreur de connexion au serveur: ' + (error.message || 'Unknown') } } };
    }
  }
}

export const api = new ApiClient(API_URL);
export default api;
