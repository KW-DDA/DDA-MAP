import requests
from collections import defaultdict
import datetime
import time
from pytz import timezone
from decimal import Decimal
from predictor.models import Area, Forecast
from ddareunge.settings import get_secret

# 기상청 초단기예보
def request_KMA_UltraSrtFcst(forecasts, x, y):
    currentDt = datetime.datetime.now(timezone('Asia/Seoul'))

    # 가장 최신 예보가 언제였는지 결정
    if currentDt.minute > 45:
        baseDt = currentDt.replace(minute = 30)
    else:
        baseDt = currentDt - datetime.timedelta(hours=1)
        baseDt = baseDt.replace(minute = 30)

    url = "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtFcst"
    payload = {
        'serviceKey': get_secret("PUBLIC_DATA_PORTAL_APIKEY"), 
        'numOfRows': '10000',
        'pageNo': '1',
        'dataType': 'json',
        'base_date': baseDt.strftime("%Y%m%d"),
        'base_time': baseDt.strftime("%H%M"),
        'nx': x,
        'ny': y
    }
    try:
        response = requests.get(url, params=payload)
        data = response.json()

        for item in data["response"]["body"]["items"]["item"]:
            forecastDt = datetime.datetime.strptime(item['fcstDate'] + item['fcstTime'] + "+0900", "%Y%m%d%H%M%z")

            if item['category'] == 'T1H': # 기온
                forecasts[forecastDt]['temp'] = Decimal(item['fcstValue'])
            elif item['category'] == 'WSD': # 풍속
                forecasts[forecastDt]['windspeed'] = Decimal(item['fcstValue'])
            elif item['category'] == 'RN1': # 1시간 강수량
                if item['fcstValue'] == '강수없음':
                    forecasts[forecastDt]['precip'] = Decimal(0.0)
                elif item['fcstValue'] == '1mm 미만':
                    forecasts[forecastDt]['precip'] = Decimal(0.5)
                else:
                    forecasts[forecastDt]['precip'] = Decimal(item['fcstValue'].split('mm')[0])
            elif item['category'] == 'REH': # 습도
                forecasts[forecastDt]['humidity'] = Decimal(item['fcstValue'])
            
            forecasts[forecastDt]['source'] = 1

    except Exception as e:
        print("기상청 초단기예보 에러: " , e)
        return False
    
    return True

# 기상청 단기예보
def request_KMA_SrtFcst(forecasts, x, y):
    currentDt = datetime.datetime.now(timezone('Asia/Seoul'))

    # 가장 최신 예보가 언제였는지 결정
    if currentDt.time() < datetime.time(2, 11, 0):
        baseDt = currentDt - datetime.timedelta(days=1)
        baseDt = baseDt.replace(hour = 23, minute = 0)
    elif currentDt.time() < datetime.time(5, 11, 0):
        baseDt = currentDt.replace(hour = 2, minute = 0)
    elif currentDt.time() < datetime.time(8, 11, 0):
        baseDt = currentDt.replace(hour = 5, minute = 0)
    elif currentDt.time() < datetime.time(11, 11, 0):
        baseDt = currentDt.replace(hour = 8, minute = 0)
    elif currentDt.time() < datetime.time(14, 11, 0):
        baseDt = currentDt.replace(hour = 11, minute = 0)
    elif currentDt.time() < datetime.time(17, 11, 0):
        baseDt = currentDt.replace(hour = 14, minute = 0)
    elif currentDt.time() < datetime.time(20, 11, 0):
        baseDt = currentDt.replace(hour = 17, minute = 0)
    elif currentDt.time() < datetime.time(23, 11, 0):
        baseDt = currentDt.replace(hour = 20, minute = 0)
    else:
        baseDt = currentDt.replace(hour = 23, minute = 0)

    url = "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst"
    payload = {
        'serviceKey': get_secret("PUBLIC_DATA_PORTAL_APIKEY"), 
        'numOfRows': '10000',
        'pageNo': '1',
        'dataType': 'json',
        'base_date': baseDt.strftime("%Y%m%d"),
        'base_time': baseDt.strftime("%H%M"),
        'nx': x,
        'ny': y
    }
    try:
        response = requests.get(url, params=payload)
        data = response.json()

        for item in data["response"]["body"]["items"]["item"]:
            forecastDt = datetime.datetime.strptime(item['fcstDate'] + item['fcstTime'] + "+0900", "%Y%m%d%H%M%z")

            if item['category'] == 'TMP' and 'temp' not in forecasts[forecastDt]: # 1시간 기온
                forecasts[forecastDt]['temp'] = Decimal(item['fcstValue'])
            elif item['category'] == 'WSD' and 'windspeed' not in forecasts[forecastDt]: # 풍속
                forecasts[forecastDt]['windspeed'] = Decimal(item['fcstValue'])
            elif item['category'] == 'PCP' and 'precip' not in forecasts[forecastDt]: # 1시간 강수량
                if item['fcstValue'] == '강수없음':
                    forecasts[forecastDt]['precip'] = Decimal(0.0)
                elif item['fcstValue'] == '1mm 미만':
                    forecasts[forecastDt]['precip'] = Decimal(0.5)
                else:
                    forecasts[forecastDt]['precip'] = Decimal(item['fcstValue'].split('mm')[0])
            elif item['category'] == 'POP' and 'precipprob' not in forecasts[forecastDt]: # 강수확률
                forecasts[forecastDt]['precipprob'] = Decimal(item['fcstValue'])    
            elif item['category'] == 'REH' and 'humidity' not in forecasts[forecastDt]: # 습도
                forecasts[forecastDt]['humidity'] = Decimal(item['fcstValue'])

            if 'source' not in forecasts[forecastDt]:
                forecasts[forecastDt]['source'] = 2

    except Exception as e:
        print("기상청 단기예보 에러: " , e)
        return False

    return True

    
