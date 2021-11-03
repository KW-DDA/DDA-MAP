from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from maps.station_crawler import updateBikeStationInfo

def start():
    scheduler = BackgroundScheduler()
    scheduler.add_job(updateBikeStationInfo)
    scheduler.add_job(updateBikeStationInfo, 'interval', seconds=30)
    scheduler.start()