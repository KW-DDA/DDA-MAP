// 서울 내의 장소만 검색하는 함수
function keywordSearch_seoul(keyword, page, keywordEl, autoSelect = true) {
    if (!keyword) {
        return;
    }
    
    if (keywordEl.id === "origin") {
        updateUrlParam({"mode": "searchOrigin"});
    }
    else if (keywordEl.id === "destination") {
        updateUrlParam({"mode": "searchDestination"});
    }
    updateUrlParam({"query": keyword});
    
    $.ajax({
        url: "https://dapi.kakao.com/v2/local/search/keyword.json",
        type: 'get',
        timeout: 5000,
        beforeSend: function(xhr) {
            xhr.setRequestHeader('Authorization', 'KakaoAK ' + KAKAO_REST_APIKEY);
        },
        dataType: "json",
        data: {
            query: keyword,
            // category_group_code: ,
            x: overlay_mypos.getPosition().getLng(), // longtude
            y: overlay_mypos.getPosition().getLat(), // latitude
            // radius: ,
            rect: "126.75009135664934,37.70076311835493,127.19353318071484,37.43100318887876", // 서울이 포함되는 사각형 영역
            page: page, // 1~45
            size: 15, // 1~15
            sort: 'accuracy' // 'accuracy' | 'distance'
        }
    }).then((data, textStatus, jqXHR) => {

        detailedStationOverlay.setVisible(false);
        detailedPlaceOverlay.setVisible(false);
        clearAllLists(); // 근처 대여소 목록, 장소검색결과 목록 초기화
        clearMap(); // 전체 대여소 마커, 장소검색결과 마커 숨기기
        stationCluster.isEnabled = false;
        stationCluster.hide();

        if (data.documents.length) {
            let bounds = displayPlaces(data.documents, keywordEl.id, data.meta.pageable_count); // 키워드 검색 결과 목록과 마커 출력
            displayPagination({
                current: page,
                last: Math.ceil(data.meta.pageable_count / 15),
                gotoPage: function(i) {
                    keywordSearch_seoul(keyword, i, keywordEl);
                }
            }); // 키워드 검색 결과 목록의 페이지 번호 출력
            
            document.getElementById("main_list_wrap").style.display = 'block';
            document.getElementById("sidebar").style.height = '100%';
            document.getElementById("main_list_wrap").scrollTop = 0;
            map.setBounds(bounds, 32, 32, 32, 32 + document.getElementById("header").offsetWidth);

            if (autoSelect) {
                $("#placeList > ul li:first button").trigger("click"); // 검색결과 첫번째 장소를 출발/도착 으로 선택
            }                    
        }
        else {
            updateKeyword();
            updateUrlParam({
                "mode": "",
                "query": ""
            });
            alert("검색 결과가 존재하지 않습니다.");
        }

    }, (data, textStatus, jqXHR) => {
        detailedStationOverlay.setVisible(false);
        detailedPlaceOverlay.setVisible(false);
        clearAllLists(); // 근처 대여소 목록, 장소검색결과 목록 초기화
        clearMap(); // 전체 대여소 마커, 장소검색결과 마커 숨기기
        updateKeyword();
        updateUrlParam({
            "mode": "",
            "query": ""
        });
        alert("검색 결과 중 오류가 발생했습니다.");
    });

    function updateKeyword() {
        if (keywordEl.id === "origin") {
            $("#origin").val(keywordEl.value);
            $("#originName").val(keywordEl.value);
            $("#originName").attr('data-id', "");
            marker_origin.setVisible(false);

            updateUrlParam({
                "origLat": "",
                "origLng": "",
                "origName": keywordEl.value,
                "origId": ""
            });
        }
        else if (keywordEl.id === "destination") {
            $("#destination").val(keywordEl.value);
            $("#destinationName").val(keywordEl.value);
            $("#destinationName").attr('data-id', "");
            marker_destination.setVisible(false);

            updateUrlParam({
                "destLat": "",
                "destLng": "",
                "destName": keywordEl.value,
                "destId": ""
            });
        }
    }
}

