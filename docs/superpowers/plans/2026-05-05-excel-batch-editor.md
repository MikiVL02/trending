# Excel 批量编辑桌面应用 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个跨平台（Mac/Windows）Electron 桌面应用，让用户上传 Excel 模板并标记可替换字段，后续批量输入数据即可自动生成多个填充好的 Excel 文件。

**Architecture:** Electron 主进程管理窗口、SQLite 和 IPC；React 渲染进程提供三个页面（模板管理、模板配置、批量生成）；独立 Python 子进程（PyInstaller 打包）通过 stdin/stdout JSON 通信负责所有 Excel 读写操作。

**Tech Stack:** Electron 28, React 18 + Vite + Tailwind CSS, better-sqlite3, Python 3.11 + openpyxl, PyInstaller

---

## 文件结构

```
excel-batch-editor/          ← 新项目根目录（与 program2 同级）
├── package.json
├── electron/
│   ├── main.js              ← Electron 主进程入口
│   ├── preload.js           ← contextBridge 暴露 API
│   ├── ipc/
│   │   ├── templateIpc.js   ← 模板 CRUD 的 IPC handler
│   │   └── generateIpc.js   ← 批量生成的 IPC handler
│   └── db/
│       ├── init.js          ← SQLite 初始化、建表
│       └── templateDb.js    ← 模板 CRUD 操作
├── renderer/
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── pages/
│       │   ├── TemplateList.jsx    ← 模板管理页
│       │   ├── TemplateConfig.jsx  ← 模板配置页（上传+字段映射）
│       │   └── Generate.jsx       ← 批量生成页
│       └── components/
│           ├── FieldMappingEditor.jsx  ← 字段映射编辑组件
│           └── ProgressPanel.jsx      ← 生成进度展示
├── python/
│   ├── main.py              ← stdin 读取指令，路由到 parser/generator
│   ├── parser.py            ← parse_template 指令
│   ├── generator.py         ← generate 指令
│   └── requirements.txt
└── tests/
    └── python/
        ├── test_parser.py
        └── test_generator.py
```

---

## 阶段一：Python Excel 处理核心

### Task 1：初始化项目结构

**Files:**
- Create: `excel-batch-editor/package.json`
- Create: `excel-batch-editor/python/requirements.txt`
- Create: `excel-batch-editor/python/main.py`
- Create: `excel-batch-editor/python/parser.py`
- Create: `excel-batch-editor/python/generator.py`
- Create: `excel-batch-editor/tests/python/test_parser.py`
- Create: `excel-batch-editor/tests/python/test_generator.py`

- [ ] **Step 1: 在 workspace 目录下创建项目**

```bash
cd /Users/mikivl/workspace
mkdir excel-batch-editor
cd excel-batch-editor
mkdir -p electron/ipc electron/db renderer/src/pages renderer/src/components python tests/python
git init
```

- [ ] **Step 2: 创建 requirements.txt**

```
openpyxl==3.1.2
Pillow==10.3.0
pytest==8.2.0
```

- [ ] **Step 3: 安装 Python 依赖**

```bash
cd python
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

- [ ] **Step 4: 创建空的 Python 入口文件（占位，后续任务填充）**

`python/main.py`:
```python
import sys
import json

def main():
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
            action = req.get("action")
            if action == "parse_template":
                from parser import parse_template
                result = parse_template(req["file_path"])
            elif action == "generate":
                from generator import generate
                result = generate(req)
            else:
                result = {"error": f"unknown action: {action}"}
        except Exception as e:
            result = {"error": str(e)}
        print(json.dumps(result, ensure_ascii=False), flush=True)

if __name__ == "__main__":
    main()
```

- [ ] **Step 5: 初始提交**

```bash
git add .
git commit -m "chore: 初始化项目结构"
```

---

### Task 2：实现模板解析（parse_template）

**Files:**
- Create: `python/parser.py`
- Create: `tests/python/test_parser.py`
- 需要一个测试用的 Excel 文件：`tests/fixtures/sample_template.xlsx`

- [ ] **Step 1: 创建测试夹具 Excel 文件**

在 Python 交互环境中运行，或单独写脚本：

```python
# tests/create_fixtures.py
from openpyxl import Workbook
from openpyxl.drawing.image import Image
import os

wb = Workbook()
ws = wb.active
ws.title = "Sheet1"
ws["B3"] = "{{编号}}"
ws["C5"] = "{{姓名}}"
ws["D7"] = "normal_value"  # 非占位符，不应被识别
wb.save("tests/fixtures/sample_template.xlsx")
print("fixture created")
```

```bash
mkdir -p tests/fixtures
python tests/create_fixtures.py
```

- [ ] **Step 2: 编写失败测试**

`tests/python/test_parser.py`:
```python
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../python"))

from parser import parse_template

FIXTURE = os.path.join(os.path.dirname(__file__), "../fixtures/sample_template.xlsx")

def test_returns_sheets():
    result = parse_template(FIXTURE)
    assert "sheets" in result
    assert "Sheet1" in result["sheets"]

def test_detects_placeholders():
    result = parse_template(FIXTURE)
    names = [p["name"] for p in result["placeholders"]]
    assert "编号" in names
    assert "姓名" in names

def test_ignores_non_placeholders():
    result = parse_template(FIXTURE)
    names = [p["name"] for p in result["placeholders"]]
    assert "normal_value" not in names

def test_placeholder_has_cell_info():
    result = parse_template(FIXTURE)
    biaohao = next(p for p in result["placeholders"] if p["name"] == "编号")
    assert biaohao["sheet"] == "Sheet1"
    assert biaohao["cell"] == "B3"
```

- [ ] **Step 3: 运行测试确认失败**

```bash
cd excel-batch-editor
source python/.venv/bin/activate
pytest tests/python/test_parser.py -v
```

预期：`ImportError: cannot import name 'parse_template' from 'parser'`

- [ ] **Step 4: 实现 parser.py**

`python/parser.py`:
```python
import re
from openpyxl import load_workbook

PLACEHOLDER_RE = re.compile(r"\{\{(.+?)\}\}")

