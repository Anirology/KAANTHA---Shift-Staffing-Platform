"""Create the Shiftly schema and add missing starter skills without deleting data."""

from sqlalchemy import select

from app.database import Base, SessionLocal, engine
from app.models import Skill

STARTER_SKILLS = (
    ("Cashier", "Handles checkout and customer payments."),
    ("Server", "Serves food and beverages to customers."),
    ("Kitchen Assistant", "Supports kitchen preparation and cleaning."),
    ("Event Staff", "Assists with event operations and guest support."),
    ("Cleaner", "Performs cleaning and basic maintenance duties."),
    ("Security", "Provides venue access control and security support."),
)


def seed() -> int:
    Base.metadata.create_all(bind=engine)
    created = 0
    with SessionLocal() as db:
        existing_names = set(db.scalars(select(Skill.name)).all())
        for name, description in STARTER_SKILLS:
            if name not in existing_names:
                db.add(Skill(name=name, description=description))
                created += 1
        db.commit()
    return created


if __name__ == "__main__":
    print(f"Added {seed()} starter skills.")