# Visual Crossing 중기예보
def request_VC_MtFcst(forecasts, lat, lng):
    url = "https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/" + str(lat) + "," + str(lng)
    payload = {
        'unitGroup': "metric", 
        'key': get_secret("VISUAL_CROSSING_APIKEY"), 
        'include': 'fcst,hours'
    }
    try:
        response = requests.get(url, params=payload)
        data = response.json()

        for day in data["days"]:
            for hour in day["hours"]: 
                forecastDt = datetime.datetime.fromisoformat(day["datetime"] + " " + hour["datetime"] + "+09:00")

                if forecastDt not in forecasts:
                    forecasts[forecastDt] = {
                        'temp': hour["temp"],
                        'windspeed': hour["windspeed"],
                        'precip': hour["precip"],
                        'precipprob': hour["precipprob"],
                        'humidity': hour["humidity"],
                        'source': 3
                    }

    except Exception as e:
        print("Visual Crossing 중기예보 에러: " , e)
        return False

    return True


# Open Weather Map 대기질 예보
def request_OWM_AirPollution(forecasts, lat, lng):
    url = "https://api.openweathermap.org/data/2.5/air_pollution/forecast"
    payload = {
        'lat': str(lat),
        'lon': str(lng),
        'appid': get_secret("OPEN_WEATHER_MAP_APIKEY")
    }
    
    try:
        response = requests.get(url, params=payload)
        data = response.json()

        for hour in data["list"]:
            forecastDt = datetime.datetime.fromtimestamp(hour["dt"], datetime.timezone.utc)
            forecastDt = forecastDt.astimezone(timezone('Asia/Seoul'))

            forecast = forecasts[forecastDt]

            if hour["components"]["pm10"] < 31.0:
                forecast['pm10'] = 1
            elif hour["components"]["pm10"] < 81.0:
                forecast['pm10'] = 2
            elif hour["components"]["pm10"] < 151.0:
                forecast['pm10'] = 3
            else:
                forecast['pm10'] = 4

            if hour["components"]["pm2_5"] < 16.0:
                forecast['pm2_5'] = 1
            elif hour["components"]["pm2_5"] < 36.0:
                forecast['pm2_5'] = 2
            elif hour["components"]["pm2_5"] < 176.0:
                forecast['pm2_5'] = 3
            else:
                forecast['pm2_5'] = 4
            
            if hour["components"]["o3"] * 0.00196 < 0.031:
                forecast['o3'] = 1
            elif hour["components"]["o3"] * 0.00196 < 0.091:
                forecast['o3'] = 2
            elif hour["components"]["o3"] * 0.00196 < 0.151:
                forecast['o3'] = 3
            else:
                forecast['o3'] = 4

            forecasts[forecastDt] = forecast

    except Exception as e:
        print("Open Weather Map 대기질 예보 에러: " , e)
        return False

    return True


