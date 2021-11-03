from django.shortcuts import render
from django.http import HttpResponse
from django.http import JsonResponse
from maps.models import BikeStation

import datetime
from pytz import timezone

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import *

import pandas as pd

from ddareunge.settings import get_secret


def main(request):
    context = {
        "KAKAO_MAPS_APIKEY": get_secret("KAKAO_MAPS_APIKEY"),
        "KAKAO_REST_APIKEY": get_secret("KAKAO_REST_APIKEY"),

        "range_mypos": request.GET.get("range_mypos", "All"),
        "excludeEmpty_mypos": bool(request.GET.get("excludeEmpty_mypos", False)),

        "range_OrigDest": request.GET.get("range_OrigDest", "500"),
        "excludeEmpty_OrigDest": bool(request.GET.get("excludeEmpty_OrigDest", False)),

        "depDateTime": request.GET.get("depDateTime", ""),

        "forInit": {
            "mode": request.GET.get("mode", ""),
            "query": request.GET.get("query", ""),

            "origStationId": request.GET.get("origStationId", ""),
            "destStationId": request.GET.get("destStationId", ""),

            "origLat": request.GET.get("origLat", ""),
            "origLng": request.GET.get("origLng", ""),
            "destLat": request.GET.get("destLat", ""),
            "destLng": request.GET.get("destLng", ""),

            "origName": request.GET.get("origName", ""),
            "origId": request.GET.get("origId", ""),
            "destName": request.GET.get("destName", ""),
            "destId": request.GET.get("destId", ""),
        }
    }

    return render(request, 'maps/main.html', context)


def get_bikeList(request):
    try:
        updated_at = BikeStation.objects.earliest('updated_at').updated_at.astimezone(timezone('Asia/Seoul'))
        base_time = request.GET.get("base_time", "")

        if not base_time or datetime.datetime.fromisoformat(base_time) < updated_at:
            data = list(BikeStation.objects.values(
                'station_name', 'station_id', 'latitude', 'longitude', 'rack_total_count', 'parking_bike_total_count'))
            return JsonResponse({'base_time': updated_at.isoformat(), 'arr': data}, safe=False,
                                json_dumps_params={'ensure_ascii': False})

        else:
            return JsonResponse({'base_time': "", 'arr': []}, safe=False, json_dumps_params={'ensure_ascii': False})

    except BikeStation.DoesNotExist:
        return JsonResponse({'base_time': "", 'arr': []}, safe=False, json_dumps_params={'ensure_ascii': False})


def get_futureBikeCounts(request):
    pass


class BikeStationView(APIView):
    def get(self, request):
        b_list = BikeStation.objects.all()
        serializer = BikeStationSerializer(b_list, many=True)
        df = pd.DataFrame.from_dict(serializer.data)
        df.rename(columns={'addr_level2': 'gu', 'station_num': '대여소번호', 'latitude': '위도', 'longitude': '경도'},
                  inplace=True)
        return Response(df.to_dict('records'))
