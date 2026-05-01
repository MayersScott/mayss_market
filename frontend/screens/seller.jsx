// Seller dashboard — real CRUD + real analytics + rejection reason
const Seller = ({ onNav }) => {
  const { formatRub } = window.MAYSS_DATA;
  const { Icon, Logo } = window.MAYSS;
  const grafanaBase = window.MAYSS_RUNTIME.grafanaBase;

  const me = window.useMe();
  const [section, setSection] = React.useState('dash');
  const [profile, setProfile] = React.useState(null);
  const [products, setProducts] = React.useState([]);
  const [orders, setOrders] = React.useState([]);
  const [analytics, setAnalytics] = React.useState(null);
  const [categories, setCategories] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [shopName, setShopName] = React.useState('');
  const [shopDesc, setShopDesc] = React.useState('');
  const [shopInn, setShopInn] = React.useState('');
  const [showForm, setShowForm] = React.useState(false);
  const [editingId, setEditingId] = React.useState(null);
  const [form, setForm] = React.useState({
    title: '', description: '', brand: '', category_id: '',
    price: '', old_price: '', stock: 10, image_url: '',
  });

  const loadAll = async () => {
    try {
      const cats = await window.API.listCategories();
      setCategories(cats);
      if (cats[0] && !form.category_id) setForm((f) => ({ ...f, category_id: cats[0].id }));
      try {
        const p = await window.API.getSellerProfile();
        setProfile(p);
        setShopName(p.shop_name || '');
        setShopDesc(p.description || '');
        setShopInn(p.inn || '');
        if (p.is_verified) {
          const [prods, ords, stats] = await Promise.all([
            window.API.listSellerProducts(),
            window.API.listSellerOrders(),
            window.API.sellerAnalytics(),
          ]);
          setProducts(prods);
          setOrders(ords);
          setAnalytics(stats);
        } else {
          setProducts([]);
          setOrders([]);
          setAnalytics(null);
        }
      } catch (e) {
        setProfile(null);
        setAnalytics(null);
      }
    } catch (e) {
      window.toast('Ошибка: ' + e.message, 'error');
    } finally { setLoading(false); }
  };

  React.useEffect(() => {
    if (!window.API.getToken()) { onNav('auth'); return; }
    window.refreshMe();
    loadAll();
  }, []);

  const createProfile = async () => {
    if (!shopName.trim()) { window.toast('Введите название магазина', 'error'); return; }
    try {
      await window.API.createSellerProfile({ shop_name: shopName, description: shopDesc });
      window.toast('Магазин создан', 'success');
      await loadAll();
    } catch (e) { window.toast(e.message, 'error'); }
  };

  const submitProduct = async () => {
    if (!form.title.trim() || !form.price) { window.toast('Заполните название и цену', 'error'); return; }
    try {
      const payload = {
        title: form.title, description: form.description || null, brand: form.brand || null,
        category_id: parseInt(form.category_id, 10), price: parseFloat(form.price),
        old_price: form.old_price ? parseFloat(form.old_price) : null,
        stock: parseInt(form.stock, 10) || 0, image_url: form.image_url || null,
      };
      if (editingId) {
        await window.API.updateSellerProduct(editingId, payload);
        window.toast('Товар обновлён', 'success');
      } else {
        await window.API.createSellerProduct(payload);
        window.toast('Товар отправлен на модерацию', 'success');
      }
      setShowForm(false); setEditingId(null);
      setForm({ title: '', description: '', brand: '', category_id: categories[0]?.id || '', price: '', old_price: '', stock: 10, image_url: '' });
      setProducts(await window.API.listSellerProducts());
    } catch (e) { window.toast(e.message, 'error'); }
  };

  const startEdit = (p) => {
    setEditingId(p.id);
    setForm({
      title: p.title, description: p.description || '', brand: p.brand || '', category_id: p.category_id,
      price: String(p.price), old_price: p.old_price ? String(p.old_price) : '',
      stock: p.stock, image_url: p.image_url || '',
    });
    setShowForm(true); setSection('products');
  };

  const deleteProduct = async (id) => {
    if (!confirm('Архивировать товар?')) return;
    try {
      await window.API.deleteSellerProduct(id);
      window.toast('Товар архивирован', 'success');
      setProducts(await window.API.listSellerProducts());
    } catch (e) { window.toast(e.message, 'error'); }
  };

  const advanceOrderStatus = async (order) => {
    if (order.status !== 'paid' && order.status !== 'assembling') {
      window.toast('Заказ уже отправлен или не оплачен', 'error'); return;
    }
    try {
      await window.API.updateSellerOrderStatus(order.id, 'shipped');
      window.toast('Заказ передан в доставку', 'success');
      setOrders(await window.API.listSellerOrders());
    } catch (e) { window.toast(e.message, 'error'); }
  };

  if (loading || !me) return <div style={{ padding: 64, textAlign: 'center', background: 'var(--bg)', minHeight: '100vh' }}>Загрузка...</div>;

  if (!profile) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh', padding: '64px 32px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <a onClick={() => onNav('landing')} style={{ cursor: 'pointer', marginBottom: 32, display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--ink-3)' }}><Icon name="chevL" size={14} /> На главную</a>
          <h1 className="h-display" style={{ fontSize: 56, margin: '0 0 16px' }}>Стать продавцом</h1>
          <p style={{ color: 'var(--ink-3)', marginBottom: 32, fontSize: 16 }}>Создайте магазин, чтобы начать продавать на MAYSS. После регистрации магазины проходят модерацию.</p>
          <div className="card" style={{ padding: 24 }}>
            <label style={{ display: 'block', marginBottom: 16 }}>
              <span style={{ fontSize: 13, color: 'var(--ink-3)', display: 'block', marginBottom: 6 }}>Название магазина *</span>
              <input className="input input-lg" value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="Например, ElectroShop" style={{ width: '100%' }} />
            </label>
            <label style={{ display: 'block', marginBottom: 24 }}>
              <span style={{ fontSize: 13, color: 'var(--ink-3)', display: 'block', marginBottom: 6 }}>Описание</span>
              <textarea className="input" value={shopDesc} onChange={(e) => setShopDesc(e.target.value)} rows={4} style={{ width: '100%', resize: 'vertical' }} placeholder="Расскажите о вашем магазине" />
            </label>
            <button className="btn btn-primary btn-lg" onClick={createProfile} style={{ width: '100%' }}>Создать магазин</button>
          </div>
        </div>
      </div>
    );
  }

  const totalRevenue = orders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total), 0);
  const ordersCount = orders.length;
  const activeProducts = products.filter((p) => p.status === 'active').length;
  const avgCheck = ordersCount > 0 ? Math.round(totalRevenue / ordersCount) : 0;

  const funnelData = [
    { stage: 'Все заказы', value: ordersCount, pct: 100 },
    { stage: 'Оплачено', value: orders.filter(o => o.status !== 'created' && o.status !== 'cancelled').length, pct: ordersCount ? Math.round((orders.filter(o => o.status !== 'created' && o.status !== 'cancelled').length / ordersCount) * 100) : 0 },
    { stage: 'В пути', value: orders.filter(o => ['shipped', 'delivered'].includes(o.status)).length, pct: ordersCount ? Math.round((orders.filter(o => ['shipped', 'delivered'].includes(o.status)).length / ordersCount) * 100) : 0 },
    { stage: 'Выкуплено', value: orders.filter(o => o.status === 'delivered').length, pct: ordersCount ? Math.round((orders.filter(o => o.status === 'delivered').length / ordersCount) * 100) : 0 },
  ];

  const STATUS_LABEL = window.MAPPERS.STATUS_LABELS;
  const productStatusLabel = { draft: 'Черновик', pending: 'На модерации', active: 'Активен', rejected: 'Отклонён', archived: 'В архиве' };
  const productStatusColor = { active: 'badge-ok', pending: 'badge-brand', rejected: 'badge-err', archived: '', draft: '' };

  const nav = [
    { id: 'dash', label: 'Дашборд', icon: 'chart' },
    { id: 'products', label: 'Товары', icon: 'box', badge: products.length || null },
    { id: 'orders', label: 'Заказы', icon: 'pkg', badge: orders.length || null },
    { id: 'analytics', label: 'Grafana (Pro)', icon: 'pie' },
    { id: 'finance', label: 'Финансы', icon: 'wallet' },
    { id: 'settings', label: 'Настройки', icon: 'settings' },
  ];

  // Блокировка интерфейса для непроверенных магазинов
  if (!profile.is_verified && section !== 'settings') {
    const isRejected = profile.rejection_reason !== null;
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'grid', gridTemplateColumns: '240px 1fr' }}>
        <aside style={{ background: 'var(--paper)', borderRight: '1px solid var(--line)', padding: '20px 14px' }}>
          <a onClick={() => onNav('landing')} style={{ cursor: 'pointer', padding: '4px 8px', marginBottom: 4 }}><Logo size={24} /></a>
          <div style={{ padding: '12px', background: isRejected ? 'var(--err-soft)' : 'var(--warn-soft)', borderRadius: 10, marginTop: 16 }}>
            <div style={{ fontWeight: 600, color: isRejected ? 'var(--err)' : '#8C5E00' }}>
              {isRejected ? 'Магазин отклонён' : 'Магазин на модерации'}
            </div>
            <div style={{ fontSize: 12, color: isRejected ? 'var(--err)' : '#8C5E00', marginTop: 4 }}>
              {isRejected ? `Причина: ${profile.rejection_reason}` : 'Администратор проверит профиль в ближайшее время.'}
            </div>
          </div>
          <div style={{ marginTop: 'auto', paddingTop: 16 }}>
             <button onClick={() => { location.hash = 'account?tab=dash'; }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', width: '100%', background: 'transparent', border: 'none', fontSize: 13, color: 'var(--ink-3)', cursor: 'pointer' }}><Icon name="user" size={16} /> Личный кабинет</button>
          </div>
        </aside>
        <main style={{ padding: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
          <Icon name={isRejected ? "ban" : "shield"} size={64} color={isRejected ? "var(--err)" : "var(--warn)"} />
          <h2 className="h-display" style={{ marginTop: 24, fontSize: 32 }}>{isRejected ? 'В доступе отказано' : 'Профиль проверяется'}</h2>
          <p style={{ color: 'var(--ink-3)', fontSize: 16 }}>Доступ к товарам и заказам откроется после одобрения магазина.</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setSection('settings')}>
            Открыть настройки магазина
          </button>
        </main>
      </div>
    );
  }

  const saveSettings = async () => {
    if (!shopName.trim()) {
      window.toast('Название магазина не может быть пустым', 'error');
      return;
    }
    try {
      const updated = await window.API.updateSellerProfile({
        shop_name: shopName.trim(),
        description: shopDesc.trim() || null,
        inn: shopInn.trim() || null,
      });
      setProfile(updated);
      window.toast('Профиль магазина обновлён и отправлен на перепроверку', 'success');
      await loadAll();
    } catch (e) {
      window.toast(e.message, 'error');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'grid', gridTemplateColumns: '240px 1fr' }}>
      <aside style={{ background: 'var(--paper)', borderRight: '1px solid var(--line)', padding: '20px 14px', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', overflow: 'auto' }}>
        <a onClick={() => onNav('landing')} style={{ cursor: 'pointer', padding: '4px 8px', marginBottom: 4 }}><Logo size={24} /></a>
        <div style={{ padding: '4px 8px 16px', fontSize: 11, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '.1em' }}>Кабинет продавца</div>

        <div style={{ padding: 12, background: 'var(--bg-2)', borderRadius: 10, marginBottom: 16, cursor: 'pointer' }} onClick={() => location.hash = `shop?id=${profile.id}`}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{profile.shop_name}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>✓ Верифицирован</div>
          <div style={{ fontSize: 11, color: 'var(--brand)', marginTop: 8 }}>Посмотреть публичную страницу →</div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {nav.map((n) => (
            <button key={n.id} onClick={() => setSection(n.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: section === n.id ? 'var(--bg-2)' : 'transparent', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: section === n.id ? 600 : 400, color: section === n.id ? 'var(--ink)' : 'var(--ink-2)', cursor: 'pointer', textAlign: 'left' }}>
              <Icon name={n.icon} size={16} />
              <span style={{ flex: 1 }}>{n.label}</span>
              {n.badge && <span style={{ background: 'var(--brand)', color: 'white', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 8 }}>{n.badge}</span>}
            </button>
          ))}
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: 16 }}>
          <button onClick={() => { location.hash = 'account?tab=dash'; }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', width: '100%', background: 'transparent', border: 'none', fontSize: 13, color: 'var(--ink-3)', cursor: 'pointer' }}><Icon name="user" size={16} /> Личный кабинет</button>
        </div>
      </aside>

      <main style={{ padding: '32px 40px 64px' }}>
        {section === 'dash' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
              <div>
                <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 6 }}>Сегодня · {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</div>
                <h1 className="h-display" style={{ fontSize: 56, margin: 0 }}>Привет, {profile.shop_name}</h1>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
              {[
                { l: 'Оборот', v: formatRub(Number(analytics?.turnover || totalRevenue)) },
                { l: 'Выручка', v: formatRub(Number(analytics?.revenue || totalRevenue * 0.95)) },
                { l: 'Активные товары', v: activeProducts },
                { l: 'Средний чек', v: formatRub(Number(analytics?.average_order_value || avgCheck)) },
              ].map((k) => (
                <div key={k.l} className="card" style={{ padding: 20 }}>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{k.l}</div>
                  <div className="kpi-num" style={{ fontSize: 28, marginTop: 6 }}>{k.v}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="card" style={{ padding: 24 }}>
                <h3 style={{ margin: '0 0 16px' }}>Последние заказы</h3>
                {orders.slice(0, 5).length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--ink-3)', padding: 24 }}>Пока нет заказов</div>
                ) : orders.slice(0, 5).map((o) => (
                  <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--line-2)', fontSize: 13 }}>
                    <span className="mono">M-{String(o.id).padStart(8, '0')}</span>
                    <span>{formatRub(Number(o.total))}</span>
                    <span className="badge badge-brand">{STATUS_LABEL[o.status]}</span>
                  </div>
                ))}
              </div>
              <div className="card" style={{ padding: 24 }}>
                <h3 style={{ margin: '0 0 16px' }}>Конверсия (Реальные данные)</h3>
                {funnelData.map((f) => (
                  <div key={f.stage} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span>{f.stage}</span>
                      <span style={{ color: 'var(--ink-3)' }}>{f.value} шт. ({f.pct}%)</span>
                    </div>
                    <div style={{ height: 8, background: 'var(--bg-2)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: f.pct + '%', height: '100%', background: 'var(--brand)' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {analytics && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                <div className="card" style={{ padding: 24 }}>
                  <h3 style={{ margin: '0 0 16px' }}>Топ товаров</h3>
                  {analytics.top_products.length === 0 ? (
                    <div style={{ color: 'var(--ink-3)' }}>Пока недостаточно данных</div>
                  ) : analytics.top_products.map((item) => (
                    <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--line-2)' }}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
                <div className="card" style={{ padding: 24 }}>
                  <h3 style={{ margin: '0 0 16px' }}>Топ категорий</h3>
                  {analytics.top_categories.length === 0 ? (
                    <div style={{ color: 'var(--ink-3)' }}>Пока недостаточно данных</div>
                  ) : analytics.top_categories.map((item) => (
                    <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--line-2)' }}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {section === 'products' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h1 className="h-display" style={{ fontSize: 48, margin: 0 }}>Товары</h1>
              <button className="btn btn-primary" onClick={() => { setEditingId(null); setShowForm(!showForm); }}>{showForm ? 'Скрыть форму' : '+ Добавить товар'}</button>
            </div>
            {showForm && (
              <div className="card" style={{ padding: 24, marginBottom: 20 }}>
                <h3 style={{ margin: '0 0 16px' }}>{editingId ? 'Редактирование товара' : 'Новый товар'}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <label style={{ gridColumn: '1 / 3' }}><span style={{ fontSize: 12, color: 'var(--ink-3)', display: 'block', marginBottom: 4 }}>Название товара *</span><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={{ width: '100%' }} /></label>
                  <label style={{ gridColumn: '1 / 3' }}><span style={{ fontSize: 12, color: 'var(--ink-3)', display: 'block', marginBottom: 4 }}>Описание</span><textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ width: '100%', resize: 'vertical' }} /></label>
                  <label><span style={{ fontSize: 12, color: 'var(--ink-3)', display: 'block', marginBottom: 4 }}>Бренд</span><input className="input" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} style={{ width: '100%' }} /></label>
                  <label><span style={{ fontSize: 12, color: 'var(--ink-3)', display: 'block', marginBottom: 4 }}>Категория</span><select className="input" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} style={{ width: '100%' }}>{categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}</select></label>
                  <label><span style={{ fontSize: 12, color: 'var(--ink-3)', display: 'block', marginBottom: 4 }}>Цена, ₽ *</span><input className="input" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} style={{ width: '100%' }} /></label>
                  <label><span style={{ fontSize: 12, color: 'var(--ink-3)', display: 'block', marginBottom: 4 }}>Старая цена, ₽ (для скидки)</span><input className="input" type="number" value={form.old_price} onChange={(e) => setForm({ ...form, old_price: e.target.value })} style={{ width: '100%' }} /></label>
                  <label><span style={{ fontSize: 12, color: 'var(--ink-3)', display: 'block', marginBottom: 4 }}>Количество в наличии (шт)</span><input className="input" type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} style={{ width: '100%' }} /></label>
                  <label><span style={{ fontSize: 12, color: 'var(--ink-3)', display: 'block', marginBottom: 4 }}>URL картинки</span><input className="input" value={form.image_url} placeholder="https://..." onChange={(e) => setForm({ ...form, image_url: e.target.value })} style={{ width: '100%' }} /></label>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}><button className="btn btn-primary" onClick={submitProduct}>{editingId ? 'Сохранить' : 'Создать'}</button><button className="btn" onClick={() => { setShowForm(false); setEditingId(null); }}>Отмена</button></div>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {products.length === 0 ? <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--ink-3)' }}>У вас пока нет товаров</div> : products.map((p) => (
                <div key={p.id} className="card" style={{ padding: 16, display: 'grid', gridTemplateColumns: '60px 1fr 100px 100px auto auto', gap: 16, alignItems: 'center' }}>
                  <div style={{ width: 60, height: 60, borderRadius: 8, background: 'var(--bg-2)', overflow: 'hidden' }}>{p.image_url && <img src={p.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}</div>
                  <div>
                    <div style={{ fontWeight: 600, cursor: 'pointer' }} onClick={() => { location.hash = `product?id=${p.id}`; }}>{p.title}</div>
                    {p.status === 'rejected' && p.rejection_reason && <div style={{ fontSize: 11, color: 'var(--err)', marginTop: 2 }}>Отклонен: {p.rejection_reason}</div>}
                    <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>{p.brand || '—'} · {formatRub(Number(p.price))}</div>
                  </div>
                  <span className={'badge ' + (productStatusColor[p.status] || '')}>{productStatusLabel[p.status]}</span>
                  <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>{p.stock} шт</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => startEdit(p)}>Изменить</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => deleteProduct(p.id)}><Icon name="trash" size={14} /></button>
                </div>
              ))}
            </div>
          </>
        )}

        {section === 'orders' && (
          <>
            <h1 className="h-display" style={{ fontSize: 48, margin: '0 0 24px' }}>Заказы</h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {orders.length === 0 ? (
                <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--ink-3)' }}>Заказов пока нет</div>
              ) : orders.map((o) => (
                <div key={o.id} className="card" style={{ padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div className="mono" style={{ fontSize: 13, color: 'var(--ink-3)' }}>M-{String(o.id).padStart(8, '0')}</div>
                      <div style={{ fontWeight: 600, fontSize: 16, marginTop: 4 }}>{new Date(o.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</div>
                    </div>
                    <span className="badge badge-brand">{STATUS_LABEL[o.status]}</span>
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 8 }}>{o.items.length} {o.items.length === 1 ? 'товар' : 'товара'} · {formatRub(Number(o.total))}</div>
                  <div style={{ fontSize: 13, color: 'var(--ink-4)', marginBottom: 12 }}>Адрес: {o.address}</div>
                  
                  {['paid', 'assembling'].includes(o.status) && (
                    <button className="btn btn-primary btn-sm" onClick={() => advanceOrderStatus(o)}>
                      Отправить в доставку
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {section === 'analytics' && (
          <>
            <h1 className="h-display" style={{ fontSize: 48, margin: '0 0 8px' }}>Аналитика магазина</h1>
            <p style={{ color: 'var(--ink-3)', marginBottom: 24 }}>
              Детальная аналитика вашего магазина на базе Grafana. Данные обновляются в реальном времени.
            </p>
            <div style={{ borderRadius: 16, overflow: 'hidden', border: `1px solid var(--line)`, background: 'var(--paper)', height: 700 }}>
              <iframe src={`${grafanaBase}/d/seller/mayss-seller-analytics?orgId=1&kiosk=tv&theme=light&var-seller_id=${profile.id}`} width="100%" height="100%" frameBorder="0"></iframe>
            </div>
          </>
        )}

        {section === 'finance' && (
          <>
            <h1 className="h-display" style={{ fontSize: 48, margin: '0 0 24px' }}>Финансы</h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
              <div className="card" style={{ padding: 24 }}><div style={{ fontSize: 13, color: 'var(--ink-3)' }}>Доступно к выводу</div><div className="kpi-num" style={{ fontSize: 32, marginTop: 8 }}>{formatRub(Number(analytics?.revenue || totalRevenue * 0.95))}</div><button className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>Вывести</button></div>
              <div className="card" style={{ padding: 24 }}><div style={{ fontSize: 13, color: 'var(--ink-3)' }}>Комиссия MAYSS</div><div className="kpi-num" style={{ fontSize: 32, marginTop: 8 }}>{formatRub(Number(analytics?.platform_fee || totalRevenue * 0.05))}</div><div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 8 }}>Комиссия платформы</div></div>
              <div className="card" style={{ padding: 24 }}><div style={{ fontSize: 13, color: 'var(--ink-3)' }}>Средняя доставка</div><div className="kpi-num" style={{ fontSize: 32, marginTop: 8 }}>{analytics?.avg_delivery_hours ? `${analytics.avg_delivery_hours} ч` : '—'}</div><div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 8 }}>По доставленным заказам</div></div>
            </div>
          </>
        )}

        {section === 'settings' && (
          <>
            <h1 className="h-display" style={{ fontSize: 48, margin: '0 0 24px' }}>Настройки магазина</h1>
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: 'grid', gap: 16 }}>
                <label>
                  <span style={{ fontSize: 12, color: 'var(--ink-3)', display: 'block', marginBottom: 6 }}>Название магазина</span>
                  <input className="input" value={shopName} onChange={(e) => setShopName(e.target.value)} style={{ width: '100%' }} />
                </label>
                <label>
                  <span style={{ fontSize: 12, color: 'var(--ink-3)', display: 'block', marginBottom: 6 }}>Описание</span>
                  <textarea className="input" value={shopDesc} onChange={(e) => setShopDesc(e.target.value)} rows={4} style={{ width: '100%', resize: 'vertical' }} />
                </label>
                <label>
                  <span style={{ fontSize: 12, color: 'var(--ink-3)', display: 'block', marginBottom: 6 }}>ИНН</span>
                  <input className="input" value={shopInn} onChange={(e) => setShopInn(e.target.value)} style={{ width: '100%' }} />
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 16, fontSize: 14 }}>
                  <span style={{ color: 'var(--ink-3)' }}>Статус</span><span>{profile.is_verified ? '✓ Верифицирован' : profile.rejection_reason ? `Отклонён: ${profile.rejection_reason}` : 'На проверке'}</span>
                  <span style={{ color: 'var(--ink-3)' }}>Рейтинг</span><span>{Number(profile.rating).toFixed(2)} ★</span>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button className="btn btn-primary" onClick={saveSettings}>Сохранить и отправить на проверку</button>
                  <button className="btn btn-ghost" onClick={() => location.hash = `shop?id=${profile.id}`}>Открыть публичную страницу</button>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

window.MAYSS_SCREENS.Seller = Seller;