def updateAllForecasts():
    print("Start updating all forecasts...")
    start_time = time.time()

    for area in Area.objects.all():
        forecasts = defaultdict(dict)

        if (area.KMA_UltraSrtFcst_updated_at is None) or (area.KMA_UltraSrtFcst_updated_at.astimezone(timezone('Asia/Seoul')) + datetime.timedelta(minutes=20) <= datetime.datetime.now(timezone('Asia/Seoul'))):
            if request_KMA_UltraSrtFcst(forecasts, area.x_KMA, area.y_KMA):
                area.KMA_UltraSrtFcst_updated_at = datetime.datetime.now(timezone('Asia/Seoul'))

        if (area.KMA_SrtFcst_updated_at is None) or (area.KMA_SrtFcst_updated_at.astimezone(timezone('Asia/Seoul')) + datetime.timedelta(minutes=20) <= datetime.datetime.now(timezone('Asia/Seoul'))):
            if request_KMA_SrtFcst(forecasts, area.x_KMA, area.y_KMA):
                area.KMA_SrtFcst_updated_at = datetime.datetime.now(timezone('Asia/Seoul'))

        if (area.VC_MtFcst_updated_at is None) or (area.VC_MtFcst_updated_at.astimezone(timezone('Asia/Seoul')) + datetime.timedelta(minutes=50) <= datetime.datetime.now(timezone('Asia/Seoul'))):
            if request_VC_MtFcst(forecasts, area.latitude, area.longitude):
                area.VC_MtFcst_updated_at = datetime.datetime.now(timezone('Asia/Seoul'))

        if (area.OWM_AirPollution_updated_at is None) or (area.OWM_AirPollution_updated_at.astimezone(timezone('Asia/Seoul')) + datetime.timedelta(minutes=50) <= datetime.datetime.now(timezone('Asia/Seoul'))):
            if request_OWM_AirPollution(forecasts, area.latitude, area.longitude):
                area.OWM_AirPollution_updated_at = datetime.datetime.now(timezone('Asia/Seoul'))

        if forecasts:
            #지역구의 현재 시 이전 날씨 예보 데이터 삭제
            currentDt = datetime.datetime.now(timezone('Asia/Seoul'))
            currentDt = currentDt.replace(minute = 0, second = 0, microsecond = 0)
            Forecast.objects.filter(area=area, forecast_time__lt=currentDt).delete()

            for dt, weather in sorted(forecasts.items()):
                if dt < currentDt:
                    continue

                if not dt.minute and not dt.second and not dt.microsecond:
                    try:
                        obj = Forecast.objects.get(area = area, forecast_time = dt)

                        weather_source = weather.get("source")

                        if obj.weather_source is None or (weather_source is not None and weather_source <= obj.weather_source):
                            obj.temperature = weather.get("temp", obj.temperature)
                            obj.wind_speed = weather.get("windspeed", obj.wind_speed)
                            obj.precipitation = weather.get("precip", obj.precipitation)
                            obj.precipitation_prob = weather.get("precipprob", obj.precipitation_prob)
                            obj.humidity = weather.get("humidity", obj.humidity)
                            obj.weather_source = weather_source
                        
                        obj.pm10 = weather.get("pm10", obj.pm10)
                        obj.pm2_5 = weather.get("pm2_5", obj.pm2_5)
                        obj.ozone = weather.get("o3", obj.ozone)
                        obj.save()

                    except Forecast.DoesNotExist:
                        new_values = {
                            'area': area,
                            'forecast_time': dt,
                            'temperature': weather.get("temp"),
                            'wind_speed': weather.get("windspeed"), 
                            'precipitation': weather.get("precip"),
                            'precipitation_prob': weather.get("precipprob"),
                            'humidity': weather.get("humidity"), 
                            'pm10': weather.get("pm10"),
                            'pm2_5': weather.get("pm2_5"),
                            'ozone': weather.get("o3"),
                            'weather_source': weather.get("source")
                        }
                        obj = Forecast(**new_values)
                        obj.save()

                else:
                    print("예보 데이터가 시간 단위가 아닙니다.")

        area.save()

    print("All forecasts update complete! (" + str(round(time.time() - start_time, 2)) + " seconds)")
    return

def getForecast(dt):

    dt = dt.replace(minute = 0, second = 0, microsecond = 0)

    forecasts = Forecast.objects.filter(forecast_time=dt).values(
        'forecast_time', 'area__name', 'temperature', 'wind_speed', 'precipitation', 'precipitation_prob', 'humidity', 'pm10', 'pm2_5', 'ozone')

    for forecast in forecasts:
        forecast['forecast_time'] = forecast['forecast_time'].astimezone(timezone('Asia/Seoul'))

    return forecasts

