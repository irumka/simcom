// обёртка для всего справочника: вкладки сверху + контент через outlet

import { NavLink, Outlet } from 'react-router-dom';
import '../styles/helps.css';

// вкладки справочника
const helpsTabs = [
    { id: 'arch',   title: 'Архитектура',      url: '/helps/arch' },
    { id: 'simcom', title: 'Система команд',    url: '/helps/simcom' },
    // сюда потом добавишь новые разделы
];

export default function HelpsLayout() {
    return (
        <div className="helps-vertical-layout">

            {/* горизонтальные вкладки */}
            <div className="helps-tabs-container">
                <div className="helps-tabs">
                    {helpsTabs.map((tab) => (
                        <NavLink
                            key={tab.id}
                            to={tab.url}
                            className={({ isActive }) =>
                                'nav-tab' + (isActive ? ' active' : '')
                            }
                        >
                            {tab.title}
                        </NavLink>
                    ))}
                </div>
            </div>

            {/* основная карточка с контентом */}
            <div className="content-card">
                <div className="cyber-header">
                    <i className="bi bi-journal-code" />
                    {/* заголовок и содержимое вкладки рендерит дочерний роут */}
                    Документация SimCOM
                </div>
                <div className="cyber-body">
                    <Outlet />
                </div>
            </div>

        </div>
    );
}
