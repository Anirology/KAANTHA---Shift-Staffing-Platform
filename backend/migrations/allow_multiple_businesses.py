"""Remove the old one-business-per-user unique constraint without touching rows.

Run from backend/ after backing up the database:
    python -m migrations.allow_multiple_businesses          # inspect only
    python -m migrations.allow_multiple_businesses --apply  # change schema

The change is required on existing MySQL/PostgreSQL databases. New databases
created from the current SQLAlchemy models already support multiple businesses.
"""

import argparse

from sqlalchemy import inspect, text

from app.database import engine


def targets(connection):
    inspector = inspect(connection)
    constraints = [item["name"] for item in inspector.get_unique_constraints("businesses")
                   if item.get("name") and item.get("column_names") == ["user_id"]]
    indexes = [item["name"] for item in inspector.get_indexes("businesses")
               if item.get("name") and item.get("unique") and item.get("column_names") == ["user_id"]]
    return constraints, indexes


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="apply the reviewed schema change")
    args = parser.parse_args()
    with engine.begin() as connection:
        dialect = connection.dialect.name
        if dialect not in {"mysql", "postgresql"}:
            raise SystemExit(f"Existing {dialect} databases require a separate migration; no change made.")
        constraints, indexes = targets(connection)
        print(f"Database dialect: {dialect}; unique constraints: {constraints}; unique indexes: {indexes}")
        if not args.apply:
            print("Inspection only. Back up the database, then rerun with --apply.")
            return

        quote = connection.dialect.identifier_preparer.quote
        if dialect == "postgresql":
            for name in constraints:
                connection.execute(text(f"ALTER TABLE businesses DROP CONSTRAINT {quote(name)}"))
            for name in indexes:
                if name not in constraints:
                    connection.execute(text(f"DROP INDEX {quote(name)}"))
        else:
            for name in set(constraints + indexes):
                connection.execute(text(f"ALTER TABLE businesses DROP INDEX {quote(name)}"))

        existing = {item["name"] for item in inspect(connection).get_indexes("businesses")}
        if "ix_businesses_user_id" not in existing:
            connection.execute(text("CREATE INDEX ix_businesses_user_id ON businesses (user_id)"))
        remaining_constraints, remaining_indexes = targets(connection)
        if remaining_constraints or remaining_indexes:
            raise RuntimeError("A unique user_id rule remains; review the database manually.")
        print("Migration complete. Existing business and shift rows were preserved.")


if __name__ == "__main__":
    main()
