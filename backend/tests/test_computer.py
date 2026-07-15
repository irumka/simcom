"""
Тесты для эмулятора SimC (computer.py).

Структура:
- TestMMU               - блок трансляции адресов памяти
- TestInitialState      - состояние машины сразу после создания
- TestResetRestart      - reset() и restart()
- TestMemoryLoading     - загрузка программы в память
- TestMov               - инструкция MOV (прямая и косвенная адресация)
- TestStack             - PUSH / POP
- TestArithmetic        - ADD / SUB / INC / DEC / NEG / MUL / DIV
- TestBitwise           - AND / OR / XOR / NOT
- TestCompareAndJumps   - CMP / JMP / JCX / JZ
- TestInterrupts        - INT 0 (ввод) / INT 1 (вывод)
- TestCallRet           - CALL / RET
- TestLoop              - LOOP
- TestEndAndErrors      - END, throw_err
- TestInvariants        - check_invariants (I-1 .. I-5)
- TestRunStepIntegration- полный цикл fetch-decode-execute через run_step
"""
import pytest

from computer import (
    SimPC,
    MMU,
    MemoryAccessViolation,
    InvariantViolation,
    MEM_SIZE,
    CS_START,
    DS_START,
    SS_START,
    PROTECTED_REGS,
)


@pytest.fixture
def cpu():
    """Свежий процессор для каждого теста."""
    return SimPC()


def run_program(cpu, lines, max_steps=1000):
    """
    Загружает список строк-инструкций как программу и выполняет её,
    пока is_run не станет False (или пока не кончится лимит шагов -
    защита от зависания теста, если в программе баг).
    """
    cpu.put_mem_from_code_lst(lines)
    cpu.is_run = True
    steps = 0
    while cpu.is_run and steps < max_steps:
        cpu.run_step()
        steps += 1
    assert steps < max_steps, "программа не завершилась за отведённое число шагов"
    return cpu


# ---------------------------------------------------------------------------
# MMU
# ---------------------------------------------------------------------------
class TestMMU:
    def setup_method(self):
        self.mmu = MMU(MEM_SIZE, CS_START, DS_START, SS_START)

    def test_translate_ds_first_and_last_valid_offset(self):
        assert self.mmu.translate(DS_START, 0, 'ds') == DS_START
        last_valid = (CS_START - DS_START) - 1
        assert self.mmu.translate(DS_START, last_valid, 'ds') == DS_START + last_valid

    def test_translate_ds_out_of_range_raises(self):
        with pytest.raises(MemoryAccessViolation):
            self.mmu.translate(DS_START, CS_START - DS_START, 'ds')  # ровно на 1 больше максимума

    def test_translate_negative_offset_raises(self):
        with pytest.raises(MemoryAccessViolation):
            self.mmu.translate(DS_START, -1, 'ds')

    def test_translate_cs_bounds(self):
        assert self.mmu.translate(CS_START, 0, 'cs') == CS_START
        with pytest.raises(MemoryAccessViolation):
            self.mmu.translate(CS_START, MEM_SIZE - CS_START, 'cs')

    def test_check_range_ss_valid(self):
        # не должно бросать исключение
        self.mmu.check_range(2, 'ss')
        self.mmu.check_range(SS_START - 1, 'ss')

    def test_check_range_ss_invalid(self):
        with pytest.raises(MemoryAccessViolation):
            self.mmu.check_range(SS_START, 'ss')  # верхняя граница исключена
        with pytest.raises(MemoryAccessViolation):
            self.mmu.check_range(1, 'ss')  # адреса 0 и 1 зарезервированы под INT-таблицу