def parse_template(file_path: str) -> dict:
    wb = load_workbook(file_path, data_only=False)
    sheets = wb.sheetnames
    placeholders = []

    for sheet_name in sheets:
        ws = wb[sheet_name]
        for row in ws.iter_rows():
            for cell in row:
                if cell.value and isinstance(cell.value, str):
                    m = PLACEHOLDER_RE.search(cell.value)
                    if m:
                        placeholders.append({
                            "name": m.group(1),
                            "sheet": sheet_name,
                            "cell": cell.coordinate,
                        })

    return {"sheets": sheets, "placeholders": placeholders}
```

- [ ] **Step 5: 运行测试确认通过**

```bash
pytest tests/python/test_parser.py -v
```

预期：4 个测试全部 PASS

- [ ] **Step 6: 提交**

```bash
git add python/parser.py tests/python/test_parser.py tests/fixtures/ tests/create_fixtures.py
git commit -m "feat: 实现模板解析，自动识别 {{占位符}}"
```

---

### Task 3：实现批量生成（generate）

**Files:**
- Create: `python/generator.py`
- Create: `tests/python/test_generator.py`
- 需要测试图片：`tests/fixtures/sample_image.png`

- [ ] **Step 1: 创建测试图片夹具**

```python
# tests/create_image_fixture.py
from PIL import Image as PILImage
img = PILImage.new("RGB", (100, 100), color=(255, 0, 0))
img.save("tests/fixtures/sample_image.png")
print("image fixture created")
```

```bash
python tests/create_image_fixture.py
```

- [ ] **Step 2: 编写失败测试**

`tests/python/test_generator.py`:
```python
import sys, os, tempfile
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../python"))

from generator import generate
from openpyxl import load_workbook

FIXTURE = os.path.join(os.path.dirname(__file__), "../fixtures/sample_template.xlsx")
IMAGE = os.path.join(os.path.dirname(__file__), "../fixtures/sample_image.png")

def _base_request(output_dir):
    return {
        "template_path": FIXTURE,
        "fields": [
            {"name": "编号", "type": "text", "sheet": "Sheet1", "cell": "B3"},
            {"name": "姓名", "type": "text", "sheet": "Sheet1", "cell": "C5"},
        ],
        "rows": [
            {"编号": "001", "姓名": "张三"},
            {"编号": "002", "姓名": "李四"},
        ],
        "output_dir": output_dir,
        "filename_pattern": "{{编号}}_报告.xlsx",
    }

def test_generates_correct_number_of_files():
    with tempfile.TemporaryDirectory() as tmpdir:
        result = generate(_base_request(tmpdir))
        assert len(result["results"]) == 2

def test_output_files_exist():
    with tempfile.TemporaryDirectory() as tmpdir:
        result = generate(_base_request(tmpdir))
        for r in result["results"]:
            assert r["status"] == "success"
            assert os.path.exists(r["file"])

def test_text_fields_are_filled():
    with tempfile.TemporaryDirectory() as tmpdir:
        result = generate(_base_request(tmpdir))
        wb = load_workbook(result["results"][0]["file"])
        ws = wb["Sheet1"]
        assert ws["B3"].value == "001"
        assert ws["C5"].value == "张三"

def test_filename_pattern_applied():
    with tempfile.TemporaryDirectory() as tmpdir:
        result = generate(_base_request(tmpdir))
        names = [os.path.basename(r["file"]) for r in result["results"]]
        assert "001_报告.xlsx" in names
        assert "002_报告.xlsx" in names

def test_missing_field_is_skipped_not_crashed():
    with tempfile.TemporaryDirectory() as tmpdir:
        req = _base_request(tmpdir)
        req["rows"] = [{"编号": "003"}]  # 缺 姓名
        result = generate(req)
        assert result["results"][0]["status"] == "success"

def test_image_field_is_inserted():
    with tempfile.TemporaryDirectory() as tmpdir:
        req = {
            "template_path": FIXTURE,
            "fields": [
                {"name": "图片1", "type": "image", "sheet": "Sheet1", "cell": "A1"},
            ],
            "rows": [{"图片1": IMAGE}],
            "output_dir": tmpdir,
            "filename_pattern": "img_test.xlsx",
        }
        result = generate(req)
        assert result["results"][0]["status"] == "success"
        wb = load_workbook(result["results"][0]["file"])
        assert len(wb["Sheet1"]._images) == 1
```

- [ ] **Step 3: 运行测试确认失败**

```bash
pytest tests/python/test_generator.py -v
```

预期：`ImportError: cannot import name 'generate' from 'generator'`

- [ ] **Step 4: 实现 generator.py**

`python/generator.py`:
```python
import re
import os
import shutil
from openpyxl import load_workbook
from openpyxl.drawing.image import Image as XLImage

PLACEHOLDER_RE = re.compile(r"\{\{(.+?)\}\}")

def _apply_filename(pattern: str, row: dict) -> str:
    def replace(m):
        return str(row.get(m.group(1), m.group(0)))
    return PLACEHOLDER_RE.sub(replace, pattern)

def generate(req: dict) -> dict:
    template_path = req["template_path"]
    fields = req["fields"]
    rows = req["rows"]
    output_dir = req["output_dir"]
    filename_pattern = req["filename_pattern"]

    os.makedirs(output_dir, exist_ok=True)
    results = []

    for i, row in enumerate(rows):
        filename = _apply_filename(filename_pattern, row)
        output_path = os.path.join(output_dir, filename)
        shutil.copy2(template_path, output_path)

        try:
            wb = load_workbook(output_path)
            for field in fields:
                value = row.get(field["name"])
                if value is None:
                    continue
                ws = wb[field["sheet"]]
                if field["type"] == "text":
                    ws[field["cell"]] = value
                elif field["type"] == "image":
                    if os.path.exists(value):
                        img = XLImage(value)
                        ws.add_image(img, field["cell"])
                elif field["type"] == "table_range":
                    # value 期望为 list of list，写入从 cell 起始行
                    start_cell = ws[field["cell"]]
                    start_row = start_cell.row
                    start_col = start_cell.column
                    for r_idx, data_row in enumerate(value):
                        for c_idx, cell_value in enumerate(data_row):
                            ws.cell(row=start_row + r_idx, column=start_col + c_idx, value=cell_value)
            wb.save(output_path)
            results.append({"row": i, "status": "success", "file": output_path})
        except Exception as e:
            results.append({"row": i, "status": "error", "error": str(e), "file": output_path})

    return {"results": results}
