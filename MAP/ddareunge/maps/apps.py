import sys
from django.apps import AppConfig


class MapsConfig(AppConfig):
    name = 'maps'

    def ready(self):
        if 'runserver' not in sys.argv:
            return True
            
        from maps import updater
        updater.start()