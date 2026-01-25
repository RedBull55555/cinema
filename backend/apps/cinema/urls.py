from django.urls import path, include
from rest_framework.routers import DefaultRouter

from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    MoviePublicViewSet, ScheduleView, SessionPublicView, BookSessionPublicView,
    TicketPublicView, TicketQrView,
    HallAdminViewSet, SeatAdminViewSet, HallPriceAdminView,
    MovieAdminViewSet, SessionAdminViewSet, BookingAdminViewSet
)

router_public = DefaultRouter()
router_public.register(r"movies", MoviePublicViewSet, basename="movies")

router_admin = DefaultRouter()
router_admin.register(r"halls", HallAdminViewSet, basename="admin-halls")
router_admin.register(r"seats", SeatAdminViewSet, basename="admin-seats")
router_admin.register(r"movies", MovieAdminViewSet, basename="admin-movies")
router_admin.register(r"sessions", SessionAdminViewSet, basename="admin-sessions")
router_admin.register(r"bookings", BookingAdminViewSet, basename="admin-bookings")

urlpatterns = [
    path("", include(router_public.urls)),
    path("schedule/", ScheduleView.as_view(), name="schedule"),
    path("sessions/<int:pk>/", SessionPublicView.as_view(), name="session-detail"),
    path("sessions/<int:pk>/book/", BookSessionPublicView.as_view(), name="session-book"),
    path("tickets/<uuid:code>/", TicketPublicView.as_view(), name="ticket-detail"),
    path("tickets/<uuid:code>/qr.png", TicketQrView.as_view(), name="ticket-qr"),

    # Admin auth (JWT)
    path("admin/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("admin/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # Admin API
    path("admin/", include(router_admin.urls)),
    path("admin/halls/<int:hall_id>/prices/", HallPriceAdminView.as_view(), name="hall-prices"),
]
