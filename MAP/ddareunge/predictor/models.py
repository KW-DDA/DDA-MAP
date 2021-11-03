from django.db import models
from maps.models import BikeStation


# 자치구 정보 테이블
class Area(models.Model):
    name = models.CharField(max_length=50, unique=True)
    latitude = models.DecimalField(max_digits=20, decimal_places=17)
    longitude = models.DecimalField(max_digits=20, decimal_places=17)
    x_KMA = models.IntegerField()  # 기상청 예보 격자 x
    y_KMA = models.IntegerField()  # 기상청 예보 격자 y
    KMA_UltraSrtFcst_updated_at = models.DateTimeField(null=True, blank=True)
    KMA_SrtFcst_updated_at = models.DateTimeField(null=True, blank=True)
    VC_MtFcst_updated_at = models.DateTimeField(null=True, blank=True)
    OWM_AirPollution_updated_at = models.DateTimeField(null=True, blank=True)


# 일기예보 데이터 테이블
class Forecast(models.Model):
    WEATHER_SOURCE_CHOICES = [
        (1, 'KMA_UltraSrtFcst'),
        (2, 'KMA_SrtFcst'),
        (3, 'VC_MtFcst'),
    ]

    AIRPOLLUTION_CHOICES = [
        (1, 'Good'),
        (2, 'Moderate'),
        (3, 'Bad'),
        (4, 'Very Bad')
    ]

    area = models.ForeignKey(Area, on_delete=models.CASCADE)
    forecast_time = models.DateTimeField()
    weather_source = models.IntegerField(choices=WEATHER_SOURCE_CHOICES, null=True, blank=True)
    temperature = models.DecimalField(max_digits=10, decimal_places=5, null=True, blank=True)
    wind_speed = models.DecimalField(max_digits=10, decimal_places=5, null=True, blank=True)
    precipitation = models.DecimalField(max_digits=10, decimal_places=5, null=True, blank=True)
    precipitation_prob = models.DecimalField(max_digits=10, decimal_places=5, null=True, blank=True)
    humidity = models.DecimalField(max_digits=10, decimal_places=5, null=True, blank=True)
    pm10 = models.IntegerField(choices=AIRPOLLUTION_CHOICES, null=True, blank=True)
    pm2_5 = models.IntegerField(choices=AIRPOLLUTION_CHOICES, null=True, blank=True)
    ozone = models.IntegerField(choices=AIRPOLLUTION_CHOICES, null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["area", "forecast_time"],
                name="forecast_time unique for area"
            )
        ]


# 대여소 대여가능량 예측 데이터 테이블
class FutureBikeStation(models.Model):
    station = models.ForeignKey(BikeStation, to_field='station_num', db_column='station', on_delete=models.CASCADE)
    prediction_time = models.DateTimeField()
    predicted_parking_bike_count = models.IntegerField()
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["station", "prediction_time"],
                name="prediction_time unique for station"
            )
        ]
