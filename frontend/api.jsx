const API_BASE = window.location.hostname === "localhost" ? "http://localhost:8000/api/v1" : "/mayss_market/api/v1";
const TOKEN_KEY = "mayss_token";

const API = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (t) => { localStorage.setItem(TOKEN_KEY, t); window.dispatchEvent(new Event("mayss-auth-changed")); },
  clearToken: () => { localStorage.removeItem(TOKEN_KEY); window.dispatchEvent(new Event("mayss-auth-changed")); },

  async request(path, options = {}) {
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    const token = API.getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(typeof err.detail === "string" ? err.detail : JSON.stringify(err.detail));
    }
    if (res.status === 204) return null;
    return res.json();
  },

  register: (d) => API.request("/auth/register", { method: "POST", body: JSON.stringify(d) }),
  login: (d) => API.request("/auth/login", { method: "POST", body: JSON.stringify(d) }),
  me: () => API.request("/auth/me"),

  listCategories: () => API.request("/categories"),
  listProducts: (params = {}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([_, v]) => v !== "" && v !== null && v !== undefined)).toString();
    return API.request(`/products${q ? "?" + q : ""}`);
  },
  getProduct: (id) => API.request(`/products/${id}`),
  listRecommendations: (limit = 8) => API.request(`/products/recommendations?limit=${limit}`),

  getCart: () => API.request("/cart"),
  addToCart: (product_id, quantity = 1) => API.request("/cart/items", { method: "POST", body: JSON.stringify({ product_id, quantity }) }),
  removeFromCart: (product_id) => API.request(`/cart/items/${product_id}`, { method: "DELETE" }),
  updateCartQuantity: (product_id, quantity) => API.request(`/cart/items/${product_id}?quantity=${quantity}`, { method: "PUT" }),

  createOrders: (address, opts = {}) => API.request("/orders", {
    method: "POST",
    body: JSON.stringify({
      address,
      promo_code: opts.promoCode || null,
      bonus_to_spend: opts.bonusToSpend || 0,
    }),
  }),
  previewPromo: (code) => API.request("/promos/preview", { method: "POST", body: JSON.stringify({ code }) }),
  bonusBalance: () => API.request("/bonuses/balance"),
  bonusTransactions: () => API.request("/bonuses/transactions"),
  adminListPromos: () => API.request("/admin/promos"),
  adminCreatePromo: (d) => API.request("/admin/promos", { method: "POST", body: JSON.stringify(d) }),
  sellerListPromos: () => API.request("/seller/promos"),
  sellerCreatePromo: (d) => API.request("/seller/promos", { method: "POST", body: JSON.stringify(d) }),
  listOrders: () => API.request("/orders"),
  getOrder: (id) => API.request(`/orders/${id}`),
  pay: (order_id, method = "card") => {
    const idempotency_key = `pay-${order_id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return API.request("/payments", { method: "POST", headers: { "Idempotency-Key": idempotency_key }, body: JSON.stringify({ order_id, method, idempotency_key }) });
  },

  createSellerProfile: (d) => API.request("/seller/profile", { method: "POST", body: JSON.stringify(d) }),
  getSellerProfile: () => API.request("/seller/profile"),
  updateSellerProfile: (d) => API.request("/seller/profile", { method: "PATCH", body: JSON.stringify(d) }),
  listSellerProducts: () => API.request("/seller/products"),
  createSellerProduct: (d) => API.request("/seller/products", { method: "POST", body: JSON.stringify(d) }),
  updateSellerProduct: (id, d) => API.request(`/seller/products/${id}`, { method: "PATCH", body: JSON.stringify(d) }),
  deleteSellerProduct: (id) => API.request(`/seller/products/${id}`, { method: "DELETE" }),
  listSellerOrders: () => API.request("/seller/orders"),
  updateSellerOrderStatus: (id, status) => API.request(`/seller/orders/${id}/status?status=${status}`, { method: "POST" }),
  sellerAnalytics: () => API.request("/seller/analytics"),

  listProductReviews: (product_id) => API.request(`/reviews/product/${product_id}`),
  createReview: (d) => API.request("/reviews", { method: "POST", body: JSON.stringify(d) }),

  listFavorites: () => API.request("/favorites"),
  toggleFavorite: (product_id) => API.request(`/favorites/toggle/${product_id}`, { method: "POST" }),

  listAddresses: () => API.request("/addresses"),
  createAddress: (d) => API.request("/addresses", { method: "POST", body: JSON.stringify(d) }),
  deleteAddress: (id) => API.request(`/addresses/${id}`, { method: "DELETE" }),
  setDefaultAddress: (id) => API.request(`/addresses/${id}/default`, { method: "POST" }),

  listCards: () => API.request("/cards"),
  createCard: (d) => API.request("/cards", { method: "POST", body: JSON.stringify(d) }),
  deleteCard: (id) => API.request(`/cards/${id}`, { method: "DELETE" }),
  setDefaultCard: (id) => API.request(`/cards/${id}/default`, { method: "POST" }),

  listTickets: () => API.request("/support/tickets"),
  getTicket: (id) => API.request(`/support/tickets/${id}`),
  createTicket: (d) => API.request("/support/tickets", { method: "POST", body: JSON.stringify(d) }),
  addTicketMessage: (id, body) => API.request(`/support/tickets/${id}/messages`, { method: "POST", body: JSON.stringify({ body }) }),
  closeTicket: (id) => API.request(`/support/tickets/${id}/close`, { method: "POST" }),

  confirmPickup: (orderId, code) => API.request(`/orders/${orderId}/confirm-pickup?code=${encodeURIComponent(code)}`, { method: "POST" }),

  adminStats: () => API.request("/admin/stats"),
  adminListProducts: (params = {}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([_, v]) => v !== "" && v !== null && v !== undefined)).toString();
    return API.request(`/admin/products${q ? "?" + q : ""}`);
  },
  adminModerateProduct: (id, approve, reason=null) => API.request(`/admin/products/${id}/moderate`, { method: "POST", body: JSON.stringify({ approve, reason }) }),
  adminSetProductStatus: (id, status) => API.request(`/admin/products/${id}/status?status=${status}`, { method: "POST" }),
  adminArchiveProduct: (id) => API.request(`/admin/products/${id}`, { method: "DELETE" }),
  adminListUsers: () => API.request("/admin/users"),
  adminListOrders: (limit = 100) => API.request(`/admin/orders?limit=${limit}`),
  adminOrderDetail: (id) => API.request(`/admin/orders/${id}`),
  adminForceOrderStatus: (id, status) => API.request(`/admin/orders/${id}/status?status=${status}`, { method: "POST" }),
  adminToggleUser: (id) => API.request(`/admin/users/${id}/toggle`, { method: "POST" }),
  adminSellers: () => API.request("/admin/sellers"),
  adminModerateSeller: (id, approve, reason=null) => API.request(`/admin/sellers/${id}/moderate`, { method: "POST", body: JSON.stringify({ approve, reason }) }),
  adminSellerAnalytics: (id) => API.request(`/admin/sellers/${id}/analytics`),
  adminUserAnalytics: (id) => API.request(`/admin/users/${id}/analytics`),
  adminTickets: () => API.request("/admin/tickets"),
  adminReplyTicket: (id, body) => API.request(`/admin/tickets/${id}/reply`, { method: "POST", body: JSON.stringify({ body }) }),
  adminCloseTicket: (id) => API.request(`/admin/tickets/${id}/close`, { method: "POST" }),

  getPublicShop: (id) => API.request(`/public/shops/${id}`),
  getPublicUser: (id) => API.request(`/public/users/${id}`),
  getNotifStatus: () => API.request("/notifications/status"),
  getPushPublicKey: () => API.request("/notifications/push/public-key"),
  subscribePush: (sub) => API.request("/notifications/push/subscribe", { method: "POST", body: JSON.stringify(sub) }),
  unsubscribePush: () => API.request("/notifications/push/unsubscribe", { method: "DELETE" }),
  getTelegramLink: () => API.request("/notifications/telegram/link-url"),
  unlinkTelegram: () => API.request("/notifications/telegram/unlink", { method: "POST" }),
};

window.API = API;
window.MAYSS_RUNTIME = {
  apiBase: API_BASE,
  grafanaBase: `${location.protocol}//${location.hostname}:3000`,
  publicWebhookUrl: `${location.origin}/api/v1/notifications/telegram/webhook`,
};

