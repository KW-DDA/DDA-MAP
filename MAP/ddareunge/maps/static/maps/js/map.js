/********** 출발 날짜,시간 설정 **************/
// 현재 날짜,시간보다 과거의 날짜,시간을 입력하면, 현재 날짜,시간으로 초기화
$('#departureDateTime').change(() => {
    if (new Date($("#departureDateTime").val()) < new Date()) {
        initDateTime();
    }
});

if ($("#departureDateTime").val()) {
    $("#departureDateTime").trigger("change");
}
else {
    initDateTime();
}
/*********************************************/


/***********************  카카오맵 관련 변수   ***********************/
var POSITION_SEOUL_CENTER = new kakao.maps.LatLng(37.5642135, 127.0016985); // 서울 한가운데 좌표

var MARKERIMG_STATION_DEFAULT = new kakao.maps.MarkerImage("static/maps/image/marker/station_green.png", // 자전거 마커 이미지 (초록)
                                                    new kakao.maps.Size(41, 41),
                                                    {offset: new kakao.maps.Point(20, 40)});
var MARKERIMG_STATION_ORIGIN = new kakao.maps.MarkerImage("static/maps/image/marker/station_blue.png", // 자전거 마커 이미지 (파랑)
                                                    new kakao.maps.Size(41, 41),
                                                    {offset: new kakao.maps.Point(20, 40)});
var MARKERIMG_STATION_DESTINATION = new kakao.maps.MarkerImage("static/maps/image/marker/station_red.png", // 자전거 마커 이미지 (빨강)
                                                    new kakao.maps.Size(41, 41),
                                                    {offset: new kakao.maps.Point(20, 40)});                                                                                                        
var MARKERIMG_ORIGIN = new kakao.maps.MarkerImage("https://t1.daumcdn.net/localimg/localimages/07/2018/pc/flagImg/blue_b.png", // 출발지 마커 이미지
                                                    new kakao.maps.Size(41, 46),
                                                    {offset: new kakao.maps.Point(16, 45)});
var MARKERIMG_DESTINATION = new kakao.maps.MarkerImage("https://t1.daumcdn.net/localimg/localimages/07/2018/pc/flagImg/red_b.png", // 도착지 마커 이미지
                                                    new kakao.maps.Size(41, 46),
                                                    {offset: new kakao.maps.Point(16, 45)});


var stationList = {}; // 모든 대여소 마커, 인포윈도우, 대여량
var searchList = []; // 검색결과 장소 마커

// 대여소 추천 결과 경로 목록 배열
var normalRoutes = [];
var fullWalkRoute = null;

// 대여소 필터 적용시 범위 나타내는 원
var rangeCircle;

// 출발지, 도착지 마커
var marker_origin = new kakao.maps.Marker({
    image: MARKERIMG_ORIGIN,
    zIndex: 10004,
    draggable: true
});
var marker_destination = new kakao.maps.Marker({
    image: MARKERIMG_DESTINATION,
    zIndex: 10004,
    draggable: true
});

// 출발대여소, 도착대여소
var origStation = new OrigDestStation();
var destStation = new OrigDestStation();

// 현재 위치를 표시하는 오버레이
var overlay_mypos = new kakao.maps.CustomOverlay({
    content: '<div><img class="pulse" draggable="false" unselectable="on" src="https://myfirstmap.s3.ap-northeast-2.amazonaws.com/circle.png" alt=""></div>',
    zIndex: 10003
});


// 출발지, 도착지, 출발대여소, 도착대여소 설정하는 함수들
var setOrigin = function(name, position, placeId = "") {
    if (document.getElementById("routeList")) {
        document.getElementById("main_list_wrap").innerHTML = ""; // 대여소 추천 결과 목록 제거
        document.getElementById("main_list_wrap").style.display = 'none';
        document.getElementById("sidebar").style.height = '0';
    }
    clearRoutes();

    marker_origin.setPosition(position);
    marker_origin.setVisible(true);

    document.getElementById("origin").value = name;
    document.getElementById("originName").value = name;
    document.getElementById("originName").setAttribute('data-id', placeId);

    updateUrlParam({
        "origLat": position.getLat(),
        "origLng": position.getLng(),
        "origName": name,
        "origId": placeId
    });
}

