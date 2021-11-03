function getStraightLineDistance(pos1, pos2) {
    let polyline = new kakao.maps.Polyline({path: [pos1, pos2]});
    return polyline.getLength();
}

function getNearStations(basePos, withinDistance, isRentableOnly, predictedBikes) {
    let nearStations = [];
    if (predictedBikes) {
        for (const [id, stationObj] of Object.entries(stationList)) {
            let distance = getStraightLineDistance(basePos, stationObj.position);
            if (predictedBikes[id] && predictedBikes[id] > 0 && distance <= withinDistance) {
                nearStations.push({
                    stationObj: stationObj,
                    predicted: predictedBikes[id],
                    distance: distance
                });
            }
        }
    } else {
        for (const stationObj of Object.values(stationList)) {
            let distance = getStraightLineDistance(basePos, stationObj.position);
            if (!isRentableOnly || (stationObj.current_bike > 0 && distance <= withinDistance)) {
                nearStations.push({
                    stationObj: stationObj,
                    distance: distance
                });
            }
        }
    }
    return nearStations;
}

function getOrigDestStationList(orig_dest_pos, orig_dest_stationId, withinDistance, isRentableOnly, predictedStationList) {
    if (orig_dest_stationId) {
        return [{
            stationObj: stationList[orig_dest_stationId],
            predicted: predictedStationList ? predictedStationList[orig_dest_stationId] : null,
            distance: getStraightLineDistance(orig_dest_pos, stationList[orig_dest_stationId].position)
        }];
    } else {
        return getNearStations(orig_dest_pos, withinDistance, isRentableOnly, predictedStationList);
    }
}

// TODO 서버에서 자전거 수 예측 데이터 받아오기
function getPredictedStationList() {
    return axios({
        method: 'get',
        url: '/api/ml-result',
        params: {
            time: $("#departureDateTime").val().split(':')[0]
        }
    })
        .then((response) => {
            let predictedStationList = {};
            for (const data of response.data) {
                predictedStationList[data.station.station_id] = data.predicted_parking_bike_count;
            }
            return predictedStationList
        }, (err) => {
            return null;
        });
}

