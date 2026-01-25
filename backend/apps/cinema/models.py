from __future__ import annotations

import uuid
from decimal import Decimal
from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone

class Hall(models.Model):
    name = models.CharField(max_length=128, unique=True)
    rows_count = models.PositiveIntegerField()
    seats_per_row = models.PositiveIntegerField()
    is_active = models.BooleanField(default=False)  # "Открыть продажу билетов"

    def clean(self):
        if self.rows_count < 1 or self.seats_per_row < 1:
            raise ValidationError("Размер зала должен быть больше 0.")

    def __str__(self) -> str:
        return self.name

class SeatType(models.TextChoices):
    STANDARD = "STANDARD", "Обычное"
    VIP = "VIP", "VIP"

class Seat(models.Model):
    hall = models.ForeignKey(Hall, on_delete=models.CASCADE, related_name="seats")
    row = models.PositiveIntegerField()
    number = models.PositiveIntegerField()
    seat_type = models.CharField(max_length=16, choices=SeatType.choices, default=SeatType.STANDARD)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["hall", "row", "number"], name="uniq_seat_in_hall"),
        ]
        indexes = [
            models.Index(fields=["hall", "row", "number"]),
        ]

    def clean(self):
        if self.row < 1 or self.number < 1:
            raise ValidationError("Номер ряда и места должен быть >= 1.")
        if self.hall_id:
            if self.row > self.hall.rows_count or self.number > self.hall.seats_per_row:
                raise ValidationError("Место выходит за пределы зала.")

    def __str__(self) -> str:
        return f"{self.hall.name}: ряд {self.row}, место {self.number}"

class HallPrice(models.Model):
    hall = models.OneToOneField(Hall, on_delete=models.CASCADE, related_name="prices")
    standard_price = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    vip_price = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))

    def clean(self):
        if self.standard_price < 0 or self.vip_price < 0:
            raise ValidationError("Цена не может быть отрицательной.")

class Movie(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    duration_minutes = models.PositiveIntegerField()
    poster_url = models.URLField(blank=True)
    is_active = models.BooleanField(default=True)

    def clean(self):
        if self.duration_minutes < 1:
            raise ValidationError("Длительность должна быть больше 0.")

    def __str__(self) -> str:
        return self.title

class SessionStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Активен"
    CANCELLED = "CANCELLED", "Отменён"

class Session(models.Model):
    hall = models.ForeignKey(Hall, on_delete=models.PROTECT, related_name="sessions")
    movie = models.ForeignKey(Movie, on_delete=models.PROTECT, related_name="sessions")
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    status = models.CharField(max_length=16, choices=SessionStatus.choices, default=SessionStatus.ACTIVE)

    class Meta:
        indexes = [
            models.Index(fields=["hall", "starts_at"]),
            models.Index(fields=["starts_at"]),
        ]

    def clean(self):
        if self.ends_at <= self.starts_at:
            raise ValidationError("Окончание сеанса должно быть позже начала.")
        # Проверка пересечения сеансов в одном зале
        qs = Session.objects.filter(hall=self.hall).exclude(pk=self.pk)
        overlap = qs.filter(starts_at__lt=self.ends_at, ends_at__gt=self.starts_at)
        if overlap.exists():
            raise ValidationError("Сеанс пересекается с другим сеансом в этом зале.")

    def __str__(self) -> str:
        return f"{self.movie.title} @ {self.hall.name} {self.starts_at:%Y-%m-%d %H:%M}"

class BookingStatus(models.TextChoices):
    CONFIRMED = "CONFIRMED", "Подтверждена"
    CANCELLED = "CANCELLED", "Отменена"

class Booking(models.Model):
    session = models.ForeignKey(Session, on_delete=models.PROTECT, related_name="bookings")
    customer_name = models.CharField(max_length=200)
    customer_email = models.EmailField(blank=True, null=True)
    customer_phone = models.CharField(max_length=32, blank=True, null=True)
    status = models.CharField(max_length=16, choices=BookingStatus.choices, default=BookingStatus.CONFIRMED)
    created_at = models.DateTimeField(auto_now_add=True)

    def clean(self):
        if not (self.customer_email or self.customer_phone):
            raise ValidationError("Укажите email или телефон.")

class Ticket(models.Model):
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name="tickets")
    session = models.ForeignKey(Session, on_delete=models.PROTECT, related_name="tickets")
    seat = models.ForeignKey(Seat, on_delete=models.PROTECT, related_name="tickets")
    row_snapshot = models.PositiveIntegerField()
    seat_snapshot = models.PositiveIntegerField()
    seat_type_snapshot = models.CharField(max_length=16, choices=SeatType.choices)
    price_snapshot = models.DecimalField(max_digits=10, decimal_places=2)
    code = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["session", "seat"], name="uniq_ticket_seat_in_session"),
        ]
        indexes = [
            models.Index(fields=["session"]),
            models.Index(fields=["code"]),
        ]

    def __str__(self) -> str:
        return f"Ticket {self.code} ({self.session_id})"
