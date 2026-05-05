// страница "о проекте": техническая спецификация

import '../styles/about.css';

// данные по эволюции системы
const versions = [
    {
        tag: 'v2.0',
        date: 'Апрель 2026',
        title: 'Full-stack Refactoring [Current]',
        features: [
            'Полный переход на сервисную архитектуру: Flask API + React SPA.',
            'Контейнеризация всей среды разработки через Docker и Docker Compose.',
            'Реактивный интерфейс на базе Virtual DOM для мгновенного отклика.',
            'Внедрение косвенной адресации памяти через регистр-указатель [BX].',
            'Расширение операндов АЛУ: поддержка регистров SI и DI во всех вычислениях.',
            'Аппаратная защита сегмента кода от записи.',
            'Синхронизация логики цикла LOOP со стандартом архитектуры x86.'
        ],
    },
    {
        tag: 'v1.5',
        date: 'Июнь 2024',
        title: 'Архитектурная стабилизация',
        features: [
            'Реализация многопользовательского доступа через механизм сессий.',
            'Внедрение сегментации памяти: разделение на блоки CS, DS и SS.',
            'Создание системы обработки аппаратных исключений и флага CE.'
        ],
    },
    {
        tag: 'v1.0',
        date: 'Август 2023',
        title: 'Концепт',
        features: [
            'Создание базового ядра эмуляции на языке Python.',
            'Разработка первой спецификации системы команд SimCom.',
            'Монолитная архитектура на базе серверных шаблонов Flask.'
        ],
    },
];

// журнал исправлений критических багов
const buglog = [
    {
        ver: 'v1.2',
        desc: <>
            <span style={{ color: '#FF4757' }}>БАГ:</span> Состояние флага ZF не сбрасывалось после выполнения команды MOV. 
            Это вызывало ложные срабатывания условных переходов. 
            Исправлено: операции пересылки данных теперь полностью изолированы от логики флагов АЛУ.
        </>,
    },
    {
        ver: 'v1.4',
        desc: <>
            <span style={{ color: '#FF4757' }}>БАГ:</span> Ошибка сегментации при попытке JMP на последний адрес памяти 511. 
            Проверка границ использовала неверный оператор сравнения. 
            Исправлено: внедрена строгая верификация лимитов MEM_SIZE во всех инструкциях ветвления.
        </>,
    },
    {
        ver: 'v1.7',
        desc: <>
            <span style={{ color: '#FF4757' }}>БАГ:</span> Некорректная семантика инструкции LOOP. 
            При значении CX равном единице тело цикла выполнялось лишний раз. 
            Исправлено: логика приведена к индустриальному стандарту: сначала декремент, затем проверка условия.
        </>,
    },
    {
        ver: 'v1.8',
        desc: <>
            <span style={{ color: '#FF4757' }}>БАГ:</span> Сбой указателя инструкций при вложенных вызовах CALL. 
            Система использовала регистр AX для временного хранения адреса возврата. 
            Исправлено: реализована прямая трансляция адреса из стека в IP без участия промежуточных регистров.
        </>
    }
];

// роадмап
const roadmap = [
    { ver: 'v2.1', desc: 'Реализация графического вывода через ячейки памяти.' },
    { ver: 'v2.2', desc: 'Симуляция внешних сигналов таймера и клавиатуры.' },
    { ver: 'v3.0', desc: 'Разработка компилятора языка высокого уровня под ISA SimCom.' },
];

