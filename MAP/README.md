# Map
## DB 초기 설정 방법
### db.sqlite3 기준
터미널에서 ddareunge 폴더로 이동한 후 init_db.py 파일 실행시키면 DB를 초기화하고 predictor_area.csv를 DB에 등록
```bash
cd ddareunge
python init_db.py
```

### PostgreSQL 기준
0. pgAdmin에서 db와 user를 ddareunge/ddareunge/settings.py의 DATABASE부분에 정의되어 있는 이름으로 생성
1. 파이썬 가상환경 실행
2. requirements 안에있는 패키지 설치
3. python manage.py makemigrations maps
4. python manage.py makemigrations predictor
5. python manage.py makemigrations
6. python manage.py migrate
7. predictor_area.csv 등록
   - 방법1)
     1. pgAdmin 실행 후 왼쪽 패널에서 ddareunge_db의 predictor_area 테이블 클릭
     2. 상단 Tools -> Import/Export 클릭
     3. Import/Export 스위치 켜고, predictor_area.csv파일 선택하고, header 스위치 켜고, Delimiter를 콤마로 설정 후, OK 버튼 클릭
     4. 왼쪽 패널에서 ddareunge_db의 predictor_area 테이블 우클릭 후 View/Edit Data -> All Rows 클릭하면 데이터 불러와졌는지 확인할 수 있음
   - 방법2)
     1. ddareunge/post_predictor_area.py를 실행
8. python manage.py runserver --noreload


