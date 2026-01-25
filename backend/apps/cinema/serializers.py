from __future__ import annotations
from datetime import timedelta, datetime, date
from decimal import Decimal
from typing import List

from django.db import transaction, IntegrityError
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import serializers

from .models import (
    Hall, Seat, SeatType, HallPrice, Movie,
    Session, SessionStatus,
    Booking, Ticket
)

class HallSerializer(serializers.ModelSerializer):
    class Meta:
        model = Hall
        fields = ["id","name","rows_count","seats_per_row","is_active"]

class SeatSerializer(serializers.ModelSerializer):
    class Meta:
        model = Seat
        fields = ["id","hall","row","number","seat_type"]

class HallPriceSerializer(serializers.ModelSerializer):
    class Meta:
        model = HallPrice
        fields = ["hall","standard_price","vip_price"]

class MovieSerializer(serializers.ModelSerializer):
    class Meta:
        model = Movie
        fields = ["id","title","description","duration_minutes","poster_url","is_active"]

class SessionSerializer(serializers.ModelSerializer):
    movie = MovieSerializer(read_only=True)
    hall = HallSerializer(read_only=True)
    movie_id = serializers.PrimaryKeyRelatedField(queryset=Movie.objects.all(), source="movie", write_only=True)
    hall_id = serializers.PrimaryKeyRelatedField(queryset=Hall.objects.all(), source="hall", write_only=True)

    class Meta:
        model = Session
        fields = ["id","movie","hall","movie_id","hall_id","starts_at","ends_at","status"]

    def validate(self, attrs):
        # If creating: compute ends_at if not provided
        movie = attrs.get("movie") or getattr(self.instance, "movie", None)
        starts_at = attrs.get("starts_at") or getattr(self.instance, "starts_at", None)
        ends_at = attrs.get("ends_at") or getattr(self.instance, "ends_at", None)

        if movie and starts_at:
            default_ends = starts_at + timedelta(minutes=movie.duration_minutes)
            if ends_at is None:
                attrs["ends_at"] = default_ends

        ends_at = attrs.get("ends_at") or ends_at
        if starts_at and ends_at and ends_at <= starts_at:
            raise serializers.ValidationError("ends_at must be after starts_at.")
        return attrs

class PublicSessionDetailSerializer(serializers.Serializer):
    session = SessionSerializer()
    hall_seats = serializers.ListField()
    occupied = serializers.ListField()
    prices = serializers.DictField()

class BookingSeatIn(serializers.Serializer):
    row = serializers.IntegerField(min_value=1)
    seat = serializers.IntegerField(min_value=1)

class BookingCreateSerializer(serializers.Serializer):
    customer_name = serializers.CharField(max_length=200)
    customer_email = serializers.EmailField(required=False, allow_null=True, allow_blank=True)
    customer_phone = serializers.CharField(required=False, allow_null=True, allow_blank=True, max_length=32)
    seats = BookingSeatIn(many=True)

    def validate(self, attrs):
        email = attrs.get("customer_email")
        phone = attrs.get("customer_phone")
        if not (email or phone):
            raise serializers.ValidationError("Укажите email или телефон.")
        if not attrs["seats"]:
            raise serializers.ValidationError("Выберите хотя бы одно место.")
        # Remove duplicates
        seen = set()
        uniq = []
        for s in attrs["seats"]:
            key = (s["row"], s["seat"])
            if key not in seen:
                seen.add(key)
                uniq.append(s)
        attrs["seats"] = uniq
        return attrs

class TicketSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ticket
        fields = ["code","row_snapshot","seat_snapshot","seat_type_snapshot","price_snapshot"]

class BookingSerializer(serializers.ModelSerializer):
    tickets = TicketSerializer(many=True, read_only=True)
    session = SessionSerializer(read_only=True)

    class Meta:
        model = Booking
        fields = ["id","session","customer_name","customer_email","customer_phone","status","created_at","tickets"]
