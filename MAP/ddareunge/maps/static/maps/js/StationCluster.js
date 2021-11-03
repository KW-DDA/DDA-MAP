var stationCluster = {
    index: {
        all: new Supercluster({
            radius: 60
        }),
        notEmpty: new Supercluster({
            radius: 60
        })
    },

    list: {
        all: {},
        notEmpty: {}
    },

    isEnabled: false,
    _isExcludeEmpty: false,

    show: function(isExcludeEmpty = this._isExcludeEmpty) {
        this._isExcludeEmpty = isExcludeEmpty;

        let level = map.getLevel();
        let clusterList = this._isExcludeEmpty ? this.list.notEmpty : this.list.all;
        this._setupCluster(level, clusterList);

        for (cluster of clusterList[level]) {
            cluster.setVisible(true);
        }

        for (const [id, station] of Object.entries(stationList)) {
            let visibleLevels = this._isExcludeEmpty ? station.visibleLevels.notEmpty : station.visibleLevels.all;
            if (origStation.getId() === id) {
                origStation.setPrevVisible(visibleLevels[level]);
            }
            else if (destStation.getId() === id) {
                destStation.setPrevVisible(visibleLevels[level]);
            }
            else {
                station.marker.setVisible(visibleLevels[level]);
            }
        }
    },

    hide: function() {
        let level = map.getLevel();
        let clusterList = this._isExcludeEmpty ? this.list.notEmpty : this.list.all;

        if (clusterList[level] !== undefined) {
            for (cluster of clusterList[level]) {
                cluster.setVisible(false);
            }
        }
    },

    _setupCluster: function(level, clusterList) {
        if (clusterList[level] !== undefined) {
            return;
        }
        clusterList[level] = [];

        if (level <= 3) {
            for (const [id, station] of Object.entries(stationList)) {
                let visibleLevels = this._isExcludeEmpty ? stationList[id].visibleLevels.notEmpty : stationList[id].visibleLevels.all;
                visibleLevels[level] = !this._isExcludeEmpty || station.current_bike > 0;
            }
        }
        else {
            let index = this._isExcludeEmpty ? this.index.notEmpty : this.index.all;
            let clusters = index.getClusters([-180, -85, 180, 85], 19 - level);

            for (let i = 0; i < clusters.length; ++i) {
                if (clusters[i].type) { // 클러스터 마커인 경우
                    let leaves = index.getLeaves(clusters[i].id, Infinity);

                    let bound = new kakao.maps.LatLngBounds();
                    for (let i = 0; i < leaves.length; ++i) {
                        bound.extend(new kakao.maps.LatLng(leaves[i].geometry.coordinates[1], leaves[i].geometry.coordinates[0]));
                    }
                    
                    let wrapDiv = document.createElement('div');
                    
                    wrapDiv.draggable = false;
                    wrapDiv.textContent = leaves.length;

                    if (leaves.length < 10) {
                        wrapDiv.className = 'station-cluster size1';
                    }
                    else if (leaves.length < 100) {
                        wrapDiv.className = 'station-cluster size2';
                    }
                    else if (leaves.length < 1000) {
                        wrapDiv.className = 'station-cluster size3';
                    }
                    else {
                        wrapDiv.className = 'station-cluster size4';
                    }
                    
                    wrapDiv.addEventListener('mousedown', (event) => {
                        wrapDiv.style.cursor = "grabbing";

                        if (event.button === 0) {
                            wrapDiv.addEventListener('mousemove', mousemoveListener, {once: true});
                            wrapDiv.addEventListener('mouseup', mouseupListener, {once: true});
                        }
                    });

                    wrapDiv.addEventListener('mouseup', () => {
                        wrapDiv.style.cursor = "pointer";
                    });
                    
                    function mousemoveListener() {
                        wrapDiv.removeEventListener('mouseup', mouseupListener);
                    }
                    
                    function mouseupListener() {
                        wrapDiv.removeEventListener('mousemove', mousemoveListener);
                        map.setBounds(bound, 100, 100, 100, 100);
                    }
                    
                    let overlay = new kakao.maps.CustomOverlay({
                        map: map,
                        zIndex: 10002,
                        clickable: false,
                        position: new kakao.maps.LatLng(clusters[i].geometry.coordinates[1], clusters[i].geometry.coordinates[0])
                    });
                    overlay.setVisible(false);
                    overlay.setContent(wrapDiv);
                    
                    clusterList[level].push(overlay);
                }
                else { // 단일 대여소 마커인 경우
                    let visibleLevels = this._isExcludeEmpty ? stationList[clusters[i].stationId].visibleLevels.notEmpty : stationList[clusters[i].stationId].visibleLevels.all;
                    visibleLevels[level] = true;
                }
            }
        }
    }
}