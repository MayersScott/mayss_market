import os
import sys

sys.path.insert(0, os.path.abspath("../backend"))

project = "MAYSS Marketplace"
copyright = "2026, MAYSS Team"
author = "MAYSS Team"
release = "1.0.0"

extensions = [
    "sphinx.ext.autodoc",
    "sphinx.ext.napoleon",
    "sphinx.ext.viewcode",
]

templates_path = ["_templates"]
exclude_patterns = ["_build"]

html_theme = "sphinx_rtd_theme"
language = "ru"
