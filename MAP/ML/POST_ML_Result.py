#!/usr/bin/env python
# coding: utf-8

import json
import pandas as pd
import requests
import sys


def post_to_api(url, data):
    r = requests.post(url, json=data)
    return r  


if __name__=="__main__":
    if len(sys.argv)!=2:
        print('You must enter the <url> as a parameter')
        sys.exit()
    url_default = sys.argv[-1]
    if url_default[-1] != "/":
        url_default+="/"
    df = pd.read_csv('ml_result.csv')
    resdict = df.to_dict('records')

    post_to_api(url_default+"api/ml-result", resdict)
    print('finish')