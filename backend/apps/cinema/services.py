from __future__ import annotations
from decimal import Decimal
from typing import List, Tuple
from django.db import transaction, IntegrityError
from django.shortcuts import get_object_or_404

from .models import Hall, Seat, SeatType, HallPrice, Session, SessionStatus, Booking, Ticket

class BookingConflict(Exception):
    pass

def calc_price(seat_type: str, prices: HallPrice) -> Decimal:
    return prices.vip_price if seat_type == SeatType.VIP else prices.standard_price

@transaction.atomic
def create_booking(session_id: int, customer_name: str, customer_email: str|None, customer_phone: str|None, seats: List[Tuple[int,int]]):
    session = get_object_or_404(Session.objects.select_related("hall","movie"), pk=session_id)
    if session.status != SessionStatus.ACTIVE:
        raise ValueError("Сеанс не активен.")
    if not session.hall.is_active:
        raise ValueError("Продажа билетов для этого зала приостановлена.")

    # Ensure price exists
    prices, _ = HallPrice.objects.get_or_create(hall=session.hall, defaults={"standard_price":0, "vip_price":0})

    # Validate and fetch seats
    seat_objs = []
    for row, num in seats:
        seat = get_object_or_404(Seat, hall=session.hall, row=row, number=num)
        seat_objs.append(seat)

    booking = Booking.objects.create(
        session=session,
        customer_name=customer_name,
        customer_email=customer_email or None,
        customer_phone=customer_phone or None,
        status="CONFIRMED",
    )

    tickets = []
    for seat in seat_objs:
        price = calc_price(seat.seat_type, prices)
        tickets.append(Ticket(
            booking=booking,
            session=session,
            seat=seat,
            row_snapshot=seat.row,
            seat_snapshot=seat.number,
            seat_type_snapshot=seat.seat_type,
            price_snapshot=price,
        ))

    try:
        Ticket.objects.bulk_create(tickets)
    except IntegrityError:
        # Unique constraint on (session, seat) hit
        raise BookingConflict("Одно или несколько мест уже занято.")

    return booking
