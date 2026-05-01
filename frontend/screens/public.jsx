// Публичный профиль магазина
const PublicShop = ({ onNav }) => {
  const { formatRub } = window.MAYSS_DATA;
  const { Header, Footer, ProductCard, CategoryBlob, Icon, Stars } = window.MAYSS;
  const id = window.parseHashQuery().id;
  const [shop, setShop] = React.useState(null);

  React.useEffect(() => {
    if (!id) return;
    window.API.getPublicShop(id).then(setShop).catch(() => window.toast('Магазин не найден', 'error'));
  }, [id]);

  if (!shop) return <div style={{ paddingTop: 68, minHeight: '100vh', background: 'var(--bg)' }}><Header onNav={onNav}/><div style={{padding: 64, textAlign: 'center'}}>Загрузка...</div></div>;

  return (
    <div style={{ paddingTop: 68, background: 'var(--bg)', minHeight: '100vh' }}>
      <Header onNav={onNav} route="shop" openCart={() => onNav('cart')} />
      <div className="container-wide" style={{ padding: '48px 32px 64px' }}>
        <div className="card" style={{ padding: 48, marginBottom: 32, display: 'flex', gap: 32, alignItems: 'center' }}>
          <CategoryBlob hue={(shop.id * 83) % 360} size={120} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <h1 className="h-display" style={{ fontSize: 48, margin: 0 }}>{shop.shop_name}</h1>
              {shop.is_verified && <Icon name="check" size={24} color="var(--brand)" />}
            </div>
            <p style={{ color: 'var(--ink-3)', fontSize: 16, maxWidth: 600, margin: '0 0 16px' }}>{shop.description || 'Нет описания'}</p>
            <div style={{ display: 'flex', gap: 24, fontSize: 14 }}>
              <span><Stars value={shop.rating} size={16} /></span>
              <span style={{ color: 'var(--ink-3)' }}>Товаров: {shop.products.length}</span>
              <span style={{ color: 'var(--ink-3)' }}>На MAYSS с {new Date(shop.created_at).getFullYear()} года</span>
            </div>
          </div>
        </div>

        <h2 className="h-display" style={{ fontSize: 32, marginBottom: 24 }}>Товары магазина</h2>
        {shop.products.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--ink-3)' }}>У магазина пока нет активных товаров</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {shop.products.map(p => <ProductCard key={p.id} p={window.MAPPERS.mapProduct(p)} />)}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

// Публичный профиль пользователя
const PublicUser = ({ onNav }) => {
  const { Header, Footer, Icon } = window.MAYSS;
  const id = window.parseHashQuery().id;
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    if (!id) return;
    window.API.getPublicUser(id).then(setUser).catch(() => window.toast('Пользователь не найден', 'error'));
  }, [id]);

  if (!user) return <div style={{ paddingTop: 68, minHeight: '100vh', background: 'var(--bg)' }}><Header onNav={onNav}/><div style={{padding: 64, textAlign: 'center'}}>Загрузка...</div></div>;

  return (
    <div style={{ paddingTop: 68, background: 'var(--bg)', minHeight: '100vh' }}>
      <Header onNav={onNav} route="user" openCart={() => onNav('cart')} />
      <div className="container" style={{ padding: '64px 32px' }}>
        <div className="card" style={{ padding: 48, textAlign: 'center', maxWidth: 600, margin: '0 auto' }}>
          <div style={{ width: 96, height: 96, borderRadius: 50, background: 'var(--brand-soft)', color: 'var(--brand)', margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, fontWeight: 700 }}>
            {user.full_name[0]}
          </div>
          <h1 className="h-display" style={{ fontSize: 40, margin: '0 0 8px' }}>{user.full_name}</h1>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, color: 'var(--ink-3)', fontSize: 14 }}>
            <span className="badge badge-soft">{user.role}</span>
            <span>С нами с {new Date(user.created_at).toLocaleDateString('ru-RU')}</span>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

window.MAYSS_SCREENS.PublicShop = PublicShop;
window.MAYSS_SCREENS.PublicUser = PublicUser;
