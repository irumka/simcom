# адреса сегментов памяти: зашиты жёстко, не меняются во время работы
MEM_SIZE = 512
CS_START = 342   # code segment: сюда загружается программа
DS_START = 172   # data segment: рабочая память для переменных
SS_START = 171   # stack segment: стек растёт вниз от этого адреса

# эти регистры менять из кода нельзя, они системные
PROTECTED_REGS = ['cs', 'ds', 'ss', 'sp', 'ip', 'zf', 'of', 'ce', 'ci', 'ir', 'nt']

# регистры общего назначения, разрешённые как операнды в арифметике
# добавил si и di позже: без них нормально работать с массивами невозможно
GP_REGS = ['ax', 'bx', 'cx', 'dx', 'si', 'di']


class SimPC:
    def __init__(self):
        # is_ready: программа ещё не запущена, ждём нажатия "Начать"
        # is_run:   программа сейчас выполняется, шаг за шагом
        self.is_ready = True
        self.is_run = False

        # память: список из 512 ячеек, изначально пустых
        self.memory = []
        self.gen_mem()

        # stream_in:  буфер ввода, сюда юзер заранее кладёт числа для INT 0
        # stream_out: лог вывода, туда идут результаты INT 1 и сообщения об ошибках
        self.stream_in = []
        self.stream_out = []

        # регистры процессора: общего назначения, указатели, флаги
        self.registers = {
            'ci': 0,  # current instruction: текущая инструкция
            'ax': 0,  # accumulator: главный рабочий регистр
            'bx': 0,  # base: адресный регистр для INT и косвенной адресации
            'cx': 0,  # counter: счётчик циклов
            'dx': 0,  # data: буфер для промежуточных значений
            'cs': 0,  # code segment начало
            'ds': 0,  # data segment начало
            'ss': 0,  # stack segment начало
            'sp': 0,  # stack pointer: вершина стека
            # bp пока не использую, заложил на будущее для нормальных функций
            # (stack frame: сохранение bp при входе в подпрограмму, восстановление при выходе)
            'bp': 0,  # base pointer: зарезервирован для стековых кадров
            'si': 0,  # source index: источник при операциях с памятью и арифметике
            'di': 0,  # destination index: приёмник при операциях с памятью и арифметике
            'ip': 0,  # instruction pointer: адрес следующей команды
            'ir': 0,  # interrupt register
            'zf': 0,  # zero flag: результат был нулём
            'of': 0,  # overflow flag: вышли за 16 бит
            'nt': 0,  # не используется
            'ce': 0,  # critical error: была критическая ошибка
        }

        # словарь всех поддерживаемых команд: имя команды -> метод
        self.coms = {
            'r_stream_in':  self.input_stream_in,
            'p_stream_out': self.print_stream_out,
            'mov':  self.mov,
            'push': self.push,
            'pop':  self.pop,
            'add':  self.add,
            'sub':  self.sub,
            'inc':  self.inc,
            'dec':  self.dec,
            'cmp':  self.cmp,
            'neg':  self.neg,
            'mul':  self.mul,
            'div':  self.div,
            'and':  self._and,
            'or':   self._or,
            'xor':  self._xor,
            'not':  self._not,
            'jmp':  self.jmp,
            'jcx':  self.jcx,
            'int':  self._int,
            'call': self.call,
            'ret':  self.ret,
            'loop': self.loop,
            'end':  self.end,
        }

        self.reset()

    # пытаемся превратить строку в число, если не получилось, возвращаем None
    def to_int(self, v):
        try:
            return int(v)
        except (ValueError, TypeError):
            return None

    # обрезаем результат до 16-битного знакового диапазона и обновляем флаги
    # реальный процессор делает то же самое аппаратно
    def math_op(self, raw):
        # 0x8000 это 32768. долго выводил эту формулу для 16-битного знака, вроде работает честно
        val = (raw + 0x8000) % 0x10000 - 0x8000
        # print("math_op raw:", raw, "val:", val)  # отлаживал переполнение, оставлю на всякий
        # zf = 1 если результат нулевой
        self.registers['zf'] = 1 if val == 0 else 0
        # of = 1 если произошло переполнение (число не влезло в 16 бит)
        self.registers['of'] = 1 if raw != val else 0
        return val

    # получаем значение аргумента: либо имя регистра, либо число
    # косвенная адресация обрабатывается отдельно в mov
    def get_val(self, arg):
        if arg in self.registers:
            return self.registers[arg]
        v = self.to_int(arg)
        if v is None:
            raise ValueError(f'недопустимый операнд: {arg}')
        return v

    # заполняем память пустыми строками и ставим системные обработчики прерываний
    def gen_mem(self):
        self.memory = [''] * MEM_SIZE
        # адреса 0 и 1 зарезервированы под INT 0 и INT 1
        self.memory[0] = 'r_stream_in'
        self.memory[1] = 'p_stream_out'

    def add_text_to_stream_output(self, text, kind):
        # kind: 'i' = info (голубой), 'e' = error (красный), 'w' = warning (жёлтый)
        self.stream_out.append((text, kind))

    def clear_stream_output(self):
        self.stream_out.clear()

    def clear_stream_input(self):
        self.stream_in.clear()

    # сбрасываем память в начальное состояние
    def reset_mem(self):
        self.memory = [''] * MEM_SIZE
        self.memory[0] = 'r_stream_in'
        self.memory[1] = 'p_stream_out'

    # полный сброс: память, регистры, потоки ввода-вывода
    def reset(self):
        self.is_ready = True
        self.is_run = False
        self.reset_mem()
        self.clear_stream_output()
        self.clear_stream_input()

        # обнуляем все регистры
        for reg in self.registers:
            self.registers[reg] = 0

        # выставляем начальные адреса сегментов
        self.registers['cs'] = CS_START
        self.registers['ds'] = DS_START
        self.registers['ss'] = SS_START
        self.registers['sp'] = SS_START  # стек начинается с вершины ss
        self.registers['bp'] = SS_START
        self.registers['ip'] = CS_START  # первая команда в начале cs

    # загружаем программу в память начиная с адреса CS_START
    def put_mem_from_code_lst(self, code_lst):
        max_lines = MEM_SIZE - self.registers['cs']
        if len(code_lst) > max_lines:
            self.add_text_to_stream_output(
                f'Ошибка: программа не помещается в память '
                f'({len(code_lst)} строк, максимум {max_lines})', 'e'
            )
            return

        # каждую строку разбиваем на токены и кладём в ячейку памяти
        for i in range(len(code_lst)):
            self.memory[self.registers['cs'] + i] = code_lst[i].split()

    # проверяем, можно ли писать по этому адресу памяти через MOV
    # нельзя: системная область (0-1) и сегмент кода (cs и выше)
    # стек изолирован от MOV: доступ только через PUSH/POP
    def _mem_access_ok(self, addr):
        if addr <= 1:
            return False
        if addr >= self.registers['cs']:
            return False
        # адрес должен быть в DS
        if addr < self.registers['ds']:
            return False
        return True

    # INT 1: выводим значение из памяти по адресу BX в терминал
    def print_stream_out(self):
        bx = self.registers['bx']
        if not self._mem_access_ok(bx):
            self.add_text_to_stream_output('Ошибка: нарушение доступа к памяти', 'e')
            self.is_run = False
            return
        self.add_text_to_stream_output(str(self.memory[bx]), 'i')

    # INT 0: читаем число из буфера ввода и кладём в память по адресу BX
    def input_stream_in(self):
        bx = self.registers['bx']
        if not self._mem_access_ok(bx):
            self.add_text_to_stream_output('Ошибка: нарушение доступа к памяти', 'e')
            self.is_run = False
            return
        # если буфер пуст, программу нельзя продолжить
        if not self.stream_in:
            self.add_text_to_stream_output('Внимание: буфер ввода пуст', 'e')
            self.is_run = False
            return
        self.memory[bx] = self.stream_in.pop(0)

    def check_invariants(self):
            """
            Проверяет все системные инварианты после каждой инструкции.
            Нарушение инварианта означает баг в эмуляторе.
            Документация: INVARIANTS.md
            """
            errors = []
    
            # I-1: инвариант стека - SP всегда в диапазоне [2, SS_START]
            sp = self.registers['sp']
            if not (2 <= sp <= SS_START):
                errors.append(f'I-1 нарушен: SP={sp} вне диапазона [2, {SS_START}]')
    
            # I-2: инвариант защиты кода - в CS нет числовых значений (только инструкции)
            for addr in range(CS_START, MEM_SIZE):
                if isinstance(self.memory[addr], (int, float)):
                    errors.append(f'I-2 нарушен: числовое значение в CS по адресу {addr}')
                    break
    
            # I-3: инвариант ALU - регистры общего назначения в 16-битном диапазоне
            for reg in GP_REGS:
                val = self.registers[reg]
                if not (-32768 <= val <= 32767):
                    errors.append(f'I-3 нарушен: {reg.upper()}={val} вне [-32768, 32767]')
    
            # I-4: инвариант IP - во время выполнения IP внутри CS
            if self.is_run:
                ip = self.registers['ip']
                if not (CS_START <= ip < MEM_SIZE):
                    errors.append(f'I-4 нарушен: IP={ip} вне CS [{CS_START}, {MEM_SIZE})')
    
            # I-5: инвариант сегментных регистров - CS, DS, SS не меняются
            if self.registers['cs'] != CS_START:
                errors.append(f'I-5 нарушен: CS изменён ({self.registers["cs"]} != {CS_START})')
            if self.registers['ds'] != DS_START:
                errors.append(f'I-5 нарушен: DS изменён ({self.registers["ds"]} != {DS_START})')
            if self.registers['ss'] != SS_START:
                errors.append(f'I-5 нарушен: SS изменён ({self.registers["ss"]} != {SS_START})')
    
            for msg in errors:
                self.add_text_to_stream_output(f'[ИНВАРИАНТ] {msg}', 'e')
            if errors:
                self.registers['ce'] = 1
                self.is_run = False
                
                # проверяем инварианты после каждой инструкции
                self.check_invariants()
    # один такт процессора: выборка + декодирование + исполнение
    def run_step(self):
        ip = self.registers['ip']
        # print("run_step: ip =", ip, "sp =", self.registers['sp'])  # для отладки шагов

        # проверяем что IP не ушёл за пределы памяти
        if ip < 0 or ip >= MEM_SIZE:
            self.add_text_to_stream_output('Ошибка: IP вышел за пределы памяти', 'e')
            self.registers['ce'] = 1
            self.is_run = False
            return

        # fetch: читаем инструкцию из памяти
        self.registers['ci'] = self.memory[ip]

        # сразу сдвигаем IP на следующую ячейку
        self.registers['ip'] += 1

        cur = self.registers['ci']

        # проверяем что ячейка не пустая
        if not cur or not isinstance(cur, list):
            self.add_text_to_stream_output('Ошибка: попытка исполнить пустую ячейку', 'e')
            self.registers['ce'] = 1
            self.is_run = False
            return

        # decode + execute: ищем команду в словаре и вызываем нужный метод
        cmd = cur[0]
        try:
            if cmd in self.coms:
                self.coms[cmd]()
            else:
                self.add_text_to_stream_output(f'неизвестная инструкция: {cmd}', 'e')
                self.is_run = False
        except ValueError as e:
            self.add_text_to_stream_output(str(e), 'e')
            self.is_run = False
        except Exception as e:
            self.add_text_to_stream_output(f'сбой выполнения: {e}', 'e')
            self.registers['ce'] = 1
            self.is_run = False
        # проверяем инварианты после каждой инструкции
        self.check_invariants()
    # mov: пересылка данных
    # mov reg val    - пишем значение в регистр
    # mov addr val   - пишем в ячейку памяти по прямому адресу
    # mov reg [breg] - косвенная адресация: читаем из памяти по адресу в breg
    def mov(self):
        cur = self.registers['ci']
        if len(cur) < 3:
            return self.throw_err('MOV требует 2 операнда')

        dst = cur[1]
        src = cur[2]

        # разбираем источник: [reg] означает косвенную адресацию через регистр
        if src.startswith('[') and src.endswith(']'):
            ptr_name = src[1:-1]
            if ptr_name not in self.registers:
                return self.throw_err(f'MOV: неизвестный регистр в косвенном операнде: {ptr_name}')
            ptr_addr = self.registers[ptr_name]
            if not self._mem_access_ok(ptr_addr):
                return self.throw_err(f'MOV: нарушение доступа при косвенном чтении (адрес {ptr_addr})')
            src_val = self.memory[ptr_addr]
            # если ячейка пустая, читаем как 0
            src_val = self.to_int(src_val) if src_val != '' else 0
            if src_val is None:
                src_val = 0
        else:
            src_val = self.get_val(src)

        dst_addr = self.to_int(dst)

        if dst_addr is not None:
            # первый аргумент число, значит это прямой адрес в памяти
            if not self._mem_access_ok(dst_addr):
                return self.throw_err('нарушение доступа при записи (MOV)')
            self.memory[dst_addr] = src_val
        else:
            # первый аргумент: имя регистра
            if dst not in self.registers:
                return self.throw_err('первый аргумент MOV: недопустимый регистр')
            if dst in PROTECTED_REGS:
                return self.throw_err(f'нельзя менять системный регистр {dst.upper()}')
            self.registers[dst] = src_val

    # push: кладём значение на стек
    def push(self):
        cur = self.registers['ci']
        if len(cur) < 2:
            return self.throw_err('PUSH требует 1 операнд')
        val = self.get_val(cur[1])
        # проверяем что стек не переполнен
        if self.registers['sp'] <= 2:
            return self.throw_err('Stack Overflow')
        self.registers['sp'] -= 1
        self.memory[self.registers['sp']] = val

    # pop: снимаем значение со стека в регистр
    def pop(self):
        cur = self.registers['ci']
        if len(cur) < 2:
            return self.throw_err('POP требует 1 операнд')
        dst = cur[1]
        if dst not in self.registers:
            return self.throw_err('недопустимый регистр')
        if dst in PROTECTED_REGS:
            return self.throw_err(f'нельзя менять системный регистр {dst.upper()}')
        # проверяем что стек не пустой
        if self.registers['sp'] >= SS_START:
            return self.throw_err('Stack Underflow')
        self.registers[dst] = self.memory[self.registers['sp']]
        self.registers['sp'] += 1

    # вспомогательная проверка для арифметических команд:
    # первый аргумент должен быть регистром общего назначения (включая si, di)
    def _check_math_dst(self, cmd_name, reg_name):
        if reg_name not in self.registers:
            return self.throw_err(f'первый аргумент {cmd_name} должен быть регистром')
        if reg_name in PROTECTED_REGS:
            return self.throw_err(f'нельзя менять системный регистр {reg_name.upper()}')
        # bp не участвует в арифметике, только стековые кадры в будущем
        if reg_name == 'bp':
            return self.throw_err('BP зарезервирован, используйте ax/bx/cx/dx/si/di')
        return None

    # add: сложение reg = reg + val
    def add(self):
        cur = self.registers['ci']
        if len(cur) < 3:
            return self.throw_err('ADD требует 2 операнда')
        err = self._check_math_dst('ADD', cur[1])
        if err is not None:
            return err
        result = self.registers[cur[1]] + self.get_val(cur[2])
        self.registers[cur[1]] = self.math_op(result)

    # sub: вычитание reg = reg - val
    def sub(self):
        cur = self.registers['ci']
        if len(cur) < 3:
            return self.throw_err('SUB требует 2 операнда')
        err = self._check_math_dst('SUB', cur[1])
        if err is not None:
            return err
        result = self.registers[cur[1]] - self.get_val(cur[2])
        self.registers[cur[1]] = self.math_op(result)

    # inc: увеличиваем регистр на 1
    def inc(self):
        cur = self.registers['ci']
        if len(cur) < 2:
            return self.throw_err('INC требует 1 операнд')
        r = cur[1]
        if r not in self.registers:
            return self.throw_err(f'INC: "{r}" не является регистром')
        if r in PROTECTED_REGS:
            return self.throw_err(f'нельзя менять системный регистр {r.upper()}')
        if r == 'bp':
            return self.throw_err('BP зарезервирован, используйте ax/bx/cx/dx/si/di')
        self.registers[r] = self.math_op(self.registers[r] + 1)

    # dec: уменьшаем регистр на 1
    def dec(self):
        cur = self.registers['ci']
        if len(cur) < 2:
            return self.throw_err('DEC требует 1 операнд')
        r = cur[1]
        if r not in self.registers:
            return self.throw_err(f'DEC: "{r}" не является регистром')
        if r in PROTECTED_REGS:
            return self.throw_err(f'нельзя менять системный регистр {r.upper()}')
        if r == 'bp':
            return self.throw_err('BP зарезервирован, используйте ax/bx/cx/dx/si/di')
        self.registers[r] = self.math_op(self.registers[r] - 1)

    # cmp: сравниваем два значения, результат только в ZF
    def cmp(self):
        cur = self.registers['ci']
        if len(cur) < 3:
            return self.throw_err('CMP требует 2 операнда')
        if self.get_val(cur[1]) == self.get_val(cur[2]):
            self.registers['zf'] = 1
        else:
            self.registers['zf'] = 0

    # neg: меняем знак, reg = -reg
    def neg(self):
        cur = self.registers['ci']
        if len(cur) < 2:
            return self.throw_err('NEG требует 1 операнд')
        r = cur[1]
        err = self._check_math_dst('NEG', r)
        if err is not None:
            return err
        self.registers[r] = self.math_op(-self.registers[r])

    # mul: умножение reg = reg * val
    def mul(self):
        cur = self.registers['ci']
        if len(cur) < 3:
            return self.throw_err('MUL требует 2 операнда')
        err = self._check_math_dst('MUL', cur[1])
        if err is not None:
            return err
        result = self.registers[cur[1]] * self.get_val(cur[2])
        self.registers[cur[1]] = self.math_op(result)

    # div: целочисленное деление reg = reg // val
    def div(self):
        cur = self.registers['ci']
        if len(cur) < 3:
            return self.throw_err('DIV требует 2 операнда')
        err = self._check_math_dst('DIV', cur[1])
        if err is not None:
            return err
        divisor = self.get_val(cur[2])
        # проверяем, не делит ли юзер на ноль
        if divisor == 0:
            self.registers['ce'] = 1
            return self.throw_err('деление на ноль')
        # print("div:", self.registers[cur[1]], "//", divisor)  # проверял результат деления
        result = self.registers[cur[1]] // divisor
        self.registers[cur[1]] = self.math_op(result)

    # and: побитовое И, результат в CX
    def _and(self):
        cur = self.registers['ci']
        if len(cur) < 3:
            return self.throw_err('AND требует 2 операнда')
        result = self.get_val(cur[1]) & self.get_val(cur[2])
        self.registers['cx'] = self.math_op(result)

    # or: побитовое ИЛИ, результат в CX
    def _or(self):
        cur = self.registers['ci']
        if len(cur) < 3:
            return self.throw_err('OR требует 2 операнда')
        result = self.get_val(cur[1]) | self.get_val(cur[2])
        self.registers['cx'] = self.math_op(result)

    # xor: исключающее ИЛИ, результат в CX
    def _xor(self):
        cur = self.registers['ci']
        if len(cur) < 3:
            return self.throw_err('XOR требует 2 операнда')
        result = self.get_val(cur[1]) ^ self.get_val(cur[2])
        self.registers['cx'] = self.math_op(result)

    # not: побитовое отрицание, меняет сам регистр
    def _not(self):
        cur = self.registers['ci']
        if len(cur) < 2:
            return self.throw_err('NOT требует 1 операнд')
        r = cur[1]
        if r not in self.registers:
            return self.throw_err(f'NOT: "{r}" не является регистром')
        if r in PROTECTED_REGS:
            return self.throw_err(f'нельзя менять системный регистр {r.upper()}')
        self.registers[r] = self.math_op(~self.registers[r])

    # jmp: безусловный прыжок на адрес
    def jmp(self):
        cur = self.registers['ci']
        if len(cur) < 2:
            return self.throw_err('JMP требует 1 операнд')
        target = self.get_val(cur[1])
        # адрес должен быть внутри сегмента кода
        if target < self.registers['cs'] or target >= MEM_SIZE:
            return self.throw_err('нарушение доступа (прыжок за пределы кода)')
        self.registers['ip'] = target

    # jcx: прыгаем только если CX равен нулю
    def jcx(self):
        cur = self.registers['ci']
        if len(cur) < 2:
            return self.throw_err('JCX требует 1 операнд')
        target = self.get_val(cur[1])
        if self.registers['cx'] == 0:
            self.registers['ip'] = target

    # int: системный вызов для ввода-вывода
    def _int(self):
        cur = self.registers['ci']
        if len(cur) < 2:
            return self.throw_err('INT требует 1 операнд')
        n = self.get_val(cur[1])
        # допустимы только INT 0 (ввод) и INT 1 (вывод)
        if n not in (0, 1):
            return self.throw_err('неверный номер прерывания (допустимо 0 или 1)')
        self.coms[self.memory[n]]()

    # call: вызов подпрограммы, сохраняем IP и прыгаем на адрес
    def call(self):
        cur = self.registers['ci']
        if len(cur) < 2:
            return self.throw_err('CALL требует 1 операнд')
        target = self.get_val(cur[1])
        if self.registers['sp'] <= 2:
            return self.throw_err('Stack Overflow')
        # сохраняем адрес возврата на стек
        self.registers['sp'] -= 1
        self.memory[self.registers['sp']] = self.registers['ip']
        self.registers['ip'] = target

    # ret: возврат из подпрограммы, берём адрес со стека
    def ret(self):
        if self.registers['sp'] >= SS_START:
            return self.throw_err('RET из пустого стека')
        # старая версия через pop ax не работала с вложенными call, переделал на прямую запись в ip
        # self.pop_ax_tmp = self.memory[self.registers['sp']]
        # self.registers['ax'] = self.pop_ax_tmp
        # self.registers['ip'] = self.registers['ax']
        self.registers['ip'] = self.memory[self.registers['sp']]
        self.registers['sp'] += 1

    # loop: декрементируем CX, затем прыгаем если CX != 0 (классическая семантика x86)
    # поведение: CX всегда уменьшается на 1, прыжок происходит только если CX после
    # декремента больше нуля. при CX=1 декремент даёт 0 и цикл завершается.
    def loop(self):
        cur = self.registers['ci']
        if len(cur) < 2:
            return self.throw_err('LOOP требует 1 операнд')
        target = self.get_val(cur[1])
        # сначала всегда уменьшаем
        self.registers['cx'] -= 1
        # прыгаем только если после декремента CX != 0
        if self.registers['cx'] != 0:
            self.registers['ip'] = target

    # end: завершаем программу штатно
    def end(self):
        self.is_run = False
        self.add_text_to_stream_output('Программа завершена', 'i')

    # выводим сообщение об ошибке, ставим флаг CE и останавливаем машину
    def throw_err(self, msg):
        self.add_text_to_stream_output(f'Ошибка: {msg}', 'e')
        self.registers['ce'] = 1
        self.is_run = False
