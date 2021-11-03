from rest_framework import serializers

from .models import *


class AreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Area
        fields = ['name']


class ForecastSerializer(serializers.ModelSerializer):
    area = AreaSerializer(read_only=True)

    class Meta:
        model = Forecast
        fields = ["area", "temperature", "forecast_time", "humidity", "precipitation", "wind_speed",
                  "pm10", "pm2_5", "ozone"]


class BikeListSerializer(serializers.ModelSerializer):
    class Meta:
        model = BikeStation
        fields = ["station_num", "station_id"]


class MLResultSerializer(serializers.ModelSerializer):
    station = BikeListSerializer(read_only=True)

    class Meta:
        model = FutureBikeStation
        fields = ["station", "prediction_time", "predicted_parking_bike_count"]
