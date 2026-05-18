# Генерация документации

```bash
cd docs
pip install sphinx sphinx-rtd-theme
make html
open _build/html/index.html
```

В CI документация собирается автоматически (см. `.github/workflows/ci.yml`).
<!-- commit 6: chore: append generate tip for dev -->
<!-- commit 41: perf: note about search index improvement -->
