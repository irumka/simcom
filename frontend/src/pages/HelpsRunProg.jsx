// страница справочника: Жизненный цикл программы (Execution Pipeline)

export default function HelpsRunProg() {
    return (
        <>
            {/* вводный блок */}
            <div className="isa-intro">
                <h3 className="isa-intro-title">Как программа идёт от строки кода до результата</h3>
                <p>SimCom честно воспроизводит аппаратный конвейер реальных процессоров. Я намеренно сохранил все фазы явными: когда видишь каждый шаг отдельно, сразу понятно, почему некоторые ошибки случаются именно там, где они случаются.</p>
            </div>

            <table className="table-cyber">
                <thead>
                    <tr>
                        <th className="th-phase">ФАЗА</th>
                        <th className="th-process">ПРОЦЕСС</th>
                        <th>ЧТО ПРОИСХОДИТ</th>
                    </tr>
                </thead>
                <tbody>

                    {/* фаза 1: лексический анализ */}
                    <tr>
                        <td><span className="cmd-name clr-cyan">PHASE 1</span></td>
                        <td className="phase-title">
                            Lexical Parsing<br />
                            <small className="phase-sub">Лексический анализ</small>
                        </td>
                        <td>
                            <div className="cmd-desc">
                                Flask ловит строку из формы. Парсер приводит её к нижнему регистру, режет по пробелам и ищет опкод в словаре команд. Прошло валидацию: попадает в очередь. Не прошло: ошибка сразу, не при выполнении.
                            </div>
                        </td>
                    </tr>

                    {/* фаза 2: загрузчик */}
                    <tr>
                        <td><span className="cmd-name clr-cyan">PHASE 2</span></td>
                        <td className="phase-title">
                            System Init<br />
                            <small className="phase-sub">Загрузчик</small>
                        </td>
                        <td>
                            <div className="cmd-desc">
                                Кнопка «Начать» запускает загрузчик: обнуляет регистры и флаги, копирует инструкции в Code Segment (с адреса 342), ставит IP=342, SP=171. Всё, виртуальная машина готова к работе.
                            </div>
                        </td>
                    </tr>

                    {/* заголовок группы: такт процессора */}
                    <tr className="category-header">
                        <td colSpan="3">CPU Instruction Cycle (один такт процессора)</td>
                    </tr>

                    {/* фаза 3a: выборка */}
                    <tr>
                        <td><span className="cmd-name clr-green">PHASE 3a</span></td>
                        <td className="phase-title phase-title-green">
                            Fetch<br />
                            <small className="phase-sub">Выборка</small>
                        </td>
                        <td>
                            <div className="cmd-desc">
                                Читаем ячейку по адресу IP через шину данных. Кладём содержимое в регистр CI (Current Instruction).
                            </div>
                        </td>
                    </tr>

                    {/* фаза 3b: декодирование */}
                    <tr>
                        <td><span className="cmd-name clr-green">PHASE 3b</span></td>
                        <td className="phase-title phase-title-green">
                            Decode<br />
                            <small className="phase-sub">Дешифрация</small>
                        </td>
                        <td>
                            <div className="cmd-desc">
                                IP++ сразу после выборки: следующий такт уже готов. Дешифратор берёт CI, вытаскивает опкод и аргументы, готовит операнды для АЛУ.
                            </div>
                        </td>
                    </tr>

                    {/* фаза 3c: исполнение */}
                    <tr>
                        <td><span className="cmd-name clr-green">PHASE 3c</span></td>
                        <td className="phase-title phase-title-green">
                            Execute<br />
                            <small className="phase-sub">Исполнение</small>
                        </td>
                        <td>
                            <div className="cmd-desc">
                                Вызываем нужный метод ядра. АЛУ считает, пишет в регистры или память. Флаги ZF и OF пересчитываются по результату.
                            </div>
                        </td>
                    </tr>

                    {/* заголовок группы: I/O и завершение */}
                    <tr className="category-header">
                        <td colSpan="3">I/O и завершение</td>
                    </tr>

                    {/* фаза 4: прерывания */}
                    <tr>
                        <td><span className="cmd-name clr-yellow">PHASE 4</span></td>
                        <td className="phase-title">
                            Interrupts<br />
                            <small className="phase-sub">Прерывания</small>
                        </td>
                        <td>
                            <div className="cmd-desc">
                                INT приостанавливает конвейер и обращается к I/O. INT 0 читает из буфера ввода браузера в ячейку по адресу BX. INT 1 выводит ячейку по BX в консоль. После успешной транзакции конвейер возобновляется.
                            </div>
                        </td>
                    </tr>

                    {/* фаза 5: останов */}
                    <tr>
                        <td><span className="cmd-name clr-red">PHASE 5</span></td>
                        <td className="phase-title">
                            Halt / Error<br />
                            <small className="phase-sub">Стоп</small>
                        </td>
                        <td>
                            <div className="cmd-desc">
                                END обеспечивает штатное завершение: is_run=False, лог в консоль. Любое нештатное событие (деление на ноль, выход IP за границы, пустой стек) завершается так же, но с сообщением об ошибке. В обоих случаях машина полностью блокируется до сброса.
                            </div>
                        </td>
                    </tr>

                </tbody>
            </table>
        </>
    );
}
