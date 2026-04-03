// Bridge: hydrate window.MAYSS_DATA with live API data before screens render.
// Listens for new orders/auth changes and refreshes accordingly.

const STATUS_LABELS = {
  created: 'Создан', paid: 'Оплачен', assembling: 'Сборка',
  shipped: 'В пути', delivered: 'Доставлен',
  cancelled: 'Отменён', returned: 'Возврат',
};

// Map API product to legacy mock shape used everywhere in screens
function mapProduct(p) {
  return {
    id: p.id,
    ru: p.title,
    en: p.title,
    brand: p.brand || 'MAYSS',
    price: Number(p.price),
    old: p.old_price ? Number(p.old_price) : 0,
    rating: Number(p.rating) || 4.5,
    reviews: p.reviews_count || 0,
    cat: String(p.category_id),
    tag: p.old_price ? `−${Math.round((1 - Number(p.price) / Number(p.old_price)) * 100)}%` : (p.reviews_count > 50 ? 'Хит' : 'Новинка'),
    hue: ((p.id * 37) % 360),
    image_url: p.image_url,
    stock: p.stock,
    description: p.description,
    seller_id: p.seller_id,
    category_id: p.category_id,
  };
}

function mapOrder(o) {
  return {
    id: `M-${String(o.id).padStart(8, '0')}`,
    _raw_id: o.id,
    date: new Date(o.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' }),
    status: STATUS_LABELS[o.status] || o.status,
    _status_raw: o.status,
    items: o.items.length,
    sum: Number(o.total),
    eta: o.status === 'shipped' ? 'через 1–2 дня' : '—',
    items_full: o.items,
    address: o.address,
    seller_id: o.seller_id,
  };
}

async function hydrate() {
  try {
    const [prodsResp, cats] = await Promise.all([
      window.API.listProducts({ page_size: 50 }),
      window.API.listCategories(),
    ]);

    const products = (prodsResp.items || []).map(mapProduct);
    window.MAYSS_DATA.PRODUCTS.length = 0;
    window.MAYSS_DATA.PRODUCTS.push(...products);

    const categories = cats.map((c) => ({
      id: String(c.id),
      ru: c.name,
      en: c.slug,
      count: '—',
      hue: ((c.id * 47) % 360),
    }));
    window.MAYSS_DATA.CATEGORIES.length = 0;
    window.MAYSS_DATA.CATEGORIES.push(...categories);

    if (window.API.getToken()) {
      try {
        const orders = await window.API.listOrders();
        window.MAYSS_DATA.ORDERS.length = 0;
        window.MAYSS_DATA.ORDERS.push(...orders.map(mapOrder));
      } catch (e) {}
      await window.refreshCart();
      await window.refreshFavorites();
      await window.refreshMe();
    }

    window.dispatchEvent(new Event('mayss-data-updated'));
  } catch (e) {
    console.error('[bridge] hydration failed:', e);
    window.toast('Не удалось загрузить данные с сервера', 'error');
  }
}

// Refresh orders whenever cart/orders may have changed
window.refreshOrders = async function () {
  if (!window.API.getToken()) {
    window.MAYSS_DATA.ORDERS.length = 0;
    window.dispatchEvent(new Event('mayss-orders-changed'));
    return;
  }
  try {
    const orders = await window.API.listOrders();
    window.MAYSS_DATA.ORDERS.length = 0;
    window.MAYSS_DATA.ORDERS.push(...orders.map(mapOrder));
    window.dispatchEvent(new Event('mayss-orders-changed'));
  } catch (e) {}
};

// React hook to re-render when products/categories/orders change
window.useLiveData = function () {
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const h = () => setTick((t) => t + 1);
    window.addEventListener('mayss-data-updated', h);
    window.addEventListener('mayss-orders-changed', h);
    return () => {
      window.removeEventListener('mayss-data-updated', h);
      window.removeEventListener('mayss-orders-changed', h);
    };
  }, []);
};

window.MAPPERS = { mapProduct, mapOrder, STATUS_LABELS };

// Block initial render until data is loaded
window.__bridgeReady = hydrate();