```

- [ ] **Step 5: 运行测试确认通过**

```bash
pytest tests/python/test_generator.py -v
```

预期：6 个测试全部 PASS

- [ ] **Step 6: 提交**

```bash
git add python/generator.py tests/python/test_generator.py tests/create_image_fixture.py tests/fixtures/
git commit -m "feat: 实现批量 Excel 生成（文本、图片、表格区域）"
```

---

### Task 4：Python 主进程 stdin/stdout 通信测试

**Files:**
- Modify: `python/main.py`（已在 Task 1 创建）
- Create: `tests/python/test_main.py`

- [ ] **Step 1: 编写失败测试**

`tests/python/test_main.py`:
```python
import sys, os, json, subprocess

PYTHON = sys.executable
MAIN = os.path.join(os.path.dirname(__file__), "../../python/main.py")
FIXTURE = os.path.join(os.path.dirname(__file__), "../fixtures/sample_template.xlsx")

def _call(payload: dict) -> dict:
    proc = subprocess.run(
        [PYTHON, MAIN],
        input=json.dumps(payload) + "\n",
        capture_output=True,
        text=True,
        timeout=10,
    )
    return json.loads(proc.stdout.strip())

def test_parse_template_via_stdin():
    result = _call({"action": "parse_template", "file_path": FIXTURE})
    assert "sheets" in result
    assert "Sheet1" in result["sheets"]

def test_unknown_action_returns_error():
    result = _call({"action": "nonexistent"})
    assert "error" in result
```

- [ ] **Step 2: 运行测试确认失败**

```bash
pytest tests/python/test_main.py -v
```

预期：`AssertionError`（因为 main.py 现在应该能工作，但检验一遍）

- [ ] **Step 3: 确认测试通过（main.py 已在 Task 1 实现）**

```bash
pytest tests/python/test_main.py -v
```

预期：2 个测试 PASS

- [ ] **Step 4: 运行全部 Python 测试**

```bash
pytest tests/python/ -v
```

预期：全部通过

- [ ] **Step 5: 提交**

```bash
git add tests/python/test_main.py
git commit -m "test: 验证 Python stdin/stdout JSON 通信"
```

---

## 阶段二：Electron 主进程 + SQLite

### Task 5：Electron 项目脚手架

**Files:**
- Create: `package.json`
- Create: `electron/main.js`
- Create: `electron/preload.js`

- [ ] **Step 1: 初始化 package.json**

```bash
cd excel-batch-editor
```

`package.json`:
```json
{
  "name": "excel-batch-editor",
  "version": "1.0.0",
  "main": "electron/main.js",
  "scripts": {
    "start": "electron .",
    "dev": "concurrently \"npm run dev:renderer\" \"wait-on http://localhost:5173 && electron .\"",
    "dev:renderer": "vite renderer",
    "build": "vite build renderer && electron-builder",
    "test": "pytest tests/python/ -v"
  },
  "devDependencies": {
    "electron": "^28.0.0",
    "electron-builder": "^24.9.1",
    "concurrently": "^8.2.2",
    "wait-on": "^7.2.0",
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0"
  },
  "dependencies": {
    "better-sqlite3": "^9.4.3",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.0"
  }
}
```

- [ ] **Step 2: 安装依赖**

```bash
npm install
```

- [ ] **Step 3: 创建 Electron 主进程入口**

`electron/main.js`:
```js
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

const isDev = process.env.NODE_ENV === "development";

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, "../renderer/dist/index.html"));
  }
}

app.whenReady().then(() => {
  require("./db/init");
  require("./ipc/templateIpc");
  require("./ipc/generateIpc");
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
```

- [ ] **Step 4: 创建 preload.js（暴露 IPC API 给渲染进程）**

`electron/preload.js`:
```js
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  // 模板管理
  listTemplates: () => ipcRenderer.invoke("template:list"),
  saveTemplate: (data) => ipcRenderer.invoke("template:save", data),
  updateTemplate: (id, data) => ipcRenderer.invoke("template:update", id, data),
  deleteTemplate: (id) => ipcRenderer.invoke("template:delete", id),
  parseTemplate: (filePath) => ipcRenderer.invoke("template:parse", filePath),

  // 文件操作
  selectFile: (filters) => ipcRenderer.invoke("file:select", filters),
  selectDirectory: () => ipcRenderer.invoke("file:selectDir"),
  openDirectory: (dirPath) => ipcRenderer.invoke("file:openDir", dirPath),
  copyFileToAppData: (srcPath, templateId) =>
    ipcRenderer.invoke("file:copyToAppData", srcPath, templateId),

  // 批量生成
  generate: (req) => ipcRenderer.invoke("generate:run", req),
});
```

- [ ] **Step 5: 提交**

```bash
git add package.json electron/main.js electron/preload.js
git commit -m "chore: Electron 主进程脚手架"
```

---

### Task 6：SQLite 数据库初始化

**Files:**
- Create: `electron/db/init.js`
- Create: `electron/db/templateDb.js`

- [ ] **Step 1: 创建 init.js（建表）**

`electron/db/init.js`:
```js
const Database = require("better-sqlite3");
const path = require("path");
const { app } = require("electron");
const fs = require("fs");

const DB_DIR = path.join(app.getPath("userData"), "excel-batch-editor");
fs.mkdirSync(DB_DIR, { recursive: true });
const DB_PATH = path.join(DB_DIR, "app.db");

