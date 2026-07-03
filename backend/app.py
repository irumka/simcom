import os
import time
from flask import Flask, request, jsonify
from flask_cors import CORS
from computer import SimPC

app = Flask(__name__)
CORS(app, supports_credentials=True, origins=[
    'http://localhost:5173',
    'https://simcom.vercel.app',
    'https://www.sim-com.ru',
    'https://sim-com.ru',
    'https://simcom-dwvqgaiwy-irumkas-projects.vercel.app'
])
# ограничиваем размер загружаемого файла: 50 КБ хватит для любой программы
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024

# максимальное число строк кода: чтобы никто не загрузил файл на миллион строк
MAX_CODE_LINES = 200

# тут храним всех пользователей и их виртуальные машины
# ключ - X-Client-Id, внутри - сама машина, код и время последнего запроса
user_sessions = {}

# сессия живёт 2 часа, потом удаляется
SESSION_TTL = 2 * 60 * 60

# готовые примеры программ
# адреса считаются от CS_START = 342, то есть первая строка получает адрес 342
EXAMPLES = {
    'sum': [
        'mov ax 5',
        'mov bx 10',
        'add ax bx',
        'mov 172 ax',
        'end'
    ],
    'fact': [
        'mov ax 5',
        'mov cx ax',
        'dec cx',
        'mov bx ax',
        'mul bx cx',
        'mov ax bx',
        'dec cx',
        'cmp cx 1',
        'jcx 352',
        'jmp 345',
        'mov 172 ax',
        'end'
    ],
    'stack': [
        'mov ax 99',
        'push ax',
        'mov ax 0',
        'pop bx',
        'end'
    ],
    'indirect': [
        'mov 172 42',
        'mov bx 172',
        'mov ax [bx]',
        'mov si ax',
        'mov di 8',
        'add si di',
        'mov 173 si',
        'mov bx 173',
        'int 1',
        'end'
    ],
}


@app.errorhandler(413)
def too_large(e):
    return jsonify({'error': 'Файл слишком большой (максимум 50 КБ)'}), 413


# достаём (или создаём) машину пользователя по заголовку X-Client-Id
# от cookie-сессии отказались: SameSite на связке sim-com.ru + onrender.com + Cloudflare
# ведёт себя непредсказуемо, из-за этого состояние постоянно слетало
# если заголовка нет - отдаём (None, None), а роут уже сам решает что с этим делать
def get_user_env():
    uid = request.headers.get('X-Client-Id')
    if not uid:
        return None, None

    now = time.time()
    dead_ids = [k for k in user_sessions if now - user_sessions[k].get('last_seen', 0) > SESSION_TTL]
    for dead_id in dead_ids:
        del user_sessions[dead_id]

    if uid not in user_sessions:
        user_sessions[uid] = {'sim_pc': SimPC(), 'code_lst': [], 'last_seen': time.time()}

    user_sessions[uid]['last_seen'] = time.time()
    env = user_sessions[uid]
    return env['sim_pc'], env['code_lst']


def build_state(pc, code_lst):
    # вычисляем номер строки которую сейчас выполняет процессор
    ip = pc.registers.get('ip', 0)
    cs = pc.registers.get('cs', 0)
    cur_line = ip - cs - 1

    # собираем массив памяти в виде строк чтобы JSON нормально отправил
    memory_serialized = []
    for cell in pc.memory:
        if cell == '' or cell is None:
            memory_serialized.append('')
        elif isinstance(cell, list):
            memory_serialized.append(' '.join(str(t) for t in cell))
        else:
            memory_serialized.append(str(cell))

    state = {
        'registers': pc.registers,
        'is_ready': pc.is_ready,
        'is_run': pc.is_run,
        'cur_line': cur_line,
        'stream_out': pc.stream_out,
        'stream_in': pc.stream_in,
        'memory': memory_serialized,
        'memory_cs': pc.registers.get('cs', 0),
        'memory_ds': pc.registers.get('ds', 0),
        'memory_ss': pc.registers.get('ss', 0),
        'code_lst': code_lst,
    }
    return state


# получить текущее состояние машины
@app.route('/api/state')
def get_state():
    pc, code_lst = get_user_env()
    if pc is None:
        return jsonify({'error': 'Нет X-Client-Id'}), 400
    return jsonify(build_state(pc, code_lst))


# добавить одну команду в список
@app.post('/api/command')
def add_command():
    pc, code_lst = get_user_env()
    if pc is None:
        return jsonify({'error': 'Нет X-Client-Id'}), 400

    raw = request.json.get('command', '').strip()

    if not raw:
        return jsonify({'error': 'Введена пустая команда'}), 400

    if len(raw) > 50:
        return jsonify({'error': 'Команда слишком длинная (максимум 50 символов)'}), 400

    cmd = raw.split()[0].lower()

    if cmd not in pc.coms:
        return jsonify({'error': f'Синтаксическая ошибка: команда "{cmd}" не найдена'}), 400

    if len(code_lst) >= MAX_CODE_LINES:
        return jsonify({'error': f'Превышен лимит команд ({MAX_CODE_LINES})'}), 400

    code_lst.append(raw.lower())
    return jsonify(build_state(pc, code_lst))


