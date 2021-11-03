function initialSetup() {
    if (PREV_STATE.origLat && PREV_STATE.origLng) {
        setOrigin(PREV_STATE.origName, new kakao.maps.LatLng(parseFloat(PREV_STATE.origLat), parseFloat(PREV_STATE.origLng)), PREV_STATE.origId);
    }
    if (PREV_STATE.destLat && PREV_STATE.destLng) {
        setDest(PREV_STATE.destName, new kakao.maps.LatLng(parseFloat(PREV_STATE.destLat), parseFloat(PREV_STATE.destLng)), PREV_STATE.destId)
    }

    if (PREV_STATE.origStationId) {
        setOriginStation(PREV_STATE.origStationId);
    }
    if (PREV_STATE.destStationId) {
        setDestStation(PREV_STATE.destStationId);
    }

    if (PREV_STATE.mode === "displayNearbyStations") {
        displayNearbyStations();
    }
    else if (PREV_STATE.mode === "searchOrigin") {
        keywordSearch_seoul(PREV_STATE.query, 1, $("#origin")[0], false);
    }
    else if (PREV_STATE.mode === "searchDestination") {
        keywordSearch_seoul(PREV_STATE.query, 1, $("#destination")[0], false);
    }
    else if (PREV_STATE.mode === "recommendStation") {
        findBestStation();
    }
    else {
        displayNearbyStations();
    }

    document.getElementById("displayNearbyStations").disabled = false;
    document.getElementById("findBestStation").disabled = false;
}