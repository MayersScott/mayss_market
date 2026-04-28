// Landing page
const { useState: useStateL } = React;

const Landing = ({ onNav }) => {
  window.useLiveData();
  const { CATEGORIES, PRODUCTS, formatRub } = window.MAYSS_DATA;
  const { Logo, Icon, Stars, ProductPic, CategoryBlob, Header, Footer } = window.MAYSS;
  const [heroVariant] = [window.__tweaks?.heroVariant || 'editorial'];
  const [recommended, setRecommended] = useStateL([]);

  React.useEffect(() => {
    window.API.listRecommendations(8)
      .then((items) => setRecommended(items.map(window.MAPPERS.mapProduct)))
      .catch(() => setRecommended(PRODUCTS.slice(0, 8)));
  }, []);

  return (
    <div style={{ minHeight: '100vh', paddingTop: 68 }}>
      <Header onNav={onNav} route="landing" openCart={() => onNav('cart')} />

      {/* HERO */}
      <section style={{ padding: '64px 0 48px', position: 'relative' }}>
        <div className="container-wide" style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 48, alignItems: 'center' }}>
          <div>
            <span className="badge badge-soft" style={{ marginBottom: 24 }}>
              <span className="dot" style={{ background: 'var(--ok)' }}></span>
              18 412 906 товаров · обновлено сейчас
            </span>
            <h1 className="h-display" style={{ fontSize: 'clamp(56px, 9vw, 128px)', margin: '8px 0 24px', color: 'var(--ink)' }}>
              Всё, что нужно — <br/>
              <span style={{ color: 'var(--brand)' }}>на MAYSS</span><span style={{ color: 'var(--brand)' }}>.</span>
            </h1>
            <p style={{ fontSize: 20, color: 'var(--ink-3)', maxWidth: 520, lineHeight: 1.5, marginBottom: 32 }}>
              Маркетплейс для всего. От наушников до йога-коврика — с доставкой за 1 день в 312 городов.
            </p>
            <div style={{ display: 'flex', gap: 12, maxWidth: 600, marginBottom: 32 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Icon name="search" size={20} style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }} />
                <input className="input input-lg" id="hero-search" style={{ paddingLeft: 52, height: 60, borderRadius: 14 }}
                  placeholder="Что вам найти?"
                  onKeyDown={(e) => { if (e.key === 'Enter') { const v = e.target.value.trim(); location.hash = v ? `catalog?q=${encodeURIComponent(v)}` : 'catalog'; } }} />
              </div>
              <button className="btn btn-primary btn-lg" onClick={() => {
                const v = document.getElementById('hero-search')?.value?.trim();
                location.hash = v ? `catalog?q=${encodeURIComponent(v)}` : 'catalog';
              }} style={{ height: 60, padding: '0 32px', borderRadius: 14 }}>
                Найти <Icon name="arrR" size={18} color="white" />
              </button>
            </div>
            <div className="tag-row">
              {['наушники', 'кофемашина', 'кроссовки', 'планшет', 'конструктор', 'робот-пылесос'].map((t) => (
                <button key={t} className="chip" onClick={() => { location.hash = `catalog?q=${encodeURIComponent(t)}`; }}>{t}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 32, marginTop: 56 }}>
              {[
                { v: '124K+', l: 'продавцов' },
                { v: '18.4M', l: 'товаров' },
                { v: '1 день', l: 'доставка' },
                { v: '4.8 ★', l: 'средний рейтинг' },
              ].map((s) => (
                <div key={s.l}>
                  <div className="kpi-num" style={{ fontSize: 32 }}>{s.v}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.08em', marginTop: 4 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Hero visual — composed product blobs */}
          <div style={{ position: 'relative', height: 580 }}>
            <div className="grid-bg" style={{ position: 'absolute', inset: 0, opacity: .35, borderRadius: 24, maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)' }}></div>
            {[
              { hue: 230, x: 20, y: 40, size: 220, z: 3 },
              { hue: 50, x: 280, y: 0, size: 160, z: 2 },
              { hue: 320, x: 320, y: 220, size: 180, z: 4 },
              { hue: 160, x: 50, y: 320, size: 140, z: 1 },
              { hue: 30, x: 200, y: 400, size: 120, z: 2 },
            ].map((b, i) => (
              <div key={i} style={{ position: 'absolute', left: b.x, top: b.y, zIndex: b.z, animation: `fadeUp .6s ${i * 0.1}s both` }}>
                <CategoryBlob hue={b.hue} size={b.size} />
              </div>
            ))}
            <div style={{ position: 'absolute', right: 20, top: 60, background: 'var(--paper)', borderRadius: 16, padding: 16, boxShadow: 'var(--sh-2)', width: 200 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Сейчас популярно</div>
              <div className="display" style={{ fontSize: 22, fontWeight: 700, marginTop: 6 }}>Soundwave Pro 3</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                <span className="kpi-num" style={{ fontSize: 18 }}>12 990 ₽</span>
                <span className="badge badge-ok">−21%</span>
              </div>
            </div>
            <div style={{ position: 'absolute', left: 0, bottom: 30, background: 'var(--ink)', color: 'var(--paper)', borderRadius: 16, padding: '14px 18px', boxShadow: 'var(--sh-2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Icon name="truck" size={20} color="white" />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Доставка завтра</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>Москва, 8:00–22:00</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section style={{ padding: '64px 0' }}>
        <div className="container-wide">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
            <h2 className="h-display" style={{ fontSize: 56, margin: 0 }}>Категории</h2>
            <a onClick={() => onNav('catalog')} style={{ color: 'var(--ink-3)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
              Все 248 категорий <Icon name="arrR" size={16} />
            </a>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {CATEGORIES.map((c) => (
              <button key={c.id} onClick={() => { location.hash = `catalog?category_id=${c.id}`; }}
                style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 20, padding: 24, textAlign: 'left', cursor: 'pointer', transition: 'all .2s', display: 'flex', alignItems: 'center', gap: 16 }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--ink-3)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.transform = 'none'; }}>
                <CategoryBlob hue={c.hue} size={64} />
                <div>
                  <div className="display" style={{ fontWeight: 600, fontSize: 18 }}>{c.ru}</div>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 4 }}>{c.count} товаров</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* HITS */}
      <section style={{ padding: '64px 0', background: 'var(--bg-2)' }}>
        <div className="container-wide">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
            <div>
              <span className="badge badge-ink" style={{ marginBottom: 12 }}><Icon name="fire" size={12} color="white" /> Горячее</span>
              <h2 className="h-display" style={{ fontSize: 56, margin: 0 }}>Хиты продаж</h2>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost btn-icon"><Icon name="chevL" size={18} /></button>
              <button className="btn btn-ghost btn-icon"><Icon name="chevR" size={18} /></button>
            </div>
          </div>
          <div className="rail">
            {(recommended.length ? recommended : PRODUCTS.slice(0, 8)).map((p) => (
              <ProductCard key={p.id} p={p} onClick={() => { location.hash = `product?id=${p.id}`; }} width={280} />
            ))}
          </div>
        </div>
      </section>

      {/* PROMO BANNERS */}
      <section style={{ padding: '64px 0' }}>
        <div className="container-wide" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16, height: 320 }}>
          <div style={{ background: 'var(--ink)', color: 'var(--paper)', borderRadius: 24, padding: 40, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ position: 'absolute', right: -40, top: -40, opacity: .2 }}>
              <CategoryBlob hue={230} size={320} />
            </div>
            <div style={{ position: 'relative' }}>
              <span className="badge" style={{ background: 'var(--brand)', color: 'white' }}>Распродажа</span>
              <h3 className="h-display" style={{ fontSize: 56, margin: '16px 0 8px', color: 'white' }}>Весна <br/>−40%</h3>
              <p style={{ color: 'var(--ink-4)', maxWidth: 320 }}>На электронику и технику для дома до 30 апреля</p>
            </div>
            <button className="btn" style={{ background: 'var(--paper)', color: 'var(--ink)', alignSelf: 'flex-start', position: 'relative' }} onClick={() => onNav('catalog')}>
              К акции <Icon name="arrR" size={16} />
            </button>
          </div>
          <div style={{ background: 'var(--brand-soft)', borderRadius: 24, padding: 32, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <span className="badge badge-brand">MAYSS+</span>
              <h3 className="h-display" style={{ fontSize: 32, margin: '12px 0 8px', color: 'var(--brand-ink)' }}>Бесплатная доставка</h3>
              <p style={{ fontSize: 14, color: 'var(--brand-ink)', opacity: .8 }}>Подписка за 199 ₽/мес</p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <Icon name="truck" size={48} color="var(--brand-ink)" />
              <button className="btn btn-sm" style={{ background: 'var(--brand-ink)', color: 'white' }}>Подключить</button>
            </div>
          </div>
          <div style={{ background: 'var(--ink)', color: 'var(--paper)', borderRadius: 24, padding: 32, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', backgroundImage: 'linear-gradient(135deg, oklch(0.6 0.18 280) 0%, oklch(0.4 0.15 320) 100%)' }}>
            <div>
              <span className="badge badge-ink" style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)' }}>Кешбэк</span>
              <h3 className="h-display" style={{ fontSize: 32, margin: '12px 0 8px' }}>До 25% на красоту</h3>
              <p style={{ fontSize: 14, opacity: .8 }}>Бонусами для подписчиков</p>
            </div>
            <button className="btn btn-sm" style={{ background: 'white', color: 'var(--ink)', alignSelf: 'flex-start' }}>Активировать</button>
          </div>
        </div>
      </section>

      {/* SELLER CTA */}
      <section style={{ padding: '64px 0' }}>
        <div className="container-wide">
          <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 32, padding: '64px 56px', display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 48, alignItems: 'center' }}>
            <div>
              <span className="badge badge-soft">Для бизнеса</span>
              <h2 className="h-display" style={{ fontSize: 64, margin: '16px 0 24px' }}>
                Продавайте на<br/>MAYSS — растите x4
              </h2>
              <p style={{ fontSize: 18, color: 'var(--ink-3)', maxWidth: 480, marginBottom: 32 }}>
                124 000 продавцов уже выбрали MAYSS. Без вложений в рекламу — мы приводим покупателей.
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-primary btn-lg" onClick={() => {
                  if (!window.API.getToken()) { window.toast('Сначала войдите или зарегистрируйтесь'); onNav('auth'); return; }
                  onNav('seller');
                }}>Стать продавцом</button>
                <button className="btn btn-ghost btn-lg">Тарифы и условия</button>
              </div>
              <div style={{ display: 'flex', gap: 40, marginTop: 40 }}>
                {[{ v: '482M ₽', l: 'оборот в месяц' }, { v: '12 минут', l: 'регистрация' }, { v: '0 ₽', l: 'до первой продажи' }].map((s) => (
                  <div key={s.l}>
                    <div className="kpi-num" style={{ fontSize: 28, color: 'var(--brand)' }}>{s.v}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: 'var(--bg-2)', borderRadius: 24, padding: 24, position: 'relative' }}>
              <div className="mono" style={{ fontSize: 11, color: 'var(--ink-4)', marginBottom: 12 }}>Аналитика магазина</div>
              {/* Mini chart preview */}
              <svg width="100%" height="180" viewBox="0 0 320 180" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="gA" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="var(--brand)" stopOpacity=".3" />
                    <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0,140 C40,120 60,100 100,90 S160,60 200,50 240,30 320,10 L320,180 L0,180 Z" fill="url(#gA)" />
                <path d="M0,140 C40,120 60,100 100,90 S160,60 200,50 240,30 320,10" stroke="var(--brand)" strokeWidth="2.5" fill="none" />
              </svg>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginTop: 16 }}>
                {[{ l: 'Выручка', v: '4.2M ₽', d: '+12%' }, { l: 'Заказы', v: '1 284', d: '+8%' }].map((k) => (
                  <div key={k.l} style={{ background: 'var(--paper)', borderRadius: 12, padding: 14 }}>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{k.l}</div>
                    <div className="kpi-num" style={{ fontSize: 22, marginTop: 4 }}>{k.v}</div>
                    <div style={{ fontSize: 11, color: 'var(--ok)', marginTop: 2 }}>{k.d}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

// Reusable product card
const ProductCard = ({ p, onClick, width }) => {
  const { formatRub } = window.MAYSS_DATA;
  const { Icon, Stars, ProductPic } = window.MAYSS;
  const favs = window.useFavorites();
  const fav = favs.has(p.id);
  const [adding, setAdding] = useStateL(false);

  const toggleFav = async (e) => {
    e.stopPropagation();
    if (!window.API.getToken()) {
      window.toast('Войдите, чтобы добавлять в избранное');
      location.hash = 'auth';
      return;
    }
    try {
      await window.API.toggleFavorite(p.id);
      await window.refreshFavorites();
    } catch (err) {
      window.toast('Ошибка: ' + err.message, 'error');
    }
  };

  const addToCart = async (e) => {
    e.stopPropagation();
    if (!window.API.getToken()) {
      window.toast('Войдите, чтобы добавить в корзину');
      location.hash = 'auth';
      return;
    }
    setAdding(true);
    try {
      await window.API.addToCart(p.id, 1);
      await window.refreshCart();
      window.toast('Добавлено в корзину', 'success');
    } catch (err) {
      window.toast('Ошибка: ' + err.message, 'error');
    } finally {
      setAdding(false);
    }
  };

  const openProduct = () => { location.hash = `product?id=${p.id}`; };

  return (
    <div onClick={onClick || openProduct} style={{ width: width || 'auto', background: 'var(--paper)', borderRadius: 16, padding: 12, cursor: 'pointer', position: 'relative', transition: 'all .2s', border: '1px solid transparent' }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = 'var(--sh-2)'; e.currentTarget.style.borderColor = 'var(--line)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'transparent'; }}>
      <div style={{ position: 'relative' }}>
        {p.image_url ? (
          <div style={{ height: 220, borderRadius: 12, overflow: 'hidden', background: 'var(--bg-2)' }}>
            <img src={p.image_url} alt={p.ru} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
          </div>
        ) : (
          <ProductPic hue={p.hue} label={`${(p.brand || 'mayss').toLowerCase()}_${p.id}.png`} height={220} rounded={12} />
        )}
        {p.tag && <span className="badge" style={{ position: 'absolute', top: 12, left: 12, background: p.tag.startsWith('-') || p.tag.startsWith('−') ? 'var(--ink)' : 'var(--brand)', color: 'white' }}>{p.tag}</span>}
        <button onClick={toggleFav} style={{ position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="heart" size={18} color={fav ? 'var(--err)' : 'var(--ink-2)'} style={{ fill: fav ? 'var(--err)' : 'none' }} />
        </button>
      </div>
      <div style={{ padding: '12px 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Stars value={p.rating} />
          <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{p.reviews} отзывов</span>
        </div>
        <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.3, marginBottom: 4, height: 36, overflow: 'hidden' }}>{p.ru}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
          <span className="display" style={{ fontWeight: 700, fontSize: 20 }}>{formatRub(p.price)}</span>
          {p.old > 0 && <span className="strike" style={{ fontSize: 13 }}>{formatRub(p.old)}</span>}
        </div>
        <button className="btn btn-soft btn-sm" style={{ width: '100%', marginTop: 12 }} disabled={adding} onClick={addToCart}>
          <Icon name="cart" size={14} /> {adding ? 'Добавляем...' : 'В корзину'}
        </button>
      </div>
    </div>
  );
};

window.MAYSS_SCREENS = window.MAYSS_SCREENS || {};
window.MAYSS_SCREENS.Landing = Landing;
window.MAYSS.ProductCard = ProductCard;