# ---------------------------------------------------------------------------
# Начальное состояние
# ---------------------------------------------------------------------------
class TestInitialState:
    def test_segment_registers(self, cpu):
        assert cpu.registers['cs'] == CS_START
        assert cpu.registers['ds'] == DS_START
        assert cpu.registers['ss'] == SS_START

    def test_sp_bp_ip_initial(self, cpu):
        assert cpu.registers['sp'] == SS_START
        assert cpu.registers['bp'] == SS_START
        assert cpu.registers['ip'] == CS_START

    def test_general_purpose_registers_start_at_zero(self, cpu):
        for reg in ('ax', 'bx', 'cx', 'dx', 'si', 'di'):
            assert cpu.registers[reg] == 0

    def test_flags_start_at_zero(self, cpu):
        assert cpu.registers['zf'] == 0
        assert cpu.registers['of'] == 0
        assert cpu.registers['ce'] == 0

    def test_interrupt_vectors_installed(self, cpu):
        assert cpu.memory[0] == 'r_stream_in'
        assert cpu.memory[1] == 'p_stream_out'

    def test_is_ready_not_running(self, cpu):
        assert cpu.is_ready is True
        assert cpu.is_run is False

    def test_all_commands_are_callable(self, cpu):
        for name, fn in cpu.coms.items():
            assert callable(fn), f'{name} должен быть вызываемым методом'


# ---------------------------------------------------------------------------
# reset / restart
# ---------------------------------------------------------------------------
class TestResetRestart:
    def test_reset_clears_registers_and_memory(self, cpu):
        cpu.registers['ax'] = 123
        cpu.memory[DS_START] = 999
        cpu.stream_out.append(('x', 'i'))
        cpu.stream_in.append(5)

        cpu.reset()

        assert cpu.registers['ax'] == 0
        assert cpu.memory[DS_START] == ''
        assert cpu.stream_out == []
        assert cpu.stream_in == []
        assert cpu.registers['ip'] == CS_START

    def test_restart_preserves_segment_registers(self, cpu):
        cpu.registers['ax'] = 42
        cpu.registers['ce'] = 1
        cpu.is_run = True

        cpu.restart()

        assert cpu.registers['ax'] == 0
        assert cpu.registers['ce'] == 0
        assert cpu.registers['cs'] == CS_START
        assert cpu.registers['ds'] == DS_START
        assert cpu.registers['ss'] == SS_START
        assert cpu.is_run is False
        assert cpu.is_ready is True

    def test_restart_wipes_ds_area(self, cpu):
        cpu.memory[DS_START] = 777
        cpu.restart()
        assert cpu.memory[DS_START] == ''


# ---------------------------------------------------------------------------
# Загрузка программы
# ---------------------------------------------------------------------------
class TestMemoryLoading:
    def test_program_loaded_at_cs(self, cpu):
        cpu.put_mem_from_code_lst(['mov ax 5', 'end'])
        assert cpu.memory[CS_START] == ['mov', 'ax', '5']
        assert cpu.memory[CS_START + 1] == ['end']

    def test_program_too_large_reports_error_and_is_not_loaded(self, cpu):
        max_lines = MEM_SIZE - CS_START
        too_big = ['end'] * (max_lines + 1)
        cpu.put_mem_from_code_lst(too_big)

        assert any('не помещается в память' in msg for msg, kind in cpu.stream_out)
        # память не должна была быть тронута этой операцией
        assert cpu.memory[CS_START] == ''


