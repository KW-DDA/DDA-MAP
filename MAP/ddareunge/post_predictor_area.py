import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "ddareunge.settings")

import django

django.setup()

import pandas as pd
from predictor.models import Area


def predictor_area():
    df = pd.read_csv('predictor_area.csv').to_dict('records')
    df = sorted(df, key=lambda x: (x['id']))
    for data in df:
        Area.objects.create(id=data['id'], name=data['name'],
                            latitude=data['latitude'], longitude=data['longitude'],
                            x_KMA=data['x_KMA'], y_KMA=data['y_KMA'],
                            KMA_UltraSrtFcst_updated_at=data['KMA_UltraSrtFcst_updated_at'],
                            KMA_SrtFcst_updated_at=data['KMA_SrtFcst_updated_at'],
                            VC_MtFcst_updated_at=data['VC_MtFcst_updated_at'],
                            OWM_AirPollution_updated_at=data['OWM_AirPollution_updated_at'])


if __name__ == "__main__":
    predictor_area()
