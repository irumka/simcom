// страница справочника: система команд simcom (таблица ISA)

import '../styles/helps_simcom.css';

// данные команд по категориям
const isaCategories = [
    {
        title: '1. Пересылка данных',
        rows: [
            {
                instr: <><span className="cmd-name">MOV</span><br /><code className="cmd-args">[dest] [src]</code></>,
                what: (
                    <div className="cmd-desc">
                        Копирует значение из src в dest. Если dest является числом, пишет в ячейку памяти по этому адресу; если является именем регистра, то в регистр.<br /><br />
                        <span className="warn-text">&#9888; Запись в адреса сегмента кода (&gt;= 342) запрещена и вызывает ошибку с остановом.</span><br />
                        Флаги не меняет.
                    </div>
                ),
                examples: ['mov ax 5', 'mov 172 ax'],
            },
            {
                instr: <><span className="cmd-name">PUSH</span><br /><code className="cmd-args">[reg/val]</code></>,
                what: (
                    <div className="cmd-desc">
                        Кладёт значение на стек: SP--, затем memory[SP] = значение.<br />
                        Если SP &lt;= 2 возникает Stack Overflow, CE=1, стоп.<br />
                        Флаги не меняет.
                    </div>
                ),
                examples: ['push ax'],
            },
            {
                instr: <><span className="cmd-name">POP</span><br /><code className="cmd-args">[reg]</code></>,
                what: (
                    <div className="cmd-desc">
                        Снимает значение со стека в регистр: reg = memory[SP], затем SP++.<br />
                        Работает только с регистром, не с адресом памяти.<br />
                        Если SP &gt;= 171 значит стек пуст, CE=1, стоп.<br />
                        Флаги не меняет.
                    </div>
                ),
                examples: ['pop bx'],
            },
        ],
    },
    {
        title: '2. Арифметика',
        rows: [
            {
                instr: (
                    <>
                        <span className="cmd-name">ADD</span> <code className="cmd-args">[reg] [val]</code><br /><br />
                        <span className="cmd-name">SUB</span> <code className="cmd-args">[reg] [val]</code>
                    </>
                ),
                what: (
                    <div className="cmd-desc">
                        reg = reg + val (или reg - val). Первый операнд обязательно регистр, именно в него записывается результат.<br />
                        Флаги: ZF=1 если результат 0; OF=1 если вышли за 16-битный знаковый диапазон [-32768, 32767].
                    </div>
                ),
                examples: ['add ax bx', 'sub cx 10'],
            },
            {
                instr: (
                    <>
                        <span className="cmd-name">MUL</span> <code className="cmd-args">[reg] [val]</code><br /><br />
                        <span className="cmd-name">DIV</span> <code className="cmd-args">[reg] [val]</code>
                    </>
                ),
                what: (
                    <div className="cmd-desc">
                        reg = reg * val (целочисленно). DIV выполняет целочисленное деление с отбрасыванием остатка.<br />
                        DIV на ноль: CE=1, стоп.<br />
                        Флаги: обновляет ZF и OF.
                    </div>
                ),
                examples: ['mul ax 2', 'div bx cx'],
            },
            {
                instr: (
                    <>
                        <span className="cmd-name">INC</span> <code className="cmd-args">[reg]</code><br /><br />
                        <span className="cmd-name">DEC</span> <code className="cmd-args">[reg]</code>
                    </>
                ),
                what: (
                    <div className="cmd-desc">
                        Увеличивает или уменьшает регистр на 1. То же самое что add/sub с константой 1, просто короче.<br />
                        Флаги: обновляет ZF и OF.
                    </div>
                ),
                examples: ['inc ax', 'dec cx'],
            },
            {
                instr: <><span className="cmd-name">NEG</span><br /><code className="cmd-args">[reg]</code></>,
                what: (
                    <div className="cmd-desc">
                        Меняет знак: reg = -reg. Реализовано через побитовое дополнение.<br />
                        Флаги: обновляет ZF и OF.
                    </div>
                ),
                examples: ['neg ax'],
            },
        ],
    },
    {
        title: '3. Побитовая логика',
        rows: [
            {
                instr: (
                    <>
                        <span className="cmd-name">AND</span><br />
                        <span className="cmd-name">OR</span><br />
                        <span className="cmd-name">XOR</span>
                        <br /><code className="cmd-args">[val1] [val2]</code>
                    </>
                ),
                what: (
                    <div className="cmd-desc">
                        Побитовая операция над двумя операндами.<br />
                        <span className="highlight-yellow">Результат всегда записывается в CX,</span> исходные операнды остаются без изменений.<br />
                        Флаги: OF не обновляется.
                    </div>
                ),
                examples: ['and ax bx', 'xor ax ax'],
            },
            {
                instr: <><span className="cmd-name">NOT</span><br /><code className="cmd-args">[reg]</code></>,
                what: (
                    <div className="cmd-desc">
                        Инвертирует все биты регистра.<br />
                        Флаги: обновляет ZF и OF.
                    </div>
                ),
                examples: ['not ax'],
            },
        ],
    },
    {
        title: '4. Ветвления и циклы',
        rows: [
            {
                instr: <><span className="cmd-name">CMP</span><br /><code className="cmd-args">[val1] [val2]</code></>,
                what: (
                    <div className="cmd-desc">
                        Сравнивает два значения. Сами операнды не меняются.<br />
                        Флаги: ZF=1 если val1 == val2, ZF=0 иначе.<br />
                        Обычно используется перед условным прыжком.
                    </div>
                ),
                examples: ['cmp cx 0'],
            },
            {
                instr: <><span className="cmd-name">JMP</span><br /><code className="cmd-args">[addr]</code></>,
                what: (
                    <div className="cmd-desc">
                        Безусловный переход: IP = addr.<br />
                        addr должен находиться внутри сегмента кода (&gt;= 342 и &lt; 512), иначе возникает ошибка и остановка.<br />
                        Флаги игнорирует.
                    </div>
                ),
                examples: ['jmp 342'],
            },
            {
                instr: <><span className="cmd-name">JCX</span><br /><code className="cmd-args">[addr]</code></>,
                what: (
                    <div className="cmd-desc">
                        Прыгает на addr только если CX == 0. Иначе переходит к следующей инструкции.<br />
                        Читает прямо из регистра CX, не из флагов.<br />
                        Флаги не меняет.
                    </div>
                ),
                examples: ['jcx 351'],
            },
            {
                instr: <><span className="cmd-name">LOOP</span><br /><code className="cmd-args">[addr]</code></>,
                what: (
                    <div className="cmd-desc">
                        Уменьшает CX на 1, затем если CX &gt; 0 прыгает на addr.<br />
                        Тело цикла выполняется пока CX был &gt; 1 до декремента.<br />
                        При CX = 1: декрементируем до 0, условие не выполняется, выходим из цикла.<br />
                        <span className="highlight-yellow">Заходить в LOOP с CX = 0 не нужно: просто пропустит прыжок и пойдёт дальше.</span>
                    </div>
                ),
                examples: ['loop 342'],
            },
            {
                instr: (
                    <>
                        <span className="cmd-name">CALL</span> <code className="cmd-args">[addr]</code><br /><br />
                        <span className="cmd-name">RET</span>
                    </>
                ),
                what: (
                    <div className="cmd-desc">
                        CALL сохраняет текущий IP на стек и прыгает на addr.<br />
                        RET снимает адрес со стека и возвращается туда.<br />
                        Дисбаланс CALL/RET приведёт к Stack Overflow или Underflow.<br />
                        Флаги не меняет.
                    </div>
                ),
                examples: ['call 400', 'ret'],
            },
        ],
    },
    {
        title: '5. Прерывания (I/O)',
        rows: [
            {
                instr: <><span className="cmd-name">INT</span><br /><code className="cmd-args">[0 или 1]</code></>,
                what: (
                    <div className="cmd-desc">
                        Системный вызов для ввода-вывода через регистр BX.<br /><br />
                        <b>INT 0</b> читает значение из буфера ввода и записывает в memory[BX].
                        Если буфер пуст, возникает ошибка и остановка.<br /><br />
                        <b>INT 1</b> читает memory[BX] и выводит значение в консоль.<br /><br />
                        BX должен указывать на валидный адрес в DS (172-341). Любой другой код прерывания вызывает ошибку.<br />
                        Флаги не меняет.
                    </div>
                ),
                examples: ['mov bx 172', 'int 1'],
            },
            {
                instr: <span className="cmd-name">END</span>,
                what: (
                    <div className="cmd-desc">
                        Завершает программу: is_run = False, в консоль пишет "Программа завершена".<br />
                        Без END программа упадёт на первой пустой ячейке памяти после кода.
                    </div>
                ),
                examples: ['end'],
            },
        ],
    },
];

