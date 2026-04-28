// Product page — live data from API, full tabs preserved
const Product = ({ onNav }) => {
  const { formatRub } = window.MAYSS_DATA;
  const { Icon, Stars, ProductPic, Header, Footer, ProductCard, CategoryBlob } = window.MAYSS;

  const params = window.parseHashQuery();
  const productId = parseInt(params.id, 10) || 1;

  const [p, setP] = React.useState(null);
  const [related, setRelated] = React.useState([]);
  const [reviews, setReviews] = React.useState([]);
  const [activeImg, setActiveImg] = React.useState(0);
  const [color, setColor] = React.useState(0);
  const [tab, setTab] = React.useState('Описание');
  const [qty, setQty] = React.useState(1);
  const [adding, setAdding] = React.useState(false);
  const [reviewForm, setReviewForm] = React.useState({ rating: 5, text: '' });
  const [showReviewForm, setShowReviewForm] = React.useState(false);

  const favs = window.useFavorites();
  const fav = p ? favs.has(p.id) : false;

  React.useEffect(() => {
    (async () => {
      try {
        const raw = await window.API.getProduct(productId);
        const mapped = window.MAPPERS.mapProduct(raw);
        setP(mapped);
        const [rs, list] = await Promise.all([
          window.API.listProductReviews(productId).catch(() => []),
          window.API.listProducts({ page_size: 4 }).catch(() => ({ items: [] })),
        ]);
        setReviews(rs);
        setRelated((list.items || []).filter((x) => x.id !== productId).slice(0, 4).map(window.MAPPERS.mapProduct));
      } catch (e) {
        window.toast('Товар не найден', 'error');
      }
    })();
    window.scrollTo(0, 0);
  }, [productId]);

  const toggleFav = async () => {
    if (!window.API.getToken()) { window.toast('Войдите'); onNav('auth'); return; }
    try {
      await window.API.toggleFavorite(p.id);
      await window.refreshFavorites();
    } catch (e) { window.toast('Ошибка: ' + e.message, 'error'); }
  };

  const addToCart = async (goToCart = false) => {
    if (!window.API.getToken()) { window.toast('Войдите'); onNav('auth'); return; }
    setAdding(true);
    try {
      await window.API.addToCart(p.id, qty);
      await window.refreshCart();
      window.toast('Добавлено в корзину', 'success');
      if (goToCart) onNav('cart');
    } catch (e) {
      window.toast('Ошибка: ' + e.message, 'error');
    } finally { setAdding(false); }
  };

  const submitReview = async () => {
    if (!window.API.getToken()) { window.toast('Войдите'); onNav('auth'); return; }
    try {
      await window.API.createReview({ product_id: p.id, rating: reviewForm.rating, text: reviewForm.text });
      window.toast('Отзыв опубликован', 'success');
      const rs = await window.API.listProductReviews(p.id);
      setReviews(rs);
      setShowReviewForm(false);
      setReviewForm({ rating: 5, text: '' });
    } catch (e) {
      window.toast(e.message, 'error');
    }
  };

  if (!p) {
    return (
      <div style={{ paddingTop: 68, background: 'var(--bg)', minHeight: '100vh' }}>
        <Header onNav={onNav} route="product" openCart={() => onNav('cart')} />
        <div className="container-wide" style={{ padding: 64, textAlign: 'center', color: 'var(--ink-3)' }}>Загрузка...</div>
      </div>
    );
  }

  const colors = [
    { name: 'Графит', hue: 230, code: '#0E0E12' },
    { name: 'Снег', hue: 220, code: '#F5F5F2' },
    { name: 'Песок', hue: 60, code: '#D4C5A0' },
    { name: 'Индиго', hue: 250, code: '#3D5AFE' },
  ];

  const tabs = ['Описание', 'Характеристики', `Отзывы ${reviews.length}`];
  const discountPct = p.old > 0 ? Math.round((1 - p.price / p.old) * 100) : 0;

  return (
    <div style={{ paddingTop: 68, background: 'var(--bg)', minHeight: '100vh' }}>
      <Header onNav={onNav} route="product" openCart={() => onNav('cart')} />

      <div className="container-wide" style={{ padding: '24px 32px 64px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 13, color: 'var(--ink-3)' }}>
          <a onClick={() => onNav('landing')} style={{ cursor: 'pointer' }}>MAYSS</a>
          <Icon name="chevR" size={12} />
          <a onClick={() => onNav('catalog')} style={{ cursor: 'pointer' }}>Каталог</a>
          <Icon name="chevR" size={12} />
          <span style={{ color: 'var(--ink)' }}>{p.ru}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '88px 1fr 380px', gap: 24, alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <button key={i} onClick={() => setActiveImg(i)} style={{ background: 'none', border: activeImg === i ? '2px solid var(--brand)' : '1px solid var(--line)', borderRadius: 12, padding: 4, cursor: 'pointer' }}>
                {p.image_url ? (
                  <div style={{ height: 68, width: 68, borderRadius: 8, overflow: 'hidden', background: 'var(--bg-2)' }}>
                    <img src={p.image_url + (i ? `?v=${i}` : '')} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ) : (<ProductPic hue={p.hue + i * 5} label={`v${i + 1}`} height={68} rounded={8} />)}
              </button>
            ))}
          </div>

          <div>
            <div style={{ position: 'relative' }}>
              {p.image_url ? (
                <div style={{ height: 560, borderRadius: 20, overflow: 'hidden', background: 'var(--bg-2)' }}>
                  <img src={p.image_url} alt={p.ru} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ) : (<ProductPic hue={p.hue + activeImg * 5} label={`${p.brand.toLowerCase()}_main.png`} height={560} rounded={20} />)}
              <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', gap: 6 }}>
                {discountPct > 0 && <span className="badge" style={{ background: 'var(--brand)', color: 'white' }}>−{discountPct}%</span>}
                {p.reviews > 100 && <span className="badge badge-ink">Хит продаж</span>}
              </div>
              <button onClick={toggleFav} style={{ position: 'absolute', top: 16, right: 16, width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.95)', border: 'none', cursor: 'pointer' }}>
                <Icon name="heart" size={20} color={fav ? 'var(--err)' : 'var(--ink-2)'} style={{ fill: fav ? 'var(--err)' : 'none' }} />
              </button>
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
              {[{ icon: 'truck', t: 'Доставка завтра', s: 'Бесплатно от 1 500 ₽' }, { icon: 'shield', t: 'Гарантия 2 года', s: 'Официально от бренда' }, { icon: 'pkg', t: 'Возврат 14 дней', s: 'Без объяснения причин' }].map((x) => (
                <div key={x.t} style={{ flex: 1, padding: 16, background: 'var(--paper)', borderRadius: 12, border: '1px solid var(--line)' }}>
                  <Icon name={x.icon} size={20} color="var(--brand)" />
                  <div style={{ fontWeight: 600, fontSize: 14, marginTop: 8 }}>{x.t}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{x.s}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ position: 'sticky', top: 84 }}>
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span className="mono" style={{ fontSize: 11, color: 'var(--ink-4)' }}>ART · {(p.brand || 'MS').toUpperCase()}-{p.id}</span>
              </div>
              <h1 className="display" style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.15, margin: '0 0 12px' }}>{p.ru}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <Stars value={p.rating} size={16} />
                <a onClick={() => setTab(tabs[2])} style={{ fontSize: 13, color: 'var(--ink-3)', cursor: 'pointer', textDecoration: 'underline' }}>{p.reviews} отзывов</a>
                <span style={{ fontSize: 13, color: p.stock > 0 ? 'var(--ok)' : 'var(--err)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span className="dot" style={{ background: p.stock > 0 ? 'var(--ok)' : 'var(--err)' }}></span>
                  {p.stock > 0 ? `В наличии (${p.stock} шт)` : 'Нет в наличии'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
                <span className="display" style={{ fontWeight: 700, fontSize: 40 }}>{formatRub(p.price)}</span>
                {p.old > 0 && <span className="strike" style={{ fontSize: 18 }}>{formatRub(p.old)}</span>}
              </div>
              {discountPct > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                  <span className="badge badge-ok">−{discountPct}%</span>
                  <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>или 4 платежа по {formatRub(Math.round(p.price / 4))}</span>
                </div>
              )}

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Цвет: <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>{colors[color].name}</span></div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {colors.map((c, i) => (
                    <button key={i} onClick={() => setColor(i)} style={{ width: 44, height: 44, borderRadius: 10, background: c.code, border: color === i ? '2px solid var(--brand)' : '1px solid var(--line)', cursor: 'pointer', boxShadow: color === i ? '0 0 0 3px var(--brand-soft)' : 'none' }} />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Количество:</span>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--line)', borderRadius: 10 }}>
                  <button onClick={() => setQty(Math.max(1, qty - 1))} style={{ width: 36, height: 36, background: 'none', border: 'none', cursor: 'pointer' }}><Icon name="minus" size={14} /></button>
                  <span style={{ minWidth: 32, textAlign: 'center', fontWeight: 600 }}>{qty}</span>
                  <button onClick={() => setQty(Math.min(p.stock, qty + 1))} style={{ width: 36, height: 36, background: 'none', border: 'none', cursor: 'pointer' }}><Icon name="plus" size={14} /></button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                <button className="btn btn-primary btn-lg" style={{ width: '100%' }}
                  disabled={adding || p.stock === 0}
                  onClick={() => addToCart(true)}>
                  Купить сейчас
                </button>
                <button className="btn btn-ghost btn-lg" style={{ width: '100%' }}
                  disabled={adding || p.stock === 0}
                  onClick={() => addToCart(false)}>
                  <Icon name="cart" size={16} /> {adding ? 'Добавляем...' : 'Добавить в корзину'}
                </button>
              </div>

              <div style={{ background: 'var(--bg-2)', borderRadius: 12, padding: 14, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <Icon name="truck" size={20} color="var(--brand)" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: 13 }}>
                  <div style={{ fontWeight: 600 }}>Доставка завтра</div>
                  <div style={{ color: 'var(--ink-3)', marginTop: 2 }}>В пункт выдачи · бесплатно</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ marginTop: 64 }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', marginBottom: 32 }}>
            {tabs.map((t) => (
              <button key={t} onClick={() => setTab(t)}
                style={{ background: 'none', border: 'none', padding: '16px 24px', fontSize: 16, fontWeight: 500, color: t === tab ? 'var(--ink)' : 'var(--ink-3)', borderBottom: t === tab ? '2px solid var(--ink)' : '2px solid transparent', cursor: 'pointer' }}>
                {t}
              </button>
            ))}
          </div>

          {tab === 'Описание' && (
            <div style={{ maxWidth: 800 }}>
              <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--ink-2)' }}>
                {p.description || 'Описание скоро будет добавлено продавцом.'}
              </p>
            </div>
          )}

          {tab === 'Характеристики' && (
            <div style={{ maxWidth: 800 }}>
              {[
                ['Магазин', <a onClick={() => location.hash = `shop?id=${p.seller_id}`} style={{color: 'var(--brand)', cursor: 'pointer', textDecoration: 'underline'}}>Перейти в магазин</a>],
                ['Бренд', p.brand || '—'],
                ['Артикул', `${(p.brand || 'MS').toUpperCase()}-${p.id}`],
                ['Рейтинг', `${p.rating} ★`],
                ['В наличии', `${p.stock} шт`],
                ['Категория', window.MAYSS_DATA.CATEGORIES.find((c) => c.id == p.category_id)?.ru || '—'],
              ].map((row, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24, padding: '12px 0', borderBottom: '1px solid var(--line-2)' }}>
                  <span style={{ color: 'var(--ink-3)', fontSize: 14 }}>{row[0]}</span>
                  <span style={{ fontSize: 14 }}>{row[1]}</span>
                </div>
              ))}
            </div>
          )}

          {tab.startsWith('Отзывы') && (
            <div style={{ maxWidth: 800 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h3 style={{ margin: 0 }}>Отзывы покупателей</h3>
                <button className="btn btn-primary btn-sm" onClick={() => setShowReviewForm(!showReviewForm)}>
                  {showReviewForm ? 'Скрыть' : 'Оставить отзыв'}
                </button>
              </div>

              {showReviewForm && (
                <div className="card" style={{ padding: 20, marginBottom: 24 }}>
                  <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 0 }}>
                    Отзыв можно оставить только на купленный и доставленный товар
                  </p>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} onClick={() => setReviewForm({ ...reviewForm, rating: n })}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        <Icon name="star" size={28}
                          color={n <= reviewForm.rating ? 'var(--brand)' : 'var(--line)'}
                          style={{ fill: n <= reviewForm.rating ? 'var(--brand)' : 'none' }} />
                      </button>
                    ))}
                  </div>
                  <textarea className="input" rows={4} placeholder="Ваш отзыв"
                    value={reviewForm.text}
                    onChange={(e) => setReviewForm({ ...reviewForm, text: e.target.value })}
                    style={{ width: '100%', resize: 'vertical' }} />
                  <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={submitReview}>
                    Опубликовать
                  </button>
                </div>
              )}

              {reviews.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-3)' }}>
                  Пока нет отзывов. Будьте первым!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {reviews.map((r) => (
                    <div key={r.id} className="card" style={{ padding: 20 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Stars value={r.rating} />
                        <span style={{ fontSize: 13, color: 'var(--ink-4)' }}>
                          {new Date(r.created_at).toLocaleDateString('ru-RU')}
                        </span>
                      </div>
                      <div style={{ fontSize: 14, lineHeight: 1.5 }}>{r.text || '—'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {related.length > 0 && (
          <div style={{ marginTop: 80 }}>
            <h2 className="h-display" style={{ fontSize: 40, marginBottom: 24 }}>С этим покупают</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              {related.map((rp) => <ProductCard key={rp.id} p={rp} />)}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

window.MAYSS_SCREENS.Product = Product;
// commit 31: feat: add catalog screen small placeholder
