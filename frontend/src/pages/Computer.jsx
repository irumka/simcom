import { useState, useEffect, useRef, useCallback } from 'react';
import '../styles/computer.css';

// адрес бэкенда
const API = 'https://simcom-backend.onrender.com/api';

const EMPTY_STATE = {
    registers: {
        ci: 0, ax: 0, bx: 0, cx: 0, dx: 0,
        cs: 0, ds: 0, ss: 0,
        sp: 0, bp: 0, si: 0, di: 0,
        ip: 0, ir: 0, zf: 0, of: 0, nt: 0, ce: 0,
    },
    is_ready: true,
    is_run: false,
    cur_line: -1,
    stream_out: [],
    stream_in: [],
    memory: Array(512).fill(''),
    memory_cs: 0,
    memory_ds: 0,
    memory_ss: 0,
    code_lst: [],
};

export default function Computer() {
    const [state, setState] = useState(EMPTY_STATE);
    const [cmdInput, setCmdInput] = useState('');
    const [streamInput, setStreamInput] = useState('');
    const [breakpoints, setBreakpoints] = useState(new Set());
    const [isAuto, setIsAuto] = useState(false);
    // флаг загрузки: true пока фласк не ответил на первый запрос
    const [isLoading, setIsLoading] = useState(true);

    const autoTimerRef = useRef(null);
    const terminalRef = useRef(null);
    const activeLineRef = useRef(null);
    const activeMemRef = useRef(null);
    const codeListRef = useRef(null);
    const memoryWrapperRef = useRef(null);
    const breakpointsRef = useRef(breakpoints);

    // держим breakpoints актуальным для setInterval
    useEffect(() => {
        breakpointsRef.current = breakpoints;
    }, [breakpoints]);

    // при загрузке тянем стейт с сервера
    useEffect(() => {
        const loadState = async () => {
            try {
                const resp = await fetch(API + '/state', { credentials: 'include' });
                const data = await resp.json();
                setState(data);
            } catch (err) {
                console.error('ошибка загрузки стейта:', err);
                setState(prev => ({
                    ...prev,
                    stream_out: [['Ошибка связи с сервером Flask. Проверь порт 5000.', 'e']],
                }));
            } finally {
                // данные пришли (или упали с ошибкой), в любом случае убираем скелетоны
                setIsLoading(false);
            }
        };
        loadState();
    }, []);

    // скролл терминала
    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [state.stream_out]);

    // умный скролл внутри контейнера (чтобы страница не прыгала)
    const scrollToElement = (container, element) => {
        if (!container || !element) return;
        const containerTop = container.getBoundingClientRect().top;
        const elementTop = element.getBoundingClientRect().top;
        const offset = elementTop - containerTop;
        const targetScroll = container.scrollTop + offset;
        const centered = targetScroll - container.clientHeight / 2 + element.clientHeight / 2;
        container.scrollTo({ top: centered, behavior: 'smooth' });
    };

    // скролл к строке кода
    useEffect(() => {
        if (activeLineRef.current && codeListRef.current) {
            scrollToElement(codeListRef.current, activeLineRef.current);
        }
    }, [state.cur_line]);

    // скролл к ячейке памяти
    useEffect(() => {
        if (activeMemRef.current && memoryWrapperRef.current) {
            scrollToElement(memoryWrapperRef.current, activeMemRef.current);
        }
    }, [state.registers.ip]);

    // чистим таймер при уходе со страницы
    useEffect(() => {
        return () => {
            if (autoTimerRef.current) clearInterval(autoTimerRef.current);
        };
    }, []);

    const stopAuto = useCallback(() => {
        if (autoTimerRef.current) {
            clearInterval(autoTimerRef.current);
            autoTimerRef.current = null;
        }
        setIsAuto(false);
        const statusEl = document.getElementById('auto-status');
        if (statusEl) statusEl.textContent = '';
    }, []);

    // основной шаг выполнения
    const doStep = useCallback(async () => {
        try {
            const resp = await fetch(API + '/next', { credentials: 'include' });
            const data = await resp.json();
            
            // React сам обновит все цифры и цвета благодаря setState!
            setState(data);

            // остановка программы
            if (!data.is_ready && !data.is_run) {
                return false; 
            }
            return true;
        } catch (err) {
            console.error('ошибка при шаге:', err);
            return false;
        }
    }, []);

    const startAuto = useCallback(() => {
        setIsAuto(true);
        const statusEl = document.getElementById('auto-status');

        autoTimerRef.current = setInterval(async () => {
            const ok = await doStep();
            if (!ok) {
                stopAuto();
                return;
            }
            
            // проверка брейкпоинтов
            setState(prev => {
                if (autoTimerRef.current && breakpointsRef.current.has(prev.cur_line)) {
                    stopAuto();
                    if (statusEl) statusEl.textContent = `⏸ Брейкпоинт на строке ${prev.cur_line + 1}`;
                }
                return prev;
            });
        }, 500);
    }, [doStep, stopAuto]);

    const toggleAuto = () => {
        if (isAuto) stopAuto();
        else startAuto();
    };

    const toggleBreakpoint = (lineIdx) => {
        setBreakpoints(prev => {
            const next = new Set(prev);
            if (next.has(lineIdx)) next.delete(lineIdx);
            else next.add(lineIdx);
            return next;
        });
    };

    const handleAddCommand = async (e) => {
        e.preventDefault();
        if (!cmdInput.trim()) return;
        try {
            const resp = await fetch(API + '/command', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command: cmdInput.trim() }),
            });
            const data = await resp.json();
            if (data.error) {
                setState(prev => ({ ...prev, stream_out: [...prev.stream_out, [data.error, 'e']] }));
            } else {
                setState(data);
                setCmdInput('');
            }
        } catch (err) { console.error('ошибка добавления:', err); }
    };

    const handleDelete = async (idx) => {
        try {
            const resp = await fetch(API + '/command/' + idx, { method: 'DELETE', credentials: 'include' });
            const data = await resp.json();
            if (!data.error) setState(data);
        } catch (err) { console.error('ошибка удаления:', err); }
    };

    const handleClear = async () => {
        await fetch(API + '/clear', { credentials: 'include' });
        setState(prev => ({ ...prev, code_lst: [] }));
    };

    const handleReset = async () => {
        stopAuto();
        const resp = await fetch(API + '/reset', { credentials: 'include' });
        const data = await resp.json();
        setState(data);
    };

    const handleExample = async (name) => {
        const resp = await fetch(API + '/example/' + name, { credentials: 'include' });
        const data = await resp.json();
        if (!data.error) setState(data);
    };

    const handleStreamIn = async (e) => {
        e.preventDefault();
        if (!streamInput.trim()) return;
        try {
            const resp = await fetch(API + '/stream_in', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ value: streamInput.trim() }),
            });
            const data = await resp.json();
            if (data.stream_in !== undefined) {
                setState(prev => ({ ...prev, stream_in: data.stream_in }));
                setStreamInput('');
            }
        } catch (err) { console.error('ошибка ввода:', err); }
    };

    const handleClearOutput = async () => {
        await fetch(API + '/stream_out/clear', { credentials: 'include' });
        setState(prev => ({ ...prev, stream_out: [] }));
    };

    const handleClearInput = async () => {
        await fetch(API + '/stream_in/clear', { credentials: 'include' });
        setState(prev => ({ ...prev, stream_in: [] }));
    };

    const handleExport = () => { window.open(API + '/export', '_blank'); };

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        try {
            const resp = await fetch(API + '/import', { method: 'POST', credentials: 'include', body: formData });
            const data = await resp.json();
            if (data.error) {
                setState(prev => ({ ...prev, stream_out: [...prev.stream_out, [data.error, 'e']] }));
            } else {
                setState(data);
            }
        } catch (err) { console.error('ошибка импорта:', err); }
        e.target.value = '';
    };

    const stepBtnText = state.is_ready ? 'Начать выполнение' : state.is_run ? 'Следующий шаг' : 'Выполнение завершено';
    const stepBtnDisabled = !state.is_ready && !state.is_run;

    const getMemCellClass = (i, val) => {
        const cs = state.memory_cs;
        const ds = state.memory_ds;
        const ss = state.memory_ss;
        let cls = 'mem-cell';

        if (i >= cs) cls += ' seg-cs';
        else if (i >= ds) cls += ' seg-ds';
        else if (i >= ss) cls += ' seg-ss';

        if (val !== '' && val !== null && val !== undefined) cls += ' has-data';
        if (i === state.registers.ip) cls += ' active-ip';

        return cls;
    };

    return (
        <div className="ide-layout">
            {/* РЕДАКТОР КОДА */}
            <div className="cyber-panel">
                <div className="panel-header">
                    <h4 className="panel-title">Редактор кода</h4>
                </div>
                <div className="panel-body p-0">
                    <div className="code-list p-3" ref={codeListRef}>
                        {state.code_lst.map((cmd, i) => {
                            const isActive = state.is_run && i === state.cur_line;
                            return (
                                <div key={i} className={'code-line' + (isActive ? ' active-line' : '')} ref={isActive ? activeLineRef : null}>
                                    <div className="bp-zone" onClick={() => toggleBreakpoint(i)} title="Брейкпоинт">
                                        <div className={'bp-dot' + (breakpoints.has(i) ? ' active' : '')}></div>
                                    </div>
                                    <span className="code-num">{i + 1}</span>
                                    <span className="code-cmd">{cmd}</span>
                                    <button className="code-del" onClick={() => handleDelete(i)} title="Удалить" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>&#10006;</button>
                                </div>
                            );
                        })}
                    </div>

                    <div className="p-3" style={{ borderTop: '1px solid var(--panel-border)' }}>
                        <form onSubmit={handleAddCommand} className="m-0">
                            {/* поле ввода команд блокируем пока фласк не ответил */}
                            <input
                                className="cyber-input"
                                type="text"
                                placeholder="+ команда..."
                                autoComplete="off"
                                value={cmdInput}
                                onChange={e => setCmdInput(e.target.value)}
                                disabled={isLoading}
                            />
                        </form>
                    </div>

                    <div className="p-3" style={{ borderTop: '1px solid var(--panel-border)' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>ПРИМЕРЫ</div>
                        <div className="d-flex gap-2 flex-wrap">
                            {['sum', 'fact', 'stack', 'indirect'].map(name => (
                                <button key={name} className="btn-cyber-sm" style={{ background: 'none', cursor: 'pointer' }} onClick={() => handleExample(name)}>
                                    {{ sum: 'Сумма', fact: 'Факториал', stack: 'Стек', indirect: 'Косвенная' }[name]}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="p-3" style={{ borderTop: '1px solid var(--panel-border)' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>ИМПОРТ / ЭКСПОРТ</div>
                        <div className="d-flex gap-2">
                            {/* кнопки импорта и экспорта тоже ждут загрузки */}
                            <button
                                className="btn-cyber-sm"
                                style={{ background: 'none', cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.5 : 1 }}
                                onClick={handleExport}
                                disabled={isLoading}
                            >
                                Экспорт .txt
                            </button>
                            <label
                                className="btn-cyber-sm"
                                style={{ cursor: isLoading ? 'not-allowed' : 'pointer', display: 'inline-block', opacity: isLoading ? 0.5 : 1 }}
                            >
                                Импорт <input type="file" accept=".txt" style={{ display: 'none' }} onChange={handleImport} disabled={isLoading} />
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            {/* УПРАВЛЕНИЕ И ТЕРМИНАЛ */}
            <div className="cyber-panel">
                <div className="panel-header">
                    <h4 className="panel-title">Управление</h4>
                </div>
                <div className="panel-body">
                    {/* пока ждем данные от фласка, рисуем заглушки вместо кнопок управления */}
                    {isLoading ? (
                        <div className="main-controls">
                            <div className="skeleton" style={{ height: '42px', borderRadius: '4px', marginBottom: '8px' }}></div>
                            <div className="skeleton" style={{ height: '36px', borderRadius: '4px' }}></div>
                        </div>
                    ) : (
                        <div className="main-controls">
                            <button className={'btn-cyber-main' + (stepBtnDisabled ? ' disabled' : '')} disabled={stepBtnDisabled} onClick={doStep}>{stepBtnText}</button>
                            <button className={'btn btn-outline-info w-100 mt-2' + (isAuto ? ' running' : '')} disabled={stepBtnDisabled} onClick={toggleAuto}>{isAuto ? 'СТОП' : 'AUTO'}</button>
                        </div>
                    )}

                    {/* вторичные кнопки тоже в виде заглушек пока грузится */}
                    {isLoading ? (
                        <div className="secondary-controls mb-3" style={{ display: 'flex', gap: '8px' }}>
                            <div className="skeleton" style={{ height: '28px', width: '70px', borderRadius: '4px' }}></div>
                            <div className="skeleton" style={{ height: '28px', width: '110px', borderRadius: '4px' }}></div>
                            <div className="skeleton" style={{ height: '28px', width: '100px', borderRadius: '4px' }}></div>
                        </div>
                    ) : (
                        <div className="secondary-controls mb-3">
                            <button className="btn-cyber-sm btn-danger" style={{ background: 'none', cursor: 'pointer' }} onClick={handleReset}>Сброс</button>
                            <button className="btn-cyber-sm" style={{ background: 'none', cursor: 'pointer' }} onClick={handleClearOutput}>Очистить вывод</button>
                            <button className="btn-cyber-sm" style={{ background: 'none', cursor: 'pointer' }} onClick={handleClearInput}>Очистить ввод</button>
                        </div>
                    )}

                    <div id="auto-status" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', minHeight: '1.2em', marginBottom: '8px' }}></div>

                    <h4 className="panel-title mb-2">I/O Терминал</h4>
                    <div className="terminal-window">
                        <div className="terminal-out" ref={terminalRef}>
                            {state.stream_out.map((it, i) => (
                                <p key={i} className={'type_text_' + it[1]}>&gt; {it[0]}</p>
                            ))}
                        </div>
                        {state.stream_in.length > 0 && (
                            <div style={{ padding: '0 10px 5px', color: 'var(--yellow)', fontSize: '0.8rem' }}>Буфер ввода: [{state.stream_in.join(', ')}]</div>
                        )}
                        <div className="terminal-in">
                            <form onSubmit={handleStreamIn} className="w-100 m-0">
                                <input type="text" placeholder="Ввод для программы..." autoComplete="off" value={streamInput} onChange={e => setStreamInput(e.target.value)} />
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            {/* РЕГИСТРЫ И ПАМЯТЬ */}
            <div className="cyber-panel">
                <div className="panel-header">
                    <h4 className="panel-title">Состояние системы</h4>
                </div>
                <div className="panel-body">
                    <div className="registers-container">
                        {/* пока ждем фласк: рисуем 18 серых блоков вместо регистров */}
                        {isLoading
                            ? Array(18).fill(0).map((_, idx) => (
                                <div key={idx} className="reg-chip">
                                    <div className="skeleton" style={{ height: '14px', width: '28px', borderRadius: '3px', marginBottom: '4px' }}></div>
                                    <div className="skeleton" style={{ height: '18px', width: '36px', borderRadius: '3px' }}></div>
                                </div>
                            ))
                            : Object.entries(state.registers).map(([k, v]) => (
                                <div className="reg-chip" key={k}>
                                    <div className="reg-label">{k}</div>
                                    <div className="reg-value">{v}</div>
                                </div>
                            ))
                        }
                    </div>

                    <div className="d-flex justify-content-between align-items-end mb-2">
                        <h4 className="panel-title">Карта памяти (32×16)</h4>
                        <div className="memory-legend">
                            <div className="leg-item"><div className="leg-box lb-ss"></div> SS</div>
                            <div className="leg-item"><div className="leg-box lb-ds"></div> DS</div>
                            <div className="leg-item"><div className="leg-box lb-cs"></div> CS</div>
                        </div>
                    </div>

                    <div className="memory-wrapper" ref={memoryWrapperRef}>
                        <div className="memory-grid">
                            {/* пока ждем фласк: 512 серых квадратиков вместо ячеек памяти */}
                            {isLoading
                                ? Array(512).fill(0).map((_, i) => (
                                    <div key={i} className="skeleton mem-cell" style={{ borderRadius: '2px' }}></div>
                                ))
                                : state.memory.map((val, i) => {
                                    const isIp = i === state.registers.ip;
                                    const displayVal = (val !== '' && val !== null) ? String(val).slice(0, 3) : '';
                                    return (
                                        <div key={i} className={getMemCellClass(i, val)} title={`${i}: ${val || '(пусто)'}`} ref={isIp ? activeMemRef : null}>
                                            {displayVal}
                                        </div>
                                    );
                                })
                            }
                        </div>
                    </div>
                </div>
            </div>
            
            <style>{`
                .bp-zone { width: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
                .bp-dot { width: 8px; height: 8px; border-radius: 50%; background: #ff3b3b; display: none; }
                .bp-dot.active { display: block; }
                .code-line.active-line { background: #00ff9915; border-left: 2px solid #00ff99; }
                #btn-auto.running { background-color: #0dcaf0 !important; color: #000 !important; border-color: #0dcaf0 !important; }

                /* скелетон: серый градиент с плавным переливом */
                @keyframes skeleton-pulse {
                    0%   { background-position: -200px 0; }
                    100% { background-position: calc(200px + 100%) 0; }
                }
                .skeleton {
                    background: linear-gradient(
                        90deg,
                        #2a2a2a 25%,
                        #3a3a3a 50%,
                        #2a2a2a 75%
                    );
                    background-size: 400px 100%;
                    animation: skeleton-pulse 1.4s ease infinite;
                    display: block;
                }
            `}</style>
        </div>
    );
}
