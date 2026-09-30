"""Add a 1–10 day duration to existing shifts, defaulting old records to one day."""

from sqlalchemy import inspect, text


def apply_migration(connection) -> bool:
    # Add the duration column only when absent; existing shifts become one-day shifts by default.
    dialect = connection.dialect.name
    if dialect not in {"mysql", "postgresql"}:
        raise RuntimeError(f"Shift duration migration does not support {dialect}.")

    if dialect == "postgresql":
        connection.execute(text("SELECT pg_advisory_xact_lock(73194285)"))
    else:
        connection.execute(text("SELECT GET_LOCK('shiftly_shift_duration', 10)"))
    try:
        if not inspect(connection).has_table("shifts"):
            return False
        columns = {column["name"] for column in inspect(connection).get_columns("shifts")}
        if "duration_days" in columns:
            return False
        quote = connection.dialect.identifier_preparer.quote
        connection.execute(text(f"ALTER TABLE {quote('shifts')} ADD COLUMN {quote('duration_days')} INTEGER NOT NULL DEFAULT 1"))
        return True
    finally:
        if dialect == "mysql":
            connection.execute(text("SELECT RELEASE_LOCK('shiftly_shift_duration')"))