# ---------------------------------------------------------------------------
# MOV
# ---------------------------------------------------------------------------
class TestMov:
    def test_mov_register_immediate(self, cpu):
        cpu.registers['ci'] = ['mov', 'ax', '5']
        cpu.mov()
        assert cpu.registers['ax'] == 5

    def test_mov_register_from_register(self, cpu):
        cpu.registers['bx'] = 10
        cpu.registers['ci'] = ['mov', 'ax', 'bx']
        cpu.mov()
        assert cpu.registers['ax'] == 10

    def test_mov_ds_offset_immediate(self, cpu):
        cpu.registers['ci'] = ['mov', '0', '7']
        cpu.mov()
        assert cpu.memory[DS_START] == 7

    def test_mov_ds_offset_out_of_range(self, cpu):
        bad_offset = CS_START - DS_START  # на 1 больше валидного диапазона
        cpu.registers['ci'] = ['mov', str(bad_offset), '7']
        cpu.mov()
        assert cpu.registers['ce'] == 1
        assert cpu.is_run is False

    def test_mov_indirect_read_via_bx(self, cpu):
        cpu.memory[DS_START + 5] = 99
        cpu.registers['bx'] = 5
        cpu.registers['ci'] = ['mov', 'ax', '[bx]']
        cpu.mov()
        assert cpu.registers['ax'] == 99

    def test_mov_indirect_read_empty_cell_is_zero(self, cpu):
        cpu.registers['bx'] = 5  # ячейка ещё не инициализирована ('')
        cpu.registers['ci'] = ['mov', 'ax', '[bx]']
        cpu.mov()
        assert cpu.registers['ax'] == 0

    def test_mov_indirect_write_via_di(self, cpu):
        cpu.registers['di'] = 3
        cpu.registers['ax'] = 42
        cpu.registers['ci'] = ['mov', '[di]', 'ax']
        cpu.mov()
        assert cpu.memory[DS_START + 3] == 42

    def test_mov_indirect_via_bp_uses_stack_segment(self, cpu):
        cpu.registers['bp'] = SS_START - 1  # bp по умолчанию = SS_START, тут ставим валидный офсет для ss
        cpu.registers['ax'] = 11
        cpu.registers['ci'] = ['mov', '[bp]', 'ax']
        cpu.mov()
        assert cpu.memory[SS_START - 1] == 11

    def test_mov_indirect_unknown_register_errors(self, cpu):
        cpu.registers['ci'] = ['mov', 'ax', '[zz]']
        cpu.mov()
        assert cpu.registers['ce'] == 1

    @pytest.mark.parametrize('protected', PROTECTED_REGS)
    def test_mov_into_protected_register_forbidden(self, cpu, protected):
        cpu.registers['ci'] = ['mov', protected, '1']
        cpu.mov()
        assert cpu.registers['ce'] == 1
        assert cpu.is_run is False

    def test_mov_into_bp_forbidden(self, cpu):
        cpu.registers['ci'] = ['mov', 'bp', '1']
        cpu.mov()
        assert cpu.registers['ce'] == 1

    def test_mov_invalid_destination_name(self, cpu):
        cpu.registers['ci'] = ['mov', 'zz', '1']
        cpu.mov()
        assert cpu.registers['ce'] == 1

    def test_mov_missing_operand(self, cpu):
        cpu.registers['ci'] = ['mov', 'ax']
        cpu.mov()
        assert cpu.registers['ce'] == 1


# ---------------------------------------------------------------------------
# Стек: PUSH / POP
# ---------------------------------------------------------------------------
class TestStack:
    def test_push_decrements_sp_and_stores_value(self, cpu):
        sp_before = cpu.registers['sp']
        cpu.registers['ci'] = ['push', '5']
        cpu.push()
        assert cpu.registers['sp'] == sp_before - 1
        assert cpu.memory[cpu.registers['sp']] == 5

    def test_push_pop_roundtrip(self, cpu):
        cpu.registers['ci'] = ['push', '77']
        cpu.push()
        cpu.registers['ci'] = ['pop', 'ax']
        cpu.pop()
        assert cpu.registers['ax'] == 77

    def test_pop_into_protected_register_forbidden(self, cpu):
        cpu.registers['ci'] = ['push', '1']
        cpu.push()
        cpu.registers['ci'] = ['pop', 'cs']
        cpu.pop()
        assert cpu.registers['ce'] == 1

    def test_stack_overflow(self, cpu):
        capacity = SS_START - 2  # сколько значений реально влезает в SS
        for _ in range(capacity):
            cpu.registers['ci'] = ['push', '1']
            cpu.push()
        assert cpu.registers['ce'] == 0

        cpu.registers['ci'] = ['push', '1']
        cpu.push()
        assert cpu.registers['ce'] == 1
        assert any('Stack Overflow' in msg for msg, kind in cpu.stream_out)

    def test_stack_underflow(self, cpu):
        cpu.registers['ci'] = ['pop', 'ax']
        cpu.pop()
        assert cpu.registers['ce'] == 1
        assert any('Stack Underflow' in msg for msg, kind in cpu.stream_out)