var setDest = function(name, position, placeId = "") {
    if (document.getElementById("routeList")) {
        document.getElementById("main_list_wrap").innerHTML = ""; // 대여소 추천 결과 목록 제거
        document.getElementById("main_list_wrap").style.display = 'none';
        document.getElementById("sidebar").style.height = '0';
    }
    clearRoutes();

    marker_destination.setPosition(position);
    marker_destination.setVisible(true);

    document.getElementById("destination").value = name;
    document.getElementById("destinationName").value = name;
    document.getElementById("destinationName").setAttribute('data-id', placeId);

    updateUrlParam({
        "destLat": position.getLat(),
        "destLng": position.getLng(),
        "destName": name,
        "destId": placeId
    });
}

var setOriginStation = function(stationId) {
    if (destStation.getId() === stationId) {
        resetDestStation();
    }
    else {
        if (document.getElementById("routeList")) {
            document.getElementById("main_list_wrap").innerHTML = ""; // 대여소 추천 결과 목록 제거
            document.getElementById("main_list_wrap").style.display = 'none';
            document.getElementById("sidebar").style.height = '0';
        }
        clearRoutes();
    }

    origStation.setId(stationId, MARKERIMG_STATION_ORIGIN);

    document.getElementById("origStation").textContent = stationList[stationId].name;
    document.getElementById("displayOrigin").style.display = '';
    document.getElementById("clearOrigStation").style.display = '';

    updateUrlParam({"origStationId": stationId});
}

var setDestStation = function(stationId) {
    if (origStation.getId() === stationId) {
        resetOriginStation();
    }
    else {
        if (document.getElementById("routeList")) {
            document.getElementById("main_list_wrap").innerHTML = ""; // 대여소 추천 결과 목록 제거
            document.getElementById("main_list_wrap").style.display = 'none';
            document.getElementById("sidebar").style.height = '0';
        }
        clearRoutes();
    }

    destStation.setId(stationId, MARKERIMG_STATION_DESTINATION);

    document.getElementById("destStation").textContent = stationList[stationId].name;
    document.getElementById("displayDest").style.display = '';
    document.getElementById("clearDestStation").style.display = '';

    updateUrlParam({"destStationId": stationId});
}

// 출발지, 도착지, 출발대여소, 도착대여소 설정해제하는 함수들
var resetOrigin = function() {
    if (document.getElementById("routeList")) {
        document.getElementById("main_list_wrap").innerHTML = ""; // 대여소 추천 결과 목록 제거
        document.getElementById("main_list_wrap").style.display = 'none';
        document.getElementById("sidebar").style.height = '0';
    }
    clearRoutes();

    marker_origin.setVisible(false);

    document.getElementById("origin").value = "";
    document.getElementById("originName").value = "";
    document.getElementById("originName").setAttribute('data-id', "");

    updateUrlParam({
        "origLat": "",
        "origLng": "",
        "origName": "",
        "origId": ""
    });
}

var resetDest = function() {
    if (document.getElementById("routeList")) {
        document.getElementById("main_list_wrap").innerHTML = ""; // 대여소 추천 결과 목록 제거
        document.getElementById("main_list_wrap").style.display = 'none';
        document.getElementById("sidebar").style.height = '0';
    }
    clearRoutes();

    marker_destination.setVisible(false);

    document.getElementById("destination").value = "";
    document.getElementById("destinationName").value = "";
    document.getElementById("destinationName").setAttribute('data-id', "");

    updateUrlParam({
        "destLat": "",
        "destLng": "",
        "destName": "",
        "destId": ""
    });
}

