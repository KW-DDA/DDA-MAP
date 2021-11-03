#!/usr/bin/env python
# coding: utf-8

import json
import pandas as pd
import numpy as np
import os
import xgboost as xgb
import pandas as pd
import requests
import sys
from haversine import haversine


def get_from_api(url):
    r = requests.get(url)
    data = json.loads(r.text)
    return data


# 요일 one-hot vector 처리, get_dummies로 하면 예외처리 안됨
def one_hot(x, day): 
    if x == day: return 1
    else: return 0


def predict(data, gu_name, blist_num) :
    # 해당 구의 데이터만 추출
    gu_data = data[data['자치구'] == gu_name]
    
    # 해당 구 대여소들의 모델 불러오기
    model_list = []
    file_path = '따릉이_model/' + gu_name +'_model'
    file_list = os.listdir(file_path)

    for lists in file_list:
        model_list.append(lists)
    
    # 모든 대여소의 예측값을 저장할 데이터프레임
    gu_result = pd.DataFrame(columns=['대여소번호','년','월','일','시','예측값'])

    # 모델 학습 피쳐 설정
    dayofweek = ["요일_"+str(i) for i in range(7)]
    features = ['월','일','시','휴일','기온','강수량','습도','풍속','미세먼지','초미세먼지','오존','확진자수']+dayofweek
    
    for i in gu_data.index :
        # 한 행의 데이터만 분할하여 받는다
        temp_data = pd.DataFrame(columns = features)
        temp_data = temp_data.append(gu_data.loc[i], ignore_index=True)

        # 해당 구의 모든 대여소 모델 호출하여 예측 수행
        for model in model_list :
            lentalNumber = int(model.split('_')[1].split('.')[0])
            if lentalNumber not in blist_num: continue # blist에 존재하지 않는 대여소는 모델호출x
                
            globals()['{}_model'.format(lentalNumber)] = xgb.XGBRegressor()
            globals()['{}_model'.format(lentalNumber)].load_model(file_path + '/' + gu_name + '_{}.model'.format(lentalNumber))
            prediction = np.ceil(globals()['{}_model'.format(lentalNumber)].predict(temp_data[features])).astype('int64')
            
            # 예측값을 저장할 데이터프레임
            temp_result = {'대여소번호':lentalNumber,
                           '년':temp_data['년'].values[0],
                           '월':temp_data['월'].values[0], 
                           '일':temp_data['일'].values[0],
                           '시':temp_data['시'].values[0],
                           '예측값' : prediction[0]
                          }
            gu_result = gu_result.append(temp_result, ignore_index=True)
    
    return gu_result


