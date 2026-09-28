"""Add nullable photo columns to workers and businesses without changing existing rows."""

from sqlalchemy import inspect, text


def apply_migration(connection) -> bool:
    dialect = connection.dialect.name
    if dialect not in {"mysql", "postgresql"}:
        raise RuntimeError(f"Profile photo migration does not support {dialect}.")

    if dialect == "postgresql":
        connection.execute(text("SELECT pg_advisory_xact_lock(73194283)"))
    else:
        connection.execute(text("SELECT GET_LOCK('shiftly_profile_photos', 10)"))
    try:
        changed = False
        binary_type = "MEDIUMBLOB" if dialect == "mysql" else "BYTEA"
        quote = connection.dialect.identifier_preparer.quote
        for table in ("workers", "businesses"):
            if not inspect(connection).has_table(table):
                continue
            columns = {column["name"] for column in inspect(connection).get_columns(table)}
            for name, sql_type in (("photo_data", binary_type), ("photo_content_type", "VARCHAR(64)")):
                if name not in columns:
                    connection.execute(text(f"ALTER TABLE {quote(table)} ADD COLUMN {quote(name)} {sql_type} NULL"))
                    changed = True
        return changed
    finally:
        if dialect == "mysql":
            connection.execute(text("SELECT RELEASE_LOCK('shiftly_profile_photos')"))
