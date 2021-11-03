import requests
import datetime
import time
from pytz import timezone
from maps.models import BikeStation
from decimal import Decimal
from ddareunge.settings import get_secret

def requestBikeStationInfo():
    url = "http://openapi.seoul.go.kr:8088"
    apikey = get_secret("SEOUL_OPEN_DATA_PLAZA_APIKEY") # 서울시 오픈API 인증키
    datatype = "json" # 따릉이 실시간 대여정보는 json형식으로만 제공된다.
    service = "bikeList" # 고정값
    start_index = 1 # end_index - start_index가 0이상 1000미만이여야 하고, index는 1부터 시작한다.
    end_index = 1000  
    
    # 1000개 단위로 모든 데이터를 가져온다.
    rows = []
    while True:
        try:
            response = requests.get('/'.join([url, apikey, datatype, service, str(start_index), str(end_index)])) # http GET request
            data = response.json()
        except requests.exceptions.RequestException as e:
            print(e)
            return None
        except ValueError as e:
            print("json parsing error:")
            print(e)
            return None

        try:
            if ("rentBikeStatus" in data) and (data["rentBikeStatus"]["RESULT"]["CODE"] == "INFO-000"): # success
                for row in data["rentBikeStatus"]["row"]:
                    rows.append({
                        'rackTotCnt': row['rackTotCnt'],
                        'stationName': row['stationName'],
                        'parkingBikeTotCnt': row['parkingBikeTotCnt'],
                        'stationLatitude': row['stationLatitude'],
                        'stationLongitude': row['stationLongitude'],
                        'stationId': row['stationId']
                    })
            elif ("CODE" in data) and (data["CODE"] == "INFO-200"): # reached end of data
                break
        except KeyError:
            print("ddareuenge openAPI failed")
            return None

        start_index += 1000
        end_index += 1000
    
    return rows


def requestReverseGeocoding(latitude, longitude):
    url = "https://dapi.kakao.com/v2/local/geo/coord2regioncode.json"
    payload = {
        'x': str(longitude),
        'y': str(latitude)
    }
    header = {
        "Authorization": "KakaoAK " + get_secret("KAKAO_REST_APIKEY")
    }
    
    try:
        response = requests.get(url, params=payload, headers=header)
        data = response.json()
    except requests.exceptions.RequestException as e:
        print(e)
        return None
    except ValueError:
        print("json parsing error")
        return None

    try:
        if data["documents"]:
            for addr in data["documents"]:
                if addr["region_type"] == "B":
                    return {"level1": addr["region_1depth_name"], "level2": addr["region_2depth_name"]}
            return {"level1": data["documents"][0]["region_1depth_name"], "level2": data["documents"][0]["region_2depth_name"]}
        else:
            return None

    except KeyError:
        print("coord2regioncode API failed")
        print(data)
        return None
    
def updateBikeStationInfo():
    try:
        if (BikeStation.objects.latest('updated_at').updated_at.astimezone(timezone('Asia/Seoul')) + datetime.timedelta(minutes=4, seconds=30) > datetime.datetime.now(timezone('Asia/Seoul'))):
            return
    except BikeStation.DoesNotExist:
        pass

    print("Start updating bike station information...")
    start_time = time.time()

    station_list = requestBikeStationInfo()

    dt = datetime.datetime.now(timezone('Asia/Seoul'))

    if station_list is None:
        return

    for station in station_list:

        defaults = {
            'station_num': int(station["stationName"].split('.')[0]),
            'station_name': station["stationName"],
            'station_id': station["stationId"],
            'rack_total_count': station["rackTotCnt"],
            'parking_bike_total_count': station["parkingBikeTotCnt"],
            'updated_at': dt
        }
        try:
            obj = BikeStation.objects.get(latitude = Decimal(station["stationLatitude"]), longitude = Decimal(station["stationLongitude"]))
            for key, value in defaults.items():
                setattr(obj, key, value)
            if (obj.addr_level1 is None or obj.addr_level2 is None):
                addr = requestReverseGeocoding(station["stationLatitude"], station["stationLongitude"])
                obj.addr_level1 = addr["level1"] if addr is not None else None
                obj.addr_level2 = addr["level2"] if addr is not None else None
            obj.save()
            
        except BikeStation.DoesNotExist:
            addr = requestReverseGeocoding(station["stationLatitude"], station["stationLongitude"])
            new_values = {
                'latitude': Decimal(station["stationLatitude"]), 
                'longitude': Decimal(station["stationLongitude"]),
                'addr_level1': addr["level1"] if addr is not None else None,
                'addr_level2': addr["level2"] if addr is not None else None
            }
            new_values.update(defaults)
            obj = BikeStation(**new_values)
            obj.save()
            

    BikeStation.objects.filter(updated_at__lt = dt).delete() #철거된 대여소 정보 삭제

    print("Bike station information update complete! (" + str(round(time.time() - start_time, 2)) + " seconds)")
    return
    