window.toast = function (msg, type = "info") {
  const el = document.createElement("div");
  el.textContent = msg;
  el.style.cssText = `
    position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
    background: ${type === "error" ? "#d63b3b" : type === "success" ? "#0a7c3a" : "#0E0E12"};
    color: white; padding: 12px 20px; border-radius: 999px; z-index: 9999;
    font-size: 14px; box-shadow: 0 8px 24px rgba(0,0,0,0.2); font-family: inherit;
    animation: fadeUp .3s ease;
  `;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2800);
};

window.MAYSS_STATE = { cart: { items: [], total: 0 }, favorites: new Set(), me: null };

window.refreshCart = async function () {
  if (!API.getToken()) { window.MAYSS_STATE.cart = { items: [], total: 0 }; window.dispatchEvent(new Event("mayss-cart-changed")); return; }
  try { window.MAYSS_STATE.cart = await API.getCart(); window.dispatchEvent(new Event("mayss-cart-changed")); } 
  catch (e) { window.MAYSS_STATE.cart = { items: [], total: 0 }; window.dispatchEvent(new Event("mayss-cart-changed")); }
};

window.refreshFavorites = async function () {
  if (!API.getToken()) { window.MAYSS_STATE.favorites = new Set(); window.dispatchEvent(new Event("mayss-favorites-changed")); return; }
  try { const favs = await API.listFavorites(); window.MAYSS_STATE.favorites = new Set(favs.map((f) => f.product_id)); window.dispatchEvent(new Event("mayss-favorites-changed")); } 
  catch (e) { window.MAYSS_STATE.favorites = new Set(); window.dispatchEvent(new Event("mayss-favorites-changed")); }
};

