import requests
import datetime
import time
import json
import xmltodict
from pytz import timezone
from maps.models import BikeStation
from predictor.models import Forecast, FutureBikeStation
from ddareunge.settings import get_secret

def fixDtString(dtstr):
    if dtstr[-3] == '.': #밀리초가 두자리인 경우, 뒤에 0을 붙여줌
        return dtstr + '0'
    else:
        return dtstr

def request_Covid19(gubun):
    currentDt = datetime.datetime.now(timezone('Asia/Seoul'))

    url = "http://openapi.data.go.kr/openapi/service/rest/Covid19/getCovid19SidoInfStateJson"
    payload = {
        'serviceKey': get_secret("PUBLIC_DATA_PORTAL_APIKEY"), 
        'pageNo': '1',
        'numOfRows': '10000',
        'startCreateDt': (currentDt - datetime.timedelta(days=1)).strftime("%Y%m%d"),
        'endCreateDt': currentDt.strftime("%Y%m%d"),
    }

    try:
        xml_str = requests.get(url, params=payload).text
        xml_parse = xmltodict.parse(xml_str)
        xml_dict = json.loads(json.dumps(xml_parse))

        covid_data = None
        for item in xml_dict['response']['body']['items']['item']:

            if item['gubun'] == gubun:
                if covid_data is None or \
                datetime.datetime.fromisoformat(fixDtString(covid_data['createDt'])) < datetime.datetime.fromisoformat(fixDtString(item['createDt'])):
                    covid_data = item

        return covid_data

    except Exception as e:
        print("코로나 확진자 api 에러: " , e)
        return None


# def updateFutureBikeStationInfo():
#     try:
#         if (FutureBikeStation.objects.latest('updated_at').updated_at.astimezone(timezone('Asia/Seoul')) + datetime.timedelta(hours=1) > datetime.datetime.now(timezone('Asia/Seoul'))):
#             return
#     except FutureBikeStation.DoesNotExist:
#         pass

#     print("Start updating future bike station information...")
#     start_time = time.time()

#     weather = {}

#     for index, forecast in enumerate(Forecast.objects.all(), start = 1):
#         dt = forecast.forecast_time.astimezone(timezone('Asia/Seoul'))

#         weather['w' + str(index)] = {
#             'date': dt.strftime("%Y-%m-%d"),
#             'hour': dt.strftime("%H"),
#             'gu': forecast.area.name,
#             'temp': forecast.temperature,
#             'preci': forecast.precipitation,
#             'humid': forecast.humidity,
#             'ws': forecast.wind_speed,
#             'fd': forecast.pm10,
#             'wfd': forecast.pm2_5,
#             'ozone': forecast.ozone
#         }

#     blist = []

#     for station in BikeStation.objects.all():
#         blist.append({
#             'id': station.station_id,
#             'gu': station.addr_level2
#         })

#     seoul_covid_data = request_Covid19('서울')


#     predicts = {} # 여기에서 예측 모델 함수 실행 (인자: weather, blist, seoul_covid_data)


#     currentDt = datetime.datetime.now(timezone('Asia/Seoul'))
#     currentDt = currentDt.replace(minute = 0, second = 0, microsecond = 0)
#     FutureBikeStation.objects.filter(prediction_time__lt=currentDt).delete()

#     for dt, stations in sorted(predicts.items()):
#         if dt < currentDt:
#             continue

#         for station_number, bike_count in stations:
#             try:
#                 obj = FutureBikeStation.objects.get(station = stationObj, prediction_time = dt)

#                 obj.predicted_parking_bike_count = bike_count
#                 obj.updated_at = datetime.datetime.now(timezone('Asia/Seoul'))
#                 obj.save()

#             except FutureBikeStation.DoesNotExist:
#                 new_values = {
#                     'station': stationObj,
#                     'prediction_time': dt,
#                     'predicted_parking_bike_count': bike_count,
#                     'updated_at': datetime.datetime.now(timezone('Asia/Seoul')),
#                 }
#                 obj = FutureBikeStation(**new_values)
#                 obj.save()

#             except BikeStation.DoesNotExist:
#                 continue


#     print("Future bike station information update complete! (" + str(round(time.time() - start_time, 2)) + " seconds)")
#     return