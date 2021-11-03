import os
import platform


def delete_migration():
    file_list = os.listdir()
    folders = [x for x in file_list if os.path.isdir(x + '\migrations')]
    for folder in folders:
        file_list = list(set(os.listdir(folder + '\migrations')) - set(['__init__.py', '__pycache__']))
        for file in file_list:
            os.system("del {}\migrations\{}".format(folder, file))


def init_db():
    if platform.system() == 'Windows':
        delete_migration()
        os.system('del db.sqlite3')
    else:
        os.system('find . -path "*/migrations/*.py" -not -name "__init__.py" -delete')
        os.system('find . -path "*/migrations/*.pyc"  -delete')
        os.system('rm -rf db.sqlite3')
    os.system('python manage.py makemigrations')
    os.system('python manage.py migrate')
    print("Success Init")
    os.system('python post_predictor_area.py')
    print("Success Import predictor_area.csv")


if __name__ == "__main__":
    init_db()
