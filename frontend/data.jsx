// Marketplace data — populated from API by api-bridge.jsx
// All arrays start empty and get hydrated from /api/v1 endpoints.

const CATEGORIES = [];
const PRODUCTS = [];
const ORDERS = [];
const CART_ITEMS = []; // legacy compat; real cart lives in window.MAYSS_STATE.cart

// Mock-only data for static dashboards (charts/regions/funnel)
const REGIONS = [
  { id: 'msk', ru: 'Москва', orders: 1284, share: 28.4 },
  { id: 'spb', ru: 'Санкт-Петербург', orders: 712, share: 15.7 },
  { id: 'ekb', ru: 'Екатеринбург', orders: 389, share: 8.6 },
  { id: 'nsk', ru: 'Новосибирск', orders: 341, share: 7.5 },
  { id: 'kzn', ru: 'Казань', orders: 298, share: 6.6 },
];

const REVENUE_30D = Array.from({ length: 30 }, (_, i) => {
  const base = 180000 + Math.sin(i / 3) * 40000 + Math.cos(i / 5) * 25000;
  const noise = (Math.sin(i * 7.3) * 0.5 + 0.5) * 30000;
  const trend = i * 2200;
  return {
    day: i + 1,
    label: `${i + 1} апр`,
    revenue: Math.round(base + noise + trend),
    orders: Math.round(40 + Math.sin(i / 4) * 15 + i * 0.6),
  };
});

const FUNNEL = [
  { stage: 'Показы', value: 482400, pct: 100 },
  { stage: 'Клики', value: 89720, pct: 18.6 },
  { stage: 'В корзине', value: 14380, pct: 3.0 },
  { stage: 'Покупка', value: 4892, pct: 1.01 },
];

const TRAFFIC = [
  { src: 'Поиск MAYSS', value: 42, color: '#3D5AFE' },
  { src: 'Прямые', value: 23, color: '#0E0E12' },
  { src: 'Реклама', value: 18, color: '#D6FF3D' },
  { src: 'Соцсети', value: 11, color: '#5B2A86' },
  { src: 'Партнёры', value: 6, color: '#00A86B' },
];

const SELLER_TOP = [];
const SELLER_KPIS = [];
const ADMIN_KPIS = [];
const SELLER_QUEUE = [];
const DISPUTES = [];

const formatRub = (n) => (Number(n) || 0).toLocaleString('ru-RU').replace(/,/g, ' ') + ' ₽';

window.MAYSS_DATA = {
  CATEGORIES, PRODUCTS, ORDERS, REGIONS, REVENUE_30D, FUNNEL, TRAFFIC,
  SELLER_TOP, SELLER_KPIS, ADMIN_KPIS, SELLER_QUEUE, DISPUTES, CART_ITEMS,
  formatRub,
};
