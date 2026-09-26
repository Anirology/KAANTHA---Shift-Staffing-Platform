"""Add the optional shifts.description column without changing existing rows."""

import argparse

from sqlalchemy import inspect, text

from app.database import engine


def apply_migration(connection) -> bool:
    dialect = connection.dialect.name
    inspector = inspect(connection)
    if dialect not in {"mysql", "postgresql"} or not inspector.has_table("shifts"):
        return False
    if dialect == "postgresql":
        connection.execute(text("SELECT pg_advisory_xact_lock(73194282)"))
    elif dialect == "mysql":
        connection.execute(text("SELECT GET_LOCK('shiftly_shift_description', 10)"))
    try:
        columns = {column["name"] for column in inspect(connection).get_columns("shifts")}
        if "description" in columns:
            return False
        connection.execute(text("ALTER TABLE shifts ADD COLUMN description TEXT NULL"))
        return True
    finally:
        if dialect == "mysql":
            connection.execute(text("SELECT RELEASE_LOCK('shiftly_shift_description')"))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="apply the reviewed schema change")
    args = parser.parse_args()
    with engine.begin() as connection:
        if not inspect(connection).has_table("shifts"):
            print("The shifts table does not exist; fresh schema creation will include description.")
            return
        columns = {column["name"] for column in inspect(connection).get_columns("shifts")}
        print(f"description column present: {'description' in columns}")
        if not args.apply:
            print("Inspection only. Back up the database, then rerun with --apply.")
            return
        changed = apply_migration(connection)
        print("Migration complete. Existing shifts were preserved." if changed else "No migration was needed.")


if __name__ == "__main__":
    main()
