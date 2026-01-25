from django.contrib import admin
from .models import Hall, Seat, HallPrice, Movie, Session, Booking, Ticket

@admin.register(Hall)
class HallAdmin(admin.ModelAdmin):
    list_display = ("id","name","rows_count","seats_per_row","is_active")

@admin.register(Seat)
class SeatAdmin(admin.ModelAdmin):
    list_display = ("id","hall","row","number","seat_type")
    list_filter = ("hall","seat_type")

@admin.register(HallPrice)
class HallPriceAdmin(admin.ModelAdmin):
    list_display = ("hall","standard_price","vip_price")

@admin.register(Movie)
class MovieAdmin(admin.ModelAdmin):
    list_display = ("id","title","duration_minutes","is_active")

@admin.register(Session)
class SessionAdmin(admin.ModelAdmin):
    list_display = ("id","movie","hall","starts_at","ends_at","status")
    list_filter = ("hall","status")

@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ("id","session","customer_name","status","created_at")

@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ("id","session","seat","price_snapshot","code")