var resetOriginStation = function() {
    if (document.getElementById("routeList")) {
        document.getElementById("main_list_wrap").innerHTML = ""; // 대여소 추천 결과 목록 제거
        document.getElementById("main_list_wrap").style.display = 'none';
        document.getElementById("sidebar").style.height = '0';
    }
    clearRoutes();

    origStation.reset();

    document.getElementById("origStation").innerHTML = "";
    document.getElementById("displayOrigin").style.display = 'none';
    document.getElementById("clearOrigStation").style.display = 'none';

    updateUrlParam({"origStationId": ""});
}

var resetDestStation = function() {
    if (document.getElementById("routeList")) {
        document.getElementById("main_list_wrap").innerHTML = ""; // 대여소 추천 결과 목록 제거
        document.getElementById("main_list_wrap").style.display = 'none';
        document.getElementById("sidebar").style.height = '0';
    }
    clearRoutes();

    destStation.reset();

    document.getElementById("destStation").innerHTML = "";
    document.getElementById("displayDest").style.display = "none";
    document.getElementById("clearDestStation").style.display = 'none';

    updateUrlParam({"destStationId": ""});
}


// 지도
var map;
var origMapFunc_setCenter;
var origMapFunc_getCenter;

getCurrentPosition()
.then((position) => {
    if (position.coords) {
        return new kakao.maps.LatLng(position.coords.latitude, position.coords.longitude);
    } else {
        alert('Geolocation is not supported by this browser.');
    }
}, (error) => {
    console.log(error);
    alert("Geolocation 오류 발생!");
})
.then((myPos) => {
    // 지도 초기 셋업 시작
    if (myPos) {
        map = new kakao.maps.Map(document.getElementById('map'), {
            center: myPos,
            level: 4
        });
        overlay_mypos.setPosition(myPos);
        overlay_mypos.setMap(map);
    } 
    else {
        map = new kakao.maps.Map(document.getElementById('map'), {
            center: POSITION_SEOUL_CENTER,
            level: 4
        });
    }

    // hook setCenter, getCenter
    origMapFunc_setCenter = map.setCenter;
    origMapFunc_getCenter = map.getCenter;

    function convertCenterPos(pos, reverse = false) {
        let multiplier = reverse ? -1 : 1;
        let proj = map.getProjection();
        let point = proj.containerPointFromCoords(pos);
        point.x += multiplier * Math.floor(document.getElementById("header").offsetWidth / 2);
        return proj.coordsFromContainerPoint(point);
    }
    map.setCenter = function(pos) {
        if (!document.getElementById("main_list_wrap").offsetParent) {
            origMapFunc_setCenter.apply(this, [pos]);
        }
        else {
            origMapFunc_setCenter.apply(this, [convertCenterPos(pos, true)]);
        }
    }
    map.getCenter = function() {
        let centerPos = origMapFunc_getCenter.apply(this);
        if (!document.getElementById("main_list_wrap").offsetParent) {
            return centerPos;
        }
        else {
            return convertCenterPos(centerPos);
        }
    }

    //map.addControl(new kakao.maps.ZoomControl({folding: true}), kakao.maps.ControlPosition.BOTTOMRIGHT);
    map.setCopyrightPosition(kakao.maps.CopyrightPosition.BOTTOMRIGHT, true);
    map.addOverlayMapTypeId(kakao.maps.MapTypeId.BICYCLE);

    marker_origin.setMap(map);
    marker_origin.setVisible(false);
    marker_destination.setMap(map);
    marker_destination.setVisible(false);

    detailedStationOverlay.setMap(map);
    detailedStationOverlay.setVisible(false);
    simpleStationOverlay.setMap(map);
    simpleStationOverlay.setVisible(false);
    detailedPlaceOverlay.setMap(map);
    detailedPlaceOverlay.setVisible(false);
    simplePlaceOverlay.setMap(map);
    simplePlaceOverlay.setVisible(false);

    /*********************** Event Listeners ********************************/
    document.getElementById("showOrigin").addEventListener('click', () => {
        if (marker_origin.getVisible()) {
            map.setLevel(4);
            map.setCenter(marker_origin.getPosition());
        }
    });
    document.getElementById("showDest").addEventListener('click', () => {
        if (marker_destination.getVisible()) {
            map.setLevel(4);
            map.setCenter(marker_destination.getPosition());
        }
    });

    // 출발지, 도착지 검색창에서 엔터를 눌렀을 때
    $("#origin, #destination").keyup(function(event) {
        if (event.key === 'Enter' || event.keyCode === 13) {
            // document.getElementById("setOriginCurrentLocation").style.display = "none";
            // document.getElementById("setDestCurrentLocation").style.display = "none";
            // 장소검색 객체를 통해 입력된 키워드로 장소검색 요청
            keywordSearch_seoul(event.target.value, 1, event.target);
        }
    });

    // 출발지, 도착지 검색창에서 검색 버튼을 클릭했을 때
    $("#searchOrigin, #searchDest").click(function(event) {
        let inputEl = $(event.target).siblings("input")[0];
        keywordSearch_seoul(inputEl.value, 1, inputEl);
    });

    // 출발지, 도착지 검색창 focus시
    $("#origin").focus(function(event) {
        $(event.target).one('mouseup', function() {
            $(this).select(); // 텍스트 전체선택
        });
        // document.getElementById("setOriginCurrentLocation").style.display = "";
    });
    $("#destination").focus(function(event) {
        $(event.target).one('mouseup', function() {
            $(this).select(); // 텍스트 전체선택
        });
        // document.getElementById("setDestCurrentLocation").style.display = "";
    });

    // 출발지, 도착지 검색창에서 엔터를 입력하거나 검색 버튼을 클릭해서 장소를 검색하지 않는 한, 값이 변경되지 않도록 한다.
    $("#origin").blur(function(event) { 
        if (!event.relatedTarget || event.relatedTarget.id !== "searchOrigin") {
            $(event.target).val($("#originName").val());
        }
        if (!event.relatedTarget || event.relatedTarget.id !== "setOriginCurrentLocation") {
            // document.getElementById("setOriginCurrentLocation").style.display = "none";
        }
    });
    $("#destination").blur(function(event) {
        if (!event.relatedTarget || event.relatedTarget.id !== "searchDest") {
            $(event.target).val($("#destinationName").val());
        }
        if (!event.relatedTarget || event.relatedTarget.id !== "setDestCurrentLocation") {
            // document.getElementById("setDestCurrentLocation").style.display = "none";
        }
    });

    // 출발지, 도착지 검색창 우측의 x 버튼 click
    document.getElementById("clear_orig").addEventListener('click', () => {
        resetOrigin();
    });
    document.getElementById("clear_dest").addEventListener('click', () => {
        resetDest();
    });

    // 출발지, 도착지 검색창 우측의 내 위치 버튼 click
    document.getElementById("setOriginCurrentLocation").addEventListener('click', () => {
        getCurrentAddress().then((data) => {
            setOrigin(data.address, data.position, "");
        }).catch((errMsg) => {
            alert(errMsg);
        });
        // document.getElementById("setOriginCurrentLocation").style.display = "none";
    });
    document.getElementById("setDestCurrentLocation").addEventListener('click', () => {
        getCurrentAddress().then((data) => {
            setDest(data.address, data.position, "");
        }).catch((errMsg) => {
            alert(errMsg);
        });
        // document.getElementById("setDestCurrentLocation").style.display = "none";
    });

    document.getElementById("showCurrentPosition").addEventListener('click', () => {
        updateCurrentPosition().catch(errMsg => alert(errMsg));
    });

    document.getElementById("displayNearbyStations").addEventListener('click', async (event) => {
        event.target.disabled = true;
        await updateStationList();
        displayNearbyStations();
        event.target.disabled = false;
    });

    document.getElementById("showOrigStation").addEventListener('click', () => {
        if (origStation.getId()) {
            map.setLevel(4);
            map.setCenter(stationList[origStation.getId()].position);
        }
    });
    document.getElementById("showDestStation").addEventListener('click', () => {
        if (destStation.getId()) {
            map.setLevel(4);
            map.setCenter(stationList[destStation.getId()].position);
        }
    });

    document.getElementById("reset_datetime").addEventListener('click', () => {
        initDateTime();
    });

    document.getElementById("findBestStation").addEventListener('click', async (event) => {
        
        event.target.disabled = true;
        await findBestStation();
        event.target.disabled = false;
    });

    document.getElementById("clearOrigStation").addEventListener('click', () => {
        resetOriginStation();
    });
    document.getElementById("clearDestStation").addEventListener('click', () => {
        resetDestStation();
    });

    // 출발지, 도착지 마커 dragend 이벤트
    kakao.maps.event.addListener(marker_origin, 'dragend', function() {
        coordToAddress(marker_origin.getPosition()).then((data) => {
            setOrigin(data.address, data.position, "");
        }).catch(errMsg => console.log(errMsg));
    });
    kakao.maps.event.addListener(marker_destination, 'dragend', function() {
        coordToAddress(marker_destination.getPosition()).then((data) => {
            setDest(data.address, data.position, "");
        }).catch(errMsg => console.log(errMsg));
    });

    // 지도 클릭 이벤트
    kakao.maps.event.addListener(map, 'click', function() {
        detailedStationOverlay.setVisible(false);
        detailedPlaceOverlay.setVisible(false);
    });
    document.getElementById("map").addEventListener('mousedown', () => {
        document.activeElement.blur();
    });

    kakao.maps.event.addListener(map, 'zoom_start', function() {
        if (stationCluster.isEnabled) {
            detailedStationOverlay.setVisible(false);
            stationCluster.hide();
        }
    });

    kakao.maps.event.addListener(map, 'zoom_changed', function() {
        if (stationCluster.isEnabled) {
            stationCluster.show();
        }
    });

    /**********************************************************************/
    updateStationList().then(() => {
        initialSetup();
    });
});