function getPlaceEventListeners(i, place, placePosition, listEl, itemEl) {
    let mouseoverListener = function() {
        if (detailedPlaceOverlay.placeIndex !== i || !detailedPlaceOverlay.getVisible()) {
            simplePlaceOverlay.updateContentEl(place.place_name);
            simplePlaceOverlay.setPosition(placePosition);
            simplePlaceOverlay.setVisible(true);
        }
        listEl.querySelectorAll(".item").forEach((el) => {
            el.classList.remove('hover');
        });
        itemEl.classList.add('hover');
    }

    let mouseoutListener = function() {
        simplePlaceOverlay.setVisible(false);
        itemEl.classList.remove('hover');
    }

    let clickListener = function() {
        simplePlaceOverlay.setVisible(false);

        detailedPlaceOverlay.placeIndex = i;
        detailedPlaceOverlay.updateContentEl({
            name: place.place_name, 
            position: placePosition, 
            id: place.id, 
            address: place.road_address_name || place.address_name,
            phone: place.phone
        });
        detailedPlaceOverlay.setPosition(placePosition);
        detailedPlaceOverlay.setVisible(true);

        map.setCenter(placePosition);

        // 리스트에 선택 효과 부여
        listEl.querySelectorAll(".item").forEach((el) => {
            if (el.classList.contains('on')) {
                el.classList.remove('on');
                el.querySelector('button').classList.remove('on');
                el.querySelector('button').style.display = 'none';
            }
        });
        itemEl.classList.add('on');
        itemEl.querySelector('button').classList.add('on');
        itemEl.querySelector('button').style.display = '';
    }

    return {
        mouseover: mouseoverListener,
        mouseout: mouseoutListener,
        click: clickListener
    }
}

// 키워드 검색 결과 목록과 마커를 출력하는 함수
function displayPlaces(places, keywordEl_id, pageable_count) {

    let listEl = document.createElement('ul');
    let bounds = new kakao.maps.LatLngBounds();

    searchList = []; // 장소검색결과 마커 목록 초기화

    for (let i = 0; i < places.length; ++i) {

        let placePosition = new kakao.maps.LatLng(places[i].y, places[i].x);
        let marker = makeNumberMarker(i, placePosition); // 장소 검색결과 마커 생성
        let itemEl = getListItem(i, places[i], placePosition, keywordEl_id);
        let eventListner = getPlaceEventListeners(i, places[i], placePosition, listEl, itemEl);

        bounds.extend(placePosition);
        
        kakao.maps.event.addListener(marker, 'mouseover', eventListner.mouseover);
        kakao.maps.event.addListener(marker, 'mouseout', eventListner.mouseout);
        kakao.maps.event.addListener(marker, 'click', function() {
            eventListner.click();
            itemEl.scrollIntoView();
            itemEl.querySelector('button').style.display = '';
            if (keywordEl_id === "origin") {
                setOrigin(places[i].place_name, placePosition, places[i].id);
            }
            else if (keywordEl_id === "destination") {
                setDest(places[i].place_name, placePosition, places[i].id);
            }
        });

        itemEl.addEventListener('mouseover', () => {
            eventListner.mouseover();
            itemEl.querySelector('button').style.display = '';
        });
        itemEl.addEventListener('mouseout', () => {
            eventListner.mouseout();
            if (!itemEl.classList.contains('on')) {
                itemEl.querySelector('button').style.display = 'none';
            }
        });
    
        itemEl.querySelectorAll(".info h5, button").forEach((el) => {
            el.addEventListener('click', eventListner.click);
        });
    
        listEl.appendChild(itemEl);

        searchList.push({marker: marker}); // 검색결과 마커 목록에 생성한 마커 추가
    }

    let placeListEl = document.createElement('div');
    placeListEl.id = 'placeList';

    let listHeaderEl = document.createElement('div');
    listHeaderEl.className = 'header';
    listHeaderEl.innerHTML = 
    '<span>검색된 장소</span><span class="count">' + pageable_count + '</span>'

    placeListEl.append(listHeaderEl, listEl);
    document.getElementById("main_list_wrap").appendChild(placeListEl);

    return bounds; 
}

