from rest_framework import serializers

from .models import *


class BikeStationSerializer(serializers.ModelSerializer):
    class Meta:
        model = BikeStation
        fields = ['addr_level2', 'station_num', 'latitude', 'longitude']
