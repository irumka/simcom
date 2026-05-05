import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// базовые стили проекта
import './styles/base.css';

// подключаем bootstrap и иконки из node_modules
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

// главный компонент с роутингом
import App from './App';

// находим корневой элемент и запускаем приложение
const root = createRoot(document.getElementById('root'));

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);