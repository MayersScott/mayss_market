// Design system reference
const DesignSystem = ({ onNav }) => {
  const { Icon, Logo, Stars, ProductPic, CategoryBlob, Header, Footer } = window.MAYSS;
  const Block = ({ title, children }) => (
    <section style={{ marginBottom: 80 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 24 }}>
        <h2 className="h-display" style={{ fontSize: 40, margin: 0 }}>{title}</h2>
        <span className="mono" style={{ fontSize: 11, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '.08em' }}>{title.toLowerCase()}</span>
      </div>
      {children}
    </section>
  );

  const swatch = (name, value, light) => (
    <div key={name} style={{ background: 'var(--paper)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--line)' }}>
      <div style={{ height: 80, background: value }}></div>
      <div style={{ padding: 12 }}>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{name}</div>
        <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{value}</div>
      </div>
    </div>
  );

  return (
    <div style={{ paddingTop: 68, background: 'var(--bg)', minHeight: '100vh' }}>
      <Header onNav={onNav} route="ds" openCart={() => onNav('cart')} />
      <div className="container-wide" style={{ padding: '40px 32px 80px' }}>
        <div style={{ marginBottom: 56 }}>
          <span className="badge badge-soft">v1.0 · 26 апр 2026</span>
          <h1 className="h-display" style={{ fontSize: 96, margin: '12px 0 16px' }}>MAYSS<br/>Design System</h1>
          <p style={{ fontSize: 18, color: 'var(--ink-3)', maxWidth: 600 }}>Визуальный язык маркетплейса MAYSS. Цвета, типографика, компоненты, паттерны.</p>
        </div>

        <Block title="Цвета">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 16 }}>
            {swatch('Brand', '#3D5AFE')}
            {swatch('Brand Ink', '#2A3FCC')}
            {swatch('Ink', '#0E0E12')}
            {swatch('Ink-3', '#5A5A66')}
            {swatch('Background', '#FAFAF7')}
            {swatch('Paper', '#FFFFFF')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
            {swatch('Success', '#00A86B')}
            {swatch('Warn', '#E8A317')}
            {swatch('Error', '#E5484D')}
            {swatch('Acid', '#D6FF3D')}
            {swatch('Plum', '#5B2A86')}
            {swatch('Brand Soft', '#E8ECFF')}
          </div>
        </Block>

        <Block title="Типографика">
          <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 16, padding: 32 }}>
            <div className="h-display" style={{ fontSize: 96, marginBottom: 8 }}>Display 96</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 32 }}>Space Grotesk · 700 · −0.04em</div>
            <h2 className="h-display" style={{ fontSize: 56, margin: '0 0 8px' }}>Heading 56</h2>
            <h3 className="h-display" style={{ fontSize: 32, margin: '0 0 8px' }}>Subheading 32</h3>
            <p style={{ fontSize: 18, color: 'var(--ink-2)', maxWidth: 600 }}>Body Large 18 · Inter Regular. Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt.</p>
            <p style={{ fontSize: 14, color: 'var(--ink-2)', maxWidth: 600 }}>Body 14 · Inter Regular. Базовый текст для интерфейса.</p>
            <p className="mono" style={{ fontSize: 12, color: 'var(--ink-3)' }}>Mono 12 · JetBrains Mono · для метаданных</p>
          </div>
        </Block>

        <Block title="Кнопки">
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
            <button className="btn btn-primary btn-lg">Primary Large</button>
            <button className="btn btn-primary">Primary</button>
            <button className="btn btn-brand">Brand</button>
            <button className="btn btn-soft">Soft</button>
            <button className="btn btn-ghost">Ghost</button>
            <button className="btn btn-primary btn-sm">Small</button>
            <button className="btn btn-ghost btn-icon"><Icon name="heart" size={16} /></button>
          </div>
        </Block>

        <Block title="Инпуты и формы">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, maxWidth: 720 }}>
            <input className="input input-lg" placeholder="Large input" />
            <input className="input" placeholder="Default input" />
            <select className="input"><option>Select option</option></select>
            <div style={{ display: 'flex', gap: 8 }}>
              <span className="chip">Chip default</span>
              <span className="chip active">Chip active</span>
            </div>
          </div>
        </Block>

        <Block title="Бейджи">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className="badge badge-ok">Success</span>
            <span className="badge badge-warn">Warning</span>
            <span className="badge badge-err">Error</span>
            <span className="badge badge-ink">Ink</span>
            <span className="badge badge-brand">Brand</span>
            <span className="badge badge-soft">Soft</span>
          </div>
        </Block>

        <Block title="Карточки и плейсхолдеры">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {[230, 320, 50, 160].map((h) => <ProductPic key={h} hue={h} label={`hue ${h}`} height={160} />)}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
            {[230, 50, 320, 160].map((h) => <CategoryBlob key={h} hue={h} size={96} />)}
          </div>
        </Block>

        <Block title="Радиусы и тени">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {[
              { l: 'sm 8', r: 8, sh: 'var(--sh-1)' },
              { l: 'md 12', r: 12, sh: 'var(--sh-2)' },
              { l: 'lg 16', r: 16, sh: 'var(--sh-3)' },
              { l: '2xl 32', r: 32, sh: 'var(--sh-brand)' },
            ].map((s) => (
              <div key={s.l} style={{ background: 'var(--paper)', borderRadius: s.r, padding: 24, boxShadow: s.sh, border: '1px solid var(--line)' }}>
                <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{s.l}px</div>
              </div>
            ))}
          </div>
        </Block>

        <Block title="Все экраны">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { id: 'landing', t: 'Лендинг' },
              { id: 'catalog', t: 'Каталог' },
              { id: 'product', t: 'Товар' },
              { id: 'cart', t: 'Корзина и чекаут' },
              { id: 'auth', t: 'Авторизация' },
              { id: 'account', t: 'Кабинет покупателя' },
              { id: 'seller', t: 'Кабинет продавца' },
              { id: 'admin', t: 'Админ-панель' },
              { id: 'pay', t: 'Оплата' },
            ].map((s, i) => (
              <button key={s.id} onClick={() => onNav(s.id)} className="card" style={{ padding: 20, textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>0{i + 1}</div>
                  <div style={{ fontWeight: 600, fontSize: 16, marginTop: 4 }}>{s.t}</div>
                </div>
                <Icon name="arrUR" size={20} />
              </button>
            ))}
          </div>
        </Block>
      </div>
      <Footer />
    </div>
  );
};

window.MAYSS_SCREENS.DesignSystem = DesignSystem;
