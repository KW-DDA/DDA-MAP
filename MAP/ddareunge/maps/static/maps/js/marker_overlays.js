// 대여소 마커를 출발대여소/도착대여소로 지정하는데 사용하는 오버레이
var detailedStationOverlay = new kakao.maps.CustomOverlay({
    clickable: true,
    xAnchor: 0.5,
    yAnchor: 1,
    zIndex: 20001
});
detailedStationOverlay.stationId = null;
detailedStationOverlay.updateContentEl = function(station, wrapClassName) {
    let wrapDiv = document.createElement('div');
    wrapDiv.className = wrapClassName;
    let infoDiv = document.createElement('div');
    infoDiv.className = "info";

    let headDiv = document.createElement('div');
    headDiv.className = "head";
    let titleDiv = document.createElement('div');
    titleDiv.className = "title";
    titleDiv.textContent = station.name;
    let closeDiv = document.createElement('div');
    closeDiv.className = "close";
    closeDiv.addEventListener('click', function() {
        detailedStationOverlay.setVisible(false);
    });
    headDiv.append(titleDiv, closeDiv);

    let bodyDiv = document.createElement('div');
    bodyDiv.className = "body";
    let descDiv = document.createElement('div');
    descDiv.className = "desc";
    descDiv.innerHTML = '<div class="bike-count">대여가능: ' + station.bikeCount + '</div>' +
    '                    <div class="rack-count">거치대 개수: ' + station.rackCount + '</div>';

    let btnDiv = document.createElement('div');
    btnDiv.className = "buttons"

    let btn_setOrigin = document.createElement('button');
    btn_setOrigin.className = "blue";
    btn_setOrigin.textContent = '출발';
    btn_setOrigin.addEventListener('click', function() {
        detailedStationOverlay.setVisible(false);
        setOrigin(station.name + " 대여소", station.position, "");
    });

    let btn_setDest = document.createElement('button');
    btn_setDest.className = "red";
    btn_setDest.textContent = '도착';
    btn_setDest.addEventListener('click', function() {
        detailedStationOverlay.setVisible(false);
        setDest(station.name + " 대여소", station.position, "");
    });

    let btn_setOriginStation = document.createElement('button');
    btn_setOriginStation.className = "blue";
    btn_setOriginStation.textContent = '출발대여소';
    btn_setOriginStation.addEventListener('click', function() {
        detailedStationOverlay.setVisible(false);
        setOriginStation(station.id);
    });

    let btn_setDestStation = document.createElement('button');
    btn_setDestStation.className = "red";
    btn_setDestStation.textContent = '도착대여소';
    btn_setDestStation.addEventListener('click', function() {
        detailedStationOverlay.setVisible(false);
        setDestStation(station.id);
    });

    btnDiv.append(btn_setOrigin, btn_setDest, btn_setOriginStation, btn_setDestStation);
    descDiv.append(btnDiv);
    bodyDiv.append(descDiv);

    infoDiv.append(headDiv, bodyDiv);
    wrapDiv.append(infoDiv);
    
    this.setContent(wrapDiv);
};

var simpleStationOverlay = new kakao.maps.CustomOverlay({
    xAnchor: 0,
    yAnchor: 0.5,
    zIndex: 20000
});
simpleStationOverlay.updateContentEl = function(station) {
    let wrap = document.createElement('div');
    wrap.className = 'station-overlay-simple';
    wrap.innerHTML = '<span class="left"></span><span class="center">' + station.bikeCount + '대 대여가능 | ' + station.name + '</span><span class="right"></span>';

    this.setContent(wrap);
};

// 장소 마커를 출발/도착지로 지정하는데 사용하는 오버레이
var detailedPlaceOverlay = new kakao.maps.CustomOverlay({
    clickable: true,
    xAnchor: 0.5,
    yAnchor: 1,
    zIndex: 20001
});
detailedPlaceOverlay.placeIndex = null;
detailedPlaceOverlay.updateContentEl = function(place) {
    let wrapDiv = document.createElement('div');
    wrapDiv.className = 'place-overlay-detailed';
    let infoDiv = document.createElement('div');
    infoDiv.className = "info";

    let headDiv = document.createElement('div');
    headDiv.className = "head";
    let titleDiv = document.createElement('div');
    titleDiv.className = "title";
    titleDiv.textContent = place.name;
    let closeDiv = document.createElement('div');
    closeDiv.className = "close";
    closeDiv.addEventListener('click', function() {
        detailedPlaceOverlay.setVisible(false);
    });
    headDiv.append(titleDiv, closeDiv);

    // let bodyDiv = document.createElement('div');
    // bodyDiv.className = "body";
    // let descDiv = document.createElement('div');
    // descDiv.className = "desc";
    // descDiv.innerHTML = '<div class="address">' + place.address + '</div>' +
    // '                    <div class="phone">' + place.phone + '</div>';

    // let btnDiv = document.createElement('div');
    // btnDiv.className = "buttons"

    // let btn_setOrigin = document.createElement('button');
    // btn_setOrigin.textContent = '출발';
    // btn_setOrigin.addEventListener('click', function() {
    //     detailedPlaceOverlay.setVisible(false);
    //     setOrigin(place.name, place.position, place.id);
    // });

    // let btn_setDest = document.createElement('button');
    // btn_setDest.textContent = '도착';
    // btn_setDest.addEventListener('click', function() {
    //     detailedPlaceOverlay.setVisible(false);
    //     setDest(place.name, place.position, place.id);
    // });

    // btnDiv.append(btn_setOrigin, btn_setDest);
    // descDiv.append(btnDiv);
    // bodyDiv.append(descDiv);
    
    // infoDiv.append(headDiv, bodyDiv);

    infoDiv.append(headDiv); 
    wrapDiv.append(infoDiv);
    
    this.setContent(wrapDiv);
};

var simplePlaceOverlay = new kakao.maps.CustomOverlay({
    xAnchor: 0,
    yAnchor: 0.5,
    zIndex: 20000
});
simplePlaceOverlay.updateContentEl = function(placeName) {
    let wrap = document.createElement('div');
    wrap.className = 'place-overlay-simple';
    wrap.innerHTML = '<span class="left"></span><span class="center">' + placeName + '</span><span class="right"></span>';

    this.setContent(wrap);
};