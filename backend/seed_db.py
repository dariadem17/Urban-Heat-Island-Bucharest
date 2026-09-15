r"""Populate SQLite with the exact results produced by the current adapters.

Run from the repository root:
    backend\.venv\Scripts\python.exe backend\seed_db.py --replace
"""

import argparse

from assessment import relationship, statistics
from database import DATABASE_PATH, clear_analysis_data, row_counts
from land_cover import record as land_cover_record


YEARS = (2015, 2018, 2020, 2023, 2025)
AREAS = ("all", "1", "2", "3", "4", "5", "6")


def seed(replace=False):
    if replace:
        clear_analysis_data()
        statistics.cache_clear()
        relationship.cache_clear()

    for year in YEARS:
        print(f"Procesez {year}...")
        for area in AREAS:
            statistics("lst", year, area)
            statistics("ndvi", year, area)
            relationship(year, area)
            land_cover_record(year, area)

    print(f"Baza de date: {DATABASE_PATH}")
    print(f"Randuri salvate: {row_counts()}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Salveaza in SQLite statisticile reale calculate din TIFF si JSON.")
    parser.add_argument("--replace", action="store_true", help="Sterge rezultatele vechi inainte de recalculare.")
    seed(parser.parse_args().replace)
