// страница справочника: архитектура simcom (схема + таблица узлов)

import '../styles/helps_arch.css';

// данные узлов вынесены сюда, чтобы не громоздить разметку
const hardwareNodes = [
    {
        name: 'CPU',
        nameClass: 'clr-cyan',
        sub: 'процессор',
        type: 'Computing Unit',
        desc: 'Выполняет по одной инструкции за такт. Внутри располагаются АЛУ для арифметики и логики, блок декодирования опкодов и 18 регистров. После каждой инструкции обновляет флаги и сдвигает IP.',
    },
    {
        name: 'RAM 512W',
        nameClass: 'clr-green',
        sub: 'оперативная память',
        type: 'Storage Unit',
        desc: '512 ячеек, каждая хранит одно 16-битное значение. Разделена на три сегмента: стек (SS), данные (DS), код (CS). Запись в CS вызывает аварийную остановку.',
    },
    {
        name: 'I/O',
        nameClass: 'clr-yellow',
        sub: 'ввод / вывод',
        type: 'Peripheral Unit',
        desc: 'Два буфера: Stream In (очередь ввода) и Stream Out (лог вывода). Доступ возможен только через прерывания INT 0 / INT 1. Прямая запись в буферы из кода невозможна.',
    },
];

const busNodes = [
    {
        name: 'Address Bus',
        nameClass: '',
        sub: null,
        type: 'Шина адреса',
        desc: '9 бит, поскольку ровно столько нужно чтобы адресовать 512 ячеек (2^9 = 512). Процессор выставляет адрес, контроллер активирует нужную ячейку.',
    },
    {
        name: 'Data Bus',
        nameClass: '',
        sub: null,
        type: 'Шина данных',
        desc: '16-битная двунаправленная шина служит главным транспортом системы. Гоняет значения между регистрами, памятью и АЛУ.',
    },
    {
        name: 'Control Bus',
        nameClass: '',
        sub: null,
        type: 'Шина управления',
        desc: 'Read Enable, Write Enable и Interrupt Request. Первые две управляют режимом RAM, третья отвечает за I/O через INT.',
    },
];

export default function HelpsArch() {
    return (
        <>
            <h3 className="page-title">Как это устроено?</h3>
            <p className="page-intro">
                SimCom построен по принципам архитектуры фон Неймана (программа и данные живут в одной памяти).
                Память разделена на сегменты с жёсткими правилами доступа именно потому, что без этого
                процессор легко перезаписывал собственный код и падал в неочевидных местах.
                Ниже показано, из каких узлов состоит машина и как они связаны.
            </p>

            {/* схема: узлы и шины */}
            <div className="arch-diagram">
                <div className="arch-node node-io">
                    <div className="arch-node-label lbl-yellow">ВВОД</div>
                    Stream In
                    <div className="arch-node-sub">INT 0</div>
                </div>

                <div className="arch-bus" />

                <div className="arch-node node-wide">
                    <div className="arch-node-label lbl-cyan">ПРОЦЕССОР</div>
                    CPU + АЛУ
                    <div className="arch-node-sub">18 регистров</div>
                </div>

                <div className="arch-bus" />

                <div className="arch-node node-ram">
                    <div className="arch-node-label lbl-green">ПАМЯТЬ</div>
                    RAM 512W
                    <div className="arch-node-sub">CS / DS / SS</div>
                </div>

                <div className="arch-bus bus-reversed" />

                <div className="arch-node node-io">
                    <div className="arch-node-label lbl-yellow">ВЫВОД</div>
                    Stream Out
                    <div className="arch-node-sub">INT 1</div>
                </div>
            </div>

            {/* таблица с описанием узлов */}
            <table className="table-cyber">
                <thead>
                    <tr>
                        <th className="th-node">УЗЕЛ</th>
                        <th className="th-type">ТИП</th>
                        <th>НАЗНАЧЕНИЕ</th>
                    </tr>
                </thead>
                <tbody>

                    <tr className="row-group">
                        <td colSpan={3}>Аппаратные узлы</td>
                    </tr>

                    {hardwareNodes.map((n) => (
                        <tr key={n.name}>
                            <td className="td-node">
                                <span className={`node-name ${n.nameClass}`}>{n.name}</span>
                                {n.sub && <small className="node-sub">{n.sub}</small>}
                            </td>
                            <td className="td-type">{n.type}</td>
                            <td className="td-desc">{n.desc}</td>
                        </tr>
                    ))}

                    <tr className="row-group">
                        <td colSpan={3}>Шины</td>
                    </tr>

                    {busNodes.map((n) => (
                        <tr key={n.name}>
                            <td className="td-node">
                                <span className="node-name">{n.name}</span>
                            </td>
                            <td className="td-type">{n.type}</td>
                            <td className="td-desc">{n.desc}</td>
                        </tr>
                    ))}

                </tbody>
            </table>

            {/* примечание */}
            <div className="arch-note">
                <div className="arch-note-title">Примечание</div>
                <p className="arch-note-body">
                    Реальный процессор работает с электрическими сигналами, SimCom работает с вызовами Python-методов и списками.
                    Суть та же: те же сегменты, те же правила доступа, тот же цикл выборка - декодирование - выполнение. Просто без паяльника.
                </p>
            </div>
        </>
    );
}
