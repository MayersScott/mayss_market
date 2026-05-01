// Admin panel — dark theme, real product/order/user management
const Admin = ({ onNav }) => {
  const { formatRub } = window.MAYSS_DATA;
  const { Icon } = window.MAYSS;
  const grafanaBase = window.MAYSS_RUNTIME.grafanaBase;
  const me = window.useMe();

  const [section, setSection] = React.useState('overview');
  const [stats, setStats] = React.useState(null);
  const [products, setProducts] = React.useState({ items: [], total: 0 });
  const [productFilter, setProductFilter] = React.useState({ status: '', q: '' });
  const [users, setUsers] = React.useState([]);
  const [orders, setOrders] = React.useState([]);
  const [sellers, setSellers] = React.useState([]);
  const [tickets, setTickets] = React.useState([]);
  const [selectedOrder, setSelectedOrder] = React.useState(null);
  const [selectedSellerAnalytics, setSelectedSellerAnalytics] = React.useState(null);
  const [selectedUserAnalytics, setSelectedUserAnalytics] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  const dark = {
    bg: '#0E0E12', paper: '#16161D', line: '#2A2A33',
    ink: '#FFFFFF', ink2: '#A0A0AA', ink3: '#70707A', ink4: '#50505A',
  };

  const refresh = async () => {
    try {
      const [s, u, o, p, sells, tkts] = await Promise.all([
        window.API.adminStats(),
        window.API.adminListUsers(),
        window.API.adminListOrders(50),
        window.API.adminListProducts({ status: productFilter.status, q: productFilter.q, page_size: 100 }),
        window.API.adminSellers(),
        window.API.adminTickets(),
      ]);
      setStats(s); setUsers(u); setOrders(o); setProducts(p); 
      setSellers(sells); setTickets(tkts);
    } catch (e) {
      window.toast(e.message, 'error');
      if (String(e.message).toLowerCase().includes('admin')) onNav('auth');
    } finally { setLoading(false); }
  };

  React.useEffect(() => {
    if (!window.API.getToken()) { onNav('auth'); return; }
    window.refreshMe();
    refresh();
  }, []);

  React.useEffect(() => {
    if (loading) return;
    window.API.adminListProducts({ status: productFilter.status, q: productFilter.q, page_size: 100 })
      .then(setProducts).catch((e) => window.toast(e.message, 'error'));
  }, [productFilter.status, productFilter.q]);

  const moderateProd = async (id, approve) => {
    let reason = null;
    if (!approve) {
      reason = prompt("Укажите причину отклонения товара:");
      if (!reason) return;
    }
    try {
      await window.API.adminModerateProduct(id, approve, reason);
      window.toast(approve ? 'Товар одобрен' : 'Товар отклонён', 'success');
      refresh();
    } catch (e) { window.toast(e.message, 'error'); }
  };

  const moderateShop = async (id, approve) => {
    let reason = null;
    if (!approve) {
      reason = prompt("Укажите причину отклонения магазина:");
      if (!reason) return;
    }
    try {
      await window.API.adminModerateSeller(id, approve, reason);
      window.toast(approve ? 'Магазин одобрен' : 'Магазин отклонён', 'success');
      refresh();
    } catch (e) { window.toast(e.message, 'error'); }
  };

  const setProductStatus = async (id, status) => {
    try {
      await window.API.adminSetProductStatus(id, status);
      window.toast('Статус товара изменён', 'success');
      refresh();
    } catch (e) { window.toast(e.message, 'error'); }
  };

  const setOrderStatus = async (id, status) => {
    try {
      await window.API.adminForceOrderStatus(id, status);
      window.toast('Статус заказа изменен', 'success');
      refresh();
      if (selectedOrder?.id === id) {
        setSelectedOrder(await window.API.adminOrderDetail(id));
      }
    } catch (e) { window.toast(e.message, 'error'); }
  };

  const archive = async (id) => {
    if (!confirm('Архивировать товар?')) return;
    try {
      await window.API.adminArchiveProduct(id);
      window.toast('Архивировано', 'success');
      refresh();
    } catch (e) { window.toast(e.message, 'error'); }
  };

  const toggleUser = async (id) => {
    try {
      await window.API.adminToggleUser(id);
      window.toast('Статус пользователя обновлён', 'success');
      refresh();
    } catch (e) { window.toast(e.message, 'error'); }
  };

  if (loading || !me) return <div style={{ padding: 64, textAlign: 'center', background: dark.bg, color: 'white', minHeight: '100vh' }}>Загрузка...</div>;
  if (me.role !== 'admin') return <div style={{ padding: 64, textAlign: 'center', minHeight: '100vh' }}><h1>Доступ запрещён</h1><button className="btn btn-primary" onClick={() => onNav('landing')}>На главную</button></div>;

  const pendingProducts = products.items.filter(p => p.status === 'pending');
  const allProducts = products.items.filter(p => p.status !== 'pending');
  
  const pendingSellers = sellers.filter(s => !s.is_verified && !s.rejection_reason);
  const rejectedSellers = sellers.filter(s => !s.is_verified && s.rejection_reason);
  const allSellers = sellers.filter(s => s.is_verified);

  const nav = [
    { id: 'overview', label: 'Обзор', icon: 'chart' },
    { id: 'products', label: 'Товары', icon: 'box', badge: pendingProducts.length || null, hl: pendingProducts.length > 0 },
    { id: 'shops', label: 'Магазины', icon: 'shield', badge: pendingSellers.length || null, hl: pendingSellers.length > 0 },
    { id: 'tickets', label: 'Тикеты (SLA)', icon: 'msg', badge: tickets.filter(t => t.status === 'open').length || null, hl: tickets.filter(t => t.status === 'open').length > 0 },
    { id: 'orders', label: 'Заказы', icon: 'pkg', badge: stats?.orders_total },
    { id: 'users', label: 'Пользователи', icon: 'user', badge: stats?.users_total },
  ];

  const STATUS_LABEL = window.MAPPERS.STATUS_LABELS;
  const initials = (me.full_name || 'A').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const productStatusLabel = { draft: 'Черновик', pending: 'Модерация', active: 'Активен', rejected: 'Отклонён', archived: 'Архив' };
  const productStatusColor = { active: '#0a7c3a', pending: '#3D5AFE', rejected: '#d63b3b', archived: '#70707A', draft: '#70707A' };
  const openOrder = async (id) => {
    try {
      setSelectedOrder(await window.API.adminOrderDetail(id));
    } catch (e) {
      window.toast(e.message, 'error');
    }
  };
  const openSellerAnalytics = async (id) => {
    try {
      setSelectedSellerAnalytics(await window.API.adminSellerAnalytics(id));
    } catch (e) {
      window.toast(e.message, 'error');
    }
  };
  const openUserAnalytics = async (id) => {
    try {
      setSelectedUserAnalytics(await window.API.adminUserAnalytics(id));
    } catch (e) {
      window.toast(e.message, 'error');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: dark.bg, color: dark.ink, display: 'grid', gridTemplateColumns: '240px 1fr' }}>
      <aside style={{ background: dark.paper, borderRight: `1px solid ${dark.line}`, padding: '20px 14px', position: 'sticky', top: 0, height: '100vh', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <a onClick={() => onNav('landing')} style={{ cursor: 'pointer', padding: '4px 8px', marginBottom: 4 }}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><svg width="24" height="24" viewBox="0 0 32 32" fill="none"><rect x="2" y="2" width="28" height="28" rx="8" fill="var(--brand)" /><path d="M9 22V10l7 9 7-9v12" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg><span style={{ fontWeight: 700, fontSize: 17, color: dark.ink }}>MAYSS</span></div></a>
        <div style={{ padding: '4px 8px 16px', fontSize: 11, color: dark.ink4, textTransform: 'uppercase', letterSpacing: '.1em' }}>ADMIN</div>
        <div style={{ padding: '12px 14px', background: dark.bg, borderRadius: 12, marginBottom: 20, border: `1px solid ${dark.line}` }}><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 12 }}>{initials}</div><div><div style={{ fontWeight: 600, fontSize: 13 }}>{me.full_name}</div><div style={{ fontSize: 11, color: dark.ink3 }}>Superuser</div></div></div></div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {nav.map((n) => (
            <button key={n.id} onClick={() => setSection(n.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: section === n.id ? dark.bg : 'transparent', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: section === n.id ? 600 : 400, color: section === n.id ? dark.ink : dark.ink2, cursor: 'pointer', textAlign: 'left' }}>
              <Icon name={n.icon} size={16} color={section === n.id ? dark.ink : dark.ink2} /><span style={{ flex: 1 }}>{n.label}</span>
              {n.badge !== undefined && n.badge !== null && (<span style={{ background: n.hl ? '#d63b3b' : 'rgba(255,255,255,0.1)', color: 'white', fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 8 }}>{n.badge}</span>)}
            </button>
          ))}
        </nav>
        <div style={{ marginTop: 'auto', paddingTop: 16 }}><button onClick={() => { window.API.clearToken(); window.toast('Вы вышли'); onNav('landing'); }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', width: '100%', background: 'transparent', border: 'none', fontSize: 13, color: dark.ink3, cursor: 'pointer' }}><Icon name="arrR" size={16} color={dark.ink3} /> Выйти</button></div>
      </aside>

      <main style={{ padding: '32px 40px 64px' }}>
        {section === 'overview' && stats && (
          <>
            <div style={{ marginBottom: 32 }}><div style={{ fontSize: 13, color: dark.ink3, marginBottom: 6 }}>Платформа MAYSS</div><h1 style={{ fontSize: 56, margin: 0, fontWeight: 700 }}>Обзор</h1></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 32 }}>
              {[{ l: 'GMV', v: formatRub(Number(stats.gmv)) }, { l: 'Доход платформы', v: formatRub(Number(stats.marketplace_revenue)) }, { l: 'Средняя доставка', v: stats.avg_delivery_hours ? `${stats.avg_delivery_hours} ч` : '—' }, { l: 'Пользователей', v: stats.users_total }, { l: 'Проверенных магазинов', v: stats.verified_sellers_total }, { l: 'Ждут модерации', v: stats.products_pending, hl: stats.products_pending > 0 }].map((k) => (
                <div key={k.l} style={{ padding: 24, borderRadius: 12, background: k.hl ? 'rgba(214, 59, 59, 0.12)' : 'rgba(255,255,255,0.04)', border: '1px solid ' + (k.hl ? 'rgba(214, 59, 59, 0.4)' : dark.line) }}><div style={{ fontSize: 13, color: dark.ink3, marginBottom: 10 }}>{k.l}</div><div style={{ fontSize: 28, fontWeight: 700 }}>{k.v}</div></div>
              ))}
            </div>
            <div style={{ borderRadius: 16, overflow: 'hidden', border: `1px solid ${dark.line}`, background: dark.paper, height: 700 }}>
              <iframe src={`${grafanaBase}/d/admin/mayss-admin-analytics?orgId=1&kiosk=tv&theme=dark`} width="100%" height="100%" frameBorder="0"></iframe>
            </div>
          </>
        )}

        {section === 'products' && (
          <>
            <h1 style={{ fontSize: 48, margin: '0 0 8px', fontWeight: 700 }}>Товары</h1>

            {/* БЛОК 1: ОЖИДАЮТ МОДЕРАЦИИ */}
            <h3 style={{ marginTop: 24, marginBottom: 16, color: dark.ink2 }}>Ожидают модерации ({pendingProducts.length})</h3>
            {pendingProducts.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', background: dark.paper, borderRadius: 16, color: dark.ink3 }}><Icon name="check" size={32} color="#0a7c3a" /><p>Очередь пуста</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 48 }}>
                {pendingProducts.map((p) => (
                  <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '80px 1fr auto auto auto', gap: 16, alignItems: 'center', padding: 16, background: dark.paper, borderRadius: 12, border: `1px solid ${dark.line}` }}>
                    <div style={{ width: 80, height: 80, borderRadius: 8, background: dark.bg, overflow: 'hidden' }}>{p.image_url ? <img src={p.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: dark.ink4, fontSize: 11 }}>нет</div>}</div>
                    <div><div style={{ fontWeight: 600, cursor: 'pointer', marginBottom: 4 }} onClick={() => { location.hash = `product?id=${p.id}`; }}>{p.title}</div><div style={{ fontSize: 13, color: dark.ink3 }}>{p.brand || '—'} · {formatRub(Number(p.price))} · {p.stock} шт</div></div>
                    <a onClick={() => { location.hash = `product?id=${p.id}`; }} style={{ fontSize: 13, color: dark.ink3, cursor: 'pointer', textDecoration: 'underline' }}>Смотреть</a>
                    <button onClick={() => moderateProd(p.id, true)} style={{ padding: '8px 16px', background: '#0a7c3a', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Одобрить</button>
                    <button onClick={() => moderateProd(p.id, false)} style={{ padding: '8px 16px', background: 'transparent', color: '#ff8080', border: '1px solid rgba(214, 59, 59, 0.4)', borderRadius: 8, cursor: 'pointer' }}>Отклонить</button>
                  </div>
                ))}
              </div>
            )}

            {/* БЛОК 2: ВСЕ ТОВАРЫ */}
            <h3 style={{ marginTop: 24, marginBottom: 16, color: dark.ink2 }}>Все товары</h3>
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, padding: 16, background: dark.paper, borderRadius: 12, border: `1px solid ${dark.line}`, alignItems: 'center' }}>
              <input placeholder="Поиск по названию" value={productFilter.q} onChange={(e) => setProductFilter({ ...productFilter, q: e.target.value })} style={{ flex: 1, padding: 10, background: dark.bg, border: `1px solid ${dark.line}`, borderRadius: 8, color: dark.ink, fontFamily: 'inherit', fontSize: 14 }} />
              <select value={productFilter.status} onChange={(e) => setProductFilter({ ...productFilter, status: e.target.value })} style={{ padding: 10, background: dark.bg, border: `1px solid ${dark.line}`, borderRadius: 8, color: dark.ink, fontFamily: 'inherit', fontSize: 14 }}>
                <option value="">Все статусы</option><option value="active">Активные</option><option value="pending">На модерации</option><option value="rejected">Отклонённые</option><option value="archived">В архиве</option><option value="draft">Черновики</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {allProducts.map((p) => (
                <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '50px 60px 1fr 90px 90px 120px auto', gap: 12, alignItems: 'center', padding: 12, background: dark.paper, borderRadius: 8, border: `1px solid ${dark.line}` }}>
                  <span style={{ fontSize: 12, color: dark.ink4, fontFamily: 'monospace' }}>#{p.id}</span>
                  <div style={{ width: 50, height: 50, borderRadius: 6, background: dark.bg, overflow: 'hidden' }}>{p.image_url && <img src={p.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, cursor: 'pointer' }} onClick={() => { location.hash = `product?id=${p.id}`; }}>{p.title}</div>
                    {p.status === 'rejected' && p.rejection_reason && <div style={{ fontSize: 11, color: '#ff8080', marginTop: 2 }}>Причина: {p.rejection_reason}</div>}
                  </div>
                  <span style={{ fontSize: 13 }}>{formatRub(Number(p.price))}</span><span style={{ fontSize: 13, color: dark.ink3 }}>{p.stock} шт</span>
                  <select value={p.status} onChange={(e) => setProductStatus(p.id, e.target.value)} style={{ padding: '6px 8px', background: dark.bg, border: `1px solid ${dark.line}`, borderRadius: 6, color: productStatusColor[p.status] }}>
                    {Object.entries(productStatusLabel).map(([v, l]) => (<option key={v} value={v}>{l}</option>))}
                  </select>
                  <button onClick={() => archive(p.id)} style={{ background: 'transparent', border: 'none', color: dark.ink3, cursor: 'pointer' }}><Icon name="trash" size={14} /></button>
                </div>
              ))}
            </div>
          </>
        )}

        {section === 'shops' && (
          <>
            <h1 style={{ fontSize: 48, margin: '0 0 8px', fontWeight: 700 }}>Магазины</h1>

            {/* БЛОК 1: ОЖИДАЮТ МОДЕРАЦИИ */}
            <h3 style={{ marginTop: 24, marginBottom: 16, color: dark.ink2 }}>Новые магазины на проверке ({pendingSellers.length})</h3>
            {pendingSellers.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', background: dark.paper, borderRadius: 16, color: dark.ink3 }}><Icon name="check" size={32} color="#0a7c3a" /><p>Очередь пуста</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 48 }}>
                {pendingSellers.map(s => (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, background: dark.paper, borderRadius: 12, border: `1px solid ${dark.line}` }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 16, cursor: 'pointer' }} onClick={() => openSellerAnalytics(s.id)}>{s.shop_name}</div>
                      <div style={{ fontSize: 13, color: dark.ink3, marginTop: 4 }}>Описание: {s.description || '—'}</div>
                      <div style={{ fontSize: 12, color: dark.ink4, marginTop: 4 }}>Создан: {new Date(s.created_at).toLocaleString('ru-RU')} · <a onClick={() => location.hash = `shop?id=${s.id}`} style={{ color: dark.ink2, cursor: 'pointer' }}>публичная страница</a></div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => moderateShop(s.id, true)} style={{ padding: '8px 16px', background: '#0a7c3a', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Одобрить</button>
                      <button onClick={() => moderateShop(s.id, false)} style={{ padding: '8px 16px', background: 'transparent', color: '#ff8080', border: '1px solid rgba(214, 59, 59, 0.4)', borderRadius: 8, cursor: 'pointer' }}>Отклонить</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {rejectedSellers.length > 0 && (
              <>
                <h3 style={{ marginTop: 24, marginBottom: 16, color: '#ff8080' }}>Отклонённые ({rejectedSellers.length})</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 32 }}>
                  {rejectedSellers.map(s => (
                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, background: dark.paper, borderRadius: 12, border: '1px solid rgba(214,59,59,0.35)' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{s.shop_name}</div>
                        <div style={{ fontSize: 13, color: '#ff8080', marginTop: 4 }}>{s.rejection_reason}</div>
                      </div>
                      <button onClick={() => moderateShop(s.id, true)} style={{ padding: '8px 16px', background: '#0a7c3a', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Одобрить повторно</button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* БЛОК 2: ВСЕ МАГАЗИНЫ */}
            <h3 style={{ marginTop: 24, marginBottom: 16, color: dark.ink2 }}>Верифицированные магазины</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {allSellers.map((s) => (
                <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 140px auto', gap: 16, alignItems: 'center', padding: 12, background: dark.paper, borderRadius: 8, border: `1px solid ${dark.line}` }}>
                  <span style={{ fontSize: 12, color: dark.ink4 }}>#{s.id}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, cursor: 'pointer' }} onClick={() => openSellerAnalytics(s.id)}>{s.shop_name}</div>
                    {!s.is_verified && s.rejection_reason && <div style={{ fontSize: 11, color: '#ff8080', marginTop: 2 }}>Отклонен: {s.rejection_reason}</div>}
                    <div style={{ fontSize: 11, color: dark.ink3, marginTop: 4 }}><a onClick={() => location.hash = `shop?id=${s.id}`} style={{ cursor: 'pointer', color: dark.ink2 }}>Открыть публичную страницу</a></div>
                  </div>
                  <span style={{ fontSize: 12, padding: '4px 10px', background: dark.bg, borderRadius: 999, textAlign: 'center', color: s.is_verified ? '#0a7c3a' : '#ff8080' }}>
                    {s.is_verified ? 'Одобрен' : 'Отклонен'}
                  </span>
                  <button onClick={() => moderateShop(s.id, !s.is_verified)} style={{ padding: '6px 12px', background: dark.bg, border: `1px solid ${dark.line}`, borderRadius: 8, color: dark.ink, cursor: 'pointer', fontSize: 12 }}>
                    {s.is_verified ? 'Заблокировать' : 'Одобрить'}
                  </button>
                </div>
              ))}
            </div>
            {selectedSellerAnalytics && (
              <div style={{ marginTop: 24, padding: 20, background: dark.paper, borderRadius: 12, border: `1px solid ${dark.line}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <h3 style={{ margin: 0 }}>Аналитика магазина: {selectedSellerAnalytics.shop_name}</h3>
                  <button onClick={() => setSelectedSellerAnalytics(null)} style={{ background: 'transparent', border: 'none', color: dark.ink3, cursor: 'pointer' }}>Закрыть</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
                  {[['Оборот', formatRub(Number(selectedSellerAnalytics.turnover))], ['Выручка', formatRub(Number(selectedSellerAnalytics.revenue))], ['Заказы', selectedSellerAnalytics.orders_total], ['Средняя доставка', selectedSellerAnalytics.avg_delivery_hours ? `${selectedSellerAnalytics.avg_delivery_hours} ч` : '—']].map(([label, value]) => (
                    <div key={label} style={{ padding: 16, borderRadius: 10, background: dark.bg, border: `1px solid ${dark.line}` }}><div style={{ fontSize: 12, color: dark.ink3 }}>{label}</div><div style={{ fontSize: 22, fontWeight: 700, marginTop: 6 }}>{value}</div></div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {section === 'tickets' && (
          <>
            <h1 style={{ fontSize: 48, margin: '0 0 8px', fontWeight: 700 }}>Поддержка</h1>
            <p style={{ color: dark.ink3, marginBottom: 24 }}>Тикеты отсортированы по статусу и реальному времени ожидания ответа (SLA от последнего сообщения)</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {tickets.length === 0 ? (
                 <div style={{ padding: 64, textAlign: 'center', background: dark.paper, borderRadius: 16, color: dark.ink3 }}>Обращений нет</div>
              ) : tickets.map((t) => {
                // SLA Реальное: считаем от ПОСЛЕДНЕГО сообщения в истории
                const lastMsgDate = t.messages.length > 0 ? t.messages[t.messages.length - 1].created_at : t.created_at;
                const diffMs = Date.now() - new Date(lastMsgDate).getTime();
                const waitMins = Math.floor(diffMs / 60000);
                const waitHours = Math.floor(waitMins / 60);
                const slaDanger = t.status === 'open' && waitHours >= 24;
                
                return (
                  <div key={t.id} style={{ padding: 16, background: dark.paper, borderRadius: 12, border: `1px solid ${slaDanger ? '#ff8080' : dark.line}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 16 }}>{t.subject} <span style={{ fontSize: 12, color: dark.ink4 }}>#TKT-{t.id}</span></div>
                        <div style={{ fontSize: 13, color: dark.ink3, marginTop: 4 }}>Создал юзер #{t.user_id} · {new Date(t.created_at).toLocaleString('ru-RU')}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ display: 'inline-block', padding: '4px 10px', background: t.status === 'open' ? '#3D5AFE' : dark.bg, borderRadius: 999, fontSize: 12 }}>{t.status === 'open' ? 'Открыт' : t.status === 'answered' ? 'Отвечен' : 'Закрыт'}</span>
                        {t.status === 'open' && (
                          <div style={{ fontSize: 12, color: slaDanger ? '#ff8080' : dark.ink3, marginTop: 6, fontWeight: slaDanger ? 600 : 400 }}>
                            ⌛ Ожидает: {waitHours} ч. {waitMins % 60} мин.
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* ПОЛНАЯ ИСТОРИЯ ЧАТА В ТИКЕТЕ */}
                    <div style={{ background: dark.bg, padding: 12, borderRadius: 8, marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
                      {t.messages.length === 0 ? <span style={{ color: dark.ink4, fontSize: 13 }}>Нет сообщений</span> : t.messages.map(m => {
                        const isAdmin = m.author_id === me.id; // Для демо считаем что мы - админ
                        return (
                          <div key={m.id} style={{ display: 'flex', justifyContent: isAdmin ? 'flex-end' : 'flex-start' }}>
                            <div style={{ maxWidth: '80%', padding: '8px 12px', borderRadius: 8, background: isAdmin ? '#3D5AFE' : dark.paper, color: isAdmin ? 'white' : dark.ink, fontSize: 14 }}>
                              <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 4 }}>{isAdmin ? 'Вы (Админ)' : `Пользователь #${m.author_id}`} · {new Date(m.created_at).toLocaleString('ru-RU')}</div>
                              {m.body}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {t.status !== 'closed' && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input id={`reply-${t.id}`} placeholder="Текст ответа..." style={{ flex: 1, padding: '8px 12px', background: dark.bg, border: `1px solid ${dark.line}`, borderRadius: 8, color: 'white', fontFamily: 'inherit' }} />
                        <button onClick={async () => {
                          const val = document.getElementById(`reply-${t.id}`).value;
                          if (!val) return;
                          await window.API.adminReplyTicket(t.id, val);
                          window.toast('Ответ отправлен', 'success');
                          refresh();
                        }} style={{ padding: '8px 16px', background: 'white', color: dark.bg, border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Ответить</button>
                        
                        <button onClick={async () => {
                          if (!confirm('Точно закрыть обращение?')) return;
                          await window.API.adminCloseTicket(t.id);
                          window.toast('Тикет закрыт', 'success');
                          refresh();
                        }} style={{ padding: '8px 16px', background: 'transparent', color: '#ff8080', border: '1px solid rgba(214, 59, 59, 0.4)', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Закрыть</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {section === 'orders' && (
          <>
            <h1 style={{ fontSize: 48, margin: '0 0 24px', fontWeight: 700 }}>Заказы</h1>
            {orders.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', background: dark.paper, borderRadius: 12, color: dark.ink3 }}>Заказов пока нет</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {orders.map((o) => (
                  <div key={o.id} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 100px 150px 140px', gap: 16, alignItems: 'center', padding: 14, background: dark.paper, borderRadius: 8, border: `1px solid ${dark.line}`, cursor: 'pointer' }} onClick={() => openOrder(o.id)}>
                    <span style={{ fontFamily: 'monospace', fontSize: 13 }}>M-{String(o.id).padStart(8, '0')}</span>
                    <div>
                      <div style={{ fontSize: 13 }}>{o.items.length} {o.items.length === 1 ? 'товар' : 'товара'}</div>
                      <div style={{ fontSize: 12, color: dark.ink3 }}>{new Date(o.created_at).toLocaleDateString('ru-RU')}</div>
                    </div>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{formatRub(Number(o.total))}</span>
                    <select value={o.status} onClick={(e) => e.stopPropagation()} onChange={(e) => setOrderStatus(o.id, e.target.value)} style={{ padding: '6px 10px', background: dark.bg, border: `1px solid ${dark.line}`, borderRadius: 6, color: 'white', fontFamily: 'inherit', fontSize: 12 }}>
                      {Object.entries(STATUS_LABEL).map(([v, l]) => (<option key={v} value={v}>{l}</option>))}
                    </select>
                    <span style={{ fontSize: 12, color: dark.ink4 }}>buyer #{o.buyer_id} · seller #{o.seller_id}</span>
                  </div>
                ))}
              </div>
            )}
            {selectedOrder && (
              <div style={{ marginTop: 24, padding: 20, background: dark.paper, borderRadius: 12, border: `1px solid ${dark.line}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ margin: '0 0 6px' }}>Заказ M-{String(selectedOrder.id).padStart(8, '0')}</h3>
                    <div style={{ fontSize: 13, color: dark.ink3 }}>{selectedOrder.buyer.full_name} · {selectedOrder.buyer.email}</div>
                    <div style={{ fontSize: 13, color: dark.ink3, marginTop: 4 }}>{selectedOrder.seller.shop_name} · {selectedOrder.address}</div>
                  </div>
                  <button onClick={() => setSelectedOrder(null)} style={{ background: 'transparent', border: 'none', color: dark.ink3, cursor: 'pointer' }}>Закрыть</button>
                </div>
                <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                  <select value={selectedOrder.status} onChange={(e) => setOrderStatus(selectedOrder.id, e.target.value)} style={{ padding: '8px 10px', background: dark.bg, border: `1px solid ${dark.line}`, borderRadius: 8, color: 'white', fontFamily: 'inherit' }}>
                    {Object.entries(STATUS_LABEL).map(([v, l]) => (<option key={v} value={v}>{l}</option>))}
                  </select>
                  <button onClick={() => openUserAnalytics(selectedOrder.buyer.id)} style={{ padding: '8px 12px', background: dark.bg, border: `1px solid ${dark.line}`, borderRadius: 8, color: dark.ink, cursor: 'pointer' }}>Статистика покупателя</button>
                  <button onClick={() => openSellerAnalytics(selectedOrder.seller.id)} style={{ padding: '8px 12px', background: dark.bg, border: `1px solid ${dark.line}`, borderRadius: 8, color: dark.ink, cursor: 'pointer' }}>Статистика магазина</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 80px', gap: 12, padding: 12, background: dark.bg, borderRadius: 8, border: `1px solid ${dark.line}` }}>
                      <div>{item.title}</div>
                      <div>{formatRub(Number(item.price))}</div>
                      <div>{item.quantity} шт</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {section === 'users' && (
          <>
            <h1 style={{ fontSize: 48, margin: '0 0 24px', fontWeight: 700 }}>Пользователи ({users.length})</h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {users.map((u) => (
                <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 100px 140px', gap: 16, alignItems: 'center', padding: 12, background: dark.paper, borderRadius: 8, border: `1px solid ${dark.line}` }}>
                  <span style={{ fontSize: 12, color: dark.ink4 }}>#{u.id}</span>
                  <div>
                    <div style={{ fontWeight: 500, cursor: 'pointer' }} onClick={() => openUserAnalytics(u.id)}>{u.full_name}</div>
                    <div style={{ fontSize: 12, color: dark.ink3 }}>{u.email}</div>
                    <div style={{ fontSize: 11, color: dark.ink3, marginTop: 4 }}><a onClick={() => location.hash = `user?id=${u.id}`} style={{ cursor: 'pointer', color: dark.ink2 }}>Открыть публичную страницу</a></div>
                  </div>
                  <span style={{ fontSize: 12, padding: '4px 10px', background: dark.bg, borderRadius: 999, textAlign: 'center' }}>{u.role}</span>
                  <button onClick={() => toggleUser(u.id)} disabled={u.id === me.id} style={{ padding: '6px 12px', borderRadius: 8, cursor: u.id === me.id ? 'not-allowed' : 'pointer', background: u.is_active ? dark.bg : 'rgba(214, 59, 59, 0.2)', color: u.is_active ? dark.ink : '#ff8080', border: `1px solid ${u.is_active ? dark.line : 'rgba(214, 59, 59, 0.4)'}` }}>
                    {u.is_active ? 'Активен' : 'Заблокирован'}
                  </button>
                </div>
              ))}
            </div>
            {selectedUserAnalytics && (
              <div style={{ marginTop: 24, padding: 20, background: dark.paper, borderRadius: 12, border: `1px solid ${dark.line}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <h3 style={{ margin: 0 }}>Статистика пользователя: {selectedUserAnalytics.full_name}</h3>
                  <button onClick={() => setSelectedUserAnalytics(null)} style={{ background: 'transparent', border: 'none', color: dark.ink3, cursor: 'pointer' }}>Закрыть</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
                  {[['Потратил', formatRub(Number(selectedUserAnalytics.spent_total))], ['Заказы', selectedUserAnalytics.orders_total], ['Доставлено', selectedUserAnalytics.delivered_orders_total], ['Средний чек', formatRub(Number(selectedUserAnalytics.average_order_value))]].map(([label, value]) => (
                    <div key={label} style={{ padding: 16, borderRadius: 10, background: dark.bg, border: `1px solid ${dark.line}` }}><div style={{ fontSize: 12, color: dark.ink3 }}>{label}</div><div style={{ fontSize: 22, fontWeight: 700, marginTop: 6 }}>{value}</div></div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

window.MAYSS_SCREENS.Admin = Admin;
