// страница справочника: Карта памяти (RAM Layout)
import '../styles/helps_ram.css';

export default function HelpsRam() {
    return (
        <>
            <h3 className="page-title">Адресное пространство SimCom</h3>
            <p className="page-intro">
                512 ячеек с линейной адресацией от 0 до 511. Никаких страниц и виртуальной памяти.
                Три сегмента жёстко зашиты в логику контроллера: я остановился именно на таком делении,
                потому что 170 ячеек на каждый сегмент дают достаточно места для учебных программ и при этом
                не позволяют стеку незаметно залезть в данные. Сама программа эти физические номера ячеек
                не видит: она обращается к своему сегменту смещением от нуля, а перевод в физический адрес
                делает MMU.
            </p>

            <table className="table-ram">
                <thead>
                    <tr>
                        <th className="th-addr">АДРЕСА</th>
                        <th className="th-seg">СЕГМЕНТ</th>
                        <th>ДОСТУП И НАЗНАЧЕНИЕ</th>
                    </tr>
                </thead>
                <tbody>

                    {/* зарезервированные векторы прерываний */}
                    <tr>
                        <td className="td-addr">
                            <span className="addr-range clr-muted">0 – 1</span>
                            <small className="addr-sub">зарезервировано</small>
                        </td>
                        <td className="seg-name clr-muted">Interrupt Vectors</td>
                        <td className="td-desc">
                            Зарезервировано. Здесь находятся системные обработчики прерываний INT 0 и INT 1.
                            Запись сюда из программы немедленно вызывает ошибку и останов.
                        </td>
                    </tr>

                    {/* сегмент стека */}
                    <tr>
                        <td className="td-addr">
                            <span className="addr-range clr-yellow">2 – 171</span>
                            <small className="addr-sub">170 ячеек</small>
                        </td>
                        <td className="seg-name clr-yellow">Stack Segment (SS)</td>
                        <td className="td-desc">
                            Стек растёт сверху вниз: от адреса 171 к адресу 2. SP при старте программы равняется 171.<br />
                            Прямой доступ закрыт: работа со стеком ведётся только через PUSH, POP, CALL и RET.<br />
                            Stack Overflow фиксируется при SP ниже или равном 2 (стек затёр бы векторы прерываний). Stack Underflow фиксируется при SP выше 171.
                        </td>
                    </tr>

                    {/* сегмент данных */}
                    <tr>
                        <td className="td-addr">
                            <span className="addr-range clr-cyan">172 – 341</span>
                            <small className="addr-sub">170 ячеек</small>
                        </td>
                        <td className="seg-name clr-cyan">Data Segment (DS)</td>
                        <td className="td-desc">
                            Рабочая память: сюда записываются переменные и промежуточные данные через MOV.<br />
                            Программа обращается к DS не абсолютным адресом, а смещением от нуля: MMU сам добавляет физическую базу 172.
                            Прерывания INT 0 и INT 1 также работают через этот сегмент: BX хранит именно смещение внутри DS, а не адрес 172-341.
                        </td>
                    </tr>

                    {/* сегмент кода */}
                    <tr>
                        <td className="td-addr">
                            <span className="addr-range clr-green">342 – 511</span>
                            <small className="addr-sub">170 ячеек</small>
                        </td>
                        <td className="seg-name clr-green">Code Segment (CS)</td>
                        <td className="td-desc">
                            Доступен процессору только для чтения. Сюда загружается программа при нажатии «Начать выполнение».<br />
                            IP всегда указывает в этот диапазон. Попасть сюда через MOV невозможно в принципе: и прямой адрес, и косвенная адресация всегда переводятся MMU в DS или SS, до CS они просто не достают.
                        </td>
                    </tr>

                </tbody>
            </table>

            {/* блок с причинами аварийной остановки */}
            <div className="error-note">
                <div className="error-note-title">Что вызывает аварийную остановку</div>
                <p className="error-note-item">
                    <b className="clr-red">IP вышел за границы CS</b>: попытка выполнить инструкцию по адресу ниже 342 или выше 511.
                </p>
                <p className="error-note-item">
                    <b className="clr-red">MOV в CS</b>: невозможен структурно, а не запрещён проверкой. И прямой адрес, и [bx]/[si]/[di] MMU всегда переводит в DS, до CS они не дотягиваются.
                </p>
                <p className="error-note-item">
                    <b className="clr-red">Stack Overflow</b>: PUSH, когда SP опускается до 2 или ниже (стек залез бы в векторы прерываний).
                </p>
                <p className="error-note-item last">
                    <b className="clr-red">Неверный адрес в INT</b>: BX указывает на смещение за пределами DS (0-169). MMU кидает нарушение доступа, а не молча берёт соседнюю ячейку.
                </p>
            </div>

            {/* информационный блок со стандартными адресами */}
            <div className="info-note">
                <div className="info-note-title">Как читать адреса в примерах</div>
                <p className="info-note-body">
                    С точки зрения программы адрес всегда смещение от начала своего сегмента: 0 значит первую ячейку, физическую базу добавляет MMU.
                    Результат обычно кладут по смещению <code className="highlight-green">0</code> в DS (физически это те же 172), а переходы считают от начала CS: <code className="highlight-green">0</code> - это первая строка программы.
                    Например: <code className="highlight-cyan">mov 0 ax</code> сохраняет AX в первую ячейку DS, <code className="highlight-cyan">jmp 3</code> прыгает на четвёртую строку программы (смещение 3, считая с нуля).
                </p>
            </div>
        </>
    );
}