/************************************************************************/
function updateUrlParam(params) {
    if (history.pushState) {
        let searchParams = new URLSearchParams(window.location.search);
        for (let key in params) {
            params[key] ? searchParams.set(key, params[key]) : searchParams.delete(key);
        }
        let newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + (searchParams.toString() ? '?' : '') + searchParams.toString();
        window.history.pushState({path: newUrl}, '', newUrl);
    }
}

function initDateTime() { // 출발 날짜,시간을 현재로 설정
    let today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
    $("#departureDateTime").attr("min", today.toISOString().substring(0, 16));
    $("#departureDateTime").val(today.toISOString().substring(0, 16));
}


function coordToAddress(position) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: "https://dapi.kakao.com/v2/local/geo/coord2address.json",
            type: 'get',
            timeout: 5000,
            beforeSend: function(xhr) {
                xhr.setRequestHeader('Authorization', 'KakaoAK ' + KAKAO_REST_APIKEY);
            },
            dataType: "json",
            data: {
                x: position.getLng(), // longitude
                y: position.getLat(), // latitude
            }
        }).then((data, textStatus, jqXHR) => {
            if (data.meta.total_count) {
                let addr_name = !!data.documents[0].road_address ? data.documents[0].road_address.address_name : data.documents[0].address.address_name;
                resolve({address: addr_name, position: position});
            } 
            else {
                reject("현위치 좌표 검색 결과가 존재하지 않습니다.");
            }
        }, (data, textStatus, jqXHR) => {
            reject("현위치 좌표 검색 결과 중 오류가 발생했습니다.");
        });
    });
}

