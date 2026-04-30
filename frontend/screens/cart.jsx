// Cart + multi-step checkout — real API
const Cart = ({ onNav }) => {
  const { formatRub } = window.MAYSS_DATA;
  const { Icon, ProductPic, Header, Footer, CategoryBlob } = window.MAYSS;

  const cart = window.useCart();
  const me = window.useMe();
  const [step, setStep] = React.useState(0);
  const [promo, setPromo] = React.useState('');
  const [promoPreview, setPromoPreview] = React.useState(null);
  const [bonusBalance, setBonusBalance] = React.useState(0);
  const [bonusMaxPercent, setBonusMaxPercent] = React.useState(50);
  const [bonusEarnPercent, setBonusEarnPercent] = React.useState(3);
  const [bonusToSpend, setBonusToSpend] = React.useState(0);
  const [delivery, setDelivery] = React.useState('pvz');
  const [payment, setPayment] = React.useState('card');
  const [addressMode, setAddressMode] = React.useState('saved'); // 'saved' | 'manual'
  const [selectedAddrId, setSelectedAddrId] = React.useState(null);
  const [manualAddr, setManualAddr] = React.useState('');
  const [manualCity, setManualCity] = React.useState('');
  const [manualStreet, setManualStreet] = React.useState('');
  const [manualBuilding, setManualBuilding] = React.useState('');
  const [manualApt, setManualApt] = React.useState('');
  const [entrance, setEntrance] = React.useState('');
  const [floor, setFloor] = React.useState('');
  const [addresses, setAddresses] = React.useState([]);
  const [cards, setCards] = React.useState([]);
  const [selectedCardId, setSelectedCardId] = React.useState(null);
  const [placing, setPlacing] = React.useState(false);
  const [createdOrders, setCreatedOrders] = React.useState([]);

  React.useEffect(() => {
    if (!window.API.getToken()) {
      window.toast('Войдите, чтобы открыть корзину');
      onNav('auth');
      return;
    }
    window.refreshCart();
    window.API.listAddresses().then((adrs) => {
      setAddresses(adrs);
      const def = adrs.find((a) => a.is_default);
      if (def) {
        setSelectedAddrId(def.id);
        setAddressMode('saved');
      } else if (adrs.length === 0) {
        setAddressMode('manual');
      }
    }).catch(() => { setAddressMode('manual'); });
    window.API.listCards().then((cs) => {
      setCards(cs);
      const def = cs.find((c) => c.is_default);
      if (def) setSelectedCardId(def.id);
    }).catch(() => {});
    window.API.bonusBalance().then((b) => {
      setBonusBalance(Number(b.balance) || 0);
      if (b.max_spend_percent != null) setBonusMaxPercent(Number(b.max_spend_percent));
      if (b.earn_percent != null) setBonusEarnPercent(Number(b.earn_percent));
    }).catch(() => {});
  }, []);

  const items = cart.items;
  const subtotal = Number(cart.total) || 0;
  const discount = promoPreview ? Number(promoPreview.discount) : 0;
  const bonusCapByPercent = Math.floor(subtotal * (bonusMaxPercent / 100));
  const bonusMaxApplicable = Math.max(0, Math.min(bonusBalance, bonusCapByPercent, subtotal - discount));
  const bonusApplied = Math.min(bonusToSpend, bonusMaxApplicable);
  const shipping = subtotal > 1500 ? 0 : 299;
  const total = Math.max(subtotal - discount - bonusApplied, 0) + shipping;

  const updateQty = async (productId, newQty) => {
    if (newQty < 1) return removeItem(productId);
    try {
      await window.API.updateCartQuantity(productId, newQty);
      await window.refreshCart();
    } catch (e) { window.toast('Ошибка: ' + e.message, 'error'); }
  };
  const removeItem = async (productId) => {
    try {
      await window.API.removeFromCart(productId);
      await window.refreshCart();
    } catch (e) { window.toast('Ошибка: ' + e.message, 'error'); }
  };

  const applyPromo = async () => {
    try {
      const preview = await window.API.previewPromo(promo.trim());
      setPromoPreview(preview);
      window.toast(`Промокод ${preview.code}: −${preview.discount} ₽`, 'success');
    } catch (e) {
      setPromoPreview(null);
      window.toast(e.message, 'error');
    }
  };

  // Build final address string, return null on validation error
  const buildAddress = () => {
    if (addressMode === 'saved') {
      const a = addresses.find((x) => x.id === selectedAddrId);
      if (!a) { window.toast('Выберите адрес из сохранённых или введите вручную', 'error'); return null; }
      return a.full_address;
    }
    // Manual: validate fields
    const city = manualCity.trim();
    const street = manualStreet.trim();
    const building = manualBuilding.trim();
    const apt = manualApt.trim();
    if (!city || city.length < 2) { window.toast('Укажите город', 'error'); return null; }
    if (!/^[а-яА-ЯёЁa-zA-Z\s\-\.]{2,}$/.test(city)) { window.toast('Город указан некорректно', 'error'); return null; }
    if (!street || street.length < 2) { window.toast('Укажите улицу', 'error'); return null; }
    if (!building || !/^\d+[а-яА-Я]?(\/\d+)?$/.test(building)) { window.toast('Номер дома должен быть числом (можно с буквой или дробью)', 'error'); return null; }
    if (apt && !/^\d+$/.test(apt)) { window.toast('Номер квартиры — только цифры', 'error'); return null; }
    let s = `${city}, ${street}, д. ${building}`;
    if (apt) s += `, кв. ${apt}`;
    if (entrance.trim()) {
      if (!/^\d+$/.test(entrance.trim())) { window.toast('Подъезд — только цифры', 'error'); return null; }
      s += `, подъезд ${entrance.trim()}`;
    }
    if (floor.trim()) {
      if (!/^\d+$/.test(floor.trim())) { window.toast('Этаж — только цифры', 'error'); return null; }
      s += `, этаж ${floor.trim()}`;
    }
    return s;
  };

  const placeOrder = async () => {
    const fullAddr = buildAddress();
    if (!fullAddr) return;
    setPlacing(true);
    try {
      const orders = await window.API.createOrders(fullAddr, {
        promoCode: promoPreview?.code,
        bonusToSpend: bonusApplied,
      });
      for (const o of orders) {
        await window.API.pay(o.id, payment);
      }
      setCreatedOrders(orders);
      await window.refreshCart();
      await window.refreshOrders();
      setStep(4);
    } catch (e) {
      window.toast('Ошибка: ' + e.message, 'error');
    } finally { setPlacing(false); }
  };

  const Steps = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
      {['Корзина', 'Доставка', 'Оплата', 'Подтверждение'].map((label, i) => (
        <React.Fragment key={i}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: step >= i ? 1 : 0.4 }}>
            <div style={{ width: 32, height: 32, borderRadius: 50, background: step > i ? 'var(--ink)' : step === i ? 'var(--brand)' : 'var(--bg-2)', color: step >= i ? 'white' : 'var(--ink-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 14 }}>
              {step > i ? <Icon name="check" size={16} color="white" /> : i + 1}
            </div>
            <span style={{ fontSize: 14, fontWeight: step === i ? 600 : 400 }}>{label}</span>
          </div>
          {i < 3 && <div style={{ flex: 0.4, height: 1, background: 'var(--line)' }} />}
        </React.Fragment>
      ))}
    </div>
  );

  if (step === 4) {
    const orderIds = createdOrders.map((o) => `M-${String(o.id).padStart(8, '0')}`).join(', ');
    return (
      <div style={{ paddingTop: 68, background: 'var(--bg)', minHeight: '100vh' }}>
        <Header onNav={onNav} route="cart" openCart={() => onNav('cart')} />
        <div className="container" style={{ maxWidth: 720, padding: '64px 32px', textAlign: 'center', margin: '0 auto' }}>
          <div style={{ width: 96, height: 96, borderRadius: 50, background: 'var(--ok-soft, #d1f4e0)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
            <Icon name="check" size={48} color="var(--ok)" />
          </div>
          <h1 className="h-display" style={{ fontSize: 56, margin: '0 0 12px' }}>Заказ оформлен!</h1>
          <p style={{ fontSize: 18, color: 'var(--ink-3)', margin: '0 0 16px' }}>
            {createdOrders.length === 1 ? 'Заказ' : 'Заказы'}: <span className="mono" style={{ color: 'var(--ink)', fontWeight: 600 }}>{orderIds}</span>
          </p>
          {createdOrders.length > 1 && (
            <p style={{ fontSize: 14, color: 'var(--ink-3)' }}>
              Заказ был разделён на {createdOrders.length} части по продавцам
            </p>
          )}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
            <button className="btn btn-primary" onClick={() => { location.hash = 'account?tab=orders'; }}>Мои заказы</button>
            <button className="btn btn-ghost" onClick={() => onNav('landing')}>На главную</button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (items.length === 0 && step === 0) {
    return (
      <div style={{ paddingTop: 68, background: 'var(--bg)', minHeight: '100vh' }}>
        <Header onNav={onNav} route="cart" openCart={() => onNav('cart')} />
        <div className="container-wide" style={{ padding: 64, textAlign: 'center' }}>
          <h1 className="h-display" style={{ fontSize: 48, margin: '0 0 16px' }}>Корзина пуста</h1>
          <p style={{ color: 'var(--ink-3)', marginBottom: 24 }}>Добавьте товары из каталога</p>
          <button className="btn btn-primary" onClick={() => onNav('catalog')}>В каталог</button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div style={{ paddingTop: 68, background: 'var(--bg)', minHeight: '100vh' }}>
      <Header onNav={onNav} route="cart" openCart={() => onNav('cart')} />

      <div className="container-wide" style={{ padding: '32px 32px 64px' }}>
        <h1 className="h-display" style={{ fontSize: 56, margin: '0 0 24px' }}>
          {step === 0 ? 'Корзина' : step === 1 ? 'Доставка' : step === 2 ? 'Оплата' : 'Подтверждение'}
        </h1>
        <Steps />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 32 }}>
          <div>
            {step === 0 && (
              <div className="card" style={{ padding: 0 }}>
                {items.map((it, i) => (
                  <div key={it.id} style={{ display: 'grid', gridTemplateColumns: '120px 1fr auto auto', gap: 20, padding: 20, borderBottom: i < items.length - 1 ? '1px solid var(--line)' : 'none', alignItems: 'center' }}>
                    {it.product.image_url ? (
                      <div style={{ width: 100, height: 100, borderRadius: 12, overflow: 'hidden', background: 'var(--bg-2)' }}>
                        <img src={it.product.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ) : (<ProductPic hue={(it.product.id * 37) % 360} label={it.product.brand} height={100} />)}
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 15, marginBottom: 6, cursor: 'pointer' }}
                        onClick={() => { location.hash = `product?id=${it.product.id}`; }}>
                        {it.product.title}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Артикул: {(it.product.brand || 'MS').toUpperCase()}-{it.product.id}</div>
                      <span className="badge badge-ok" style={{ marginTop: 8 }}><Icon name="truck" size={11} /> Завтра, бесплатно</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
                      <button onClick={() => updateQty(it.product_id, it.quantity - 1)} style={{ width: 36, height: 36, background: 'none', border: 'none', cursor: 'pointer' }}><Icon name="minus" size={14} /></button>
                      <span style={{ minWidth: 32, textAlign: 'center', fontWeight: 600, fontSize: 14 }}>{it.quantity}</span>
                      <button onClick={() => updateQty(it.product_id, it.quantity + 1)} style={{ width: 36, height: 36, background: 'none', border: 'none', cursor: 'pointer' }}><Icon name="plus" size={14} /></button>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="display" style={{ fontWeight: 700, fontSize: 20 }}>{formatRub(Number(it.product.price) * it.quantity)}</div>
                      <button onClick={() => removeItem(it.product_id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', marginTop: 8, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="trash" size={12} /> Удалить</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {step === 1 && (
              <div className="card" style={{ padding: 24 }}>
                <h3 style={{ margin: '0 0 16px' }}>Способ доставки</h3>
                {[
                  { id: 'pvz', t: 'Пункт выдачи', s: '1 800+ точек · бесплатно от 1 500 ₽', icon: 'pin', d: 'Завтра' },
                  { id: 'courier', t: 'Курьером', s: 'В руки или к двери', icon: 'truck', d: '27 апр' },
                  { id: 'post', t: 'Почта России', s: 'Везде по стране', icon: 'box', d: '3–7 дней' },
                ].map((opt) => (
                  <label key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, border: delivery === opt.id ? '2px solid var(--brand)' : '1px solid var(--line)', borderRadius: 12, marginBottom: 8, cursor: 'pointer' }}>
                    <input type="radio" name="del" checked={delivery === opt.id} onChange={() => setDelivery(opt.id)} style={{ accentColor: 'var(--brand)' }} />
                    <Icon name={opt.icon} size={20} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{opt.t}</div>
                      <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>{opt.s}</div>
                    </div>
                    <span className="badge badge-ok">{opt.d}</span>
                  </label>
                ))}
                <div style={{ marginTop: 24 }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: 14 }}>Адрес</h4>

                  {addresses.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                      <button type="button" onClick={() => setAddressMode('saved')}
                        className={addressMode === 'saved' ? 'btn btn-primary btn-sm' : 'btn btn-sm'}>
                        Из сохранённых
                      </button>
                      <button type="button" onClick={() => setAddressMode('manual')}
                        className={addressMode === 'manual' ? 'btn btn-primary btn-sm' : 'btn btn-sm'}>
                        Ввести вручную
                      </button>
                    </div>
                  )}

                  {addressMode === 'saved' && addresses.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {addresses.map((a) => (
                        <label key={a.id} style={{
                          display: 'flex', alignItems: 'flex-start', gap: 12, padding: 14,
                          border: selectedAddrId === a.id ? '2px solid var(--brand)' : '1px solid var(--line)',
                          borderRadius: 10, cursor: 'pointer',
                        }}>
                          <input type="radio" name="addr"
                            checked={selectedAddrId === a.id}
                            onChange={() => setSelectedAddrId(a.id)}
                            style={{ accentColor: 'var(--brand)', marginTop: 4 }} />
                          <Icon name="pin" size={18} color="var(--brand)" style={{ marginTop: 2 }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600 }}>
                              {a.title}
                              {a.is_default && <span className="badge badge-brand" style={{ marginLeft: 8, fontSize: 10 }}>По умолчанию</span>}
                            </div>
                            <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 2 }}>{a.full_address}</div>
                          </div>
                        </label>
                      ))}
                      <a onClick={() => { location.hash = 'account?tab=addr'; }}
                        style={{ fontSize: 13, color: 'var(--brand)', cursor: 'pointer', marginTop: 4 }}>
                        + Добавить новый адрес в профиле
                      </a>
                    </div>
                  )}

                  {addressMode === 'manual' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <input className="input" placeholder="Город *"
                        value={manualCity} onChange={(e) => setManualCity(e.target.value)} />
                      <input className="input" placeholder="Улица *"
                        value={manualStreet} onChange={(e) => setManualStreet(e.target.value)} />
                      <input className="input" placeholder="Дом *"
                        value={manualBuilding} onChange={(e) => setManualBuilding(e.target.value)} />
                      <input className="input" placeholder="Квартира"
                        value={manualApt} onChange={(e) => setManualApt(e.target.value)} />
                      <input className="input" placeholder="Подъезд"
                        value={entrance} onChange={(e) => setEntrance(e.target.value)} />
                      <input className="input" placeholder="Этаж"
                        value={floor} onChange={(e) => setFloor(e.target.value)} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="card" style={{ padding: 24 }}>
                <h3 style={{ margin: '0 0 16px' }}>Способ оплаты</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 24 }}>
                  {[
                    { id: 'card', l: 'Карта', icon: 'card' },
                    { id: 'sbp', l: 'СБП', icon: 'wallet' },
                    { id: 'qr', l: 'QR', icon: 'pkg' },
                    { id: 'split', l: 'Частями', icon: 'card' },
                  ].map((m) => (
                    <button key={m.id} onClick={() => setPayment(m.id)} style={{ background: payment === m.id ? 'var(--ink)' : 'var(--paper)', color: payment === m.id ? 'white' : 'var(--ink)', border: payment === m.id ? '1px solid var(--ink)' : '1px solid var(--line)', borderRadius: 12, padding: 16, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <Icon name={m.icon} size={22} color={payment === m.id ? 'white' : 'var(--ink-2)'} />
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{m.l}</span>
                    </button>
                  ))}
                </div>
                {payment === 'card' && (
                  <>
                    {cards.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 8 }}>Сохранённые карты</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {cards.map((c) => (
                            <label key={c.id} style={{
                              display: 'flex', alignItems: 'center', gap: 12, padding: 12,
                              border: selectedCardId === c.id ? '2px solid var(--brand)' : '1px solid var(--line)',
                              borderRadius: 10, cursor: 'pointer',
                            }}>
                              <input type="radio" name="card" checked={selectedCardId === c.id}
                                onChange={() => setSelectedCardId(c.id)} style={{ accentColor: 'var(--brand)' }} />
                              <Icon name="card" size={20} />
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600 }}>{c.brand} •••• {c.last4}</div>
                                <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{c.holder} · {c.expiry}</div>
                              </div>
                            </label>
                          ))}
                        </div>
                        <a onClick={() => { location.hash = 'account?tab=cards'; }}
                          style={{ fontSize: 13, color: 'var(--brand)', cursor: 'pointer', marginTop: 8, display: 'inline-block' }}>
                          + Добавить новую карту
                        </a>
                      </div>
                    )}
                    {cards.length === 0 && (
                      <div style={{ padding: 16, background: 'var(--bg-2)', borderRadius: 10, fontSize: 13, color: 'var(--ink-3)', marginBottom: 8 }}>
                        У вас нет сохранённых карт. <a onClick={() => { location.hash = 'account?tab=cards'; }} style={{ color: 'var(--brand)', cursor: 'pointer' }}>Добавить</a> или оплата пройдёт по тестовой карте.
                      </div>
                    )}
                  </>
                )}
                {payment === 'sbp' && (
                  <div style={{ background: 'var(--bg-2)', borderRadius: 12, padding: 24, textAlign: 'center' }}>
                    <Icon name="wallet" size={48} color="var(--brand)" />
                    <p style={{ marginTop: 12, fontSize: 14 }}>Откроем приложение вашего банка для подтверждения</p>
                  </div>
                )}
                {payment === 'split' && (
                  <div>
                    <div style={{ marginBottom: 8, fontSize: 13, color: 'var(--ink-3)' }}>4 платежа без процентов</div>
                    {[0, 1, 2, 3].map((n) => (
                      <div key={n} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-2)', borderRadius: 10, marginBottom: 6 }}>
                        <span style={{ fontSize: 14 }}>{n === 0 ? 'Сейчас' : `Через ${n * 14} дней`}</span>
                        <span className="kpi-num" style={{ fontWeight: 600 }}>{formatRub(Math.round(total / 4))}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="card" style={{ padding: 24 }}>
                <h3 style={{ margin: '0 0 16px' }}>Проверьте заказ</h3>
                {items.map((it) => (
                  <div key={it.id} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--line-2)' }}>
                    {it.product.image_url ? (
                      <img src={it.product.image_url} alt="" style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover' }} />
                    ) : (<ProductPic hue={(it.product.id * 37) % 360} label={it.product.brand} height={56} rounded={8} />)}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14 }}>{it.product.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{it.quantity} шт · {formatRub(Number(it.product.price))}</div>
                    </div>
                    <div className="kpi-num" style={{ fontWeight: 600 }}>{formatRub(Number(it.product.price) * it.quantity)}</div>
                  </div>
                ))}
                <div style={{ marginTop: 16, padding: 16, background: 'var(--bg-2)', borderRadius: 12 }}>
                  <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>Доставка</div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>
                    {delivery === 'pvz' ? 'Пункт выдачи' : delivery === 'courier' ? 'Курьер' : 'Почта'}
                    {' · '}
                    {addressMode === 'saved'
                      ? (addresses.find((a) => a.id === selectedAddrId)?.full_address || 'адрес не выбран')
                      : `${manualCity}, ${manualStreet}, д. ${manualBuilding}${manualApt ? ', кв. ' + manualApt : ''}`}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 8 }}>Оплата</div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>
                    {payment === 'card'
                      ? (cards.find((c) => c.id === selectedCardId)
                          ? `${cards.find((c) => c.id === selectedCardId).brand} •••• ${cards.find((c) => c.id === selectedCardId).last4}`
                          : 'Карта (тестовая)')
                      : payment.toUpperCase()}
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
              {step > 0
                ? <button className="btn btn-ghost" onClick={() => setStep(step - 1)} disabled={placing}><Icon name="chevL" size={16} /> Назад</button>
                : <a onClick={() => onNav('catalog')} style={{ cursor: 'pointer', color: 'var(--ink-3)', display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="chevL" size={14} /> Продолжить покупки</a>
              }
              <button className="btn btn-primary btn-lg"
                disabled={placing}
                onClick={() => step === 3 ? placeOrder() : setStep(step + 1)}>
                {step === 3 ? (placing ? 'Оформляем...' : 'Оплатить и оформить') : 'Продолжить'}
                <Icon name="arrR" size={16} color="white" />
              </button>
            </div>
          </div>

          {/* Summary */}
          <aside style={{ position: 'sticky', top: 84, alignSelf: 'flex-start' }}>
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Итого</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--ink-3)' }}>Товары · {items.length}</span><span>{formatRub(subtotal)}</span></div>
                {discount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ok)' }}><span>Скидка</span><span>−{formatRub(discount)}</span></div>}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--ink-3)' }}>Доставка</span><span>{shipping === 0 ? 'Бесплатно' : formatRub(shipping)}</span></div>
              </div>
              <div style={{ display: 'flex', gap: 8, margin: '20px 0' }}>
                <input className="input" placeholder="MAYSS7" value={promo} onChange={(e) => setPromo(e.target.value)} style={{ fontSize: 13 }} />
                <button className="btn btn-ghost btn-sm" onClick={applyPromo}>Применить</button>
              </div>
              {bonusBalance > 0 && (
                <div style={{ marginBottom: 12, padding: 12, background: 'var(--bg-2)', borderRadius: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Бонусы MAYSS</span>
                    <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Доступно: <strong style={{ color: 'var(--ink)' }}>{formatRub(bonusBalance)}</strong></span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input className="input" type="number" min="0" max={bonusMaxApplicable} value={bonusToSpend}
                      placeholder="0"
                      onChange={(e) => setBonusToSpend(Math.max(0, Math.min(Number(e.target.value) || 0, bonusMaxApplicable)))}
                      style={{ fontSize: 13, flex: 1 }} />
                    <button type="button" className="btn btn-ghost btn-sm"
                      disabled={bonusMaxApplicable <= 0 || bonusToSpend >= bonusMaxApplicable}
                      onClick={() => setBonusToSpend(bonusMaxApplicable)}
                      title={`Списать максимум: ${formatRub(bonusMaxApplicable)}`}>
                      Применить
                    </button>
                    {bonusToSpend > 0 && (
                      <button type="button" className="btn btn-ghost btn-sm"
                        onClick={() => setBonusToSpend(0)}
                        title="Не использовать бонусы">×</button>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 6 }}>
                    {bonusMaxApplicable > 0
                      ? `Можно списать до ${formatRub(bonusMaxApplicable)} (не более ${bonusMaxPercent}% от суммы)`
                      : 'Бонусы будут доступны на следующих покупках'}
                  </div>
                </div>
              )}
              {bonusApplied > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ok)', fontSize: 14, marginBottom: 8 }}>
                  <span>Бонусы</span><span>−{formatRub(bonusApplied)}</span>
                </div>
              )}
              <div className="divider" style={{ margin: '8px 0 16px' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
                <span style={{ fontSize: 16, fontWeight: 600 }}>К оплате</span>
                <span className="display" style={{ fontWeight: 700, fontSize: 32 }}>{formatRub(total)}</span>
              </div>
              <div style={{ background: 'var(--brand-soft)', color: 'var(--brand-ink)', padding: 12, borderRadius: 10, fontSize: 13 }}>
                Бонусами вернётся <strong>+{formatRub(Math.round(total * (bonusEarnPercent / 100)))}</strong>
              </div>
            </div>
          </aside>
        </div>
      </div>
      <Footer />
    </div>
  );
};

window.MAYSS_SCREENS.Cart = Cart;
