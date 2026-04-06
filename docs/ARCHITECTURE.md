# Архитектура и Best Practices MAYSS

## Принципы разработки

### 1. Чистая архитектура (Clean Architecture)

Разделение на слои:

```
API Layer (api/)
    ↓ (зависит от)
Service Layer (services/)
    ↓ (зависит от)
Data Layer (models/)
```

**Преимущества:**
- Легко тестировать
- Минимум зависимостей между модулями
- Просто переиспользовать логику

### 2. Dependency Injection

```python
# ❌ Плохо - прямые зависимости
def get_user(user_id):
    db = get_database()  # Создание зависимости внутри
    return db.query(User).get(user_id)

# ✅ Хорошо - инжекция зависимостей
def get_user(user_id, db: Session = Depends(get_db)):
    return db.query(User).get(user_id)
```

### 3. Обработка ошибок

Используются HTTP исключения FastAPI:

```python
from fastapi import HTTPException, status

# Валидация
if not user:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="User not found"
    )

# Авторизация
if not is_admin:
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Admin access required"
    )
```

### 4. Логирование

```python
from app.core.logger import logger

logger.info(f"User {user_id} earned {amount} bonuses")
logger.warning(f"Low stock for product {product_id}")
logger.error(f"Failed to process payment: {error}")
```

---

## Модели и Схемы

### Database Model (SQLAlchemy)

```python
from sqlalchemy.orm import Mapped, mapped_column, relationship

class Product(Base):
    __tablename__ = "products"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(255))
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    created_at: Mapped[datetime] = mapped_column(
        DateTime, 
        server_default=func.now()
    )
    
    # Отношения
    reviews: Mapped[list["Review"]] = relationship(back_populates="product")
```

**Правила:**
- Всегда используйте `Mapped` для type hints
- Используйте `server_default` для временных меток
- Добавьте индексы для часто используемых полей

### Pydantic Schema (Request/Response)

```python
from pydantic import BaseModel, Field

class ProductResponse(BaseModel):
    id: int
    title: str
    price: Decimal = Field(..., decimal_places=2)
    created_at: datetime
    
    class Config:
        from_attributes = True  # Для преобразования из ORM
```

---

## API Endpoints - Best Practices

### 1. Именование

```
GET    /products              - список
GET    /products/{id}         - один элемент
POST   /products              - создание
PUT    /products/{id}         - полное обновление
PATCH  /products/{id}         - частичное обновление
DELETE /products/{id}         - удаление

POST   /orders/{id}/cancel    - действие
GET    /orders/{id}/items     - подресурс
```

### 2. Пагинация

```python
@router.get("/products")
def list_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    return db.query(Product).offset(skip).limit(limit).all()
```

### 3. Фильтрация

```python
@router.get("/orders")
def list_orders(
    status: OrderStatus | None = Query(None),
    min_amount: Decimal | None = Query(None),
    max_amount: Decimal | None = Query(None),
):
    query = db.query(Order)
    if status:
        query = query.filter(Order.status == status)
    if min_amount:
        query = query.filter(Order.total >= min_amount)
    # ...
```

### 4. Статус коды

```python
# 200 OK - успешно (GET, PUT, PATCH, DELETE)
# 201 Created - ресурс создан (POST)
# 204 No Content - успешно, нет тела (DELETE, PATCH)
# 400 Bad Request - некорректные данные
# 401 Unauthorized - не авторизован
# 403 Forbidden - нет прав доступа
# 404 Not Found - ресурс не найден
# 409 Conflict - конфликт (дублирование)
# 500 Internal Server Error - ошибка сервера
```

---

## Безопасность

### 1. Аутентификация

Используется JWT токены:

```python
# Создание токена
token = create_access_token(
    data={"sub": user.email},
    expires_delta=timedelta(hours=24)
)

# Проверка токена
current_user = Depends(get_current_user)
```

### 2. Авторизация

```python
# Проверка прав
def check_admin(current_user = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin only")
    return current_user

# Использование
@router.delete("/users/{user_id}")
def delete_user(admin = Depends(check_admin)):
    pass
```

### 3. Валидация входных данных

```python
class UserCreate(BaseModel):
    email: EmailStr  # Валидация email
    password: str = Field(..., min_length=8, regex="^(?=.*[A-Z])(?=.*[0-9])")
    age: int = Field(..., ge=18, le=150)
```

### 4. SQL Injection защита

```python
# ✅ Хорошо - параметризованные запросы
user = db.query(User).filter(User.email == email).first()

# ❌ Плохо - конкатенация
query = f"SELECT * FROM users WHERE email = '{email}'"
```

