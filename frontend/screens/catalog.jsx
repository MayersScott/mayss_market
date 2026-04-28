// Catalog page — live filters, sort, pagination via API
const Catalog = ({ onNav }) => {
  const { CATEGORIES, formatRub } = window.MAYSS_DATA;
  const { Icon, Stars, ProductPic, Header, Footer, ProductCard, CategoryBlob } = window.MAYSS;
  const { mapProduct } = window.MAPPERS;

  const initialParams = window.parseHashQuery();
  const [view, setView] = React.useState('grid');
  const [sort, setSort] = React.useState(initialParams.sort || 'new');
  const [q, setQ] = React.useState(initialParams.q || '');
  const [categoryId, setCategoryId] = React.useState(initialParams.category_id || '');
  const [minPrice, setMinPrice] = React.useState('');
  const [maxPrice, setMaxPrice] = React.useState('');
  const [semantic, setSemantic] = React.useState(initialParams.semantic !== '0');
  const [page, setPage] = React.useState(1);
  const pageSize = 24;

  const [data, setData] = React.useState({ items: [], total: 0 });
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        page_size: pageSize,
        sort,
        q: q || undefined,
        category_id: categoryId || undefined,
        min_price: minPrice || undefined,
        max_price: maxPrice || undefined,
        semantic: q && semantic ? true : undefined,
      };
      const resp = await window.API.listProducts(params);
      setData({ items: resp.items.map(mapProduct), total: resp.total });
    } catch (e) {
      window.toast('Ошибка загрузки: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [page, sort, q, categoryId, minPrice, maxPrice, semantic]);

  React.useEffect(() => { load(); }, [load]);

  // React to hash changes (clicking categories from header)
  React.useEffect(() => {
    const onHash = () => {
      const p = window.parseHashQuery();
      setQ(p.q || '');
      setCategoryId(p.category_id || '');
      setPage(1);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const resetFilters = () => {
    setQ('');
    setCategoryId('');
    setMinPrice('');
    setMaxPrice('');
    setPage(1);
    location.hash = 'catalog';
  };

  const currentCat = CATEGORIES.find((c) => c.id == categoryId);
  const totalPages = Math.max(1, Math.ceil(data.total / pageSize));

  const FilterSection = ({ title, children }) => (
    <div style={{ paddingBottom: 20, marginBottom: 20, borderBottom: '1px solid var(--line)' }}>
      <h4 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px' }}>{title}</h4>
      {children}
    </div>
  );

  return (
    <div style={{ paddingTop: 68, background: 'var(--bg)', minHeight: '100vh' }}>
      <Header onNav={onNav} route="catalog" openCart={() => onNav('cart')} />

      <div className="container-wide" style={{ padding: '32px 32px 64px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 13, color: 'var(--ink-3)' }}>
          <a onClick={() => onNav('landing')} style={{ cursor: 'pointer' }}>MAYSS</a>
          <Icon name="chevR" size={12} />
          <a onClick={() => onNav('catalog')} style={{ cursor: 'pointer' }}>Каталог</a>
          {currentCat && (<><Icon name="chevR" size={12} /><span style={{ color: 'var(--ink)' }}>{currentCat.ru}</span></>)}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
          <div>
            <h1 className="h-display" style={{ fontSize: 64, margin: 0 }}>
              {q ? `Поиск: «${q}»` : currentCat ? currentCat.ru : 'Каталог'}
            </h1>
            <p style={{ color: 'var(--ink-3)', marginTop: 8, fontSize: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span><span className="kpi-num">{data.total}</span> {data.total === 1 ? 'товар' : 'товаров'}</span>
              {q && semantic && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'var(--brand)', color: 'white', borderRadius: 999, fontSize: 12, fontWeight: 500 }}>
                  <Icon name="search" size={12} color="white" /> Умный поиск
                </span>
              )}
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 32 }}>
          <aside>
            <div className="card" style={{ padding: 20, position: 'sticky', top: 84 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Фильтры</h3>
                <button onClick={resetFilters} style={{ background: 'none', border: 'none', color: 'var(--ink-3)', fontSize: 12, cursor: 'pointer' }}>Сбросить</button>
              </div>

              <FilterSection title="Категория">
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', cursor: 'pointer', fontSize: 14 }}>
                  <input type="radio" name="cat" checked={!categoryId} onChange={() => { setCategoryId(''); setPage(1); }} style={{ accentColor: 'var(--brand)' }} /> Все
                </label>
                {CATEGORIES.map((c) => (
                  <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', cursor: 'pointer', fontSize: 14 }}>
                    <input type="radio" name="cat" checked={categoryId == c.id} onChange={() => { setCategoryId(c.id); setPage(1); }} style={{ accentColor: 'var(--brand)' }} />
                    {c.ru}
                  </label>
                ))}
              </FilterSection>

              <FilterSection title="Цена, ₽">
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="input" style={{ padding: 8, fontSize: 13 }} placeholder="от"
                    value={minPrice} onChange={(e) => { setMinPrice(e.target.value); setPage(1); }} />
                  <input className="input" style={{ padding: 8, fontSize: 13 }} placeholder="до"
                    value={maxPrice} onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }} />
                </div>
              </FilterSection>

              <FilterSection title="Поиск">
                <input className="input" style={{ padding: 8, fontSize: 13, marginBottom: 12 }} placeholder="Название или описание..."
                  value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: q ? 'pointer' : 'not-allowed', fontSize: 13, opacity: q ? 1 : 0.5 }}>
                  <input type="checkbox" checked={semantic} disabled={!q}
                    onChange={(e) => { setSemantic(e.target.checked); setPage(1); }}
                    style={{ accentColor: 'var(--brand)', marginTop: 2 }} />
                  <span>
                    Умный поиск
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
                      Ищет по смыслу — найдёт «беговую обувь» по запросу «для пробежки»
                    </div>
                  </span>
                </label>
              </FilterSection>
            </div>
          </aside>

          <main>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, padding: '12px 16px', background: 'var(--paper)', borderRadius: 12, border: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>Сортировать:</span>
                {[
                  { id: 'new', l: 'Новинки' },
                  { id: 'price_asc', l: 'По цене ↑' },
                  { id: 'price_desc', l: 'По цене ↓' },
                  { id: 'rating', l: 'По рейтингу' },
                ].map((s) => (
                  <button key={s.id} onClick={() => { setSort(s.id); setPage(1); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: sort === s.id ? 600 : 400, color: sort === s.id ? 'var(--ink)' : 'var(--ink-3)', borderBottom: sort === s.id ? '2px solid var(--brand)' : '2px solid transparent', padding: '4px 0' }}>{s.l}</button>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', background: 'var(--bg-2)', borderRadius: 8, padding: 2 }}>
                  <button onClick={() => setView('grid')} style={{ padding: 6, background: view === 'grid' ? 'var(--paper)' : 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer' }}><Icon name="grid" size={16} /></button>
                  <button onClick={() => setView('list')} style={{ padding: 6, background: view === 'list' ? 'var(--paper)' : 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer' }}><Icon name="list" size={16} /></button>
                </div>
              </div>
            </div>

            {loading ? (
              <div style={{ padding: 64, textAlign: 'center', color: 'var(--ink-3)' }}>Загрузка...</div>
            ) : data.items.length === 0 ? (
              <div className="card" style={{ padding: 64, textAlign: 'center' }}>
                <div style={{ fontSize: 18, color: 'var(--ink-3)', marginBottom: 12 }}>Ничего не найдено</div>
                <button className="btn" onClick={resetFilters}>Сбросить фильтры</button>
              </div>
            ) : view === 'grid' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                {data.items.map((p) => <ProductCard key={p.id} p={p} />)}
              </div>
            ) : (
              <CatalogList items={data.items} formatRub={formatRub} />
            )}

            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 48 }}>
                <button className="btn btn-ghost btn-icon" disabled={page === 1} onClick={() => setPage(page - 1)}><Icon name="chevL" size={16} /></button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
                  <button key={p} className={p === page ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
                    style={{ minWidth: 40 }} onClick={() => setPage(p)}>{p}</button>
                ))}
                <button className="btn btn-ghost btn-icon" disabled={page === totalPages} onClick={() => setPage(page + 1)}><Icon name="chevR" size={16} /></button>
              </div>
            )}
          </main>
        </div>
      </div>

      <Footer />
    </div>
  );
};

const CatalogList = ({ items, formatRub }) => {
  const { Icon, Stars, ProductPic } = window.MAYSS;
  const addToCart = async (e, p) => {
    e.stopPropagation();
    if (!window.API.getToken()) { window.toast('Войдите'); location.hash = 'auth'; return; }
    try {
      await window.API.addToCart(p.id, 1);
      await window.refreshCart();
      window.toast('Добавлено в корзину', 'success');
    } catch (err) { window.toast('Ошибка: ' + err.message, 'error'); }
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map((p) => (
        <div key={p.id} className="card" style={{ display: 'grid', gridTemplateColumns: '160px 1fr 200px', gap: 20, padding: 16, cursor: 'pointer' }}
          onClick={() => { location.hash = `product?id=${p.id}`; }}>
          {p.image_url ? (
            <div style={{ width: 160, height: 140, borderRadius: 12, overflow: 'hidden', background: 'var(--bg-2)' }}>
              <img src={p.image_url} alt={p.ru} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ) : (<ProductPic hue={p.hue} label={p.brand} height={140} />)}
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <Stars value={p.rating} />
              <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{p.reviews} отзывов</span>
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>{p.ru}</h3>
            <p style={{ color: 'var(--ink-3)', fontSize: 13, margin: '0 0 12px' }}>{p.description || p.brand}</p>
            {p.stock > 0
              ? <span className="badge badge-ok"><Icon name="truck" size={12} /> В наличии</span>
              : <span className="badge badge-err">Нет в наличии</span>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ textAlign: 'right' }}>
              <div className="display" style={{ fontWeight: 700, fontSize: 24 }}>{formatRub(p.price)}</div>
              {p.old > 0 && <div className="strike" style={{ fontSize: 13 }}>{formatRub(p.old)}</div>}
            </div>
            <button className="btn btn-primary btn-sm" disabled={p.stock === 0} onClick={(e) => addToCart(e, p)}>
              <Icon name="cart" size={14} color="white" /> В корзину
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

window.MAYSS_SCREENS.Catalog = Catalog;
// commit 30: feat: document api bridge small note