export default function HelpsSimcom() {
    return (
        <>
            <div className="isa-intro">
                <h3 className="isa-intro-title">Система команд SimCom</h3>
                <p>
                    Ассемблероподобный язык для SimCom. 16-битный, знаковый. Одна строка представляет собой одну инструкцию.
                    Операнды разделяются пробелом, всё в нижнем регистре.
                    Набор команд я собирал постепенно: брал только то, что нужно для реальных учебных задач.
                </p>
            </div>

            <table className="table-cyber">
                <thead>
                    <tr>
                        <th className="th-instr">ИНСТРУКЦИЯ</th>
                        <th className="th-what">ЧТО ДЕЛАЕТ</th>
                        <th className="th-example">ПРИМЕР</th>
                    </tr>
                </thead>
                <tbody>
                    {isaCategories.map((cat) => (
                        // каждая категория: заголовок-разделитель + строки команд
                        <>
                            <tr key={cat.title} className="category-header">
                                <td colSpan={3}>{cat.title}</td>
                            </tr>
                            {cat.rows.map((row, i) => (
                                <tr key={`${cat.title}-${i}`}>
                                    <td>{row.instr}</td>
                                    <td>{row.what}</td>
                                    <td>
                                        {row.examples.map((ex, j) => (
                                            <code
                                                key={j}
                                                className={'cmd-example' + (j > 0 ? ' cmd-example-mt' : '')}
                                            >
                                                {ex}
                                            </code>
                                        ))}
                                    </td>
                                </tr>
                            ))}
                        </>
                    ))}
                </tbody>
            </table>
        </>
    );
}