---

## Тестирование

### Unit тесты (Service Layer)

```python
# tests/test_bonus_service.py

def test_earn_bonuses(db_session):
    """Тест начисления бонусов."""
    user_id = 1
    order_id = 42
    amount = 1000.00
    
    earned = earn_for_delivered_order(
        db_session, user_id, order_id, Decimal(amount)
    )
    
    assert earned == Decimal("30.00")  # 3%
    
    wallet = get_or_create_wallet(db_session, user_id)
    assert wallet.balance == Decimal("30.00")
```

### Integration тесты (API Layer)

```python
# tests/test_bonuses_api.py

def test_get_bonus_balance(client, logged_in_user):
    """Тест GET /bonuses/balance."""
    response = client.get("/bonuses/balance")
    
    assert response.status_code == 200
    data = response.json()
    assert "balance" in data
    assert isinstance(data["balance"], float)
```

### Fixtures

```python
@pytest.fixture
def db_session():
    """Создать тестовую БД в памяти."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()

@pytest.fixture
def client(db_session):
    """FastAPI TestClient."""
    def override_get_db():
        yield db_session
    
    app.dependency_overrides[get_db] = override_get_db
    return TestClient(app)
```

---

## Performance Optimization

### 1. Индексы в БД

```python
# Быстрый поиск по email
email: Mapped[str] = mapped_column(String(255), index=True)

# Составной индекс
__table_args__ = (
    Index('idx_user_status', 'user_id', 'status'),
)
```

### 2. Eager Loading (N+1 проблема)

```python
# ❌ Плохо - N+1 запросов
orders = db.query(Order).all()
for order in orders:
    print(order.user.email)  # Запрос для каждого заказа

# ✅ Хорошо - 1 запрос
orders = db.query(Order).options(
    joinedload(Order.user)
).all()
```

### 3. Кэширование

```python
from functools import lru_cache

@lru_cache(maxsize=128)
def get_category_by_id(category_id: int):
    return db.query(Category).get(category_id)
```

### 4. Query optimization

```python
# Получить только нужные поля
users = db.query(User.id, User.email).filter(...).all()

# Пакетная обработка
for chunk in chunks(items, 1000):
    db.bulk_insert_mappings(Item, chunk)
```

---

## Миграции БД (Alembic)

### Создать миграцию

```bash
alembic revision --autogenerate -m "Add bonus tables"
```

### Применить миграции

```bash
alembic upgrade head      # Применить все
alembic upgrade +1        # Одна вперёд
alembic downgrade -1      # Одна назад
```

### Структура миграции

```python
# alembic/versions/002_add_bonuses.py

def upgrade():
    op.create_table(
        'bonus_wallets',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id')),
        sa.Column('balance', sa.Numeric(12, 2)),
    )

def downgrade():
    op.drop_table('bonus_wallets')
```

---

## Переменные окружения

```bash
# Backend
DATABASE_URL=postgresql://user:pass@localhost/mayss
SECRET_KEY=your-secret-key-change-in-production
PUBLIC_BASE_URL=http://localhost:8000
DEBUG=False

# Telegram бот
TELEGRAM_BOT_NAME=MayssBot
TELEGRAM_BOT_TOKEN=123:ABC...

# Push уведомления
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=app-password
```

---

## Git workflow

```bash
# Feature branch
git checkout -b feature/bonus-system
# Работа
git add .
git commit -m "feat: add bonus earning logic"
git push origin feature/bonus-system

# Pull request → Code review → Merge
git checkout main
git pull origin main
git merge feature/bonus-system
git push origin main
```

---

## Monitoring & Logging

### Логи на уровне операций

```python
# Важные события
logger.info(f"Order {order_id} completed")
logger.warning(f"Low inventory for product {product_id}")
logger.error(f"Payment failed: {error_details}")
```

### Metrics в Grafana

- GMV (Gross Merchandise Value)
- Conversion rate
- Average order value
- User retention
- Bonus stats

---

## Контрольный список перед продакшеном

- [ ] Все тесты проходят
- [ ] Code coverage > 80%
- [ ] Нет SQL injection уязвимостей
- [ ] Настроена аутентификация
- [ ] Валидация всех входных данных
- [ ] Обработка всех ошибок
- [ ] Логирование критических операций
- [ ] Rate limiting настроен
- [ ] CORS настроен
- [ ] HTTPS включён
- [ ] Secrets в окружении (не в коде)
- [ ] БД backup настроен
- [ ] Мониторинг настроен

<!-- commit 3: docs: add architecture hint short -->
<!-- commit 38: chore: add more README detail for run env -->
