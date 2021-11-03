from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from predictor.weather_crawler import updateAllForecasts

def start():
    scheduler = BackgroundScheduler()
    scheduler.add_job(updateAllForecasts)
    scheduler.add_job(updateAllForecasts, 'interval', minutes=30)
    scheduler.start()