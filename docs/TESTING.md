# Руководство по тестированию MAYSS

## Структура тестов

```
backend/tests/
├── conftest.py                    # Shared fixtures
├── test_bonus_service.py          # Unit tests (service layer)
├── test_bonuses_api.py            # Integration tests (API layer)
├── test_promos_bonuses.py         # Tests for promotions
├── test_flows.py                  # End-to-end flow tests
└── test_extra.py                  # Additional tests
```

## Запуск тестов

### Все тесты

```bash
# Запустить все тесты
pytest

# Запустить с verbose output
pytest -v

# Запустить с логирование
pytest --log-cli-level=DEBUG
```

### Конкретные тесты

```bash
# Конкретный файл
pytest backend/tests/test_bonus_service.py

# Конкретный класс
pytest backend/tests/test_bonus_service.py::TestBonusWallet

# Конкретный тест
pytest backend/tests/test_bonus_service.py::TestBonusWallet::test_get_or_create_wallet_new

# По паттерну
pytest -k "test_earn" -v
```

### Coverage (покрытие кода)

```bash
# Получить отчет о покрытии
pytest --cov=app --cov-report=html

# Посмотреть покрытие для модуля
pytest --cov=app.services.bonus_service --cov-report=term-missing
```

## Fixtures

Основные fixtures в `conftest.py`:

### Database Fixtures

```python
@pytest.fixture
def db_session():
    """Сессия SQLite БД в памяти для тестов."""
    pass

@pytest.fixture  
def test_user(db_session):
    """Тестовый пользователь-покупатель."""
    pass

@pytest.fixture
def admin_user(db_session):
    """Тестовый администратор."""
    pass
```

### Authentication Fixtures

```python
@pytest.fixture
def test_token(test_user):
    """JWT токен для тестового пользователя."""
    pass

@pytest.fixture
def test_headers(test_token):
    """HTTP headers с токеном авторизации."""
    pass
```

### API Client

```python
@pytest.fixture
def client():
    """FastAPI TestClient."""
    return TestClient(app)
```

## Примеры тестов

### Unit тест (Service Layer)

```python
def test_earn_bonuses(db_session, sample_user_id):
    """Тест начисления бонусов."""
    earned = earn_for_delivered_order(
        db_session,
        user_id=sample_user_id,
        order_id=42,
        order_total=Decimal("1000.00")
    )
    
    assert earned == Decimal("30.00")  # 3% от 1000
```

### Integration тест (API Layer)

```python
def test_get_bonus_balance(client, test_token):
    """Тест GET /bonuses/balance."""
    response = client.get(
        "/api/v1/bonuses/balance",
        headers={"Authorization": f"Bearer {test_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data["balance"], float)
```

## Best Practices

### 1. Независимость тестов

```python
# ❌ Плохо - зависит от порядка выполнения
def test_create_wallet():
    wallet = create_wallet(1)

def test_wallet_exists():
    assert get_wallet(1) is not None  # Зависит от test_create_wallet

# ✅ Хорошо - каждый тест независим
def test_create_wallet(db_session):
    wallet = create_wallet(db_session, 1)
    assert wallet is not None

def test_wallet_exists(db_session):
    create_wallet(db_session, 1)
    assert get_wallet(db_session, 1) is not None
```

### 2. Понятные имена

```python
# ❌ Плохо
def test_balance():
    pass

# ✅ Хорошо
def test_get_balance_returns_decimal():
    pass

def test_get_balance_for_nonexistent_user_returns_zero():
    pass
```

### 3. Arrange-Act-Assert паттерн

```python
def test_spend_bonuses(db_session, sample_user_id):
    # Arrange (Подготовка)
    wallet = get_or_create_wallet(db_session, sample_user_id)
    wallet.balance = Decimal("100")
    db_session.commit()
    
    # Act (Действие)
    spent = spend_on_order(
        db_session, sample_user_id, 42, 
        Decimal("50"), Decimal("1000")
    )
    
    # Assert (Проверка)
    assert spent == Decimal("50")
    assert get_balance(db_session, sample_user_id) == Decimal("50")
```

### 4. Тестирование ошибок

```python
def test_spend_insufficient_balance(db_session, sample_user_id):
    """Тест ошибки при недостаточном балансе."""
    wallet = get_or_create_wallet(db_session, sample_user_id)
    wallet.balance = Decimal("10")
    db_session.commit()
    
    # Проверка, что вызывается исключение
    with pytest.raises(ValueError, match="Недостаточно бонусов"):
        spend_on_order(
            db_session, sample_user_id, 42,
            Decimal("100"), Decimal("1000")
        )
```

## Параметризованные тесты

```python
import pytest

@pytest.mark.parametrize("order_total,expected_bonus", [
    (Decimal("1000"), Decimal("30")),
    (Decimal("500"), Decimal("15")),
    (Decimal("100"), Decimal("3")),
])
def test_earn_bonuses_various_amounts(db_session, sample_user_id, order_total, expected_bonus):
    """Тест начисления с разными суммами."""
    earned = earn_for_delivered_order(
        db_session, sample_user_id, 42, order_total
    )
    assert earned == expected_bonus
```

## Fixtures с параметрами

```python
@pytest.fixture(params=[
    ("buyer@mayss.io", UserRole.BUYER),
    ("seller@mayss.io", UserRole.SELLER),
    ("admin@mayss.io", UserRole.ADMIN),
])
def user_with_role(db_session, request):
    """Создать пользователя с разными ролями."""
    email, role = request.param
    user = User(email=email, role=role, is_active=True)
    db_session.add(user)
    db_session.commit()
    return user
```

## Speedup тестирования

```bash
# Запустить только fast тесты (без БД)
pytest -m "not slow"

# Запустить в параллель (требует pytest-xdist)
pytest -n auto

# Остановить на первой ошибке
pytest -x

# Запустить last failed
pytest --lf
```

## Coverage goals

| Module | Target |
|--------|--------|
| services/ | 90%+ |
| models/ | 85%+ |
| api/ | 80%+ |
| Overall | 80%+ |

## CI/CD Integration

В GitHub Actions:

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-python@v2
      - run: pip install -r requirements-dev.txt
      - run: pytest --cov=app
```

## Troubleshooting

### Тест падает в Docker

```bash
# Проверить логи
docker-compose logs backend

# Запустить тесты в контейнере
docker-compose exec backend pytest -v
```

### Порт уже в использовании

```bash
# Найти процесс
lsof -i :8000

# Убить процесс
kill -9 <PID>
```

### Данные не очищаются

Убедитесь, что используется in-memory SQLite:

```python
engine = create_engine("sqlite:///:memory:")
```