// 대여소를 추천버튼을 눌렀을 때 호출되는 함수
async function findBestStation() {
    if (!marker_origin.getVisible()) {
        return alert("출발지를 설정해주세요.");
    } else if (!marker_destination.getVisible()) {
        return alert("도착지를 설정해주세요.");
    }

    updateUrlParam({
        "mode": "recommendStation",
        "depDateTime": $("#departureDateTime").val()
    });

    await updateStationList();

    let predictedStationList;
    if (new Date() < new Date($("#departureDateTime").val())) {
        predictedStationList = await getPredictedStationList();
    } else {
        initDateTime();
    }

    detailedStationOverlay.setVisible(false);
    detailedPlaceOverlay.setVisible(false);
    clearAllLists();
    clearMap();

    const orig_pos = marker_origin.getPosition();
    const dest_pos = marker_destination.getPosition();

    let origStationList = getOrigDestStationList(orig_pos, origStation.getId(), 1500, true, predictedStationList);
    let destStationList = getOrigDestStationList(dest_pos, destStation.getId(), 1500, false);

    // 출발지에서 직선거리로 1.5km이내에 최소 1개 이상의 대여가능한 대여소, 도착지에서 직선거리로 1.5km이내에 최소 1개이상의 대여소가 있는 경우
    if (origStationList.length && destStationList.length) {

        /* 출발지, 도착지 근처의 대여소 정보를 직선거리순으로 정렬 후 상위 4개 대여소 정보만 남긴다. */
        origStationList.sort(function (a, b) {
            return a.distance - b.distance;
        });
        destStationList.sort(function (a, b) {
            return a.distance - b.distance;
        });
        origStationList = origStationList.slice(0, 4);
        destStationList = destStationList.slice(0, 4);

        /*
            경로정보(출발지=>출발지근처의 대여소들, 도착지 근처의 대여소들=>도착지)를 카카오맵 비공식API를 통해 가져온 후,
            origStationList, destStationList의 각 element의 walkRoute에 경로정보를 저장한 후,
            경로 소요시간이 적은 순서대로 origStationList, destStationList을 정렬한다.
        */
        return Promise.all([
            getWalkset(
                origStationList,
                {name: $("#originName").val(), id: $("#originName").attr('data-id')},
                orig_pos.toCoords(),
                "START"
            ),
            getWalkset(
                destStationList,
                {name: $("#destinationName").val(), id: $("#destinationName").attr('data-id')},
                dest_pos.toCoords(),
                "END"
            )
        ])
        .then(() => {

            let departure_stations = [origStationList[0]]; // 출발지에서 도보로 가장 가까운 대여소
            let arrival_stations = destStationList.slice(0, 2); // 도착지까지 도보로 가까운 상위 2개 대여소

            /* 출발지에서 도보로 가장 가까운 대여소 보다 도보 이동시간이 약간 더(+3분 이내) 긴 대여소 중에 대여가능 대수가 가장 많은 대여소를 departure_stations에 추가. */
            let temp = origStationList.slice(1).filter((station) => {
                return station.walkRoute.directions[1].time - departure_stations[0].walkRoute.directions[1].time <= 180;
            });
            if (temp.length) {
                departure_stations.push(temp.reduce((prev, current) => {
                    return prev.stationObj.current_bike > current.stationObj.current_bike ? prev : current;
                }));
            }

            normalRoutes = []; // 출발지에서 도착지까지 일반적인 경로(자전거를 타는 경로)
            let requests_bike = []; // 일반 경로에서 자전거경로 요청을 위한 jquery ajax들

            for (let i = 0; i < departure_stations.length; ++i) {
                let sCoord = departure_stations[i].stationObj.position.toCoords();

                for (let j = 0; j < arrival_stations.length; ++j) {
                    let eCoord = arrival_stations[j].stationObj.position.toCoords();

                    // 출발대여소와 도착대여소가 같은 경로는 제외한다.
                    if (departure_stations[i].stationObj.id === arrival_stations[j].stationObj.id) {
                        continue;
                    }

                    normalRoutes.push({
                        departure: departure_stations[i],
                        arrival: arrival_stations[j]
                    });

                    requests_bike.push(getKakaomapAjax("https://map.kakao.com/route/bikeset.json", {
                        sName: departure_stations[i].stationObj.name + " 대여소",
                        sX: sCoord.getX(),
                        sY: sCoord.getY(),
                        eName: arrival_stations[j].stationObj.name + " 대여소",
                        eX: eCoord.getX(),
                        eY: eCoord.getY(),
                        ids: ","
                    }));
                }
            }

            let request_fullWalk = getKakaomapAjax("https://map.kakao.com/route/walkset.json", {
                sName: $("#originName").val(),
                sX: orig_pos.toCoords().getX(),
                sY: orig_pos.toCoords().getY(),
                eName: $("#destinationName").val(),
                eX: dest_pos.toCoords().getX(),
                eY: dest_pos.toCoords().getY(),
                ids: $("#originName").attr('data-id') + "," + $("#destinationName").attr('data-id')
            });

            return Promise.all([request_fullWalk, requests_bike].flat());
        })
        .then((datas) => {

            fullWalkRoute = { // 출발지에서 도착지로 도보로만 가는 경로
                walkRoute: datas[0]
            }

            for (let i = 0; i < normalRoutes.length; ++i) {
                normalRoutes[i].bikeRoute = datas[i + 1];
            }

            let fastestNormalRouteTime; // 일반 경로 중 가장 빠른 경로의 소요시간

            if (normalRoutes.length) {
                function getTotalTime(normalRoute) {
                    return normalRoute.departure.walkRoute.directions[1].time +
                        normalRoute.arrival.walkRoute.directions[1].time +
                        normalRoute.bikeRoute.directions[1].time;
                }

                fastestNormalRouteTime = getTotalTime(normalRoutes.reduce((prev, current) => {
                    return getTotalTime(prev) < getTotalTime(current) ? prev : current;
                }));
            }


            let listEl = document.createElement('ul');
            let routeListEl = document.createElement('div');
            routeListEl.id = 'routeList';

            // 자전거를 타는 경로가 도보로만 가는 경로보다 빠른 경우
            if (fastestNormalRouteTime && fastestNormalRouteTime < fullWalkRoute.walkRoute.directions[1].time) {

                function makeRouteListItems(RM_sWalk, RM_Bike, RM_fWalk) {
                    // 대여소 추천 버튼 아래에 있는 일반경로 목록 채우기
                    for (const normalRoute of normalRoutes) {

                        let totalTime = normalRoute.departure.walkRoute.directions[RM_sWalk].time +
                            normalRoute.arrival.walkRoute.directions[RM_fWalk].time +
                            normalRoute.bikeRoute.directions[RM_Bike].time;

                        if (totalTime >= fullWalkRoute.walkRoute.directions[1].time) {
                            continue;
                        }

                        let bike_time = (Math.round(normalRoute.bikeRoute.directions[RM_Bike].time / 60) || 1);
                        let bike_cost;
                        if (bike_time <= 60) {
                            bike_cost = "1시간권 (1000원)";
                        } else if (bike_time <= 80) {
                            bike_cost = "1시간권 + 추가요금 (" + String(1000 + 200 * Math.ceil((bike_time % 60) / 5)) + "원)";
                        } else if (bike_time <= 120) {
                            bike_cost = "2시간권 (2000원)";
                        } else {
                            bike_cost = "2시간권 + 추가요금" + String(2000 + 200 * Math.ceil((bike_time % 60) / 5)) + "원)";
                        }

                        let totalLength = normalRoute.departure.walkRoute.directions[RM_sWalk].length +
                            normalRoute.arrival.walkRoute.directions[RM_fWalk].length +
                            normalRoute.bikeRoute.directions[RM_Bike].length;

                        let departureBikeCountText = predictedStationList ? " (예상 대여가능: " + normalRoute.departure.predicted + ")" : " (대여가능: "  + normalRoute.departure.stationObj.current_bike + ")";
                        
                        let itemEl = document.createElement('li');
                        itemEl.className = 'item';

                        itemEl.innerHTML = 
                        '<div class="info-wrap">' +
                        '   <span class="text-totaltime">' + (Math.round(totalTime / 60) || 1) + "분" + '</span>' +
                        '   <span class="img-bike"></span>' +
                        '   <span class="text-biketime">' + bike_time + "분" + '</span>' +
                        '   <span class="text-distance">' + (totalLength >= 1000 ? Math.round(totalLength / 100) / 10 + "km" : totalLength + "m") + '</span>' +
                        '</div>' +
                        '<div class="station-wrap">' +
                        '   <span class="marker-orig"></span>' +
                        '   <span class="text-orig">' + normalRoute.departure.stationObj.name + departureBikeCountText + '</span>' +
                        '</div>' +
                        '<div class="station-wrap">' +
                        '   <span class="marker-dest"></span>' + 
                        '   <span class="text-dest">' + normalRoute.arrival.stationObj.name + '</span>' +
                        '</div>' +
                        '<div class="station-wrap">' +
                        '   <span class="img-ticket"></span>' + 
                        '   <span class="text-ticket">' + bike_cost + '</span>' +
                        '</div>';

                        // 지도에 경로를 표시하기 위한 polyline 생성
                        normalRoute.polyline = {
                            walk_start: makePolyline(normalRoute.departure.walkRoute.directions[RM_sWalk].sections[0].guideList,
                                marker_origin.getPosition(),
                                normalRoute.departure.stationObj.position, {
                                    strokeWeight: 7,
                                    strokeColor: "#4C4C4C",
                                    strokeOpacity: 1,
                                    strokeStyle: 'solid'
                                }
                            ),
                            walk_end: makePolyline(normalRoute.arrival.walkRoute.directions[RM_fWalk].sections[0].guideList,
                                normalRoute.arrival.stationObj.position,
                                marker_destination.getPosition(), {
                                    strokeWeight: 7,
                                    strokeColor: "#4C4C4C",
                                    strokeOpacity: 1,
                                    strokeStyle: 'solid'
                                }
                            ),
                            bike: makePolyline(normalRoute.bikeRoute.directions[RM_Bike].sections[0].guideList,
                                normalRoute.departure.stationObj.position,
                                normalRoute.arrival.stationObj.position, {
                                    strokeWeight: 8,
                                    strokeColor: "#3CC344",
                                    strokeOpacity: 1,
                                    strokeStyle: 'solid'
                                }
                            )
                        };

                        // UI 관련 이벤트 리스너
                        itemEl.addEventListener('mouseover', () => {
                            listEl.querySelectorAll(".item").forEach((el) => {
                                el.classList.remove('hover');
                            });
                            itemEl.classList.add('hover');
                        });
                        itemEl.addEventListener('mouseout', () => {
                            itemEl.classList.remove('hover');
                        });

                        // 목록의 항목 클릭 시 해당하는 경로가 지도에 표시되도록 event listener 설정
                        itemEl.addEventListener('click', () => {

                            // 현재 지도에 표시된 경로의 polyline과 출발/도착 대여소 marker 숨기기
                            for (let i = 0; i < normalRoutes.length; ++i) {

                                if (origStation.getId() === normalRoutes[i].departure.stationObj.id) {
                                    origStation.setPrevVisible(false); // 출발 대여소 마커인 경우, prevVisible을 업데이트.
                                } else {
                                    normalRoutes[i].departure.stationObj.marker.setVisible(false);
                                }

                                if (destStation.getId() === normalRoutes[i].arrival.stationObj.id) {
                                    destStation.setPrevVisible(false); // 도착 대여소 마커인 경우, prevVisible을 업데이트.
                                } else {
                                    normalRoutes[i].arrival.stationObj.marker.setVisible(false);
                                }

                                if (normalRoutes[i].polyline) {
                                    normalRoutes[i].polyline.walk_start.setMap(null);
                                    normalRoutes[i].polyline.walk_end.setMap(null);
                                    normalRoutes[i].polyline.bike.setMap(null);
                                }
                            }

                            /* 선택된 경로의 출발/도착 대여소 marker와 경로 polyline을 지도에 표시 */
                            if (origStation.getId() === normalRoute.departure.stationObj.id) {
                                origStation.setPrevState(MARKERIMG_STATION_DEFAULT, map);
                            } else {
                                normalRoute.departure.stationObj.marker.setImage(MARKERIMG_STATION_ORIGIN);
                                normalRoute.departure.stationObj.marker.setVisible(true);
                            }

                            if (destStation.getId() === normalRoute.arrival.stationObj.id) {
                                destStation.setPrevState(MARKERIMG_STATION_DEFAULT, map);
                            } else {
                                normalRoute.arrival.stationObj.marker.setImage(MARKERIMG_STATION_DESTINATION);
                                normalRoute.arrival.stationObj.marker.setVisible(true);
                            }

                            normalRoute.polyline.walk_start.setMap(map);
                            normalRoute.polyline.walk_end.setMap(map);
                            normalRoute.polyline.bike.setMap(map);

                            /* 경로가 한눈에 보이도록 지도 bound 설정 */
                            let bounds = new kakao.maps.LatLngBounds();

                            let departure_walkRoute_bound = normalRoute.departure.walkRoute.directions[RM_sWalk].bound;
                            let arrival_walkRoute_bound = normalRoute.arrival.walkRoute.directions[RM_fWalk].bound;
                            let bikeRoute_bound = normalRoute.bikeRoute.directions[RM_Bike].bound;

                            if (normalRoute.departure.walkRoute.directions[RM_sWalk].resultCode === "OK") {
                                bounds.extend(new kakao.maps.Coords(departure_walkRoute_bound.left, departure_walkRoute_bound.bottom).toLatLng());
                                bounds.extend(new kakao.maps.Coords(departure_walkRoute_bound.right, departure_walkRoute_bound.top).toLatLng());
                            }
                            if (normalRoute.arrival.walkRoute.directions[RM_fWalk].resultCode === "OK") {
                                bounds.extend(new kakao.maps.Coords(arrival_walkRoute_bound.left, arrival_walkRoute_bound.bottom).toLatLng());
                                bounds.extend(new kakao.maps.Coords(arrival_walkRoute_bound.right, arrival_walkRoute_bound.top).toLatLng());
                            }
                            if (normalRoute.bikeRoute.directions[RM_Bike].resultCode === "OK") {
                                bounds.extend(new kakao.maps.Coords(bikeRoute_bound.left, bikeRoute_bound.bottom).toLatLng());
                                bounds.extend(new kakao.maps.Coords(bikeRoute_bound.right, bikeRoute_bound.top).toLatLng());
                            }

                            map.setBounds(bounds, 64, 32, 32, 32 + document.getElementById("header").offsetWidth);

                            // UI 관련 코드
                            listEl.querySelectorAll(".item").forEach((el) => {
                                if (el.classList.contains('on')) {
                                    el.classList.remove('on');
                                }
                            });
                            itemEl.classList.add('on');
                        });

                        listEl.append(itemEl);
                    }
                }

                makeRouteListItems(0, 0, 0);

                // 목록 위에 경로 모드 옵션 설정 관련 element 생성
                let listHeaderEl = document.createElement('div');
                listHeaderEl.className = 'header';

                let titleDivEl = document.createElement('div');
                titleDivEl.className = 'title'

                let titleEl1 = document.createElement('span');
                titleEl1.className = 'when';
                titleEl1.textContent = predictedStationList ?
                new Date($("#departureDateTime").val()).toLocaleDateString("ko-KR", {year: 'numeric', month: 'narrow', day: 'numeric', hour: 'numeric', minute: 'numeric'}) : "지금"

                let titleEl2 = document.createElement('span');
                titleEl2.textContent = "출발시 추천 경로"

                let optionBtnEl = document.createElement('button');
                optionBtnEl.className = "showOption";
                optionBtnEl.textContent = "옵션 ▽";

                titleDivEl.append(titleEl1, titleEl2, optionBtnEl);

                optionBtnEl.addEventListener('click', () => {
                    optionDivEl.style.display = (optionDivEl.style.display === 'none') ? '' : 'none';
                });

                let optionDivEl = document.createElement('div');
                optionDivEl.className = 'options';
                optionDivEl.style.display = 'none';
                optionDivEl.style.position = 'absolute';
                optionDivEl.style.zIndex = '1';
                optionDivEl.style.width = '110px';
                optionDivEl.style.backgroundColor = '#bfee74';

                function getRouteModeDivEl(name, label, options) {
                    let RMDivEl = document.createElement('div');
                    RMDivEl.classList.add('route-mode', name)

                    let RM_label = document.createElement('label');
                    RM_label.setAttribute('for', name);
                    RM_label.textContent = label;

                    let RM_select = document.createElement('select');
                    RM_select.name = name;
                    RM_select.innerHTML =
                        '<option value="0" selected>' + options[0] + '</option>' +
                        '<option value="1">' + options[1] + '</option>' +
                        '<option value="2">' + options[2] + '</option>';

                    RMDivEl.append(RM_label, RM_select);
                    return RMDivEl;
                }

                let RM_sWalkDivEl = getRouteModeDivEl(
                    'startWalk',
                    '출발 도보 경로 ',
                    ['큰길우선', '최단거리', '편안한길']
                );
                let RM_BikeDivEl = getRouteModeDivEl(
                    'bike',
                    '자전거 경로 ',
                    ['자전거 도로우선', '최단거리', '편안한길']
                );
                let RM_fWalkDivEl = getRouteModeDivEl(
                    'finishWalk',
                    '도착 도보 경로 ',
                    ['큰길우선', '최단거리', '편안한길']
                );

                let optionApplyBtnEl = document.createElement('button');
                optionApplyBtnEl.className = "applyOption";
                optionApplyBtnEl.textContent = "적용";

                optionApplyBtnEl.addEventListener('click', () => {
                    $(".options").css("display","none");
                    let RM_sWalk = parseInt(RM_sWalkDivEl.lastChild.value);
                    let RM_Bike = parseInt(RM_BikeDivEl.lastChild.value);
                    let RM_fWalk = parseInt(RM_fWalkDivEl.lastChild.value);

                    listEl.innerHTML = "";
                    detailedStationOverlay.setVisible(false);
                    clearRoutes(false);
                    makeRouteListItems(RM_sWalk, RM_Bike, RM_fWalk);
                    $("#routeList > ul li:first").trigger('click'); // 목록의 첫번째 항목 클릭
                });

                optionDivEl.append(RM_sWalkDivEl, RM_BikeDivEl, RM_fWalkDivEl, optionApplyBtnEl);

                listHeaderEl.append(titleDivEl, optionDivEl);
                routeListEl.append(listHeaderEl, listEl);

            } else { // 출발지에서 도착지로 도보로만 이동하는게 가장 빠를 경우

                let totalTime = fullWalkRoute.walkRoute.directions[1].time
                let totalLength = fullWalkRoute.walkRoute.directions[1].length

                let itemEl = document.createElement('li');
                itemEl.classList.add("item", "on");

                let timeEl = document.createElement('span');
                timeEl.textContent = "도보 소요시간: " + (Math.round(totalTime / 60) || 1) + "분";

                let lengthEl = document.createElement('span');
                lengthEl.textContent = "도보 이동거리: " + (totalLength >= 1000 ? Math.round(totalLength / 100) / 10 + "km" : totalLength + "m");

                itemEl.append(timeEl, lengthEl);

                listEl.append(itemEl);

                routeListEl.append(listEl);

                fullWalkRoute.polyline = makePolyline(fullWalkRoute.walkRoute.directions[1].sections[0].guideList,
                    marker_origin.getPosition(),
                    marker_destination.getPosition(), {
                        strokeWeight: 6,
                        strokeColor: "#4C4C4C",
                        strokeOpacity: 0.8,
                        strokeStyle: 'solid'
                    });

                fullWalkRoute.polyline.setMap(map);

                let bounds = new kakao.maps.LatLngBounds();

                let walkRoute_bound = fullWalkRoute.walkRoute.directions[1].bound;

                bounds.extend(new kakao.maps.Coords(walkRoute_bound.left, walkRoute_bound.bottom).toLatLng());
                bounds.extend(new kakao.maps.Coords(walkRoute_bound.right, walkRoute_bound.top).toLatLng());
                map.setBounds(bounds);
            }
            document.getElementById("main_list_wrap").appendChild(routeListEl);
            document.getElementById("main_list_wrap").style.display = 'block';
            document.getElementById("sidebar").style.height = '100%';

            $("#routeList > ul li:first").trigger('click'); // 목록의 첫번째 항목 클릭
        });
    } else { // 출발지 1KM이내에 대여가능 대여소가 없거나, 도착지 1KM이내에 대여소가 없는 경우

        let bounds = new kakao.maps.LatLngBounds(); // 출발, 도착지가 한번에 보여지도록 하기 위한 bound
        bounds.extend(marker_origin.getPosition());
        bounds.extend(marker_destination.getPosition());
        map.setBounds(bounds);

        updateUrlParam({"mode": ""});

        alert("출발지 1km이내 또는 도착지 1km이내에 대여소가 없습니다!");
    }
}


