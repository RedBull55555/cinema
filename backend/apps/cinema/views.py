from __future__ import annotations
from datetime import datetime, date, timedelta
from django.db.models import Prefetch
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import viewsets, mixins, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAdminUser, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

import qrcode
from io import BytesIO

from .models import Hall, Seat, HallPrice, Movie, Session, Booking, Ticket, SessionStatus
from .serializers import (
    HallSerializer, SeatSerializer, HallPriceSerializer,
    MovieSerializer, SessionSerializer,
    BookingCreateSerializer, BookingSerializer
)
from .services import create_booking, BookingConflict

# --------- PUBLIC ---------
class MoviePublicViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    queryset = Movie.objects.filter(is_active=True).order_by("title")
    serializer_class = MovieSerializer
    permission_classes = [AllowAny]

class ScheduleView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        date_str = request.query_params.get("date")
        if date_str:
            try:
                day = datetime.fromisoformat(date_str).date()
            except ValueError:
                return Response({"detail":"Некорректная дата."}, status=400)
        else:
            day = timezone.localdate()

        start = datetime.combine(day, datetime.min.time()).astimezone(timezone.get_current_timezone())
        end = start + timedelta(days=1)

        sessions = (Session.objects
            .select_related("movie","hall")
            .filter(starts_at__gte=start, starts_at__lt=end, status=SessionStatus.ACTIVE, hall__is_active=True, movie__is_active=True)
            .order_by("starts_at")
        )

        data = SessionSerializer(sessions, many=True).data
        return Response({"date": str(day), "sessions": data})

class SessionPublicView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk: int):
        session = get_object_or_404(Session.objects.select_related("hall","movie"), pk=pk)
        if session.status != SessionStatus.ACTIVE or not session.hall.is_active or not session.movie.is_active:
            return Response({"detail":"Сеанс недоступен."}, status=404)

        seats = Seat.objects.filter(hall=session.hall).order_by("row","number")
        occupied = Ticket.objects.filter(session=session).values_list("row_snapshot","seat_snapshot")
        occupied_list = [{"row": r, "seat": s} for r,s in occupied]

        prices, _ = HallPrice.objects.get_or_create(hall=session.hall, defaults={"standard_price":0, "vip_price":0})

        # Provide full seat map
        seat_map = [{
            "row": s.row,
            "seat": s.number,
            "type": s.seat_type
        } for s in seats]

        return Response({
            "session": SessionSerializer(session).data,
            "hall_seats": seat_map,
            "occupied": occupied_list,
            "prices": {"standard": str(prices.standard_price), "vip": str(prices.vip_price)},
        })

class BookSessionPublicView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, pk: int):
        serializer = BookingCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        seats = [(s["row"], s["seat"]) for s in serializer.validated_data["seats"]]
        try:
            booking = create_booking(
                session_id=pk,
                customer_name=serializer.validated_data["customer_name"],
                customer_email=serializer.validated_data.get("customer_email"),
                customer_phone=serializer.validated_data.get("customer_phone"),
                seats=seats,
            )
        except BookingConflict as e:
            return Response({"detail": str(e)}, status=409)
        except ValueError as e:
            return Response({"detail": str(e)}, status=400)
        return Response(BookingSerializer(booking).data, status=201)

class TicketPublicView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, code: str):
        ticket = get_object_or_404(Ticket.objects.select_related("session","seat","booking","session__movie","session__hall"), code=code)
        return Response({
            "code": str(ticket.code),
            "session_id": ticket.session_id,
            "movie": ticket.session.movie.title,
            "hall": ticket.session.hall.name,
            "starts_at": ticket.session.starts_at.isoformat(),
            "row": ticket.row_snapshot,
            "seat": ticket.seat_snapshot,
            "seat_type": ticket.seat_type_snapshot,
            "price": str(ticket.price_snapshot),
        })

class TicketQrView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, code: str):
        ticket = get_object_or_404(Ticket, code=code)
        # По ТЗ в билете обязательно указывать сеанс, ряд и место.
        payload = f"ticket:{ticket.code}|session:{ticket.session_id}|row:{ticket.row_snapshot}|seat:{ticket.seat_snapshot}"
        img = qrcode.make(payload)
        buf = BytesIO()
        img.save(buf, format="PNG")
        return HttpResponse(buf.getvalue(), content_type="image/png")

# --------- ADMIN (CRUD) ---------
class HallAdminViewSet(viewsets.ModelViewSet):
    queryset = Hall.objects.all().order_by("id")
    serializer_class = HallSerializer
    permission_classes = [IsAdminUser]

    @action(detail=True, methods=["post"])
    def generate_seats(self, request, pk=None):
        hall = self.get_object()
        # Create or update seat grid to match rows/cols.
        # Strategy: delete seats that are outside range, create missing as STANDARD.
        Seat.objects.filter(hall=hall, row__gt=hall.rows_count).delete()
        Seat.objects.filter(hall=hall, number__gt=hall.seats_per_row).delete()
        existing = set(Seat.objects.filter(hall=hall).values_list("row","number"))
        to_create = []
        for r in range(1, hall.rows_count+1):
            for n in range(1, hall.seats_per_row+1):
                if (r,n) not in existing:
                    to_create.append(Seat(hall=hall, row=r, number=n, seat_type="STANDARD"))
        if to_create:
            Seat.objects.bulk_create(to_create)
        return Response({"detail":"OK"})

class SeatAdminViewSet(viewsets.ModelViewSet):
    queryset = Seat.objects.select_related("hall").all()
    serializer_class = SeatSerializer
    permission_classes = [IsAdminUser]

class HallPriceAdminView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, hall_id: int):
        hall = get_object_or_404(Hall, pk=hall_id)
        prices, _ = HallPrice.objects.get_or_create(hall=hall, defaults={"standard_price":0, "vip_price":0})
        return Response(HallPriceSerializer(prices).data)

    def put(self, request, hall_id: int):
        hall = get_object_or_404(Hall, pk=hall_id)
        prices, _ = HallPrice.objects.get_or_create(hall=hall, defaults={"standard_price":0, "vip_price":0})
        ser = HallPriceSerializer(prices, data=request.data)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)

class MovieAdminViewSet(viewsets.ModelViewSet):
    queryset = Movie.objects.all().order_by("id")
    serializer_class = MovieSerializer
    permission_classes = [IsAdminUser]

class SessionAdminViewSet(viewsets.ModelViewSet):
    queryset = Session.objects.select_related("movie","hall").all().order_by("-starts_at")
    serializer_class = SessionSerializer
    permission_classes = [IsAdminUser]

class BookingAdminViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    queryset = Booking.objects.select_related("session","session__movie","session__hall").prefetch_related("tickets").order_by("-created_at")
    serializer_class = BookingSerializer
    permission_classes = [IsAdminUser]
