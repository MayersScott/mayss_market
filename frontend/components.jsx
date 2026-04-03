// Shared UI primitives for MAYSS
const { useState, useEffect, useMemo, useRef, createContext, useContext } = React;

// === Logo ===
const Logo = ({ size = 28, mono = false }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect x="2" y="2" width="28" height="28" rx="8" fill={mono ? 'var(--ink)' : 'var(--brand)'} />
      <path d="M9 22V10l7 9 7-9v12" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
    <span className="display" style={{ fontWeight: 700, fontSize: size * 0.72, letterSpacing: '-0.04em', color: 'var(--ink)' }}>MAYSS</span>
  </div>
);

// === Icon (lightweight inline SVG) ===
const Icon = ({ name, size = 20, color = 'currentColor', style }) => {
  const paths = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>,
    cart: <><circle cx="9" cy="21" r="1.5" /><circle cx="18" cy="21" r="1.5" /><path d="M3 3h2l2.4 12.5a2 2 0 0 0 2 1.5h7.7a2 2 0 0 0 2-1.6L21 7H6" /></>,
    heart: <path d="M19 14c1.5-1.5 3-3.3 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .8-4.5 2.5C10.5 3.8 9.3 3 7.5 3A5.5 5.5 0 0 0 2 8.5c0 2.2 1.5 4 3 5.5l7 7Z" />,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
    menu: <><path d="M3 6h18M3 12h18M3 18h18" /></>,
    close: <><path d="M18 6 6 18M6 6l12 12" /></>,
    star: <path d="m12 3 2.7 6.1 6.6.6-5 4.5 1.5 6.6L12 17.5 6.2 20.8l1.5-6.6-5-4.5 6.6-.6Z" />,
    chevR: <path d="m9 6 6 6-6 6" />,
    chevL: <path d="m15 6-6 6 6 6" />,
    chevD: <path d="m6 9 6 6 6-6" />,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    minus: <path d="M5 12h14" />,
    check: <path d="m5 13 4 4L19 7" />,
    arrR: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    arrUR: <><path d="M7 17 17 7" /><path d="M7 7h10v10" /></>,
    box: <><path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" /><path d="M3 8l9 5 9-5M12 13v8" /></>,
    truck: <><rect x="1" y="6" width="14" height="11" rx="1" /><path d="M15 9h4l3 3v5h-7" /><circle cx="6" cy="19" r="2" /><circle cx="18" cy="19" r="2" /></>,
    pin: <><path d="M12 22s7-7 7-12a7 7 0 1 0-14 0c0 5 7 12 7 12Z" /><circle cx="12" cy="10" r="2.5" /></>,
    card: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></>,
    chart: <><path d="M3 3v18h18" /><path d="m7 14 4-4 4 4 5-7" /></>,
    pie: <><path d="M12 3v9l7 5" /><path d="M21 12a9 9 0 1 1-9-9" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></>,
    bell: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10 21a2 2 0 0 0 4 0" /></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    list: <><path d="M8 6h13M8 12h13M8 18h13" /><circle cx="3.5" cy="6" r="1" /><circle cx="3.5" cy="12" r="1" /><circle cx="3.5" cy="18" r="1" /></>,
    filter: <path d="M3 5h18l-7 9v6l-4-2v-4L3 5Z" />,
    trash: <><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M5 6l1 14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-14" /></>,
    pkg: <><path d="M16 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0-1 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 16 16Z" transform="translate(4)" /><path d="m3.3 7 7.7 4.3 7.7-4.3" transform="translate(0)" /></>,
    wallet: <><path d="M21 12V8a2 2 0 0 0-2-2H5a2 2 0 0 1 0-4h14v4" /><path d="M3 6v12a2 2 0 0 0 2 2h16v-6" /><circle cx="17" cy="14" r="1.5" /></>,
    ad: <><path d="M3 11v3a1 1 0 0 0 1 1h3l5 5V5L7 10H4a1 1 0 0 0-1 1Z" /><path d="M16 8a5 5 0 0 1 0 8" /></>,
    msg: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />,
    shield: <path d="M12 2 4 5v6c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V5l-8-3Z" />,
    ban: <><circle cx="12" cy="12" r="10" /><path d="m4.9 4.9 14.2 14.2" /></>,
    dl: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5M12 15V3" /></>,
    eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
    moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
    qr: <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><path d="M14 14h3v3M20 14v7M14 20h3" /></>,
    sbp: <><circle cx="12" cy="12" r="9" /><path d="M12 7v10M7 12h10" /></>,
    lock: <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
    dots: <><circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /></>,
    edit: <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4Z" /></>,
    fire: <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.5-2-5-1 1-2 1.5-3 1.5 0-3-1.5-5.5-4-8-1 4-3 5-4 7a7 7 0 0 0 6 11.5Z" />,
    spark: <path d="m12 3 2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6Z" />,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={style}>
      {paths[name] || <circle cx="12" cy="12" r="10" />}
    </svg>
  );
};

