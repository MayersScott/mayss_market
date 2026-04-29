const AccountBonus = () => {
  const { formatRub } = window.MAYSS_DATA;
  const { Icon } = window.MAYSS;
  const [balance, setBalance] = React.useState(0);
  const [txs, setTxs] = React.useState([]);

  React.useEffect(() => {
    window.API.bonusBalance().then((b) => setBalance(Number(b.balance) || 0)).catch(() => {});
    window.API.bonusTransactions().then(setTxs).catch(() => {});
  }, []);

  return (
    <>
      <h1 className="h-display" style={{ fontSize: 48, margin: '0 0 8px' }}>Бонусы MAYSS</h1>
      <p style={{ color: 'var(--ink-3)', marginBottom: 24 }}>
        Баллы маркетплейса: 3% кэшбэк после доставки заказа. Можно списать до 50% суммы заказа в корзине.
      </p>
      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>Доступно</div>
        <div style={{ fontSize: 36, fontWeight: 700, marginTop: 8 }}>{formatRub(balance)}</div>
      </div>
      <div className="card" style={{ padding: 16 }}>
        <h3 style={{ margin: '0 0 12px' }}>История</h3>
        {txs.length === 0 ? (
          <p style={{ color: 'var(--ink-3)' }}>Пока нет операций</p>
        ) : txs.map((t) => (
          <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
            <span>{t.description}</span>
            <span style={{ fontWeight: 600, color: t.tx_type === 'earn' ? '#0a7c3a' : 'var(--ink)' }}>
              {t.tx_type === 'earn' ? '+' : '−'}{formatRub(Number(t.amount))}
            </span>
          </div>
        ))}
      </div>
    </>
  );
};

window.AccountBonus = AccountBonus;
