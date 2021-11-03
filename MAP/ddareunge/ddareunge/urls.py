"""ddareunge URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/3.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from maps import views
from predictor import views as pviews

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', views.main, name='main'),
    path('main', views.main, name='main'),
    path('api/bikeList', views.get_bikeList, name='bikeList'),
    path('api/predictedParkingBikeCount', views.get_futureBikeCounts, name='predictedParkingBikeCount'),
    path('api/ml-bikeList', views.BikeStationView.as_view()),
    path('api/ml-weather', pviews.WeatherView.as_view()),
    path('api/ml-covid', pviews.CovidView.as_view()),
    path('api/ml-result', pviews.MLResultView.as_view()),
]
