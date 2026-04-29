// Auth screen — login + register with real API
const Auth = ({ onNav }) => {
  const { Logo, Icon, CategoryBlob } = window.MAYSS;
  const [mode, setMode] = React.useState('login');
  const [email, setEmail] = React.useState('buyer@mayss.io');
  const [password, setPassword] = React.useState('buyer123');
  const [fullName, setFullName] = React.useState('');
  const [role, setRole] = React.useState('buyer');
  const [loading, setLoading] = React.useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const { access_token } = await window.API.login({ email, password });
      window.API.setToken(access_token);
      const me = await window.API.me();
      window.toast(`Добро пожаловать, ${me.full_name}`, 'success');
      if (me.role === 'admin') onNav('admin');
      else if (me.role === 'seller') onNav('seller');
      else { location.hash = 'account?tab=dash'; }
    } catch (e) { window.toast(e.message, 'error'); }
    finally { setLoading(false); }
  };

  const handleRegister = async () => {
    if (!fullName.trim()) { window.toast('Введите имя', 'error'); return; }
    setLoading(true);
    try {
      const { access_token } = await window.API.register({ email, password, full_name: fullName, role });
      window.API.setToken(access_token);
      window.toast('Регистрация прошла', 'success');
      if (role === 'seller') onNav('seller');
      else { location.hash = 'account?tab=dash'; }
    } catch (e) { window.toast(e.message, 'error'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1.1fr', background: 'var(--bg)' }}>
      <div style={{ padding: '40px 64px', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <a onClick={() => onNav('landing')} style={{ cursor: 'pointer' }}><Logo size={28} /></a>
          <a onClick={() => onNav('landing')} style={{ fontSize: 13, color: 'var(--ink-3)', display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <Icon name="chevL" size={14} /> На главную
          </a>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 440, margin: '0 auto', width: '100%' }}>
          <h1 className="h-display" style={{ fontSize: 56, margin: '0 0 8px' }}>
            {mode === 'login' ? 'С возвращением' : 'Создать аккаунт'}
          </h1>
          <p style={{ color: 'var(--ink-3)', marginBottom: 32 }}>
            {mode === 'login' ? 'Войдите, чтобы продолжить покупки на MAYSS' : 'Зарегистрируйтесь, это бесплатно'}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {mode === 'register' && (
              <input className="input input-lg" placeholder="Ваше имя" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            )}
            <input className="input input-lg" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className="input input-lg" placeholder="Пароль" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { mode === 'login' ? handleLogin() : handleRegister(); } }} />
            {mode === 'register' && (
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { id: 'buyer', l: 'Покупатель' },
                  { id: 'seller', l: 'Продавец' },
                ].map((r) => (
                  <button key={r.id} type="button"
                    onClick={() => setRole(r.id)}
                    className={role === r.id ? 'btn btn-primary' : 'btn'}
                    style={{ flex: 1 }}>
                    {r.l}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%', marginTop: 24 }}
            onClick={mode === 'login' ? handleLogin : handleRegister}>
            {loading ? 'Подождите...' : (mode === 'login' ? 'Войти' : 'Зарегистрироваться')}
            <Icon name="arrR" size={16} color="white" />
          </button>

          <div style={{ marginTop: 24, textAlign: 'center', fontSize: 14, color: 'var(--ink-3)' }}>
            {mode === 'login'
              ? <>Нет аккаунта? <a onClick={() => setMode('register')} style={{ color: 'var(--brand)', cursor: 'pointer', fontWeight: 500 }}>Создать</a></>
              : <>Уже есть аккаунт? <a onClick={() => setMode('login')} style={{ color: 'var(--brand)', cursor: 'pointer', fontWeight: 500 }}>Войти</a></>}
          </div>

          <div style={{ marginTop: 32, padding: 16, background: 'var(--bg-2)', borderRadius: 12, fontSize: 13, color: 'var(--ink-3)' }}>
            <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--ink)' }}>Демо-аккаунты:</div>
            <div>admin@mayss.io / admin123</div>
            <div>buyer@mayss.io / buyer123</div>
            <div>seller1@mayss.io / seller123</div>
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--ink)', padding: 64, color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -80, top: -80, opacity: 0.3 }}>
          <CategoryBlob hue={250} size={400} />
        </div>
        <div style={{ position: 'absolute', left: -40, bottom: -40, opacity: 0.2 }}>
          <CategoryBlob hue={320} size={300} />
        </div>
        <div style={{ position: 'relative' }}>
          <h2 className="h-display" style={{ fontSize: 72, lineHeight: 1, margin: 0 }}>MAYSS</h2>
          <p style={{ fontSize: 20, opacity: 0.7, marginTop: 24, maxWidth: 440 }}>
            Маркетплейс нового поколения. 18 миллионов товаров от 124 000 продавцов с доставкой за 1 день.
          </p>
        </div>
      </div>
    </div>
  );
};

window.MAYSS_SCREENS.Auth = Auth;
