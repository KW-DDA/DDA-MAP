# Machine Learning
## 가상환경에 필요 패키지 설치
ML.py와 POST_ML_Result.py를 돌리려면 가상환경에 model_requirements.txt에 있는 패키지를 설치해야 함
```bash
pip install -r model_requirements.txt
```
## 머신러닝 돌리기(ML.py)
API로부터 b_list, w_list, covid를 얻고 Machine Learning 결과를 ML.py와 같은 위치에 ml_result.csv라는 결과 파일을 생성
```bash
python ML.py <url 주소>

# example
python ML.py http://127.0.0.1:8000
```

## 머신러닝 결과 전송(POST_ML_Result.py)
ML.py의 결과인 ml_result.csv를 POST Method로 서버에 데이터 전송
```bash
python POST_ML_Result.py <url 주소>

# example
python POST_ML_Result.py http://127.0.0.1:8000
```


## 서버의 ML Result 다 지우기
```bash
python DELETE.py <url 주소>

# example
python DELETE.py http://127.0.0.1:8000
```