// kakaomap에 요청할때 사용하는 ajax를 생성하는 함수
function getKakaomapAjax(url, data) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: url,
            timeout: 5000,
            cache: true,
            traditional: true,
            dataType: "jsonp",
            data: data
        }).then((data) => {
            resolve(data);
        }, () => {
            reject("카카오맵 경로탐색 api 오류");
        });
    });
}

// 출발지->대여소, 대여소->도착지 도보경로들을 가져올때 사용하는 함수
function getWalkset(nearStations, placeInfo, placeCoord, direction) {
    let routeRequests = [];

    for (let i = 0; i < nearStations.length; ++i) {

        let stationCoord = nearStations[i].stationObj.position.toCoords();

        let data;
        if (direction === "START") {
            data = {
                sName: placeInfo.name,
                sX: placeCoord.getX(),
                sY: placeCoord.getY(),
                eName: nearStations[i].stationObj.name + " 대여소",
                eX: stationCoord.getX(),
                eY: stationCoord.getY(),
                ids: placeInfo.id + ","
            }
        } else if (direction === "END") {
            data = {
                sName: nearStations[i].stationObj.name + " 대여소",
                sX: stationCoord.getX(),
                sY: stationCoord.getY(),
                eName: placeInfo.name,
                eX: placeCoord.getX(),
                eY: placeCoord.getY(),
                ids: "," + placeInfo.id
            }
        } else {
            reject();
        }

        routeRequests.push(getKakaomapAjax("https://map.kakao.com/route/walkset.json", data));
    }

    return Promise.all(routeRequests).then((datas) => {
        for (let i = 0; i < datas.length; ++i) {
            nearStations[i].walkRoute = datas[i];
        }

        // 도보 소요시간이 적은 순서대로 정렬
        nearStations.sort(function (a, b) {
            return a.walkRoute.directions[1].time - b.walkRoute.directions[1].time; // walkRoute.directions: [BROAD_FIRST, SHORTEST, ACCESSIBLE]
        });
    });
}

// polyline 생성함수
function makePolyline(guideList, sPoint, ePoint, lineOption) {

    let sectionPoints = [];

    sectionPoints.push(sPoint);

    for (let i = 0; i < guideList.length; ++i) {

        if (guideList[i].link && guideList[i].link.points) {
            let points = guideList[i].link.points.split("|").map(function (point) {
                let arr = point.split(",");
                return new kakao.maps.Coords(arr[0], arr[1]).toLatLng();
            });
            sectionPoints.push(...points);
        }
    }

    sectionPoints.push(ePoint);

    let polyline = new kakao.maps.Polyline({
        path: sectionPoints
    });

    polyline.setOptions(lineOption);

    return polyline;
}