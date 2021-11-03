#!/usr/bin/env python
# coding: utf-8

import requests
import sys


def delete_to_api(url):
    r = requests.delete(url)
    return r  


if __name__=="__main__":
    if len(sys.argv)!=2:
        print('You must enter the <url> as a parameter')
        sys.exit()
    url_default = sys.argv[-1]
    if url_default[-1] != "/":
        url_default+="/"
    delete_to_api(url_default+"api/ml-result")