# ---------------------------------------------------------------------------
# Арифметика
# ---------------------------------------------------------------------------
class TestArithmetic:
    def test_add(self, cpu):
        cpu.registers['ax'] = 2
        cpu.registers['ci'] = ['add', 'ax', '3']
        cpu.add()
        assert cpu.registers['ax'] == 5

    def test_sub(self, cpu):
        cpu.registers['ax'] = 5
        cpu.registers['ci'] = ['sub', 'ax', '3']
        cpu.sub()
        assert cpu.registers['ax'] == 2

    def test_inc_dec(self, cpu):
        cpu.registers['ax'] = 0
        cpu.registers['ci'] = ['inc', 'ax']
        cpu.inc()
        assert cpu.registers['ax'] == 1
        cpu.registers['ci'] = ['dec', 'ax']
        cpu.dec()
        assert cpu.registers['ax'] == 0

    def test_neg(self, cpu):
        cpu.registers['ax'] = 5
        cpu.registers['ci'] = ['neg', 'ax']
        cpu.neg()
        assert cpu.registers['ax'] == -5

    def test_mul(self, cpu):
        cpu.registers['ax'] = 6
        cpu.registers['ci'] = ['mul', 'ax', '7']
        cpu.mul()
        assert cpu.registers['ax'] == 42

    def test_div_truncates_toward_zero_positive(self, cpu):
        cpu.registers['ax'] = 7
        cpu.registers['ci'] = ['div', 'ax', '2']
        cpu.div()
        assert cpu.registers['ax'] == 3

    def test_div_truncates_toward_zero_negative(self, cpu):
        # -7 // 2 в Python даёт -4 (округление вниз), а x86 DIV усекает к нулю: -3
        cpu.registers['ax'] = -7
        cpu.registers['ci'] = ['div', 'ax', '2']
        cpu.div()
        assert cpu.registers['ax'] == -3

    def test_div_by_zero(self, cpu):
        cpu.registers['ax'] = 10
        cpu.registers['ci'] = ['div', 'ax', '0']
        cpu.div()
        assert cpu.registers['ce'] == 1
        assert cpu.is_run is False
        assert any('деление на ноль' in msg for msg, kind in cpu.stream_out)

    def test_overflow_wraps_to_16_bit_signed(self, cpu):
        cpu.registers['ax'] = 32767
        cpu.registers['ci'] = ['add', 'ax', '1']
        cpu.add()
        assert cpu.registers['ax'] == -32768
        assert cpu.registers['of'] == 1

    def test_zero_flag_set_on_zero_result(self, cpu):
        cpu.registers['ax'] = 5
        cpu.registers['ci'] = ['sub', 'ax', '5']
        cpu.sub()
        assert cpu.registers['ax'] == 0
        assert cpu.registers['zf'] == 1

    def test_zero_flag_cleared_on_nonzero_result(self, cpu):
        cpu.registers['ax'] = 5
        cpu.registers['ci'] = ['add', 'ax', '1']
        cpu.add()
        assert cpu.registers['zf'] == 0

    @pytest.mark.parametrize('protected', PROTECTED_REGS)
    def test_add_into_protected_register_forbidden(self, cpu, protected):
        cpu.registers['ci'] = ['add', protected, '1']
        cpu.add()
        assert cpu.registers['ce'] == 1

    def test_math_op_into_bp_forbidden(self, cpu):
        cpu.registers['ci'] = ['inc', 'bp']
        cpu.inc()
        assert cpu.registers['ce'] == 1


