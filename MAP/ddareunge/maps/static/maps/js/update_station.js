function updateStationList() {
    
    return new Promise((resolve) => {

        $.ajax({
            url: "http://127.0.0.1:8000/api/bikeList",
            type: 'get',
            data: {
                base_time: updateStationList.base_time
            },
            dataType: "json",
            timeout: 5000,
        }).then((data, textStatus, jqXHR) => {

            if (data.base_time) {
                updateStationList.base_time = data.base_time

                let isAllClusterResetRequired = false;
                
                // 모든 대여소의 마커 생성 및 마커 배열 채우기
                for (const element of data.arr) {

                    let newStationInfo = {
                        name: element['station_name'].substring(element['station_name'].indexOf(".") + 1).trim(),
                        position: new kakao.maps.LatLng(element['latitude'], element['longitude']),
                        id: element['station_id'],
                        bikeCount: element['parking_bike_total_count'],
                        rackCount: element['rack_total_count']
                    }

                    let mouseoverListener = function() {
                        if (detailedStationOverlay.stationId !== newStationInfo.id || !detailedStationOverlay.getVisible()) {
                            simpleStationOverlay.updateContentEl(newStationInfo);
                            simpleStationOverlay.setPosition(newStationInfo.position);
                            simpleStationOverlay.setVisible(true);
                        }
                    }

                    let mouseoutListener = function() {
                        simpleStationOverlay.setVisible(false);
                    }
                    
                    let clickListener = function() {
                        let overlayInfo = !!document.getElementById("stationList") ?
                        {name: 'station-overlay-detailed-head', size: {width: 200, height: 60, padding: 40}} :
                        {name: 'station-overlay-detailed', size: {width: 260, height: 155, padding: 10}};

                        simpleStationOverlay.setVisible(false);

                        detailedStationOverlay.stationId = newStationInfo.id;
                        detailedStationOverlay.updateContentEl(newStationInfo, overlayInfo.name);
                        detailedStationOverlay.setPosition(newStationInfo.position);
                        detailedStationOverlay.setVisible(true);

                        panMapToRevealOverlay(newStationInfo.position, 41, overlayInfo);
                    }

                    let stationObj = stationList[newStationInfo.id];

                    if (stationObj) {
                        if (!stationObj.position.equals(newStationInfo.position)) {
                            stationObj.position = newStationInfo.position;
                            stationObj.marker.setPosition(newStationInfo.position);

                            isAllClusterResetRequired = true;
                        }

                        if (stationObj.current_bike != newStationInfo.bikeCount) {

                            kakao.maps.event.removeListener(stationObj.marker, 'mouseover', stationObj.eventListener.mouseover);
                            kakao.maps.event.removeListener(stationObj.marker, 'click', stationObj.eventListener.click);

                            kakao.maps.event.addListener(stationObj.marker, 'mouseover', mouseoverListener); // 마커에 커서를 갖다대고 땔 때에 대한 이벤트 리스너 등록
                            kakao.maps.event.addListener(stationObj.marker, 'click', clickListener); // 마커를 클릭했을 때 출발/도착 버튼이 나타나도록 이벤트 리스너 등록

                            stationObj.eventListener.mouseover = mouseoverListener;
                            stationObj.eventListener.click = clickListener;
                        }
                    
                        stationObj.name = newStationInfo.name;
                        stationObj.current_bike = newStationInfo.bikeCount;
                        stationObj.total_rack = newStationInfo.rackCount;
                        stationObj._updated_at = data.base_time;
                    }
                    else {
                        stationObj = {
                            marker: new kakao.maps.Marker({
                                map: map,
                                position: newStationInfo.position,
                                zIndex: 10000,
                                clickable: true // 마커를 클릭했을 때 지도의 클릭 이벤트가 발생하지 않도록 설정
                            }),
                            eventListener: {
                                mouseover: mouseoverListener,
                                mouseout: mouseoutListener,
                                click: clickListener
                            },
                            id: newStationInfo.id,
                            name: newStationInfo.name,
                            position: newStationInfo.position,
                            current_bike: newStationInfo.bikeCount,
                            total_rack: newStationInfo.rackCount,
                            visibleLevels: {
                                all: [],
                                notEmpty: []
                            },
                            _updated_at: data.base_time
                        };
                        stationObj.marker.setVisible(false);

                        kakao.maps.event.addListener(stationObj.marker, 'mouseover', mouseoverListener); // 마커에 커서를 갖다대고 땔 때에 대한 이벤트 리스너 등록
                        kakao.maps.event.addListener(stationObj.marker, 'mouseout', mouseoutListener); // 마커에 커서를 갖다대고 땔 때에 대한 이벤트 리스너 등록
                        kakao.maps.event.addListener(stationObj.marker, 'click', clickListener); // 마커를 클릭했을 때 출발/도착 버튼이 나타나도록 이벤트 리스너 등록
                        
                        isAllClusterResetRequired = true;
                    }

                    stationList[newStationInfo.id] = stationObj;
                }

                for (const [id, stationObj] of Object.entries(stationList)) {
                    if (stationObj._updated_at != data.base_time) {
                        stationObj.marker.setMap(null);
                        delete stationList[id];

                        isAllClusterResetRequired = true;
                    }
                }

                // 출발대여소, 도착대여소로 설정했던 대여소가 사라진 경우 예외처리
                if (origStation.getId() && !stationList[origStation.getId()]) {
                    updateUrlParam({"origStationId": ""});
                    document.getElementById("routeList").innerHTML = "";
                    clearRoutes();

                    origStation.reset();
                    document.getElementById("origStation").textContent = "";
                    document.getElementById("displayOrigin").style.display = 'none';
                    document.getElementById("clearOrigStation").style.display = 'none';
                }
                if (destStation.getId() && !stationList[destStation.getId()]) {
                    updateUrlParam({"destStationId": ""});
                    document.getElementById("routeList").innerHTML = "";
                    clearRoutes();

                    destStation.reset();
                    document.getElementById("destStation").textContent = "";
                    document.getElementById("displayDest").style.display = 'none';
                    document.getElementById("clearDestStation").style.display = 'none';
                }

                if (isAllClusterResetRequired) {
                    resetStationCluster(true);
                    resetStationCluster(false);
                } else {
                    resetStationCluster(true);
                }
            }

            resolve();

        }, (jqXHR, textStatus, errorThrown) => {

        });
    });
}

