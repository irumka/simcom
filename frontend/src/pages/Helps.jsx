import { NavLink, Routes, Route, Navigate } from 'react-router-dom';

// подключаем общие стили справочника
import '../styles/helps.css';

// импорты всех шести страниц справочника с правильными именами файлов
import HelpsArch      from './HelpsArch';
import HelpsSimcom    from './HelpsSimcom';
import HelpsRam       from './HelpsRam';
import HelpsProc      from './HelpsProc';
import HelpsRegisters from './HelpsRegisters';
import HelpsRunProg   from './HelpsRunProg';

// шесть вкладок справочника
const tabs = [
    { url: '/helps/arch',      label: 'Архитектура'       },
    { url: '/helps/simcom',    label: 'Язык SimCom'       },
    { url: '/helps/ram',       label: 'Оперативная память' },
    { url: '/helps/proc',      label: 'Процессор'          },
    { url: '/helps/registers', label: 'Регистры'           },
    { url: '/helps/lifecycle', label: 'Жизненный цикл'    },
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
                        <Route path="simcom"    element={<HelpsSimcom />} />
                        <Route path="ram"       element={<HelpsRam />} />
                        <Route path="proc"      element={<HelpsProc />} />
                        <Route path="registers" element={<HelpsRegisters />} />
                        {/* путь lifecycle ведёт на компонент HelpsRunProg */}
                        <Route path="lifecycle" element={<HelpsRunProg />} />
                    </Routes>
                </div>
            </div>

        </div>
    );
}