// === Stars ===
const Stars = ({ value, size = 14 }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
    <Icon name="star" size={size} color="#F5A623" style={{ fill: '#F5A623' }} />
    <span style={{ fontWeight: 600, fontSize: size, fontVariantNumeric: 'tabular-nums' }}>{value.toFixed(1)}</span>
  </span>
);

// === Placeholder image with category hue ===
const ProductPic = ({ hue = 230, label = 'product', height = 200, rounded = 16, mono = false }) => {
  const bg = mono ? 'var(--bg-2)' : `oklch(0.92 0.06 ${hue})`;
  const stripe = mono ? 'rgba(14,14,18,0.05)' : `oklch(0.82 0.10 ${hue})`;
  return (
    <div style={{
      height, borderRadius: rounded,
      background: `repeating-linear-gradient(135deg, transparent 0 9px, ${stripe} 9px 10px), ${bg}`,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-start', padding: 12,
      position: 'relative', overflow: 'hidden',
    }}>
      <span className="mono" style={{ fontSize: 10, color: mono ? 'var(--ink-4)' : `oklch(0.35 0.10 ${hue})`, opacity: .8 }}>
        {label}
      </span>
    </div>
  );
};

// === Category 3D-ish blob ===
const CategoryBlob = ({ hue = 230, size = 80 }) => (
  <svg width={size} height={size} viewBox="0 0 80 80">
    <defs>
      <radialGradient id={`g${hue}`} cx="35%" cy="30%">
        <stop offset="0%" stopColor={`oklch(0.94 0.10 ${hue})`} />
        <stop offset="60%" stopColor={`oklch(0.72 0.16 ${hue})`} />
        <stop offset="100%" stopColor={`oklch(0.55 0.18 ${hue})`} />
      </radialGradient>
      <filter id={`s${hue}`}><feGaussianBlur stdDeviation="0.5" /></filter>
    </defs>
    <ellipse cx="42" cy="68" rx="22" ry="4" fill="rgba(14,14,18,0.10)" filter={`url(#s${hue})`} />
    <circle cx="40" cy="38" r="26" fill={`url(#g${hue})`} />
    <ellipse cx="32" cy="28" rx="9" ry="6" fill="rgba(255,255,255,0.45)" />
  </svg>
);

// === Theme + Tweaks context ===
const TweaksContext = createContext({});

