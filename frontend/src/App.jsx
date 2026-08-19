import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';

// подключаем стили лейаута
import './styles/base.css';

// страницы
import Home     from './pages/Home';
import Computer from './pages/Computer';
import Helps    from './pages/Helps';
import About    from './pages/About';

// навбар сверху и боковое меню
function Layout({ children }) {

    const navItems = [
        { id: 1, title: 'Главная',       url: '/' },
        { id: 2, title: 'Интерпретатор', url: '/computer' },
        { id: 3, title: 'Справочник',    url: '/helps' },
        { id: 4, title: 'О приложении',  url: '/about' },
    ];

    return (
        <div>
            {/* верхняя панель */}
            <nav className="topbar">
                <div className="topbar-brand">
                    <span className="sim-logo">SIM</span>
                    <span className="com-logo">COM</span>
                    <span className="ms-3 text-muted" style={{ fontSize: '0.9rem' }}>| Эмулятор</span>
                </div>
                <div className="topbar-nav btn-group">
                    {navItems.map(item => (
                        <NavLink
                            key={item.id}
                            to={item.url}
                            end={item.url === '/'}
                            className={({ isActive }) =>
                                'btn ' + (isActive ? 'btn-cyan-active' : 'btn-cyan-outline')
                            }
                        >
                            {item.title}
                        </NavLink>
                    ))}
                </div>
            </nav>

            {/* основной лейаут: сайднав + контент */}
            <div className="app-layout">
                <main className="main-content">
                    {children}
                </main>
            </div>
        </div>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <Layout>
                <Routes>
                    <Route path="/"          element={<Home />} />
                    <Route path="/computer"  element={<Computer />} />
                    {/* /helps/* покрывает все шесть вложенных путей справочника */}
                    <Route path="/helps/*"   element={<Helps />} />
                    <Route path="/about"     element={<About />} />
                </Routes>
            </Layout>
            <Analytics />
        </BrowserRouter>
    );
}
