from django.shortcuts import render

import pandas as pd
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from predictor.serializers import *
from predictor.bike_predictor import *

class WeatherView(APIView):
    def get(self, request):
        weather = Forecast.objects.select_related("area").all()
        serializer = ForecastSerializer(weather, many=True)
        df = pd.DataFrame.from_dict(serializer.data)
        if len(df) == 0:
            return Response()
        df = df.dropna(axis=0)
        df = pd.concat([df.drop(['area'], axis=1), df['area'].apply(pd.Series)], axis=1)

        df['기온'] = df['temperature'].apply(lambda x: round(float(x), 1))
        df['년월일'] = df['forecast_time'].apply(lambda x: x[0:10])
        df['시'] = df['forecast_time'].apply(lambda x: int(x.split('T')[1][0:2]))
        df['습도'] = df['humidity'].apply(lambda x: round(float(x)))
        df['강수량'] = df['precipitation'].apply(lambda x: round(float(x), 1))
        df['풍속'] = df['wind_speed'].apply(lambda x: round(float(x), 1))
        df['미세먼지'] = df['pm10'].apply(lambda x: round(x))
        df['초미세먼지'] = df['pm2_5'].apply(lambda x: round(x))
        df['오존'] = df['ozone'].apply(lambda x: round(x))
        df.rename(columns={'name': '자치구'}, inplace=True)
        df = df[['년월일', '시', '자치구', '기온', '습도', '강수량', '풍속', '미세먼지', '초미세먼지', '오존']]
        return Response(df.to_dict('records'))


class CovidView(APIView):
    def get(self, request):
        covid = request_Covid19('서울')['incDec']
        return Response(int(covid))


class MLResultView(APIView):
    def get(self, request):
        if len(request.GET.keys()) == 0:  # query param 없을 때
            ml_result = FutureBikeStation.objects.select_related("station").all()
            serializer = MLResultSerializer(ml_result, many=True)
            return Response(serializer.data)
        elif len(request.GET.keys()) == 1 and ('time' in request.GET):
            request_time = request.GET['time'].split('T')[0] + " " + request.GET['time'].split('T')[-1] + ":00:00+09:00"
            try:
                ml_result = FutureBikeStation.objects.filter(prediction_time=request_time)
            except:
                return Response(status=status.HTTP_400_BAD_REQUEST)
            if len(ml_result) == 0:
                return Response(status=status.HTTP_404_NOT_FOUND)
            serializer = MLResultSerializer(ml_result, many=True)
            return Response(serializer.data)
        else:
            return Response(status=status.HTTP_400_BAD_REQUEST)

    def post(self, request):
        serializer = MLResultSerializer(data=request.data, many=True)
        if serializer.is_valid():
            serializer.save()
            return Response(status=status.HTTP_201_CREATED)
        print(serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        try:
            FutureBikeStation.objects.all().delete()
        except:
            return Response(status=status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_200_OK)