window.refreshMe = async function () {
  if (!API.getToken()) { window.MAYSS_STATE.me = null; window.dispatchEvent(new Event("mayss-me-changed")); return; }
  try { window.MAYSS_STATE.me = await API.me(); } catch (e) { window.MAYSS_STATE.me = null; API.clearToken(); }
  window.dispatchEvent(new Event("mayss-me-changed"));
};

window.addEventListener("mayss-auth-changed", () => { window.refreshMe(); window.refreshCart(); window.refreshFavorites(); });

window.useCart = function () {
  const [cart, setCart] = React.useState(window.MAYSS_STATE.cart);
  React.useEffect(() => { const h = () => setCart({ ...window.MAYSS_STATE.cart }); window.addEventListener("mayss-cart-changed", h); return () => window.removeEventListener("mayss-cart-changed", h); }, []);
  return cart;
};
window.useFavorites = function () {
  const [favs, setFavs] = React.useState(window.MAYSS_STATE.favorites);
  React.useEffect(() => { const h = () => setFavs(new Set(window.MAYSS_STATE.favorites)); window.addEventListener("mayss-favorites-changed", h); return () => window.removeEventListener("mayss-favorites-changed", h); }, []);
  return favs;
};
window.useMe = function () {
  const [me, setMe] = React.useState(window.MAYSS_STATE.me);
  React.useEffect(() => { const h = () => setMe(window.MAYSS_STATE.me); window.addEventListener("mayss-me-changed", h); return () => window.removeEventListener("mayss-me-changed", h); }, []);
  return me;
};
window.parseHashQuery = function () {
  const h = location.hash.slice(1);
  const qIdx = h.indexOf("?");
  if (qIdx < 0) return {};
  const params = new URLSearchParams(h.slice(qIdx + 1));
  return Object.fromEntries(params.entries());
};
// commit 29: refactor: move component comment to header
