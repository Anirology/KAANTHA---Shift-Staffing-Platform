"""Shared date-range checks for shifts that run on 1–10 consecutive days."""

from datetime import date, timedelta


def shift_end_date(start_date: date, duration_days: int) -> date:
    """Return the last calendar date covered by a shift."""
    return start_date + timedelta(days=duration_days - 1)


def shifts_overlap(first, second) -> bool:
    """Check whether two recurring daily time blocks intersect on any shared day."""
    date_overlap = first.date <= shift_end_date(second.date, second.duration_days) and second.date <= shift_end_date(first.date, first.duration_days)
    time_overlap = first.start_time < second.end_time and first.end_time > second.start_time
    return date_overlap and time_overlap