# ---------------------------------------------------------------------------
# Побитовые операции
# ---------------------------------------------------------------------------
class TestBitwise:
    def test_and(self, cpu):
        cpu.registers['ax'] = 0b1100
        cpu.registers['ci'] = ['and', 'ax', '0b1010'.replace('0b', '')]
        # 0b1010 как строка "10" не годится - передаём десятичное представление
        cpu.registers['ci'] = ['and', 'ax', str(0b1010)]
        cpu._and()
        assert cpu.registers['ax'] == (0b1100 & 0b1010)

    def test_or(self, cpu):
        cpu.registers['ax'] = 0b1100
        cpu.registers['ci'] = ['or', 'ax', str(0b0011)]
        cpu._or()
        assert cpu.registers['ax'] == 0b1111

    def test_xor(self, cpu):
        cpu.registers['ax'] = 0b1100
        cpu.registers['ci'] = ['xor', 'ax', str(0b1100)]
        cpu._xor()
        assert cpu.registers['ax'] == 0
        assert cpu.registers['zf'] == 1

    def test_not(self, cpu):
        cpu.registers['ax'] = 0
        cpu.registers['ci'] = ['not', 'ax']
        cpu._not()
        assert cpu.registers['ax'] == -1  # побитовое ~0 == -1


# ---------------------------------------------------------------------------
# CMP и переходы
# ---------------------------------------------------------------------------
class TestCompareAndJumps:
    def test_cmp_equal_sets_zf(self, cpu):
        cpu.registers['ax'] = 5
        cpu.registers['ci'] = ['cmp', 'ax', '5']
        cpu.cmp()
        assert cpu.registers['zf'] == 1

    def test_cmp_not_equal_clears_zf(self, cpu):
        cpu.registers['ax'] = 5
        cpu.registers['ci'] = ['cmp', 'ax', '6']
        cpu.cmp()
        assert cpu.registers['zf'] == 0

    def test_jmp_sets_ip_within_cs(self, cpu):
        cpu.registers['ci'] = ['jmp', '3']
        cpu.jmp()
        assert cpu.registers['ip'] == CS_START + 3

    def test_jmp_out_of_bounds_errors(self, cpu):
        cpu.registers['ci'] = ['jmp', str(MEM_SIZE - CS_START)]  # на 1 больше максимума
        cpu.jmp()
        assert cpu.registers['ce'] == 1

    def test_jcx_jumps_only_when_cx_is_zero(self, cpu):
        cpu.registers['cx'] = 0
        cpu.registers['ci'] = ['jcx', '3']
        cpu.jcx()
        assert cpu.registers['ip'] == CS_START + 3

    def test_jcx_does_not_jump_when_cx_nonzero(self, cpu):
        cpu.registers['cx'] = 1
        cpu.registers['ip'] = 111
        cpu.registers['ci'] = ['jcx', '3']
        cpu.jcx()
        assert cpu.registers['ip'] == 111

    def test_jz_jumps_when_zf_set(self, cpu):
        cpu.registers['zf'] = 1
        cpu.registers['ci'] = ['jz', '3']
        cpu.jz()
        assert cpu.registers['ip'] == CS_START + 3

    def test_jz_does_not_jump_when_zf_clear(self, cpu):
        cpu.registers['zf'] = 0
        cpu.registers['ip'] = 111
        cpu.registers['ci'] = ['jz', '3']
        cpu.jz()
        assert cpu.registers['ip'] == 111


# ---------------------------------------------------------------------------
# INT 0 / INT 1
# ---------------------------------------------------------------------------
class TestInterrupts:
    def test_int1_prints_value_at_bx(self, cpu):
        cpu.memory[DS_START + 2] = 42
        cpu.registers['bx'] = 2
        cpu.registers['ci'] = ['int', '1']
        cpu._int()
        assert cpu.stream_out[-1] == ('42', 'i')

    def test_int0_reads_from_input_buffer(self, cpu):
        cpu.stream_in.append(9)
        cpu.registers['bx'] = 0
        cpu.registers['ci'] = ['int', '0']
        cpu._int()
        assert cpu.memory[DS_START] == 9
        assert cpu.stream_in == []

    def test_int0_empty_buffer_errors(self, cpu):
        cpu.registers['bx'] = 0
        cpu.registers['ci'] = ['int', '0']
        cpu._int()
        assert cpu.is_run is False
        assert any('буфер ввода пуст' in msg for msg, kind in cpu.stream_out)

    def test_int_invalid_number_errors(self, cpu):
        cpu.registers['ci'] = ['int', '5']
        cpu._int()
        assert cpu.registers['ce'] == 1


