// страница справочника: Центральный процессор (CPU Core)



export default function HelpsProc() {
    return (
        <>
            <h3 className="page-title">Архитектура ядра SimCom</h3>
            <p className="page-intro">
                SimCom реализует 16-битную синхронную стейт-машину: один такт соответствует ровно одной инструкции.
                Вся арифметика является знаковой и использует представление дополнения до двух.
                Я намеренно не упрощал это до беззнаковой арифметики: именно так устроены реальные процессоры,
                и на тестах стало видно, что честная эмуляция переполнения учит работать с флагами куда лучше любых объяснений.
            </p>

            <table className="table-cyber">
                <thead>
                    <tr>
                        <th className="th-subblock">СУББЛОК</th>
                        <th className="th-name">НАЗВАНИЕ</th>
                        <th>КАК РАБОТАЕТ</th>
                    </tr>
                </thead>
                <tbody>

                    {/* логические компоненты */}
                    <tr className="row-group">
                        <td colSpan="3">Логические компоненты ядра</td>
                    </tr>

                    <tr>
                        <td className="td-node">
                            <span className="node-name clr-yellow">ALU</span>
                            <small className="node-sub">Арифметика и логика</small>
                        </td>
                        <td className="td-type">Arithmetic Logic Unit</td>
                        <td className="td-desc">
                            Вычисляет результаты и сдвигает биты. После каждой операции самостоятельно выставляет флаги ZF (результат нулевой) и OF (вышли за границы 16 бит). Думать об этом вручную не нужно: АЛУ обновляет флаги автоматически.
                        </td>
                    </tr>

                    <tr>
                        <td className="td-node">
                            <span className="node-name clr-green">CU</span>
                            <small className="node-sub">Блок управления</small>
                        </td>
                        <td className="td-type">Control Unit</td>
                        <td className="td-desc">
                            Читает сырую ячейку по текущему IP, разбирает строку на опкод и аргументы, ищет совпадение в словаре инструкций и передаёт управление нужному обработчику. Всё, что не нашлось в словаре, классифицируется как синтаксическая ошибка.
                        </td>
                    </tr>

                    {/* конвейер исполнения */}
                    <tr className="row-group">
                        <td colSpan="3">Конвейер исполнения (Instruction Pipeline)</td>
                    </tr>

                    <tr>
                        <td className="td-node">
                            <span className="node-name clr-cyan">FETCH</span>
                            <small className="node-sub">Выборка</small>
                        </td>
                        <td className="td-type">Instruction Fetch Stage</td>
                        <td className="td-desc">
                            Берёт ячейку памяти по адресу из IP и помещает её в регистр CI. Сразу инкрементирует IP: к следующему такту адрес уже готов.
                        </td>
                    </tr>

                    <tr>
                        <td className="td-node">
                            <span className="node-name clr-cyan">DECODE</span>
                            <small className="node-sub">Декодирование</small>
                        </td>
                        <td className="td-type">Instruction Decode Stage</td>
                        <td className="td-desc">
                            Берёт первое слово из CI и ищет его в словаре команд. Если совпадение не найдено, генерируется прерывание и конвейер останавливается. Если совпадение найдено, аргументы разбираются и управление передаётся в EXECUTE.
                        </td>
                    </tr>

                    <tr>
                        <td className="td-node">
                            <span className="node-name clr-cyan">EXECUTE</span>
                            <small className="node-sub">Исполнение</small>
                        </td>
                        <td className="td-type">Execution Stage</td>
                        <td className="td-desc">
                            Вызывает нужный метод ядра. АЛУ берёт операнды из регистров, вычисляет и записывает результат. Если инструкция обращается к памяти, сначала проверяется право доступа. Запись в сегмент кода классифицируется как критический сбой.
                        </td>
                    </tr>

                    {/* аппаратные ограничения */}
                    <tr className="row-group">
                        <td colSpan="3">Аппаратные ограничения</td>
                    </tr>

                    <tr>
                        <td className="td-node">
                            <span className="node-name clr-red">OVERFLOW CLAMP</span>
                            <small className="node-sub">Срез переполнения</small>
                        </td>
                        <td className="td-type">16-bit Boundary Filter</td>
                        <td className="td-desc">
                            Python хранит числа произвольного размера, а реальный процессор нет. Поэтому каждый результат проходит через фильтр, который жёстко обрезает всё за пределами диапазона от минус 32768 до 32767 и имитирует настоящее аппаратное переполнение.
                        </td>
                    </tr>

                    <tr>
                        <td className="td-node">
                            <span className="node-name clr-red">ZERO DIV LOCK</span>
                            <small className="node-sub">Защита деления</small>
                        </td>
                        <td className="td-type">Division by Zero Trap</td>
                        <td className="td-desc">
                            Деление на ноль немедленно выставляет флаг CE и останавливает конвейер. Без этого трапа хост-система падала бы с необработанным исключением Python.
                        </td>
                    </tr>

                </tbody>
            </table>

            {/* блок с кодом фильтра АЛУ */}
            <div className="info-block info-block-green">
                <div className="info-block-title">Фильтр АЛУ (math_op)</div>
                <p className="info-block-text">
                    Все арифметические операции проходят через эту функцию. Она же обновляет флаги:
                </p>
                <pre className="code-block code-block-green">{`def math_op(self, raw):
    # 0x8000 это 32768. долго выводил эту формулу для 16-битного знака, вроде работает честно
    val = (raw + 0x8000) % 0x10000 - 0x8000

    self.registers['zf'] = 1 if val == 0 else 0
    self.registers['of'] = 1 if raw != val else 0

    return val`}</pre>
            </div>

            {/* информационный блок-примечание */}
            <div className="info-block info-block-cyan">
                <div className="info-block-title info-block-title-cyan">Примечание</div>
                <p className="info-block-text">
                    Реальный процессор работает с электрическими сигналами, SimCom работает с вызовами Python-методов и списками. Суть остаётся той же: одинаковые стадии выборки, декодирования и исполнения, одинаковые правила доступа к памяти. Просто без паяльника.
                </p>
            </div>
        </>
    );
}
