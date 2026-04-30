// Standalone payment screen — for paying a specific existing order
const Pay = ({ onNav }) => {
  const { formatRub } = window.MAYSS_DATA;
  const { Icon, Header, Footer } = window.MAYSS;
  const params = window.parseHashQuery();
  const orderId = parseInt(params.order_id, 10);

  const [order, setOrder] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [paying, setPaying] = React.useState(false);
  const [paid, setPaid] = React.useState(false);
  const [method, setMethod] = React.useState('card');

  React.useEffect(() => {
    if (!window.API.getToken()) { onNav('auth'); return; }
    if (!orderId) { setLoading(false); return; }
    window.API.getOrder(orderId)
      .then((o) => {
        setOrder(o);
        if (o.status !== 'created') setPaid(true);
      })
      .catch((e) => window.toast(e.message, 'error'))
      .finally(() => setLoading(false));
  }, [orderId]);

  const doPay = async () => {
    setPaying(true);
    try {
      await window.API.pay(order.id, method);
      setPaid(true);
      await window.refreshOrders();
      window.toast('Оплачено!', 'success');
    } catch (e) {
      window.toast(e.message, 'error');
    } finally { setPaying(false); }
  };

  if (loading) {
    return (
      <div style={{ paddingTop: 68, background: 'var(--bg)', minHeight: '100vh' }}>
        <Header onNav={onNav} route="pay" openCart={() => onNav('cart')} />
        <div className="container-wide" style={{ padding: 64, textAlign: 'center' }}>Загрузка...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ paddingTop: 68, background: 'var(--bg)', minHeight: '100vh' }}>
        <Header onNav={onNav} route="pay" openCart={() => onNav('cart')} />
        <div className="container-wide" style={{ padding: 64, textAlign: 'center' }}>
          <h1 className="h-display" style={{ fontSize: 32, margin: '0 0 16px' }}>Заказ не указан</h1>
          <p style={{ color: 'var(--ink-3)', marginBottom: 24 }}>Оплачивайте заказ через корзину или из списка заказов</p>
          <button className="btn btn-primary" onClick={() => onNav('cart')}>В корзину</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: 68, background: 'var(--bg)', minHeight: '100vh' }}>
      <Header onNav={onNav} route="pay" openCart={() => onNav('cart')} />
      <div className="container-wide" style={{ padding: '32px 32px 64px', maxWidth: 720, margin: '0 auto' }}>
        <h1 className="h-display" style={{ fontSize: 48, margin: '0 0 24px' }}>Оплата заказа</h1>

        {paid ? (
          <div className="card" style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: 50, background: 'var(--ok-soft, #d1f4e0)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Icon name="check" size={40} color="var(--ok)" />
            </div>
            <h2 style={{ margin: '0 0 12px' }}>Заказ оплачен</h2>
            <p style={{ color: 'var(--ink-3)', marginBottom: 24 }}>
              M-{String(order.id).padStart(8, '0')} · {formatRub(Number(order.total))}
            </p>
            <button className="btn btn-primary" onClick={() => { location.hash = 'account?tab=orders'; }}>Мои заказы</button>
          </div>
        ) : (
          <>
            <div className="card" style={{ padding: 24, marginBottom: 16 }}>
              <h3 style={{ margin: '0 0 16px' }}>Заказ M-{String(order.id).padStart(8, '0')}</h3>
              {order.items.map((it) => (
                <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 14 }}>
                  <span>{it.title} × {it.quantity}</span>
                  <span>{formatRub(Number(it.price) * it.quantity)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 16, marginTop: 16, borderTop: '1px solid var(--line)', fontSize: 20, fontWeight: 700 }}>
                <span>К оплате</span>
                <span>{formatRub(Number(order.total))}</span>
              </div>
            </div>
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ margin: '0 0 16px' }}>Способ оплаты</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                {['card', 'sbp', 'qr'].map((m) => (
                  <label key={m} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, border: method === m ? '2px solid var(--brand)' : '1px solid var(--line)', borderRadius: 12, cursor: 'pointer' }}>
                    <input type="radio" name="m" checked={method === m} onChange={() => setMethod(m)} style={{ accentColor: 'var(--brand)' }} />
                    <span>{m === 'card' ? 'Банковская карта' : m === 'sbp' ? 'СБП' : 'QR-код'}</span>
                  </label>
                ))}
              </div>
              <button className="btn btn-primary btn-lg" disabled={paying}
                style={{ width: '100%' }} onClick={doPay}>
                {paying ? 'Обрабатываем...' : `Оплатить ${formatRub(Number(order.total))}`}
              </button>
            </div>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
};

window.MAYSS_SCREENS.Pay = Pay;