# ---------------------------------------------------------------------------
# CALL / RET
# ---------------------------------------------------------------------------
class TestCallRet:
    def test_call_pushes_return_address_and_jumps(self, cpu):
        cpu.registers['ip'] = 400  # адрес "следующей инструкции" после CALL
        cpu.registers['ci'] = ['call', '10']
        cpu.call()
        assert cpu.registers['ip'] == CS_START + 10
        assert cpu.memory[cpu.registers['sp']] == 400

    def test_ret_restores_ip_and_pops_stack(self, cpu):
        cpu.registers['ip'] = 400
        cpu.registers['ci'] = ['call', '10']
        cpu.call()
        sp_after_call = cpu.registers['sp']

        cpu.registers['ci'] = ['ret']
        cpu.ret()

        assert cpu.registers['ip'] == 400
        assert cpu.registers['sp'] == sp_after_call + 1

    def test_ret_on_empty_stack_errors(self, cpu):
        cpu.registers['ci'] = ['ret']
        cpu.ret()
        assert cpu.registers['ce'] == 1
        assert any('RET из пустого стека' in msg for msg, kind in cpu.stream_out)

    def test_call_stack_overflow(self, cpu):
        capacity = SS_START - 2
        for _ in range(capacity):
            cpu.registers['ci'] = ['call', '0']
            cpu.call()
        assert cpu.registers['ce'] == 0

        cpu.registers['ci'] = ['call', '0']
        cpu.call()
        assert cpu.registers['ce'] == 1
        assert any('Stack Overflow' in msg for msg, kind in cpu.stream_out)


# ---------------------------------------------------------------------------
# LOOP
# ---------------------------------------------------------------------------
class TestLoop:
    def test_loop_decrements_and_jumps_while_cx_nonzero(self, cpu):
        cpu.registers['cx'] = 3
        cpu.registers['ci'] = ['loop', '5']
        cpu.loop()
        assert cpu.registers['cx'] == 2
        assert cpu.registers['ip'] == CS_START + 5

    def test_loop_stops_when_cx_reaches_zero(self, cpu):
        cpu.registers['cx'] = 1
        cpu.registers['ip'] = 111
        cpu.registers['ci'] = ['loop', '5']
        cpu.loop()
        assert cpu.registers['cx'] == 0
        assert cpu.registers['ip'] == 111  # прыжка не было


# ---------------------------------------------------------------------------
# END и общая обработка ошибок
# ---------------------------------------------------------------------------
class TestEndAndErrors:
    def test_end_stops_execution(self, cpu):
        cpu.is_run = True
        cpu.registers['ci'] = ['end']
        cpu.end()
        assert cpu.is_run is False
        assert any('Программа завершена' in msg for msg, kind in cpu.stream_out)

    def test_throw_err_sets_ce_and_stops(self, cpu):
        cpu.is_run = True
        cpu.throw_err('тестовая ошибка')
        assert cpu.registers['ce'] == 1
        assert cpu.is_run is False
        assert cpu.stream_out[-1] == ('Ошибка: тестовая ошибка', 'e')

    def test_get_val_invalid_operand_raises(self, cpu):
        with pytest.raises(ValueError):
            cpu.get_val('not_a_number_or_register')

    def test_to_int_valid_and_invalid(self, cpu):
        assert cpu.to_int('5') == 5
        assert cpu.to_int('abc') is None