// === Top header ===
const Header = ({ onNav, route, openCart }) => {
  const [search, setSearch] = useState('');
  const cart = window.useCart();
  const me = window.useMe();
  const cartCount = cart.items.reduce((s, it) => s + it.quantity, 0);

  const requireAuth = (target) => {
    if (!window.API.getToken()) {
      window.toast('Войдите в аккаунт');
      onNav('auth');
      return false;
    }
    if (target) location.hash = target;
    return true;
  };

  const submitSearch = () => {
    if (search.trim()) {
      location.hash = `catalog?q=${encodeURIComponent(search.trim())}`;
    } else {
      onNav('catalog');
    }
  };

  return (
    <header className="app-shell">
      <div className="container-wide" style={{ display: 'flex', alignItems: 'center', gap: 24, height: 68 }}>
        <a onClick={() => onNav('landing')} style={{ cursor: 'pointer' }}><Logo size={26} /></a>
        <button className="btn btn-ghost btn-sm" onClick={() => onNav('catalog')} style={{ gap: 6 }}>
          <Icon name="grid" size={16} /> Каталог
        </button>
        <div style={{ flex: 1, position: 'relative', maxWidth: 640 }}>
          <Icon name="search" size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }} />
          <input className="input" style={{ paddingLeft: 44, background: 'var(--bg-2)', borderColor: 'transparent' }}
            placeholder="Искать на MAYSS — товары, бренды, магазины"
            value={search} onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submitSearch(); }} />
        </div>
        <nav style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
          {!me && (
            <button className="btn btn-primary btn-sm" onClick={() => onNav('auth')}
              style={{ padding: '8px 16px', height: 40 }}>
              Войти
            </button>
          )}
          {me && [
            { id: 'profile', icon: 'user', label: 'Профиль', target: 'account?tab=dash' },
            { id: 'orders', icon: 'pkg', label: 'Заказы', target: 'account?tab=orders' },
            { id: 'fav', icon: 'heart', label: 'Избранное', target: 'account?tab=fav' },
          ].map((it) => (
            <button key={it.id} className="btn btn-ghost btn-sm"
              onClick={() => { location.hash = it.target; }}
              style={{ flexDirection: 'column', gap: 2, padding: '8px 12px', border: 'none', height: 52 }}>
              <Icon name={it.icon} size={20} />
              <span style={{ fontSize: 11, fontWeight: 500 }}>{it.label}</span>
            </button>
          ))}
          <button className="btn btn-ghost btn-sm"
            onClick={() => { if (!window.API.getToken()) { onNav('auth'); return; } openCart(); }}
            style={{ flexDirection: 'column', gap: 2, padding: '8px 12px', border: 'none', height: 52, position: 'relative' }}>
            <Icon name="cart" size={20} />
            <span style={{ fontSize: 11, fontWeight: 500 }}>Корзина</span>
            {cartCount > 0 && <span style={{
              position: 'absolute', top: 4, right: 4,
              background: 'var(--brand)', color: 'white', fontSize: 10, fontWeight: 700,
              minWidth: 16, height: 16, borderRadius: 10, padding: '0 4px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{cartCount}</span>}
          </button>
        </nav>
      </div>
    </header>
  );
};

// === Footer ===
const Footer = () => (
  <footer style={{ background: 'var(--ink)', color: 'var(--paper)', padding: '64px 0 32px', marginTop: 80 }}>
    <div className="container-wide">
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr repeat(4, 1fr)', gap: 48, marginBottom: 56 }}>
        <div>
          <Logo size={28} mono />
          <p style={{ color: 'var(--ink-4)', fontSize: 14, lineHeight: 1.6, marginTop: 16, maxWidth: 320 }}>
            Маркетплейс нового поколения. 124 000 продавцов, 18 миллионов товаров, доставка в любой город России за 1–3 дня.
          </p>
        </div>
        {[
          { h: 'Покупателям', items: ['Как заказать', 'Способы оплаты', 'Доставка', 'Возврат и обмен', 'Подарочные карты'] },
          { h: 'Продавцам', items: ['Стать продавцом', 'Тарифы', 'Поддержка', 'API для бизнеса', 'Логистика'] },
          { h: 'Компания', items: ['О нас', 'Карьера', 'Пресс-центр', 'Партнёрство', 'Инвесторам'] },
          { h: 'Помощь', items: ['Центр помощи', 'Контакты', 'Безопасность', 'Условия', 'Конфиденциальность'] },
        ].map((c) => (
          <div key={c.h}>
            <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: 'var(--paper)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{c.h}</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {c.items.map((x) => <li key={x} style={{ color: 'var(--ink-4)', fontSize: 14 }}><a style={{ cursor: 'pointer' }}>{x}</a></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 24, borderTop: '1px solid #2A2A33', color: 'var(--ink-4)', fontSize: 13 }}>
        <span>© 2026 MAYSS Marketplace · Все права защищены</span>
        <span className="mono" style={{ fontSize: 12 }}>v4.18.2 · Москва</span>
      </div>
    </div>
  </footer>
);

window.MAYSS = { Logo, Icon, Stars, ProductPic, CategoryBlob, Header, Footer, TweaksContext };
// commit 28: feat: add simple index html note
