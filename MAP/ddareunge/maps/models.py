from django.db import models


class BikeStation(models.Model):
    station_num = models.BigIntegerField(unique=True)
    station_name = models.CharField(max_length=100)
    station_id = models.CharField(max_length=50, primary_key=True)
    latitude = models.DecimalField(max_digits=20, decimal_places=17)
    longitude = models.DecimalField(max_digits=20, decimal_places=17)
    addr_level1 = models.CharField(max_length=50, null=True, blank=True)  # 시 / 도
    addr_level2 = models.CharField(max_length=50, null=True, blank=True)  # 시 / 군 / 구
    rack_total_count = models.CharField(max_length=10)
    parking_bike_total_count = models.CharField(max_length=10)
    updated_at = models.DateTimeField()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["latitude", "longitude"],
                name="unique coordinates"
            )
        ]
