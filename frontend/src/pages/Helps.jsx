import { NavLink, Routes, Route, Navigate } from 'react-router-dom';

// подключаем общие стили справочника
import '../styles/helps.css';

// все шесть вкладок справочника
import HelpsArch      from './HelpsArch';
import HelpsRam       from './HelpsRam';
import HelpsProc      from './HelpsProc';
import HelpsRegisters from './HelpsRegisters';
import HelpsLang      from './HelpsSimcom';
import HelpsLifecycle from './HelpsRunProg';
// список всех шести разделов
const tabs = [
    { url: '/helps/arch',      label: 'Архитектура'      },
    { url: '/helps/lang',      label: 'Язык SimCom'      },
    { url: '/helps/ram',       label: 'Оперативная память' },
    { url: '/helps/proc',      label: 'Процессор'         },
    { url: '/helps/registers', label: 'Регистры'          },
    { url: '/helps/lifecycle', label: 'Жизненный цикл'   },
];

export default function Helps() {
    return (
        <div className="helps-vertical-layout">

            {/* вкладки сверху */}
            <div className="helps-tabs-container">
                <div className="helps-tabs">
                    {tabs.map(tab => (
                        <NavLink
                            key={tab.url}
                            to={tab.url}
                            className={({ isActive }) => 'nav-tab' + (isActive ? ' active' : '')}
                        >
                            {tab.label}
                        </NavLink>
                    ))}
                </div>
            </div>

            {/* контент выбранной вкладки */}
            <div className="content-card">
                <div className="cyber-body">
                    <Routes>
                        {/* по умолчанию открываем архитектуру */}
                        <Route index element={<Navigate to="arch" replace />} />
                        <Route path="arch"      element={<HelpsArch />} />
                        <Route path="lang"      element={<HelpsLang />} />
                        <Route path="ram"       element={<HelpsRam />} />
                        <Route path="proc"      element={<HelpsProc />} />
                        <Route path="registers" element={<HelpsRegisters />} />
                        <Route path="lifecycle" element={<HelpsLifecycle />} />
                    </Routes>
                </div>
            </div>

        </div>
    );
}
