// 현재위치 기준 범위, 자전거 없는 대여소 제외여부의 필터를 가지고 마커를 필터링하고 주변 대여소 목록을 거리순으로 보여주는 함수
function displayNearbyStations() {
    detailedStationOverlay.setVisible(false);
    detailedPlaceOverlay.setVisible(false);

    updateUrlParam({
        "mode": $("#range_mypos").val() === 'All' ? "": "displayNearbyStations",
        "range_mypos": $("#range_mypos").val() === 'All' ? "" : $("#range_mypos").val(),
        "excludeEmpty_mypos": $('#excludeEmpty_mypos').is(":checked") ? "true" : ""
    });

    let center = map.getCenter();
    let isBeforeFullscreen = !document.getElementById("main_list_wrap").offsetParent;
    
    clearAllLists(); // 근처 대여소 목록, 장소검색결과 목록 초기화
    removeMarkers(searchList);
    clearRoutes();

    let rangeEl = document.getElementById("range_mypos")
    let range = document.getElementById("range_mypos").value
    let excludeEmpty = document.getElementById("excludeEmpty_mypos").checked;

    if (rangeEl.value === "All") { // 기준범위를 "전체"로 선택했을때
        // 모든 대여소 마커 이미지 설정
        for (const [id, stationObj] of Object.entries(stationList)) {
            if (origStation.getId() === id) {
                origStation.setPrevMarkerImg(MARKERIMG_STATION_DEFAULT); // 출발 대여소 마커인 경우, prevMarkerImg을 업데이트.
            }
            else if (destStation.getId() === id) {
                destStation.setPrevMarkerImg(MARKERIMG_STATION_DEFAULT); // 도착 대여소 마커인 경우, prevMarkerImg을 업데이트.
            }
            else {
                stationObj.marker.setImage(MARKERIMG_STATION_DEFAULT);
            }
        }
        stationCluster.hide();
        stationCluster.show(excludeEmpty);
        stationCluster.isEnabled = true;
    }
    else { // 기준범위를 (300m, 500m, 1km)로 선택했을 때
        stationCluster.isEnabled = false;
        stationCluster.hide();

        let bounds = new kakao.maps.LatLngBounds(); // 범위 내 대여소 마커가 한번에 보여지도록 하기 위한 bound
        bounds.extend(center);

        let near_stations = [];

        for (const [id, stationObj] of Object.entries(stationList)) {
            // 현재위치에서 대여소까지의 거리 계산을 위한 polyline 생성
            var polyline = new kakao.maps.Polyline({
                path: [
                    center,
                    stationObj.position
                ]
            });

            if ((!excludeEmpty || (excludeEmpty && stationObj.current_bike > 0)) && polyline.getLength() <= parseInt(rangeEl.value)) {

                near_stations.push({
                    stationObj: stationObj,
                    distance: polyline.getLength()
                });

                bounds.extend(stationObj.position);
            }
            else {
                if (origStation.getId() === id) {
                    origStation.setPrevState(MARKERIMG_STATION_DEFAULT, false); // 출발 대여소 마커인 경우, prevMarkerImg와 prevMap을 업데이트.
                }
                else if (destStation.getId() === id) {
                    destStation.setPrevState(MARKERIMG_STATION_DEFAULT, false); // 도착 대여소 마커인 경우, prevMarkerImg와 prevMap을 업데이트.
                }
                else {
                    stationObj.marker.setVisible(false);
                }
            }
        }
        if (!near_stations.length) {
            alert("해당 조건에 해당하는 대여소가 없습니다!");
            return;
        }

        // 범위 내 대여소 목록 거리에 대해 오름차순으로 정렬
        near_stations.sort(function(a, b) {
            return a.distance - b.distance;
        });

        /* 범위 내 대여소 목록과 마커 출력 */
        let listEl = document.createElement('ul');

        for (let i = 0; i < near_stations.length; ++i) {

            let mouseoverListener = function() {
                listEl.querySelectorAll(".item").forEach((el) => {
                    el.classList.remove('hover');
                });
                itemEl.classList.add('hover');
            }

            let mouseoutListener = function() {
                itemEl.classList.remove('hover');
            }

            let clickListener = function() {
                // 리스트에 선택 효과 부여
                listEl.querySelectorAll(".item").forEach((el) => {
                    if (el.classList.contains('on')) {
                        el.classList.remove('on');
                    }
                });
                itemEl.classList.add('on');
            }

            /* 마커 클릭하면 목록 하이라이트 되도록 이벤트 리스너 설정 */
            if (stationList[near_stations[i].stationObj.id].eventListener._click_highlightList) {
                // 더이상 사용하지 않는 이전 이벤트 리스너 삭제
                kakao.maps.event.removeListener(stationList[near_stations[i].stationObj.id].marker, 'click', stationList[near_stations[i].stationObj.id].eventListener._click_highlightList);
            }
            stationList[near_stations[i].stationObj.id].eventListener._click_highlightList = function() {
                clickListener();
                itemEl.scrollIntoView();
            }
            // 새로운 이벤트 리스너 등록
            kakao.maps.event.addListener(stationList[near_stations[i].stationObj.id].marker, 'click', stationList[near_stations[i].stationObj.id].eventListener._click_highlightList);

            /* 목록 행 */
            let itemEl = document.createElement('li');
            itemEl.className = "item";
            itemEl.addEventListener('mouseover', () => {
                near_stations[i].stationObj.eventListener.mouseover();
                mouseoverListener();
            });
            itemEl.addEventListener('mouseout', () => {
                near_stations[i].stationObj.eventListener.mouseout();
                mouseoutListener();
            });
            itemEl.addEventListener('click', () => {
                near_stations[i].stationObj.eventListener.click();
                clickListener();
            });

            /* 마커 이미지 */
            let markerImgEl = document.createElement('span');
            markerImgEl.className = (i <= 14) ? "markerbg marker_" + (i + 1) : "marker-etc";

            /* 대여소 정보 */
            let infoDivEl = document.createElement('div');
            infoDivEl.className = "info";

            let stationNameEl = document.createElement('h5');
            stationNameEl.className = "station-name";
            stationNameEl.textContent = near_stations[i].stationObj.name;

            let bikeCountEl = document.createElement('span');
            bikeCountEl.className = "bike-count"
            bikeCountEl.textContent = "대여가능: " + near_stations[i].stationObj.current_bike;

            let rackCountEl = document.createElement('span');
            rackCountEl.className = "rack-count"
            rackCountEl.textContent = "거치대 개수: " + near_stations[i].stationObj.total_rack;

            let distanceEl = document.createElement('span');
            distanceEl.className = "distance"
            distanceEl.textContent = Math.round(near_stations[i].distance) + "m";

            infoDivEl.append(stationNameEl, bikeCountEl, rackCountEl, distanceEl);

            /* 버튼 */
            let btnDivEl = document.createElement('div');
            btnDivEl.className = "buttons";

            let setOriginBtnEl = document.createElement('button');
            setOriginBtnEl.className = 'blue';
            setOriginBtnEl.textContent = '출발';
            setOriginBtnEl.addEventListener('click', function() {
                setOrigin(near_stations[i].stationObj.name + " 대여소", near_stations[i].stationObj.position, "");
            });

            let setDestBtnEl = document.createElement('button');
            setDestBtnEl.className = 'red';
            setDestBtnEl.textContent = '도착';
            setDestBtnEl.addEventListener('click', function() {
                setDest(near_stations[i].stationObj.name + " 대여소", near_stations[i].stationObj.position, "");
            });

            let setOriginStationBtnEl = document.createElement('button');
            setOriginStationBtnEl.className = 'blue';
            setOriginStationBtnEl.textContent = '출발대여소';
            setOriginStationBtnEl.addEventListener('click', function() {
                setOriginStation(near_stations[i].stationObj.id);
            });

            let setDestStationBtnEl = document.createElement('button');
            setDestStationBtnEl.className = 'red';
            setDestStationBtnEl.textContent = '도착대여소';
            setDestStationBtnEl.addEventListener('click', function() {
                setDestStation(near_stations[i].stationObj.id);
            });

            btnDivEl.append(setOriginBtnEl, setDestBtnEl, setOriginStationBtnEl, setDestStationBtnEl);

            itemEl.append(markerImgEl, infoDivEl, btnDivEl);

            listEl.append(itemEl);

            /* 마커 이미지 설정 및 지도에 표시*/
            let markerImg = (i <= 14) ? makeNumberMarkerImg(i, "https://i.imgur.com/LuSJJbr.png") : MARKERIMG_STATION_DEFAULT;

            if (origStation.getId() === near_stations[i].stationObj.id) {
                origStation.setPrevState(markerImg, true); // 출발 대여소 마커인 경우, prevMarkerImg와 prevMap을 업데이트.
            }
            else if (destStation.getId() === near_stations[i].stationObj.id) {
                destStation.setPrevState(markerImg, true); // 도착 대여소 마커인 경우, prevMarkerImg와 prevMap을 업데이트.
            }
            else {
                near_stations[i].stationObj.marker.setImage(markerImg);
                near_stations[i].stationObj.marker.setVisible(true);
            }
        }

        let stationListEl = document.createElement('div');
        stationListEl.id = 'stationList';

        let listHeaderEl = document.createElement('div');
        listHeaderEl.className = 'header';
        listHeaderEl.innerHTML = 
        '<span>반경 ' + rangeEl.options[rangeEl.selectedIndex].textContent + ' 내 ' + 
        (excludeEmpty ? '대여가능한 ' : ' ') + '대여소</span>' +
        '<span class="count">' + near_stations.length + '</span>';

        stationListEl.append(listHeaderEl, listEl);
        document.getElementById("main_list_wrap").append(stationListEl);

        document.getElementById("main_list_wrap").style.display = 'block';
        document.getElementById("sidebar").style.height = '100%';
        document.getElementById("main_list_wrap").scrollTop = 0;

        rangeCircle = new kakao.maps.Circle({
            map: map,
            center : center,
            radius: parseInt(rangeEl.value),
            strokeWeight: 3,
            strokeColor: '#39DE2A',
            strokeOpacity: 1,
            strokeStyle: 'shortdashdot',
        });

        if (isBeforeFullscreen) {
            map.setCenter(center);
        }
    }
}