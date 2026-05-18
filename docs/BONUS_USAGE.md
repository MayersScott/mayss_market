# Использование бонусов в корзине и заказе

## Система бонусов: полный цикл

### 1️⃣ Как начисляются бонусы

**Триггер:** Заказ получает статус `delivered` (доставлен)

```python
# Автоматически начисляются бонусы
Бонусы = Сумма заказа × 3% = Доставлен заказ на 1000₽ → 30₽ бонусов
```

**Ограничения:**
- Минимум для начисления: 0.01₽
- Точность: 2 знака после запятой (копейки)

---

## Новые API endpoints

### 📦 Получить корзину с информацией о бонусах

**GET** `/api/v1/cart`

Ответ:
```json
{
  "items": [
    {
      "id": 1,
      "product_id": 42,
      "quantity": 2,
      "product": {
        "id": 42,
        "title": "Товар",
        "price": 500.00
      }
    }
  ],
  "subtotal": 1000.00,
  "available_bonuses": 250.50,
  "total": 1000.00
}
```

### 📊 Получить подробный расчёт с бонусами и промо

**GET** `/api/v1/cart/summary?promo_code=SUMMER2024&bonus_to_use=100.00`

Query параметры:
- `promo_code` (опционально): Промо-код для скидки
- `bonus_to_use` (опционально): Сумма бонусов для траты

Ответ:
```json
{
  "subtotal": 1000.00,
  "available_bonuses": 250.50,
  "max_bonus_discount": 500.00,
  "promo_discount": 150.00,
  "bonus_discount": 100.00,
  "total": 750.00
}
```

**Расчёт:**
```
Subtotal:           1000.00₽
- Promo (15%):      -150.00₽ (SUMMER2024)
- Bonuses:          -100.00₽ (из 100.00₽ запрошено)
────────────────────────────
Total:               750.00₽

Ограничение бонусов: max 50% от заказа = 500.00₽
Вы можете потратить максимум 500.00₽ вместо запроса 100.00₽
```

---

## Создание заказа с бонусами

### 📝 POST `/api/v1/orders`

```json
{
  "address": "ул. Пушкина, д. 10, кв. 42",
  "promo_code": "SUMMER2024",
  "bonus_to_spend": 100.00
}
```

**Процесс обработки:**

```
1. Валидация корзины
   ✓ Корзина не пуста
   ✓ Товары в наличии
   ✓ Цены актуальны

2. Проверка промо-кода (если указан)
   ✓ Код существует
   ✓ Код активен
   ✓ Применим к товарам в корзине

3. Расчёт скидок
   ✓ Скидка от промо-кода
   ✓ Макс скидка от бонусов (50% заказа)

4. Проверка бонусов
   ✓ Достаточно бонусов на счёте
   ✓ Не превышает лимит траты

5. Создание заказа(ов)
   ✓ Один заказ = один продавец
   ✓ Списание бонусов
   ✓ Регистрация промо использования

6. Очистка корзины
```

**Ответ успешного создания заказа:**

```json
[
  {
    "id": 142,
    "buyer_id": 1,
    "seller_id": 2,
    "status": "created",
    "subtotal": 1000.00,
    "promo_discount": 150.00,
    "bonus_spent": 100.00,
    "total": 750.00,
    "items": [
      {
        "id": 1,
        "product_id": 42,
        "title": "Товар",
        "price": 500.00,
        "quantity": 2
      }
    ]
  }
]
```

---

## Примеры использования (cURL)

### Пример 1: Просмотр корзины

```bash
curl -X GET "http://localhost:8000/api/v1/cart" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Пример 2: Расчёт с бонусами

```bash
curl -X GET "http://localhost:8000/api/v1/cart/summary" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -G --data-urlencode "promo_code=SUMMER2024" \
  -G --data-urlencode "bonus_to_use=100.00"
```

### Пример 3: Создание заказа с бонусами

```bash
curl -X POST "http://localhost:8000/api/v1/orders" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "address": "ул. Пушкина, д. 10, кв. 42",
    "promo_code": "SUMMER2024",
    "bonus_to_spend": 100.00
  }'
```

---

## Примеры использования (Python/JavaScript)

### Python (requests)

```python
import requests

TOKEN = "your_jwt_token"
headers = {"Authorization": f"Bearer {TOKEN}"}

# 1. Получить корзину
response = requests.get(
    "http://localhost:8000/api/v1/cart",
    headers=headers
)
cart = response.json()
print(f"Cart total: {cart['total']}")
print(f"Available bonuses: {cart['available_bonuses']}")

# 2. Расчёт с бонусами
params = {
    "promo_code": "SUMMER2024",
    "bonus_to_use": 100.00
}
response = requests.get(
    "http://localhost:8000/api/v1/cart/summary",
    headers=headers,
    params=params
)
summary = response.json()
print(f"Discount from promo: {summary['promo_discount']}")
print(f"Bonus discount: {summary['bonus_discount']}")
print(f"Final total: {summary['total']}")

# 3. Создать заказ с бонусами
order_data = {
    "address": "ул. Пушкина, д. 10, кв. 42",
    "promo_code": "SUMMER2024",
    "bonus_to_spend": 100.00
}
response = requests.post(
    "http://localhost:8000/api/v1/orders",
    json=order_data,
    headers=headers
)
orders = response.json()
print(f"Created {len(orders)} order(s)")
for order in orders:
    print(f"  Order #{order['id']}: {order['total']}₽ " +
          f"(bonus spent: {order['bonus_spent']}₽)")