# удалить команду по индексу
@app.route('/api/command/<int:idx>', methods=['DELETE'])
def delete_command(idx):
    pc, code_lst = get_user_env()
    if pc is None:
        return jsonify({'error': 'Нет X-Client-Id'}), 400

    if 0 <= idx < len(code_lst):
        code_lst.pop(idx)
        return jsonify(build_state(pc, code_lst))
    return jsonify({'error': 'Команда не найдена'}), 404


# очистить список команд
@app.route('/api/clear')
def clear_code():
    pc, code_lst = get_user_env()
    if pc is None:
        return jsonify({'error': 'Нет X-Client-Id'}), 400

    code_lst.clear()
    return jsonify({'ok': True})


# полный сброс: очищаем код и перезапускаем машину
@app.route('/api/reset')
def reset():
    pc, code_lst = get_user_env()
    if pc is None:
        return jsonify({'error': 'Нет X-Client-Id'}), 400

    code_lst.clear()
    pc.reset()
    return jsonify(build_state(pc, code_lst))


# загрузить готовый пример
@app.route('/api/example/<name>')
def load_example(name):
    pc, code_lst = get_user_env()
    if pc is None:
        return jsonify({'error': 'Нет X-Client-Id'}), 400

    if name not in EXAMPLES:
        return jsonify({'error': 'Пример не найден'}), 404
    code_lst.clear()
    code_lst.extend(EXAMPLES[name])
    pc.reset()
    return jsonify(build_state(pc, code_lst))


# экспорт кода как plain text
@app.route('/api/export')
def export_code():
    from flask import Response
    pc, code_lst = get_user_env()
    if pc is None:
        return jsonify({'error': 'Нет X-Client-Id'}), 400

    return Response('\n'.join(code_lst), mimetype='text/plain',
                    headers={'Content-Disposition': 'attachment;filename=simcom_code.txt'})


# импорт кода из файла
@app.post('/api/import')
def import_code():
    pc, code_lst = get_user_env()
    if pc is None:
        return jsonify({'error': 'Нет X-Client-Id'}), 400

    f = request.files.get('file')
    if not f:
        return jsonify({'error': 'Файл не передан'}), 400

    try:
        lines = f.read().decode('utf-8').splitlines()
    except UnicodeDecodeError:
        return jsonify({'error': 'Файл содержит нетекстовые данные (ожидается UTF-8)'}), 400

    clean = [line.strip().lower() for line in lines if line.strip()]

    if len(clean) > MAX_CODE_LINES:
        return jsonify({'error': f'Слишком много строк (максимум {MAX_CODE_LINES})'}), 400

    code_lst.clear()
    code_lst.extend(clean)
    pc.reset()
    return jsonify(build_state(pc, code_lst))


# добавить значение во входной поток
@app.post('/api/stream_in')
def add_stream_in():
    pc, _ = get_user_env()
    if pc is None:
        return jsonify({'error': 'Нет X-Client-Id'}), 400

    val = request.json.get('value', '').strip()
    if not val:
        return jsonify({'error': 'Ввод пустой'}), 400
    pc.stream_in.append(val[:20])
    return jsonify({'ok': True, 'stream_in': pc.stream_in})


# очистить выходной поток
@app.route('/api/stream_out/clear')
def clear_output():
    pc, _ = get_user_env()
    if pc is None:
        return jsonify({'error': 'Нет X-Client-Id'}), 400

    pc.clear_stream_output()
    return jsonify({'ok': True})


# очистить входной поток
@app.route('/api/stream_in/clear')
def clear_input():
    pc, _ = get_user_env()
    if pc is None:
        return jsonify({'error': 'Нет X-Client-Id'}), 400

    pc.clear_stream_input()
    return jsonify({'ok': True})


# один шаг выполнения программы
@app.route('/api/next')
def next_step():
    pc, code_lst = get_user_env()
    if pc is None:
        return jsonify({'error': 'Нет X-Client-Id'}), 400

    try:
        if pc.is_ready and code_lst:
            # первый шаг: загружаем программу в память
            pc.is_ready = False
            pc.is_run = True
            pc.put_mem_from_code_lst(code_lst)

        elif pc.is_run:
            # выполняем следующую инструкцию
            pc.run_step()
    except Exception as e:
        pc.add_text_to_stream_output(f'Системный сбой: {e}', 'e')
        pc.is_run = False

    return jsonify(build_state(pc, code_lst))


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