function resetStationCluster(isExcludeEmpty) {

    let clusterList = isExcludeEmpty ? stationCluster.list.notEmpty : stationCluster.list.all;

    // remove old cluster overlays
    for (const [level, _clusterList] of Object.entries(clusterList)) {
        for (const cluster of _clusterList) {
            cluster.setMap(null);
        }
        delete clusterList[level];
    }

    for (const station of Object.values(stationList)) {
        if (isExcludeEmpty) {
            station.visibleLevels.notEmpty = Array(15).fill(false);
        }
        else {
            station.visibleLevels.all = Array(15).fill(false);
        }
    }

    let index = isExcludeEmpty ? stationCluster.index.notEmpty : stationCluster.index.all;

    index.load(Object.values(stationList).filter((station) => {
        return !isExcludeEmpty || station.current_bike > 0;
    }).map(function(station){
        return {
            geometry: {
                coordinates: [station.position.getLng(), station.position.getLat()]
            },
            stationId: station.id
        }
    }));
}

function panMapToRevealOverlay(markerPos, markerImgHeight, overlayInfo) {
    let overlayEl = document.getElementsByClassName(overlayInfo.name)[0];
    let overlayWidth = overlayEl ? overlayEl.offsetWidth : overlayInfo.size.width;
    let overlayHeight = overlayEl ? overlayEl.offsetHeight : overlayInfo.size.height;

    let paddingSize = overlayInfo.size.padding;

    let proj = map.getProjection();
    
    let headerEl = document.getElementById('header');
    let filterWrapEl = document.getElementById('filterWrap');

    let x1 = paddingSize + Math.floor(overlayWidth / 2);
    let x2 = headerEl.offsetWidth + paddingSize + x1;
    let x3 = proj.containerPointFromCoords(map.getBounds().getNorthEast()).x - x1;
    let y1 = filterWrapEl.offsetHeight + paddingSize + overlayHeight + markerImgHeight;
    let y2 = headerEl.offsetHeight + paddingSize + overlayHeight + markerImgHeight;
    let y3 = proj.containerPointFromCoords(map.getBounds().getSouthWest()).y - paddingSize;

    let points = [];

    if (document.getElementById("main_list_wrap").style.display === "none")  {
        if (x1 <= x2 && x2 <= x3 && y1 <= y2 && y2 <= y3) { // 일반적인 브라우저 창 크기
            points.push(new jsts.geom.Coordinate(x1, y3));
            points.push(new jsts.geom.Coordinate(x1, y2));
            points.push(new jsts.geom.Coordinate(x2, y2));
            points.push(new jsts.geom.Coordinate(x2, y1));
            points.push(new jsts.geom.Coordinate(x3, y1));
            points.push(new jsts.geom.Coordinate(x3, y3));
            points.push(new jsts.geom.Coordinate(x1, y3));
        }
        else if (x1 <= x3 && y1 <= y2 && y2 <= y3) { // 브라우저 창 가로 길이만 과도하게 작은 상태
            points.push(new jsts.geom.Coordinate(x1, y3));
            points.push(new jsts.geom.Coordinate(x1, y2));
            points.push(new jsts.geom.Coordinate(x3, y2));
            points.push(new jsts.geom.Coordinate(x3, y3));
            points.push(new jsts.geom.Coordinate(x1, y3));
        }
        else if (x1 <= x2 && x2 <= x3 && y1 <= y3) { // 브라우저 창 세로 길이만 과도하게 작은 상태
            points.push(new jsts.geom.Coordinate(x2, y3));
            points.push(new jsts.geom.Coordinate(x2, y1));
            points.push(new jsts.geom.Coordinate(x3, y1));
            points.push(new jsts.geom.Coordinate(x3, y3));
            points.push(new jsts.geom.Coordinate(x2, y3));
        }
    }
    else {
        if (x2 <= x3 && y1 <= y3) {
            points.push(new jsts.geom.Coordinate(x2, y1));
            points.push(new jsts.geom.Coordinate(x3, y1));
            points.push(new jsts.geom.Coordinate(x3, y3));
            points.push(new jsts.geom.Coordinate(x2, y3));
            points.push(new jsts.geom.Coordinate(x2, y1));
        }
    }

    if (points.length) {
        let geomFactory = new jsts.geom.GeometryFactory();
        let poly = geomFactory.createPolygon(points);

        let markerX = proj.containerPointFromCoords(markerPos).x;
        let markerY = proj.containerPointFromCoords(markerPos).y;
        let markerPoint = geomFactory.createPoint(new jsts.geom.Coordinate(markerX, markerY));

        if (!markerPoint.within(poly) && !markerPoint.touches(poly)) {
            let newPoint = jsts.operation.distance.DistanceOp.nearestPoints(poly, markerPoint)[0];
            map.panBy(markerPoint.getX() - newPoint.getX(), markerPoint.getY() - newPoint.getY());
        }
    }
}