```

### JavaScript (fetch)

```javascript
const TOKEN = "your_jwt_token";
const headers = { "Authorization": `Bearer ${TOKEN}` };

// 1. Получить корзину
const cartResponse = await fetch(
  "http://localhost:8000/api/v1/cart",
  { headers }
);
const cart = await cartResponse.json();
console.log(`Available bonuses: ${cart.available_bonuses}₽`);

// 2. Расчёт с бонусами
const summaryUrl = new URL("http://localhost:8000/api/v1/cart/summary");
summaryUrl.searchParams.set("promo_code", "SUMMER2024");
summaryUrl.searchParams.set("bonus_to_use", "100.00");

const summaryResponse = await fetch(summaryUrl, { headers });
const summary = await summaryResponse.json();
console.log(`Final total: ${summary.total}₽`);

// 3. Создать заказ с бонусами
const orderResponse = await fetch(
  "http://localhost:8000/api/v1/orders",
  {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      address: "ул. Пушкина, д. 10, кв. 42",
      promo_code: "SUMMER2024",
      bonus_to_spend: 100.00
    })
  }
);
const orders = await orderResponse.json();
orders.forEach(order => {
  console.log(`Order #${order.id}: ${order.total}₽ ` +
              `(bonuses used: ${order.bonus_spent}₽)`);
});
```

---

## Правила и ограничения

### 💰 Правила траты бонусов

| Параметр | Значение |
|----------|----------|
| Макс трата на заказ | 50% от суммы заказа |
| Минимальный заказ | 0.01₽ |
| Точность | 2 знака (копейки) |
| Требование баланса | >= запрошенной суммы |

### 🎯 Примеры расчётов

**Пример 1: Заказ 1000₽, доступно 300₽ бонусов**
```
Запросили потратить:    300₽
Максимум можно потратить: 1000 × 50% = 500₽
Фактически потратим:    300₽ (хватает)
```

**Пример 2: Заказ 1000₽, доступно 600₽ бонусов**
```
Запросили потратить:    600₽
Максимум можно потратить: 1000 × 50% = 500₽
Фактически потратим:    500₽ (обрезано по лимиту)
Осталось неиспользованных: 100₽
```

**Пример 3: Заказ 1000₽, доступно 100₽ бонусов, промо 15%**
```
Subtotal:               1000₽
- Промо (15%):         -150₽
= После промо:          850₽
- Макс бонусов (50%):  -425₽
- Доступно бонусов:    -100₽ (хватает)
────────────────────────────
Total:                  750₽
```

---

## Обработка ошибок

### Недостаточно бонусов

**Статус:** 400 Bad Request

```json
{
  "detail": "Insufficient bonuses. Available: 50, Requested: 100"
}
```

**Решение:** Снизить `bonus_to_spend` или добавить ещё товаров

### Некорректный промо-код

**Статус:** 400 Bad Request

```json
{
  "detail": "Invalid promo code"
}
```

**Решение:** Проверить код и условия применения

### Товар отсутствует

**Статус:** 400 Bad Request

```json
{
  "detail": "Not enough stock for Product Name"
}
```

**Решение:** Убрать товар из корзины или снизить количество

---

## Frontend интеграция

### React компонент для выбора бонусов

```jsx
import { useState, useEffect } from 'react';

export function CartWithBonuses() {
  const [cart, setCart] = useState(null);
  const [bonusToUse, setBonusToUse] = useState(0);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    // Загрузить корзину
    fetch('/api/v1/cart', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(r => r.json())
    .then(setCart);
  }, []);

  useEffect(() => {
    if (!cart) return;
    
    // Рассчитать итоги с бонусами
    const params = new URLSearchParams();
    if (bonusToUse > 0) params.set('bonus_to_use', bonusToUse);
    
    fetch(`/api/v1/cart/summary?${params}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(r => r.json())
    .then(setSummary);
  }, [bonusToUse, cart]);

  if (!cart || !summary) return <div>Загрузка...</div>;

  return (
    <div className="cart">
      <h2>Корзина</h2>
      
      <div className="items">
        {cart.items.map(item => (
          <div key={item.id} className="item">
            <span>{item.product.title}</span>
            <span>{item.quantity} × {item.product.price}₽</span>
          </div>
        ))}
      </div>

      <div className="totals">
        <div>Subtotal: {cart.subtotal}₽</div>
        <div>Available bonuses: {cart.available_bonuses}₽</div>
      </div>

      <div className="bonuses">
        <label>
          Use bonuses:
          <input 
            type="number"
            value={bonusToUse}
            onChange={(e) => setBonusToUse(Number(e.target.value))}
            max={summary.max_bonus_discount}
          />
        </label>
        <p>Max: {summary.max_bonus_discount}₽</p>
      </div>

      <div className="summary">
        <div>Promo discount: -{summary.promo_discount}₽</div>
        <div>Bonus discount: -{summary.bonus_discount}₽</div>
        <strong>Total: {summary.total}₽</strong>
      </div>

      <button onClick={() => createOrder(bonusToUse)}>
        Checkout
      </button>
    </div>
  );
}
```

<!-- commit 5: feat: add example of bonus usage in docs -->
<!-- commit 40: fix: small fix in exporter comment -->