# ---------------------------------------------------------------------------
# Инварианты
# ---------------------------------------------------------------------------
class TestInvariants:
    def test_healthy_state_passes(self, cpu):
        cpu.check_invariants()  # не должно бросать исключение

    def test_i1_sp_out_of_range(self, cpu):
        cpu.registers['sp'] = 1  # ниже минимально допустимого (2)
        with pytest.raises(InvariantViolation):
            cpu.check_invariants()
        assert cpu.registers['ce'] == 1

    def test_i3_gp_register_out_of_16_bit_range(self, cpu):
        cpu.registers['ax'] = 40000  # выше 32767
        with pytest.raises(InvariantViolation):
            cpu.check_invariants()

    def test_i5_segment_register_changed(self, cpu):
        cpu.registers['cs'] = CS_START + 1
        with pytest.raises(InvariantViolation):
            cpu.check_invariants()

    def test_i4_ip_outside_cs_while_running(self, cpu):
        cpu.is_run = True
        cpu.registers['ip'] = DS_START  # вне CS
        with pytest.raises(InvariantViolation):
            cpu.check_invariants()

    def test_i2_numeric_value_in_code_segment(self, cpu):
        cpu.memory[CS_START] = 123  # число вместо списка токенов инструкции
        with pytest.raises(InvariantViolation):
            cpu.check_invariants()


# ---------------------------------------------------------------------------
# Интеграционные тесты: полный цикл run_step на маленьких программах
# ---------------------------------------------------------------------------
class TestRunStepIntegration:
    def test_simple_mov_add_end_program(self, cpu):
        program = [
            'mov ax 2',
            'add ax 3',
            'end',
        ]
        run_program(cpu, program)
        assert cpu.registers['ax'] == 5
        assert cpu.registers['ce'] == 0

    def test_program_reads_input_and_prints_output(self, cpu):
        cpu.stream_in.append(21)
        program = [
            'int 0',       # читаем число в DS[bx=0]
            'mov ax [bx]',  # ax = прочитанное число
            'add ax ax',
            'mov [bx] ax',
            'int 1',       # печатаем DS[bx=0]
            'end',
        ]
        run_program(cpu, program)
        assert cpu.stream_out[-2] == ('42', 'i')  # 21*2
        assert cpu.stream_out[-1] == ('Программа завершена', 'i')

    def test_loop_counts_down(self, cpu):
        program = [
            'mov cx 5',
            'inc ax',
            'loop 1',
            'end',
        ]
        run_program(cpu, program)
        assert cpu.registers['ax'] == 5
        assert cpu.registers['cx'] == 0

    def test_call_ret_subroutine(self, cpu):
        program = [
            'call 3',    # #0: вызов подпрограммы на смещении 3
            'end',       # #1: после возврата - завершение
            'mov dx 0',  # #2 (не используется явно, просто заполнитель)
            'mov ax 9',  # #3: тело подпрограммы
            'ret',       # #4
        ]
        run_program(cpu, program)
        assert cpu.registers['ax'] == 9
        assert cpu.registers['ce'] == 0

    def test_unknown_instruction_stops_program(self, cpu):
        run_program(cpu, ['frobnicate ax'])
        assert cpu.is_run is False
        assert any('неизвестная инструкция' in msg for msg, kind in cpu.stream_out)

    def test_empty_cell_execution_errors(self, cpu):
        # не грузим программу вообще - ip указывает на пустую ячейку CS
        cpu.is_run = True
        cpu.run_step()
        assert cpu.is_run is False
        assert any('пустую ячейку' in msg for msg, kind in cpu.stream_out)

    def test_ip_runs_past_end_of_memory(self, cpu):
        cpu.is_run = True
        cpu.registers['ip'] = MEM_SIZE  # уже за пределами памяти
        cpu.run_step()
        assert cpu.registers['ce'] == 1
        assert cpu.is_run is False

    def test_division_by_zero_stops_program(self, cpu):
        run_program(cpu, ['mov ax 10', 'div ax 0'])
        assert cpu.registers['ce'] == 1
        assert cpu.is_run is False
