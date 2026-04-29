// Buyer account dashboard — all sections + order details
const Account = ({ onNav }) => {
  window.useLiveData();
  const { formatRub } = window.MAYSS_DATA;
  const { Icon, Header, Footer, ProductPic, CategoryBlob } = window.MAYSS;

  const me = window.useMe();
  const initial = window.parseHashQuery();
  const [section, setSection] = React.useState(initial.tab || 'dash');
  const [orders, setOrders] = React.useState([]);
  const [favProducts, setFavProducts] = React.useState([]);
  const [addresses, setAddresses] = React.useState([]);
  const [selectedOrderId, setSelectedOrderId] = React.useState(initial.order_id ? parseInt(initial.order_id, 10) : null);
  const [orderFilter, setOrderFilter] = React.useState('Все');
  // Address form — separate fields for validation
  const [newAddr, setNewAddr] = React.useState({
    title: 'Дом', city: '', street: '', building: '', apt: '',
    entrance: '', floor: '', is_default: false,
  });

  // Cards
  const [cards, setCards] = React.useState([]);
  const [newCard, setNewCard] = React.useState({ holder: '', number: '', expiry: '', cvv: '', is_default: false });

  // Support tickets
  const [tickets, setTickets] = React.useState([]);
  const [openTicket, setOpenTicket] = React.useState(null);
  const [newTicket, setNewTicket] = React.useState({ subject: '', message: '' });
  const [replyText, setReplyText] = React.useState('');

  const refreshOrders = async () => { try { setOrders(await window.API.listOrders()); } catch (e) {} };
  const refreshFavs = async () => { try { setFavProducts(await window.API.listFavorites()); } catch (e) {} };
  const refreshAddrs = async () => { try { setAddresses(await window.API.listAddresses()); } catch (e) {} };
  const refreshCards = async () => { try { setCards(await window.API.listCards()); } catch (e) {} };
  const refreshTickets = async () => { try { setTickets(await window.API.listTickets()); } catch (e) {} };

  React.useEffect(() => {
    if (!window.API.getToken()) { onNav('auth'); return; }
    window.refreshMe();
    refreshOrders();
    refreshFavs();
    refreshAddrs();
    refreshCards();
    refreshTickets();
  }, []);

  React.useEffect(() => {
    const onHash = () => {
      const p = window.parseHashQuery();
      setSection(p.tab || 'dash');
      setSelectedOrderId(p.order_id ? parseInt(p.order_id, 10) : null);
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const logout = () => { window.API.clearToken(); window.toast('Вы вышли'); onNav('landing'); };

  const addAddress = async () => {
    const city = newAddr.city.trim();
    const street = newAddr.street.trim();
    const building = newAddr.building.trim();
    const apt = newAddr.apt.trim();
    const entrance = newAddr.entrance.trim();
    const floor = newAddr.floor.trim();

    if (!city || city.length < 2) return window.toast('Укажите город', 'error');
    if (!/^[а-яА-ЯёЁa-zA-Z\s\-\.]{2,}$/.test(city)) return window.toast('Город содержит недопустимые символы', 'error');
    if (!street || street.length < 2) return window.toast('Укажите улицу', 'error');
    if (!building) return window.toast('Укажите номер дома', 'error');
    if (!/^\d+[а-яА-Я]?(\/\d+)?$/.test(building)) return window.toast('Дом: только число, можно с буквой (12А) или дробью (12/3)', 'error');
    if (apt && !/^\d+$/.test(apt)) return window.toast('Квартира — только цифры', 'error');
    if (entrance && !/^\d+$/.test(entrance)) return window.toast('Подъезд — только цифры', 'error');
    if (floor && !/^\d+$/.test(floor)) return window.toast('Этаж — только цифры', 'error');
    if (!newAddr.title.trim()) return window.toast('Введите название адреса', 'error');

    let full = `${city}, ${street}, д. ${building}`;
    if (apt) full += `, кв. ${apt}`;
    if (entrance) full += `, подъезд ${entrance}`;
    if (floor) full += `, этаж ${floor}`;

    try {
      await window.API.createAddress({
        title: newAddr.title.trim(),
        full_address: full,
        is_default: newAddr.is_default,
      });
      window.toast('Адрес добавлен', 'success');
      setNewAddr({ title: 'Дом', city: '', street: '', building: '', apt: '', entrance: '', floor: '', is_default: false });
      refreshAddrs();
    } catch (e) { window.toast(e.message, 'error'); }
  };

  const addCard = async () => {
    const number = newCard.number.replace(/\s+/g, '');
    if (!newCard.holder.trim()) return window.toast('Введите имя владельца', 'error');
    if (!/^\d{13,19}$/.test(number)) return window.toast('Номер карты должен быть 13–19 цифр', 'error');
    if (!/^\d{2}\/\d{2}$/.test(newCard.expiry)) return window.toast('Срок в формате MM/YY', 'error');
    if (!/^\d{3,4}$/.test(newCard.cvv)) return window.toast('CVV: 3 или 4 цифры', 'error');

    try {
      await window.API.createCard({ ...newCard, number });
      window.toast('Карта добавлена', 'success');
      setNewCard({ holder: '', number: '', expiry: '', cvv: '', is_default: false });
      refreshCards();
    } catch (e) { window.toast(e.message, 'error'); }
  };

  const submitTicket = async () => {
    if (!newTicket.subject.trim()) return window.toast('Укажите тему', 'error');
    if (!newTicket.message.trim()) return window.toast('Опишите проблему', 'error');
    try {
      const t = await window.API.createTicket(newTicket);
      window.toast('Обращение создано', 'success');
      setNewTicket({ subject: '', message: '' });
      refreshTickets();
      setOpenTicket(t);
    } catch (e) { window.toast(e.message, 'error'); }
  };

  const sendReply = async () => {
    if (!replyText.trim() || !openTicket) return;
    try {
      const updated = await window.API.addTicketMessage(openTicket.id, replyText);
      setReplyText('');
      setOpenTicket(updated);
      refreshTickets();
    } catch (e) { window.toast(e.message, 'error'); }
  };

  const STATUS_BADGE = (s) => {
    if (s === 'delivered') return 'badge-ok';
    if (s === 'cancelled' || s === 'returned') return 'badge-err';
    return 'badge-brand';
  };
  const STATUS_LABEL = window.MAPPERS.STATUS_LABELS;

  const nav = [
    { id: 'dash', label: 'Профиль', icon: 'user' },
    { id: 'orders', label: 'Заказы', icon: 'pkg', badge: orders.length || null },
    { id: 'fav', label: 'Избранное', icon: 'heart', badge: favProducts.length || null },
    { id: 'addr', label: 'Адреса', icon: 'pin' },
    { id: 'cards', label: 'Карты', icon: 'card' },
    { id: 'notif', label: 'Уведомления', icon: 'bell' },
    { id: 'bonus', label: 'Бонусы', icon: 'spark' },
    { id: 'help', label: 'Поддержка', icon: 'msg' },
  ];

  const setSec = (id) => { location.hash = `account?tab=${id}`; setSection(id); setSelectedOrderId(null); };

  if (selectedOrderId) {
    return <OrderDetail onNav={onNav} orderId={selectedOrderId}
             onBack={() => { location.hash = 'account?tab=orders'; setSelectedOrderId(null); }} />;
  }

  if (!me) {
    return (
      <div style={{ paddingTop: 68, background: 'var(--bg)', minHeight: '100vh' }}>
        <Header onNav={onNav} route="account" openCart={() => onNav('cart')} />
        <div style={{ padding: 64, textAlign: 'center' }}>Загрузка...</div>
      </div>
    );
  }

  const initials = (me.full_name || 'U').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const ordersTotal = orders.reduce((s, o) => s + Number(o.total), 0);

  return (
    <div style={{ paddingTop: 68, background: 'var(--bg)', minHeight: '100vh' }}>
      <Header onNav={onNav} route="account" openCart={() => onNav('cart')} />

      <div className="container-wide" style={{ padding: '32px 32px 64px', display: 'grid', gridTemplateColumns: '260px 1fr', gap: 32 }}>
        <aside>
          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: 50, background: 'linear-gradient(135deg, var(--brand) 0%, var(--plum, #5B2A86) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 18 }}>{initials}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{me.full_name}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{me.role === 'admin' ? 'Администратор' : me.role === 'seller' ? 'Продавец' : 'Покупатель'}</div>
              </div>
            </div>
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {nav.map((n) => (
              <button key={n.id} onClick={() => setSec(n.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: section === n.id ? 'var(--paper)' : 'transparent', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: section === n.id ? 600 : 400, color: section === n.id ? 'var(--ink)' : 'var(--ink-3)', cursor: 'pointer', textAlign: 'left' }}>
                <Icon name={n.icon} size={18} color={section === n.id ? 'var(--ink)' : 'var(--ink-3)'} />
                <span style={{ flex: 1 }}>{n.label}</span>
                {n.badge && <span style={{ background: 'var(--brand)', color: 'white', fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 10 }}>{n.badge}</span>}
              </button>
            ))}
            {(me.role === 'seller' || me.role === 'admin') && (
              <button onClick={() => onNav('seller')}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: 'transparent', border: 'none', borderRadius: 10, fontSize: 14, color: 'var(--brand)', cursor: 'pointer', textAlign: 'left' }}>
                <Icon name="chart" size={18} color="var(--brand)" />
                <span>Кабинет продавца</span>
              </button>
            )}
            {me.role === 'admin' && (
              <button onClick={() => onNav('admin')}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: 'transparent', border: 'none', borderRadius: 10, fontSize: 14, color: 'var(--brand)', cursor: 'pointer', textAlign: 'left' }}>
                <Icon name="settings" size={18} color="var(--brand)" />
                <span>Админ-панель</span>
              </button>
            )}
            <div className="divider" style={{ margin: '8px 0' }} />
            <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: 'transparent', border: 'none', fontSize: 14, color: 'var(--ink-3)', cursor: 'pointer' }}>
              <Icon name="arrR" size={18} color="var(--ink-3)" /> Выйти
            </button>
          </nav>
        </aside>

        <main>
          {section === 'dash' && (
            <>
              <h1 className="h-display" style={{ fontSize: 56, margin: '0 0 8px' }}>Привет, {me.full_name.split(' ')[0]}</h1>
              <p style={{ color: 'var(--ink-3)', marginBottom: 32 }}>
                {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })} · отличный день для покупок
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 24 }}>
                <div style={{ background: 'linear-gradient(135deg, var(--ink) 0%, oklch(0.25 0.05 280) 100%)', color: 'white', borderRadius: 24, padding: 32, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', right: -40, top: -40, opacity: .25 }}><CategoryBlob hue={250} size={200} /></div>
                  <div style={{ position: 'relative' }}>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '.1em' }}>Бонусный баланс</div>
                    <div className="display" style={{ fontWeight: 700, fontSize: 64, letterSpacing: '-0.04em', lineHeight: 1, margin: '8px 0' }}>
                      {Math.round(ordersTotal * 0.03).toLocaleString('ru-RU')}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--ink-4)', marginBottom: 24 }}>1 бонус = 1 ₽ · от ваших покупок</div>
                    <button className="btn" style={{ background: 'var(--brand)', color: 'white' }} onClick={() => onNav('catalog')}>
                      В каталог <Icon name="arrR" size={14} color="white" />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: 16 }}>
                  <div className="card" style={{ padding: 20 }}>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Всего заказов</div>
                    <div className="kpi-num" style={{ fontSize: 40, marginTop: 4 }}>{orders.length}</div>
                  </div>
                  <div className="card" style={{ padding: 20 }}>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Потрачено</div>
                    <div className="kpi-num" style={{ fontSize: 28, marginTop: 4 }}>{formatRub(ordersTotal)}</div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
                <h3 className="display" style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>Последние заказы</h3>
                <a onClick={() => setSec('orders')} style={{ color: 'var(--ink-3)', cursor: 'pointer', fontSize: 13 }}>Все заказы →</a>
              </div>
              <div className="card" style={{ padding: 0 }}>
                {orders.length === 0 ? (
                  <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-3)' }}>
                    Ещё нет заказов. <a onClick={() => onNav('catalog')} style={{ color: 'var(--brand)', cursor: 'pointer' }}>Перейти в каталог</a>
                  </div>
                ) : (
                  <table className="t" style={{ width: '100%' }}>
                    <thead><tr><th>Номер</th><th>Дата</th><th>Товаров</th><th>Сумма</th><th>Статус</th><th></th></tr></thead>
                    <tbody>
                      {orders.slice(0, 5).map((o) => (
                        <tr key={o.id} style={{ cursor: 'pointer' }}
                          onClick={() => { location.hash = `account?tab=orders&order_id=${o.id}`; }}>
                          <td className="mono" style={{ fontSize: 13 }}>M-{String(o.id).padStart(8, '0')}</td>
                          <td>{new Date(o.created_at).toLocaleDateString('ru-RU')}</td>
                          <td>{o.items.length}</td>
                          <td style={{ fontWeight: 600 }}>{formatRub(Number(o.total))}</td>
                          <td><span className={'badge ' + STATUS_BADGE(o.status)}>{STATUS_LABEL[o.status]}</span></td>
                          <td><Icon name="chevR" size={16} color="var(--ink-4)" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

          {section === 'orders' && (
            <>
              <h1 className="h-display" style={{ fontSize: 48, margin: '0 0 8px' }}>Мои заказы</h1>
              <p style={{ color: 'var(--ink-3)', marginBottom: 24 }}>Всего {orders.length} заказов · {formatRub(ordersTotal)}</p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
                {['Все', 'Создан', 'Оплачен', 'Сборка', 'В пути', 'Доставлен', 'Возврат'].map((s) => (
                  <button key={s} onClick={() => setOrderFilter(s)}
                    className={'chip ' + (orderFilter === s ? 'active' : '')}
                    style={{ cursor: 'pointer' }}>{s}</button>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {orders.length === 0 ? (
                  <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--ink-3)' }}>
                    Заказов пока нет
                  </div>
                ) : orders.filter((o) => orderFilter === 'Все' || STATUS_LABEL[o.status] === orderFilter).map((o) => (
                  <div key={o.id} className="card" style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr 200px 140px', gap: 24, alignItems: 'center', cursor: 'pointer' }}
                    onClick={() => { location.hash = `account?tab=orders&order_id=${o.id}`; }}>
                    <div>
                      <div className="mono" style={{ fontSize: 12, color: 'var(--ink-3)' }}>M-{String(o.id).padStart(8, '0')}</div>
                      <div style={{ fontSize: 14, fontWeight: 500, marginTop: 4 }}>
                        {new Date(o.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {o.items.slice(0, 4).map((it, i) => (
                        <div key={i} style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden', background: 'var(--bg-2)' }}>
                          {it.image_url
                            ? <img src={it.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <ProductPic hue={(it.product_id * 37) % 360} label="" height={44} rounded={8} />}
                        </div>
                      ))}
                      {o.items.length > 4 && <div style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--ink-3)' }}>+{o.items.length - 4}</div>}
                    </div>
                    <div><span className={'badge ' + STATUS_BADGE(o.status)}>{STATUS_LABEL[o.status]}</span></div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="display" style={{ fontWeight: 700, fontSize: 20 }}>{formatRub(Number(o.total))}</div>
                      <span style={{ color: 'var(--brand)', fontSize: 13, fontWeight: 500 }}>Подробнее →</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {section === 'fav' && (
            <>
              <h1 className="h-display" style={{ fontSize: 48, margin: '0 0 24px' }}>Избранное</h1>
              {favProducts.length === 0 ? (
                <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--ink-3)' }}>
                  <Icon name="heart" size={48} color="var(--ink-4)" />
                  <p style={{ marginTop: 16 }}>Пока ничего не добавлено</p>
                  <button className="btn btn-primary" onClick={() => onNav('catalog')} style={{ marginTop: 12 }}>В каталог</button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                  {favProducts.map((f) => (
                    <window.MAYSS.ProductCard key={f.id} p={window.MAPPERS.mapProduct(f.product)} />
                  ))}
                </div>
              )}
            </>
          )}

          {section === 'addr' && (
            <>
              <h1 className="h-display" style={{ fontSize: 48, margin: '0 0 24px' }}>Адреса доставки</h1>
              <div className="card" style={{ padding: 24, marginBottom: 16 }}>
                <h3 style={{ margin: '0 0 16px' }}>Новый адрес</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <label style={{ gridColumn: '1 / 3' }}>
                    <span style={{ fontSize: 12, color: 'var(--ink-3)', display: 'block', marginBottom: 4 }}>Название (например, «Дом», «Работа»)</span>
                    <input className="input" value={newAddr.title}
                      onChange={(e) => setNewAddr({ ...newAddr, title: e.target.value })}
                      style={{ width: '100%' }} />
                  </label>
                  <label>
                    <span style={{ fontSize: 12, color: 'var(--ink-3)', display: 'block', marginBottom: 4 }}>Город *</span>
                    <input className="input" value={newAddr.city}
                      placeholder="Москва"
                      onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })}
                      style={{ width: '100%' }} />
                  </label>
                  <label>
                    <span style={{ fontSize: 12, color: 'var(--ink-3)', display: 'block', marginBottom: 4 }}>Улица *</span>
                    <input className="input" value={newAddr.street}
                      placeholder="Тверская"
                      onChange={(e) => setNewAddr({ ...newAddr, street: e.target.value })}
                      style={{ width: '100%' }} />
                  </label>
                  <label>
                    <span style={{ fontSize: 12, color: 'var(--ink-3)', display: 'block', marginBottom: 4 }}>Дом *</span>
                    <input className="input" value={newAddr.building}
                      placeholder="12 или 12А или 12/3"
                      onChange={(e) => setNewAddr({ ...newAddr, building: e.target.value })}
                      style={{ width: '100%' }} />
                  </label>
                  <label>
                    <span style={{ fontSize: 12, color: 'var(--ink-3)', display: 'block', marginBottom: 4 }}>Квартира</span>
                    <input className="input" value={newAddr.apt}
                      placeholder="18"
                      onChange={(e) => setNewAddr({ ...newAddr, apt: e.target.value })}
                      style={{ width: '100%' }} />
                  </label>
                  <label>
                    <span style={{ fontSize: 12, color: 'var(--ink-3)', display: 'block', marginBottom: 4 }}>Подъезд</span>
                    <input className="input" value={newAddr.entrance}
                      placeholder="3"
                      onChange={(e) => setNewAddr({ ...newAddr, entrance: e.target.value })}
                      style={{ width: '100%' }} />
                  </label>
                  <label>
                    <span style={{ fontSize: 12, color: 'var(--ink-3)', display: 'block', marginBottom: 4 }}>Этаж</span>
                    <input className="input" value={newAddr.floor}
                      placeholder="7"
                      onChange={(e) => setNewAddr({ ...newAddr, floor: e.target.value })}
                      style={{ width: '100%' }} />
                  </label>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, margin: '16px 0' }}>
                  <input type="checkbox" checked={newAddr.is_default}
                    onChange={(e) => setNewAddr({ ...newAddr, is_default: e.target.checked })}
                    style={{ accentColor: 'var(--brand)' }} />
                  По умолчанию
                </label>
                <button className="btn btn-primary" onClick={addAddress}>Добавить</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {addresses.length === 0 ? (
                  <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--ink-3)' }}>Адресов пока нет</div>
                ) : addresses.map((a) => (
                  <div key={a.id} className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
                    <Icon name="pin" size={24} color="var(--brand)" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>
                        {a.title}
                        {a.is_default && <span className="badge badge-brand" style={{ marginLeft: 8 }}>По умолчанию</span>}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>{a.full_address}</div>
                    </div>
                    {!a.is_default && (
                      <button className="btn btn-ghost btn-sm" onClick={async () => {
                        await window.API.setDefaultAddress(a.id); refreshAddrs();
                      }}>Сделать главным</button>
                    )}
                    <button className="btn btn-ghost btn-sm" onClick={async () => {
                      if (!confirm('Удалить адрес?')) return;
                      await window.API.deleteAddress(a.id); refreshAddrs();
                    }}><Icon name="trash" size={14} /></button>
                  </div>
                ))}
              </div>
            </>
          )}

          {section === 'cards' && (
            <>
              <h1 className="h-display" style={{ fontSize: 48, margin: '0 0 24px' }}>Мои карты</h1>
              <div className="card" style={{ padding: 24, marginBottom: 16 }}>
                <h3 style={{ margin: '0 0 16px' }}>Добавить карту</h3>
                <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '0 0 16px' }}>
                  Хранятся только последние 4 цифры, имя и срок. Полный номер и CVV в БД не сохраняются.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <input className="input" placeholder="Номер карты"
                    value={newCard.number}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^\d\s]/g, '').replace(/(\d{4})(?=\d)/g, '$1 ').slice(0, 23);
                      setNewCard({ ...newCard, number: v });
                    }}
                    style={{ gridColumn: '1 / 3' }} />
                  <input className="input" placeholder="MM/YY"
                    value={newCard.expiry}
                    onChange={(e) => {
                      let v = e.target.value.replace(/[^\d]/g, '').slice(0, 4);
                      if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2);
                      setNewCard({ ...newCard, expiry: v });
                    }} />
                  <input className="input" placeholder="CVV" type="password"
                    value={newCard.cvv}
                    onChange={(e) => setNewCard({ ...newCard, cvv: e.target.value.replace(/[^\d]/g, '').slice(0, 4) })} />
                  <input className="input" placeholder="Имя на карте (как на карте)"
                    value={newCard.holder}
                    onChange={(e) => setNewCard({ ...newCard, holder: e.target.value.toUpperCase() })}
                    style={{ gridColumn: '1 / 3' }} />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, margin: '16px 0' }}>
                  <input type="checkbox" checked={newCard.is_default}
                    onChange={(e) => setNewCard({ ...newCard, is_default: e.target.checked })}
                    style={{ accentColor: 'var(--brand)' }} />
                  По умолчанию
                </label>
                <button className="btn btn-primary" onClick={addCard}>Добавить</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {cards.length === 0 ? (
                  <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--ink-3)' }}>Карт пока нет</div>
                ) : cards.map((c) => (
                  <div key={c.id} className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                      width: 56, height: 36, borderRadius: 6,
                      background: 'linear-gradient(135deg, var(--ink) 0%, oklch(0.25 0.05 280) 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontWeight: 700, fontSize: 11,
                    }}>{c.brand}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>
                        •••• •••• •••• {c.last4}
                        {c.is_default && <span className="badge badge-brand" style={{ marginLeft: 8 }}>По умолчанию</span>}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>{c.holder} · {c.expiry}</div>
                    </div>
                    {!c.is_default && (
                      <button className="btn btn-ghost btn-sm" onClick={async () => {
                        await window.API.setDefaultCard(c.id); refreshCards();
                      }}>Сделать главной</button>
                    )}
                    <button className="btn btn-ghost btn-sm" onClick={async () => {
                      if (!confirm('Удалить карту?')) return;
                      await window.API.deleteCard(c.id); refreshCards();
                    }}><Icon name="trash" size={14} /></button>
                  </div>
                ))}
              </div>
            </>
          )}

          {section === 'help' && (
            openTicket ? <TicketView ticket={openTicket} me={me} onBack={() => { setOpenTicket(null); refreshTickets(); }}
              onReply={sendReply} replyText={replyText} setReplyText={setReplyText} />
            : (
              <>
                <h1 className="h-display" style={{ fontSize: 48, margin: '0 0 24px' }}>Поддержка</h1>

                <div className="card" style={{ padding: 24, marginBottom: 16 }}>
                  <h3 style={{ margin: '0 0 16px' }}>Создать обращение</h3>
                  <input className="input" placeholder="Тема"
                    value={newTicket.subject}
                    onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                    style={{ width: '100%', marginBottom: 12 }} />
                  <textarea className="input" placeholder="Опишите проблему" rows={5}
                    value={newTicket.message}
                    onChange={(e) => setNewTicket({ ...newTicket, message: e.target.value })}
                    style={{ width: '100%', resize: 'vertical' }} />
                  <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={submitTicket}>Отправить</button>
                </div>

                <h3 style={{ margin: '24px 0 12px' }}>Мои обращения</h3>
                {tickets.length === 0 ? (
                  <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--ink-3)' }}>
                    Обращений пока нет
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {tickets.map((t) => (
                      <div key={t.id} className="card" style={{ padding: 16, cursor: 'pointer' }}
                        onClick={async () => { setOpenTicket(await window.API.getTicket(t.id)); }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 600 }}>{t.subject}</div>
                            <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>
                              {new Date(t.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </div>
                          </div>
                          <span className={'badge ' + (t.status === 'closed' ? '' : t.status === 'answered' ? 'badge-ok' : 'badge-brand')}>
                            {t.status === 'closed' ? 'Закрыто' : t.status === 'answered' ? 'Ответ есть' : 'Открыто'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )
          )}

          {section === 'notif' && (
            <NotificationSettings />
          )}

          {section === 'bonus' && window.AccountBonus && React.createElement(window.AccountBonus)}
        </main>
      </div>
      <Footer />
    </div>
  );
};

// === Ticket View ===
const TicketView = ({ ticket, me, onBack, onReply, replyText, setReplyText }) => {
  const { Icon } = window.MAYSS;
  return (
    <>
      <a onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--ink-3)', cursor: 'pointer', fontSize: 14, marginBottom: 16 }}>
        <Icon name="chevL" size={14} /> К списку обращений
      </a>
      <h1 className="h-display" style={{ fontSize: 36, margin: '0 0 8px' }}>{ticket.subject}</h1>
      <p style={{ color: 'var(--ink-3)', marginBottom: 24, fontSize: 13 }}>
        Создано {new Date(ticket.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })} ·
        <span style={{ marginLeft: 8 }} className={'badge ' + (ticket.status === 'closed' ? '' : ticket.status === 'answered' ? 'badge-ok' : 'badge-brand')}>
          {ticket.status === 'closed' ? 'Закрыто' : ticket.status === 'answered' ? 'Ответ есть' : 'Открыто'}
        </span>
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        {ticket.messages.map((m) => {
          const fromMe = m.author_id === me.id;
          return (
            <div key={m.id} style={{ display: 'flex', justifyContent: fromMe ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '70%', padding: 14, borderRadius: 12,
                background: fromMe ? 'var(--brand)' : 'var(--paper)',
                color: fromMe ? 'white' : 'var(--ink)',
                border: fromMe ? 'none' : '1px solid var(--line)',
              }}>
                <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 6 }}>
                  {fromMe ? 'Вы' : 'Поддержка'} · {new Date(m.created_at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
                <div style={{ fontSize: 14, whiteSpace: 'pre-wrap' }}>{m.body}</div>
              </div>
            </div>
          );
        })}
      </div>

      {ticket.status !== 'closed' && (
        <div className="card" style={{ padding: 16 }}>
          <textarea className="input" placeholder="Ваше сообщение" rows={3}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            style={{ width: '100%', resize: 'vertical' }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn btn-primary" onClick={onReply}>Отправить</button>
            <button className="btn btn-ghost" onClick={async () => {
              if (!confirm('Закрыть обращение?')) return;
              await window.API.closeTicket(ticket.id);
              onBack();
            }}>Закрыть обращение</button>
          </div>
        </div>
      )}
    </>
  );
};

// === Order Detail with QR ===
const OrderDetail = ({ onNav, orderId, onBack }) => {
  const { formatRub } = window.MAYSS_DATA;
  const { Icon, Header, Footer } = window.MAYSS;
  const [order, setOrder] = React.useState(null);
  const [showQR, setShowQR] = React.useState(false);
  const [pickupInput, setPickupInput] = React.useState('');
  const STATUS_LABEL = window.MAPPERS.STATUS_LABELS;

  const reload = () => window.API.getOrder(orderId).then(setOrder).catch((e) => window.toast(e.message, 'error'));
  React.useEffect(() => { reload(); }, [orderId]);

  if (!order) {
    return (
      <div style={{ paddingTop: 68, background: 'var(--bg)', minHeight: '100vh' }}>
        <Header onNav={onNav} route="account" openCart={() => onNav('cart')} />
        <div style={{ padding: 64, textAlign: 'center' }}>Загрузка...</div>
      </div>
    );
  }

  const STAGES = ['created', 'paid', 'assembling', 'shipped', 'delivered'];
  const currentStage = STAGES.indexOf(order.status);
  const stageLabels = ['Создан', 'Оплачен', 'Сборка', 'В пути', 'Доставлен'];

  const confirmPickup = async () => {
    if (!pickupInput.trim()) { window.toast('Введите код', 'error'); return; }
    try {
      await window.API.confirmPickup(order.id, pickupInput.trim());
      window.toast('Заказ получен!', 'success');
      setShowQR(false);
      reload();
    } catch (e) { window.toast(e.message, 'error'); }
  };

  return (
    <div style={{ paddingTop: 68, background: 'var(--bg)', minHeight: '100vh' }}>
      <Header onNav={onNav} route="account" openCart={() => onNav('cart')} />
      <div className="container-wide" style={{ padding: '32px 32px 64px', maxWidth: 960, margin: '0 auto' }}>
        <a onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--ink-3)', cursor: 'pointer', fontSize: 14, marginBottom: 16 }}>
          <Icon name="chevL" size={14} /> К списку заказов
        </a>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 4 }}>
              Заказ от {new Date(order.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <h1 className="h-display" style={{ fontSize: 48, margin: 0 }}>M-{String(order.id).padStart(8, '0')}</h1>
          </div>
          <span className="badge badge-brand" style={{ fontSize: 14, padding: '8px 14px' }}>{STATUS_LABEL[order.status]}</span>
        </div>

        {/* QR code for shipped orders */}
        {order.status === 'shipped' && order.pickup_code && (
          <div className="card" style={{ padding: 24, marginBottom: 16, textAlign: 'center', background: 'var(--brand-soft)', borderColor: 'var(--brand)' }}>
            <h3 style={{ margin: '0 0 8px', color: 'var(--brand-ink)' }}>Заказ готов к получению</h3>
            <p style={{ color: 'var(--brand-ink)', margin: '0 0 16px', fontSize: 14 }}>
              Покажите QR-код или назовите код сотруднику пункта выдачи
            </p>

            {showQR ? (
              <>
                <PickupQR code={order.pickup_code} />
                <div style={{ fontFamily: 'monospace', fontSize: 24, fontWeight: 700, letterSpacing: 4, margin: '16px 0', color: 'var(--brand-ink)' }}>
                  {order.pickup_code}
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowQR(false)}>Скрыть QR</button>
                </div>
                <div style={{ marginTop: 24, padding: 16, background: 'var(--paper)', borderRadius: 12 }}>
                  <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 8 }}>
                    Имитация ПВЗ: введите код для подтверждения получения
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className="input" placeholder="ABC123"
                      value={pickupInput} onChange={(e) => setPickupInput(e.target.value.toUpperCase())}
                      style={{ flex: 1, fontFamily: 'monospace', letterSpacing: 2 }} />
                    <button className="btn btn-primary" onClick={confirmPickup}>Подтвердить</button>
                  </div>
                </div>
              </>
            ) : (
              <button className="btn btn-primary btn-lg" onClick={() => setShowQR(true)}>
                Показать QR-код
              </button>
            )}
          </div>
        )}

        {order.status !== 'cancelled' && order.status !== 'returned' && (
          <div className="card" style={{ padding: 24, marginBottom: 16 }}>
            <h3 style={{ margin: '0 0 24px' }}>Статус доставки</h3>
            <div style={{ display: 'flex', alignItems: 'flex-start', position: 'relative' }}>
              {STAGES.map((s, i) => (
                <div key={s} style={{ flex: 1, position: 'relative', textAlign: 'center' }}>
                  {i < STAGES.length - 1 && (
                    <div style={{ position: 'absolute', top: 14, left: '50%', right: '-50%', height: 2, background: i < currentStage ? 'var(--brand)' : 'var(--line)' }} />
                  )}
                  <div style={{
                    width: 30, height: 30, borderRadius: 50, margin: '0 auto',
                    background: i <= currentStage ? 'var(--brand)' : 'var(--bg-2)',
                    border: i === currentStage ? '3px solid var(--brand-soft)' : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative', zIndex: 1,
                  }}>
                    {i < currentStage ? <Icon name="check" size={14} color="white" /> : <span style={{ fontSize: 12, color: i === currentStage ? 'white' : 'var(--ink-3)' }}>{i + 1}</span>}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12, color: i <= currentStage ? 'var(--ink)' : 'var(--ink-3)', fontWeight: i === currentStage ? 600 : 400 }}>
                    {stageLabels[i]}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card" style={{ padding: 24, marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 16px' }}>Состав заказа ({order.items.length})</h3>
          {order.items.map((it) => (
            <div key={it.id} style={{ display: 'flex', gap: 16, padding: '12px 0', borderBottom: '1px solid var(--line-2)', alignItems: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: 8, overflow: 'hidden', background: 'var(--bg-2)', flexShrink: 0 }}>
                {it.image_url
                  ? <img src={it.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-4)', fontSize: 11 }}>нет фото</div>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ cursor: 'pointer', fontWeight: 500 }}
                  onClick={() => { location.hash = `product?id=${it.product_id}`; }}>
                  {it.title}
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>
                  {formatRub(Number(it.price))} × {it.quantity}
                </div>
              </div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>{formatRub(Number(it.price) * it.quantity)}</div>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 16, marginTop: 8, borderTop: '1px solid var(--line)', fontSize: 18, fontWeight: 700 }}>
            <span>Итого</span>
            <span>{formatRub(Number(order.total))}</span>
          </div>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ margin: '0 0 16px' }}>Доставка</h3>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <Icon name="pin" size={20} color="var(--brand)" />
            <div>{order.address}</div>
          </div>
        </div>

        {order.status === 'created' && (
          <button className="btn btn-primary btn-lg" style={{ marginTop: 16, width: '100%' }}
            onClick={() => { location.hash = `pay?order_id=${order.id}`; }}>
            Оплатить {formatRub(Number(order.total))}
          </button>
        )}
      </div>
      <Footer />
    </div>
  );
};

// Simple SVG QR-like code (visual imitation, encodes the code as bit pattern)
const PickupQR = ({ code }) => {
  // Deterministic pattern from code string
  const size = 21;
  const cell = 8;
  const total = size * size;
  // Hash the code into bits
  const bits = [];
  let seed = 0;
  for (let i = 0; i < code.length; i++) seed = (seed * 31 + code.charCodeAt(i)) >>> 0;
  let x = seed || 1;
  for (let i = 0; i < total; i++) {
    x = (x * 1103515245 + 12345) >>> 0;
    bits.push((x >> 16) & 1);
  }

  // Force finder patterns at three corners (like real QR)
  const setFinder = (ox, oy) => {
    for (let dy = 0; dy < 7; dy++) {
      for (let dx = 0; dx < 7; dx++) {
        const idx = (oy + dy) * size + (ox + dx);
        const onBorder = dx === 0 || dx === 6 || dy === 0 || dy === 6;
        const onCenter = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4;
        bits[idx] = (onBorder || onCenter) ? 1 : 0;
      }
    }
  };
  setFinder(0, 0);
  setFinder(size - 7, 0);
  setFinder(0, size - 7);

  const px = (i) => (i % size) * cell;
  const py = (i) => Math.floor(i / size) * cell;

  return (
    <svg width={size * cell} height={size * cell} style={{ background: 'white', padding: 12, borderRadius: 12 }}>
      <rect width={size * cell} height={size * cell} fill="white" />
      {bits.map((b, i) => b ? (
        <rect key={i} x={px(i)} y={py(i)} width={cell} height={cell} fill="#0E0E12" />
      ) : null)}
    </svg>
  );
};

const NotificationSettings = () => {
  const { Icon } = window.MAYSS;
  const [status, setStatus] = React.useState({ telegram_linked: false, push_enabled: false });
  const [webhookHint, setWebhookHint] = React.useState('');
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    window.API.getNotifStatus().then(setStatus).finally(() => setLoading(false));
  }, []);

  const toggleTelegram = async () => {
    if (status.telegram_linked) {
      if (!confirm('Отвязать Telegram?')) return;
      await window.API.unlinkTelegram();
      setStatus({ ...status, telegram_linked: false });
    } else {
      const res = await window.API.getTelegramLink();
      setWebhookHint(res.webhook_hint || '');
      window.open(res.url, '_blank');
      // В реальности нужно сделать поллинг статуса, для демо просто просим юзера обновить страницу
      window.toast('Перейдите в Telegram и нажмите Запустить. Затем обновите страницу.', 'info');
    }
  };

  const urlB64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) { outputArray[i] = rawData.charCodeAt(i); }
    return outputArray;
  };

  const togglePush = async () => {
    if (status.push_enabled) {
      await window.API.unsubscribePush();
      setStatus({ ...status, push_enabled: false });
      window.toast('Уведомления отключены');
      return;
    }

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return window.toast('Ваш браузер не поддерживает Push', 'error');
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return window.toast('Разрешение отклонено', 'error');

      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const { key } = await window.API.getPushPublicKey();
      
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(key)
      });
      
      const subJSON = sub.toJSON();
      await window.API.subscribePush({
        endpoint: subJSON.endpoint,
        p256dh: subJSON.keys.p256dh,
        auth: subJSON.keys.auth
      });
      
      setStatus({ ...status, push_enabled: true });
      window.toast('Push-уведомления включены!', 'success');
    } catch (e) {
      window.toast('Ошибка Push: ' + e.message, 'error');
    }
  };

  if (loading) return <div>Загрузка...</div>;

  return (
    <>
      <h1 className="h-display" style={{ fontSize: 48, margin: '0 0 8px' }}>Уведомления</h1>
      <p style={{ color: 'var(--ink-3)', marginBottom: 24 }}>Управляйте способами получения статусов заказов</p>
      
      <div className="card" style={{ padding: 24, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="msg" size={24} color={status.telegram_linked ? '#2AABEE' : 'var(--ink-4)'} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>Telegram-бот</div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 2 }}>{status.telegram_linked ? 'Аккаунт привязан' : 'Получать статусы в мессенджер'}</div>
          </div>
        </div>
        <button className={status.telegram_linked ? "btn btn-ghost" : "btn btn-primary"} onClick={toggleTelegram}>
          {status.telegram_linked ? 'Отвязать' : 'Подключить'}
        </button>
      </div>

      <div className="card" style={{ padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="bell" size={24} color={status.push_enabled ? 'var(--brand)' : 'var(--ink-4)'} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>Push в браузере</div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 2 }}>{status.push_enabled ? 'Уведомления включены' : 'Всплывающие окна на рабочем столе'}</div>
          </div>
        </div>
        <button className={status.push_enabled ? "btn btn-ghost" : "btn btn-primary"} onClick={togglePush}>
          {status.push_enabled ? 'Отключить' : 'Включить'}
        </button>
      </div>
      
      <div style={{ marginTop: 24, padding: 16, background: 'var(--bg-2)', borderRadius: 12, fontSize: 12, color: 'var(--ink-4)' }}>
        Для Telegram используйте ваш реальный домен и один раз установите webhook на <code>{window.MAYSS_RUNTIME.publicWebhookUrl}</code>.
        {webhookHint && <div style={{ marginTop: 8 }}>Готовая команда: <code>{webhookHint}</code></div>}
      </div>
    </>
  );
};

window.MAYSS_SCREENS.Account = Account;