function getCurrentPosition() {
    if (navigator.geolocation) {
        return new Promise(
            (resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject)
        );
    } else {
        return new Promise(
            resolve => resolve({})
        );
    }
}

function getCurrentAddress() {
    return updateCurrentPosition().then((mypos) => {
        return coordToAddress(mypos);
    });
}

function updateCurrentPosition() {
    return new Promise((resolve, reject) => {
        getCurrentPosition().then((position) => {
            if (position.coords) {
                let mypos = new kakao.maps.LatLng(position.coords.latitude, position.coords.longitude);
                overlay_mypos.setPosition(mypos);
                overlay_mypos.setMap(map);
                map.setLevel(4);
                map.setCenter(mypos);
                resolve(mypos);
            }
            else {
                overlay_mypos.setMap(null);
                reject('Geolocation is not supported by this browser.');
            }
        }).catch((error) => {
            overlay_mypos.setMap(null);
            console.log(error);
            reject("Geolocation 오류");
        })
    });
}

/**********************************************************************************/

// 선택된 출발지와 목적지를 초기화하는 함수
function resetOrigDest() {
    $("#origin").val("");
    $("#originName").val("");
    $("#originName").attr('data-id', "");
    $("#destination").val("");
    $("#destinationName").val("");
    $("#destinationName").attr('data-id', "");
    $("#origStation").html("");
    $("#destStation").html("");
    $("#clearOrigStation").hide();
    $("#clearDestStation").hide();

    clearAllLists();
    origStation.reset();
    destStation.reset();
    clearMap();
    initDateTime();
    marker_origin.setVisible(false);
    marker_destination.setVisible(false);

    clearURLSearchParams();
}