const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    grp TEXT DEFAULT '',
    file_path TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS fields (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    sheet TEXT NOT NULL,
    cell TEXT NOT NULL,
    FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS generation_records (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    output_dir TEXT NOT NULL,
    row_count INTEGER NOT NULL
  );
`);

module.exports = db;
```

- [ ] **Step 2: 创建 templateDb.js（CRUD 操作）**

`electron/db/templateDb.js`:
```js
const db = require("./init");
const { randomUUID } = require("crypto");

function listTemplates() {
  const templates = db.prepare("SELECT * FROM templates ORDER BY updated_at DESC").all();
  return templates.map((t) => ({
    ...t,
    fields: db.prepare("SELECT * FROM fields WHERE template_id = ?").all(t.id),
  }));
}

function saveTemplate({ name, grp = "", file_path, fields = [] }) {
  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    "INSERT INTO templates (id, name, grp, file_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, name, grp, file_path, now, now);
  _saveFields(id, fields);
  return id;
}

function updateTemplate(id, { name, grp, fields }) {
  const now = new Date().toISOString();
  if (name !== undefined || grp !== undefined) {
    db.prepare("UPDATE templates SET name = COALESCE(?, name), grp = COALESCE(?, grp), updated_at = ? WHERE id = ?")
      .run(name ?? null, grp ?? null, now, id);
  }
  if (fields !== undefined) {
    db.prepare("DELETE FROM fields WHERE template_id = ?").run(id);
    _saveFields(id, fields);
  }
}

function deleteTemplate(id) {
  db.prepare("DELETE FROM templates WHERE id = ?").run(id);
}

function _saveFields(templateId, fields) {
  const stmt = db.prepare(
    "INSERT INTO fields (id, template_id, name, type, sheet, cell) VALUES (?, ?, ?, ?, ?, ?)"
  );
  for (const f of fields) {
    stmt.run(randomUUID(), templateId, f.name, f.type, f.sheet, f.cell);
  }
}

module.exports = { listTemplates, saveTemplate, updateTemplate, deleteTemplate };
```

- [ ] **Step 3: 提交**

```bash
git add electron/db/
git commit -m "feat: SQLite 数据库初始化及模板 CRUD"
```

---

### Task 7：IPC Handler — 模板管理

**Files:**
- Create: `electron/ipc/templateIpc.js`

- [ ] **Step 1: 创建 templateIpc.js**

`electron/ipc/templateIpc.js`:
```js
const { ipcMain, dialog, app, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const { listTemplates, saveTemplate, updateTemplate, deleteTemplate } = require("../db/templateDb");

const APPDATA_DIR = path.join(app.getPath("userData"), "excel-batch-editor", "templates");
fs.mkdirSync(APPDATA_DIR, { recursive: true });

const PYTHON_BIN = app.isPackaged
  ? path.join(process.resourcesPath, "python", "main")
  : path.join(__dirname, "../../python/main.py");

function callPython(payload) {
  return new Promise((resolve, reject) => {
    const isPackaged = app.isPackaged;
    const proc = isPackaged
      ? spawn(PYTHON_BIN)
      : spawn(process.env.PYTHON_PATH || "python3", [PYTHON_BIN]);

    let stdout = "";
    proc.stdout.on("data", (d) => (stdout += d));
    proc.stderr.on("data", (d) => console.error("[python]", d.toString()));
    proc.on("close", () => {
      try {
        resolve(JSON.parse(stdout.trim()));
      } catch (e) {
        reject(new Error("Python 返回了无效 JSON: " + stdout));
      }
    });
    proc.stdin.write(JSON.stringify(payload) + "\n");
    proc.stdin.end();
  });
}

ipcMain.handle("template:list", () => listTemplates());

ipcMain.handle("template:save", (_, data) => {
  const id = saveTemplate(data);
  return id;
});

ipcMain.handle("template:update", (_, id, data) => {
  updateTemplate(id, data);
  return true;
});

ipcMain.handle("template:delete", (_, id) => {
  deleteTemplate(id);
  return true;
});

ipcMain.handle("template:parse", async (_, filePath) => {
  return callPython({ action: "parse_template", file_path: filePath });
});

ipcMain.handle("file:select", async (_, filters = []) => {
  const result = await dialog.showOpenDialog({ filters, properties: ["openFile"] });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle("file:selectDir", async () => {
  const result = await dialog.showOpenDialog({ properties: ["openDirectory"] });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle("file:openDir", (_, dirPath) => {
  shell.openPath(dirPath);
});

ipcMain.handle("file:copyToAppData", (_, srcPath, templateId) => {
  const dir = path.join(APPDATA_DIR, templateId);
  fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, path.basename(srcPath));
  fs.copyFileSync(srcPath, dest);
  return dest;
});

module.exports = { callPython };
```

- [ ] **Step 2: 提交**

```bash
git add electron/ipc/templateIpc.js
git commit -m "feat: 模板管理 IPC handler"
```

---

### Task 8：IPC Handler — 批量生成

**Files:**
- Create: `electron/ipc/generateIpc.js`

- [ ] **Step 1: 创建 generateIpc.js**

`electron/ipc/generateIpc.js`:
```js
const { ipcMain } = require("electron");
const { callPython } = require("./templateIpc");

ipcMain.handle("generate:run", async (_, req) => {
  return callPython({ action: "generate", ...req });
});
```

- [ ] **Step 2: 提交**

```bash
git add electron/ipc/generateIpc.js
git commit -m "feat: 批量生成 IPC handler"
```

---

## 阶段三：React 前端

### Task 9：React + Vite + Tailwind CSS 脚手架

**Files:**
- Create: `renderer/index.html`
- Create: `renderer/vite.config.js`
- Create: `renderer/src/main.jsx`
- Create: `renderer/src/App.jsx`

- [ ] **Step 1: 安装前端依赖（在 renderer 目录，但通过根 package.json 统一管理）**

根 package.json 的 dependencies 已包含 react、react-dom、react-router-dom，继续在根目录安装：

```bash
npm install tailwindcss @tailwindcss/vite --save-dev
```

- [ ] **Step 2: 创建 renderer/vite.config.js**

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  root: "renderer",
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "../renderer/dist",
    emptyOutDir: true,
  },
});
```

- [ ] **Step 3: 创建 renderer/index.html**

```html
<!DOCTYPE html>
<html lang="zh">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Excel 批量编辑器</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 4: 创建 renderer/src/main.jsx**

```jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
```

- [ ] **Step 5: 创建 renderer/src/index.css（引入 Tailwind）**

```css
@import "tailwindcss";
```

- [ ] **Step 6: 创建 renderer/src/App.jsx（路由）**

