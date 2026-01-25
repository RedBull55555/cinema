from __future__ import annotations

from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction

from apps.cinema.models import Hall, Seat, SeatType, HallPrice, Movie, Session

class Command(BaseCommand):
    help = "Create demo data: halls, seats (VIP/standard), prices, movies, sessions."

    def add_arguments(self, parser):
        parser.add_argument("--halls", type=int, default=2, help="Number of halls to create (default: 2)")
        parser.add_argument("--rows", type=int, default=10, help="Rows per hall (default: 10)")
        parser.add_argument("--seats", type=int, default=12, help="Seats per row (default: 12)")
        parser.add_argument("--days", type=int, default=3, help="How many days of sessions from today (default: 3)")
        parser.add_argument("--open", action="store_true", help="Open ticket sales for created halls (is_active=True)")

    @transaction.atomic
    def handle(self, *args, **opts):
        halls_n = opts["halls"]
        rows = opts["rows"]
        seats = opts["seats"]
        days = opts["days"]
        open_sales = opts["open"]

        movies_data = [
            ("Интерстеллар", 169, "Фантастика про космос и время."),
            ("1+1", 112, "История дружбы и поддержки."),
            ("Матрица", 136, "Классика киберпанка."),
        ]

        movies = []
        for title, dur, desc in movies_data:
            m, _ = Movie.objects.get_or_create(
                title=title,
                defaults={"duration_minutes": dur, "description": desc, "is_active": True}
            )
            if m.duration_minutes != dur:
                m.duration_minutes = dur
                m.save(update_fields=["duration_minutes"])
            movies.append(m)

        created_halls = []
        for i in range(1, halls_n + 1):
            hall, created = Hall.objects.get_or_create(
                name=f"Зал {i}",
                defaults={"rows_count": rows, "seats_per_row": seats, "is_active": open_sales}
            )
            if not created:
                hall.rows_count = rows
                hall.seats_per_row = seats
                if open_sales:
                    hall.is_active = True
                hall.save()

            created_halls.append(hall)

            # Resize seat grid
            Seat.objects.filter(hall=hall, row__gt=hall.rows_count).delete()
            Seat.objects.filter(hall=hall, number__gt=hall.seats_per_row).delete()

            existing = set(Seat.objects.filter(hall=hall).values_list("row", "number"))
            to_create = []
            for r in range(1, hall.rows_count + 1):
                for n in range(1, hall.seats_per_row + 1):
                    if (r, n) in existing:
                        continue
                    st = SeatType.VIP if r >= hall.rows_count - 1 else SeatType.STANDARD
                    to_create.append(Seat(hall=hall, row=r, number=n, seat_type=st))
            if to_create:
                Seat.objects.bulk_create(to_create)

            HallPrice.objects.get_or_create(
                hall=hall,
                defaults={"standard_price": 250, "vip_price": 350}
            )

        today = timezone.localdate()
        Session.objects.filter(starts_at__date__gte=today, hall__in=created_halls).delete()

        for day_offset in range(days):
            day = today + timedelta(days=day_offset)
            base_time = timezone.make_aware(
                timezone.datetime.combine(day, timezone.datetime.min.time().replace(hour=10, minute=0))
            )
            for hall in created_halls:
                t = base_time
                for movie in movies:
                    starts = t
                    ends = starts + timedelta(minutes=movie.duration_minutes)
                    Session.objects.create(hall=hall, movie=movie, starts_at=starts, ends_at=ends, status="ACTIVE")
                    t = ends + timedelta(minutes=20)

        self.stdout.write(self.style.SUCCESS("Demo data created."))
        self.stdout.write("Next: `python manage.py createsuperuser` (if you haven't) and run server.")
