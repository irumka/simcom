// страница справочника: Регистровый файл (Register File)
import '../styles/helps_registers.css';

export default function HelpsRegisters() {
    return (
        <>
            <h3 className="page-title">Сверхбыстрая память ядра</h3>
            <p className="page-intro">
                18 регистров живут прямо на кристалле процессора: чтение и запись занимают ровно один такт.
                Все регистры общего назначения являются 16-битными знаковыми значениями в представлении дополнения до двух.
                Я добавил SI и DI уже после первой версии: выяснилось, что без индексных регистров удобно писать
                только самые тривиальные программы, а как только доходишь до работы с массивами, без них не обойтись.
            </p>

            <table className="table-regs">
                <thead>
                    <tr>
                        <th className="th-reg">РЕГИСТР</th>
                        <th className="th-type">ТИП</th>
                        <th className="th-size">РАЗМЕР</th>
                        <th>РОЛЬ</th>
                    </tr>
                </thead>
                <tbody>

                    {/* группа: регистры общего назначения */}
                    <tr className="row-group">
                        <td colSpan="4">Регистры общего назначения (General Purpose Registers)</td>
                    </tr>

                    <tr>
                        <td className="td-reg">
                            <span className="reg-name clr-cyan">AX</span>
                            <small className="reg-sub">accumulator</small>
                        </td>
                        <td className="td-type">Accumulator Register</td>
                        <td className="td-size">16-bit</td>
                        <td className="td-desc">
                            Главный аккумулятор: большинство арифметических операций записывают результат именно сюда.
                            Удобен для хранения основной рабочей переменной алгоритма.
                        </td>
                    </tr>

                    <tr>
                        <td className="td-reg">
                            <span className="reg-name clr-cyan">BX</span>
                            <small className="reg-sub">base</small>
                        </td>
                        <td className="td-type">Base Register</td>
                        <td className="td-size">16-bit</td>
                        <td className="td-desc">
                            Адресный регистр. Перед вызовом INT 0 или INT 1 адрес целевой ячейки памяти должен находиться именно здесь.
                            Без этого прерывание не знает, куда класть или откуда читать данные.
                        </td>
                    </tr>

                    <tr>
                        <td className="td-reg">
                            <span className="reg-name clr-cyan">CX</span>
                            <small className="reg-sub">counter</small>
                        </td>
                        <td className="td-type">Counter Register</td>
                        <td className="td-size">16-bit</td>
                        <td className="td-desc">
                            Счётчик циклов. Инструкции LOOP и JCX неявно работают с CX: декрементируют его и проверяют остаток.
                            Сюда же записываются результаты побитовых операций AND, OR, XOR и NOT.
                        </td>
                    </tr>

                    <tr>
                        <td className="td-reg">
                            <span className="reg-name clr-cyan">DX</span>
                            <small className="reg-sub">data</small>
                        </td>
                        <td className="td-type">Data Register</td>
                        <td className="td-size">16-bit</td>
                        <td className="td-desc">
                            Универсальный регистр без жёстких аппаратных привязок. Служит буфером для промежуточных значений в тех случаях, когда AX занят другой операцией.
                        </td>
                    </tr>

                    {/* группа: указатели */}
                    <tr className="row-group">
                        <td colSpan="4">Указатели (Pointers)</td>
                    </tr>

                    <tr>
                        <td className="td-reg">
                            <span className="reg-name clr-green">IP</span>
                            <small className="reg-sub">instruction pointer</small>
                        </td>
                        <td className="td-type">Instruction Pointer</td>
                        <td className="td-size">16-bit</td>
                        <td className="td-desc">
                            Указывает на следующую инструкцию. Блок управления инкрементирует его после каждой выборки.
                            Команды JMP, CALL и RET перезаписывают его напрямую. Ручное изменение невозможно: доступ открыт только через команды ветвления.
                        </td>
                    </tr>

                    <tr>
                        <td className="td-reg">
                            <span className="reg-name clr-yellow">SP</span>
                            <small className="reg-sub">stack pointer</small>
                        </td>
                        <td className="td-type">Stack Pointer</td>
                        <td className="td-size">16-bit</td>
                        <td className="td-desc">
                            Указывает на верхушку стека (диапазон 171...2). PUSH и CALL двигают его вниз, POP и RET возвращают его вверх. Реализует классическую дисциплину LIFO.
                        </td>
                    </tr>

                    <tr>
                        <td className="td-reg">
                            <span className="reg-name clr-muted">CS, DS, SS</span>
                            <small className="reg-sub">сегменты</small>
                        </td>
                        <td className="td-type">Segment Registers</td>
                        <td className="td-size">16-bit</td>
                        <td className="td-desc">
                            Хранят стартовые адреса сегментов: CS = 342, DS = 172, SS = 171.
                            Значения зашиты в контроллер и остаются константами в рантайме. На них опирается вся защита памяти.
                        </td>
                    </tr>

                    {/* группа: флаги состояния */}
                    <tr className="row-group">
                        <td colSpan="4">Флаги состояния (Status Flags)</td>
                    </tr>

                    <tr>
                        <td className="td-reg">
                            <span className="reg-name clr-red">ZF</span>
                            <small className="reg-sub">zero flag</small>
                        </td>
                        <td className="td-type">Zero Flag</td>
                        <td className="td-size">1-bit</td>
                        <td className="td-desc">
                            Принимает значение 1, если результат последней арифметической операции или CMP равняется нулю.
                            Условные переходы JE и JZ проверяют именно этот флаг.
                        </td>
                    </tr>

                    <tr>
                        <td className="td-reg">
                            <span className="reg-name clr-red">OF</span>
                            <small className="reg-sub">overflow flag</small>
                        </td>
                        <td className="td-type">Overflow Flag</td>
                        <td className="td-size">1-bit</td>
                        <td className="td-desc">
                            Загорается, когда результат не вмещается в 16 бит со знаком: выходит за диапазон от минус 32768 до 32767.
                            Потеря знакового бита и есть переполнение в точном смысле слова.
                        </td>
                    </tr>

                    <tr>
                        <td className="td-reg">
                            <span className="reg-name clr-red">CE</span>
                            <small className="reg-sub">critical error</small>
                        </td>
                        <td className="td-type">Critical Error</td>
                        <td className="td-size">1-bit</td>
                        <td className="td-desc">
                            Флаг фатальной ошибки. Деление на ноль или выход за границы памяти заставляет ядро выставить CE и полностью остановить конвейер.
                            Продолжение выполнения после этого невозможно.
                        </td>
                    </tr>

                </tbody>
            </table>

            {/* нижнее примечание */}
            <div className="reg-note">
                <div className="reg-note-title">Примечание</div>
                <p className="reg-note-body">
                    Регистры AX, BX, CX и DX доступны для чтения и записи из любой инструкции.
                    IP, CS, DS и SS находятся под управлением процессора и недоступны для прямой записи программным кодом.
                    Флаги ZF, OF и CE обновляет АЛУ автоматически: вручную их трогать не нужно.
                </p>
            </div>
        </>
    );
}
