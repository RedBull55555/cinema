from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("cinema", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="seat",
            name="seat_type",
            field=models.CharField(
                choices=[("STANDARD", "Обычное"), ("VIP", "VIP")],
                default="STANDARD",
                max_length=16,
            ),
        ),
        migrations.AlterField(
            model_name="ticket",
            name="seat_type_snapshot",
            field=models.CharField(choices=[("STANDARD", "Обычное"), ("VIP", "VIP")], max_length=16),
        ),
    ]