function clearURLSearchParams() {
    if (history.pushState) {
        let newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.pushState({path: newUrl}, '', newUrl);
    }
}

// 범위 내 대여소 목록과 장소검색목록 초기화 하는 함수
function clearAllLists() {
    document.getElementById("main_list_wrap").style.display = 'none';
    document.getElementById("sidebar").style.height = '0';
    document.getElementById("main_list_wrap").innerHTML = ""; // 장소검색결과 목록 제거

    // 범위 나타내는 원 제거
    rangeCircle && rangeCircle.setMap(null);
}

// 리스트의 모든 마커를 지도에서 지우는 함수
function removeMarkers(list) {
    for (var i = 0; i < list.length; ++i) {
        list[i].marker.setMap(null);
    }
}

function hideAllStationMarkers() {
    for (const [id, stationObj] of Object.entries(stationList)) {
        if (origStation.getId() !== id && destStation.getId() !== id) {
                stationObj.marker.setVisible(false);
        }
    }
}

// 모든 마커(클러스터 포함)을 지도에서 숨기는 함수
function clearMap() {
    stationCluster.isEnabled = false;
    stationCluster.hide();
    hideAllStationMarkers();

    removeMarkers(searchList);

    clearRoutes();
}

// 경로를 지도에서 지우는 함수
function clearRoutes(removeObj = true) {
    if (normalRoutes) {
        for (let i = 0; i < normalRoutes.length; ++i) {
            if (normalRoutes[i].polyline) {
                normalRoutes[i].polyline.walk_start.setMap(null);
                normalRoutes[i].polyline.walk_end.setMap(null);
                normalRoutes[i].polyline.bike.setMap(null);
            }

            if (origStation.getId() === normalRoutes[i].departure.stationObj.id) {
                origStation.setPrevVisible(false); // 출발 대여소 마커인 경우, prevVisible을 업데이트.
            }
            else {
                normalRoutes[i].departure.stationObj.marker.setVisible(false);
            }
            if (destStation.getId() === normalRoutes[i].arrival.stationObj.id) {
                destStation.setPrevVisible(false); // 도착 대여소 마커인 경우, prevVisible을 업데이트.
            }
            else {
                normalRoutes[i].arrival.stationObj.marker.setVisible(false);
            }
        }
        if (removeObj) {
            normalRoutes = [];
        }
    }
    if (fullWalkRoute) {
        if (fullWalkRoute.polyline) {
            fullWalkRoute.polyline.setMap(null);
        }
        if (removeObj) {
            fullWalkRoute = null;
        }
    }
}