def Machine_Learning(w_list, covid, b_list):
    # [1] 입력받은 데이터 전처리
    input_data = pd.DataFrame(columns=['년월일','시','자치구','기온','습도','강수량','풍속','미세먼지','초미세먼지','오존'])
    
    # 1-1. 날씨 데이터에 확진자수 컬럼 추가
    input_data = input_data.append(w_list)
    input_data['확진자수'] = covid

    # 1-2. 휴일 컬럼 추가
    input_data['휴일'] = 0

    hueil = ['2021-01-01', '2021-02-11', '2021-02-12', '2021-02-13', '2021-03-01', '2021-05-05',  
         '2021-05-19', '2021-06-06', '2021-08-15', '2021-08-16', '2021-09-20', '2021-09-21',  
         '2021-09-22', '2021-10-03', '2021-10-04', '2021-10-09', '2021-10-11', '2021-12-25']
    
    for i in hueil:
        input_data.loc[(input_data.년월일 == i), '휴일'] = 1
    
    # 1-3. 년월일시 분리
    input_data['년월일'] = input_data['년월일'].astype('datetime64[ns]')
    input_data['년'] = input_data['년월일'].dt.year.astype('int64')
    input_data['월'] = input_data['년월일'].dt.month.astype('int64')
    input_data['일'] = input_data['년월일'].dt.day.astype('int64')
    input_data['시'] = input_data['시'].astype('int64')
    input_data['요일'] = input_data['년월일'].dt.weekday 
    input_data.drop('년월일', axis = 1, inplace = True)
    
    # 1-4. 요일 컬럼 one-hot vector 처리
    for i in range(0, 7):
        input_data['요일_{}'.format(i)] = 0 # 요일_0 ~ 요일_6 생성
        input_data['요일_{}'.format(i)] = input_data['요일'].apply(one_hot, day = i)
    input_data.drop('요일', axis = 1, inplace = True)
    
    ##########################################################################################
    
    # [2] 모델 호출 -> 기존대여소의 예측값 얻기 & 기존대여소번호 리스트 생성
    pred_all_data = pd.DataFrame(columns = ['대여소번호','년','월','일','시','예측값']) # 최종 예측 데이터 (전체구)
    pred_gu_data  = pd.DataFrame(columns = ['대여소번호','년','월','일','시','예측값']) # 해당 구의 예측 데이터

    # 2-1. 기존 대여소들의 모델 예측값 얻기
    blist_num = []
    for i in b_list.index: # blist에서 요구한 대여소번호
        blist_num.append(b_list.loc[i]['대여소번호'])
    
    gu_list = {'강북구', '광진구', '동대문구', '종로구', '중구', '성동구', '중랑구', '용산구', '성북구', 
               '강남구', '금천구', '영등포구', '송파구', '은평구', '도봉구', '노원구', '강동구', '관악구', 
               '구로구', '강서구', '양천구', '동작구', '서초구', '서대문구', '마포구'}

    i = 0
    for gu_name in gu_list:
        i += 1
        print(str(i) + '/' + str(len(gu_list)))
        pred_gu_data = predict(input_data, gu_name, blist_num) # 구 별 예측
        pred_all_data = pred_all_data.append(pred_gu_data, ignore_index = True) # 구 별 예측값 병합
    
    # 2-2. 기존 대여소번호 리스트 생성
    existing_num = [] 
    for rental_num in pred_all_data.index:
        
        temp_num = pred_all_data.loc[rental_num]['대여소번호']
        if temp_num not in existing_num: existing_num.append(temp_num) # 중복 x 
    existing_num.sort()                                                # 오름차순 정렬
    
    ##########################################################################################
    
    # [3] 신규대여소에 대한 예측값 생성하기
    station_new = b_list[~b_list['대여소번호'].isin(existing_num)]    # 신규대여소 
    station_origin = b_list[b_list['대여소번호'].isin(existing_num)]  # 기존대여소
    
    # 3-1. 신규대여소에 대한 데이터(자치구, 대여소번호, 위도, 경도) 선별
    for i in station_new.index :
                  
        new_stationNum = station_new.loc[i]['대여소번호']  
        new_x = float(station_new.loc[i]['위도'])                 
        new_y = float(station_new.loc[i]['경도'])                
        
        # 3-2. 신규 대여소에 대해서 가장 가까운 기존 대여소 선택
        distance = [] 
        for j in station_origin.index :
            
            orig_x = float(station_origin.loc[j]['위도'])       
            orig_y = float(station_origin.loc[j]['경도'])
            orig_stationNum = station_origin.loc[j]['대여소번호']
            d = haversine((orig_x, orig_y), (new_x, new_y), unit='m') # 신규대여소 ~ 기존대여소 거리계산 (좌표 거리계산 라이브러리 사용)
            #d = ((orig_x - new_x)**2 + (orig_y - new_y)**2)**(1/2) # 신규대여소 ~ 기존대여소 거리계산
            distance.append((orig_stationNum, d)) # (기존대여소번호, 거리) 저장 
            
        # 3-3. 가장 가까운 기존대여소 데이터를 통해 신규대여소 데이터 생성
        new_station_data = pd.DataFrame(columns = ['대여소번호','년','월','일','시','예측값'])
        distance.sort(key = lambda x : x[1]) # 거리기준 정렬
        new_station_data = pred_all_data.copy()[pred_all_data['대여소번호'] == distance[0][0]] # 가장가까운 기존대여소 데이터 추출                     
        new_station_data['대여소번호'] = new_stationNum
    
        # 3-4. 신규데이터를 기존데이터에 병합
        pred_all_data = pred_all_data.append(new_station_data)
    
    ##########################################################################################
    
    # [4] 최종 반환 데이터 형태로 처리
    pred_all_data['대여소번호'] = pred_all_data['대여소번호'].astype('int64')
    pred_all_data['년'] = pred_all_data['년'].astype('int64')
    pred_all_data['월'] = pred_all_data['월'].astype('int64')
    pred_all_data['일'] = pred_all_data['일'].astype('int64')
    pred_all_data['시'] = pred_all_data['시'].astype('int64')
    pred_all_data['예측값'] = pred_all_data['예측값'].astype('int64')
    pred_all_data.rename(columns={'대여소번호':'station','예측값':'predicted_parking_bike_count'}, inplace=True)
    pred_all_data['prediction_time'] = pred_all_data[['년','월','일','시']].apply(lambda row: '-'.join(row.values.astype(str)[:3])+" "+row.values.astype(str)[-1]+":00", axis=1)
    pred_all_data = pred_all_data[['station','prediction_time','predicted_parking_bike_count']]
    
    return pred_all_data 


if __name__=="__main__":
    if len(sys.argv)!=2:
        print('You must enter the <url> as a parameter')
        sys.exit()
    url_default = sys.argv[-1]
    if url_default[-1] != "/":
        url_default+="/"
    b_list = pd.DataFrame(get_from_api(url_default+"api/ml-bikeList"))
    w_list = pd.DataFrame(get_from_api(url_default+"api/ml-weather"))
    covid = get_from_api(url_default+"api/ml-covid")
    print("SUCCESS : GET API")
    df = Machine_Learning(w_list, covid, b_list)
    df.to_csv('ml_result.csv', index=False)
    print("Success ML")