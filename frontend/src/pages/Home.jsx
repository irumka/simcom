import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

// подключаем стили для главной страницы
import '../styles/home.css';

export default function Home() {
    const memGridRef = useRef(null);
    const timerRef = useRef(null);

    // добавляем класс на body чтобы сетка-фон работала
    useEffect(() => {
        document.body.classList.add('bg-engineering');
        return () => document.body.classList.remove('bg-engineering');
    }, []);

    useEffect(() => {
        const memGrid = memGridRef.current;
        if (!memGrid) return;

        // создаём 128 мини-ячеек памяти
        for (let i = 0; i < 128; i++) {
            const cell = document.createElement('div');
            cell.className = 'mini-cell';
            if (i >= 16 && i < 48) cell.classList.add('cs-segment');
            else if (i >= 64 && i < 80) cell.classList.add('ds-segment');
            if (Math.random() > 0.8) cell.classList.add('has-data');
            memGrid.appendChild(cell);
        }

        let currentIp = 0x156;

        // анимация: регистры мигают случайными значениями
        timerRef.current = setInterval(() => {
            document.querySelectorAll('.live-hex').forEach(el => {
                el.innerText = Math.floor(Math.random() * 65535)
                    .toString(16).toUpperCase().padStart(4, '0');
            });
            if (Math.random() > 0.7) {
                document.querySelectorAll('.live-bit').forEach(el => {
                    el.innerText = Math.round(Math.random());
                });
            }
            currentIp = (currentIp + 1) % 512;
            const ipEl = document.querySelector('.live-ip');
            if (ipEl) {
                ipEl.innerText = currentIp.toString(16).toUpperCase().padStart(4, '0');
            }
            memGrid.querySelectorAll('.mini-cell').forEach(c => c.classList.remove('active-scan'));
            const targetCell = memGrid.children[currentIp % 128];
            if (targetCell) targetCell.classList.add('active-scan');
        }, 300);

        // чистим интервал когда компонент уходит со страницы
        return () => {
            clearInterval(timerRef.current);
            memGrid.innerHTML = '';
        };
    }, []);

    return (
        <div className="hologram-container">

            <div className="text-center mb-4 pt-3 z-index-2 position-relative">
                <h1 className="glow-title">SimCom - учебный эмулятор ЭВМ</h1>
                <p className="hologram-subtitle">
                    Смотри как работает архитектура фон Неймана изнутри - регистры, память, пошаговое выполнение.
                </p>
            </div>

            <div className="architecture-board">

                {/* анимированные линии между блоками */}
                <svg className="data-lines" width="100%" height="100%">
                    <path className="data-flow-line" d="M 150,200 L 250,200" />
                    <path className="data-flow-line" d="M 550,200 L 650,200" />
                    <path className="data-flow-line" d="M 950,200 L 1050,200" />
                </svg>

                {/* блок входного потока */}
                <div className="io-block stream-in">
                    <div className="block-title">Ввод (Stream In)</div>
                    <div className="stream-data">
                        <span className="pulse-data">0x4F</span>
                        <span className="pulse-data delay-1">0x12</span>
                    </div>
                </div>

                {/* блок процессора с регистрами */}
                <div className="cpu-core">
                    <div className="cpu-header">
                        <span className="status-indicator"></span>
                        SimCom CPU Core
                    </div>
                    <div className="registers-matrix">
                        <div className="reg-chip">
                            <span className="reg-label">AX</span>
                            <span className="reg-val live-hex">0000</span>
                        </div>
                        <div className="reg-chip">
                            <span className="reg-label">BX</span>
                            <span className="reg-val live-hex">0000</span>
                        </div>
                        <div className="reg-chip ip-chip active-chip">
                            <span className="reg-label">IP</span>
                            <span className="reg-val live-ip">0156</span>
                        </div>
                        <div className="reg-chip">
                            <span className="reg-label">SP</span>
                            <span className="reg-val">00AB</span>
                        </div>
                        <div className="reg-chip flag-chip">
                            <span className="reg-label">ZF</span>
                            <span className="reg-val live-bit">0</span>
                        </div>
                        <div className="reg-chip flag-chip">
                            <span className="reg-label">OF</span>
                            <span className="reg-val live-bit">0</span>
                        </div>
                    </div>
                </div>

                {/* блок карты памяти */}
                <div className="memory-matrix-block">
                    <div className="block-title text-end">Память (512 ячеек)</div>
                    <div className="mem-grid" ref={memGridRef}></div>
                    <div className="mem-legend">
                        <span className="legend-item">
                            <span className="color-box cs-color"></span> CS (код)
                        </span>
                        <span className="legend-item">
                            <span className="color-box ds-color"></span> DS (данные)
                        </span>
                    </div>
                </div>

                {/* блок выходного потока */}
                <div className="io-block stream-out">
                    <div className="block-title">Вывод (Stream Out)</div>
                    <div className="terminal-mock">
                        <div className="log-line">&gt; init stream... OK</div>
                        <div className="log-line">&gt; mapping mem... OK</div>
                        <div className="log-line error-line">
                            &gt; Ошибка: попытка записи в защищённый сегмент кода
                        </div>
                    </div>
                </div>

            </div>

            <div className="text-center mt-5 position-relative z-index-2 pb-4">
                <Link to="/computer" className="cta-button">
                    <i className="bi bi-cpu-fill me-2"></i>Открыть интерпретатор
                </Link>
            </div>

        </div>
    );
}