// 숫자 마커용 이미지 생성 함수 (idx: 0~14)
function makeNumberMarkerImg(idx, src) {
    var imgSrc = src, // 마커 이미지용 스프라이트 이미지 url
        imgSize = new kakao.maps.Size(36, 37), // 마커 이미지의 크기
        imgOptions = {
            spriteSize: new kakao.maps.Size(36, 691), // 스프라이트 이미지의 크기
            spriteOrigin: new kakao.maps.Point(0, (idx * 46) + 10), // 스프라이트 이미지 중 사용할 영역의 좌상단 좌표
            offset: new kakao.maps.Point(13, 37) // 마커 좌표에 일치시킬 이미지 내에서의 좌표
        };

    return new kakao.maps.MarkerImage(imgSrc, imgSize, imgOptions);
}

// 1~15까지의 숫자 마커를 생성해서 반환하는 함수
function makeNumberMarker(idx, position, title) {
    return new kakao.maps.Marker({
        map: map,
        position: position,
        title: title,
        image: makeNumberMarkerImg(idx, "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_number_blue.png")
    });
}

// 장소검색결과 목록의 li element를 생성 후 반환하는 함수
function getListItem(index, place, placePosition, keywordEl_id) {
    let liEl = document.createElement("li"),
        markerImgEl = document.createElement("span"), // 마커 이미지
        infoDivEl = document.createElement("div"), // 이름, 주소, 전화번호를 묶는 div
        nameEl = document.createElement("h5"), // 장소 이름
        addrEl = document.createElement("span"), // 장소 주소
        telEl = document.createElement("span"); // 장소 전화번호

    let btnEl = document.createElement("button"); // 출발/도착 버튼
    btnEl.style.display = "none";

    if (keywordEl_id === "origin") {
        btnEl.innerHTML = "출발";
        btnEl.classList.add('orig');
        btnEl.addEventListener('click', function() {
            setOrigin(place.place_name, placePosition, place.id);
        });
        nameEl.addEventListener('click', function() {
            setOrigin(place.place_name, placePosition, place.id);
        });
    }
    else if (keywordEl_id === "destination") {
        btnEl.innerHTML = "도착";
        btnEl.classList.add('dest');
        btnEl.addEventListener('click', function() {
            setDest(place.place_name, placePosition, place.id);
        });
        nameEl.addEventListener('click', function() {
            setDest(place.place_name, placePosition, place.id);
        });
    }

    markerImgEl.className = "markerbg marker_" + (index + 1); // 마커 이미지(1~15) 설정 위한 className 지정

    nameEl.innerHTML = place.place_name;

    if (place.road_address_name) {
        addrEl.innerHTML = place.road_address_name;
    }
    else {
        addrEl.innerHTML = place.address_name; // 도로명 주소가 없으면 지번 주소를 표시한다.
    }

    telEl.innerHTML = place.phone;

    infoDivEl.appendChild(nameEl);
    infoDivEl.appendChild(addrEl);
    infoDivEl.appendChild(telEl);
    infoDivEl.className = "info";

    liEl.appendChild(markerImgEl);
    liEl.appendChild(infoDivEl);
    liEl.appendChild(btnEl);

    liEl.className = "item";

    return liEl;
}

// 키워드 검색 결과 목록의 페이지 번호를 출력하는 함수
function displayPagination(pagination) {
    let paginationEl = document.createElement("div");
    paginationEl.className = "pagination";

    for (let i = 1; i <= pagination.last; ++i) {
        let el = document.createElement("a");
        el.href = "#";
        el.innerHTML = i;

        if (i === pagination.current) {
            el.className = 'on';
        }
        else {
            el.onclick = function() {
                pagination.gotoPage(i);
            };
        }

        paginationEl.appendChild(el);
    }

    document.getElementById("placeList").appendChild(paginationEl);
}