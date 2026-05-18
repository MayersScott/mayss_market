# Качество кода и тестирование MAYSS

## Команды для локальной проверки

### 🧪 Запуск тестов

```bash
# Все тесты
pytest

# С логированием
pytest -v

# С покрытием кода
pytest --cov=app --cov-report=html

# Конкретный файл
pytest backend/tests/test_bonus_service.py -v

# Конкретный тест
pytest backend/tests/test_bonus_service.py::TestBonusWallet -v

# Fast fail (остановиться на первой ошибке)
pytest -x

# Показать только failed
pytest --lf
```

### 📊 Lint и качество кода

```bash
# Pylint проверка
pylint app/

# Pylint для конкретного модуля
pylint app/services/bonus_service.py

# Flake8 (если установлен)
flake8 app/

# Black форматирование (проверка)
black --check app/

# Black форматирование (применить)
black app/
```

### 🔍 Type checking

```bash
# MyPy проверка (если установлен)
mypy app/

# MyPy для конкретного модуля
mypy app/services/bonus_service.py
```

### 📈 Coverage анализ

```bash
# HTML отчет о покрытии
pytest --cov=app --cov-report=html
# Открыть: htmlcov/index.html

# Terminal отчет с деталями
pytest --cov=app --cov-report=term-missing

# Coverage для конкретного модуля
pytest --cov=app.services.bonus_service --cov-report=term-missing
```

## Команды в Docker

### 🐳 Запуск в контейнере

```bash
# Все тесты в контейнере
docker-compose exec backend pytest -v

# Тесты с покрытием
docker-compose exec backend pytest --cov=app --cov-report=html

# Pylint проверка
docker-compose exec backend pylint app/

# Только unit тесты
docker-compose exec backend pytest backend/tests/test_bonus_service.py

# Только integration тесты
docker-compose exec backend pytest backend/tests/test_bonuses_api.py
```

## Скрипты для CI/CD

### Полная проверка качества

```bash
#!/bin/bash
# scripts/check-quality.sh

set -e

echo "🧪 Running tests..."
pytest --cov=app --cov-report=term-missing

echo "🔍 Pylint check..."
pylint app/

echo "✅ Quality check passed!"
```

Используй:
```bash
bash scripts/check-quality.sh
```

## Requirements для качества кода

Убедись что установлены (в requirements-dev.txt):

```
pytest==8.3.3          # Тестирование
pytest-cov==5.0.0      # Coverage
httpx==0.27.0          # Тесты API
pylint==3.3.1          # Linting
black==24.1.1          # Форматирование (опционально)
mypy==1.8.0            # Type checking (опционально)
flake8==7.0.0          # Style guide (опционально)
```

## Targets и goals

| Метрика | Target |
|---------|--------|
| Overall Coverage | 80%+ |
| Services Coverage | 90%+ |
| API Endpoints Coverage | 85%+ |
| Pylint Score | 8.0+ |
| Test Pass Rate | 100% |

## Pre-commit hooks (опционально)

```bash
# Установить pre-commit
pip install pre-commit

# Создать конфиг
cat > .pre-commit-config.yaml << EOF
repos:
  - repo: https://github.com/psf/black
    rev: 24.1.1
    hooks:
      - id: black
  - repo: https://github.com/PyCQA/pylint
    rev: 3.3.1
    hooks:
      - id: pylint
  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: 1.8.0
    hooks:
      - id: mypy
        additional_dependencies: [sqlalchemy]
EOF

# Установить hooks
pre-commit install

# Запустить на все файлы
pre-commit run --all-files
```

## Мониторинг качества

### Текущее состояние

```bash
# Получить текущее покрытие
pytest --cov=app --cov-report=term-missing | tail -20

# Pylint оценка
pylint app/ --exit-zero
```

### Continuous Monitoring

В GitHub Actions (`.github/workflows/ci.yml`):

```yaml
name: Code Quality

on: [push, pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - run: pip install -r requirements-dev.txt
      
      - name: Tests
        run: pytest --cov=app
      
      - name: Pylint
        run: pylint app/ --exit-zero
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```