```jsx
import React from "react";
import { MemoryRouter, Routes, Route, Navigate } from "react-router-dom";
import TemplateList from "./pages/TemplateList";
import TemplateConfig from "./pages/TemplateConfig";
import Generate from "./pages/Generate";

export default function App() {
  return (
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/templates" replace />} />
        <Route path="/templates" element={<TemplateList />} />
        <Route path="/templates/new" element={<TemplateConfig />} />
        <Route path="/templates/:id/edit" element={<TemplateConfig />} />
        <Route path="/generate" element={<Generate />} />
      </Routes>
    </MemoryRouter>
  );
}
```

- [ ] **Step 7: 提交**

```bash
git add renderer/ package.json
git commit -m "chore: React + Vite + Tailwind CSS 脚手架"
```

---

### Task 10：模板管理页（TemplateList）

**Files:**
- Create: `renderer/src/pages/TemplateList.jsx`

- [ ] **Step 1: 实现 TemplateList.jsx**

`renderer/src/pages/TemplateList.jsx`:
```jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function TemplateList() {
  const [templates, setTemplates] = useState([]);
  const [selected, setSelected] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    window.api.listTemplates().then(setTemplates);
  }, []);

  async function handleDelete(id) {
    if (!confirm("确认删除此模板？")) return;
    await window.api.deleteTemplate(id);
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  const groups = [...new Set(templates.map((t) => t.grp || "未分组"))];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 左侧模板列表 */}
      <aside className="w-72 bg-white border-r flex flex-col">
        <div className="p-4 border-b flex gap-2">
          <button
            onClick={() => navigate("/templates/new")}
            className="flex-1 bg-blue-600 text-white rounded px-3 py-2 text-sm hover:bg-blue-700"
          >
            + 新建模板
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {groups.map((grp) => (
            <div key={grp} className="mb-4">
              <div className="text-xs text-gray-400 font-semibold px-2 py-1 uppercase">{grp}</div>
              {templates
                .filter((t) => (t.grp || "未分组") === grp)
                .map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelected(t)}
                    className={`flex items-center justify-between rounded px-3 py-2 cursor-pointer text-sm ${
                      selected?.id === t.id ? "bg-blue-50 text-blue-700" : "hover:bg-gray-100"
                    }`}
                  >
                    <span className="truncate">{t.name}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
                      className="text-gray-300 hover:text-red-500 ml-2 text-xs"
                    >
                      删除
                    </button>
                  </div>
                ))}
            </div>
          ))}
        </div>
      </aside>

      {/* 右侧详情 */}
      <main className="flex-1 p-8">
        {selected ? (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold">{selected.name}</h1>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/templates/${selected.id}/edit`)}
                  className="border rounded px-4 py-2 text-sm hover:bg-gray-100"
                >
                  编辑字段映射
                </button>
                <button
                  onClick={() => navigate("/generate", { state: { templateId: selected.id } })}
                  className="bg-blue-600 text-white rounded px-4 py-2 text-sm hover:bg-blue-700"
                >
                  批量生成
                </button>
              </div>
            </div>
            <div className="bg-white rounded-lg border p-6 space-y-3 text-sm text-gray-600">
              <p><span className="font-medium text-gray-800">分组：</span>{selected.grp || "未分组"}</p>
              <p><span className="font-medium text-gray-800">字段数量：</span>{selected.fields?.length ?? 0}</p>
              <p><span className="font-medium text-gray-800">创建时间：</span>{new Date(selected.created_at).toLocaleString("zh-CN")}</p>
              <p><span className="font-medium text-gray-800">最后修改：</span>{new Date(selected.updated_at).toLocaleString("zh-CN")}</p>
              {selected.fields?.length > 0 && (
                <div>
                  <p className="font-medium text-gray-800 mb-2">字段列表：</p>
                  <div className="space-y-1">
                    {selected.fields.map((f) => (
                      <div key={f.id} className="flex gap-4 bg-gray-50 rounded px-3 py-1">
                        <span className="font-mono text-blue-600">{"{{"}{f.name}{"}}"}</span>
                        <span className="text-gray-400">{f.type}</span>
                        <span>{f.sheet} · {f.cell}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">
            <p>选择一个模板，或新建模板</p>
          </div>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add renderer/src/pages/TemplateList.jsx
git commit -m "feat: 模板管理页（列表、分组、详情）"
```

---

### Task 11：字段映射编辑组件

**Files:**
- Create: `renderer/src/components/FieldMappingEditor.jsx`

- [ ] **Step 1: 实现 FieldMappingEditor.jsx**

`renderer/src/components/FieldMappingEditor.jsx`:
```jsx
import React from "react";

const FIELD_TYPES = [
  { value: "text", label: "文本" },
  { value: "image", label: "图片" },
  { value: "table_range", label: "批量填充区域" },
];

export default function FieldMappingEditor({ fields, onChange }) {
  function addField() {
    onChange([...fields, { name: "", type: "text", sheet: "Sheet1", cell: "" }]);
  }

  function updateField(index, patch) {
    const next = fields.map((f, i) => (i === index ? { ...f, ...patch } : f));
    onChange(next);
  }

  function removeField(index) {
    onChange(fields.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-5 gap-2 text-xs text-gray-400 font-medium px-1">
        <span>字段名</span>
        <span>类型</span>
        <span>Sheet</span>
        <span>单元格</span>
        <span></span>
      </div>
      {fields.map((f, i) => (
        <div key={i} className="grid grid-cols-5 gap-2 items-center">
          <input
            value={f.name}
            onChange={(e) => updateField(i, { name: e.target.value })}
            placeholder="如：编号"
            className="border rounded px-2 py-1 text-sm"
          />
          <select
            value={f.type}
            onChange={(e) => updateField(i, { type: e.target.value })}
            className="border rounded px-2 py-1 text-sm"
          >
            {FIELD_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <input
            value={f.sheet}
            onChange={(e) => updateField(i, { sheet: e.target.value })}
            placeholder="Sheet1"
            className="border rounded px-2 py-1 text-sm"
          />
          <input
            value={f.cell}
            onChange={(e) => updateField(i, { cell: e.target.value })}
            placeholder="如：B3"
            className="border rounded px-2 py-1 text-sm font-mono"
          />
          <button
            onClick={() => removeField(i)}
            className="text-gray-300 hover:text-red-500 text-sm"
          >
            删除
          </button>
        </div>
      ))}
      <button
        onClick={addField}
        className="text-blue-600 text-sm hover:underline"
      >
        + 添加字段
      </button>
    </div>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add renderer/src/components/FieldMappingEditor.jsx
git commit -m "feat: 字段映射编辑组件"
```

---

### Task 12：模板配置页（TemplateConfig）

**Files:**
- Create: `renderer/src/pages/TemplateConfig.jsx`

- [ ] **Step 1: 实现 TemplateConfig.jsx**

`renderer/src/pages/TemplateConfig.jsx`:
```jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import FieldMappingEditor from "../components/FieldMappingEditor";

export default function TemplateConfig() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [name, setName] = useState("");
  const [grp, setGrp] = useState("");
  const [filePath, setFilePath] = useState("");
  const [fields, setFields] = useState([]);
  const [autoDetected, setAutoDetected] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) {
      window.api.listTemplates().then((templates) => {
        const t = templates.find((t) => t.id === id);
        if (t) {
          setName(t.name);
          setGrp(t.grp || "");
          setFilePath(t.file_path);
          setFields(t.fields || []);
        }
      });
    }
  }, [id]);

  async function handleSelectFile() {
    const path = await window.api.selectFile([
      { name: "Excel 文件", extensions: ["xlsx"] },
    ]);
    if (!path) return;
    setFilePath(path);
    const result = await window.api.parseTemplate(path);
    if (result.placeholders?.length > 0) {
      setAutoDetected(result.placeholders);
      const detected = result.placeholders.map((p) => ({
        name: p.name,
        type: "text",
        sheet: p.sheet,
        cell: p.cell,
      }));
      setFields((prev) => {
        const existing = prev.map((f) => f.name);
        const newOnes = detected.filter((d) => !existing.includes(d.name));
        return [...prev, ...newOnes];
      });
    }
  }

  async function handleSave() {
    if (!name.trim() || !filePath) return alert("请填写模板名称并选择文件");
    setSaving(true);
    try {
      let storedPath = filePath;
      if (!isEdit) {
        const tempId = Date.now().toString();
        storedPath = await window.api.copyFileToAppData(filePath, tempId);
        const realId = await window.api.saveTemplate({ name, grp, file_path: storedPath, fields });
        // 重命名目录为真实 id（简单处理：直接用 realId 重新 copy）
        // 实际已经保存了，直接跳转
      } else {
        await window.api.updateTemplate(id, { name, grp, fields });
      }
      navigate("/templates");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg border p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">{isEdit ? "编辑模板" : "新建模板"}</h1>
          <button onClick={() => navigate("/templates")} className="text-gray-400 hover:text-gray-600 text-sm">
            ← 返回
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">模板名称</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="如：月度报告模板"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">分组（可选）</label>
            <input
              value={grp}
              onChange={(e) => setGrp(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="如：财务部"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Excel 模板文件</label>
            <div className="flex gap-2">
              <input
                readOnly
                value={filePath}
                className="flex-1 border rounded px-3 py-2 text-sm bg-gray-50"
                placeholder="点击右侧按钮选择文件..."
              />
              <button
                onClick={handleSelectFile}
                className="border rounded px-4 py-2 text-sm hover:bg-gray-100"
              >
                选择文件
              </button>
            </div>
            {autoDetected.length > 0 && (
              <p className="text-xs text-green-600 mt-1">
                已自动识别 {autoDetected.length} 个占位符
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">字段映射</label>
            <FieldMappingEditor fields={fields} onChange={setFields} />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <button
            onClick={() => navigate("/templates")}
            className="border rounded px-4 py-2 text-sm hover:bg-gray-100"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white rounded px-4 py-2 text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存模板"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add renderer/src/pages/TemplateConfig.jsx
git commit -m "feat: 模板配置页（上传文件、自动识别占位符、字段映射）"
```

---

### Task 13：批量生成页（Generate）

**Files:**
- Create: `renderer/src/pages/Generate.jsx`
- Create: `renderer/src/components/ProgressPanel.jsx`

- [ ] **Step 1: 实现 ProgressPanel.jsx**

`renderer/src/components/ProgressPanel.jsx`:
```jsx
import React from "react";

export default function ProgressPanel({ results, outputDir, onOpenDir }) {
  if (!results) return null;

  const success = results.filter((r) => r.status === "success").length;
  const failed = results.filter((r) => r.status === "error").length;

  return (
    <div className="space-y-4">
      <div className="flex gap-4 text-sm">
        <span className="text-green-600 font-medium">成功：{success}</span>
        {failed > 0 && <span className="text-red-500 font-medium">失败：{failed}</span>}
      </div>
      {outputDir && (
        <button
          onClick={onOpenDir}
          className="text-blue-600 text-sm hover:underline"
        >
          打开输出文件夹 →
        </button>
      )}
      {failed > 0 && (
        <div className="border border-red-100 rounded bg-red-50 p-3 space-y-1">
          <p className="text-xs font-medium text-red-600">失败详情：</p>
          {results
            .filter((r) => r.status === "error")
            .map((r) => (
              <p key={r.row} className="text-xs text-red-500">
                第 {r.row + 1} 行：{r.error}
              </p>
            ))}
        </div>
      )}
      <div className="max-h-48 overflow-y-auto space-y-1">
        {results.map((r) => (
          <div key={r.row} className={`text-xs px-2 py-1 rounded flex justify-between ${r.status === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
            <span>{r.status === "success" ? "✓" : "✗"} 第 {r.row + 1} 行</span>
            <span className="truncate ml-2 text-gray-400">{r.file?.split("/").pop() || r.file?.split("\\").pop()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 实现 Generate.jsx**

`renderer/src/pages/Generate.jsx`:
```jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ProgressPanel from "../components/ProgressPanel";

export default function Generate() {
  const navigate = useNavigate();
  const location = useLocation();
  const preselectedId = location.state?.templateId;

  const [templates, setTemplates] = useState([]);
  const [selectedId, setSelectedId] = useState(preselectedId || "");
  const [dataSource, setDataSource] = useState("file"); // "file" | "manual"
  const [dataFilePath, setDataFilePath] = useState("");
  const [manualRows, setManualRows] = useState([{}]);
  const [outputDir, setOutputDir] = useState("");
  const [filenamePattern, setFilenamePattern] = useState("输出_{{编号}}.xlsx");
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState(null);

  useEffect(() => {
    window.api.listTemplates().then(setTemplates);
  }, []);

  const selectedTemplate = templates.find((t) => t.id === selectedId);
  const fields = selectedTemplate?.fields || [];

  async function handleSelectDataFile() {
    const path = await window.api.selectFile([
      { name: "Excel 文件", extensions: ["xlsx"] },
    ]);
    if (path) setDataFilePath(path);
  }

  async function handleSelectOutputDir() {
    const dir = await window.api.selectDirectory();
    if (dir) setOutputDir(dir);
  }

  function updateManualRow(rowIdx, fieldName, value) {
    setManualRows((prev) => {
      const next = [...prev];
      next[rowIdx] = { ...next[rowIdx], [fieldName]: value };
      return next;
    });
  }

  function addManualRow() {
    setManualRows((prev) => [...prev, {}]);
  }

  function removeManualRow(idx) {
    setManualRows((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleGenerate() {
    if (!selectedId) return alert("请选择模板");
    if (!outputDir) return alert("请选择输出目录");

    let rows = [];
    if (dataSource === "manual") {
      rows = manualRows;
    } else {
      // 数据源 Excel 解析由 Python 处理，此处传路径
      // generate 指令支持 data_file_path，Python 侧读取
      rows = [{ _data_file: dataFilePath }];
    }

    setGenerating(true);
    setResults(null);
    try {
      const result = await window.api.generate({
        template_path: selectedTemplate.file_path,
        fields: fields,
        rows: dataSource === "manual" ? rows : null,
        data_file_path: dataSource === "file" ? dataFilePath : null,
        output_dir: outputDir,
        filename_pattern: filenamePattern,
      });
      setResults(result.results);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">批量生成</h1>
          <button onClick={() => navigate("/templates")} className="text-gray-400 hover:text-gray-600 text-sm">
            ← 返回模板列表
          </button>
        </div>

        <div className="bg-white rounded-lg border p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">选择模板</label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="">请选择...</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">数据来源</label>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="radio" value="file" checked={dataSource === "file"} onChange={() => setDataSource("file")} />
                上传 Excel 数据源
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="radio" value="manual" checked={dataSource === "manual"} onChange={() => setDataSource("manual")} />
                手动填写
              </label>
            </div>
          </div>

          {dataSource === "file" ? (
            <div className="flex gap-2">
              <input readOnly value={dataFilePath} className="flex-1 border rounded px-3 py-2 text-sm bg-gray-50" placeholder="选择数据源 Excel 文件..." />
              <button onClick={handleSelectDataFile} className="border rounded px-4 py-2 text-sm hover:bg-gray-100">选择文件</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="text-sm border-collapse w-full">
                <thead>
                  <tr>
                    {fields.map((f) => (
                      <th key={f.id} className="border px-2 py-1 bg-gray-50 text-left text-xs font-medium">{f.name}</th>
                    ))}
                    <th className="border px-2 py-1 bg-gray-50 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {manualRows.map((row, idx) => (
                    <tr key={idx}>
                      {fields.map((f) => (
                        <td key={f.id} className="border px-1 py-1">
                          <input
                            value={row[f.name] || ""}
                            onChange={(e) => updateManualRow(idx, f.name, e.target.value)}
                            className="w-full px-1 py-0.5 text-sm outline-none"
                          />
                        </td>
                      ))}
                      <td className="border px-2 py-1 text-center">
                        <button onClick={() => removeManualRow(idx)} className="text-gray-300 hover:text-red-500 text-xs">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button onClick={addManualRow} className="text-blue-600 text-xs mt-2 hover:underline">+ 添加行</button>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">输出目录</label>
            <div className="flex gap-2">
              <input readOnly value={outputDir} className="flex-1 border rounded px-3 py-2 text-sm bg-gray-50" placeholder="选择输出文件夹..." />
              <button onClick={handleSelectOutputDir} className="border rounded px-4 py-2 text-sm hover:bg-gray-100">选择目录</button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">输出文件命名规则</label>
            <input
              value={filenamePattern}
              onChange={(e) => setFilenamePattern(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm font-mono"
              placeholder="如：{{编号}}_报告.xlsx"
            />
            <p className="text-xs text-gray-400 mt-1">支持使用 {"{{"} 字段名 {"}}"} 作为变量</p>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating || !selectedId || !outputDir}
            className="w-full bg-blue-600 text-white rounded px-4 py-2 text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {generating ? "生成中..." : "开始生成"}
          </button>
        </div>

        {results && (
          <div className="bg-white rounded-lg border p-6">
            <h2 className="font-medium mb-4">生成结果</h2>
            <ProgressPanel
              results={results}
              outputDir={outputDir}
              onOpenDir={() => window.api.openDirectory(outputDir)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 提交**

```bash
git add renderer/src/pages/Generate.jsx renderer/src/components/ProgressPanel.jsx
git commit -m "feat: 批量生成页（文件/手动输入、进度展示）"
```

---

### Task 14：Python generate 支持数据源 Excel 文件

**Files:**
- Modify: `python/generator.py`
- Modify: `tests/python/test_generator.py`

- [ ] **Step 1: 为数据源 Excel 读取新增测试**

在 `tests/python/test_generator.py` 末尾追加：

```python
def test_generate_from_data_file():
    # 先创建一个数据源 Excel
    import tempfile
    from openpyxl import Workbook
    wb = Workbook()
    ws = wb.active
    ws.append(["编号", "姓名"])
    ws.append(["D001", "王五"])
    ws.append(["D002", "赵六"])
    with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as f:
        data_file = f.name
    wb.save(data_file)

    with tempfile.TemporaryDirectory() as tmpdir:
        req = {
            "template_path": FIXTURE,
            "fields": [
                {"name": "编号", "type": "text", "sheet": "Sheet1", "cell": "B3"},
                {"name": "姓名", "type": "text", "sheet": "Sheet1", "cell": "C5"},
            ],
            "rows": None,
            "data_file_path": data_file,
            "output_dir": tmpdir,
            "filename_pattern": "{{编号}}.xlsx",
        }
        result = generate(req)
        assert len(result["results"]) == 2
        names = [os.path.basename(r["file"]) for r in result["results"]]
        assert "D001.xlsx" in names
```

- [ ] **Step 2: 运行测试确认失败**

```bash
pytest tests/python/test_generator.py::test_generate_from_data_file -v
```

预期：FAIL（generate 不支持 data_file_path）

- [ ] **Step 3: 修改 generator.py 支持 data_file_path**

在 `python/generator.py` 的 `generate` 函数开头，加入数据源 Excel 读取逻辑：

```python
def generate(req: dict) -> dict:
    template_path = req["template_path"]
    fields = req["fields"]
    rows = req.get("rows")
    data_file_path = req.get("data_file_path")
    output_dir = req["output_dir"]
    filename_pattern = req["filename_pattern"]

    # 如果提供了数据源文件，从中读取行数据
    if data_file_path and not rows:
        from openpyxl import load_workbook as _load
        dwb = _load(data_file_path, data_only=True)
        dws = dwb.active
        headers = [cell.value for cell in next(dws.iter_rows(min_row=1, max_row=1))]
        rows = []
        for row in dws.iter_rows(min_row=2, values_only=True):
            rows.append({headers[i]: v for i, v in enumerate(row) if i < len(headers)})

    os.makedirs(output_dir, exist_ok=True)
    results = []
    # ... 后续逻辑不变
```

完整修改后的 `generator.py`：

```python
import re
import os
import shutil
from openpyxl import load_workbook
from openpyxl.drawing.image import Image as XLImage

PLACEHOLDER_RE = re.compile(r"\{\{(.+?)\}\}")

def _apply_filename(pattern: str, row: dict) -> str:
    def replace(m):
        return str(row.get(m.group(1), m.group(0)))
    return PLACEHOLDER_RE.sub(replace, pattern)

def generate(req: dict) -> dict:
    template_path = req["template_path"]
    fields = req["fields"]
    rows = req.get("rows")
    data_file_path = req.get("data_file_path")
    output_dir = req["output_dir"]
    filename_pattern = req["filename_pattern"]

    if data_file_path and not rows:
        dwb = load_workbook(data_file_path, data_only=True)
        dws = dwb.active
        headers = [cell.value for cell in next(dws.iter_rows(min_row=1, max_row=1))]
        rows = []
        for row in dws.iter_rows(min_row=2, values_only=True):
            rows.append({headers[i]: v for i, v in enumerate(row) if i < len(headers)})

    os.makedirs(output_dir, exist_ok=True)
    results = []

    for i, row in enumerate(rows):
        filename = _apply_filename(filename_pattern, row)
        output_path = os.path.join(output_dir, filename)
        shutil.copy2(template_path, output_path)

        try:
            wb = load_workbook(output_path)
            for field in fields:
                value = row.get(field["name"])
                if value is None:
                    continue
                ws = wb[field["sheet"]]
                if field["type"] == "text":
                    ws[field["cell"]] = value
                elif field["type"] == "image":
                    if os.path.exists(str(value)):
                        img = XLImage(str(value))
                        ws.add_image(img, field["cell"])
                elif field["type"] == "table_range":
                    start_cell = ws[field["cell"]]
                    start_row = start_cell.row
                    start_col = start_cell.column
                    for r_idx, data_row in enumerate(value):
                        for c_idx, cell_value in enumerate(data_row):
                            ws.cell(row=start_row + r_idx, column=start_col + c_idx, value=cell_value)
            wb.save(output_path)
            results.append({"row": i, "status": "success", "file": output_path})
        except Exception as e:
            results.append({"row": i, "status": "error", "error": str(e), "file": output_path})

    return {"results": results}
```

- [ ] **Step 4: 运行全部测试**

```bash
pytest tests/python/ -v
```

预期：全部 PASS

- [ ] **Step 5: 提交**

```bash
git add python/generator.py tests/python/test_generator.py
git commit -m "feat: generate 支持从数据源 Excel 文件读取行数据"
```

---

## 阶段四：集成与收尾

### Task 15：手动集成测试

- [ ] **Step 1: 以开发模式启动应用**

```bash
NODE_ENV=development npm run dev
```

若 Python 路径需要配置，先设置环境变量：
```bash
export PYTHON_PATH=$(which python3)
```

- [ ] **Step 2: 验证核心流程**

按以下流程手动测试：

1. 点击「新建模板」
2. 输入模板名称，选择一个包含 `{{编号}}` 占位符的 xlsx 文件
3. 确认自动识别占位符提示出现
4. 保存模板，确认出现在模板列表中
5. 点击「批量生成」
6. 选择模板，选择手动填写，填入 2 行数据
7. 选择输出目录，点击「开始生成」
8. 确认生成结果显示成功，打开输出文件夹验证文件内容正确

- [ ] **Step 3: 提交（如有调整）**

```bash
git add -A
git commit -m "fix: 集成测试后的修复"
```

---

### Task 16：为新项目添加 README 和 .gitignore

**Files:**
- Create: `README.md`
- Create: `.gitignore`

- [ ] **Step 1: 创建 .gitignore**

```
node_modules/
renderer/dist/
python/.venv/
python/dist/
*.pyc
__pycache__/
.DS_Store
*.db
```

- [ ] **Step 2: 创建 README.md**

```markdown
# Excel 批量编辑器

跨平台桌面应用（Mac/Windows），支持上传 Excel 模板、标记可替换字段，批量生成填充好的输出文件。

## 开发环境

### 前置条件
- Node.js 18+
- Python 3.11+

### 安装依赖

\`\`\`bash
npm install
cd python && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
\`\`\`

### 开发模式启动

\`\`\`bash
export PYTHON_PATH=$(which python3)
NODE_ENV=development npm run dev
\`\`\`

### 运行 Python 测试

\`\`\`bash
source python/.venv/bin/activate
pytest tests/python/ -v
\`\`\`
```

- [ ] **Step 3: 提交**

```bash
git add README.md .gitignore
git commit -m "docs: 添加 README 和 .gitignore"
```