export default function About() {
    return (
        <div className="about-container">
            <div className="about-grid">

                <div className="about-col-main">

                    {/* карточка: общая информация */}
                    <div className="cyber-card">
                        <h4 className="term-header">
                            <span className="term-prompt">[SIM]&gt;</span> exec info --version <span className="term-cursor" />
                        </h4>
                        <div className="cyber-body">
                            <h2 className="mb-3 text-white">SimCom v2.0</h2>
                            <p>
                                <span className="accent-text">SimCom</span> представляет собой высокоуровневую программную модель 16-битной ЭВМ. 
                                Проект выступает в роли интерактивной среды для глубокого изучения микроархитектуры процессоров. 
                                Платформа визуализирует жизненный цикл каждой инструкции: от выборки из памяти до изменения состояния флагов в АЛУ.
                            </p>
                            <p>
                                Система является полноценным инструментом для отладки низкоуровневых алгоритмов. 
                                Проект разработан как мост между сухой теорией и практической реализацией вычислительной логики.
                            </p>
                        </div>
                    </div>

                    {/* карточка: методология */}
                    <div className="cyber-card">
                        <h4 className="term-header">
                            <span className="term-prompt">[SIM]&gt;</span> cat methodology.txt
                        </h4>
                        <div className="cyber-body">
                            <h5 className="about-section-title">Методология разработки</h5>
                            <p className="about-body-text">
                                Разработка SimCom велась по принципу полной детерминированности. 
                                Сперва была спроектирована архитектурная логика Python, система команд и механизмы защиты памяти. 
                                Это включает реализацию сегментации (342/172/171), логику аппаратного стека и фильтр 16-битного переполнения.
                            </p>
                        </div>
                    </div>

                    {/* карточка: история версий */}
                    <div className="cyber-card">
                        <h4 className="term-header">
                            <span className="term-prompt">[SIM]&gt;</span> git log --pretty=oneline
                        </h4>
                        <div className="cyber-body">
                            <div className="version-log">
                                {versions.map((v) => (
                                    <div className="version-item" key={v.tag}>
                                        <div className="version-header">
                                            <span className="version-tag">{v.tag}</span>
                                            <span className="version-date">{v.date}</span>
                                        </div>
                                        <h5 className="version-title">{v.title}</h5>
                                        <ul className="version-features">
                                            {v.features.map((f, i) => (
                                                <li key={i}>{f}</li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* карточка: журнал багов */}
                    <div className="cyber-card">
                        <h4 className="term-header">
                            <span className="term-prompt">[SIM]&gt;</span> cat buglog.txt
                        </h4>
                        <div className="cyber-body">
                            <h5 className="about-section-title">Журнал исправлений багов</h5>
                            <div className="buglog-list">
                                {buglog.map((b) => (
                                    <div className="bug-item" key={b.ver}>
                                        <div className="bug-meta">
                                            <span className="bug-ver">{b.ver}</span>
                                            <span className="bug-status fixed">FIXED</span>
                                        </div>
                                        <div className="bug-desc">{b.desc}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                </div>

                <div className="about-col-side">

                    {/* карточка: техстек */}
                    <div className="cyber-card">
                        <h4 className="term-header">
                            <span className="term-prompt">[SIM]&gt;</span> system status --stack
                        </h4>
                        <div className="cyber-body">
                            <ul className="tech-list">
                                <li className="tech-item">
                                    <span className="tech-label">CORE ENGINE:</span><br />
                                    <span className="tech-value">Python 3.12 (Logic)</span>
                                </li>
                                <li className="tech-item">
                                    <span className="tech-label">FRONTEND IDE:</span><br />
                                    <span className="tech-value">React SPA + Vite</span>
                                </li>
                                <li className="tech-item">
                                    <span className="tech-label">BACKEND API:</span><br />
                                    <span className="tech-value">Flask (Stateful)</span>
                                </li>
                                <li className="tech-item">
                                    <span className="tech-label">INFRASTRUCTURE:</span><br />
                                    <span className="tech-value">Docker + Compose</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* карточка: роадмап */}
                    <div className="cyber-card">
                        <h4 className="term-header">
                            <span className="term-prompt">[SIM]&gt;</span> cat roadmap.txt
                        </h4>
                        <div className="cyber-body">
                            <div className="roadmap">
                                {roadmap.map((r) => (
                                    <div className="road-item" key={r.ver}>
                                        <div className="road-ver">{r.ver}</div>
                                        <div className="road-desc">{r.desc}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* футер */}
            <div className="team-block">
                <div>
                    <div className="team-role">DEVELOPER</div>
                    <div className="team-name">Kirill Vasuytchenkov</div>
                </div>
                <div className="team-build">
                    <div>LATEST_BUILD: 14.04.2026</div>
                    <div>STATUS: STABLE</div>
                </div>
            </div>
        </div>
    );
}