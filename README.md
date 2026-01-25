Это сайт кинотеатра: расписание сеансов + выбор мест + бронирование билетов.
------------------------------------------------------------
1) Что нужно установить
- Docker Desktop
- Python 3.12+
- Node.js 18+
- Git Bash
------------------------------------------------------------

2) Запуск базы данных (PostgreSQL) через Docker
Откройте терминал в корне проекта и выполните:
  docker compose up -d

База данных будет доступна на:
  host: localhost
  port: 5433
  db:   cinema
  user: cinema
  pass: cinema

------------------------------------------------------------
3) Настройка Backend (Django) — 1 раз
3.1 Создайте файл backend/.env и запишите в него:

# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5433
POSTGRES_DB=cinema
POSTGRES_USER=cinema
POSTGRES_PASSWORD=cinema

# Django
DJANGO_DEBUG=1
DJANGO_SECRET_KEY=dev-secret-key-change-me
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1

# CORS (frontend)
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:3000

3.2 Установите зависимости backend
Перейди в папку backend и активируй виртуальное окружение:
  
  source .venv/Scripts/activate

Установите зависимости:
  pip install -r requirements.txt

3.3 Сделайте миграции (создать таблицы в БД):
  python manage.py migrate

------------------------------------------------------------
4) Наполните базы демо-данными (seed)
Создаст залы, места, фильмы и сеансы.

Запустите seed:
  python manage.py seed --open

------------------------------------------------------------
5) Запустите Backend (Django)
В отдельной консоли открываем папку Backend:
  source .venv/Scripts/activate
  python manage.py runserver

Ссылки:
- API:         http://localhost:8000/api/
- Админка:     http://localhost:8000/admin/

Создать администратора:
  python manage.py createsuperuser

------------------------------------------------------------
6) Настройка и запуск Frontend (React + Vite)
В отдельной консоли открываем папку Frontend:
  
  npm install
  npm run dev

Откройте адрес, который покажет Vite:
  http://localhost:5173/
  
------------------------------------------------------------
7) Проверка работы
- Откройте фронт (например http://localhost:5173/)
- На главной странице должно быть расписание
- Откройте сеанс → выберите места → забронируйте → появится билет (QR код)
