FROM node:20-slim

WORKDIR /app

# Копируем файлы описания проекта
COPY package.json ./
# Если файла package-lock.json нет в папке, докер просто пропустит эту строку
COPY package-lock.json* ./ 

# Устанавливаем зависимости внутри образа
RUN npm install

# Копируем исходный код
COPY . .

EXPOSE 5173

# Запуск Vite с пробросом хоста
CMD ["npm", "run", "dev", "--", "--host"]