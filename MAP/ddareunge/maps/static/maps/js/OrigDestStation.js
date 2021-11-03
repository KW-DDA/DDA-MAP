// 출발대여소, 도착대여소에 관한 class
class OrigDestStation {
    constructor() {
        this._stationId = null;
    }

    getId() {
        return this._stationId;
    }
    
    setId(stationId, markerImg) {
        if (!stationId) { 
            return false; 
        }
        this.reset();

        this._prevMarkerImg = stationList[stationId].marker.getImage();
        this._prevVisible = stationList[stationId].marker.getVisible();

        stationList[stationId].marker.setImage(markerImg);
        stationList[stationId].marker.setZIndex(10001);
        stationList[stationId].marker.setVisible(true);
        this._stationId = stationId;

        return true;
    }

    setPrevMarkerImg(markerImg) {
        this._prevMarkerImg = markerImg;
    }
    setPrevVisible(isVisible) {
        this._prevVisible = isVisible;
    }
    setPrevState(markerImg, isVisible) {
        this._prevMarkerImg = markerImg;
        this._prevVisible = isVisible;
    }

    reset() {
        if (stationList[this._stationId]) {
            stationList[this._stationId].marker.setImage(this._prevMarkerImg);
            stationList[this._stationId].marker.setZIndex(10000);
            stationList[this._stationId].marker.setVisible(this._prevVisible);
        }
        this._stationId = null;
    }
}