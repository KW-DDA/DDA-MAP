# Generated by Django 3.1.6 on 2021-10-30 14:08

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='BikeStation',
            fields=[
                ('station_num', models.BigIntegerField(unique=True)),
                ('station_name', models.CharField(max_length=100)),
                ('station_id', models.CharField(max_length=50, primary_key=True, serialize=False)),
                ('latitude', models.DecimalField(decimal_places=17, max_digits=20)),
                ('longitude', models.DecimalField(decimal_places=17, max_digits=20)),
                ('addr_level1', models.CharField(blank=True, max_length=50, null=True)),
                ('addr_level2', models.CharField(blank=True, max_length=50, null=True)),
                ('rack_total_count', models.CharField(max_length=10)),
                ('parking_bike_total_count', models.CharField(max_length=10)),
                ('updated_at', models.DateTimeField()),
            ],
        ),
        migrations.AddConstraint(
            model_name='bikestation',
            constraint=models.UniqueConstraint(fields=('latitude', 'longitude'), name='unique coordinates'),
        ),
    ]
