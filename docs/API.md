# MAYSS - Документация API и архитектуры

## Содержание

1. [Обзор проекта](#обзор-проекта)
2. [Архитектура](#архитектура)
3. [API Endpoints](#api-endpoints)
4. [Система бонусов](#система-бонусов)
5. [Промо-коды и скидки](#промо-коды-и-скидки)
6. [Grafana мониторинг](#grafana-мониторинг)
7. [Развертывание](#развертывание)

---

## Обзор проекта

**MAYSS** - это полнофункциональная платформа электронной коммерции (маркетплейс) с поддержкой:

- Управления каталогом товаров
- Заказов и платежей
- Системы бонусов и программы лояльности
- Промо-кодов и скидок
- Уведомлений (email, push, Telegram)
- Аналитики и мониторинга через Grafana

### Стек технологий

**Backend:**
- FastAPI (Python)
- PostgreSQL (база данных)
- SQLAlchemy ORM
- Alembic (миграции БД)

**Frontend:**
- React.js
- Nginx (web server)

**Infrastructure:**
- Docker & Docker Compose
- Grafana (мониторинг)

---

## Архитектура

### Структура проекта

```
mayss/
├── backend/                 # Backend API (FastAPI)
│   ├── app/
│   │   ├── api/            # API endpoints
│   │   ├── models/         # SQLAlchemy models
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── services/       # Бизнес-логика
│   │   └── core/           # Конфигурация, БД, логирование
│   ├── alembic/            # Миграции БД
│   └── tests/              # Тесты
├── frontend/               # React приложение
├── grafana/               # Конфигурация Grafana
├── docs/                  # Документация (Sphinx)
└── docker-compose.yml     # Orchestration
```

### Паттерны кода

#### 1. Database Models (SQLAlchemy)
Модели используют полнотипизацию с `Mapped` типами:

```python
from sqlalchemy.orm import Mapped, mapped_column

class User(Base):
    __tablename__ = "users"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, 
        server_default=func.now()
    )
```

#### 2. Pydantic Schemas
API использует Pydantic для валидации и сериализации:

```python
class UserResponse(BaseModel):
    id: int
    email: str
    created_at: datetime
    
    class Config:
        from_attributes = True
```

#### 3. Dependency Injection (FastAPI)
Зависимости инжектируются через функции в `deps.py`:

```python
@router.get("/protected")
def protected_route(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    pass
```

---

## API Endpoints

### Аутентификация

#### POST `/auth/register`
Регистрация нового пользователя
```json
{
  "email": "user@example.com",
  "password": "secure_password"
}
```

#### POST `/auth/login`
Вход в систему
```json
{
  "username": "user@example.com",
  "password": "secure_password"
}
```

### Каталог товаров

#### GET `/catalog/products`
Получить список товаров с фильтрацией и поиском

Параметры:
- `skip`: int (смещение)
- `limit`: int (количество)
- `category`: str (фильтр по категории)
- `search`: str (поиск по названию)
- `min_price`: Decimal
- `max_price`: Decimal

#### GET `/catalog/products/{product_id}`
Получить детали товара

#### GET `/catalog/categories`
Получить список категорий

### Корзина

#### GET `/cart`
Получить содержимое корзины

#### POST `/cart/items`
Добавить товар в корзину
```json
{
  "product_id": 123,
  "quantity": 1
}
```

#### DELETE `/cart/items/{item_id}`
Удалить товар из корзины

#### PUT `/cart/items/{item_id}`
Обновить количество товара
```json
{
  "quantity": 2
}
```

### Заказы

#### POST `/orders`
Создать новый заказ
```json
{
  "address_id": 1,
  "bonuses_to_use": 100.00,
  "promo_code": "SUMMER2024"
}
```

#### GET `/orders`
Получить список заказов пользователя

Параметры:
- `skip`: int
- `limit`: int
- `status`: str (фильтр по статусу)

#### GET `/orders/{order_id}`
Получить детали заказа

#### POST `/orders/{order_id}/cancel`
Отменить заказ

---

## Система бонусов

###概要

Система бонусов позволяет пользователям:
- Получать кэшбэк (3%) за завершённые заказы
- Использовать бонусы при оплате (макс. 50% от заказа)
- Отслеживать историю транзакций

### Бизнес-правила

1. **Начисление бонусов**: 3% от суммы доставленного заказа
2. **Использование**: максимум 50% от суммы заказа
3. **Учет**: ведется в таблице `bonus_transactions`
4. **Статистика**: доступна через дашборд Grafana

### API Endpoints

#### GET `/bonuses/balance`
Получить текущий баланс
```json
{
  "balance": 250.50,
  "updated_at": "2024-05-24T10:30:00Z"
}
```

#### GET `/bonuses/stats`
Получить статистику бонусов
```json
{
  "balance": 250.50,
  "earned": 1500.25,
  "spent": 1249.75,
  "updated_at": "2024-05-24T10:30:00Z"
}
```

#### GET `/bonuses/transactions`
Получить историю транзакций

Параметры:
- `limit`: int (по умолчанию 50, макс 100)
- `offset`: int
- `tx_type`: str (earn|spend|adjust)

Ответ:
```json
{
  "items": [
    {
      "id": 1,
      "amount": 100.50,
      "tx_type": "earn",
      "order_id": 42,
      "description": "Кэшбэк 3% за заказ #42",
      "created_at": "2024-05-24T10:30:00Z"
    }
  ],
  "total": 45,
  "limit": 50,
  "offset": 0
}
```

#### POST `/bonuses/admin/adjust` (Admin only)
Корректировка баланса администратором
```json
{
  "user_id": 123,
  "amount": 100.00,
  "description": "Компенсация за брак"
}
```

### Сервис бонусов (backend)

Файл: `app/services/bonus_service.py`

**Основные функции:**

```python
# Получить или создать кошелек
wallet = get_or_create_wallet(db, user_id)

# Получить баланс
balance = get_balance(db, user_id)

# Начислить бонусы
earned = earn_for_delivered_order(
    db, user_id, order_id, order_total, 
    earn_percent=Decimal("3")
)

# Использовать бонусы
spent = spend_on_order(
    db, user_id, order_id, amount, order_subtotal
)

# Скорректировать баланс
new_balance = adjust_balance(
    db, user_id, amount, "Reason", order_id=None
)

# Получить транзакции
transactions, total = get_transactions(
    db, user_id, limit=50, offset=0, tx_type="earn"
)

# Статистика
stats = get_wallet_stats(db, user_id)
# {balance, earned, spent, updated_at}
```

---

## Промо-коды и скидки

### Типы промо-кодов

1. **Marketplace (мар)**: скидка от платформы
2. **Shop (продавец)**: скидка конкретного продавца

### Типы скидок

1. **Percent**: процентная скидка (5%, 10% и т.д.)
2. **Fixed**: фиксированная сумма (100₽, 500₽)

### API Endpoints

#### GET `/promos/validate`
Проверить код промо и получить скидку

Параметры:
- `code`: str
- `order_total`: Decimal

Ответ:
```json
{
  "code": "SUMMER2024",
  "valid": true,
  "discount_type": "percent",
  "discount_value": 15,
  "discount_amount": 150.00,
  "message": "Скидка 15% — 150₽"
}
```

#### POST `/promos/apply`
Применить промо-код к заказу

```json
{
  "code": "SUMMER2024",
  "order_id": 42
}
```

---

## Grafana мониторинг

### Доступные дашборды

1. **Admin Analytics** (`/dashboard/admin`)
   - GMV по дням
   - Доход платформы
   - Статусы заказов
   - Топ магазинов и товаров

2. **Bonuses & Rewards** (`/dashboard/bonuses`)
   - Всего выдано/потрачено бонусов
   - Активные кошельки
   - Средний баланс
   - История транзакций

3. **Users & Conversion** (`/dashboard/users`)
   - Рост пользователей
   - Конверсия регистрация → заказ
   - VIP пользователи
   - Статистика по странам

4. **Payments & Revenue** (`/dashboard/payments`)
   - Динамика выручки
   - Конверсия платежей
   - Статусы платежей
   - Средний чек

### Подключение

Grafana автоматически:
1. Подключается к PostgreSQL (в docker-compose.yml)
2. Загружает дашборды из папки `grafana/dashboards/`
3. Применяет provisioning из `grafana/provisioning/`

URL: `http://localhost:3000`

---

## Развертывание

### Локальное развертывание

```bash
# 1. Клонировать репозиторий
git clone <repo>
cd mayss

# 2. Настроить переменные окружения
cp .env.example .env
# Отредактировать .env (TELEGRAM_BOT_TOKEN, VAPID_KEYS и т.д.)

# 3. Запустить контейнеры
docker-compose up -d

# 4. Применить миграции БД
docker-compose exec backend alembic upgrade head

# 5. Заполнить БД тестовыми данными (опционально)
docker-compose exec backend python seed.py

# 6. Запустить тесты
docker-compose exec backend pytest
```

### Доступные сервисы

- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Grafana**: http://localhost:3000 (admin/admin)
- **PostgreSQL**: localhost:5432

### Production развертывание

1. Установить переменные окружения (secrets)
2. Использовать managed PostgreSQL (AWS RDS, Google Cloud SQL)
3. Настроить S3 для хранилища файлов
4. Включить HTTPS (Let's Encrypt)
5. Настроить backup базы данных
6. Установить rate limiting

---

## Тестирование

### Запуск тестов

```bash
# Все тесты
pytest

# С покрытием кода
pytest --cov=app

# Конкретный файл
pytest tests/test_bonuses_service.py -v

# Конкретный тест
pytest tests/test_bonuses_service.py::test_earn_bonuses -v
```

### Структура тестов

- `tests/conftest.py` - pytest fixtures
- `tests/test_*.py` - тесты по модулям

### Основные fixtures

```python
@pytest.fixture
def db():
    # В памяти SQLite БД для тестов
    pass

@pytest.fixture
def client():
    # TestClient для API
    pass

@pytest.fixture
def sample_user():
    # Тестовый пользователь
    pass
```

---

## Troubleshooting

### PostgreSQL не запускается

```bash
# Проверить логи
docker-compose logs db

# Перестартовать БД
docker-compose restart db
```

### Grafana не загружает дашборды

```bash
# Проверить права доступа на папку
chmod -R 755 grafana/

# Перестартовать Grafana
docker-compose restart grafana
```

### Backend не подключается к БД

```bash
# Проверить переменные окружения
docker-compose exec backend env | grep DATABASE_URL

# Проверить миграции
docker-compose exec backend alembic current
```

---

## Ссылки

- API документация (Swagger): `/docs`
- ReDoc: `/redoc`
- GitHub репозиторий: <repo>

<!-- commit 4: fix: small typo in api docs -->
<!-- commit 39: feat: explain analytics simple idea in file -->
