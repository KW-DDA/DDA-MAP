import sys
from django.apps import AppConfig


class PredictorConfig(AppConfig):
    name = 'predictor'

    def ready(self):
        if 'runserver' not in sys.argv:
            return True
            
        from predictor import updater
        updater.start()
